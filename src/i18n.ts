export type Lang = "pl" | "en";

export interface Translation {
  // Meta
  appName: string;
  appSubtitle: string;
  pageTitle: string;
  // Menu
  menuPlay: string;
  menuPlayAria: string;
  unmute: string;
  mute: string;
  settings: string;
  help: string;
  fullscreen: string;
  langPl: string;
  langEn: string;
  menuCredits: string;
  selectLevel: string;
  backToMenu: string;
  selectHint: string;
  completed: string;
  upTo: string;
  bestJumps: string;
  levelNew: string;
  levelPlay: string;
  // HUD
  hudTower: string;
  hudFloor: string;
  restartLevel: string;
  // Victory modal
  clearedTitle: (n: number) => string;
  clearedDesc: (floors: number) => string;
  doneTitle: (n: number) => string;
  doneBut: string;
  gemsHint: (gems: number, total: number) => string;
  scoreLabel: string;
  ptsSuffix: string;
  gemsLabel: string;
  jumpsLabel: string;
  timeLabel: string;
  secondsSuffix: string;
  nextLevel: (n: number) => string;
  restart: string;
  menu: string;
  playAgain: string;
  // Game over modal
  gameOver: string;
  gameOverDesc: string;
  floorLabel: string;
  pointsLabel: string;
  tryAgain: string;
  // Game complete screen
  completedBadge: string;
  congrats: string;
  congratsDesc: (levels: number) => string;
  restartGame: string;
  backToMenuCaps: string;
  // Loading overlay
  loadingTower: (n: number) => string;
  loadingGems: (n: number) => string;
  loadingText: string;
  /** Warstwa oczekiwania przy powrocie (menu / wybor poziomu / edytor). */
  loadingBack: string;
  // Help modal
  helpTitle: string;
  helpIntro: (floors: number, levels: number) => string;
  elementsTitle: string;
  elElevators: string;
  elSprings: string;
  elGems: string;
  elCheckpoints: string;
  elDoors: string;
  elTimer: string;
  elCollapsing: string;
  elLevers: string;
  elBalls: string;
  controlsTitle: string;
  ctrlMove: string;
  ctrlJump: string;
  ctrlInteract: string;
  ctrlRestart: string;
  understand: string;
  // Settings modal
  settingsTitle: string;
  render: string;
  renderFast: string;
  renderSharp: string;
  imageFilter: string;
  filterPixelated: string;
  filterSmooth: string;
  filterCrt: string;
  sound: string;
  muted: string;
  soundOn: string;
  soundMutedHint: string;
  soundFx: string;
  soundMusic: string;
  soundFxHint: string;
  soundMusicHint: string;
  close: string;
  // Touch controls
  touchLeft: string;
  touchRight: string;
  touchDoor: string;
  touchJump: string;
  // iOS fullscreen guide
  iosTitle: string;
  iosDesc: string;
  iosStep1a: string;
  iosShare: string;
  iosStep1b: string;
  iosStep2a: string;
  iosAddToHome: string;
  iosStep3a: string;
  iosStep3b: string;
  iosFirefox: string;
}

export const translations: Record<Lang, Translation> = {
  pl: {
    appName: "Glut Żelek",
    appSubtitle: "Wieża",
    pageTitle: "Glut Żelek: Wieża",
    menuPlay: "GRAJ",
    menuPlayAria: "Graj",
    menuCredits: "©2026 LUKAMI",
    unmute: "Włącz dźwięk",
    mute: "Wycisz dźwięk",
    settings: "Ustawienia",
    help: "Instrukcja",
    fullscreen: "Pełny ekran",
    langPl: "Polski",
    langEn: "Angielski",
    selectLevel: "Wybierz Poziom",
    backToMenu: "Powrót do menu",
    selectHint: "Ukończone i następny są dostępne.",
    completed: "Ukończono:",
    upTo: "Do:",
    bestJumps: "sk",
    levelNew: "nowy",
    levelPlay: "graj",
    hudTower: "Wieża",
    hudFloor: "Piętro",
    restartLevel: "Zrestartuj poziom (R)",
    clearedTitle: (n) => `POZIOM ${n} ZALICZONY!`,
    clearedDesc: (floors) => `Pokonałeś ${floors} pięter i znalazłeś wszystkie klejnoty!`,
    doneTitle: (n) => `POZIOM ${n} UKOŃCZONY`,
    doneBut: "ale nie zaliczony!",
    gemsHint: (gems, total) => `Znajdź wszystkie klejnoty (${gems}/${total}), żeby odblokować następny poziom.`,
    scoreLabel: "Wynik:",
    ptsSuffix: "pkt",
    gemsLabel: "Klejnoty:",
    jumpsLabel: "Skoki:",
    timeLabel: "Czas:",
    secondsSuffix: "s",
    nextLevel: (n) => `NASTĘPNY POZIOM (${n})`,
    restart: "RESTART",
    menu: "MENU",
    playAgain: "ZAGRAJ PONOWNIE",
    gameOver: "KONIEC GRY",
    gameOverDesc: "Wpadłeś do wody bez punktu kontrolnego.",
    floorLabel: "Piętro:",
    pointsLabel: "Punkty:",
    tryAgain: "SPRÓBUJ PONOWNIE",
    completedBadge: "Gra ukończona",
    congrats: "GRATULACJE!",
    congratsDesc: (levels) => `Ukończyłeś wszystkie ${levels} poziomy wieży pełnej przygód!`,
    restartGame: "RESTART GRY",
    backToMenuCaps: "POWRÓT DO MENU",
    loadingTower: (n) => `Wieża ${n}`,
    loadingGems: (n) => `Znajdź ${n} klejnotów`,
    loadingText: "Wczytuje...",
    loadingBack: "Powrót...",
    helpTitle: "INSTRUKCJA",
    helpIntro: (floors, levels) => `Wspinaj się po wieży, znajdź wszystkie klejnoty aby móc odkrywać następne poziomy. Glut Żelek jest bardzo leniwy, liczy na to, że dotrzesz na szczyt wieży niewiele się męcząc. Żelek lubi schodzić po schodach, jeździć windą i przechodzić przez drzwi teleportacyjne. Nienawidzi skakać! Gra zapamiętuje najlepsze wyniki (ilośc skoków i czas). Każdy poziom liczy ${floors} pięter. Łącznie ${levels} poziomów. Inspiracją jest gra na komputer C64 "NEBULUS" z 1987r. John M. Phillips'a.`,
    elementsTitle: "ELEMENTY WIEŻY:",
    elElevators: "Windy: pionowe, o różnej prędkości",
    elSprings: "Sprężyny: wyrzut w górę",
    elGems: "Klejnoty: znajdź wszystkie",
    elCheckpoints: "Checkpointy: zapis postępu",
    elDoors: "Drzwi: teleport, stań i ↓ / S",
    elTimer: "Zegar: start przy pierwszym ruchu",
    elCollapsing: "Zapadnie: czerwona krawędź, po wejściu chowają się",
    elLevers: "Dzwignie: przełącznik z kulką, ↓ / S wysuwa/chowa schodek",
    elBalls: "Piłki: metalowe kule, unikaj",
    controlsTitle: "STEROWANIE:",
    ctrlMove: "← / → lub A / D – ruch",
    ctrlJump: "↑ lub Spacja – skok",
    ctrlInteract: "↓ lub S – drzwi / dzwignia",
    ctrlRestart: "R – restart",
    understand: "ROZUMIEM",
    settingsTitle: "USTAWIENIA",
    render: "Render",
    renderFast: "640px (szybciej)",
    renderSharp: "1280px (ostrzej)",
    imageFilter: "Filtr obrazu",
    filterPixelated: "Pikselowy",
    filterSmooth: "Gładki",
    filterCrt: "CRT",
    sound: "Dźwięk",
    muted: "Wyciszony",
    soundOn: "Dźwięk włączony",
    soundMutedHint: "Gra startuje wyciszona. Włącz dźwięk, aby zezwolić przeglądarce na odtwarzanie.",
    soundFx: "Efekty",
    soundMusic: "Muzyka",
    soundFxHint: "skoki, lądowania, diamenty",
    soundMusicHint: "melodie menu i gry",
    close: "ZAMKNIJ",
    touchLeft: "W lewo",
    touchRight: "W prawo",
    touchDoor: "Wejdź przez drzwi",
    touchJump: "Skok",
    iosTitle: "Pełny ekran na iPhone",
    iosDesc: "iOS blokuje Fullscreen API w kartach przeglądarki. Jedyne wyjście to instalacja gry jako aplikacji z ekranu startowego.",
    iosStep1a: "Naciśnij",
    iosShare: "Udostępnij",
    iosStep1b: "— ikonę kwadratu ze strzałką w górę, w dolnym pasku Safari.",
    iosStep2a: "Przewiń w dół i dotknij",
    iosAddToHome: "Dodaj do ekranu startowego",
    iosStep3a: "Otwórz",
    iosStep3b: "z ekranu startowego.",
    iosFirefox: "Firefox: naciśnij ⋯ → Dodaj do ekranu startowego.",
  },
  en: {
    appName: "Jelly Slime",
    appSubtitle: "The Tower",
    pageTitle: "Jelly Slime: The Tower",
    menuPlay: "PLAY",
    menuPlayAria: "Play",
    menuCredits: "©2026 LUKAMI",
    unmute: "Unmute",
    mute: "Mute",
    settings: "Settings",
    help: "Help",
    fullscreen: "Fullscreen",
    langPl: "Polish",
    langEn: "English",
    selectLevel: "Select Level",
    backToMenu: "Back to menu",
    selectHint: "Completed levels and the next one are available.",
    completed: "Completed:",
    upTo: "Up to:",
    bestJumps: "jumps",
    levelNew: "new",
    levelPlay: "play",
    hudTower: "Tower",
    hudFloor: "Floor",
    restartLevel: "Restart level (R)",
    clearedTitle: (n) => `LEVEL ${n} CLEARED!`,
    clearedDesc: (floors) => `You conquered ${floors} floors and found all the gems!`,
    doneTitle: (n) => `LEVEL ${n} COMPLETED`,
    doneBut: "but not cleared!",
    gemsHint: (gems, total) => `Find all the gems (${gems}/${total}) to unlock the next level.`,
    scoreLabel: "Score:",
    ptsSuffix: "pts",
    gemsLabel: "Gems:",
    jumpsLabel: "Jumps:",
    timeLabel: "Time:",
    secondsSuffix: "s",
    nextLevel: (n) => `NEXT LEVEL (${n})`,
    restart: "RESTART",
    menu: "MENU",
    playAgain: "PLAY AGAIN",
    gameOver: "GAME OVER",
    gameOverDesc: "You fell into the water without passing a checkpoint.",
    floorLabel: "Floor:",
    pointsLabel: "Points:",
    tryAgain: "TRY AGAIN",
    completedBadge: "Game completed",
    congrats: "CONGRATULATIONS!",
    congratsDesc: (levels) => `You have completed all ${levels} levels of a tower full of adventures!`,
    restartGame: "RESTART GAME",
    backToMenuCaps: "BACK TO MENU",
    loadingTower: (n) => `Tower ${n}`,
    loadingGems: (n) => `Find ${n} gems`,
    loadingText: "Loading...",
    loadingBack: "Returning...",
    helpTitle: "INSTRUCTION",
    helpIntro: (floors, levels) => `Climb the tower and find gems to unlock the next levels. Jelly Slime is very lazy and is counting on you to reach the top of the tower with minimal effort. Jelly likes to walk down stairs, ride the elevator, and go through teleportation doors. He hates jumping! The game saves your best scores (number of jumps and time). Each level has ${floors} floors. There are ${levels} levels in total. The author's main inspiration is the 1987 C64 computer game “NEBULUS” by John M. Phillips.`,
    elementsTitle: "TOWER ELEMENTS:",
    elElevators: "Elevators: vertical",
    elSprings: "Springs: launch you up",
    elGems: "Gems: find them all",
    elCheckpoints: "Checkpoints: save progress",
    elDoors: "Doors: teleport, stand on them and press ↓ / S",
    elTimer: "Timer: starts with your first move",
    elCollapsing: "Collapsing stairs: red edge, retract after you step on them",
    elLevers: "Levers: switch with a ball, ↓ / S shows/hides a stair",
    elBalls: "Balls: iron spheres, avoid them",
    controlsTitle: "CONTROLS:",
    ctrlMove: "← / → or A / D – move",
    ctrlJump: "↑ or Space – jump",
    ctrlInteract: "↓ or S – doors / lever",
    ctrlRestart: "R – restart",
    understand: "GOT IT",
    settingsTitle: "SETTINGS",
    render: "Render",
    renderFast: "640px (faster)",
    renderSharp: "1280px (sharper)",
    imageFilter: "Image filter",
    filterPixelated: "Pixelated",
    filterSmooth: "Smooth",
    filterCrt: "CRT",
    sound: "Sound",
    muted: "Muted",
    soundOn: "Sound on",
    soundMutedHint: "The game starts muted. Turn sound on to allow your browser to play audio.",
    soundFx: "Effects",
    soundMusic: "Music",
    soundFxHint: "jumps, landings, gems",
    soundMusicHint: "menu & game tunes",
    close: "CLOSE",
    touchLeft: "Left",
    touchRight: "Right",
    touchDoor: "Enter door",
    touchJump: "Jump",
    iosTitle: "Fullscreen on iPhone",
    iosDesc: "iOS blocks the Fullscreen API in browser tabs. The only way around it is to install the game as an app from the home screen.",
    iosStep1a: "Tap",
    iosShare: "Share",
    iosStep1b: "— the square icon with the arrow pointing up, in the Safari bottom bar.",
    iosStep2a: "Scroll down and tap",
    iosAddToHome: "Add to Home Screen",
    iosStep3a: "Open",
    iosStep3b: "from your home screen.",
    iosFirefox: "Firefox: press ⋯ → Add to Home Screen.",
  },
};

const LANG_STORAGE_KEY = "jelly-lang";

export function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === "en" ? "en" : "pl";
  } catch {
    return "pl";
  }
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore storage errors (private mode etc.)
  }
}
