const PREFIX = "northApp:";
const COLLECTIONS = ["users", "vehicles", "vehicleLogs", "vehicleInspections", "vehicleIssues", "tools", "toolCheckouts"];

const dataListeners = new Set();

function notify() {
  dataListeners.forEach((cb) => { try { cb(); } catch { /* ignore listener errors */ } });
}

export function onDataChange(cb) {
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

export async function initStore() {
  ensureLocalSeeded();
}

export function readCollection(name) {
  return localRead(name, []);
}

export function readValue(name, fallback = null) {
  return localRead(name, fallback);
}

export function writeValue(name, val) {
  localWrite(name, val);
}

export async function addDoc(name, id, data) {
  const arr = localRead(name, []);
  arr.push(data);
  localWrite(name, arr);
  notify();
  return data;
}

export async function updateDoc(name, id, patch) {
  const arr = localRead(name, []);
  const idx = arr.findIndex((x) => x.id === id);
  if (idx !== -1) {
    arr[idx] = { ...arr[idx], ...patch };
    localWrite(name, arr);
    notify();
  }
}

export async function deleteDoc(name, id) {
  localWrite(name, localRead(name, []).filter((x) => x.id !== id));
  notify();
}

export async function resetAllData() {
  Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  ensureLocalSeeded();
  notify();
}
