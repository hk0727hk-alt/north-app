import { h } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { getTool, getActiveCheckoutForTool, listToolHistory } from "../../db/tools.js";
import { getUser } from "../../db/users.js";
import { getCurrentUser, isManager } from "../../db/session.js";
import { statusBadge } from "../../components/statusBadge.js";
import { formatJP } from "../../utils/date.js";

export function renderToolDetail({ id }) {
  const tool = getTool(id);
  if (!tool) return h("div", { class: "page" }, "道具が見つかりません");

  const user = getCurrentUser();
  const activeCheckout = getActiveCheckoutForTool(id);
  const history = listToolHistory(id);

  return h("div", { class: "page" }, [
    tool.photo ? h("img", { class: "detail-photo", src: tool.photo }) : h("div", { class: "detail-photo" }, "🧰"),
    h("div", { class: "page-title" }, tool.name),
    h("div", { class: "card" }, [
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "管理番号"), h("span", { class: "v" }, tool.managementNumber || "-")]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "カテゴリー"), h("span", { class: "v" }, tool.category || "-")]),
      tool.length ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "長さ"), h("span", { class: "v" }, tool.length)]) : null,
      tool.size ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "サイズ"), h("span", { class: "v" }, tool.size)]) : null,
      tool.model ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "型式"), h("span", { class: "v" }, tool.model)]) : null,
      tool.maker ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "メーカー"), h("span", { class: "v" }, tool.maker)]) : null,
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "保管場所"), h("span", { class: "v" }, tool.storageLocation || "-")]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "状態"), statusBadge(tool.status)]),
      tool.memo ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "備考"), h("span", { class: "v" }, tool.memo)]) : null,
    ]),
    activeCheckout ? h("div", { class: "card", style: "border-color: var(--color-warn);" }, [
      h("div", { class: "section-title", style: "margin:0 0 8px;" }, "現在の貸出状況"),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "持ち出し者"), h("span", { class: "v" }, getUser(activeCheckout.userId)?.name || "-")]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "持ち出し日"), h("span", { class: "v" }, formatJP(activeCheckout.checkoutDate))]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "返却予定日"), h("span", { class: "v" }, formatJP(activeCheckout.returnDueDate))]),
    ]) : null,
    isManager(user) ? h("button", { class: "btn btn-ghost", style: "margin-bottom:10px;", onclick: () => navigate(`/tools/${id}/edit`) }, "道具情報を編集") : null,
    h("div", { class: "section-title" }, "持ち出し履歴"),
    history.length
      ? history.map((c) => h("div", { class: "card" }, [
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, getUser(c.userId)?.name || "-"), statusBadge(c.status)]),
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, "持ち出し"), h("span", { class: "v" }, formatJP(c.checkoutDate))]),
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, c.returnedDate ? "返却日" : "返却予定日"), h("span", { class: "v" }, formatJP(c.returnedDate || c.returnDueDate))]),
          c.damage ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "破損報告"), h("span", { class: "v", style: "color:var(--color-danger);" }, c.damageTags.join("、") || "あり")]) : null,
        ]))
      : h("div", { class: "empty-state" }, [h("div", { class: "msg" }, "履歴がありません")]),
  ]);
}
