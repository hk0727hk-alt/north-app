import { readValue, writeValue } from "./storage.js";

const DEFAULT_CODE = "0000";

export function getAccessCode() {
  return readValue("accessCode", DEFAULT_CODE);
}

export function setAccessCode(code) {
  writeValue("accessCode", code);
}

export function isUnlocked() {
  return readValue("unlocked", false) === true;
}

export function setUnlocked() {
  writeValue("unlocked", true);
}
