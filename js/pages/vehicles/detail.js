import { h, clear } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import {
  getVehicle, getTodayOpenLog, listLogsForVehicle, listInspectionsForVehicle,
  getLatestInspection, listIssues, INSPECTION_ITEMS,
} from "../../db/vehicles.js";
import { getUser } from "../../db/users.js";
import { getCurrentUser, isManager } from "../../db/session.js";
import { statusBadge } from "../../components/statusBadge.js";
import { formatJP } from "../../utils/date.js";

export function renderVehicleDetail({ id }) {
  const vehicle = getVehicle(id);
  if (!vehicle) return h("div", { class: "page" }, "車両が見つかりません");

  const user = getCurrentUser();
  const openLog = getTodayOpenLog(id);
  const latestInspection = getLatestInspection(id);
  const openIssues = listIssues({ vehicleId: id, statusIn: ["未対応", "対応中"] });

  const tabRow = h("div", { class: "tab-row" });
  const tabBody = h("div", {});
  let activeTab = "日報履歴";

  function renderTabs() {
    clear(tabRow);
    ["日報履歴", "点検履歴", "不具合履歴"].forEach((t) => {
      tabRow.appendChild(h("button", {
        class: `tab-item ${activeTab === t ? "active" : ""}`,
        onclick: () => { activeTab = t; renderTabs(); renderBody(); },
      }, t));
    });
  }

  function renderBody() {
    clear(tabBody);
    if (activeTab === "日報履歴") {
      const logs = listLogsForVehicle(id);
      if (!logs.length) { tabBody.appendChild(emptyMsg("日報の記録がありません")); return; }
      logs.forEach((log) => {
        const u = getUser(log.userId);
        tabBody.appendChild(h("div", { class: "card" }, [
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, formatJP(log.date)), h("span", { class: "v" }, u?.name || "-")]),
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, "走行距離"), h("span", { class: "v" }, `${log.startOdometer ?? "-"} → ${log.endOdometer ?? "未終了"} km`)]),
          log.hasIssue ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "異常"), statusBadge("異常")]) : null,
          log.memo ? h("div", { style: "margin-top:6px; font-size:13px; color:var(--color-text-sub);" }, log.memo) : null,
        ]));
      });
    } else if (activeTab === "点検履歴") {
      const insps = listInspectionsForVehicle(id);
      if (!insps.length) { tabBody.appendChild(emptyMsg("点検の記録がありません")); return; }
      insps.forEach((insp) => {
        const u = getUser(insp.userId);
        tabBody.appendChild(h("div", { class: "card" }, [
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, formatJP(insp.date)), h("span", { class: "v" }, u?.name || "-")]),
          h("div", { style: "display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;" },
            INSPECTION_ITEMS.map((it) => h("span", { style: "font-size:12px; display:flex; align-items:center; gap:4px;" }, [it.label, statusBadge(insp.items[it.key])]))),
        ]));
      });
    } else {
      const issues = listIssues({ vehicleId: id });
      if (!issues.length) { tabBody.appendChild(emptyMsg("不具合の記録がありません")); return; }
      issues.forEach((issue) => {
        tabBody.appendChild(h("div", { class: "card" }, [
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, formatJP(issue.date)), h("span", { class: "v" }, issue.part)]),
          h("div", { style: "display:flex; gap:6px; margin-top:6px;" }, [statusBadge(issue.urgency), statusBadge(issue.status)]),
          issue.comment ? h("div", { style: "margin-top:6px; font-size:13px; color:var(--color-text-sub);" }, issue.comment) : null,
        ]));
      });
    }
  }

  function emptyMsg(msg) {
    return h("div", { class: "empty-state" }, [h("div", { class: "msg" }, msg)]);
  }

  renderTabs();
  renderBody();

  return h("div", { class: "page" }, [
    vehicle.photo ? h("img", { class: "detail-photo", src: vehicle.photo }) : h("div", { class: "detail-photo" }, "🚚"),
    h("div", { class: "page-title" }, vehicle.name),
    h("div", { class: "card" }, [
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "車両番号"), h("span", { class: "v" }, vehicle.vehicleNumber || "-")]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "ナンバー"), h("span", { class: "v" }, vehicle.plateNumber || "-")]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "状態"), statusBadge(vehicle.status)]),
      openLog ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "本日の使用者"), h("span", { class: "v" }, getUser(openLog.userId)?.name || "-")]) : null,
      vehicle.memo ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "備考"), h("span", { class: "v" }, vehicle.memo)]) : null,
    ]),
    latestInspection ? h("div", { class: "card" }, [
      h("div", { class: "section-title", style: "margin:0 0 8px;" }, "直近の点検結果"),
      h("div", { style: "display:flex; flex-wrap:wrap; gap:8px;" },
        INSPECTION_ITEMS.map((it) => h("span", { style: "font-size:12px; display:flex; align-items:center; gap:4px;" }, [it.label, statusBadge(latestInspection.items[it.key])]))),
    ]) : null,
    openIssues.length ? h("div", { class: "card", style: "border-color: var(--color-danger);" }, [
      h("div", { class: "section-title", style: "margin:0 0 8px; color:var(--color-danger);" }, `未対応の不具合 ${openIssues.length}件`),
      ...openIssues.map((i) => h("div", { style: "font-size:13px; margin-bottom:4px;" }, `${i.part}（${i.urgency}）`)),
    ]) : null,
    h("div", { class: "btn-row", style: "margin: 16px 0;" }, [
      h("button", { class: "btn btn-primary", onclick: () => navigate(`/vehicles/${id}/report`) }, openLog ? "使用終了を入力" : "使用開始（日報）"),
    ]),
    h("div", { class: "btn-row", style: "margin-bottom:16px;" }, [
      h("button", { class: "btn btn-outline", onclick: () => navigate(`/vehicles/${id}/inspection`) }, "🔧 日常点検"),
      h("button", { class: "btn btn-outline", onclick: () => navigate(`/vehicles/${id}/issue`) }, "⚠ 不具合報告"),
    ]),
    isManager(user) ? h("button", { class: "btn btn-ghost", style: "margin-bottom:10px;", onclick: () => navigate(`/vehicles/${id}/edit`) }, "車両情報を編集") : null,
    h("div", { class: "section-title" }, "履歴"),
    tabRow,
    tabBody,
  ]);
}
