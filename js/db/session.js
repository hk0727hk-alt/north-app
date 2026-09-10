import { readValue, writeValue } from "./storage.js";
import { getUser } from "./users.js";

const KEY = "currentUserId";

export function getCurrentUser() {
  const id = readValue(KEY, null);
  if (!id) return null;
  return getUser(id) || null;
}

export function setCurrentUser(userId) {
  writeValue(KEY, userId);
}

export function logout() {
  writeValue(KEY, null);
}

export function isMaster(user) {
  return !!user && user.role === "master";
}

export function isManager(user) {
  return !!user && (user.role === "master" || user.role === "manager");
}
