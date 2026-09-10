import { h, clear } from "../utils/dom.js";
import { navigate } from "../router.js";
import { getCurrentUser } from "../db/session.js";

const headerEl = h("header", { class: "app-header" });

export function mountHeader(parent) {
  parent.appendChild(headerEl);
}

export function updateHeader({ title = "North業務アプリ", back = null }) {
  clear(headerEl);
  const user = getCurrentUser();

  const inner = h("div", { class: "app-header__inner" }, [
    back
      ? h("button", { class: "app-header__back", onclick: () => navigate(back) }, "←")
      : h("div", { style: "width:40px" }),
    h("div", { class: "app-header__title" }, title),
    user
      ? h("button", {
          class: "app-header__user",
          onclick: () => navigate("/login"),
        }, [h("span", {}, `👤 ${user.name}`)])
      : null,
  ]);

  headerEl.appendChild(inner);
}
