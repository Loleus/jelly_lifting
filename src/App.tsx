import { useEffect, useRef, useState, useCallback } from "react";
import { flushSync } from "react-dom";
import { GlowerTowerGame, pickResolutionProfile, type ResolutionProfile } from "./engine/GlowerTowerGame";
import { EngineConfig, GameStatus } from "./engine/gameTypes";
import { LEVELS, TOTAL_LEVELS, menuLevelIndex } from "./levels";
import type { TowerLevelDefinition } from "./levels/levelTypes";
import { loadProgress, markLevelCompleted, isUnlocked, type SavedProgress } from "./levels/progress";
import { soundEngine, loadAudioPrefs, saveAudioPrefs } from "./soundEngine";
import { translations, loadLang, saveLang, type Lang } from "./i18n";
import { TouchControls } from "./components/TouchControls";
import { SettingsModal } from "./components/SettingsModal";
import { VictoryModal, GameOverModal } from "./components/VictoryModal";
import { GameCompleteScreen } from "./components/GameCompleteScreen";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { HelpModal } from "./components/HelpModal";
import { IosFullscreenGuide } from "./components/IosFullscreenGuide";
import { MenuScreen } from "./components/MenuScreen";
import { LevelSelectScreen } from "./components/LevelSelectScreen";
import { GameHUD } from "./components/GameHUD";
import { toggleFullscreen } from "./utils/fullscreen";
import { useLoadingOverlay } from "./hooks/useLoadingOverlay";
import { useRunTimer } from "./hooks/useRunTimer";

type AppScreen = "menu" | "levelSelect" | "editor" | "playing" | "win" | "gameover" | "gamecomplete";

/** Silnik tla menu + odroczone sprzatanie (patrz efekt montujacy na starcie). */
interface BackdropEntry {
  game: GlowerTowerGame;
  disposeTimer?: number;
}

/** Zmiana konfiguracji: obiekt albo funkcja od AKTUALNEGO stanu (odporna na stare domknięcia). */
export type ConfigPatch = Partial<EngineConfig> | ((prev: EngineConfig) => Partial<EngineConfig>);

const IN_GAME_SCREENS: AppScreen[] = ["playing", "win", "gameover", "gamecomplete"];

// ============================================================================
// DEV TOOL: EDYTOR POZIOMÓW + UI narzędzi developerskich (src/dev/DevTools.tsx)
//   src/dev/LevelEditorScreen.tsx is a local, editable source file.
// ----------------------------------------------------------------------------
// Narzędzia istnieją WYŁĄCZNIE w wersji developerskiej (`npm run dev`):
//  • `import.meta.env.DEV` jest stałą podmienianą przez Vite — w buildzie
//    portalowym dynamiczny import poniżej jest martwym kodem i Rollup nie
//    emituje chunku narzędzi,
//  • plugin dev-only-guard (vite.config.ts) dodatkowo przekierowuje każdy
//    import z src/dev/** na pusty stub, wyklucza katalog ze skanu Tailwinda
//    (zero klas CSS dev-UI w bundlu) i PRZERYWA build, gdyby kod edytora
//    mimo wszystko wyciekł do dist/.
// Całe dev-UI (okienko pod PLAY, ikona wyjścia z symulacji 3D, przycisk nad
// modalami) leży w src/dev/DevTools.tsx — komponenty gry dostają tylko sloty.
// ============================================================================
type DevToolsModule = typeof import("./dev/DevTools");
const loadDevTools = (): Promise<DevToolsModule> =>
  import.meta.env.DEV
    ? import("./dev/DevTools")
    : Promise.reject(new Error("Narzędzia developerskie są dostępne tylko w wersji developerskiej."));

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GlowerTowerGame | null>(null);
  // Silnik tla menu trzymany osobno od gameRef, zeby remont StrictMode mogl go
  // PRZEJAC zamiast budowac scene drugi raz. Sprzatanie jest odroczone o tick:
  // jesli w tym czasie przyjdzie remont, timer jest kasowany i budowa jest jedna.
  const backdropRef = useRef<BackdropEntry | null>(null);
  const scheduleBackdropDisposal = (entry: BackdropEntry) => {
    gameRef.current = null;
    if (entry.disposeTimer !== undefined) clearTimeout(entry.disposeTimer);
    entry.disposeTimer = window.setTimeout(() => {
      entry.game.dispose();
      if (backdropRef.current === entry) backdropRef.current = null;
    }, 0);
  };

  const [screen, setScreen] = useState<AppScreen>("menu");
  const screenRef = useRef<AppScreen>("menu");
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // ── Language ──────────────────────────────────────────────────────────────
  const [lang, setLangState] = useState<Lang>(() => loadLang());
  const t = translations[lang];
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    saveLang(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.pageTitle;
  }, [lang, t]);

  // ── Engine config / player state ──────────────────────────────────────────
  const [config, setConfig] = useState<EngineConfig>(() => {
    // Efekty/muzyka: preferencje użytkownika (localStorage).
    // Główny wyłącznik: ZAWSZE start wyciszony — odmutowanie w menu jest zgodą
    // na dźwięk (gest użytkownika wymagany m.in. przez iOS Safari).
    const audio = loadAudioPrefs();
    soundEngine.setSfxEnabled(audio.sfxEnabled);
    soundEngine.setMusicEnabled(audio.musicEnabled);
    return {
      cullingEnabled: true,
      simulatedFpsThrottle: 0,
      filterMode: "crisp",
      renderScale: 1,
      soundMuted: true,
      sfxEnabled: audio.sfxEnabled,
      musicEnabled: audio.musicEnabled,
    };
  });
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const [playerState, setPlayerState] = useState({
    level: 0,
    score: 0,
    gemsCollected: 0,
    totalGems: LEVELS[0].gems.length,
    jumps: 0,
    elapsedTime: 0,
    status: "running" as GameStatus,
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showIosFullscreenHelp, setShowIosFullscreenHelp] = useState(false);
  const [towerHeight, setTowerHeight] = useState(LEVELS[0].towerHeight);
  const [currentLevel, setCurrentLevel] = useState(1);
  const levelRef = useRef(1);
  useEffect(() => { levelRef.current = currentLevel; }, [currentLevel]);

  const [progress, setProgress] = useState<SavedProgress>(() => loadProgress());

  // ── DEV TOOL: stan edytora poziomów ───────────────────────────────────────
  // devTools     — moduł narzędzi developerskich (src/dev/DevTools.tsx),
  //                ładowany dynamicznie przy starcie — tylko dev,
  // editorLevel  — projekt planszy (przetrwa podgląd 3D; edytor sam zapisuje
  //                go w localStorage),
  // fromEditor   — bieżąca rozgrywka to TEST z edytora: HUD dostaje ikonę
  //                wyjścia z symulacji 3D, a postęp kampanii NIE jest zapisywany.
  const [devTools, setDevTools] = useState<DevToolsModule | null>(null);
  const [editorLevel, setEditorLevel] = useState<TowerLevelDefinition | null>(null);
  const [fromEditor, setFromEditor] = useState(false);
  const fromEditorRef = useRef(false);
  const setFromEditorSync = (value: boolean) => {
    fromEditorRef.current = value;
    setFromEditor(value);
  };

  // Dev: moduł narzędzi ładujemy od razu przy starcie (dynamiczny import),
  // żeby okienko pod PLAY było widoczne bez klikania. W buildzie portalowym
  // cały efekt jest martwym kodem (import.meta.env.DEV === false).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let cancelled = false;
    loadDevTools()
      .then((mod) => { if (!cancelled) setDevTools(mod); })
      .catch((err) => console.error("[dev] Nie udało się załadować narzędzi developerskich:", err));
    return () => { cancelled = true; };
  }, []);

  const loading = useLoadingOverlay();
  // Warstwa oczekiwania: "back" = powrot do menu / wyboru poziomu / edytora.
  const [loadingVariant, setLoadingVariant] = useState<"tower" | "back">("tower");
  // True, dopoki trwa przejscie z warstwa oczekiwania. Blokuje ciezkie
  // przebudowy tla (createEngine) do momentu, gdy overlay jest juz widoczny.
  const [transitioning, setTransitioning] = useState(false);
  const runTimer = useRunTimer();
  const totalRunTimeRef = useRef(0);

  const [resolution, setResolution] = useState<ResolutionProfile>(() =>
    pickResolutionProfile(
      typeof window === "undefined" ? 1280 : window.innerWidth,
      typeof window === "undefined" ? 800 : window.innerHeight
    )
  );

  // ── Engine construction ──────────────────────────────────────────────────
  const createEngine = useCallback(
    (levelDef: TowerLevelDefinition) => {
      const host = mountRef.current;
      if (!host) return null;
      if (gameRef.current) { gameRef.current.dispose(); gameRef.current = null; }
      const game = new GlowerTowerGame(host, levelDef);
      gameRef.current = game;
      setTowerHeight(game.towerHeight);
      setPlayerState((prev) => ({ ...prev, totalGems: game.level.gems.length }));
      game.config = { ...configRef.current };
      game.applyCanvasFilter();
      // Uwaga: NIE ruszamy tu soundEngine — stan audio zmienia wyłącznie
      // handleConfigChange (synchronicznie, w geście użytkownika). Wołanie
      // setMuted() stąd (rAF, poza gestem) rozjeżdżało stan i iOS.
      game.setRenderResolution(resolution.width, resolution.height);

      game.onPlayerStateUpdate = (pState) => {
        const level = Math.max(0, Math.min(game.towerHeight, Math.floor(pState.y)));
        // OPTYMALIZACJA GC / CYCLE COLLECTORA:
        // Poprzednio kazde wywolanie tworzylo NOWY obiekt stanu, wiec React
        // re-renderowal cale drzewo nawet gdy nic sie nie zmienilo (np. caly
        // czas w menu). Przy setState zwracajacym TEN SAM obiekt React robi
        // bail-out i nie rusza reconcilerze — znikaja alokacje torow Reacta,
        // ktore napedzaly cycle collector.
        setPlayerState((prev) =>
          prev.level === level &&
          prev.score === pState.score &&
          prev.gemsCollected === pState.gemsCollected &&
          prev.totalGems === pState.totalGems &&
          prev.jumps === pState.jumpCount &&
          prev.elapsedTime === pState.elapsedTime &&
          prev.status === pState.status
            ? prev
            : {
                level,
                score: pState.score,
                gemsCollected: pState.gemsCollected,
                totalGems: pState.totalGems,
                jumps: pState.jumpCount,
                elapsedTime: pState.elapsedTime,
                status: pState.status,
              }
        );
      };
      game.onGameStatusChange = (newStatus) => {
        setPlayerState((prev) => ({ ...prev, status: newStatus }));
        if (newStatus !== "gameover" && newStatus !== "win") return;

        const finalTime = runTimer.stop();

        if (newStatus === "win") {
          // DEV TOOL: test poziomu z edytora — pokazujemy modal wygranej,
          // ale NIE dotykamy zapisu postępu kampanii ani odblokowań.
          if (fromEditorRef.current) {
            setScreen("win");
            return;
          }

          totalRunTimeRef.current += finalTime;

          const ps = game.playerState;
          const allGems = ps.gemsCollected >= ps.totalGems;

          const updated = markLevelCompleted(
            levelRef.current,
            allGems,
            ps.jumpCount,
            finalTime,
            TOTAL_LEVELS
          );
          setProgress(updated);

          // 🔥 POPRAWIONA LOGIKA
          if (levelRef.current >= TOTAL_LEVELS) {
            // OSTATNI LEVEL
            if (allGems) {
              // Zebrano wszystkie → prawdziwy koniec gry
              setScreen("gamecomplete");
            } else {
              // Brak gemów → normalny ekran "win" (VictoryModal)
              setScreen("win");
            }
          } else {
            // Normalne poziomy
            setScreen("win");
          }
        } else {
          setScreen("gameover");
        }
      };


      return game;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Initial engine mount (menu backdrop).
  //
  // WAZNE — dwie sprzeczne potrzeby, zalatwione jedna konstrukcja:
  //  1) Silnik MUSI powstac SYNCHRONICZNIE w efekcie, zeby `<canvas>` i scena
  //     byly w DOM przed pierwszym malowaniem. Inaczej plansza menu i logo
  //     "wyskakuja" na pustym tle, zanim pojawi sie render (tak bylo, gdy
  //     budowa byla odroczona o requestAnimationFrame).
  //  2) StrictMode w dev montuje efekty DWUKROTNIE (mount -> cleanup -> mount),
  //     wiec synchroniczny build + natychmiastowy dispose w cleanupie budowal
  //     cala scene dwa razy (kilka sekund).
  // Rozwiazanie: budujemy raz, a cleanup NIE kasuje silnika od razu — tylko
  // planuje sprzatanie w nastepnym ticku. Remont z tego samego montazu
  // przychodzi w mikrotasku PRZED tym timerem i PRZEJMUJE ten sam silnik
  // (backdropRef), wiec budowa jest jedna. Prawdziwe odmontowanie (wyjscie z
  // aplikacji) nie ma nastepnika, wiec timer faktycznie zwalnia zasoby.
  useEffect(() => {
    const adopted = backdropRef.current;
    if (adopted) {
      // Przejecie silnika z poprzedniego (skasowanego) montazu StrictMode.
      if (adopted.disposeTimer !== undefined) {
        clearTimeout(adopted.disposeTimer);
        adopted.disposeTimer = undefined;
      }
      gameRef.current = adopted.game;
      adopted.game.setSceneMode("menu");
      return () => scheduleBackdropDisposal(adopted);
    }
    const initialIdx = menuLevelIndex(loadProgress());
    const game = createEngine(LEVELS[initialIdx]);
    if (!game) return;
    game.setSceneMode("menu");
    const entry = { game } as BackdropEntry;
    backdropRef.current = entry;
    return () => scheduleBackdropDisposal(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap scene mode when the screen changes.
  useEffect(() => {
    // WARSTWA OCZEKIWANIA: dopoki trwa przejscie, nie budujemy ciezkiego tla —
    // inaczej obraz zamarza na ostatniej klatce gry, zanim pojawi sie menu.
    // Gdy transitioning wroci na false, ten efekt uruchamia sie ponownie
    // (transitioning jest w zaleznosciach) i wtedy montuje tlo pod overlayem.
    if (transitioning) return;
    if (!gameRef.current) return;
    if (screen === "menu" || screen === "levelSelect") {
      const idx = menuLevelIndex(loadProgress());
      const correctBackdrop = gameRef.current.level.id === LEVELS[idx].id;
      if (!correctBackdrop) {
        const newGame = createEngine(LEVELS[idx]);
        if (newGame) newGame.setSceneMode("menu");
      } else {
        gameRef.current.setSceneMode("menu");
      }
    } else if (screen === "playing") {
      gameRef.current.setSceneMode("play");
    }
    // "editor": silnik zostaje w trybie orbity (tło), nic nie przełączamy.
  }, [screen, progress, createEngine, transitioning]);

  // ── WARSTWA OCZEKIWANIA / POWROTU ─────────────────────────────────────────
  /**
   * Maluje overlay (flushSync) i dopiero po dwoch klatkach wykonuje `work`,
   * czyli zmiane ekranu i — juz w efekcie — przebudowe silnika tla. Bez tego
   * przejscie "gra -> menu" zamrazalo obraz do czasu zbudowania menu.
   * `heavy` = czy przejscie naprawde wymaga przebudowy (gdy tlo jest juz
   * wlasciwa wieza, nie ma po co pokazywac overlay'a ani czekac).
   */
  const withTransition = (
    variant: "tower" | "back",
    gemsCount: number,
    work: () => void,
    heavy: boolean
  ) => {
    if (!heavy) {
      work();
      return;
    }
    flushSync(() => {
      setLoadingVariant(variant);
      loading.trigger(gemsCount);
      setTransitioning(true);
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        work();
        flushSync(() => setTransitioning(false));
      });
    });
  };

  /** Czy powrot na ekran menu wymusi przebudowe silnika (ciezka operacja)? */
  const menuBackdropNeedsRebuild = () => {
    const target = LEVELS[menuLevelIndex(loadProgress())];
    return !gameRef.current || gameRef.current.level.id !== target.id;
  };

  // Muzyka per ekran — jedno miejsce decyzji, twarde przełączenie bez nakładania:
  //   menu / wybór poziomu / ekran końcowy → temat menu,
  //   rozgrywka                            → temat gry,
  //   modale wygranej / porażki            → cisza (gra tylko fanfara / dżingiel),
  //     dzięki czemu temat menu nie startuje „pod” modalem i nie przenika
  //     do gry po kliknięciu „dalej” / „jeszcze raz”.
  useEffect(() => {
    if (screen === "playing") soundEngine.playMusic("game");
    else if (screen === "win" || screen === "gameover") soundEngine.stopMusic();
    else soundEngine.playMusic("menu");
  }, [screen]);

  // Audio startuje WYCISZONE — odblokowanie następuje dopiero w geście
  // odmutowania (handleConfigChange → soundEngine.setMuted(false)).
  // Tu: każdy gest = okazja, by ożywić kontekst po przerwaniu (iOS: telefon,
  // blokada ekranu, inna aplikacja); karta w tle = pauza muzyki.
  useEffect(() => {
    const onGesture = () => soundEngine.resume(true);
    const onVisibility = () => soundEngine.setPageHidden(document.visibilityState === "hidden");
    const onPageHide = () => soundEngine.setPageHidden(true);
    const onPageShow = () => soundEngine.setPageHidden(false);
    window.addEventListener("pointerdown", onGesture, { passive: true, capture: true });
    window.addEventListener("keydown", onGesture, { capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pointerdown", onGesture, { capture: true });
      window.removeEventListener("keydown", onGesture, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // Run timer — starts on first input, tick every frame while playing.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (screenRef.current !== "playing" || !gameRef.current) return;
      const game = gameRef.current;
      if (game.playerState.status !== "running") return;
      const anyInput = game.input.left || game.input.right || game.input.up || game.input.jumpQueued;
      if (!runTimer.isRunning() && !runTimer.hasFinalTime() && anyInput) {
        runTimer.start();
      }
      runTimer.tick();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolution profile keeps in sync with viewport.
  useEffect(() => {
    const applyProfile = () => {
      const next = pickResolutionProfile(window.innerWidth, window.innerHeight);
      setResolution((prev) => (prev.id === next.id ? prev : next));
    };
    applyProfile();
    window.addEventListener("resize", applyProfile);
    window.addEventListener("orientationchange", applyProfile);
    return () => {
      window.removeEventListener("resize", applyProfile);
      window.removeEventListener("orientationchange", applyProfile);
    };
  }, []);

  useEffect(() => {
    gameRef.current?.setRenderResolution(resolution.width, resolution.height);
  }, [resolution]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && IN_GAME_SCREENS.includes(screenRef.current)) {
        e.preventDefault();
        handleRestart();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => {
    const loader = document.getElementById("loader");

    // Fallback: jeśli SW serwuje starą wersję, loader musi zniknąć po 3 sekundach
    const fallback = setTimeout(() => {
      if (loader) loader.style.display = "none";
    }, 3000);

    if (screen === "menu" && window.__fontsLoaded) {
      if (loader) loader.style.display = "none";
      clearTimeout(fallback);
    }

    return () => clearTimeout(fallback);
  }, [screen]);



  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleConfigChange = useCallback(
    (patchOrFn: ConfigPatch) => {
      // configRef jest SYNCHRONICZNYM źródłem prawdy: pasek ikon, modal
      // ustawień i silnik audio widzą ten sam stan natychmiast — bez czekania
      // na re-render. To usuwa rozjazd przy przełączaniu na przemian
      // (pasek ↔ ustawienia) i przy szybkich kliknięciach.
      const prev = configRef.current;
      const patch = typeof patchOrFn === "function" ? patchOrFn(prev) : patchOrFn;
      const updated: EngineConfig = { ...prev, ...patch };
      configRef.current = updated;

      // AUDIO — synchronicznie, w stosie wywołań gestu użytkownika (click/tap):
      // dopiero wtedy iOS Safari pozwala utworzyć / wznowić AudioContext.
      if (updated.sfxEnabled !== prev.sfxEnabled) soundEngine.setSfxEnabled(updated.sfxEnabled);
      if (updated.musicEnabled !== prev.musicEnabled) soundEngine.setMusicEnabled(updated.musicEnabled);
      if (updated.soundMuted !== prev.soundMuted) soundEngine.setMuted(updated.soundMuted);
      if (updated.sfxEnabled !== prev.sfxEnabled || updated.musicEnabled !== prev.musicEnabled) {
        saveAudioPrefs({ sfxEnabled: updated.sfxEnabled, musicEnabled: updated.musicEnabled });
      }

      if (gameRef.current) {
        gameRef.current.config = updated;
        if (patch.filterMode !== undefined) gameRef.current.applyCanvasFilter();
        if (patch.renderScale !== undefined) {
          gameRef.current.setRenderResolution(resolution.width, resolution.height);
        }
      }
      setConfig(updated);
    },
    [resolution]
  );

  const handleFullscreen = async () => {
    // ========================================================================
    // FULLSCREEN — własny przycisk pełnego ekranu.
    // Portale (CrazyGames, Yandex Games, itch.io, GameMonetize, CoolMathGames,
    // ArmorGames, Kongregate WebGL, Newgrounds) mają WŁASNY przycisk
    // fullscreen i zabraniają wywoływania Fullscreen API przez grę.
    // W bundlu portalowym (PROD i bez VITE_PWA) ten blok jest wycinany przez
    // dead-code-elimination — handler staje się no-op, a sam przycisk jest
    // ukrywany (TopIconBar). W dev (npm run dev) i w bundlu PWA
    // (npm run build:pwa) pełny ekran działa normalnie.
    // ========================================================================
    if (import.meta.env.PROD && !import.meta.env.VITE_PWA) return;

    const result = await toggleFullscreen();
    if (result === "ios-blocked") setShowIosFullscreenHelp(true);
  };

  /**
   * Start a specific level: paint the loading overlay first (via flushSync),
   * then in two rAF frames create the heavy engine so the browser has time
   * to render the overlay before the main thread blocks.
   */
  const startLevel = (levelNum: number, options: { changeScreenImmediately?: boolean } = {}) => {
    const level = LEVELS[levelNum - 1];
    flushSync(() => {
      // Wariant MUSI byc ustawiony tutaj: loadingVariant jest trwalym stanem,
      // wiec po powrocie do wyboru poziomu (wariant "back") kolejne wejscie na
      // poziom pokazywaloby plansze „Powrot / Wczytuje” zamiast „Wieza N”.
      setLoadingVariant("tower");
      loading.trigger(level.gems.length);
      if (options.changeScreenImmediately) setScreen("playing");
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newGame = createEngine(level);
        if (newGame) {
          newGame.restartGame();
          newGame.setSceneMode("play");
        }
        runTimer.reset();
        if (!options.changeScreenImmediately) setScreen("playing");
      });
    });
  };

  const handleOpenLevelSelect = () => {
    withTransition("back", 0, () => {
      setProgress(loadProgress());
      setScreen("levelSelect");
    }, menuBackdropNeedsRebuild());
  };
  const handleStartFromMenu = handleOpenLevelSelect;

  const handleSelectLevel = (levelNum: number) => {
    if (!isUnlocked(levelNum, loadProgress())) return;
    setCurrentLevel(levelNum);
    startLevel(levelNum);
  };

  const handleNewGame = () => {
    setCurrentLevel(1);
    totalRunTimeRef.current = 0;
    startLevel(1, { changeScreenImmediately: true });
  };

  const handleRestart = () => {
    gameRef.current?.restartGame();
    runTimer.reset();
    setScreen("playing");
  };

  const handleNextLevel = () => {
    const next = currentLevel + 1;
    if (next > TOTAL_LEVELS) {
      setScreen("gamecomplete");
      return;
    }
    setCurrentLevel(next);
    startLevel(next, { changeScreenImmediately: true });
  };

  const handleBackToMenu = () => {
    withTransition("back", 0, () => {
      setCurrentLevel(1);
      totalRunTimeRef.current = 0;
      setFromEditorSync(false);
      setScreen("menu");
    }, menuBackdropNeedsRebuild());
  };

  // ── DEV TOOL: edytor poziomów ─────────────────────────────────────────────
  /** Okienko pod PLAY: otwiera ekran edytora z ostatnim projektem planszy. */
  const handleOpenEditor = () => {
    if (!import.meta.env.DEV || !devTools) return;
    // Montaz edytora jest ciezki (siatka pieter) — tez pod warstwa oczekiwania.
    withTransition("back", 0, () => {
      // Projekt planszy: ostatnio zapisany w localStorage albo pusta wieża.
      setEditorLevel((prev) => prev ?? devTools.loadEditorLevel());
      setScreen("editor");
    }, true);
  };

  /** Edytor → symulacja 3D: buduje silnik na projekcie z edytora. */
  const handleTestLevelIn3D = (customLevel: TowerLevelDefinition) => {
    setEditorLevel(customLevel);
    setFromEditorSync(true);
    flushSync(() => {
      // Symulacja poziomu z edytora to ten sam start poziomu -> plansza wiezy,
      // a nie warstwa powrotu (loadingVariant jest trwaly).
      setLoadingVariant("tower");
      loading.trigger(customLevel.gems.length);
      setScreen("playing");
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newGame = createEngine(customLevel);
        if (newGame) {
          newGame.restartGame();
          newGame.setSceneMode("play");
        }
        runTimer.reset();
      });
    });
  };

  /** Ikona w pasku HUD: wyjście z symulacji 3D z powrotem do edytora (plansza zapamiętana). */
  const handleReturnToEditor = () => {
    if (!editorLevel || !devTools) return;
    withTransition("back", 0, () => {
      runTimer.reset();
      setScreen("editor");
      // Zatrzymaj fizykę podglądu (tryb orbity), silnik zostaje na tym samym
      // poziomie — tło pod edytorem pokazuje testowaną wieżę.
      gameRef.current?.setSceneMode("menu");
    }, true);
  };

  const handleEditorBackToMenu = () => {
    withTransition("back", 0, () => {
      setFromEditorSync(false);
      setScreen("menu");
    }, menuBackdropNeedsRebuild());
  };

  // Touch controls proxy input into the engine while playing.
  const withGameInput = (fn: (game: GlowerTowerGame) => void) => {
    if (!gameRef.current || screenRef.current !== "playing") return;
    fn(gameRef.current);
  };
  const handleTouchMoveLeft = (p: boolean) => withGameInput((g) => { g.input.left = p; });
  const handleTouchMoveRight = (p: boolean) => withGameInput((g) => { g.input.right = p; });
  const handleTouchJump = (p: boolean) =>
    withGameInput((g) => {
      if (p && !g.input.up) g.input.jumpQueued = true;
      g.input.up = p;
    });
  const handleTouchDoor = () => withGameInput((g) => { g.input.doorQueued = true; });

  // Toggle liczony od aktualnego stanu (configRef), nie od domknięcia renderu —
  // pasek w menu, pasek w HUD i modal ustawień zawsze przełączają spójnie.
  const toggleSound = useCallback(
    () => handleConfigChange((c) => ({ soundMuted: !c.soundMuted })),
    [handleConfigChange]
  );
  const openSettings = () => setIsSettingsOpen(true);
  const openHelp = () => setIsHelpOpen(true);

  const inGameScreen = IN_GAME_SCREENS.includes(screen);
  const editorTestActive = import.meta.env.DEV && fromEditor && editorLevel !== null;
  // Narzędzia developerskie — zawsze null w buildzie portalowym (stała import.meta.env.DEV).
  const Dev = import.meta.env.DEV ? devTools : null;

  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#050b14] font-freckle text-slate-100 select-none">
      <div
        className={`relative overflow-hidden transition-all duration-700 ${config.filterMode === "crt" ? "crt-overlay" : ""
          } `}
        style={{
          width: "100vw",
          height: "100vh",
          filter: screen === "menu" || screen === "levelSelect" ? "blur(1.5px) brightness(0.72)" : "none",
        }}
      >
        <div
          ref={mountRef}
          className={`absolute inset-0 transition-all duration-700 ${config.filterMode === "crisp" ? "rendering-pixelated" : ""
            }`}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        />
      </div>

      {screen === "menu" && (
        <MenuScreen
          t={t}
          lang={lang}
          onLangChange={setLang}
          soundMuted={config.soundMuted}
          onToggleSound={toggleSound}
          onOpenSettings={openSettings}
          onOpenHelp={openHelp}
          onFullscreen={handleFullscreen}
          onPlay={handleStartFromMenu}
          devSlot={Dev ? <Dev.DevMenuLauncher onOpenEditor={handleOpenEditor} /> : undefined}
        />
      )}

      {/* DEV TOOL: ekran edytora poziomów (tylko npm run dev) */}
      {Dev && screen === "editor" && editorLevel && (
        <Dev.LevelEditorScreen
          level={editorLevel}
          onLevelChange={setEditorLevel}
          onBackToMenu={handleEditorBackToMenu}
          onTestLevelIn3D={handleTestLevelIn3D}
        />
      )}

      {screen === "levelSelect" && (
        <LevelSelectScreen
          t={t}
          progress={progress}
          onBackToMenu={handleBackToMenu}
          onSelectLevel={handleSelectLevel}
        />
      )}

      {inGameScreen && (
        <GameHUD
          t={t}
          currentLevel={currentLevel}
          towerHeight={towerHeight}
          playerLevel={playerState.level}
          gemsCollected={playerState.gemsCollected}
          totalGems={playerState.totalGems}
          score={playerState.score}
          displayTime={runTimer.displayTime}
          soundMuted={config.soundMuted}
          onToggleSound={toggleSound}
          onRestart={handleRestart}
          onBackToMenu={handleBackToMenu}
          onOpenSettings={openSettings}
          onOpenHelp={openHelp}
          onFullscreen={handleFullscreen}
          devButtons={Dev && editorTestActive ? <Dev.EditorExitIconButton onClick={handleReturnToEditor} /> : undefined}
        />
      )}

      {/* DEV TOOL: modale wygranej/porażki zasłaniają pasek ikon (z-50 > z-30),
          więc podczas testu z edytora dokładamy nad nimi wyjście do edytora. */}
      {Dev && editorTestActive && (screen === "win" || screen === "gameover") && (
        <Dev.EditorExitPill onClick={handleReturnToEditor} />
      )}

      {screen === "playing" && (
        <TouchControls
          t={t}
          onMoveLeft={handleTouchMoveLeft}
          onMoveRight={handleTouchMoveRight}
          onJump={handleTouchJump}
          onDoor={handleTouchDoor}
        />
      )}

      {showIosFullscreenHelp && (
        <IosFullscreenGuide t={t} onClose={() => setShowIosFullscreenHelp(false)} />
      )}

      <SettingsModal
        t={t}
        config={config}
        onConfigChange={handleConfigChange}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {isHelpOpen && (
        <HelpModal
          t={t}
          towerHeight={towerHeight}
          totalLevels={TOTAL_LEVELS}
          onClose={() => setIsHelpOpen(false)}
        />
      )}

      {screen === "win" && (
        <VictoryModal
          t={t}
          score={playerState.score}
          gems={playerState.gemsCollected}
          totalGems={playerState.totalGems}
          jumps={playerState.jumps}
          timeSec={runTimer.finalTime()}
          towerHeight={towerHeight}
          levelNumber={currentLevel}
          totalLevels={TOTAL_LEVELS}
          onRestart={handleRestart}
          onBackToMenu={handleBackToMenu}
          // Test z edytora nie ma „następnego poziomu” kampanii.
          onNextLevel={fromEditor ? undefined : handleNextLevel}
        />
      )}
      {screen === "gamecomplete" && (
        <GameCompleteScreen
          t={t}
          score={playerState.score}
          gems={playerState.gemsCollected}
          totalGems={playerState.totalGems}
          jumps={playerState.jumps}
          totalTime={totalRunTimeRef.current}
          levelsCompleted={TOTAL_LEVELS}
          onRestart={handleNewGame}
          onBackToMenu={handleBackToMenu}
        />
      )}
      {screen === "gameover" && (
        <GameOverModal
          t={t}
          score={playerState.score}
          level={playerState.level}
          towerHeight={towerHeight}
          onRestart={handleRestart}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {loading.loadingKey > 0 && (
        <LoadingOverlay
          t={t}
          visible={loading.loadingVisible}
          levelNumber={currentLevel}
          gemsCount={loading.loadingGemsCount}
          variant={loadingVariant}
        />
      )}
    </main>
  );
}
