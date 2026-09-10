import { h, clear } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { addUser, updateUser, getUser, deleteUser } from "../../db/users.js";
import { showToast } from "../../components/toast.js";
import { confirmDialog } from "../../components/modal.js";

const ROLES = [
  { value: "manager", label: "管理者" },
  { value: "staff", label: "一般" },
];

export function renderUserForm({ id } = {}) {
  const existing = id ? getUser(id) : null;
  const isMasterUser = existing?.role === "master";

  const nameInput = h("input", { type: "text", value: existing?.name || "", placeholder: "氏名を入力" });
  let role = existing?.role === "manager" ? "manager" : "staff";
  let active = existing ? existing.active : true;

  const roleRow = h("div", { class: "chip-row" });
  function renderRoleRow() {
    clear(roleRow);
    ROLES.forEach((r) => {
      roleRow.appendChild(h("button", {
        class: `chip ${role === r.value ? "selected" : ""}`,
        onclick: () => { role = r.value; renderRoleRow(); },
      }, r.label));
    });
  }
  if (!isMasterUser) renderRoleRow();

  const activeRow = h("div", { class: "chip-row" });
  function renderActiveRow() {
    clear(activeRow);
    activeRow.appendChild(h("button", { class: `chip ${active ? "selected" : ""}`, onclick: () => { active = true; renderActiveRow(); } }, "有効"));
    activeRow.appendChild(h("button", { class: `chip ${!active ? "selected" : ""}`, onclick: () => { active = false; renderActiveRow(); } }, "無効"));
  }
  renderActiveRow();

  async function save() {
    const name = nameInput.value.trim();
    if (!name) { showToast("氏名を入力してください"); return; }
    if (existing) {
      await updateUser(existing.id, { name, role: isMasterUser ? "master" : role, active });
      showToast("ユーザー情報を更新しました");
    } else {
      await addUser({ name, role });
      showToast("ユーザーを追加しました");
    }
    navigate("/users");
  }

  async function remove() {
    const ok = await confirmDialog({ title: "ユーザーを削除", message: `「${existing.name}」を削除しますか？`, danger: true, okLabel: "削除する" });
    if (ok) {
      await deleteUser(existing.id);
      showToast("削除しました");
      navigate("/users");
    }
  }

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, existing ? "ユーザー情報の編集" : "ユーザーを追加"),
    h("div", { class: "field" }, [h("label", {}, "氏名"), nameInput]),
    h("div", { class: "field" }, [
      h("label", {}, "権限"),
      isMasterUser ? h("div", { class: "field-hint" }, "マスター管理者の権限は変更できません") : roleRow,
    ]),
    h("div", { class: "field" }, [h("label", {}, "状態"), activeRow]),
    h("button", { class: "btn btn-primary", onclick: save }, existing ? "更新する" : "追加する"),
    existing && !isMasterUser ? h("button", { class: "btn btn-danger", style: "margin-top:12px;", onclick: remove }, "このユーザーを削除") : null,
  ]);
}
