import { h, clear } from "../../utils/dom.js";
import { listIssues, updateIssueStatus, ISSUE_STATUS, getVehicle } from "../../db/vehicles.js";
import { getUser } from "../../db/users.js";
import { statusBadge } from "../../components/statusBadge.js";
import { formatJP } from "../../utils/date.js";
import { openModal } from "../../components/modal.js";
import { showToast } from "../../components/toast.js";

export function renderIssueList() {
  let filter = "未対応";
  const tabRow = h("div", { class: "tab-row" });
  const listEl = h("div", {});

  function renderTabs() {
    clear(tabRow);
    ["未対応", "対応中", "完了", "すべて"].forEach((t) => {
      tabRow.appendChild(h("button", {
        class: `tab-item ${filter === t ? "active" : ""}`,
        onclick: () => { filter = t; renderTabs(); renderList(); },
      }, t));
    });
  }

  function openDetail(issue) {
    const vehicle = getVehicle(issue.vehicleId);
    const user = getUser(issue.userId);
    const statusRow = h("div", { class: "chip-row", style: "margin-top:14px;" });
    ISSUE_STATUS.forEach((s) => {
      statusRow.appendChild(h("button", {
        class: `chip ${issue.status === s ? "selected" : ""}`,
        onclick: async () => {
          await updateIssueStatus(issue.id, s);
          showToast("状態を更新しました");
          close();
          renderList();
        },
      }, s));
    });

    const close = openModal({
      title: `${vehicle?.name || "不明な車両"} － ${issue.part}`,
      content: h("div", {}, [
        issue.photo ? h("img", { src: issue.photo, style: "width:100%; border-radius:12px; margin-bottom:12px;" }) : null,
        h("div", { class: "kv-row" }, [h("span", { class: "k" }, "報告者") , h("span", { class: "v" }, user?.name || "-")]),
        h("div", { class: "kv-row" }, [h("span", { class: "k" }, "報告日"), h("span", { class: "v" }, formatJP(issue.date))]),
        h("div", { class: "kv-row" }, [h("span", { class: "k" }, "緊急度"), statusBadge(issue.urgency)]),
        issue.comment ? h("div", { style: "margin-top:10px; font-size:14px;" }, issue.comment) : null,
        h("div", { class: "field-hint", style: "margin-top:14px;" }, "対応状況を選択"),
        statusRow,
      ]),
    });
  }

  function renderList() {
    clear(listEl);
    const statusIn = filter === "すべて" ? undefined : [filter];
    const issues = listIssues({ statusIn });
    if (!issues.length) {
      listEl.appendChild(h("div", { class: "empty-state" }, [
        h("div", { class: "icon" }, "✅"),
        h("div", { class: "msg" }, "該当する不具合はありません"),
      ]));
      return;
    }
    issues.forEach((issue) => {
      const vehicle = getVehicle(issue.vehicleId);
      listEl.appendChild(h("button", {
        class: "list-item",
        style: "width:100%; text-align:left;",
        onclick: () => openDetail(issue),
      }, [
        issue.photo ? h("img", { class: "list-item__thumb", src: issue.photo }) : h("div", { class: "list-item__thumb" }, "⚠"),
        h("div", { class: "list-item__body" }, [
          h("div", { class: "list-item__title" }, `${vehicle?.name || "不明"} － ${issue.part}`),
          h("div", { class: "list-item__sub" }, formatJP(issue.date)),
          h("div", { style: "margin-top:6px; display:flex; gap:6px;" }, [statusBadge(issue.urgency), statusBadge(issue.status)]),
        ]),
      ]));
    });
  }

  renderTabs();
  renderList();

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "不具合一覧"),
    tabRow,
    listEl,
  ]);
}
