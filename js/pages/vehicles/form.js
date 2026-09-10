import { h } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { addVehicle, updateVehicle, getVehicle, deleteVehicle } from "../../db/vehicles.js";
import { createPhotoInput } from "../../components/photoInput.js";
import { showToast } from "../../components/toast.js";
import { confirmDialog } from "../../components/modal.js";

export function renderVehicleForm({ id } = {}) {
  const existing = id ? getVehicle(id) : null;

  const photoInput = createPhotoInput({ initialValue: existing?.photo || null, label: "車両写真を撮影 / 選択" });
  const nameInput = h("input", { type: "text", value: existing?.name || "", placeholder: "例）軽トラック" });
  const numberInput = h("input", { type: "text", value: existing?.vehicleNumber || "", placeholder: "例）1号車" });
  const plateInput = h("input", { type: "text", value: existing?.plateNumber || "", placeholder: "例）名古屋 400 あ 12-34" });
  const memoInput = h("textarea", { placeholder: "備考（任意）" }, existing?.memo || "");

  async function save() {
    const name = nameInput.value.trim();
    if (!name) { showToast("車両名を入力してください"); return; }
    const data = {
      name,
      vehicleNumber: numberInput.value.trim(),
      plateNumber: plateInput.value.trim(),
      photo: photoInput.getValue(),
      memo: memoInput.value.trim(),
    };
    if (existing) {
      await updateVehicle(existing.id, data);
      showToast("車両情報を更新しました");
      navigate(`/vehicles/${existing.id}`);
    } else {
      const v = await addVehicle(data);
      showToast("車両を登録しました");
      navigate(`/vehicles/${v.id}`);
    }
  }

  async function remove() {
    const ok = await confirmDialog({ title: "車両を削除", message: `「${existing.name}」を削除しますか？履歴も含めて削除されます。`, danger: true, okLabel: "削除する" });
    if (ok) {
      await deleteVehicle(existing.id);
      showToast("削除しました");
      navigate("/vehicles");
    }
  }

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, existing ? "車両情報の編集" : "車両を登録"),
    h("div", { class: "field" }, [h("label", {}, "車両写真"), photoInput.el]),
    h("div", { class: "field" }, [h("label", {}, "車両名"), nameInput]),
    h("div", { class: "field" }, [h("label", {}, "車両番号"), numberInput]),
    h("div", { class: "field" }, [h("label", {}, "ナンバー"), plateInput]),
    h("div", { class: "field" }, [h("label", {}, "備考"), memoInput]),
    h("button", { class: "btn btn-primary", onclick: save }, existing ? "更新する" : "登録する"),
    existing ? h("button", { class: "btn btn-danger", style: "margin-top:12px;", onclick: remove }, "この車両を削除") : null,
  ]);
}
