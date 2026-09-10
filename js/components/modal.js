import { h } from "../utils/dom.js";

export function openModal({ title, content, actions = [] }) {
  const close = () => backdrop.remove();

  const actionRow = actions.length
    ? h("div", { class: "btn-row", style: "margin-top:18px;" }, actions.map((a) =>
        h("button", {
          class: `btn ${a.variant || "btn-outline"}`,
          onclick: () => { if (a.onClick) a.onClick(close); else close(); },
        }, a.label)
      ))
    : null;

  const sheet = h("div", { class: "modal-sheet" }, [
    h("div", { class: "modal-title" }, title),
    content instanceof Node ? content : h("div", {}, String(content ?? "")),
    actionRow,
  ]);

  const backdrop = h("div", {
    class: "modal-backdrop",
    onclick: (e) => { if (e.target === backdrop) close(); },
  }, sheet);

  document.body.appendChild(backdrop);
  return close;
}

export function confirmDialog({ title = "確認", message, okLabel = "OK", cancelLabel = "キャンセル", danger = false }) {
  return new Promise((resolve) => {
    openModal({
      title,
      content: h("div", { style: "font-size:14px; color:var(--color-text-sub);" }, message),
      actions: [
        { label: cancelLabel, variant: "btn-outline", onClick: (close) => { close(); resolve(false); } },
        { label: okLabel, variant: danger ? "btn-danger" : "btn-primary", onClick: (close) => { close(); resolve(true); } },
      ],
    });
  });
}
