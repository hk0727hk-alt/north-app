import { h } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { listTools } from "../../db/tools.js";
import { statusBadge } from "../../components/statusBadge.js";
import { getCurrentUser, isManager } from "../../db/session.js";

export function renderToolList() {
  const tools = listTools();
  const user = getCurrentUser();

  const items = tools.length
    ? tools.map((t) => h("button", {
        class: "list-item",
        style: "width:100%; text-align:left; border:1px solid var(--color-border); background:var(--color-surface);",
        onclick: () => navigate(`/tools/${t.id}`),
      }, [
        t.photo ? h("img", { class: "list-item__thumb", src: t.photo }) : h("div", { class: "list-item__thumb" }, "🧰"),
        h("div", { class: "list-item__body" }, [
          h("div", { class: "list-item__title" }, t.name),
          h("div", { class: "list-item__sub" }, `${t.managementNumber || ""} ${t.category ? "・" + t.category : ""}`),
          h("div", { style: "margin-top:6px;" }, statusBadge(t.status)),
        ]),
        h("div", { class: "list-item__chevron" }, "›"),
      ]))
    : [h("div", { class: "empty-state" }, [
        h("div", { class: "icon" }, "🧰"),
        h("div", { class: "msg" }, "登録されている道具がありません"),
      ])];

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "道具・備品管理"),
    h("div", { class: "btn-row", style: "margin-bottom:16px;" }, [
      h("button", { class: "btn btn-accent", onclick: () => navigate("/tools/checkout") }, "📷 持ち出す"),
      h("button", { class: "btn btn-primary", onclick: () => navigate("/tools/return") }, "↩ 返却する"),
    ]),
    isManager(user) ? h("button", {
      class: "btn btn-outline",
      style: "margin-bottom:16px;",
      onclick: () => navigate("/tools/new"),
    }, "＋ 道具を登録") : null,
    h("button", {
      class: "btn btn-ghost",
      style: "margin-bottom:16px;",
      onclick: () => navigate("/tools/history"),
    }, "履歴を見る"),
    h("div", { class: "section-title" }, "道具一覧"),
    ...items,
  ]);
}
