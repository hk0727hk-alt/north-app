import { readCollection, addDoc, updateDoc, deleteDoc } from "./storage.js";
import { makeId } from "../utils/id.js";
import { todayStr, addDays } from "../utils/date.js";

export const TOOL_STATUS = ["保管中", "使用中", "修理中", "廃棄"];
export const COMMON_DAMAGE_TAGS = ["破損", "汚損", "動作不良", "部品欠損", "その他"];

/* --- Tool master --- */
export function listTools() {
  return readCollection("tools");
}

export function getTool(id) {
  return listTools().find((t) => t.id === id) || null;
}

export function listCategories() {
  const cats = new Set(listTools().map((t) => t.category).filter(Boolean));
  return Array.from(cats);
}

export async function addTool(data) {
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

export async function updateTool(id, patch) {
  await updateDoc("tools", id, patch);
}

export async function deleteTool(id) {
  await deleteDoc("tools", id);
}

/**
 * Candidate recognition for a captured photo.
 * This is a placeholder hook: a real deployment would send `photoDataUrl`
 * to an image-recognition API and rank tools by visual similarity.
 * For now it narrows candidates by category (if given) so the tap-to-select
 * flow works end-to-end, and falls back to the full available list.
 */
export function recognizeToolCandidates({ category, excludeStatuses = ["廃棄"] } = {}) {
  let tools = listTools().filter((t) => !excludeStatuses.includes(t.status));
  if (category) tools = tools.filter((t) => t.category === category);
  return tools;
}

/* --- Checkouts (持ち出し / 返却) --- */
export function listCheckouts({ status, userId, toolId } = {}) {
  let list = readCollection("toolCheckouts");
  if (status) list = list.filter((c) => c.status === status);
  if (userId) list = list.filter((c) => c.userId === userId);
  if (toolId) list = list.filter((c) => c.toolId === toolId);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getActiveCheckoutForTool(toolId) {
  return listCheckouts({ status: "貸出中", toolId })[0] || null;
}

export async function checkoutTool({ toolId, userId, returnDueDate, photoOut }) {
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

export async function returnTool(checkoutId, { damage = false, damageTags = [], damageComment = "", needsRepair = false, photoIn = null } = {}) {
  const checkout = readCollection("toolCheckouts").find((c) => c.id === checkoutId);
  if (!checkout) return null;
  const patch = { returnedDate: todayStr(), status: "返却済", damage, damageTags, damageComment, needsRepair, photoIn };
  await updateDoc("toolCheckouts", checkoutId, patch);
  await updateTool(checkout.toolId, { status: needsRepair ? "修理中" : "保管中" });
  return { ...checkout, ...patch };
}

export function listToolHistory(toolId) {
  return listCheckouts({ toolId });
}
