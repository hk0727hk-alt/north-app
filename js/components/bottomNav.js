import { h, clear } from "../utils/dom.js";
import { navigate, currentPath } from "../router.js";
import { getCurrentUser, isMaster } from "../db/session.js";

const navEl = h("nav", { class: "bottom-nav" });

const ITEMS = [
  { path: "/", icon: "🏠", label: "ホーム", match: (p) => p === "/" },
  { path: "/vehicles", icon: "🚚", label: "車両", match: (p) => p.startsWith("/vehicles") },
  { path: "/tools", icon: "🧰", label: "道具", match: (p) => p.startsWith("/tools") },
  { path: "/users", icon: "⚙️", label: "管理", match: (p) => p.startsWith("/users") || p.startsWith("/settings"), masterOnly: true },
];

export function mountBottomNav(parent) {
  parent.appendChild(navEl);
}

export function updateBottomNav() {
  clear(navEl);
  const user = getCurrentUser();
  const path = currentPath();
  const inner = h("div", { class: "bottom-nav__inner" });

  for (const item of ITEMS) {
    if (item.masterOnly && !isMaster(user)) continue;
    const active = item.match(path);
    inner.appendChild(h("button", {
      class: `bottom-nav__item ${active ? "active" : ""}`,
      onclick: () => navigate(item.path),
    }, [
      h("div", { class: "icon" }, item.icon),
      h("div", {}, item.label),
    ]));
  }
  navEl.appendChild(inner);
}
