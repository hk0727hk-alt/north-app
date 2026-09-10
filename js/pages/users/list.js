import { h } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { listUsers } from "../../db/users.js";

const ROLE_LABEL = { master: "マスター管理者", manager: "管理者", staff: "一般" };

export function renderUserList() {
  const users = listUsers();

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "ユーザー管理"),
    h("button", { class: "btn btn-accent", style: "margin-bottom:16px;", onclick: () => navigate("/users/new") }, "＋ ユーザーを追加"),
    ...users.map((u) => h("button", {
      class: "list-item",
      style: "width:100%; text-align:left;",
      onclick: () => navigate(`/users/${u.id}/edit`),
    }, [
      h("div", { class: "list-item__thumb" }, u.name.slice(0, 1)),
      h("div", { class: "list-item__body" }, [
        h("div", { class: "list-item__title" }, u.name),
        h("div", { class: "list-item__sub" }, `${ROLE_LABEL[u.role] || u.role}${u.active ? "" : "・無効"}`),
      ]),
      h("div", { class: "list-item__chevron" }, "›"),
    ])),
    h("div", { class: "section-title" }, "設定"),
    h("button", { class: "btn btn-outline", onclick: () => navigate("/settings") }, "⚙ アプリ設定"),
  ]);
}
