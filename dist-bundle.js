// ==== utils/id.js ====
function makeId(prefix = "id") {
  const rand = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${rand}`;
}

// ==== utils/date.js ====
function todayStr() {
  return toDateStr(new Date());
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function formatJP(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${y}/${m}/${d}`;
}

function nowIso() {
  return new Date().toISOString();
}

// ==== utils/dom.js ====
function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs || {})) {
    if (val === null || val === undefined || val === false) continue;
    if (key === "class") el.className = val;
    else if (key === "html") el.innerHTML = val;
    else if (key.startsWith("on") && typeof val === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key in el && key !== "list") {
      try { el[key] = val; } catch { el.setAttribute(key, val); }
    } else {
      el.setAttribute(key, val);
    }
  }
  const arr = Array.isArray(children) ? children : [children];
  for (const child of arr) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ==== utils/photo.js ====
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToCompressedDataUrl(file, maxSize = 700, quality = 0.55) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==== db/storage.js ====
const PREFIX = "northApp:";
const COLLECTIONS = ["users", "vehicles", "vehicleLogs", "vehicleInspections", "vehicleIssues", "tools", "toolCheckouts"];

const dataListeners = new Set();

function notify() {
  dataListeners.forEach((cb) => { try { cb(); } catch { /* ignore listener errors */ } });
}

function onDataChange(cb) {
  dataListeners.add(cb);
  return () => dataListeners.delete(cb);
}

function localKey(name) {
  return PREFIX + name;
}

function localRead(name, fallback) {
  try {
    const raw = localStorage.getItem(localKey(name));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function localWrite(name, val) {
  try {
    localStorage.setItem(localKey(name), JSON.stringify(val));
  } catch {
    // localStorage unavailable in this context — data just won't persist
  }
}

function isoNow() {
  return new Date().toISOString();
}

function seedData() {
  return {
    users: [
      { id: "u_master", name: "管理者", role: "master", active: true, createdAt: isoNow() },
      { id: "u_yamada", name: "山田 太郎", role: "staff", active: true, createdAt: isoNow() },
      { id: "u_suzuki", name: "鈴木 一郎", role: "staff", active: true, createdAt: isoNow() },
    ],
    vehicles: [
      { id: "v_1", name: "軽トラック", vehicleNumber: "1号車", plateNumber: "名古屋 400 あ 12-34", photo: null, memo: "現場資材運搬用", status: "稼働中", createdAt: isoNow() },
      { id: "v_2", name: "ハイエース", vehicleNumber: "2号車", plateNumber: "名古屋 500 か 56-78", photo: null, memo: "人員移動用", status: "稼働中", createdAt: isoNow() },
    ],
    vehicleLogs: [],
    vehicleInspections: [],
    vehicleIssues: [],
    tools: [
      { id: "t_hose10", name: "ホース 10m", photo: null, managementNumber: "H-010", category: "ホース", size: "", length: "10m", model: "", maker: "", storageLocation: "資材倉庫A", status: "保管中", memo: "" },
      { id: "t_hose20", name: "ホース 20m", photo: null, managementNumber: "H-020", category: "ホース", size: "", length: "20m", model: "", maker: "", storageLocation: "資材倉庫A", status: "保管中", memo: "" },
      { id: "t_hose30", name: "ホース 30m", photo: null, managementNumber: "H-030", category: "ホース", size: "", length: "30m", model: "", maker: "", storageLocation: "資材倉庫A", status: "保管中", memo: "" },
      { id: "t_drill", name: "充電式ドライバードリル", photo: null, managementNumber: "D-001", category: "電動工具", size: "", length: "", model: "DF457", maker: "マキタ", storageLocation: "工具庫1", status: "保管中", memo: "" },
      { id: "t_level", name: "レベル計測器", photo: null, managementNumber: "M-002", category: "測定器具", size: "", length: "", model: "", maker: "TOPCON", storageLocation: "工具庫2", status: "保管中", memo: "" },
    ],
    toolCheckouts: [],
  };
}

function ensureLocalSeeded() {
  if (localRead("seeded", false)) return;
  const seed = seedData();
  for (const name of COLLECTIONS) localWrite(name, seed[name]);
  localWrite("masterPin", "0000");
  localWrite("seeded", true);
}

async function initStore() {
  ensureLocalSeeded();
}

function readCollection(name) {
  return localRead(name, []);
}

function readValue(name, fallback = null) {
  return localRead(name, fallback);
}

function writeValue(name, val) {
  localWrite(name, val);
}

async function addDoc(name, id, data) {
  const arr = localRead(name, []);
  arr.push(data);
  localWrite(name, arr);
  notify();
  return data;
}

async function updateDoc(name, id, patch) {
  const arr = localRead(name, []);
  const idx = arr.findIndex((x) => x.id === id);
  if (idx !== -1) {
    arr[idx] = { ...arr[idx], ...patch };
    localWrite(name, arr);
    notify();
  }
}

async function deleteDoc(name, id) {
  localWrite(name, localRead(name, []).filter((x) => x.id !== id));
  notify();
}

async function resetAllData() {
  Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  ensureLocalSeeded();
  notify();
}

// ==== db/users.js ====
function listUsers({ includeInactive = true } = {}) {
  const users = readCollection("users");
  return includeInactive ? users : users.filter((u) => u.active);
}

function getUser(id) {
  return readCollection("users").find((u) => u.id === id) || null;
}

async function addUser({ name, role = "staff" }) {
  const user = { id: makeId("u"), name, role, active: true, createdAt: new Date().toISOString() };
  await addDoc("users", user.id, user);
  return user;
}

async function updateUser(id, patch) {
  await updateDoc("users", id, patch);
}

async function deleteUser(id) {
  await deleteDoc("users", id);
}

function getMasterPin() {
  return readValue("masterPin", "0000");
}

function setMasterPin(pin) {
  writeValue("masterPin", pin);
}

// ==== db/session.js ====
const KEY = "currentUserId";

function getCurrentUser() {
  const id = readValue(KEY, null);
  if (!id) return null;
  return getUser(id) || null;
}

function setCurrentUser(userId) {
  writeValue(KEY, userId);
}

function logout() {
  writeValue(KEY, null);
}

function isMaster(user) {
  return !!user && user.role === "master";
}

function isManager(user) {
  return !!user && (user.role === "master" || user.role === "manager");
}

// ==== db/access.js ====
const DEFAULT_CODE = "0000";

function getAccessCode() {
  return readValue("accessCode", DEFAULT_CODE);
}

function setAccessCode(code) {
  writeValue("accessCode", code);
}

function isUnlocked() {
  return readValue("unlocked", false) === true;
}

function setUnlocked() {
  writeValue("unlocked", true);
}

// ==== db/vehicles.js ====
const INSPECTION_ITEMS = [
  { key: "tire", label: "タイヤ" },
  { key: "oil", label: "オイル" },
  { key: "lamp", label: "ランプ類" },
  { key: "body", label: "車体（傷・破損）" },
  { key: "other", label: "その他" },
];

const INSPECTION_STATUS_CYCLE = ["正常", "注意", "異常", "要修理"];

const ISSUE_URGENCY = ["低", "中", "高"];
const ISSUE_STATUS = ["未対応", "対応中", "完了"];

function defaultInspectionItems() {
  const items = {};
  for (const it of INSPECTION_ITEMS) items[it.key] = "正常";
  return items;
}

/* --- Vehicles --- */
function listVehicles() {
  return readCollection("vehicles");
}

function getVehicle(id) {
  return listVehicles().find((v) => v.id === id) || null;
}

async function addVehicle(data) {
  const v = {
    id: makeId("v"),
    name: data.name || "",
    vehicleNumber: data.vehicleNumber || "",
    plateNumber: data.plateNumber || "",
    photo: data.photo || null,
    memo: data.memo || "",
    status: "稼働中",
    createdAt: new Date().toISOString(),
  };
  await addDoc("vehicles", v.id, v);
  return v;
}

async function updateVehicle(id, patch) {
  await updateDoc("vehicles", id, patch);
}

async function deleteVehicle(id) {
  await deleteDoc("vehicles", id);
}

/* --- Daily logs (日報) --- */
function listLogsForVehicle(vehicleId) {
  return readCollection("vehicleLogs")
    .filter((l) => l.vehicleId === vehicleId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function listAllLogs() {
  return readCollection("vehicleLogs").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getTodayOpenLog(vehicleId) {
  const today = todayStr();
  return readCollection("vehicleLogs").find(
    (l) => l.vehicleId === vehicleId && l.date === today && l.endOdometer == null
  ) || null;
}

async function addLog({ vehicleId, userId, date, startOdometer, startOdometerPhoto, hasIssue, memo }) {
  const log = {
    id: makeId("log"),
    vehicleId,
    userId,
    date: date || todayStr(),
    startOdometer: startOdometer != null ? Number(startOdometer) : null,
    startOdometerPhoto: startOdometerPhoto || null,
    endOdometer: null,
    endOdometerPhoto: null,
    hasIssue: !!hasIssue,
    memo: memo || "",
    createdAt: new Date().toISOString(),
  };
  await addDoc("vehicleLogs", log.id, log);
  await updateVehicle(vehicleId, { status: "使用中" });
  return log;
}

async function closeLog(logId, { endOdometer, endOdometerPhoto }) {
  const log = readCollection("vehicleLogs").find((l) => l.id === logId);
  if (!log) return null;
  const patch = {
    endOdometer: endOdometer != null ? Number(endOdometer) : null,
    endOdometerPhoto: endOdometerPhoto || null,
  };
  await updateDoc("vehicleLogs", logId, patch);
  await updateVehicle(log.vehicleId, { status: "稼働中" });
  return { ...log, ...patch };
}

/* --- Inspections (点検) --- */
function listInspectionsForVehicle(vehicleId) {
  return readCollection("vehicleInspections")
    .filter((i) => i.vehicleId === vehicleId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getLatestInspection(vehicleId) {
  return listInspectionsForVehicle(vehicleId)[0] || null;
}

function newInspectionDraft() {
  return defaultInspectionItems();
}

async function saveInspection({ vehicleId, userId, items, memo }) {
  const inspection = {
    id: makeId("insp"),
    vehicleId,
    userId,
    date: todayStr(),
    items,
    memo: memo || "",
    createdAt: new Date().toISOString(),
  };
  await addDoc("vehicleInspections", inspection.id, inspection);
  return inspection;
}

/* --- Issues (不具合) --- */
function listIssues({ vehicleId, statusIn } = {}) {
  let issues = readCollection("vehicleIssues");
  if (vehicleId) issues = issues.filter((i) => i.vehicleId === vehicleId);
  if (statusIn) issues = issues.filter((i) => statusIn.includes(i.status));
  return issues.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function addIssue({ vehicleId, userId, part, photo, comment, urgency }) {
  const issue = {
    id: makeId("issue"),
    vehicleId,
    userId,
    date: todayStr(),
    part: part || "その他",
    photo: photo || null,
    comment: comment || "",
    urgency: urgency || "中",
    status: "未対応",
    createdAt: new Date().toISOString(),
  };
  await addDoc("vehicleIssues", issue.id, issue);
  return issue;
}

async function updateIssueStatus(id, status) {
  await updateDoc("vehicleIssues", id, { status });
}

function countOpenIssues(vehicleId) {
  return listIssues({ vehicleId, statusIn: ["未対応", "対応中"] }).length;
}

function countAllOpenIssues() {
  return listIssues({ statusIn: ["未対応", "対応中"] }).length;
}

// ==== db/tools.js ====
const TOOL_STATUS = ["保管中", "使用中", "修理中", "廃棄"];
const COMMON_DAMAGE_TAGS = ["破損", "汚損", "動作不良", "部品欠損", "その他"];

/* --- Tool master --- */
function listTools() {
  return readCollection("tools");
}

function getTool(id) {
  return listTools().find((t) => t.id === id) || null;
}

function listCategories() {
  const cats = new Set(listTools().map((t) => t.category).filter(Boolean));
  return Array.from(cats);
}

async function addTool(data) {
  const tool = {
    id: makeId("t"),
    name: data.name || "",
    photo: data.photo || null,
    managementNumber: data.managementNumber || "",
    category: data.category || "",
    size: data.size || "",
    length: data.length || "",
    model: data.model || "",
    maker: data.maker || "",
    storageLocation: data.storageLocation || "",
    status: "保管中",
    memo: data.memo || "",
    createdAt: new Date().toISOString(),
  };
  await addDoc("tools", tool.id, tool);
  return tool;
}

async function updateTool(id, patch) {
  await updateDoc("tools", id, patch);
}

async function deleteTool(id) {
  await deleteDoc("tools", id);
}

/**
 * Candidate recognition for a captured photo.
 * This is a placeholder hook: a real deployment would send `photoDataUrl`
 * to an image-recognition API and rank tools by visual similarity.
 * For now it narrows candidates by category (if given) so the tap-to-select
 * flow works end-to-end, and falls back to the full available list.
 */
function recognizeToolCandidates({ category, excludeStatuses = ["廃棄"] } = {}) {
  let tools = listTools().filter((t) => !excludeStatuses.includes(t.status));
  if (category) tools = tools.filter((t) => t.category === category);
  return tools;
}

/* --- Checkouts (持ち出し / 返却) --- */
function listCheckouts({ status, userId, toolId } = {}) {
  let list = readCollection("toolCheckouts");
  if (status) list = list.filter((c) => c.status === status);
  if (userId) list = list.filter((c) => c.userId === userId);
  if (toolId) list = list.filter((c) => c.toolId === toolId);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getActiveCheckoutForTool(toolId) {
  return listCheckouts({ status: "貸出中", toolId })[0] || null;
}

async function checkoutTool({ toolId, userId, returnDueDate, photoOut }) {
  const checkout = {
    id: makeId("co"),
    toolId,
    userId,
    checkoutDate: todayStr(),
    returnDueDate: returnDueDate || addDays(todayStr(), 1),
    returnedDate: null,
    photoOut: photoOut || null,
    photoIn: null,
    damage: false,
    damageTags: [],
    damageComment: "",
    needsRepair: false,
    status: "貸出中",
    createdAt: new Date().toISOString(),
  };
  await addDoc("toolCheckouts", checkout.id, checkout);
  await updateTool(toolId, { status: "使用中" });
  return checkout;
}

async function returnTool(checkoutId, { damage = false, damageTags = [], damageComment = "", needsRepair = false, photoIn = null } = {}) {
  const checkout = readCollection("toolCheckouts").find((c) => c.id === checkoutId);
  if (!checkout) return null;
  const patch = { returnedDate: todayStr(), status: "返却済", damage, damageTags, damageComment, needsRepair, photoIn };
  await updateDoc("toolCheckouts", checkoutId, patch);
  await updateTool(checkout.toolId, { status: needsRepair ? "修理中" : "保管中" });
  return { ...checkout, ...patch };
}

function listToolHistory(toolId) {
  return listCheckouts({ toolId });
}

// ==== components/toast.js ====
let timer = null;

function showToast(message, { duration = 2200 } = {}) {
  document.querySelectorAll(".toast").forEach((el) => el.remove());
  const toast = h("div", { class: "toast" }, message);
  document.body.appendChild(toast);
  clearTimeout(timer);
  timer = setTimeout(() => toast.remove(), duration);
}

// ==== components/modal.js ====
function openModal({ title, content, actions = [] }) {
  const close = () => backdrop.remove();

  const actionRow = actions.length
    ? h("div", { class: "btn-row", style: "margin-top:18px;" }, actions.map((a) =>
        h("button", {
          class: `btn ${a.variant || "btn-outline"}`,
          onclick: () => { if (a.onClick) a.onClick(close); else close(); },
        }, a.label)
      ))
    : null;

  const sheet = h("div", { class: "modal-sheet" }, [
    h("div", { class: "modal-title" }, title),
    content instanceof Node ? content : h("div", {}, String(content ?? "")),
    actionRow,
  ]);

  const backdrop = h("div", {
    class: "modal-backdrop",
    onclick: (e) => { if (e.target === backdrop) close(); },
  }, sheet);

  document.body.appendChild(backdrop);
  return close;
}

function confirmDialog({ title = "確認", message, okLabel = "OK", cancelLabel = "キャンセル", danger = false }) {
  return new Promise((resolve) => {
    openModal({
      title,
      content: h("div", { style: "font-size:14px; color:var(--color-text-sub);" }, message),
      actions: [
        { label: cancelLabel, variant: "btn-outline", onClick: (close) => { close(); resolve(false); } },
        { label: okLabel, variant: danger ? "btn-danger" : "btn-primary", onClick: (close) => { close(); resolve(true); } },
      ],
    });
  });
}

// ==== components/statusBadge.js ====
const MAP = {
  "正常": "status-ok",
  "保管中": "status-ok",
  "稼働中": "status-ok",
  "完了": "status-ok",
  "返却済": "status-ok",
  "注意": "status-warn",
  "使用中": "status-warn",
  "貸出中": "status-warn",
  "対応中": "status-warn",
  "低": "status-ok",
  "中": "status-warn",
  "異常": "status-danger",
  "要修理": "status-repair",
  "修理中": "status-repair",
  "高": "status-danger",
  "未対応": "status-danger",
  "廃棄": "status-neutral",
};

function statusBadge(text) {
  const cls = MAP[text] || "status-neutral";
  return h("span", { class: `status ${cls}` }, text);
}

// ==== components/photoInput.js ====
const MAX_PHOTO_CHARS = 220000;

function createPhotoInput({ initialValue = null, label = "写真を撮影 / 選択", onChange } = {}) {
  let value = initialValue;

  const wrap = h("div", { class: "photo-input" });

  function render() {
    clear(wrap);
    if (value) {
      wrap.appendChild(h("img", { src: value }));
      wrap.appendChild(h("button", {
        class: "photo-input__remove",
        type: "button",
        onclick: (e) => {
          e.preventDefault();
          value = null;
          if (onChange) onChange(null);
          render();
        },
      }, "✕"));
    } else {
      wrap.appendChild(h("div", { class: "icon" }, "📷"));
      wrap.appendChild(h("div", {}, label));
      const input = h("input", {
        type: "file",
        accept: "image/*",
        capture: "environment",
        onchange: async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const compressed = await fileToCompressedDataUrl(file);
          if (compressed && compressed.length > MAX_PHOTO_CHARS) {
            showToast("写真のデータが大きすぎます。別の写真をお試しください");
            return;
          }
          value = compressed;
          if (onChange) onChange(value);
          render();
        },
      });
      wrap.appendChild(input);
    }
  }

  render();

  return {
    el: wrap,
    getValue: () => value,
    setValue: (v) => { value = v; render(); },
  };
}

// ==== components/pinPad.js ====
const PIN_LEN = 4;

function askPin({ title = "管理者PINを入力" } = {}) {
  return new Promise((resolve) => {
    let pin = "";

    const dots = h("div", { class: "pinpad-display" });
    const grid = h("div", { class: "pinpad-grid" });

    function renderDots() {
      clear(dots);
      for (let i = 0; i < PIN_LEN; i++) {
        dots.appendChild(h("div", { class: `pinpad-dot ${i < pin.length ? "filled" : ""}` }));
      }
    }

    function key(label, onClick) {
      return h("button", { class: "pinpad-key", type: "button", onclick: onClick }, label);
    }

    function press(n) {
      if (pin.length >= PIN_LEN) return;
      pin += String(n);
      renderDots();
      if (pin.length === PIN_LEN) {
        close();
        resolve(pin);
      }
    }

    for (let n = 1; n <= 9; n++) {
      grid.appendChild(key(String(n), () => press(n)));
    }
    grid.appendChild(key("削除", () => { pin = ""; renderDots(); }));
    grid.appendChild(key("0", () => press(0)));
    grid.appendChild(key("⌫", () => { pin = pin.slice(0, -1); renderDots(); }));

    renderDots();

    const close = openModal({
      title,
      content: h("div", {}, [dots, grid]),
      actions: [
        { label: "キャンセル", variant: "btn-outline", onClick: (c) => { c(); resolve(null); } },
      ],
    });
  });
}

// ==== components/header.js ====
const headerEl = h("header", { class: "app-header" });

function mountHeader(parent) {
  parent.appendChild(headerEl);
}

function updateHeader({ title = "North業務アプリ", back = null }) {
  clear(headerEl);
  const user = getCurrentUser();

  const inner = h("div", { class: "app-header__inner" }, [
    back
      ? h("button", { class: "app-header__back", onclick: () => navigate(back) }, "←")
      : h("div", { style: "width:40px" }),
    h("div", { class: "app-header__title" }, title),
    user
      ? h("button", {
          class: "app-header__user",
          onclick: () => navigate("/login"),
        }, [h("span", {}, `👤 ${user.name}`)])
      : null,
  ]);

  headerEl.appendChild(inner);
}

// ==== components/bottomNav.js ====
const navEl = h("nav", { class: "bottom-nav" });

const ITEMS = [
  { path: "/", icon: "🏠", label: "ホーム", match: (p) => p === "/" },
  { path: "/vehicles", icon: "🚚", label: "車両", match: (p) => p.startsWith("/vehicles") },
  { path: "/tools", icon: "🧰", label: "道具", match: (p) => p.startsWith("/tools") },
  { path: "/users", icon: "⚙️", label: "管理", match: (p) => p.startsWith("/users") || p.startsWith("/settings"), masterOnly: true },
];

function mountBottomNav(parent) {
  parent.appendChild(navEl);
}

function updateBottomNav() {
  clear(navEl);
  const user = getCurrentUser();
  const path = currentPath();
  const inner = h("div", { class: "bottom-nav__inner" });

  for (const item of ITEMS) {
    if (item.masterOnly && !isMaster(user)) continue;
    const active = item.match(path);
    inner.appendChild(h("button", {
      class: `bottom-nav__item ${active ? "active" : ""}`,
      onclick: () => navigate(item.path),
    }, [
      h("div", { class: "icon" }, item.icon),
      h("div", {}, item.label),
    ]));
  }
  navEl.appendChild(inner);
}

// ==== router.js ====
const routes = [];
let notFoundRender = () => document.createTextNode("Not Found");
let onRouteChange = () => {};
let liveUnsub = null;

function registerRoute(pattern, render, opts = {}) {
  const paramNames = [];
  const regex = new RegExp(
    "^" +
      pattern
        .split("/")
        .map((seg) => {
          if (seg.startsWith(":")) {
            paramNames.push(seg.slice(1));
            return "([^/]+)";
          }
          return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        })
        .join("/") +
      "$"
  );
  routes.push({ regex, paramNames, render, opts });
}

function setNotFound(render) {
  notFoundRender = render;
}

function onNavigate(cb) {
  onRouteChange = cb;
}

function navigate(path) {
  if (location.hash.slice(1) === path) {
    render();
  } else {
    location.hash = path;
  }
}

function currentPath() {
  return location.hash.slice(1) || "/";
}

function matchRoute(path) {
  for (const route of routes) {
    const m = path.match(route.regex);
    if (m) {
      const params = {};
      route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
      return { route, params };
    }
  }
  return null;
}

function render() {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  const path = currentPath();
  const matched = matchRoute(path);
  const app = document.getElementById("app");
  app.scrollTop = 0;
  window.scrollTo(0, 0);
  let node;
  if (matched) {
    node = matched.route.render(matched.params);
  } else {
    node = notFoundRender();
  }
  app.replaceChildren(node);
  onRouteChange({ path, opts: matched ? matched.route.opts : {} });
  if (matched && matched.route.opts.live) {
    liveUnsub = onDataChange(() => render());
  }
}

function startRouter() {
  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "/";
  render();
}

// ==== pages/accessGate.js ====
const ACCESS_PIN_LEN = 4;

function renderAccessGate({ onSuccess }) {
  let pin = "";

  const dots = h("div", { class: "pinpad-display" });
  const grid = h("div", { class: "pinpad-grid" });
  const errorMsg = h("div", {
    class: "field-hint",
    style: "text-align:center; color:var(--color-danger); min-height:16px; margin-bottom:8px; font-weight:700;",
  });

  function renderDots() {
    clear(dots);
    for (let i = 0; i < ACCESS_PIN_LEN; i++) {
      dots.appendChild(h("div", { class: `pinpad-dot ${i < pin.length ? "filled" : ""}` }));
    }
  }

  function key(label, onClick) {
    return h("button", { class: "pinpad-key", type: "button", onclick: onClick }, label);
  }

  function press(n) {
    if (pin.length >= ACCESS_PIN_LEN) return;
    pin += String(n);
    renderDots();
    if (pin.length === ACCESS_PIN_LEN) {
      if (pin === getAccessCode()) {
        onSuccess();
      } else {
        errorMsg.textContent = "合言葉が違います";
        pin = "";
        renderDots();
      }
    }
  }

  for (let n = 1; n <= 9; n++) grid.appendChild(key(String(n), () => press(n)));
  grid.appendChild(key("削除", () => { pin = ""; errorMsg.textContent = ""; renderDots(); }));
  grid.appendChild(key("0", () => press(0)));
  grid.appendChild(key("⌫", () => { pin = pin.slice(0, -1); renderDots(); }));

  renderDots();

  return h("div", {
    class: "page",
    style: "display:flex; flex-direction:column; justify-content:center; min-height:100vh; max-width:340px; margin:0 auto;",
  }, [
    h("div", { style: "text-align:center; margin-bottom:24px;" }, [
      h("div", { style: "font-size:22px; font-weight:800; color:var(--color-primary-dark);" }, "North業務アプリ"),
      h("div", { class: "field-hint", style: "margin-top:8px;" }, "合言葉を入力してください"),
    ]),
    dots,
    errorMsg,
    grid,
  ]);
}

// ==== pages/home.js ====
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

function renderHome() {
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

// ==== pages/login.js ====
function initials(name) {
  return name.trim().slice(0, 1);
}

function renderLogin() {
  const users = listUsers({ includeInactive: false });
  const current = getCurrentUser();

  const grid = h("div", { class: "user-grid" }, users.map((u) => h("button", {
    class: "user-avatar-card",
    onclick: async () => {
      if (u.role === "master") {
        const pin = await askPin({ title: "管理者PINを入力" });
        if (pin === null) return;
        if (pin !== getMasterPin()) {
          showToast("PINが違います");
          return;
        }
      }
      setCurrentUser(u.id);
      showToast(`${u.name} としてログインしました`);
      navigate("/");
    },
  }, [
    h("div", { class: "user-avatar" }, initials(u.name)),
    h("div", { class: "name" }, u.name),
    h("div", { class: "role" }, u.role === "master" ? "マスター管理者" : u.role === "manager" ? "管理者" : "一般"),
  ])));

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "ユーザーを選択"),
    current ? h("div", { class: "field-hint", style: "margin-bottom:14px;" }, `現在: ${current.name} でログイン中`) : null,
    grid,
  ]);
}

// ==== pages/settings.js ====
function renderSettings() {
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
    const ok = await confirmDialog({
      title: "データを初期化",
      message: "全てのデータ（車両・道具・履歴・ユーザー）を初期状態に戻します。よろしいですか？",
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
        h("span", { class: "v" }, "この端末のみ（ブラウザ内）"),
      ]),
      h("div", { class: "field-hint", style: "margin-top:6px;" }, "開いた端末ごとに別々のデータになります。他の人と同じデータを見るには本格運用サーバーが必要です。"),
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

// ==== pages/vehicles/list.js ====
function renderVehicleList() {
  const vehicles = listVehicles();
  const user = getCurrentUser();

  const items = vehicles.length
    ? vehicles.map((v) => {
        const openIssues = countOpenIssues(v.id);
        return h("button", {
          class: "list-item",
          style: "width:100%; text-align:left; border:1px solid var(--color-border); background:var(--color-surface);",
          onclick: () => navigate(`/vehicles/${v.id}`),
        }, [
          v.photo
            ? h("img", { class: "list-item__thumb", src: v.photo })
            : h("div", { class: "list-item__thumb" }, "🚚"),
          h("div", { class: "list-item__body" }, [
            h("div", { class: "list-item__title" }, v.name),
            h("div", { class: "list-item__sub" }, `${v.vehicleNumber || ""} ${v.plateNumber ? "・" + v.plateNumber : ""}`),
            h("div", { style: "margin-top:6px; display:flex; gap:6px;" }, [
              statusBadge(v.status),
              openIssues > 0 ? h("span", { class: "status status-danger" }, `不具合 ${openIssues}`) : null,
            ]),
          ]),
          h("div", { class: "list-item__chevron" }, "›"),
        ]);
      })
    : [h("div", { class: "empty-state" }, [
        h("div", { class: "icon" }, "🚚"),
        h("div", { class: "msg" }, "登録されている車両がありません"),
      ])];

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "車両管理"),
    isManager(user) ? h("button", {
      class: "btn btn-accent",
      style: "margin-bottom:16px;",
      onclick: () => navigate("/vehicles/new"),
    }, "＋ 車両を登録") : null,
    isManager(user) ? h("button", {
      class: "btn btn-outline",
      style: "margin-bottom:16px;",
      onclick: () => navigate("/vehicles/issues"),
    }, "⚠ 不具合一覧（管理者）") : null,
    ...items,
  ]);
}

// ==== pages/vehicles/form.js ====
function renderVehicleForm({ id } = {}) {
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

// ==== pages/vehicles/dailyReport.js ====
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

function renderDailyReport({ id }) {
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

// ==== pages/vehicles/inspection.js ====
function renderInspection({ id }) {
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

// ==== pages/vehicles/issueReport.js ====
const URGENCY_CLASS = { "低": "urgency-low", "中": "urgency-mid", "高": "urgency-high" };

function renderIssueReport({ id }) {
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

// ==== pages/vehicles/issueList.js ====
function renderIssueList() {
  let filter = "未対応";
  const tabRow = h("div", { class: "tab-row" });
  const listEl = h("div", {});

  function renderTabs() {
    clear(tabRow);
    ["未対応", "対応中", "完了", "すべて"].forEach((t) => {
      tabRow.appendChild(h("button", {
        class: `tab-item ${filter === t ? "active" : ""}`,
        onclick: () => { filter = t; renderTabs(); renderList(); },
      }, t));
    });
  }

  function openDetail(issue) {
    const vehicle = getVehicle(issue.vehicleId);
    const user = getUser(issue.userId);
    const statusRow = h("div", { class: "chip-row", style: "margin-top:14px;" });
    ISSUE_STATUS.forEach((s) => {
      statusRow.appendChild(h("button", {
        class: `chip ${issue.status === s ? "selected" : ""}`,
        onclick: async () => {
          await updateIssueStatus(issue.id, s);
          showToast("状態を更新しました");
          close();
          renderList();
        },
      }, s));
    });

    const close = openModal({
      title: `${vehicle?.name || "不明な車両"} － ${issue.part}`,
      content: h("div", {}, [
        issue.photo ? h("img", { src: issue.photo, style: "width:100%; border-radius:12px; margin-bottom:12px;" }) : null,
        h("div", { class: "kv-row" }, [h("span", { class: "k" }, "報告者") , h("span", { class: "v" }, user?.name || "-")]),
        h("div", { class: "kv-row" }, [h("span", { class: "k" }, "報告日"), h("span", { class: "v" }, formatJP(issue.date))]),
        h("div", { class: "kv-row" }, [h("span", { class: "k" }, "緊急度"), statusBadge(issue.urgency)]),
        issue.comment ? h("div", { style: "margin-top:10px; font-size:14px;" }, issue.comment) : null,
        h("div", { class: "field-hint", style: "margin-top:14px;" }, "対応状況を選択"),
        statusRow,
      ]),
    });
  }

  function renderList() {
    clear(listEl);
    const statusIn = filter === "すべて" ? undefined : [filter];
    const issues = listIssues({ statusIn });
    if (!issues.length) {
      listEl.appendChild(h("div", { class: "empty-state" }, [
        h("div", { class: "icon" }, "✅"),
        h("div", { class: "msg" }, "該当する不具合はありません"),
      ]));
      return;
    }
    issues.forEach((issue) => {
      const vehicle = getVehicle(issue.vehicleId);
      listEl.appendChild(h("button", {
        class: "list-item",
        style: "width:100%; text-align:left;",
        onclick: () => openDetail(issue),
      }, [
        issue.photo ? h("img", { class: "list-item__thumb", src: issue.photo }) : h("div", { class: "list-item__thumb" }, "⚠"),
        h("div", { class: "list-item__body" }, [
          h("div", { class: "list-item__title" }, `${vehicle?.name || "不明"} － ${issue.part}`),
          h("div", { class: "list-item__sub" }, formatJP(issue.date)),
          h("div", { style: "margin-top:6px; display:flex; gap:6px;" }, [statusBadge(issue.urgency), statusBadge(issue.status)]),
        ]),
      ]));
    });
  }

  renderTabs();
  renderList();

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "不具合一覧"),
    tabRow,
    listEl,
  ]);
}

// ==== pages/vehicles/detail.js ====
function renderVehicleDetail({ id }) {
  const vehicle = getVehicle(id);
  if (!vehicle) return h("div", { class: "page" }, "車両が見つかりません");

  const user = getCurrentUser();
  const openLog = getTodayOpenLog(id);
  const latestInspection = getLatestInspection(id);
  const openIssues = listIssues({ vehicleId: id, statusIn: ["未対応", "対応中"] });

  const tabRow = h("div", { class: "tab-row" });
  const tabBody = h("div", {});
  let activeTab = "日報履歴";

  function renderTabs() {
    clear(tabRow);
    ["日報履歴", "点検履歴", "不具合履歴"].forEach((t) => {
      tabRow.appendChild(h("button", {
        class: `tab-item ${activeTab === t ? "active" : ""}`,
        onclick: () => { activeTab = t; renderTabs(); renderBody(); },
      }, t));
    });
  }

  function renderBody() {
    clear(tabBody);
    if (activeTab === "日報履歴") {
      const logs = listLogsForVehicle(id);
      if (!logs.length) { tabBody.appendChild(emptyMsg("日報の記録がありません")); return; }
      logs.forEach((log) => {
        const u = getUser(log.userId);
        const startCell = log.startOdometer != null
          ? `${log.startOdometer}`
          : log.startOdometerPhoto ? h("img", { src: log.startOdometerPhoto, style: "width:28px;height:28px;border-radius:6px;object-fit:cover;vertical-align:middle;" }) : "-";
        const endCell = log.endOdometer != null
          ? `${log.endOdometer}`
          : log.endOdometerPhoto ? h("img", { src: log.endOdometerPhoto, style: "width:28px;height:28px;border-radius:6px;object-fit:cover;vertical-align:middle;" }) : "未終了";
        tabBody.appendChild(h("div", { class: "card" }, [
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, formatJP(log.date)), h("span", { class: "v" }, u?.name || "-")]),
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, "走行距離（km）"), h("span", { class: "v", style: "display:flex; align-items:center; gap:6px;" }, [startCell, " → ", endCell])]),
          log.hasIssue ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "異常"), statusBadge("異常")]) : null,
          log.memo ? h("div", { style: "margin-top:6px; font-size:13px; color:var(--color-text-sub);" }, log.memo) : null,
        ]));
      });
    } else if (activeTab === "点検履歴") {
      const insps = listInspectionsForVehicle(id);
      if (!insps.length) { tabBody.appendChild(emptyMsg("点検の記録がありません")); return; }
      insps.forEach((insp) => {
        const u = getUser(insp.userId);
        tabBody.appendChild(h("div", { class: "card" }, [
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, formatJP(insp.date)), h("span", { class: "v" }, u?.name || "-")]),
          h("div", { style: "display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;" },
            INSPECTION_ITEMS.map((it) => h("span", { style: "font-size:12px; display:flex; align-items:center; gap:4px;" }, [it.label, statusBadge(insp.items[it.key])]))),
        ]));
      });
    } else {
      const issues = listIssues({ vehicleId: id });
      if (!issues.length) { tabBody.appendChild(emptyMsg("不具合の記録がありません")); return; }
      issues.forEach((issue) => {
        tabBody.appendChild(h("div", { class: "card" }, [
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, formatJP(issue.date)), h("span", { class: "v" }, issue.part)]),
          h("div", { style: "display:flex; gap:6px; margin-top:6px;" }, [statusBadge(issue.urgency), statusBadge(issue.status)]),
          issue.comment ? h("div", { style: "margin-top:6px; font-size:13px; color:var(--color-text-sub);" }, issue.comment) : null,
        ]));
      });
    }
  }

  function emptyMsg(msg) {
    return h("div", { class: "empty-state" }, [h("div", { class: "msg" }, msg)]);
  }

  renderTabs();
  renderBody();

  return h("div", { class: "page" }, [
    vehicle.photo ? h("img", { class: "detail-photo", src: vehicle.photo }) : h("div", { class: "detail-photo" }, "🚚"),
    h("div", { class: "page-title" }, vehicle.name),
    h("div", { class: "card" }, [
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "車両番号"), h("span", { class: "v" }, vehicle.vehicleNumber || "-")]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "ナンバー"), h("span", { class: "v" }, vehicle.plateNumber || "-")]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "状態"), statusBadge(vehicle.status)]),
      openLog ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "本日の使用者"), h("span", { class: "v" }, getUser(openLog.userId)?.name || "-")]) : null,
      vehicle.memo ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "備考"), h("span", { class: "v" }, vehicle.memo)]) : null,
    ]),
    latestInspection ? h("div", { class: "card" }, [
      h("div", { class: "section-title", style: "margin:0 0 8px;" }, "直近の点検結果"),
      h("div", { style: "display:flex; flex-wrap:wrap; gap:8px;" },
        INSPECTION_ITEMS.map((it) => h("span", { style: "font-size:12px; display:flex; align-items:center; gap:4px;" }, [it.label, statusBadge(latestInspection.items[it.key])]))),
    ]) : null,
    openIssues.length ? h("div", { class: "card", style: "border-color: var(--color-danger);" }, [
      h("div", { class: "section-title", style: "margin:0 0 8px; color:var(--color-danger);" }, `未対応の不具合 ${openIssues.length}件`),
      ...openIssues.map((i) => h("div", { style: "font-size:13px; margin-bottom:4px;" }, `${i.part}（${i.urgency}）`)),
    ]) : null,
    h("div", { class: "btn-row", style: "margin: 16px 0;" }, [
      h("button", { class: "btn btn-primary", onclick: () => navigate(`/vehicles/${id}/report`) }, openLog ? "使用終了を入力" : "使用開始（日報）"),
    ]),
    h("div", { class: "btn-row", style: "margin-bottom:16px;" }, [
      h("button", { class: "btn btn-outline", onclick: () => navigate(`/vehicles/${id}/inspection`) }, "🔧 日常点検"),
      h("button", { class: "btn btn-outline", onclick: () => navigate(`/vehicles/${id}/issue`) }, "⚠ 不具合報告"),
    ]),
    isManager(user) ? h("button", { class: "btn btn-ghost", style: "margin-bottom:10px;", onclick: () => navigate(`/vehicles/${id}/edit`) }, "車両情報を編集") : null,
    h("div", { class: "section-title" }, "履歴"),
    tabRow,
    tabBody,
  ]);
}

// ==== pages/tools/list.js ====
function renderToolList() {
  const tools = listTools();
  const user = getCurrentUser();

  const items = tools.length
    ? tools.map((t) => h("button", {
        class: "list-item",
        style: "width:100%; text-align:left; border:1px solid var(--color-border); background:var(--color-surface);",
        onclick: () => navigate(`/tools/${t.id}`),
      }, [
        t.photo ? h("img", { class: "list-item__thumb", src: t.photo }) : h("div", { class: "list-item__thumb" }, "🧰"),
        h("div", { class: "list-item__body" }, [
          h("div", { class: "list-item__title" }, t.name),
          h("div", { class: "list-item__sub" }, `${t.managementNumber || ""} ${t.category ? "・" + t.category : ""}`),
          h("div", { style: "margin-top:6px;" }, statusBadge(t.status)),
        ]),
        h("div", { class: "list-item__chevron" }, "›"),
      ]))
    : [h("div", { class: "empty-state" }, [
        h("div", { class: "icon" }, "🧰"),
        h("div", { class: "msg" }, "登録されている道具がありません"),
      ])];

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "道具・備品管理"),
    h("div", { class: "btn-row", style: "margin-bottom:16px;" }, [
      h("button", { class: "btn btn-accent", onclick: () => navigate("/tools/checkout") }, "📷 持ち出す"),
      h("button", { class: "btn btn-primary", onclick: () => navigate("/tools/return") }, "↩ 返却する"),
    ]),
    isManager(user) ? h("button", {
      class: "btn btn-outline",
      style: "margin-bottom:16px;",
      onclick: () => navigate("/tools/new"),
    }, "＋ 道具を登録") : null,
    h("button", {
      class: "btn btn-ghost",
      style: "margin-bottom:16px;",
      onclick: () => navigate("/tools/history"),
    }, "履歴を見る"),
    h("div", { class: "section-title" }, "道具一覧"),
    ...items,
  ]);
}

// ==== pages/tools/form.js ====
function renderToolForm({ id } = {}) {
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

// ==== pages/tools/detail.js ====
function renderToolDetail({ id }) {
  const tool = getTool(id);
  if (!tool) return h("div", { class: "page" }, "道具が見つかりません");

  const user = getCurrentUser();
  const activeCheckout = getActiveCheckoutForTool(id);
  const history = listToolHistory(id);

  return h("div", { class: "page" }, [
    tool.photo ? h("img", { class: "detail-photo", src: tool.photo }) : h("div", { class: "detail-photo" }, "🧰"),
    h("div", { class: "page-title" }, tool.name),
    h("div", { class: "card" }, [
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "管理番号"), h("span", { class: "v" }, tool.managementNumber || "-")]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "カテゴリー"), h("span", { class: "v" }, tool.category || "-")]),
      tool.length ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "長さ"), h("span", { class: "v" }, tool.length)]) : null,
      tool.size ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "サイズ"), h("span", { class: "v" }, tool.size)]) : null,
      tool.model ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "型式"), h("span", { class: "v" }, tool.model)]) : null,
      tool.maker ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "メーカー"), h("span", { class: "v" }, tool.maker)]) : null,
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "保管場所"), h("span", { class: "v" }, tool.storageLocation || "-")]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "状態"), statusBadge(tool.status)]),
      tool.memo ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "備考"), h("span", { class: "v" }, tool.memo)]) : null,
    ]),
    activeCheckout ? h("div", { class: "card", style: "border-color: var(--color-warn);" }, [
      h("div", { class: "section-title", style: "margin:0 0 8px;" }, "現在の貸出状況"),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "持ち出し者"), h("span", { class: "v" }, getUser(activeCheckout.userId)?.name || "-")]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "持ち出し日"), h("span", { class: "v" }, formatJP(activeCheckout.checkoutDate))]),
      h("div", { class: "kv-row" }, [h("span", { class: "k" }, "返却予定日"), h("span", { class: "v" }, formatJP(activeCheckout.returnDueDate))]),
    ]) : null,
    isManager(user) ? h("button", { class: "btn btn-ghost", style: "margin-bottom:10px;", onclick: () => navigate(`/tools/${id}/edit`) }, "道具情報を編集") : null,
    h("div", { class: "section-title" }, "持ち出し履歴"),
    history.length
      ? history.map((c) => h("div", { class: "card" }, [
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, getUser(c.userId)?.name || "-"), statusBadge(c.status)]),
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, "持ち出し"), h("span", { class: "v" }, formatJP(c.checkoutDate))]),
          h("div", { class: "kv-row" }, [h("span", { class: "k" }, c.returnedDate ? "返却日" : "返却予定日"), h("span", { class: "v" }, formatJP(c.returnedDate || c.returnDueDate))]),
          c.damage ? h("div", { class: "kv-row" }, [h("span", { class: "k" }, "破損報告"), h("span", { class: "v", style: "color:var(--color-danger);" }, c.damageTags.join("、") || "あり")]) : null,
        ]))
      : h("div", { class: "empty-state" }, [h("div", { class: "msg" }, "履歴がありません")]),
  ]);
}

// ==== pages/tools/checkout.js ====
function renderToolCheckout() {
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

// ==== pages/tools/return.js ====
function renderToolReturn() {
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

// ==== pages/tools/history.js ====
function renderToolHistory() {
  let filter = "すべて";
  const tabRow = h("div", { class: "tab-row" });
  const listEl = h("div", {});

  function renderTabs() {
    clear(tabRow);
    ["すべて", "貸出中", "返却済"].forEach((t) => {
      tabRow.appendChild(h("button", {
        class: `tab-item ${filter === t ? "active" : ""}`,
        onclick: () => { filter = t; renderTabs(); renderList(); },
      }, t));
    });
  }

  function renderList() {
    clear(listEl);
    const checkouts = listCheckouts(filter === "すべて" ? {} : { status: filter });
    if (!checkouts.length) {
      listEl.appendChild(h("div", { class: "empty-state" }, [h("div", { class: "msg" }, "履歴がありません")]));
      return;
    }
    checkouts.forEach((c) => {
      const tool = getTool(c.toolId);
      const user = getUser(c.userId);
      listEl.appendChild(h("div", { class: "list-item" }, [
        tool?.photo ? h("img", { class: "list-item__thumb", src: tool.photo }) : h("div", { class: "list-item__thumb" }, "🧰"),
        h("div", { class: "list-item__body" }, [
          h("div", { class: "list-item__title" }, tool?.name || "不明な道具"),
          h("div", { class: "list-item__sub" }, `${user?.name || "-"} ・ ${formatJP(c.checkoutDate)} 〜 ${c.returnedDate ? formatJP(c.returnedDate) : formatJP(c.returnDueDate) + "予定"}`),
          h("div", { style: "margin-top:6px; display:flex; gap:6px;" }, [
            statusBadge(c.status),
            c.damage ? statusBadge("要修理") : null,
          ]),
        ]),
      ]));
    });
  }

  renderTabs();
  renderList();

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "持ち出し履歴"),
    tabRow,
    listEl,
  ]);
}

// ==== pages/users/list.js ====
const ROLE_LABEL = { master: "マスター管理者", manager: "管理者", staff: "一般" };

function renderUserList() {
  const users = listUsers();

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "ユーザー管理"),
    h("button", { class: "btn btn-accent", style: "margin-bottom:16px;", onclick: () => navigate("/users/new") }, "＋ ユーザーを追加"),
    ...users.map((u) => h("button", {
      class: "list-item",
      style: "width:100%; text-align:left;",
      onclick: () => navigate(`/users/${u.id}/edit`),
    }, [
      h("div", { class: "list-item__thumb" }, u.name.slice(0, 1)),
      h("div", { class: "list-item__body" }, [
        h("div", { class: "list-item__title" }, u.name),
        h("div", { class: "list-item__sub" }, `${ROLE_LABEL[u.role] || u.role}${u.active ? "" : "・無効"}`),
      ]),
      h("div", { class: "list-item__chevron" }, "›"),
    ])),
    h("div", { class: "section-title" }, "設定"),
    h("button", { class: "btn btn-outline", onclick: () => navigate("/settings") }, "⚙ アプリ設定"),
  ]);
}

// ==== pages/users/form.js ====
const ROLES = [
  { value: "manager", label: "管理者" },
  { value: "staff", label: "一般" },
];

function renderUserForm({ id } = {}) {
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

// ==== app.js ====
function guard(renderFn, { role = null } = {}) {
  return (params) => {
    const user = getCurrentUser();
    if (!user) {
      navigate("/login");
      return h("div", { class: "page" });
    }
    if (role === "manager" && !isManager(user)) {
      return h("div", { class: "page empty-state" }, [h("div", { class: "msg" }, "この操作には管理者権限が必要です")]);
    }
    if (role === "master" && !isMaster(user)) {
      return h("div", { class: "page empty-state" }, [h("div", { class: "msg" }, "この操作にはマスター管理者権限が必要です")]);
    }
    return renderFn(params);
  };
}

function registerAllRoutes() {
  registerRoute("/", guard(renderHome), { title: "North業務アプリ", live: true });
  registerRoute("/login", () => renderLogin(), { title: "ユーザー選択", live: true });

  registerRoute("/vehicles", guard(renderVehicleList), { title: "車両管理", back: "/", live: true });
  registerRoute("/vehicles/new", guard(renderVehicleForm, { role: "manager" }), { title: "車両登録", back: "/vehicles" });
  registerRoute("/vehicles/issues", guard(renderIssueList, { role: "manager" }), { title: "不具合一覧", back: "/vehicles", live: true });
  registerRoute("/vehicles/:id", guard(renderVehicleDetail), { title: "車両詳細", back: "/vehicles", live: true });
  registerRoute("/vehicles/:id/edit", guard(renderVehicleForm, { role: "manager" }), { title: "車両編集", back: "/vehicles" });
  registerRoute("/vehicles/:id/report", guard(renderDailyReport), { title: "車両日報", back: "/vehicles" });
  registerRoute("/vehicles/:id/inspection", guard(renderInspection), { title: "日常点検", back: "/vehicles" });
  registerRoute("/vehicles/:id/issue", guard(renderIssueReport), { title: "不具合報告", back: "/vehicles" });

  registerRoute("/tools", guard(renderToolList), { title: "道具管理", back: "/", live: true });
  registerRoute("/tools/new", guard(renderToolForm, { role: "manager" }), { title: "道具登録", back: "/tools" });
  registerRoute("/tools/checkout", guard(renderToolCheckout), { title: "持ち出し", back: "/tools" });
  registerRoute("/tools/return", guard(renderToolReturn), { title: "返却", back: "/tools" });
  registerRoute("/tools/history", guard(renderToolHistory), { title: "履歴", back: "/tools", live: true });
  registerRoute("/tools/:id", guard(renderToolDetail), { title: "道具詳細", back: "/tools", live: true });
  registerRoute("/tools/:id/edit", guard(renderToolForm, { role: "manager" }), { title: "道具編集", back: "/tools" });

  registerRoute("/users", guard(renderUserList, { role: "master" }), { title: "ユーザー管理", back: "/", live: true });
  registerRoute("/users/new", guard(renderUserForm, { role: "master" }), { title: "ユーザー追加", back: "/users" });
  registerRoute("/users/:id/edit", guard(renderUserForm, { role: "master" }), { title: "ユーザー編集", back: "/users" });
  registerRoute("/settings", guard(renderSettings, { role: "master" }), { title: "アプリ設定", back: "/users" });

  setNotFound(() => h("div", { class: "page empty-state" }, [h("div", { class: "msg" }, "ページが見つかりません")]));

  onNavigate(({ opts }) => {
    updateHeader({ title: opts.title, back: opts.back });
    updateBottomNav();
  });
}

async function boot() {
  const appEl = document.getElementById("app");

  if (!isUnlocked()) {
    appEl.replaceChildren(renderAccessGate({
      onSuccess: () => { setUnlocked(); boot(); },
    }));
    return;
  }

  appEl.replaceChildren(h("div", { class: "page empty-state" }, [
    h("div", { class: "icon" }, "⏳"),
    h("div", { class: "msg" }, "読み込み中..."),
  ]));

  try {
    await initStore();
  } catch {
    // initStore() already falls back internally; this is a last-resort guard
    // so the app never gets stuck on the loading screen.
  }

  registerAllRoutes();
  mountHeader(document.body);
  mountBottomNav(document.body);
  startRouter();
}

boot().catch((err) => {
  const appEl = document.getElementById("app");
  appEl.replaceChildren(h("div", { class: "page empty-state" }, [
    h("div", { class: "icon" }, "⚠️" ),
    h("div", { class: "msg" }, "読み込みに失敗しました。再読み込みしてください。"),
  ]));
  console.error(err);
});

