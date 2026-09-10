import { h, clear } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { getVehicle, INSPECTION_ITEMS, INSPECTION_STATUS_CYCLE, newInspectionDraft, saveInspection } from "../../db/vehicles.js";
import { getCurrentUser } from "../../db/session.js";
import { statusBadge } from "../../components/statusBadge.js";
import { showToast } from "../../components/toast.js";
import { confirmDialog } from "../../components/modal.js";

export function renderInspection({ id }) {
  const vehicle = getVehicle(id);
  if (!vehicle) return h("div", { class: "page" }, "車両が見つかりません");

  const items = newInspectionDraft();
  const memoInput = h("textarea", { placeholder: "メモ（任意）" });
  const list = h("div", {});

  function cycle(key) {
    const cur = items[key];
    const idx = INSPECTION_STATUS_CYCLE.indexOf(cur);
    items[key] = INSPECTION_STATUS_CYCLE[(idx + 1) % INSPECTION_STATUS_CYCLE.length];
    renderList();
  }

  function renderList() {
    clear(list);
    INSPECTION_ITEMS.forEach((it) => {
      list.appendChild(h("button", {
        class: "inspect-item",
        style: "width:100%; border:none;",
        onclick: () => cycle(it.key),
      }, [
        h("div", {}, [
          h("div", { class: "inspect-item__label" }, it.label),
          h("div", { class: "inspect-item__hint" }, "タップして状態を変更"),
        ]),
        statusBadge(items[it.key]),
      ]));
    });
  }
  renderList();

  async function save() {
    const user = getCurrentUser();
    const abnormal = INSPECTION_ITEMS.filter((it) => items[it.key] !== "正常");
    await saveInspection({ vehicleId: vehicle.id, userId: user?.id, items: { ...items }, memo: memoInput.value.trim() });
    showToast("点検結果を保存しました");
    if (abnormal.length > 0) {
      const go = await confirmDialog({
        title: "不具合報告を作成しますか？",
        message: `「${abnormal.map((a) => a.label).join("、")}」に異常があります。不具合報告を作成しますか？`,
        okLabel: "作成する",
        cancelLabel: "あとで",
      });
      if (go) { navigate(`/vehicles/${vehicle.id}/issue`); return; }
    }
    navigate(`/vehicles/${vehicle.id}`);
  }

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, `${vehicle.name} － 日常点検`),
    h("div", { class: "field-hint", style: "margin-bottom:14px;" }, "初期状態はすべて「正常」です。異常がある項目だけタップして変更してください。"),
    list,
    h("div", { class: "field", style: "margin-top:10px;" }, [h("label", {}, "メモ（任意）"), memoInput]),
    h("button", { class: "btn btn-primary", onclick: save }, "点検結果を保存"),
  ]);
}
