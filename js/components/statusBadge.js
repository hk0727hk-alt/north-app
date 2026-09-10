import { h } from "../utils/dom.js";

const MAP = {
  "正常": "status-ok",
  "保管中": "status-ok",
  "稼働中": "status-ok",
  "完了": "status-ok",
  "返却済": "status-ok",
  "注意": "status-warn",
  "使用中": "status-warn",
  "貸出中": "status-warn",
  "対応中": "status-warn",
  "低": "status-ok",
  "中": "status-warn",
  "異常": "status-danger",
  "要修理": "status-repair",
  "修理中": "status-repair",
  "高": "status-danger",
  "未対応": "status-danger",
  "廃棄": "status-neutral",
};

export function statusBadge(text) {
  const cls = MAP[text] || "status-neutral";
  return h("span", { class: `status ${cls}` }, text);
}
