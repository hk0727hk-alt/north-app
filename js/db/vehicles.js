import { readCollection, addDoc, updateDoc, deleteDoc } from "./storage.js";
import { makeId } from "../utils/id.js";
import { todayStr } from "../utils/date.js";

export const INSPECTION_ITEMS = [
  { key: "tire", label: "タイヤ" },
  { key: "oil", label: "オイル" },
  { key: "lamp", label: "ランプ類" },
  { key: "body", label: "車体（傷・破損）" },
  { key: "other", label: "その他" },
];

export const INSPECTION_STATUS_CYCLE = ["正常", "注意", "異常", "要修理"];

export const ISSUE_URGENCY = ["低", "中", "高"];
export const ISSUE_STATUS = ["未対応", "対応中", "完了"];

function defaultInspectionItems() {
  const items = {};
  for (const it of INSPECTION_ITEMS) items[it.key] = "正常";
  return items;
}

/* --- Vehicles --- */
export function listVehicles() {
  return readCollection("vehicles");
}

export function getVehicle(id) {
  return listVehicles().find((v) => v.id === id) || null;
}

export async function addVehicle(data) {
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

export async function updateVehicle(id, patch) {
  await updateDoc("vehicles", id, patch);
}

export async function deleteVehicle(id) {
  await deleteDoc("vehicles", id);
}

/* --- Daily logs (日報) --- */
export function listLogsForVehicle(vehicleId) {
  return readCollection("vehicleLogs")
    .filter((l) => l.vehicleId === vehicleId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAllLogs() {
  return readCollection("vehicleLogs").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTodayOpenLog(vehicleId) {
  const today = todayStr();
  return readCollection("vehicleLogs").find(
    (l) => l.vehicleId === vehicleId && l.date === today && l.endOdometer == null
  ) || null;
}

export async function addLog({ vehicleId, userId, date, startOdometer, hasIssue, memo }) {
  const log = {
    id: makeId("log"),
    vehicleId,
    userId,
    date: date || todayStr(),
    startOdometer: startOdometer != null ? Number(startOdometer) : null,
    endOdometer: null,
    hasIssue: !!hasIssue,
    memo: memo || "",
    createdAt: new Date().toISOString(),
  };
  await addDoc("vehicleLogs", log.id, log);
  await updateVehicle(vehicleId, { status: "使用中" });
  return log;
}

export async function closeLog(logId, { endOdometer }) {
  const log = readCollection("vehicleLogs").find((l) => l.id === logId);
  if (!log) return null;
  const patch = { endOdometer: endOdometer != null ? Number(endOdometer) : null };
  await updateDoc("vehicleLogs", logId, patch);
  await updateVehicle(log.vehicleId, { status: "稼働中" });
  return { ...log, ...patch };
}

/* --- Inspections (点検) --- */
export function listInspectionsForVehicle(vehicleId) {
  return readCollection("vehicleInspections")
    .filter((i) => i.vehicleId === vehicleId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getLatestInspection(vehicleId) {
  return listInspectionsForVehicle(vehicleId)[0] || null;
}

export function newInspectionDraft() {
  return defaultInspectionItems();
}

export async function saveInspection({ vehicleId, userId, items, memo }) {
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
export function listIssues({ vehicleId, statusIn } = {}) {
  let issues = readCollection("vehicleIssues");
  if (vehicleId) issues = issues.filter((i) => i.vehicleId === vehicleId);
  if (statusIn) issues = issues.filter((i) => statusIn.includes(i.status));
  return issues.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addIssue({ vehicleId, userId, part, photo, comment, urgency }) {
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

export async function updateIssueStatus(id, status) {
  await updateDoc("vehicleIssues", id, { status });
}

export function countOpenIssues(vehicleId) {
  return listIssues({ vehicleId, statusIn: ["未対応", "対応中"] }).length;
}

export function countAllOpenIssues() {
  return listIssues({ statusIn: ["未対応", "対応中"] }).length;
}
