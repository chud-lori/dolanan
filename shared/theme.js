// Theme toggle — simple 2-state: light ↔ dark.
// Defaults to system preference on first visit, then persists the choice.

import { storage } from "./storage.js";

const KEY = "theme";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// First visit: follow the device. After that, use the stored choice.
let dark = storage.get(KEY) != null
  ? storage.get(KEY) === "dark"
  : systemPrefersDark();

function apply() {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.content = dark ? "#0f172a" : "#3b82f6";
}

export function isDark() { return dark; }

export function toggleTheme() {
  dark = !dark;
  storage.set(KEY, dark ? "dark" : "light");
  apply();
  document.dispatchEvent(new CustomEvent("themechange", { detail: dark }));
}

export function mountThemeButton(container) {
  if (!container) return null;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-secondary theme-btn";
  btn.setAttribute("aria-label", "Toggle dark mode");
  const render = () => { btn.textContent = dark ? "🌙" : "☀️"; };
  btn.addEventListener("click", () => { toggleTheme(); render(); });
  document.addEventListener("themechange", render);
  container.appendChild(btn);
  render();
  return btn;
}

// Apply on load.
apply();
