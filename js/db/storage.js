import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc as fsSetDoc,
  updateDoc as fsUpdateDoc,
  deleteDoc as fsDeleteDoc,
  getDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtcgZII2a3grevgwOGdEbXKpCT_va4Keo",
  authDomain: "north-app-web.firebaseapp.com",
  projectId: "north-app-web",
  storageBucket: "north-app-web.firebasestorage.app",
  messagingSenderId: "778390264817",
  appId: "1:778390264817:web:1897b2f50bc8e7b374c250",
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

const LOCAL_PREFIX = "northApp:";
const COLLECTIONS = ["users", "vehicles", "vehicleLogs", "vehicleInspections", "vehicleIssues", "tools", "toolCheckouts"];
const CONFIG_COLLECTION = "config";
const CONFIG_DOC_ID = "app";
const LOCAL_ONLY_KEYS = new Set(["currentUserId", "unlocked"]);

const cache = { config: { masterPin: "0000", accessCode: "0000" } };
const dataListeners = new Set();

function notify() {
  dataListeners.forEach((cb) => { try { cb(); } catch { /* ignore listener errors */ } });
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
  const configRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
  const snap = await getDoc(configRef);
  if (snap.exists() && snap.data()?.seeded) return;

  const seed = seedData();
  const writes = [];
  for (const name of COLLECTIONS) {
    for (const item of seed[name]) {
      writes.push(fsSetDoc(doc(db, name, item.id), item));
    }
  }
  await Promise.all(writes);
  await fsSetDoc(configRef, { masterPin: "0000", accessCode: "0000", seeded: true });
}

function subscribeAll() {
  for (const name of COLLECTIONS) {
    onSnapshot(
      collection(db, name),
      (snap) => {
        cache[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        notify();
      },
      () => { /* transient errors recover on their own */ }
    );
  }
  onSnapshot(
    doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID),
    (snap) => {
      cache.config = snap.exists() ? snap.data() : { masterPin: "0000", accessCode: "0000" };
      notify();
    },
    () => {}
  );
}

function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(); } }, ms);
    promise.then(
      () => { if (!done) { done = true; clearTimeout(t); resolve(); } },
      (err) => {
        if (!done) { done = true; clearTimeout(t); resolve(); }
        console.error("Firestore call failed or timed out", err);
      }
    );
  });
}

export async function initStore() {
  await withTimeout(ensureSeeded(), 3500);
  subscribeAll();
  await withTimeout(
    new Promise((resolve) => {
      let remaining = COLLECTIONS.length;
      const unsub = onDataChange(() => {
        remaining -= 1;
        if (remaining <= 0) { unsub(); resolve(); }
      });
    }),
    2500
  );
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
    fsUpdateDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID), { [name]: val }).catch(() => {});
  }
}

export async function addDoc(name, id, data) {
  await fsSetDoc(doc(db, name, id), data);
  return data;
}

export async function updateDoc(name, id, patch) {
  await fsUpdateDoc(doc(db, name, id), patch);
}

export async function deleteDoc(name, id) {
  await fsDeleteDoc(doc(db, name, id));
}

export async function resetAllData() {
  const deletions = [];
  for (const name of COLLECTIONS) {
    const snap = await getDocs(collection(db, name));
    snap.forEach((d) => deletions.push(fsDeleteDoc(d.ref)));
  }
  await Promise.all(deletions);

  const seed = seedData();
  const writes = [];
  for (const name of COLLECTIONS) {
    for (const item of seed[name]) writes.push(fsSetDoc(doc(db, name, item.id), item));
  }
  await Promise.all(writes);
  await fsSetDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID), { masterPin: "0000", accessCode: "0000", seeded: true });
}
