import { readCollection, addDoc, updateDoc, deleteDoc, readValue, writeValue } from "./storage.js";
import { makeId } from "../utils/id.js";

export function listUsers({ includeInactive = true } = {}) {
  const users = readCollection("users");
  return includeInactive ? users : users.filter((u) => u.active);
}

export function getUser(id) {
  return readCollection("users").find((u) => u.id === id) || null;
}

export async function addUser({ name, role = "staff" }) {
  const user = { id: makeId("u"), name, role, active: true, createdAt: new Date().toISOString() };
  await addDoc("users", user.id, user);
  return user;
}

export async function updateUser(id, patch) {
  await updateDoc("users", id, patch);
}

export async function deleteUser(id) {
  await deleteDoc("users", id);
}

export function getMasterPin() {
  return readValue("masterPin", "0000");
}

export function setMasterPin(pin) {
  writeValue("masterPin", pin);
}
