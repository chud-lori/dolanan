// Pass-the-device gate: shows a full-screen confirm so the next player can
// tap "Ready" privately before the UI reveals their info. Returns a promise.

export function passDevice(toLabel, noteLabel = "") {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "modal-backdrop";
    root.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div style="font-size: 42px; margin-bottom: 8px;">📱</div>
        <h2>${toLabel}</h2>
        ${noteLabel ? `<p style="color: var(--text-muted);">${noteLabel}</p>` : ""}
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" data-ready>Ready</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    const btn = root.querySelector("[data-ready]");
    btn.focus();
    btn.addEventListener("click", () => {
      root.remove();
      resolve();
    });
  });
}
