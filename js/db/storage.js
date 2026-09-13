const PROJECT_ID = "north-app-web";
const API_KEY = "AIzaSyAtcgZII2a3grevgwOGdEbXKpCT_va4Keo";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const POLL_INTERVAL_MS = 4000;

function withKey(url) {
  return url + (url.includes("?") ? "&" : "?") + "key=" + API_KEY;
}

const LOCAL_PREFIX = "northApp:";
const COLLECTIONS = ["users", "vehicles", "vehicleLogs", "vehicleInspections", "vehicleIssues", "tools", "toolCheckouts"];
const CONFIG_COLLECTION = "config";
const CONFIG_DOC_ID = "app";
const LOCAL_ONLY_KEYS = new Set(["currentUserId", "unlocked"]);

const cache = { config: { masterPin: "0000", accessCode: "0000" } };
const dataListeners = new Set();

function notify() {
  // Iterate over a snapshot: the router re-subscribes a fresh listener on every
  // render, and Set.forEach visits entries added mid-iteration — iterating the
  // live Set turned the first data update into an endless synchronous render
  // loop that froze the page.
  [...dataListeners].forEach((cb) => {
    try {
      cb();
    } catch (err) {
      // A render error here must never be swallowed silently — it was
      // previously invisible and made the whole page look permanently stuck.
      console.error("onDataChange listener threw", err);
    }
  });
}

export function onDataChange(cb) {
  dataListeners.add(cb);
  return () => dataListeners.delete(cb);
}

function localKey(name) {
  return LOCAL_PREFIX + name;
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

/* --- Firestore REST value <-> plain JS object conversion --- */
function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === "object") return { mapValue: { fields: toFirestoreFields(v) } };
  return { stringValue: String(v) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, val] of Object.entries(obj)) fields[k] = toFirestoreValue(val);
  return fields;
}

function fromFirestoreValue(v) {
  if (!v) return null;
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in v) return fromFirestoreFields(v.mapValue.fields || {});
  return null;
}

function fromFirestoreFields(fields) {
  const obj = {};
  for (const [k, val] of Object.entries(fields || {})) obj[k] = fromFirestoreValue(val);
  return obj;
}

/* --- Plain REST calls (no SDK, no persistent connection) --- */
function fetchWithTimeout(url, options, ms = 6000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const t = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("timeout"));
    }, ms);
    fetch(url, options).then(
      (res) => { if (!settled) { settled = true; clearTimeout(t); resolve(res); } },
      (err) => { if (!settled) { settled = true; clearTimeout(t); reject(err); } }
    );
  });
}

async function fsListCollection(name) {
  const res = await fetchWithTimeout(withKey(`${BASE_URL}/${name}?pageSize=300`));
  if (!res.ok) throw new Error(`list ${name} failed: ${res.status}`);
  const data = await res.json();
  return (data.documents || []).map((d) => {
    const id = d.name.split("/").pop();
    return { id, ...fromFirestoreFields(d.fields) };
  });
}

async function fsGetDoc(name, id) {
  const res = await fetchWithTimeout(withKey(`${BASE_URL}/${name}/${id}`));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`get ${name}/${id} failed: ${res.status}`);
  const d = await res.json();
  return fromFirestoreFields(d.fields);
}

async function fsSetDoc(name, id, data) {
  const res = await fetchWithTimeout(withKey(`${BASE_URL}/${name}/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!res.ok) throw new Error(`set ${name}/${id} failed: ${res.status}`);
}

async function fsUpdateDoc(name, id, patch) {
  const mask = Object.keys(patch).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const res = await fetchWithTimeout(withKey(`${BASE_URL}/${name}/${id}?${mask}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFirestoreFields(patch) }),
  });
  if (!res.ok) throw new Error(`update ${name}/${id} failed: ${res.status}`);
}

async function fsDeleteDoc(name, id) {
  const res = await fetchWithTimeout(withKey(`${BASE_URL}/${name}/${id}`), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`delete ${name}/${id} failed: ${res.status}`);
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

async function ensureSeeded() {
  const config = await fsGetDoc(CONFIG_COLLECTION, CONFIG_DOC_ID);
  if (config && config.seeded) return;

  const seed = seedData();
  const writes = [];
  for (const name of COLLECTIONS) {
    for (const item of seed[name]) writes.push(fsSetDoc(name, item.id, item));
  }
  await Promise.all(writes);
  await fsSetDoc(CONFIG_COLLECTION, CONFIG_DOC_ID, { masterPin: "0000", accessCode: "0000", seeded: true });
}

let pollTimer = null;
let lastRefreshAt = null;
let refreshStartedAt = null;
let currentlyFetching = null;
const lastErrors = {};

export function getDiagnostics() {
  return {
    lastRefreshAt,
    refreshStartedAt,
    currentlyFetching,
    counts: Object.fromEntries(COLLECTIONS.map((name) => [name, (cache[name] || []).length])),
    errors: { ...lastErrors },
  };
}

export function getLastError() {
  const entries = Object.entries(lastErrors);
  if (!entries.length) return null;
  return entries.map(([name, msg]) => `${name}: ${msg}`).join(" / ");
}

function describeError(err) {
  if (err instanceof DOMException && err.name === "AbortError") return "timeout";
  return err?.message || String(err);
}

// Firestore REST returns map fields in no guaranteed order, so a plain
// JSON.stringify would report "changed" on identical data.
function stableStringify(v) {
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
  }
  return JSON.stringify(v ?? null);
}

async function refreshAll() {
  // Fetch one collection at a time (not in parallel) — some networks appear
  // to stall when several requests to the same host fire simultaneously.
  // Update the cache and notify after each one so partial progress shows up
  // immediately instead of waiting on the slowest/stuck request.
  // Only notify when data or error state actually changed — re-rendering every
  // few seconds regardless kept resetting the page under the user.
  refreshStartedAt = new Date().toISOString();
  for (const name of COLLECTIONS) {
    currentlyFetching = name;
    const before = stableStringify([cache[name], lastErrors[name]]);
    try {
      cache[name] = await fsListCollection(name);
      delete lastErrors[name];
    } catch (err) {
      console.error(`Firestore refresh failed for ${name}`, err);
      lastErrors[name] = describeError(err);
    }
    lastRefreshAt = new Date().toISOString();
    if (stableStringify([cache[name], lastErrors[name]]) !== before) notify();
  }
  currentlyFetching = "config";
  const configBefore = stableStringify([cache.config, lastErrors.config]);
  try {
    const config = await fsGetDoc(CONFIG_COLLECTION, CONFIG_DOC_ID);
    cache.config = config || { masterPin: "0000", accessCode: "0000" };
    delete lastErrors.config;
  } catch (err) {
    console.error("Firestore config refresh failed", err);
    lastErrors.config = describeError(err);
  }
  currentlyFetching = null;
  if (stableStringify([cache.config, lastErrors.config]) !== configBefore) notify();
}

function startPolling() {
  if (pollTimer) return;
  refreshAll();
  pollTimer = setInterval(refreshAll, POLL_INTERVAL_MS);
}

export async function initStore() {
  // Fetch real data immediately — never let the one-time seed check gate this.
  startPolling();
  try {
    await ensureSeeded();
  } catch (err) {
    console.error("Seed check failed", err);
  }
}

export function readCollection(name) {
  return cache[name] || [];
}

export function readValue(name, fallback = null) {
  if (LOCAL_ONLY_KEYS.has(name)) return localRead(name, fallback);
  if (name === "masterPin") return (cache.config && cache.config.masterPin) || "0000";
  if (name === "accessCode") return (cache.config && cache.config.accessCode) || "0000";
  return fallback;
}

export function writeValue(name, val) {
  if (LOCAL_ONLY_KEYS.has(name)) { localWrite(name, val); return; }
  if (name === "masterPin" || name === "accessCode") {
    cache.config = { ...cache.config, [name]: val };
    fsUpdateDoc(CONFIG_COLLECTION, CONFIG_DOC_ID, { [name]: val }).catch((err) => console.error(err));
  }
}

export async function addDoc(name, id, data) {
  await fsSetDoc(name, id, data);
  const arr = cache[name] || (cache[name] = []);
  const idx = arr.findIndex((x) => x.id === id);
  const item = { id, ...data };
  if (idx === -1) arr.push(item); else arr[idx] = item;
  notify();
  return data;
}

export async function updateDoc(name, id, patch) {
  await fsUpdateDoc(name, id, patch);
  const arr = cache[name] || [];
  const idx = arr.findIndex((x) => x.id === id);
  if (idx !== -1) arr[idx] = { ...arr[idx], ...patch };
  notify();
}

export async function deleteDoc(name, id) {
  await fsDeleteDoc(name, id);
  cache[name] = (cache[name] || []).filter((x) => x.id !== id);
  notify();
}

export async function resetAllData() {
  for (const name of COLLECTIONS) {
    const items = await fsListCollection(name);
    await Promise.all(items.map((item) => fsDeleteDoc(name, item.id)));
  }

  const seed = seedData();
  const writes = [];
  for (const name of COLLECTIONS) {
    for (const item of seed[name]) writes.push(fsSetDoc(name, item.id, item));
  }
  await Promise.all(writes);
  await fsSetDoc(CONFIG_COLLECTION, CONFIG_DOC_ID, { masterPin: "0000", accessCode: "0000", seeded: true });
  await refreshAll();
}
