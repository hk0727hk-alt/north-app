import { h, clear } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { listCategories, recognizeToolCandidates, checkoutTool } from "../../db/tools.js";
import { getCurrentUser } from "../../db/session.js";
import { createPhotoInput } from "../../components/photoInput.js";
import { showToast } from "../../components/toast.js";
import { todayStr, addDays, formatJP } from "../../utils/date.js";

export function renderToolCheckout() {
  const container = h("div", { class: "page" });
  const state = { photo: null, category: null, tool: null, returnDate: addDays(todayStr(), 1) };

  function goto(stepFn) {
    clear(container);
    container.appendChild(stepFn());
  }

  function stepPhoto() {
    const photoInput = createPhotoInput({
      initialValue: state.photo,
      label: "持ち出す道具の写真を撮影",
      onChange: (v) => { state.photo = v; },
    });
    return h("div", {}, [
      h("div", { class: "page-title" }, "道具を持ち出す（1/3）"),
      h("div", { class: "field-hint", style: "margin-bottom:14px;" }, "まず道具の写真を撮影してください。写真から候補を絞り込みます。"),
      h("div", { style: "display:flex; justify-content:center; margin-bottom:20px;" }, photoInput.el),
      h("button", { class: "btn btn-primary", onclick: () => goto(stepCategory) }, "次へ（候補を表示）"),
      h("button", { class: "btn btn-ghost", style: "margin-top:8px;", onclick: () => navigate("/tools") }, "キャンセル"),
    ]);
  }

  function stepCategory() {
    const categories = listCategories();
    const row = h("div", { class: "chip-row" });
    function renderRow() {
      clear(row);
      row.appendChild(h("button", {
        class: `chip ${state.category === null ? "selected" : ""}`,
        onclick: () => { state.category = null; renderRow(); },
      }, "すべて"));
      categories.forEach((c) => {
        row.appendChild(h("button", {
          class: `chip ${state.category === c ? "selected" : ""}`,
          onclick: () => { state.category = c; renderRow(); },
        }, c));
      });
    }
    renderRow();

    return h("div", {}, [
      h("div", { class: "page-title" }, "道具を持ち出す（2/3）"),
      h("div", { class: "field-hint", style: "margin-bottom:14px;" }, "似ている道具を絞り込むため、カテゴリーを選んでください（省略可）。"),
      row,
      h("button", { class: "btn btn-primary", style: "margin-top:20px;", onclick: () => goto(stepCandidates) }, "候補を表示する"),
      h("button", { class: "btn btn-ghost", style: "margin-top:8px;", onclick: () => goto(stepPhoto) }, "戻る"),
    ]);
  }

  function stepCandidates() {
    const candidates = recognizeToolCandidates({ category: state.category });
    const grid = h("div", { class: "candidate-grid" });

    if (!candidates.length) {
      grid.appendChild(h("div", { class: "empty-state" }, [h("div", { class: "msg" }, "該当する道具が見つかりませんでした")]));
    }

    candidates.forEach((t) => {
      const disabled = t.status !== "保管中";
      grid.appendChild(h("button", {
        class: `candidate-card ${disabled ? "disabled" : ""}`,
        disabled,
        onclick: () => { state.tool = t; goto(stepConfirm); },
      }, [
        t.photo ? h("img", { class: "candidate-card__thumb", src: t.photo }) : h("div", { class: "candidate-card__thumb" }, "🧰"),
        h("div", { class: "candidate-card__name" }, t.name),
        h("div", { class: "candidate-card__meta" }, disabled ? t.status : (t.managementNumber || "")),
      ]));
    });

    return h("div", {}, [
      h("div", { class: "page-title" }, "道具を持ち出す（3/3）"),
      h("div", { class: "field-hint", style: "margin-bottom:14px;" }, "この中のどれですか？該当する道具をタップしてください。"),
      grid,
      h("button", { class: "btn btn-ghost", style: "margin-top:20px;", onclick: () => goto(stepCategory) }, "戻る"),
    ]);
  }

  function stepConfirm() {
    const tool = state.tool;
    const quickRow = h("div", { class: "chip-row" });
    const dateInput = h("input", { type: "date", value: state.returnDate, onchange: (e) => { state.returnDate = e.target.value; renderQuick(); } });

    function renderQuick() {
      clear(quickRow);
      const options = [
        { label: "当日", days: 0 },
        { label: "翌日", days: 1 },
        { label: "3日後", days: 3 },
        { label: "1週間後", days: 7 },
      ];
      options.forEach((o) => {
        const d = addDays(todayStr(), o.days);
        quickRow.appendChild(h("button", {
          class: `chip ${state.returnDate === d ? "selected" : ""}`,
          onclick: () => { state.returnDate = d; dateInput.value = d; renderQuick(); },
        }, o.label));
      });
    }
    renderQuick();

    async function submit() {
      const user = getCurrentUser();
      await checkoutTool({ toolId: tool.id, userId: user?.id, returnDueDate: state.returnDate, photoOut: state.photo });
      showToast(`「${tool.name}」を持ち出しました`);
      navigate("/tools");
    }

    return h("div", {}, [
      h("div", { class: "page-title" }, "持ち出し内容の確認"),
      h("div", { class: "card", style: "display:flex; gap:12px; align-items:center;" }, [
        tool.photo ? h("img", { style: "width:64px;height:64px;border-radius:10px;object-fit:cover;", src: tool.photo }) : h("div", { class: "list-item__thumb" }, "🧰"),
        h("div", {}, [
          h("div", { style: "font-weight:800; font-size:16px;" }, tool.name),
          h("div", { class: "field-hint" }, tool.managementNumber || ""),
        ]),
      ]),
      h("div", { class: "field", style: "margin-top:18px;" }, [h("label", {}, "返却予定日"), quickRow]),
      h("div", { class: "field" }, [dateInput]),
      h("button", { class: "btn btn-accent", onclick: submit }, "持ち出しを確定する"),
      h("button", { class: "btn btn-ghost", style: "margin-top:8px;", onclick: () => goto(stepCandidates) }, "戻る"),
    ]);
  }

  goto(stepPhoto);
  return container;
}
