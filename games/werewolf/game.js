// Werewolf / Mafia moderator app.
//
// Phases: setup → role reveal (pass phone) → night (prompts: wolves, seer, doctor)
// → day (deaths, discussion, voting) → repeat or end.
//
// Roles: villager, werewolf, seer, doctor. (Cupid/other: future work.)

import { register, t } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";

register("ww", {
  en: {
    subtitle: "5+ players · pass-phone moderator",
    setupTitle: "Game setup",
    totalPlayers: "Players",
    werewolves: "Werewolves",
    includeSeer: "Include Seer",
    includeDoctor: "Include Doctor",
    names: "Player names",
    start: "Start game",
    minPlayers: "Minimum 5 players.",
    tooManyWolves: "Villagers must outnumber werewolves.",
    ready: "Ready to start!",
    pass: "Pass device to {name}",
    tapReveal: "Tap to see your role",
    tapPrivately: "Tap only when it's in your hands.",
    yourRole: "You are the",
    role_villager: "Villager",
    role_werewolf: "Werewolf",
    role_seer: "Seer",
    role_doctor: "Doctor",
    desc_villager: "No special powers — vote out the werewolves by day.",
    desc_werewolf: "Each night, pick someone to eliminate. Blend in by day.",
    desc_seer: "Each night, check one player's allegiance.",
    desc_doctor: "Each night, save one player from the wolves.",
    gotIt: "Got it — pass on",
    night: "Night falls",
    nightClose: "Everyone: close your eyes.",
    wolvesPick: "Werewolves — pick a target",
    seerPick: "Seer — pick a player to inspect",
    seerResult: "That player is a {role}.",
    doctorPick: "Doctor — pick a player to save",
    day: "Morning arrives",
    deaths: "Deaths last night",
    noDeaths: "Nobody died last night.",
    voting: "Day vote",
    voteHint: "Pick the player to eliminate (or skip).",
    skipVote: "Skip vote",
    eliminated: "{name} was {role}.",
    winVillagers: "Villagers win!",
    winWerewolves: "Werewolves win!",
    playAgain: "Play again",
    defaultName: "Player {n}",
  },
  id: {
    subtitle: "5+ pemain · moderator oper HP",
    setupTitle: "Pengaturan",
    totalPlayers: "Jumlah pemain",
    werewolves: "Jumlah serigala",
    includeSeer: "Pakai Peramal",
    includeDoctor: "Pakai Dokter",
    names: "Nama pemain",
    start: "Mulai",
    minPlayers: "Minimal 5 pemain.",
    tooManyWolves: "Warga harus lebih banyak dari serigala.",
    ready: "Siap!",
    pass: "Kasih HP ke {name}",
    tapReveal: "Tap buat lihat peran",
    tapPrivately: "Tap kalau HP sudah di tanganmu.",
    yourRole: "Kamu adalah",
    role_villager: "Warga",
    role_werewolf: "Serigala",
    role_seer: "Peramal",
    role_doctor: "Dokter",
    desc_villager: "Tidak ada kemampuan khusus — buang serigala lewat voting siang hari.",
    desc_werewolf: "Tiap malam, pilih satu korban. Pas siang, pura-pura jadi warga biasa.",
    desc_seer: "Tiap malam, intip satu pemain untuk tahu perannya.",
    desc_doctor: "Tiap malam, lindungi satu pemain dari serangan serigala.",
    gotIt: "Paham — oper HP",
    night: "Malam tiba",
    nightClose: "Semua: tutup mata.",
    wolvesPick: "Serigala — pilih korban",
    seerPick: "Peramal — pilih pemain yang mau diintip",
    seerResult: "Pemain itu ternyata {role}.",
    doctorPick: "Dokter — pilih pemain yang mau dilindungi",
    day: "Pagi datang",
    deaths: "Korban malam ini",
    noDeaths: "Semua aman malam ini.",
    voting: "Voting siang",
    voteHint: "Pilih pemain untuk dibuang (atau lewati).",
    skipVote: "Lewati voting",
    eliminated: "{name} ternyata {role}.",
    winVillagers: "Warga menang!",
    winWerewolves: "Serigala menang!",
    playAgain: "Main lagi",
    defaultName: "Pemain {n}",
  },
});

wireGameHead({ titleEn: "Werewolf", titleId: "Werewolf", subtitleKey: "ww.subtitle" });

const root = document.getElementById("ww-root");

const state = {
  phase: "setup",
  total: 6,
  werewolves: 2,
  seer: true,
  doctor: true,
  players: [], // { name, role, alive }
};

function renderSetup() {
  state.phase = "setup";
  const valid = state.total >= 5 && state.total - state.werewolves > state.werewolves;
  const hintKey = state.total < 5 ? "ww.minPlayers"
    : state.total - state.werewolves <= state.werewolves ? "ww.tooManyWolves"
    : "ww.ready";

  root.innerHTML = `
    <div class="ww-screen">
      <h2>${t("ww.setupTitle")}</h2>
      <div class="ww-field">
        <label>${t("ww.totalPlayers")}</label>
        <div class="ww-stepper">
          <button type="button" data-step="total-">−</button>
          <span class="val" id="v-total">${state.total}</span>
          <button type="button" data-step="total+">+</button>
        </div>
      </div>
      <div class="ww-field">
        <label>${t("ww.werewolves")}</label>
        <div class="ww-stepper">
          <button type="button" data-step="ww-">−</button>
          <span class="val" id="v-ww">${state.werewolves}</span>
          <button type="button" data-step="ww+">+</button>
        </div>
      </div>
      <div class="ww-field">
        <label>${t("ww.includeSeer")}</label>
        <input type="checkbox" id="c-seer" ${state.seer ? "checked" : ""} />
      </div>
      <div class="ww-field">
        <label>${t("ww.includeDoctor")}</label>
        <input type="checkbox" id="c-doctor" ${state.doctor ? "checked" : ""} />
      </div>
      <hr style="border: none; border-top: 1px solid var(--border); margin: 12px 0;" />
      <h3>${t("ww.names")}</h3>
      <div id="names" class="ww-names">
        ${Array.from({ length: state.total })
          .map((_, i) => {
            const placeholder = t("ww.defaultName", { n: i + 1 });
            const v = state.players[i]?.name ?? "";
            return `<input type="text" class="ww-name-input" data-idx="${i}" placeholder="${placeholder}" value="${v}" />`;
          })
          .join("")}
      </div>
      <p style="margin-top: 12px; color: ${valid ? "var(--success)" : "var(--danger)"};">
        ${t(hintKey)}
      </p>
      <button id="start" type="button" class="btn btn-primary" ${valid ? "" : "disabled"} style="width: 100%;">
        ${t("ww.start")}
      </button>
    </div>
  `;

  root.querySelectorAll("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.step;
      if (s === "total+") state.total = Math.min(20, state.total + 1);
      if (s === "total-") state.total = Math.max(3, state.total - 1);
      if (s === "ww+") state.werewolves = Math.min(Math.floor(state.total / 2), state.werewolves + 1);
      if (s === "ww-") state.werewolves = Math.max(1, state.werewolves - 1);
      renderSetup();
    });
  });
  root.querySelector("#c-seer").addEventListener("change", (e) => { state.seer = e.target.checked; });
  root.querySelector("#c-doctor").addEventListener("change", (e) => { state.doctor = e.target.checked; });
  root.querySelectorAll(".ww-name-input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = +inp.dataset.idx;
      if (!state.players[idx]) state.players[idx] = {};
      state.players[idx].name = inp.value;
    });
  });
  root.querySelector("#start").addEventListener("click", () => startGame());
}

function startGame() {
  // Compose role list
  const roles = [];
  for (let i = 0; i < state.werewolves; i++) roles.push("werewolf");
  if (state.seer) roles.push("seer");
  if (state.doctor) roles.push("doctor");
  while (roles.length < state.total) roles.push("villager");
  shuffle(roles);

  state.players = Array.from({ length: state.total }).map((_, i) => ({
    name: state.players[i]?.name || t("ww.defaultName", { n: i + 1 }),
    role: roles[i],
    alive: true,
  }));
  state.revealIdx = 0;
  renderReveal();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function renderReveal() {
  state.phase = "reveal";
  const p = state.players[state.revealIdx];
  root.innerHTML = `
    <button class="ww-cover" id="cover">
      ${t("ww.pass", { name: p.name })}
      <small>${t("ww.tapPrivately")}</small>
    </button>
  `;
  root.querySelector("#cover").addEventListener("click", () => {
    root.innerHTML = `
      <div class="ww-screen ww-role-reveal">
        <div class="ww-emoji">${roleEmoji(p.role)}</div>
        <p>${t("ww.yourRole")}</p>
        <div class="ww-role-badge ${p.role}">${t("ww.role_" + p.role)}</div>
        <p>${t("ww.desc_" + p.role)}</p>
        <button id="next" type="button" class="btn btn-primary">${t("ww.gotIt")}</button>
      </div>`;
    root.querySelector("#next").addEventListener("click", () => {
      state.revealIdx++;
      if (state.revealIdx >= state.players.length) {
        state.nightCount = 0;
        beginNight();
      } else renderReveal();
    });
  });
}

function roleEmoji(r) {
  return { villager: "🧑‍🌾", werewolf: "🐺", seer: "🔮", doctor: "💊" }[r];
}

function alivePlayers() {
  return state.players.filter((p) => p.alive);
}

function beginNight() {
  state.phase = "night";
  state.night = { wolfTarget: null, doctorSave: null, seerTarget: null, step: "intro" };
  nightStep();
}

function nightStep() {
  const n = state.night;
  if (n.step === "intro") {
    root.innerHTML = `
      <div class="ww-screen ww-role-reveal">
        <div class="ww-emoji">🌙</div>
        <h2>${t("ww.night")}</h2>
        <p>${t("ww.nightClose")}</p>
        <button id="go" class="btn btn-primary" type="button">${t("btn.continue")}</button>
      </div>`;
    root.querySelector("#go").addEventListener("click", () => {
      n.step = "wolves";
      nightStep();
    });
    return;
  }
  if (n.step === "wolves") {
    showPicker({
      emoji: "🐺",
      title: t("ww.wolvesPick"),
      onPick: (idx) => {
        n.wolfTarget = idx;
        n.step = state.seer && alivePlayers().some((p) => p.role === "seer") ? "seer" : "doctor";
        nightStep();
      },
      exclude: (p) => p.role === "werewolf" || !p.alive,
    });
    return;
  }
  if (n.step === "seer") {
    showPicker({
      emoji: "🔮",
      title: t("ww.seerPick"),
      onPick: (idx) => {
        n.seerTarget = idx;
        const target = state.players[idx];
        root.innerHTML = `
          <div class="ww-screen ww-role-reveal">
            <div class="ww-emoji">🔮</div>
            <h2>${target.name}</h2>
            <p>${t("ww.seerResult", { role: t("ww.role_" + target.role) })}</p>
            <button id="go" class="btn btn-primary" type="button">${t("btn.continue")}</button>
          </div>`;
        root.querySelector("#go").addEventListener("click", () => {
          n.step = state.doctor && alivePlayers().some((p) => p.role === "doctor") ? "doctor" : "resolve";
          nightStep();
        });
      },
      exclude: (p) => !p.alive,
    });
    return;
  }
  if (n.step === "doctor") {
    if (!state.doctor || !alivePlayers().some((p) => p.role === "doctor")) {
      n.step = "resolve"; nightStep(); return;
    }
    showPicker({
      emoji: "💊",
      title: t("ww.doctorPick"),
      onPick: (idx) => {
        n.doctorSave = idx;
        n.step = "resolve";
        nightStep();
      },
      exclude: (p) => !p.alive,
    });
    return;
  }
  if (n.step === "resolve") {
    let killed = null;
    if (n.wolfTarget != null && n.wolfTarget !== n.doctorSave) {
      state.players[n.wolfTarget].alive = false;
      killed = n.wolfTarget;
    }
    beginDay(killed);
  }
}

function showPicker({ emoji, title, onPick, exclude = () => false }) {
  root.innerHTML = `
    <div class="ww-screen">
      <div class="ww-emoji" style="text-align:center;">${emoji}</div>
      <h2 style="text-align:center;">${title}</h2>
      <ul class="ww-list" style="margin-top: 12px;">
        ${state.players
          .map((p, i) => {
            const disabled = exclude(p);
            return `<li><button type="button" class="ww-player-btn" data-idx="${i}" ${disabled ? "disabled" : ""}>${p.name}${p.alive ? "" : " 💀"}</button></li>`;
          })
          .join("")}
      </ul>
    </div>`;
  root.querySelectorAll(".ww-player-btn").forEach((btn) => {
    btn.addEventListener("click", () => onPick(Number(btn.dataset.idx)));
  });
}

function beginDay(killed) {
  state.phase = "day";
  const wolfAlive = alivePlayers().some((p) => p.role === "werewolf");
  const villagersAlive = alivePlayers().filter((p) => p.role !== "werewolf").length;
  const wolvesAlive = alivePlayers().filter((p) => p.role === "werewolf").length;
  if (!wolfAlive) return endGame("villagers");
  if (wolvesAlive >= villagersAlive) return endGame("werewolves");

  const deadName = killed != null ? state.players[killed].name : null;
  root.innerHTML = `
    <div class="ww-screen ww-role-reveal">
      <div class="ww-emoji">☀️</div>
      <h2>${t("ww.day")}</h2>
      <p><strong>${t("ww.deaths")}:</strong> ${deadName ?? t("ww.noDeaths")}</p>
      <button id="go" class="btn btn-primary" type="button">${t("btn.continue")}</button>
    </div>`;
  root.querySelector("#go").addEventListener("click", () => renderDayVote());
}

function renderDayVote() {
  root.innerHTML = `
    <div class="ww-screen">
      <h2>${t("ww.voting")}</h2>
      <p>${t("ww.voteHint")}</p>
      <ul class="ww-list" style="margin-top: 8px;">
        ${state.players
          .map((p, i) => {
            if (!p.alive) return "";
            return `<li><button type="button" class="ww-player-btn" data-idx="${i}">${p.name}</button></li>`;
          })
          .join("")}
      </ul>
      <button id="skip" type="button" class="btn btn-ghost" style="width: 100%; margin-top: 8px;">${t("ww.skipVote")}</button>
    </div>`;
  root.querySelectorAll(".ww-player-btn").forEach((btn) => {
    btn.addEventListener("click", () => eliminate(Number(btn.dataset.idx)));
  });
  root.querySelector("#skip").addEventListener("click", () => {
    beginNight();
  });
}

function eliminate(idx) {
  const p = state.players[idx];
  p.alive = false;
  root.innerHTML = `
    <div class="ww-screen ww-role-reveal">
      <div class="ww-emoji">${roleEmoji(p.role)}</div>
      <h2>${t("ww.eliminated", { name: p.name, role: t("ww.role_" + p.role) })}</h2>
      <button id="go" class="btn btn-primary" type="button">${t("btn.continue")}</button>
    </div>`;
  root.querySelector("#go").addEventListener("click", () => {
    // Check win
    const wolfAlive = alivePlayers().some((p) => p.role === "werewolf");
    const villagersAlive = alivePlayers().filter((p) => p.role !== "werewolf").length;
    const wolvesAlive = alivePlayers().filter((p) => p.role === "werewolf").length;
    if (!wolfAlive) return endGame("villagers");
    if (wolvesAlive >= villagersAlive) return endGame("werewolves");
    beginNight();
  });
}

function endGame(who) {
  root.innerHTML = `
    <div class="ww-screen ww-role-reveal">
      <div class="ww-emoji">${who === "villagers" ? "🧑‍🌾" : "🐺"}</div>
      <h2>${t("ww." + (who === "villagers" ? "winVillagers" : "winWerewolves"))}</h2>
      <ul class="ww-list" style="margin-top: 12px;">
        ${state.players
          .map((p) => `<li class="ww-player-item ${p.alive ? "" : "dead"}">${p.name}<span>${t("ww.role_" + p.role)}</span></li>`)
          .join("")}
      </ul>
      <button id="again" type="button" class="btn btn-primary" style="width: 100%; margin-top: 12px;">${t("ww.playAgain")}</button>
    </div>`;
  root.querySelector("#again").addEventListener("click", () => renderSetup());
}

document.addEventListener("langchange", () => {
  if (state.phase === "setup") renderSetup();
});

renderSetup();
