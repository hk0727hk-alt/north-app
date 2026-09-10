import { h, clear } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { listCheckouts, getTool, returnTool, COMMON_DAMAGE_TAGS } from "../../db/tools.js";
import { getCurrentUser, isManager } from "../../db/session.js";
import { createPhotoInput } from "../../components/photoInput.js";
import { showToast } from "../../components/toast.js";
import { formatJP } from "../../utils/date.js";

export function renderToolReturn() {
  const container = h("div", { class: "page" });
  const user = getCurrentUser();
  const state = { showAll: false, checkout: null, damage: false, damageTags: [], damageComment: "", needsRepair: false, photoIn: null };

  function goto(stepFn) {
    clear(container);
    container.appendChild(stepFn());
  }

  function stepSelect() {
    const list = listCheckouts({ status: "貸出中", userId: state.showAll ? undefined : user?.id });
    const items = list.length
      ? list.map((c) => {
          const tool = getTool(c.toolId);
          return h("button", {
            class: "list-item",
            style: "width:100%; text-align:left;",
            onclick: () => { state.checkout = c; goto(stepConfirm); },
          }, [
            tool?.photo ? h("img", { class: "list-item__thumb", src: tool.photo }) : h("div", { class: "list-item__thumb" }, "🧰"),
            h("div", { class: "list-item__body" }, [
              h("div", { class: "list-item__title" }, tool?.name || "不明な道具"),
              h("div", { class: "list-item__sub" }, `返却予定 ${formatJP(c.returnDueDate)}`),
            ]),
            h("div", { class: "list-item__chevron" }, "›"),
          ]);
        })
      : [h("div", { class: "empty-state" }, [
          h("div", { class: "icon" }, "🧰"),
          h("div", { class: "msg" }, "返却対象の道具がありません"),
        ])];

    return h("div", {}, [
      h("div", { class: "page-title" }, "道具を返却する"),
      isManager(user) ? h("button", {
        class: "btn btn-outline",
        style: "margin-bottom:14px;",
        onclick: () => { state.showAll = !state.showAll; goto(stepSelect); },
      }, state.showAll ? "自分の貸出のみ表示" : "全員の貸出を表示") : null,
      ...items,
    ]);
  }

  function stepConfirm() {
    const tool = getTool(state.checkout.toolId);
    const conditionRow = h("div", { class: "chip-row" });
    const detailBox = h("div", {});

    function renderCondition() {
      clear(conditionRow);
      conditionRow.appendChild(h("button", {
        class: `chip ${!state.damage ? "selected" : ""}`,
        onclick: () => { state.damage = false; renderCondition(); renderDetail(); },
      }, "良好"));
      conditionRow.appendChild(h("button", {
        class: `chip ${state.damage ? "selected" : ""}`,
        onclick: () => { state.damage = true; renderCondition(); renderDetail(); },
      }, "破損・不具合あり"));
    }

    function renderDetail() {
      clear(detailBox);
      if (!state.damage) return;

      const tagRow = h("div", { class: "chip-row" });
      COMMON_DAMAGE_TAGS.forEach((tag) => {
        tagRow.appendChild(h("button", {
          class: `chip ${state.damageTags.includes(tag) ? "selected" : ""}`,
          onclick: () => {
            state.damageTags = state.damageTags.includes(tag)
              ? state.damageTags.filter((t) => t !== tag)
              : [...state.damageTags, tag];
            renderDetail();
          },
        }, tag));
      });

      const photoInput = createPhotoInput({ initialValue: state.photoIn, label: "破損箇所の写真を撮影", onChange: (v) => { state.photoIn = v; } });
      const commentInput = h("textarea", { placeholder: "不具合内容（任意）", oninput: (e) => { state.damageComment = e.target.value; } }, state.damageComment);
      const repairRow = h("div", { class: "chip-row" });
      function renderRepair() {
        clear(repairRow);
        repairRow.appendChild(h("button", { class: `chip ${!state.needsRepair ? "selected" : ""}`, onclick: () => { state.needsRepair = false; renderRepair(); } }, "修理不要"));
        repairRow.appendChild(h("button", { class: `chip ${state.needsRepair ? "selected" : ""}`, onclick: () => { state.needsRepair = true; renderRepair(); } }, "修理が必要"));
      }
      renderRepair();

      detailBox.appendChild(h("div", { class: "field" }, [h("label", {}, "不具合内容"), tagRow]));
      detailBox.appendChild(h("div", { class: "field" }, [h("label", {}, "写真"), photoInput.el]));
      detailBox.appendChild(h("div", { class: "field" }, [commentInput]));
      detailBox.appendChild(h("div", { class: "field" }, [h("label", {}, "修理の要否"), repairRow]));
    }

    renderCondition();
    renderDetail();

    async function submit() {
      await returnTool(state.checkout.id, {
        damage: state.damage,
        damageTags: state.damageTags,
        damageComment: state.damageComment,
        needsRepair: state.needsRepair,
        photoIn: state.photoIn,
      });
      showToast(`「${tool?.name || ""}」を返却しました`);
      navigate("/tools");
    }

    return h("div", {}, [
      h("div", { class: "page-title" }, "返却内容の確認"),
      h("div", { class: "card", style: "display:flex; gap:12px; align-items:center;" }, [
        tool?.photo ? h("img", { style: "width:64px;height:64px;border-radius:10px;object-fit:cover;", src: tool.photo }) : h("div", { class: "list-item__thumb" }, "🧰"),
        h("div", {}, [
          h("div", { style: "font-weight:800; font-size:16px;" }, tool?.name || "-"),
          h("div", { class: "field-hint" }, tool?.managementNumber || ""),
        ]),
      ]),
      h("div", { class: "field", style: "margin-top:16px;" }, [h("label", {}, "道具の状態"), conditionRow]),
      detailBox,
      h("button", { class: "btn btn-primary", onclick: submit }, "返却を確定する"),
      h("button", { class: "btn btn-ghost", style: "margin-top:8px;", onclick: () => goto(stepSelect) }, "戻る"),
    ]);
  }

  goto(stepSelect);
  return container;
}
