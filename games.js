// Single source of truth for the game catalog.
// The hub renders from this list; the service worker reads it to precache.

export const GAMES = [
  {
    slug: "tictactoe",
    icon: "/icons/games/tictactoe.svg",
    name: { en: "Tic-Tac-Toe", id: "Tik-Tak-Toe" },
    players: "2",
    blurb: {
      en: "3-in-a-row. One minute per match.",
      id: "Tiga sebaris. Satu menit per ronde.",
    },
  },
  {
    slug: "connect-four",
    icon: "/icons/games/connect-four.svg",
    name: { en: "Connect Four", id: "Connect Four" },
    players: "2",
    blurb: {
      en: "Drop pieces, line up four.",
      id: "Jatuhkan bidak, sejajarkan empat.",
    },
  },
  {
    slug: "checkers",
    icon: "/icons/games/checkers.svg",
    name: { en: "Checkers", id: "Dam" },
    players: "2",
    blurb: {
      en: "Diagonal moves, forced captures.",
      id: "Langkah diagonal, makan wajib.",
    },
  },
  {
    slug: "chess",
    icon: "/icons/games/chess.svg",
    name: { en: "Chess", id: "Catur" },
    players: "2",
    blurb: { en: "Full rules, hotseat.", id: "Aturan lengkap, bergantian." },
  },
  {
    slug: "ludo",
    icon: "/icons/games/ludo.svg",
    name: { en: "Ludo", id: "Ludo" },
    players: "2–4",
    blurb: { en: "Race your tokens home.", id: "Balap bidak ke rumah." },
  },
  {
    slug: "werewolf",
    icon: "/icons/games/werewolf.svg",
    name: { en: "Werewolf", id: "Werewolf" },
    players: "5+",
    blurb: {
      en: "Moderator app. Pass the phone.",
      id: "Aplikasi moderator. Oper HP.",
    },
  },
  {
    slug: "battleship",
    icon: "/icons/games/battleship.svg",
    name: { en: "Battleship", id: "Kapal Perang" },
    players: "2",
    blurb: {
      en: "Hide your fleet, sink theirs.",
      id: "Sembunyikan armada, tenggelamkan musuh.",
    },
  },
  {
    slug: "hangman",
    icon: "/icons/games/hangman.svg",
    name: { en: "Hangman", id: "Tebak Kata" },
    players: "1+",
    blurb: {
      en: "Guess the word in six wrongs.",
      id: "Tebak kata, enam salah habis.",
    },
  },
  {
    slug: "dots-and-boxes",
    icon: "/icons/games/dots-and-boxes.svg",
    name: { en: "Dots & Boxes", id: "Titik & Kotak" },
    players: "2",
    blurb: { en: "Draw edges, claim boxes.", id: "Tarik garis, kuasai kotak." },
  },
  {
    slug: "truth-or-dare",
    icon: "/icons/games/truth-or-dare.svg",
    name: { en: "Truth or Dare", id: "Jujur atau Berani" },
    players: "2+",
    blurb: { en: "Pass-phone dares.", id: "Tantangan estafet." },
  },
  {
    slug: "congklak",
    icon: "/icons/games/congklak.svg",
    name: { en: "Congklak", id: "Congklak" },
    players: "2",
    blurb: {
      en: "Traditional Indonesian mancala. Sow, relay, capture.",
      id: "Mancala tradisional Indonesia. Tabur, lanjut, tembak.",
    },
  },
];
