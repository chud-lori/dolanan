// About page: applies theme + i18n.

import { register, applyI18n } from "/shared/i18n.js";
import "/shared/theme.js";
import { registerServiceWorker } from "/shared/sw-register.js";

register("about", {
  en: {
    what: "What is this",
    whatBody:
      "A single installable web app bundling casual local-multiplayer games — chess, ludo, connect four, werewolf, battleship, hangman, congklak, and more — designed for pass-the-device or one-screen hotseat play. Fully offline after the first visit, no accounts, no backend, no telemetry.",
    principles: "Principles",
    p1: "Offline-first — works after first visit",
    p2: "No accounts, no tracking",
    p3: "English + Indonesian + Javanese",
    p4: "Light + dark mode, mobile-first",
    p5: "Sound + haptics, screen wake-lock",
    tech: "Built with",
    techBody: "Vanilla HTML/CSS/JS. No framework. ~900 KB total. Service Worker for offline.",
    credits: "Credits",
    creditsBody:
      'Created by <a href="https://profile.lori.my.id" rel="noopener">Lori</a>. Sister app: <a href="https://ethok.lori.my.id" rel="noopener">Ethok-Ethok</a>.',
    source: "Source",
  },
  id: {
    what: "Apa ini",
    whatBody:
      "Aplikasi web tunggal yang berisi kumpulan gim santai untuk main bareng — catur, ludo, connect four, werewolf, kapal perang, tebak kata, congklak, dan lainnya — dirancang untuk gaya pass-the-device atau hotseat. Sepenuhnya offline setelah kunjungan pertama, tanpa akun, tanpa backend, tanpa pelacakan.",
    principles: "Prinsip",
    p1: "Offline-first — bisa main tanpa internet setelah kunjungan pertama",
    p2: "Tanpa akun, tanpa pelacakan",
    p3: "Inggris + Indonesia + Jawa",
    p4: "Mode terang + gelap, mobile-first",
    p5: "Suara + haptik, layar tidak tidur saat main",
    tech: "Dibangun dengan",
    techBody: "Vanilla HTML/CSS/JS. Tanpa framework. ~900 KB total. Service Worker untuk offline.",
    credits: "Kredit",
    creditsBody:
      'Dibuat oleh <a href="https://profile.lori.my.id" rel="noopener">Lori</a>. Aplikasi saudara: <a href="https://ethok.lori.my.id" rel="noopener">Ethok-Ethok</a>.',
    source: "Kode sumber",
  },
  jw: {
    what: "Apa iki",
    whatBody:
      "Aplikasi web sing isi macem-macem dolanan santai kanggo dolanan bareng kanca — catur, ludo, connect four, werewolf, kapal perang, tebak tembung, congklak, lan liyane — kanggo dolanan giliran ing siji HP. Bisa offline sawise kunjungan kapisan, tanpa akun, tanpa backend, tanpa pelacak.",
    principles: "Prinsip",
    p1: "Offline-first — bisa dolanan tanpa internet",
    p2: "Tanpa akun, tanpa pelacak",
    p3: "Inggris + Indonesia + Jawa",
    p4: "Mode padhang + peteng, mobile-first",
    p5: "Swara + getar, layar ora turu pas dolanan",
    tech: "Digawe nganggo",
    techBody: "Vanilla HTML/CSS/JS. Tanpa framework. ~900 KB total. Service Worker kanggo offline.",
    credits: "Kredit",
    creditsBody:
      'Digawe dening <a href="https://profile.lori.my.id" rel="noopener">Lori</a>. Aplikasi sedulur: <a href="https://ethok.lori.my.id" rel="noopener">Ethok-Ethok</a>.',
    source: "Kode sumber",
  },
});

// Apply translations on load + on language change.
applyI18n();
document.addEventListener("langchange", () => applyI18n());

registerServiceWorker();
