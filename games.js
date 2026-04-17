// Single source of truth for the game catalog.
// The hub renders from this list; the service worker reads it to precache.

export const GAMES = [
  {
    slug: "tictactoe",
    icon: "/icons/games/tictactoe.svg",
    name: { en: "Tic-Tac-Toe", id: "Tik-Tak-Toe", jw: "Tik-Tak-Toe" },
    players: "2",
    blurb: {
      en: "3-in-a-row. One minute per match.",
      id: "Tiga sebaris. Satu menit per ronde.",
      jw: "Telu sebaris. Sak menit per ronde.",
    },
  },
  {
    slug: "connect-four",
    icon: "/icons/games/connect-four.svg",
    name: { en: "Connect Four", id: "Connect Four", jw: "Connect Four" },
    players: "2",
    blurb: {
      en: "Drop pieces, line up four.",
      id: "Jatuhkan bidak, sejajarkan empat.",
      jw: "Tibake bidak, sejajarke papat.",
    },
  },
  {
    slug: "checkers",
    icon: "/icons/games/checkers.svg",
    name: { en: "Checkers", id: "Dam", jw: "Dam" },
    players: "2",
    blurb: {
      en: "Diagonal moves, forced captures.",
      id: "Langkah diagonal, makan wajib.",
      jw: "Mlaku diagonal, mangan wajib.",
    },
  },
  {
    slug: "chess",
    icon: "/icons/games/chess.svg",
    name: { en: "Chess", id: "Catur", jw: "Catur" },
    players: "1–2",
    blurb: {
      en: "Full rules, hotseat or vs Bot.",
      id: "Aturan lengkap, bergantian atau vs Bot.",
      jw: "Aturan lengkap, giliran utawa vs Bot.",
    },
  },
  {
    slug: "ludo",
    icon: "/icons/games/ludo.svg",
    name: { en: "Ludo", id: "Ludo", jw: "Ludo" },
    players: "2–4",
    blurb: {
      en: "Race your tokens home.",
      id: "Balap bidak ke rumah.",
      jw: "Balapan bidak mulih.",
    },
  },
  {
    slug: "werewolf",
    icon: "/icons/games/werewolf.svg",
    name: { en: "Werewolf", id: "Werewolf", jw: "Werewolf" },
    players: "5+",
    blurb: {
      en: "Moderator app. Pass the phone.",
      id: "Aplikasi moderator. Oper HP.",
      jw: "Aplikasi moderator. Oper HP.",
    },
  },
  {
    slug: "battleship",
    icon: "/icons/games/battleship.svg",
    name: { en: "Battleship", id: "Kapal Perang", jw: "Kapal Perang" },
    players: "2",
    blurb: {
      en: "Hide your fleet, sink theirs.",
      id: "Sembunyikan armada, tenggelamkan musuh.",
      jw: "Delikno kapalmu, tenggelamno mungsuh.",
    },
  },
  {
    slug: "hangman",
    icon: "/icons/games/hangman.svg",
    name: { en: "Hangman", id: "Tebak Kata", jw: "Tebak Tembung" },
    players: "1+",
    blurb: {
      en: "Guess the word in six wrongs.",
      id: "Tebak kata, enam salah habis.",
      jw: "Tebak tembung, nem kali salah rampung.",
    },
  },
  {
    slug: "dots-and-boxes",
    icon: "/icons/games/dots-and-boxes.svg",
    name: { en: "Dots & Boxes", id: "Titik & Kotak", jw: "Titik & Kothak" },
    players: "2",
    blurb: {
      en: "Draw edges, claim boxes.",
      id: "Tarik garis, kuasai kotak.",
      jw: "Narik garis, nguwasani kothak.",
    },
  },
  {
    slug: "truth-or-dare",
    icon: "/icons/games/truth-or-dare.svg",
    name: { en: "Truth or Dare", id: "Jujur atau Berani", jw: "Jujur utawa Wani" },
    players: "2+",
    blurb: {
      en: "Pass-phone dares.",
      id: "Tantangan estafet.",
      jw: "Tantangan estafet.",
    },
  },
  {
    slug: "congklak",
    icon: "/icons/games/congklak.svg",
    name: { en: "Congklak", id: "Congklak", jw: "Dakon" },
    players: "2",
    blurb: {
      en: "Traditional Indonesian mancala. Sow, relay, capture.",
      id: "Mancala tradisional Indonesia. Tabur, lanjut, tembak.",
      jw: "Dolanan tradisional. Nyebar biji, nerusake, nembak.",
    },
  },
  {
    slug: "halma",
    icon: "/icons/games/halma.svg",
    name: { en: "Halma", id: "Halma", jw: "Halma" },
    players: "2",
    blurb: {
      en: "Step or jump. First to fill the opposite corner wins.",
      id: "Jalan atau loncat. Isi sudut seberang duluan, menang.",
      jw: "Mlaku utawa mlumpat. Ngisi pojok sebrang luwih dhisik, menang.",
    },
  },
];
