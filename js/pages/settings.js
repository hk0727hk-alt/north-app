import { h } from "../utils/dom.js";
import { navigate } from "../router.js";
import { getMasterPin, setMasterPin } from "../db/users.js";
import { getAccessCode, setAccessCode } from "../db/access.js";
import { resetAllData } from "../db/storage.js";
import { showToast } from "../components/toast.js";
import { confirmDialog } from "../components/modal.js";
import { askPin } from "../components/pinPad.js";
import { logout, getCurrentUser, isMaster } from "../db/session.js";

export function renderSettings() {
  const pinInput = h("input", { type: "text", inputmode: "numeric", maxlength: 4, value: getMasterPin(), placeholder: "4桁の数字" });
  const accessInput = h("input", { type: "text", inputmode: "numeric", maxlength: 4, value: getAccessCode(), placeholder: "4桁の数字" });

  async function savePin() {
    const v = pinInput.value.trim();
    if (!/^\d{4}$/.test(v)) { showToast("4桁の数字を入力してください"); return; }
    await setMasterPin(v);
    showToast("PINを変更しました");
  }

  function saveAccessCode() {
    const v = accessInput.value.trim();
    if (!/^\d{4}$/.test(v)) { showToast("4桁の数字を入力してください"); return; }
    setAccessCode(v);
    showToast("合言葉を変更しました");
  }

  async function reset() {
    // Re-check at the moment of action, not just when the page was opened,
    // and require the master PIN again so an unattended logged-in phone
    // cannot wipe everyone's shared data.
    if (!isMaster(getCurrentUser())) {
      showToast("初期化はマスター管理者のみ実行できます");
      return;
    }
    const pin = await askPin({ title: "初期化するにはマスターPINを入力" });
    if (pin === null) return;
    if (pin !== getMasterPin()) {
      showToast("PINが違います");
      return;
    }
    const ok = await confirmDialog({
      title: "データを初期化",
      message: "全員で共有している車両・道具・履歴・ユーザーのデータを初期状態に戻します。使っている全員に影響します。よろしいですか？",
      danger: true,
      okLabel: "初期化する",
    });
    if (ok) {
      await resetAllData();
      logout();
      showToast("初期化しました");
      navigate("/login");
    }
  }

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "アプリ設定"),
    h("div", { class: "card" }, [
      h("div", { class: "kv-row" }, [
        h("span", { class: "k" }, "データの保存先"),
        h("span", { class: "v" }, "全員で共有中"),
      ]),
      h("div", { class: "field-hint", style: "margin-top:6px;" }, "アプリを開いた全員が同じ車両・道具・履歴のデータを見ています。"),
    ]),
    h("div", { class: "section-title" }, "アプリの入室合言葉"),
    h("div", { class: "card" }, [
      h("div", { class: "field-hint", style: "margin-bottom:10px;" }, "アプリを開くときに全員が入力する合言葉です。従業員に共有してください。"),
      h("div", { class: "field" }, [h("label", {}, "合言葉（4桁）"), accessInput]),
      h("button", { class: "btn btn-primary", onclick: saveAccessCode }, "合言葉を変更する"),
    ]),
    h("div", { class: "section-title" }, "マスター管理者PIN"),
    h("div", { class: "card" }, [
      h("div", { class: "field" }, [h("label", {}, "PINコード（4桁）"), pinInput]),
      h("button", { class: "btn btn-primary", onclick: savePin }, "PINを変更する"),
    ]),
    h("div", { class: "section-title" }, "データ管理"),
    h("div", { class: "card" }, [
      h("div", { class: "field-hint", style: "margin-bottom:12px;" }, "テスト用にデータを初期状態へ戻します。実運用データも削除されるため注意してください。"),
      h("button", { class: "btn btn-danger", onclick: reset }, "全データを初期化"),
    ]),
  ]);
}
