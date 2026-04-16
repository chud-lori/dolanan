// Remember the names people play under so setup screens can suggest them
// next time. Scoped to the device; never leaves the browser.
//
// Design: a single MRU list of unique names (case-insensitive). Each time a
// game starts with non-empty player names, we push them to the front.

import { storage } from "./storage.js";

const KEY = "names:recent";
const MAX = 20;

const normalize = (s) => (s || "").trim();

export function getRecentNames() {
  const raw = storage.get(KEY, []);
  return Array.isArray(raw) ? raw.filter(Boolean) : [];
}

export function rememberNames(names) {
  const clean = (names || [])
    .map(normalize)
    .filter(Boolean);
  if (clean.length === 0) return;
  const existing = getRecentNames();
  const seen = new Set();
  const merged = [];
  for (const n of [...clean, ...existing]) {
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(n);
    if (merged.length >= MAX) break;
  }
  storage.set(KEY, merged);
}

export function clearRecentNames() {
  storage.remove(KEY);
}

/**
 * Attach autocomplete suggestions to a set of name inputs.
 *
 * Uses a single shared `<datalist>` so the browser handles the UI natively
 * (dropdown on focus, filter-as-you-type). Works on iOS + Android + desktop.
 */
let datalistEl = null;
function ensureDatalist() {
  if (datalistEl && document.body.contains(datalistEl)) return datalistEl;
  datalistEl = document.createElement("datalist");
  datalistEl.id = "dolanan-recent-names";
  document.body.appendChild(datalistEl);
  return datalistEl;
}

export function attachNameSuggestions(inputs) {
  const dl = ensureDatalist();
  dl.innerHTML = getRecentNames()
    .map((n) => `<option value="${n.replace(/"/g, "&quot;")}"></option>`)
    .join("");
  for (const inp of inputs) inp.setAttribute("list", dl.id);
}

/** Refresh the suggestion list after a new batch of names was remembered. */
export function refreshDatalist() {
  if (!datalistEl) return;
  datalistEl.innerHTML = getRecentNames()
    .map((n) => `<option value="${n.replace(/"/g, "&quot;")}"></option>`)
    .join("");
}
