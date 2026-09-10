import { h, clear } from "../utils/dom.js";
import { getAccessCode } from "../db/access.js";

const ACCESS_PIN_LEN = 4;

export function renderAccessGate({ onSuccess }) {
  let pin = "";

  const dots = h("div", { class: "pinpad-display" });
  const grid = h("div", { class: "pinpad-grid" });
  const errorMsg = h("div", {
    class: "field-hint",
    style: "text-align:center; color:var(--color-danger); min-height:16px; margin-bottom:8px; font-weight:700;",
  });

  function renderDots() {
    clear(dots);
    for (let i = 0; i < ACCESS_PIN_LEN; i++) {
      dots.appendChild(h("div", { class: `pinpad-dot ${i < pin.length ? "filled" : ""}` }));
    }
  }

  function key(label, onClick) {
    return h("button", { class: "pinpad-key", type: "button", onclick: onClick }, label);
  }

  function press(n) {
    if (pin.length >= ACCESS_PIN_LEN) return;
    pin += String(n);
    renderDots();
    if (pin.length === ACCESS_PIN_LEN) {
      if (pin === getAccessCode()) {
        onSuccess();
      } else {
        errorMsg.textContent = "合言葉が違います";
        pin = "";
        renderDots();
      }
    }
  }

  for (let n = 1; n <= 9; n++) grid.appendChild(key(String(n), () => press(n)));
  grid.appendChild(key("削除", () => { pin = ""; errorMsg.textContent = ""; renderDots(); }));
  grid.appendChild(key("0", () => press(0)));
  grid.appendChild(key("⌫", () => { pin = pin.slice(0, -1); renderDots(); }));

  renderDots();

  return h("div", {
    class: "page",
    style: "display:flex; flex-direction:column; justify-content:center; min-height:100vh; max-width:340px; margin:0 auto;",
  }, [
    h("div", { style: "text-align:center; margin-bottom:24px;" }, [
      h("div", { style: "font-size:22px; font-weight:800; color:var(--color-primary-dark);" }, "North業務アプリ"),
      h("div", { class: "field-hint", style: "margin-top:8px;" }, "合言葉を入力してください"),
    ]),
    dots,
    errorMsg,
    grid,
  ]);
}
