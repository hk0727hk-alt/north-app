import { h, clear } from "../utils/dom.js";
import { fileToCompressedDataUrl } from "../utils/photo.js";
import { showToast } from "./toast.js";

const MAX_PHOTO_CHARS = 220000;

export function createPhotoInput({ initialValue = null, label = "写真を撮影 / 選択", onChange } = {}) {
  let value = initialValue;

  const wrap = h("div", { class: "photo-input" });

  function render() {
    clear(wrap);
    if (value) {
      wrap.appendChild(h("img", { src: value }));
      wrap.appendChild(h("button", {
        class: "photo-input__remove",
        type: "button",
        onclick: (e) => {
          e.preventDefault();
          value = null;
          if (onChange) onChange(null);
          render();
        },
      }, "✕"));
    } else {
      wrap.appendChild(h("div", { class: "icon" }, "📷"));
      wrap.appendChild(h("div", {}, label));
      const input = h("input", {
        type: "file",
        accept: "image/*",
        capture: "environment",
        onchange: async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const compressed = await fileToCompressedDataUrl(file);
          if (compressed && compressed.length > MAX_PHOTO_CHARS) {
            showToast("写真のデータが大きすぎます。別の写真をお試しください");
            return;
          }
          value = compressed;
          if (onChange) onChange(value);
          render();
        },
      });
      wrap.appendChild(input);
    }
  }

  render();

  return {
    el: wrap,
    getValue: () => value,
    setValue: (v) => { value = v; render(); },
  };
}
