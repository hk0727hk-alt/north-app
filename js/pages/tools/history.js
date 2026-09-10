import { h, clear } from "../../utils/dom.js";
import { listCheckouts, getTool } from "../../db/tools.js";
import { getUser } from "../../db/users.js";
import { statusBadge } from "../../components/statusBadge.js";
import { formatJP } from "../../utils/date.js";

export function renderToolHistory() {
  let filter = "すべて";
  const tabRow = h("div", { class: "tab-row" });
  const listEl = h("div", {});

  function renderTabs() {
    clear(tabRow);
    ["すべて", "貸出中", "返却済"].forEach((t) => {
      tabRow.appendChild(h("button", {
        class: `tab-item ${filter === t ? "active" : ""}`,
        onclick: () => { filter = t; renderTabs(); renderList(); },
      }, t));
    });
  }

  function renderList() {
    clear(listEl);
    const checkouts = listCheckouts(filter === "すべて" ? {} : { status: filter });
    if (!checkouts.length) {
      listEl.appendChild(h("div", { class: "empty-state" }, [h("div", { class: "msg" }, "履歴がありません")]));
      return;
    }
    checkouts.forEach((c) => {
      const tool = getTool(c.toolId);
      const user = getUser(c.userId);
      listEl.appendChild(h("div", { class: "list-item" }, [
        tool?.photo ? h("img", { class: "list-item__thumb", src: tool.photo }) : h("div", { class: "list-item__thumb" }, "🧰"),
        h("div", { class: "list-item__body" }, [
          h("div", { class: "list-item__title" }, tool?.name || "不明な道具"),
          h("div", { class: "list-item__sub" }, `${user?.name || "-"} ・ ${formatJP(c.checkoutDate)} 〜 ${c.returnedDate ? formatJP(c.returnedDate) : formatJP(c.returnDueDate) + "予定"}`),
          h("div", { style: "margin-top:6px; display:flex; gap:6px;" }, [
            statusBadge(c.status),
            c.damage ? statusBadge("要修理") : null,
          ]),
        ]),
      ]));
    });
  }

  renderTabs();
  renderList();

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "持ち出し履歴"),
    tabRow,
    listEl,
  ]);
}
