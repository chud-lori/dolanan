// Theme toggle — persists to localStorage, overrides system preference.
// Three states: "system" (default), "light" (force light), "dark" (force dark).
// The active palette is applied via [data-theme] on <html>.

import { storage } from "./storage.js";

const KEY = "theme";
let current = storage.get(KEY, "system"); // "system" | "light" | "dark"

function apply() {
  const root = document.documentElement;
  if (current === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", current);
  }
  // Update <meta name="theme-color"> for the browser chrome
  const isDark =
    current === "dark" ||
    (current === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.content = isDark ? "#0f172a" : "#3b82f6";
}

export function getTheme() { return current; }

export function isDark() {
  if (current === "dark") return true;
  if (current === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function cycleTheme() {
  // system → dark → light → system
  if (current === "system") current = "dark";
  else if (current === "dark") current = "light";
  else current = "system";
  storage.set(KEY, current);
  apply();
  document.dispatchEvent(new CustomEvent("themechange", { detail: current }));
}

export function themeIcon() {
  if (current === "dark") return "🌙";
  if (current === "light") return "☀️";
  return "🌓"; // system
}

/**
 * Mount a small theme toggle button into a container. Returns the button.
 */
export function mountThemeButton(container) {
  if (!container) return null;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-secondary theme-btn";
  btn.setAttribute("aria-label", "Toggle theme");
  const render = () => { btn.textContent = themeIcon(); };
  btn.addEventListener("click", () => {
    cycleTheme();
    render();
  });
  document.addEventListener("themechange", render);
  container.appendChild(btn);
  render();
  return btn;
}

// Apply on load.
apply();

// If system preference changes (and user is on "system"), re-apply.
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (current === "system") apply();
});
