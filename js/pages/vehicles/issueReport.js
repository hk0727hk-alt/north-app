import { h, clear } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { getVehicle, addIssue, INSPECTION_ITEMS, ISSUE_URGENCY } from "../../db/vehicles.js";
import { getCurrentUser } from "../../db/session.js";
import { createPhotoInput } from "../../components/photoInput.js";
import { showToast } from "../../components/toast.js";

const URGENCY_CLASS = { "低": "urgency-low", "中": "urgency-mid", "高": "urgency-high" };

export function renderIssueReport({ id }) {
  const vehicle = getVehicle(id);
  if (!vehicle) return h("div", { class: "page" }, "車両が見つかりません");

  let selectedPart = INSPECTION_ITEMS[0].label;
  let urgency = "中";

  const partRow = h("div", { class: "chip-row" });
  function renderPartRow() {
    clear(partRow);
    INSPECTION_ITEMS.forEach((it) => {
      partRow.appendChild(h("button", {
        class: `chip ${selectedPart === it.label ? "selected" : ""}`,
        onclick: () => { selectedPart = it.label; renderPartRow(); },
      }, it.label));
    });
  }
  renderPartRow();

  const urgencyRow = h("div", { class: "chip-row" });
  function renderUrgencyRow() {
    clear(urgencyRow);
    ISSUE_URGENCY.forEach((u) => {
      urgencyRow.appendChild(h("button", {
        class: `chip ${URGENCY_CLASS[u]} ${urgency === u ? "selected" : ""}`,
        onclick: () => { urgency = u; renderUrgencyRow(); },
      }, u));
    });
  }
  renderUrgencyRow();

  const photoInput = createPhotoInput({ label: "不具合箇所の写真を撮影" });
  const commentInput = h("textarea", { placeholder: "簡単なコメント（任意）" });

  async function submit() {
    const user = getCurrentUser();
    await addIssue({
      vehicleId: vehicle.id,
      userId: user?.id,
      part: selectedPart,
      photo: photoInput.getValue(),
      comment: commentInput.value.trim(),
      urgency,
    });
    showToast("不具合を報告しました");
    navigate(`/vehicles/${vehicle.id}`);
  }

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, `${vehicle.name} － 不具合報告`),
    h("div", { class: "field" }, [h("label", {}, "不具合箇所"), partRow]),
    h("div", { class: "field" }, [h("label", {}, "写真"), photoInput.el]),
    h("div", { class: "field", style: "margin-top:16px;" }, [h("label", {}, "コメント"), commentInput]),
    h("div", { class: "field" }, [h("label", {}, "緊急度"), urgencyRow]),
    h("button", { class: "btn btn-accent", onclick: submit }, "不具合を報告する"),
  ]);
}
