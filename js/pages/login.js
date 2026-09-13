import { h } from "../utils/dom.js";
import { navigate } from "../router.js";
import { listUsers, getMasterPin } from "../db/users.js";
import { setCurrentUser, getCurrentUser } from "../db/session.js";
import { getLastError } from "../db/storage.js";
import { askPin } from "../components/pinPad.js";
import { showToast } from "../components/toast.js";

function initials(name) {
  return name.trim().slice(0, 1);
}

export function renderLogin() {
  const users = listUsers({ includeInactive: false });
  const current = getCurrentUser();

  const grid = h("div", { class: "user-grid" }, users.map((u) => h("button", {
    class: "user-avatar-card",
    onclick: async () => {
      if (u.role === "master") {
        const pin = await askPin({ title: "管理者PINを入力" });
        if (pin === null) return;
        if (pin !== getMasterPin()) {
          showToast("PINが違います");
          return;
        }
      }
      setCurrentUser(u.id);
      showToast(`${u.name} としてログインしました`);
      navigate("/");
    },
  }, [
    h("div", { class: "user-avatar" }, initials(u.name)),
    h("div", { class: "name" }, u.name),
    h("div", { class: "role" }, u.role === "master" ? "マスター管理者" : u.role === "manager" ? "管理者" : "一般"),
  ])));

  const err = getLastError();

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "ユーザーを選択"),
    current ? h("div", { class: "field-hint", style: "margin-bottom:14px;" }, `現在: ${current.name} でログイン中`) : null,
    !users.length
      ? h("div", { class: "empty-state" }, [
          h("div", { class: "icon" }, "⏳"),
          h("div", { class: "msg" }, "データを取得中、または通信エラーです。少し待ってから再読み込みしてください。"),
          err ? h("div", { class: "field-hint", style: "margin-top:10px; color:var(--color-danger); word-break:break-all;" }, `エラー内容: ${err}`) : null,
        ])
      : null,
    grid,
  ]);
}
