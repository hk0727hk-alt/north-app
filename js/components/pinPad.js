import { h, clear } from "../utils/dom.js";
import { openModal } from "./modal.js";

const PIN_LEN = 4;

export function askPin({ title = "管理者PINを入力" } = {}) {
  return new Promise((resolve) => {
    let pin = "";

    const dots = h("div", { class: "pinpad-display" });
    const grid = h("div", { class: "pinpad-grid" });

    function renderDots() {
      clear(dots);
      for (let i = 0; i < PIN_LEN; i++) {
        dots.appendChild(h("div", { class: `pinpad-dot ${i < pin.length ? "filled" : ""}` }));
      }
    }

    function key(label, onClick) {
      return h("button", { class: "pinpad-key", type: "button", onclick: onClick }, label);
    }

    function press(n) {
      if (pin.length >= PIN_LEN) return;
      pin += String(n);
      renderDots();
      if (pin.length === PIN_LEN) {
        close();
        resolve(pin);
      }
    }

    for (let n = 1; n <= 9; n++) {
      grid.appendChild(key(String(n), () => press(n)));
    }
    grid.appendChild(key("削除", () => { pin = ""; renderDots(); }));
    grid.appendChild(key("0", () => press(0)));
    grid.appendChild(key("⌫", () => { pin = pin.slice(0, -1); renderDots(); }));

    renderDots();

    const close = openModal({
      title,
      content: h("div", {}, [dots, grid]),
      actions: [
        { label: "キャンセル", variant: "btn-outline", onClick: (c) => { c(); resolve(null); } },
      ],
    });
  });
}
