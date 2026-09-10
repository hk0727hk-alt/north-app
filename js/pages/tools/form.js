import { h } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { addTool, updateTool, getTool, deleteTool, TOOL_STATUS } from "../../db/tools.js";
import { createPhotoInput } from "../../components/photoInput.js";
import { showToast } from "../../components/toast.js";
import { confirmDialog } from "../../components/modal.js";

export function renderToolForm({ id } = {}) {
  const existing = id ? getTool(id) : null;

  const photoInput = createPhotoInput({ initialValue: existing?.photo || null, label: "道具の写真を撮影 / 選択" });
  const nameInput = h("input", { type: "text", value: existing?.name || "", placeholder: "例）ホース 10m" });
  const numberInput = h("input", { type: "text", value: existing?.managementNumber || "", placeholder: "例）H-010" });
  const categoryInput = h("input", { type: "text", value: existing?.category || "", placeholder: "例）ホース" });
  const sizeInput = h("input", { type: "text", value: existing?.size || "", placeholder: "任意" });
  const lengthInput = h("input", { type: "text", value: existing?.length || "", placeholder: "例）10m" });
  const modelInput = h("input", { type: "text", value: existing?.model || "", placeholder: "任意" });
  const makerInput = h("input", { type: "text", value: existing?.maker || "", placeholder: "任意" });
  const locationInput = h("input", { type: "text", value: existing?.storageLocation || "", placeholder: "例）資材倉庫A" });
  const memoInput = h("textarea", { placeholder: "備考（任意）" }, existing?.memo || "");
  const statusSelect = h("select", {}, TOOL_STATUS.map((s) => h("option", { value: s, selected: s === (existing?.status || "保管中") }, s)));

  async function save() {
    const name = nameInput.value.trim();
    if (!name) { showToast("道具名を入力してください"); return; }
    const data = {
      name,
      photo: photoInput.getValue(),
      managementNumber: numberInput.value.trim(),
      category: categoryInput.value.trim(),
      size: sizeInput.value.trim(),
      length: lengthInput.value.trim(),
      model: modelInput.value.trim(),
      maker: makerInput.value.trim(),
      storageLocation: locationInput.value.trim(),
      memo: memoInput.value.trim(),
      status: statusSelect.value,
    };
    if (existing) {
      await updateTool(existing.id, data);
      showToast("道具情報を更新しました");
      navigate(`/tools/${existing.id}`);
    } else {
      const t = await addTool(data);
      showToast("道具を登録しました");
      navigate(`/tools/${t.id}`);
    }
  }

  async function remove() {
    const ok = await confirmDialog({ title: "道具を削除", message: `「${existing.name}」を削除しますか？`, danger: true, okLabel: "削除する" });
    if (ok) {
      await deleteTool(existing.id);
      showToast("削除しました");
      navigate("/tools");
    }
  }

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, existing ? "道具情報の編集" : "道具を登録"),
    h("div", { class: "field" }, [h("label", {}, "写真"), photoInput.el]),
    h("div", { class: "field" }, [h("label", {}, "道具名"), nameInput]),
    h("div", { class: "field" }, [h("label", {}, "管理番号"), numberInput]),
    h("div", { class: "field" }, [h("label", {}, "カテゴリー"), categoryInput]),
    h("div", { class: "field" }, [h("label", {}, "サイズ"), sizeInput]),
    h("div", { class: "field" }, [h("label", {}, "長さ"), lengthInput]),
    h("div", { class: "field" }, [h("label", {}, "型式"), modelInput]),
    h("div", { class: "field" }, [h("label", {}, "メーカー"), makerInput]),
    h("div", { class: "field" }, [h("label", {}, "保管場所"), locationInput]),
    h("div", { class: "field" }, [h("label", {}, "状態"), statusSelect]),
    h("div", { class: "field" }, [h("label", {}, "備考"), memoInput]),
    h("button", { class: "btn btn-primary", onclick: save }, existing ? "更新する" : "登録する"),
    existing ? h("button", { class: "btn btn-danger", style: "margin-top:12px;", onclick: remove }, "この道具を削除") : null,
  ]);
}
