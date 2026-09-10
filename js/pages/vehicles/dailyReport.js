import { h, clear } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { getVehicle, getTodayOpenLog, addLog, closeLog } from "../../db/vehicles.js";
import { listUsers, getUser } from "../../db/users.js";
import { getCurrentUser } from "../../db/session.js";
import { todayStr, formatJP } from "../../utils/date.js";
import { showToast } from "../../components/toast.js";
import { createPhotoInput } from "../../components/photoInput.js";

function createOdometerField({ placeholder }) {
  let mode = "number";
  const numberInput = h("input", { type: "number", inputmode: "numeric", placeholder });
  const photoInput = createPhotoInput({ label: "メーターの写真を撮影" });

  const modeRow = h("div", { class: "chip-row", style: "margin-bottom:10px;" });
  const body = h("div", {});

  function renderBody() {
    clear(body);
    body.appendChild(mode === "number" ? numberInput : photoInput.el);
  }

  function renderModeRow() {
    clear(modeRow);
    modeRow.appendChild(h("button", {
      class: `chip ${mode === "number" ? "selected" : ""}`,
      onclick: () => { mode = "number"; renderModeRow(); renderBody(); },
    }, "数字で入力"));
    modeRow.appendChild(h("button", {
      class: `chip ${mode === "photo" ? "selected" : ""}`,
      onclick: () => { mode = "photo"; renderModeRow(); renderBody(); },
    }, "写真で記録"));
  }

  renderModeRow();
  renderBody();

  return {
    el: h("div", {}, [modeRow, body]),
    isValid: () => (mode === "number" ? !!numberInput.value : !!photoInput.getValue()),
    getNumber: () => (mode === "number" ? numberInput.value : null),
    getPhoto: () => (mode === "photo" ? photoInput.getValue() : null),
  };
}

export function renderDailyReport({ id }) {
  const vehicle = getVehicle(id);
  if (!vehicle) return h("div", { class: "page" }, "車両が見つかりません");

  const openLog = getTodayOpenLog(id);

  if (openLog) {
    return renderEndForm(vehicle, openLog);
  }
  return renderStartForm(vehicle);
}

function renderStartForm(vehicle) {
  const current = getCurrentUser();
  const users = listUsers({ includeInactive: false });
  let selectedUserId = current?.id || users[0]?.id;
  let hasIssue = false;

  const userRow = h("div", { class: "chip-row" });
  function renderUserRow() {
    clear(userRow);
    users.forEach((u) => {
      userRow.appendChild(h("button", {
        class: `chip ${u.id === selectedUserId ? "selected" : ""}`,
        onclick: () => { selectedUserId = u.id; renderUserRow(); },
      }, u.name));
    });
  }
  renderUserRow();

  const odoField = createOdometerField({ placeholder: "例）12345" });
  const memoInput = h("textarea", { placeholder: "気づいた点があれば（任意）" });

  const issueRow = h("div", { class: "chip-row" });
  function renderIssueRow() {
    clear(issueRow);
    issueRow.appendChild(h("button", { class: `chip ${!hasIssue ? "selected" : ""}`, onclick: () => { hasIssue = false; renderIssueRow(); } }, "異常なし"));
    issueRow.appendChild(h("button", { class: `chip ${hasIssue ? "selected" : ""}`, onclick: () => { hasIssue = true; renderIssueRow(); } }, "異常あり"));
  }
  renderIssueRow();

  async function submit() {
    if (!selectedUserId) { showToast("使用者を選択してください"); return; }
    if (!odoField.isValid()) { showToast("開始時の走行距離を入力するか、写真を撮影してください"); return; }
    await addLog({
      vehicleId: vehicle.id,
      userId: selectedUserId,
      date: todayStr(),
      startOdometer: odoField.getNumber(),
      startOdometerPhoto: odoField.getPhoto(),
      hasIssue,
      memo: memoInput.value.trim(),
    });
    showToast("日報を登録しました");
    if (hasIssue) {
      navigate(`/vehicles/${vehicle.id}/issue`);
    } else {
      navigate(`/vehicles/${vehicle.id}`);
    }
  }

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, `${vehicle.name} － 使用開始`),
    h("div", { class: "field" }, [h("label", {}, "使用者"), userRow]),
    h("div", { class: "field" }, [h("label", {}, "使用日"), h("input", { type: "date", value: todayStr(), disabled: true })]),
    h("div", { class: "field" }, [h("label", {}, "開始時走行距離（km）"), odoField.el]),
    h("div", { class: "field" }, [h("label", {}, "異常の有無"), issueRow]),
    h("div", { class: "field" }, [h("label", {}, "メモ（任意）"), memoInput]),
    h("button", { class: "btn btn-primary", onclick: submit }, "使用を開始する"),
  ]);
}

function renderEndForm(vehicle, log) {
  const user = getUser(log.userId);
  const odoField = createOdometerField({ placeholder: "例）12480" });

  async function submit() {
    if (!odoField.isValid()) { showToast("終了時の走行距離を入力するか、写真を撮影してください"); return; }
    const num = odoField.getNumber();
    if (num && log.startOdometer != null && Number(num) < Number(log.startOdometer)) {
      showToast("終了時の距離が開始時より小さいです");
      return;
    }
    await closeLog(log.id, { endOdometer: num, endOdometerPhoto: odoField.getPhoto() });
    showToast("使用終了を記録しました");
    navigate(`/vehicles/${vehicle.id}`);
  }

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, `${vehicle.name} － 使用終了`),
    h("div", { class: "card" }, [
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "使用者"), h("span", { class: "v" }, user?.name || "-")]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "使用日"), h("span", { class: "v" }, formatJP(log.date))]),
      log.startOdometer != null
        ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "開始時走行距離"), h("span", { class: "v" }, `${log.startOdometer} km`)])
        : log.startOdometerPhoto
          ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "開始時走行距離"), h("img", { src: log.startOdometerPhoto, style: "width:48px;height:48px;border-radius:8px;object-fit:cover;" })])
          : h("div", { class: "kv-row" }, [h("span", { class: "k" }, "開始時走行距離"), h("span", { class: "v" }, "-")]),
    ]),
    h("div", { class: "field" }, [h("label", {}, "終了時走行距離（km）"), odoField.el]),
    h("button", { class: "btn btn-primary", onclick: submit }, "使用を終了する"),
  ]);
}
