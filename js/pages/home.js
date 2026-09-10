import { h } from "../utils/dom.js";
import { navigate } from "../router.js";
import { countAllOpenIssues } from "../db/vehicles.js";
import { listCheckouts } from "../db/tools.js";

function bigCard({ emoji, label, desc, badge, onClick, disabled }) {
  return h("button", {
    class: `big-card ${disabled ? "disabled" : ""}`,
    disabled,
    onclick: disabled ? null : onClick,
  }, [
    h("div", { class: "emoji" }, emoji),
    h("div", { class: "label" }, label),
    desc ? h("div", { class: "desc" }, desc) : null,
    badge,
  ]);
}

export function renderHome() {
  const openIssues = countAllOpenIssues();
  const outCount = listCheckouts({ status: "貸出中" }).length;

  return h("div", { class: "page" }, [
    h("div", { class: "home-hero" }, [
      h("div", { class: "home-hero__title" }, "North業務アプリ"),
      h("div", { class: "home-hero__sub" }, "使う機能を選んでください"),
    ]),
    h("div", { class: "card-grid" }, [
      bigCard({
        emoji: "🚚",
        label: "車両管理",
        desc: "日報・点検・不具合",
        badge: openIssues > 0 ? h("span", { class: "status status-danger" }, `不具合 ${openIssues}件`) : null,
        onClick: () => navigate("/vehicles"),
      }),
      bigCard({
        emoji: "🧰",
        label: "道具管理",
        desc: "持ち出し・返却",
        badge: outCount > 0 ? h("span", { class: "status status-warn" }, `貸出中 ${outCount}件`) : null,
        onClick: () => navigate("/tools"),
      }),
      bigCard({ emoji: "📋", label: "案件管理", desc: "近日公開", disabled: true, badge: h("span", { class: "badge-soon" }, "準備中") }),
      bigCard({ emoji: "💰", label: "見積・実行予算", desc: "近日公開", disabled: true, badge: h("span", { class: "badge-soon" }, "準備中") }),
      bigCard({ emoji: "📷", label: "写真管理", desc: "近日公開", disabled: true, badge: h("span", { class: "badge-soon" }, "準備中") }),
      bigCard({ emoji: "📁", label: "ファイル管理", desc: "近日公開", disabled: true, badge: h("span", { class: "badge-soon" }, "準備中") }),
      bigCard({ emoji: "👷", label: "社員・資格管理", desc: "近日公開", disabled: true, badge: h("span", { class: "badge-soon" }, "準備中") }),
    ]),
  ]);
}
