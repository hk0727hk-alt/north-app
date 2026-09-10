import { h } from "../utils/dom.js";

let timer = null;

export function showToast(message, { duration = 2200 } = {}) {
  document.querySelectorAll(".toast").forEach((el) => el.remove());
  const toast = h("div", { class: "toast" }, message);
  document.body.appendChild(toast);
  clearTimeout(timer);
  timer = setTimeout(() => toast.remove(), duration);
}
