// =========================================================
// BugMitra — Security helpers
// Real protection lives in Supabase RLS + RPC functions (see schema.sql).
// This module adds a first line of defense in the browser.
// =========================================================
import { CONFIG } from "./config.js";

/** Strips tags/control characters so nothing gets echoed back unsanitized. */
export function sanitizeText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 200);
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Honeypot field: real users never fill this in; bots often do. */
export function honeypotTripped(formEl) {
  const hp = formEl.querySelector('[name="website"]');
  return !!(hp && hp.value.trim().length > 0);
}

const COOLDOWN_KEY = "bugmitra_last_submit";

/** Prevents rapid repeat submissions from the same browser. */
export function isRateLimited() {
  const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
  const elapsed = (Date.now() - last) / 1000;
  return elapsed < CONFIG.SUBMIT_COOLDOWN_SECONDS;
}

export function markSubmitted() {
  localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
}
