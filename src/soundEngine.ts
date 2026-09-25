export const SOUND_FILES = {
  jump: "sounds/fx-jump.mp3",
  superJump: "sounds/fx-super-jump.mp3",
  land: "sounds/fx-land.mp3",
  bonk: "sounds/fx-bonk.mp3",
  lever: "sounds/fx-lever.mp3",
  stairSlide: "sounds/fx-stair-slide.mp3",
  ballBounce: "sounds/fx-ball-bounce.mp3",
  ambPatrol: "sounds/amb-patrol.mp3",
  ambElevator: "sounds/amb-elevator.mp3",
  coin: "sounds/fx-coin.mp3",
  checkpoint: "sounds/fx-checkpoint.mp3",
  gameOver: "sounds/fx-game-over.mp3",
  win: "sounds/fx-win.mp3",
  musicMenu: "sounds/music-menu.mp3",
  musicGame: "sounds/music-game.mp3",
} as const;

export type SfxName =
  | "jump" | "superJump" | "land" | "bonk" | "lever" | "stairSlide"
  | "ballBounce" | "coin" | "checkpoint" | "gameOver" | "win";
export type MusicTrack = "menu" | "game";

/* ------------------- dźwięki otoczenia: wrogowie i windy ------------------ */

export const AMBIENT_X_MAX = 6.5;
export const AMBIENT_Y_MAX = 5.5;

const AMBIENT_PATROL_LEVEL = 0.075;
const AMBIENT_ELEVATOR_LEVEL = 0.075;
const AMBIENT_BALL_LEVEL = 0.3;

const AMBIENT_SILENCE = 0.001;

export type AmbientKind = "patrol" | "elevator";

export interface AmbientSource {
  id: string;
  kind: AmbientKind;
  xDist: number;
  yDist: number;
  pan: number;
  intensity?: number;
}

export function ambientAttenuation(xDist: number, yDist: number): number {
  const xn = Math.abs(xDist) / AMBIENT_X_MAX;
  const yn = Math.abs(yDist) / AMBIENT_Y_MAX;
  const d = Math.sqrt(xn * xn + yn * yn);
  if (d >= 1) return 0;
  const t = 1 - d;
  return t * t;
}

/* ------------------------ preferencje audio (localStorage) ---------------- */

export interface AudioPrefs {
  sfxEnabled: boolean;
  musicEnabled: boolean;
}

const AUDIO_PREFS_KEY = "glower-tower-audio-v1";

export function loadAudioPrefs(): AudioPrefs {
  const fallback: AudioPrefs = { sfxEnabled: true, musicEnabled: true };
  try {
    const raw = localStorage.getItem(AUDIO_PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      sfxEnabled: typeof parsed.sfxEnabled === "boolean" ? parsed.sfxEnabled : true,
      musicEnabled: typeof parsed.musicEnabled === "boolean" ? parsed.musicEnabled : true,
    };
  } catch {
    return fallback;
  }
}

export function saveAudioPrefs(prefs: AudioPrefs): void {
  try {
    localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

/* --------------------------- pomocnicze nuty ------------------------------ */
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/* ============================ HARMONIA — BEZ ZMIAN ======================== */

const MENU_CHORDS = [
  [48, 52, 55], [53, 57, 60], [48, 52, 55], [55, 59, 62],
  [48, 52, 55], [57, 60, 64], [53, 57, 60], [55, 59, 62],
];

const GAME_CHORDS = [
  [55, 59, 62, 65], [55, 59, 62, 65], [55, 59, 62, 65], [55, 59, 62, 65],
  [60, 64, 67, 70], [60, 64, 67, 70], [55, 59, 62, 65], [55, 59, 62, 65],
  [62, 66, 69, 72], [60, 64, 67, 70], [55, 59, 62, 65], [62, 66, 69, 72],
];

const MENU_BASS_PATTERNS: Array<Array<[number, number, number]>> = [
  [[0, 0, 5], [6, 7, 2], [8, 0, 3], [12, 7, 3]],
  [[0, 0, 5], [6, 7, 2], [8, 0, 3], [11, 4, 1], [12, 7, 3]],
  [[0, 0, 5], [6, 7, 2], [8, 0, 3], [12, 7, 3]],
  [[0, 0, 3], [4, 4, 2], [6, 7, 2], [8, 0, 3], [12, 12, 2], [14, 7, 2]],
];

const MENU_LEAD: Array<[number, number, number]> = [
  [0, 76, 4], [4, 79, 2], [6, 76, 2], [8, 74, 6],
  [16, 72, 10],
  [32, 76, 3], [35, 79, 3], [38, 81, 4], [44, 79, 4],
  [48, 76, 4], [52, 74, 4], [56, 72, 8],
];

const GAME_BASS_PATTERNS: Array<Array<[number, number, number]>> = [
  [[0, 0, 3], [3, 0, 3], [6, 7, 2], [8, 0, 3], [11, 10, 1], [12, 7, 4]],
  [[0, 0, 3], [3, 0, 3], [6, 7, 2], [8, 0, 2], [10, 10, 2], [12, 7, 2], [14, 5, 2]],
];

const GAME_FLUTE_A: Array<[number, number, number]> = [
  [0, 4, 3], [3, 7, 3], [6, 9, 6], [12, 7, 2], [14, 4, 2],
  [16, 4, 2], [18, 2, 2], [20, 0, 8],
  [32, 7, 3], [35, 9, 3], [38, 12, 6], [44, 9, 2], [46, 7, 2],
  [48, 4, 6], [56, 2, 2], [58, 0, 6],
];
const GAME_FLUTE_B: Array<[number, number, number]> = [
  [0, 12, 3], [3, 9, 3], [6, 7, 4], [12, 4, 4],
  [16, 2, 2], [18, 4, 2], [20, 7, 8],
  [32, 9, 3], [35, 7, 3], [38, 4, 6], [44, 2, 2], [46, 0, 2],
  [48, -3, 4], [52, 0, 4], [56, 2, 8],
];

/* ============================ POZIOMY ===================================== */

export const SFX_BUS_LEVEL = 0.9;
export const MUSIC_BUS_LEVEL = 1.0;
export const MUSIC_MENU_LEVEL = 0.46;
export const MUSIC_GAME_LEVEL = 0.46;
export const MASTER_HEADROOM = 0.7;

export const GLOBAL_BOOST = 2.2;
export const MASTER_LEVEL = MASTER_HEADROOM * GLOBAL_BOOST;

/* ------------------------- SUMA: filtry / clipper / limiter --------------- */

export const SUM_HPF_HZ = 25;
export const SUM_LPF_HZ = 20000;

const BUTTERWORTH_Q1 = 0.54119610;
const BUTTERWORTH_Q2 = 1.30656296;

const CLIP_KNEE = 0.85;
const CLIP_CEILING = 1.0;
/** FIX CPU: oversampling 2x przepuszczał CAŁY miks przez waveshapera przy
 *  podwójnym sample rate (stały podatek na wątku audio). Clipper to tylko
 *  siatka bezpieczeństwa przed limiterem — wersja bez oversamplingu łapie
 *  peaki tak samo, a na transjentach różnicy nie słychać. */
const CLIP_OVERSAMPLE: OverSampleType = "none";

export const LIMITER_THRESHOLD_DB = -1.0;
const LIMITER_KNEE_DB = 4;
const LIMITER_ATTACK = 0.003;
const LIMITER_RELEASE = 0.16;

const SFX_GAIN = {
  JUMP: 0.06,
  SUPERJUMP_TONE: 0.2,
  SUPERJUMP_SQUARE: 0.06,
  LAND_BODY: 0.32,
  LAND_WOOD_TAP: 0.2,
  LAND_WOOD_TONE: 0.09,
  LAND_JELLY: 0.11,
  LAND_ECHO: 0.1,
  COIN_TONE_A: 0.1,
  COIN_TONE_B: 0.05,
  COIN_OCT_A: 0.025,
  COIN_OCT_B: 0.02,
  CHECKPOINT: 0.1,
  GAMEOVER_TONE: 0.06,
  GAMEOVER_NOISE: 0.04,
  WIN_TONE: 0.04,
  WIN_OCTAVE: 0.03,
  BONK_STICK: 0.28,
  BONK_BODY_LOW: 0.34,
  BONK_BODY_TRIANGLE: 0.12,
  BONK_BODY_TAP: 0.16,
  LEVER_BANDPASS: 0.18,
  LEVER_SQUARE: 0.08,
  LEVER_THUNK: 0.16,
  LEVER_TAP: 0.08,
  SLIDE_PEAK: 0.2,
  SLIDE_RUMBLE: 2.2,
  SLIDE_SUB: 2.6,
  SLIDE_BAND_LEVELS: [1.4, 0.9, 0.35],
  BALL_TONE: 0.3,
  BALL_METAL: 0.4,
  BALL_SHIMMER: 0.18,
} as const;

const MUSIC_GAIN = {
  MENU_BASS: 0.1,
  MENU_ARP: 0.05,
  MENU_BELL: 0.04,
  MENU_KICK: 0.1,
  MENU_RIM: 0.05,
  MENU_HAT: 0.012,
  MENU_OPENHAT: 0.018,
  MENU_SKANK: 0.03,
  MENU_ECHO: 0.32,
  MENU_LEAD: 0.045,
  GAME_BASS: 0.08,
  GAME_HIHAT: 0.02,
  GAME_OPENHAT: 0.02,
  GAME_CLAP: 0.03,
  GAME_SNARE: 0.035,
  GAME_KICK: 0.1,
  GAME_MARIMBA: 0.035,
  GAME_FLUTE: 0.035,
} as const;

/* ====================== PARAMETRY BUFOROWANIA ============================= */

/** FIX CPU: 1.0 s lookaheadu = ~8 kroków × ~6 nut = ~50 nodów tworzonych co
 *  pompę na głównym wątku. 0.55 s to wciąż 4× większy margines niż pierwotne
 *  0.25 s i nadal całkowicie odporny na zatory — a alokacji o połowę mniej. */
export const LOOKAHEAD = 0.55;
export const PUMP_INTERVAL = 100;
export const LATENCY_HINT = 0.09;

export const MAX_SFX_SOURCES = 56;
export const MAX_AMBIENT_VOICES = 6;
export const AMBIENT_UPDATE_MS = 80;
/** Minimalny czas ciszy, po którym ZAPARKOWANY głos może zostać usunięty
 *  w ramach LRU nadmiaru. Pętle w zasięgu gry NIE są już niszczone przy
 *  przekroczeniu granicy słyszalności — tylko wyciszane. */
export const AMBIENT_PARK_MS = 300;

const SFX_LEAD = 0.012;
const STEAL_FADE = 0.014;

/* --------------------- ODBIJAJĄCA SIĘ PIŁKA: budżet ----------------------- */

const BALL_MIN_INTERVAL_MS = 80;
const BALL_BYPASS_RATIO = 1.7;
const BALL_BYPASS_MIN_MS = 28;
const BALL_PANNER_POOL = 4;
const BALL_NEAR_RATIO = 0.45;

/** Ile wariantów próbki wypalamy (zamiast losowania patcha na żywo). */
export const BALL_NEAR_VARIANTS = 3;
export const BALL_FAR_VARIANTS = 2;
/** Mikro-rozstrojenie przy odtwarzaniu — kosztuje 0 CPU, łamie powtarzalność. */
const BALL_RATE_JITTER = 0.03;

/* --------------------- ZESKOK / LĄDOWANIE: warianty ----------------------- */

/**
 * FIX CPU: playLand to był NAJCIĘŻSZY jednorazowy efekt — ~19 węzłów
 * (4 tony + 3 hiss + galaretka z wibrato) przy każdym zdarzeniu, a debounce
 * 45 ms pozwalał na dziesiątki zdarzeń przy szybkim schodzeniu po schodkach.
 *
 * `impact` (0.15–1.6) skaluje wysokość i amplitudę w sposób ciągły, więc
 * wypalamy 4 warianty rozłożone w całym zakresie i dobieramy najbliższy.
 * Amplituda nadal jest zadawana na żywo (gain = 0.4 + 0.6·min(1, impact)).
 * Przy 4 wariantach maksymalny błąd wysokości to ~3% — niesłyszalne.
 */
export const LAND_VARIANTS = [0.2, 0.7, 1.1, 1.5] as const;

const STEPS_PER_LOOP = 64;
const TRACK_SWITCH_FADE = 0.12;
const TRACK_STOP_FADE = 0.35;
const WATCHDOG_MS = 500;
const IOS_PLAYBACK_SESSION = true;

const IS_MOBILE =
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

/* ============================================================================
 *  PRYMITYWY SYNTEZY (wspólne dla renderu OFFLINE i grania NA ŻYWO)
 *  Identyczne obwiednie i wartości jak w dotychczasowym silniku.
 * ==========================================================================*/

type SynthTone = {
  type: OscillatorType;
  from: number;
  to?: number;
  at: number;
  dur: number;
  gain: number;
  attack?: number;
  detune?: number;
};

type SynthHiss = {
  at: number;
  dur: number;
  gain: number;
  type: BiquadFilterType;
  freq: number;
  q?: number;
  attack?: number;
};

function synthTone(
  ctx: BaseAudioContext,
  dest: AudioNode,
  o: SynthTone,
): { src: OscillatorNode; env: GainNode } {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type;
  if (o.detune) osc.detune.value = o.detune;
  osc.frequency.setValueAtTime(o.from, o.at);
  if (o.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), o.at + o.dur);
  }
  const attack = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, o.at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, o.gain), o.at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);
  g.gain.linearRampToValueAtTime(0, o.at + o.dur + 0.006);
  osc.connect(g);
  g.connect(dest);
  osc.start(o.at);
  osc.stop(o.at + o.dur + 0.02);
  return { src: osc, env: g };
}

function synthHiss(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  o: SynthHiss,
): { src: AudioBufferSourceNode; env: GainNode; filter: BiquadFilterNode } {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = o.type;
  filter.frequency.value = o.freq;
  filter.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  const attack = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, o.at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, o.gain), o.at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);
  g.gain.linearRampToValueAtTime(0, o.at + o.dur + 0.006);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(o.at);
  src.stop(o.at + o.dur + 0.02);
  return { src, env: g, filter };
}

function makeNoiseBuffer(ctx: BaseAudioContext, seconds = 0.5): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/* ============================================================================
 *  DEFINICJE PRÓBEK WYPALANYCH OFFLINE
 *  Każdy `build` to DOKŁADNIE ten sam patch, który wcześniej powstawał na żywo.
 * ==========================================================================*/

type BakedName =
  | "jump" | "superJump" | "bonk" | "lever" | "coin" | "checkpoint"
  | `ballNear${number}` | `ballFar${number}`
  | `land${number}`;

interface BakeSpec {
  name: BakedName;
  dur: number;
  build: (ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer) => void;
}

/**
 * PUSTA BLASZANA KULA O DREWNIANY PODEST — patch bez zmian.
 *  1) transient blachy: wąskie pasmo szumu ~2600 Hz (uderzenie metalu o deskę),
 *  2) drewniane ciało: sinus 205→140 Hz (rezonans podestu, krótki „tok”),
 *  3) dzwon pustej kuli: inharmoniczne partiale 1180 / 1560 / 2340 Hz.
 *
 * `v` = dawny `0.94 + Math.random() * 0.12` — teraz stały per wariant.
 * `near` = dawny LOD (bliska piłka ma pełne 3 partiale, daleka jeden).
 */
function buildBall(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  v: number,
  near: boolean,
) {
  const t = 0;
  const amp = 1; // amplituda zadawana przy odtwarzaniu (gain nody)
  synthHiss(ctx, dest, noise, {
    at: t, dur: 0.02, gain: SFX_GAIN.BALL_METAL * amp,
    type: "bandpass", freq: 2600 * v, q: 1.2, attack: 0.002,
  });
  synthTone(ctx, dest, {
    type: "sine", from: 205 * v, to: 140, at: t, dur: 0.09,
    gain: SFX_GAIN.BALL_TONE * amp, attack: 0.002,
  });
  const ring: Array<[number, number, number]> = near
    ? [
        [1180, 0.28, SFX_GAIN.BALL_SHIMMER],
        [1560, 0.20, SFX_GAIN.BALL_SHIMMER * 0.77],
        [2340, 0.13, SFX_GAIN.BALL_SHIMMER * 0.67],
      ]
    : [
        [1180, 0.18, SFX_GAIN.BALL_SHIMMER * 0.8],
      ];
  for (const [freq, dur, gain] of ring) {
    synthTone(ctx, dest, {
      type: "sine", from: freq * v, at: t + 0.003, dur,
      gain: gain * amp, attack: 0.0015,
    });
  }
}

/**
 * LĄDOWANIE — patch 1:1 z wersji na żywo:
 *   1) masa gluta: sine 140·tone_ → 44 Hz,
 *   2) drewniana deska: bandpass 300·tone_ + 1250·tone_ + triangle,
 *   3) mokra galaretka: triangle 84·tone_ → 56 Hz z wibrato 8.2 Hz,
 *   4) echo deski: sine 104 → 48 Hz.
 * Amplituda = 1 przy wypalaniu; prawdziwe `amp` zadajemy gainem przy graniu.
 */
function buildLand(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  v: number,
) {
  const t = 0;
  const tone_ = 1 - 0.12 * v;
  const amp = 1;

  synthTone(ctx, dest, { type: "sine", from: 140 * tone_, to: 44, at: t, dur: 0.19, gain: SFX_GAIN.LAND_BODY * amp, attack: 0.003 });
  synthHiss(ctx, dest, noise, { at: t, dur: 0.055, gain: SFX_GAIN.LAND_WOOD_TAP * amp, type: "bandpass", freq: 300 * tone_, q: 1.4 });
  synthHiss(ctx, dest, noise, { at: t, dur: 0.03, gain: SFX_GAIN.LAND_WOOD_TONE * amp, type: "bandpass", freq: 1250 * tone_, q: 2.2 });
  synthTone(ctx, dest, { type: "triangle", from: 190 * tone_, to: 120, at: t + 0.012, dur: 0.07, gain: SFX_GAIN.LAND_WOOD_TONE * amp });

  // Mokra galaretka z wibrato — identyczny podgraf jak w wersji na żywo.
  const squish = ctx.createOscillator();
  const squishGain = ctx.createGain();
  const vibrato = ctx.createOscillator();
  const vibratoGain = ctx.createGain();
  squish.type = "triangle";
  squish.frequency.setValueAtTime(84 * tone_, t + 0.01);
  squish.frequency.exponentialRampToValueAtTime(56, t + 0.22);
  vibrato.frequency.value = 8.2;
  vibratoGain.gain.value = 22;
  vibrato.connect(vibratoGain);
  vibratoGain.connect(squish.frequency);
  squishGain.gain.setValueAtTime(0.0001, t + 0.01);
  squishGain.gain.exponentialRampToValueAtTime(SFX_GAIN.LAND_JELLY * amp, t + 0.03);
  squishGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  squishGain.gain.linearRampToValueAtTime(0, t + 0.25);
  squish.connect(squishGain);
  squishGain.connect(dest);
  squish.start(t + 0.01);
  vibrato.start(t + 0.01);
  squish.stop(t + 0.26);
  vibrato.stop(t + 0.26);

  synthTone(ctx, dest, { type: "sine", from: 104, to: 48, at: t + 0.055, dur: 0.1, gain: SFX_GAIN.LAND_ECHO * amp });
}

function buildBakeSpecs(): BakeSpec[] {
  const specs: BakeSpec[] = [];

  // ── piłka: warianty bliskie i dalekie ──
  // Wartości `v` rozłożone równomiernie w dawnym zakresie losowania.
  for (let i = 0; i < BALL_NEAR_VARIANTS; i++) {
    const v = 0.94 + (0.12 * (i + 0.5)) / BALL_NEAR_VARIANTS;
    specs.push({
      name: `ballNear${i}` as BakedName,
      dur: 0.34,
      build: (ctx, dest, noise) => buildBall(ctx, dest, noise, v, true),
    });
  }
  for (let i = 0; i < BALL_FAR_VARIANTS; i++) {
    const v = 0.94 + (0.12 * (i + 0.5)) / BALL_FAR_VARIANTS;
    specs.push({
      name: `ballFar${i}` as BakedName,
      dur: 0.24,
      build: (ctx, dest, noise) => buildBall(ctx, dest, noise, v, false),
    });
  }

  // ── lądowanie: 4 warianty siły uderzenia ──
  LAND_VARIANTS.forEach((v, i) => {
    specs.push({
      name: `land${i}` as BakedName,
      dur: 0.36,
      build: (ctx, dest, noise) => buildLand(ctx, dest, noise, v),
    });
  });

  // ── bonk: kij w dno blaszanego garnka (10 węzłów → 2) ──
  specs.push({
    name: "bonk",
    dur: 0.42,
    build: (ctx, dest, noise) => {
      const t = 0;
      synthHiss(ctx, dest, noise, { at: t, dur: 0.018, gain: SFX_GAIN.BONK_STICK, type: "bandpass", freq: 2400, q: 1.1 });
      synthHiss(ctx, dest, noise, { at: t, dur: 0.04, gain: SFX_GAIN.BONK_BODY_TAP, type: "lowpass", freq: 380 });
      synthTone(ctx, dest, { type: "sine", from: 118, to: 78, at: t, dur: 0.22, gain: SFX_GAIN.BONK_BODY_LOW, attack: 0.002 });
      synthTone(ctx, dest, { type: "triangle", from: 92, to: 70, at: t, dur: 0.16, gain: SFX_GAIN.BONK_BODY_TRIANGLE, attack: 0.002 });
      const partials: Array<[number, number, number]> = [
        [186, 0.11, 0.28], [194, 0.07, 0.32], [312, 0.09, 0.22],
        [478, 0.06, 0.16], [741, 0.035, 0.12], [1124, 0.02, 0.09],
      ];
      for (const [freq, gain, dur] of partials) {
        synthTone(ctx, dest, { type: "sine", from: freq, at: t + 0.004, dur, gain, attack: 0.0015 });
      }
    },
  });

  // ── dźwignia ──
  specs.push({
    name: "lever",
    dur: 0.18,
    build: (ctx, dest, noise) => {
      const t = 0;
      synthHiss(ctx, dest, noise, { at: t, dur: 0.035, gain: SFX_GAIN.LEVER_BANDPASS, type: "bandpass", freq: 980, q: 1.3 });
      synthTone(ctx, dest, { type: "square", from: 420, to: 210, at: t, dur: 0.07, gain: SFX_GAIN.LEVER_SQUARE, attack: 0.001 });
      synthTone(ctx, dest, { type: "sine", from: 96, to: 62, at: t + 0.012, dur: 0.1, gain: SFX_GAIN.LEVER_THUNK, attack: 0.002 });
      synthHiss(ctx, dest, noise, { at: t + 0.03, dur: 0.025, gain: SFX_GAIN.LEVER_TAP, type: "highpass", freq: 3500 });
    },
  });

  // ── skok / super-skok ──
  specs.push({
    name: "jump",
    dur: 0.17,
    build: (ctx, dest) => {
      synthTone(ctx, dest, { type: "square", from: 140, to: 440, at: 0, dur: 0.12, gain: SFX_GAIN.JUMP });
    },
  });
  specs.push({
    name: "superJump",
    dur: 0.30,
    build: (ctx, dest) => {
      synthTone(ctx, dest, { type: "triangle", from: 220, to: 880, at: 0, dur: 0.25, gain: SFX_GAIN.SUPERJUMP_TONE });
      synthTone(ctx, dest, { type: "square", from: 110, to: 440, at: 0, dur: 0.22, gain: SFX_GAIN.SUPERJUMP_SQUARE });
    },
  });

  // ── moneta / checkpoint ──
  specs.push({
    name: "coin",
    dur: 0.32,
    build: (ctx, dest) => {
      const t = 0;
      synthTone(ctx, dest, { type: "sine", from: 987.77, at: t, dur: 0.1, gain: SFX_GAIN.COIN_TONE_A });
      synthTone(ctx, dest, { type: "sine", from: 1318.51, at: t + 0.08, dur: 0.2, gain: SFX_GAIN.COIN_TONE_B });
      synthTone(ctx, dest, { type: "sine", from: 1975.53, at: t, dur: 0.1, gain: SFX_GAIN.COIN_OCT_A });
      synthTone(ctx, dest, { type: "sine", from: 2637.02, at: t + 0.08, dur: 0.2, gain: SFX_GAIN.COIN_OCT_B });
    },
  });
  specs.push({
    name: "checkpoint",
    dur: 0.45,
    build: (ctx, dest) => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        synthTone(ctx, dest, { type: "triangle", from: f, at: i * 0.07, dur: 0.2, gain: SFX_GAIN.CHECKPOINT }),
      );
    },
  });

  return specs;
}

/* ========================================================================== */

interface MusicVoice {
  track: MusicTrack;
  gain: GainNode;
  sources: Set<AudioScheduledSourceNode>;
  stopTicker: (() => void) | null;
  step: number;
  nextTime: number;
  stepDur: number;
  loopSteps: number;
}

interface AmbientVoice {
  kind: AmbientKind;
  gain: GainNode;
  panner: StereoPannerNode | null;
  active: boolean;
  sources: AudioScheduledSourceNode[];
  runNodes: AudioNode[];
  idleSince: number;
  start: () => void;
  stop: () => void;
}

interface BallHit {
  amp: number;
  pan: number;
}

type ToneOpts = SynthTone & { voice?: MusicVoice; dest?: AudioNode | null };
type HissOpts = SynthHiss & { voice?: MusicVoice; dest?: AudioNode | null };

function createTicker(intervalMs: number, cb: () => void): () => void {
  try {
    const src = `let id=null;onmessage=(e)=>{if(e.data>0){clearInterval(id);id=setInterval(()=>postMessage(0),e.data);}else{clearInterval(id);id=null;}};`;
    const url = URL.createObjectURL(new Blob([src], { type: "application/javascript" }));
    const worker = new Worker(url);
    worker.onmessage = () => cb();
    worker.postMessage(intervalMs);
    return () => {
      try { worker.postMessage(0); worker.terminate(); } catch {}
      try { URL.revokeObjectURL(url); } catch {}
    };
  } catch {
    const id = window.setInterval(cb, intervalMs);
    return () => window.clearInterval(id);
  }
}

function makeCurve(n: number, fn: (x: number) => number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = fn(x);
  }
  return curve;
}

function holdParam(param: AudioParam, t: number) {
  const p = param as AudioParam & { cancelAndHoldAtTime?: (t: number) => void };
  if (typeof p.cancelAndHoldAtTime === "function") {
    try { p.cancelAndHoldAtTime(t); return; } catch {}
  }
  const current = param.value;
  try {
    param.cancelScheduledValues(t);
    param.setValueAtTime(current, t);
  } catch {}
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private clipCurve: Float32Array<ArrayBuffer> | null = null;
  private slideCurve: Float32Array<ArrayBuffer> | null = null;

  /** Wypalone próbki — klucz → gotowy AudioBuffer. */
  private baked = new Map<BakedName, AudioBuffer>();
  private bakePromise: Promise<void> | null = null;
  private bakeDone = false;

  private unlocked = false;
  private stalled = false;
  private watchdog: number | null = null;

  private muted = true;
  private sfxEnabled = true;
  private musicEnabled = true;
  private pageHidden = false;

  private desiredTrack: MusicTrack | null = null;
  private voice: MusicVoice | null = null;

  private lastLandAt = 0;
  private lastBonkAt = 0;
  private slideStop: (() => void) | null = null;
  private ambient = new Map<string, AmbientVoice>();

  private lastBallAt = 0;
  private lastBallAmp = 0;
  private ballQueued: BallHit | null = null;
  private ballPanners: StereoPannerNode[] = [];
  private ballPannerIdx = 0;
  private ballVariantIdx = 0;

  private sfxSources = new Map<AudioScheduledSourceNode, () => void>();
  private lastAmbientUpdate = 0;
  private stats = {
    sfx: 0, ambient: 0, ambientActive: 0, stolen: 0,
    missedSteps: 0, ballDropped: 0, bakedHits: 0, liveHits: 0,
  };

  public getStats() {
    let active = 0;
    for (const v of this.ambient.values()) if (v.active) active++;
    return {
      ...this.stats,
      sfx: this.sfxSources.size,
      ambient: this.ambient.size,
      ambientActive: active,
      baked: this.baked.size,
      bakeDone: this.bakeDone,
      slideBaked: this.slideBaked.size,
    };
  }
  public getAnalyser(): AnalyserNode | null { return this.analyser; }
  public isBaked(): boolean { return this.bakeDone; }

  private getClipCurve(): Float32Array<ArrayBuffer> {
    if (!this.clipCurve) {
      const k = CLIP_KNEE;
      const c = CLIP_CEILING;
      this.clipCurve = makeCurve(8192, (x) => {
        const ax = Math.abs(x);
        if (ax <= k) return x;
        const over = (ax - k) / (c - k);
        const y = k + (c - k) * Math.tanh(over);
        return Math.sign(x) * y;
      });
    }
    return this.clipCurve;
  }

  private getSlideCurve(): Float32Array<ArrayBuffer> {
    if (!this.slideCurve) {
      this.slideCurve = makeCurve(
        1024,
        (x) => Math.tanh(x * 4) * 0.85 + Math.sign(x) * Math.abs(x) ** 3 * 0.15,
      );
    }
    return this.slideCurve;
  }

  private buildGraph(): AudioContext | null {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    let ctx: AudioContext;
    try {
      ctx = new AudioCtx({ latencyHint: IS_MOBILE ? "playback" : LATENCY_HINT });
    } catch {
      try { ctx = new AudioCtx(); } catch { return null; }
    }

    const sfx = ctx.createGain();
    sfx.gain.value = this.sfxEnabled ? SFX_BUS_LEVEL : 0;
    const music = ctx.createGain();
    music.gain.value = this.musicEnabled ? MUSIC_BUS_LEVEL : 0;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : MASTER_LEVEL;

    const hp1 = ctx.createBiquadFilter();
    hp1.type = "highpass";
    hp1.frequency.value = SUM_HPF_HZ;
    hp1.Q.value = BUTTERWORTH_Q1;

    const hp2 = ctx.createBiquadFilter();
    hp2.type = "highpass";
    hp2.frequency.value = SUM_HPF_HZ;
    hp2.Q.value = BUTTERWORTH_Q2;

    const lpHz = Math.min(SUM_LPF_HZ, ctx.sampleRate * 0.45);
    const useLp = lpHz < ctx.sampleRate * 0.42;

    const clipper = ctx.createWaveShaper();
    clipper.curve = this.getClipCurve();
    clipper.oversample = CLIP_OVERSAMPLE;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = LIMITER_THRESHOLD_DB;
    limiter.knee.value = LIMITER_KNEE_DB;
    limiter.ratio.value = 20;
    limiter.attack.value = LIMITER_ATTACK;
    limiter.release.value = LIMITER_RELEASE;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;

    sfx.connect(master);
    music.connect(master);

    const chain: AudioNode[] = [master, hp1, hp2];
    if (useLp) {
      const lp1 = ctx.createBiquadFilter();
      lp1.type = "lowpass";
      lp1.frequency.value = lpHz;
      lp1.Q.value = BUTTERWORTH_Q1;
      const lp2 = ctx.createBiquadFilter();
      lp2.type = "lowpass";
      lp2.frequency.value = lpHz;
      lp2.Q.value = BUTTERWORTH_Q2;
      chain.push(lp1, lp2);
    }
    chain.push(clipper, limiter);

    for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);
    limiter.connect(ctx.destination);
    limiter.connect(analyser);

    this.ctx = ctx;
    this.master = master;
    this.sfxBus = sfx;
    this.musicBus = music;
    this.analyser = analyser;
    this.noiseBuf = null;
    this.unlocked = false;

    this.ballPanners = [];
    this.ballPannerIdx = 0;
    this.ballQueued = null;
    this.lastBallAmp = 0;

    // Próbki są związane z sampleRate kontekstu — wypalamy od nowa.
    this.baked.clear();
    this.bakePromise = null;
    this.bakeDone = false;
    this.slideBaked.clear();
    this.slideBaking.clear();

    this.noise();
    return ctx;
  }

  /* ------------------------- WYPALANIE PRÓBEK ---------------------------- */

  /**
   * Render offline: ten sam patch, ale liczony raz, poza wątkiem audio.
   * Wynik trafia do AudioBuffer, więc w grze zostaje sam odczyt pamięci.
   */
  private async bakeAll(): Promise<void> {
    if (this.bakeDone) return;
    if (this.bakePromise) return this.bakePromise;
    const ctx = this.ctx;
    if (!ctx) return;

    const OfflineCtx =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!OfflineCtx) {
      // Brak OfflineAudioContext → zostajemy na syntezie na żywo.
      this.bakeDone = false;
      return;
    }

    const sampleRate = ctx.sampleRate;
    const specs = buildBakeSpecs();

    this.bakePromise = (async () => {
      for (const spec of specs) {
        try {
          const frames = Math.max(1, Math.ceil((spec.dur + 0.05) * sampleRate));
          const off = new OfflineCtx(1, frames, sampleRate);
          const noise = makeNoiseBuffer(off, 0.5);
          const out = off.createGain();
          out.gain.value = 1;
          out.connect(off.destination);
          spec.build(off, out, noise);
          const rendered = await off.startRendering();
          this.baked.set(spec.name, rendered);
        } catch {
          // Pojedyncza próbka się nie udała — ten efekt poleci na żywo.
        }
      }
      this.bakeDone = this.baked.size > 0;
    })();

    return this.bakePromise;
  }

  /**
   * Odtworzenie wypalonej próbki: BufferSource → Gain → dest.
   * To jest CAŁY koszt efektu — dwa węzły i jedna obwiednia.
   */
  private playBaked(
    name: BakedName,
    gain: number,
    dest?: AudioNode | null,
    rate = 1,
    at?: number,
  ): boolean {
    const ctx = this.ctx;
    const buf = this.baked.get(name);
    const target = dest ?? this.sfxBus;
    if (!ctx || !buf || !target) return false;
    const when = Math.max(at ?? this.now(ctx), ctx.currentTime + SFX_LEAD);
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      if (rate !== 1) src.playbackRate.value = rate;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g);
      g.connect(target);
      src.start(when);
      this.budgetSfx(src, this.fadeStopper(g, [src]));
      this.retire(src, [g]);
      this.stats.bakedHits++;
      return true;
    } catch {
      return false;
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx && this.ctx.state !== "closed") return this.ctx;
    this.forgetVoice();
    return this.buildGraph();
  }

  private kick(ctx: AudioContext) {
    if (ctx.state === "running") return;
    try { void ctx.resume().catch(() => {}); } catch {}
  }

  private rebuildContext() {
    const old = this.ctx;
    this.clearAmbient();
    this.forgetVoice();
    this.sfxSources.clear();
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.analyser = null;
    this.noiseBuf = null;
    this.unlocked = false;
    this.ballPanners = [];
    this.ballPannerIdx = 0;
    this.ballQueued = null;
    this.slideBaked.clear();
    this.slideBaking.clear();
    if (old) {
      try { void old.close().catch(() => {}); } catch {}
    }
    const ctx = this.buildGraph();
    if (!ctx) return;
    this.kick(ctx);
    this.unlock();
    void this.bakeAll();
    this.syncMusic();
  }

  private armWatchdog() {
    if (this.watchdog !== null) {
      window.clearTimeout(this.watchdog);
      this.watchdog = null;
    }
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime;
    this.watchdog = window.setTimeout(() => {
      this.watchdog = null;
      if (this.muted || this.pageHidden || this.ctx !== ctx) return;
      const alive = ctx.state === "running" && ctx.currentTime > t0 + 0.05;
      if (!alive) this.stalled = true;
    }, WATCHDOG_MS);
  }

  private unlock() {
    const ctx = this.ctx;
    if (!ctx || this.unlocked) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      src.connect(ctx.destination);
      src.start(0);
      src.onended = () => { try { src.disconnect(); } catch {} };
      this.unlocked = true;
    } catch {}
    if (IOS_PLAYBACK_SESSION) {
      try {
        const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
        if (session && session.type !== "playback") session.type = "playback";
      } catch {}
    }
  }

  private noise(): AudioBuffer | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    if (!this.noiseBuf) this.noiseBuf = makeNoiseBuffer(ctx, 0.5);
    return this.noiseBuf;
  }

  private ramp(node: GainNode | null, target: number, dur: number) {
    const ctx = this.ctx;
    if (!ctx || !node) return;
    const t = ctx.currentTime;
    try {
      node.gain.cancelScheduledValues(t);
      node.gain.setValueAtTime(node.gain.value, t);
      node.gain.linearRampToValueAtTime(target, t + dur);
    } catch {
      node.gain.value = target;
    }
  }

  private sfxCtx(): AudioContext | null {
    if (this.muted || !this.sfxEnabled) return null;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return null;
    return ctx;
  }

  private now(ctx: AudioContext): number {
    return ctx.currentTime + SFX_LEAD;
  }

  private musicDest(voice: MusicVoice): AudioNode | null {
    return voice.gain ?? this.musicBus;
  }

  /* --------------------------- budżet SFX -------------------------------- */

  private fadeStopper(env: GainNode | null, srcs: AudioScheduledSourceNode[]): () => void {
    return () => {
      const ctx = this.ctx;
      if (!ctx) return;
      const t = ctx.currentTime;
      if (env) {
        try {
          holdParam(env.gain, t);
          const from = Math.max(0.0001, env.gain.value);
          env.gain.setValueAtTime(from, t);
          env.gain.linearRampToValueAtTime(0, t + STEAL_FADE);
        } catch {}
      }
      for (const s of srcs) {
        try { s.stop(t + STEAL_FADE + 0.006); } catch {}
      }
    };
  }

  private retire(src: AudioScheduledSourceNode, nodes: AudioNode[]) {
    src.onended = () => {
      try { src.disconnect(); } catch {}
      for (const n of nodes) {
        try { n.disconnect(); } catch {}
      }
      this.sfxSources.delete(src);
      this.stats.sfx = this.sfxSources.size;
    };
  }

  private budgetSfx(src: AudioScheduledSourceNode, stopper: () => void) {
    while (this.sfxSources.size >= MAX_SFX_SOURCES) {
      const first = this.sfxSources.entries().next().value as
        | [AudioScheduledSourceNode, () => void]
        | undefined;
      if (!first) break;
      const [oldSrc, oldStop] = first;
      this.sfxSources.delete(oldSrc);
      try { oldStop(); } catch {}
      this.stats.stolen++;
    }
    this.sfxSources.set(src, stopper);
    this.stats.sfx = this.sfxSources.size;
  }

  private track(
    voice: MusicVoice | undefined,
    src: AudioScheduledSourceNode,
    nodes: AudioNode[],
    env: GainNode | null,
  ) {
    if (voice) {
      voice.sources.add(src);
      const prev = src.onended;
      src.onended = (ev) => {
        voice.sources.delete(src);
        try { src.disconnect(); } catch {}
        for (const n of nodes) {
          try { n.disconnect(); } catch {}
        }
        if (typeof prev === "function") prev.call(src, ev as Event);
      };
      return;
    }
    this.budgetSfx(src, this.fadeStopper(env, [src]));
    this.retire(src, nodes);
  }

  /* ------------------------------ synteza -------------------------------- */

  private tone(o: ToneOpts) {
    const ctx = this.ctx;
    const dest = o.dest ?? (o.voice ? this.musicDest(o.voice) : this.sfxBus);
    if (!ctx || !dest) return;
    const at = Math.max(o.at, ctx.currentTime + SFX_LEAD);
    const { src, env } = synthTone(ctx, dest, { ...o, at });
    if (!o.voice) this.stats.liveHits++;
    this.track(o.voice, src, [env], env);
  }

  private hiss(o: HissOpts) {
    const ctx = this.ctx;
    const buf = this.noise();
    const dest = o.dest ?? (o.voice ? this.musicDest(o.voice) : this.sfxBus);
    if (!ctx || !buf || !dest) return;
    const at = Math.max(o.at, ctx.currentTime + SFX_LEAD);
    const { src, env, filter } = synthHiss(ctx, dest, buf, { ...o, at });
    if (!o.voice) this.stats.liveHits++;
    this.track(o.voice, src, [filter, env], env);
  }

  /* ============================== API: stan ============================== */

  public setMuted(muted: boolean) {
    if (muted === this.muted) {
      if (!muted) this.resume(true);
      return;
    }
    this.muted = muted;
    if (muted) this.clearAmbient();
    if (!muted) this.wakeInGesture();
    this.ramp(this.master, muted ? 0 : MASTER_LEVEL, 0.06);
    this.syncMusic();
  }

  private wakeInGesture() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.stalled) {
      this.stalled = false;
      this.rebuildContext();
    } else {
      this.kick(ctx);
      this.unlock();
    }
    void this.preload();
    this.armWatchdog();
  }

  public isMuted(): boolean { return this.muted; }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    if (!enabled) this.clearAmbient();
    this.ramp(this.sfxBus, enabled ? SFX_BUS_LEVEL : 0, 0.03);
  }

  public isSfxEnabled(): boolean { return this.sfxEnabled; }

  public setMusicEnabled(enabled: boolean) {
    if (enabled === this.musicEnabled) return;
    this.musicEnabled = enabled;
    this.ramp(this.musicBus, enabled ? MUSIC_BUS_LEVEL : 0, 0.08);
    this.syncMusic();
  }

  public isMusicEnabled(): boolean { return this.musicEnabled; }

  public resume(inGesture = false) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.stalled && inGesture) {
      this.stalled = false;
      this.rebuildContext();
      this.armWatchdog();
      return;
    }
    this.kick(ctx);
    if (inGesture) this.unlock();
  }

  public setPageHidden(hidden: boolean) {
    if (hidden === this.pageHidden) return;
    this.pageHidden = hidden;
    this.syncMusic();
    if (!hidden) this.resume(false);
  }

  public async preload(): Promise<void> {
    this.noise();
    this.getClipCurve();
    this.getSlideCurve();
    await this.bakeAll();
  }

  /* ======================= EFEKTY — BRZMIENIE BEZ ZMIAN ================== */

  public playJump() {
    const ctx = this.sfxCtx();
    if (!ctx) return;
    if (this.playBaked("jump", 1)) return;
    try {
      this.tone({ type: "square", from: 140, to: 440, at: this.now(ctx), dur: 0.12, gain: SFX_GAIN.JUMP });
    } catch {}
  }

  public playSuperJump() {
    const ctx = this.sfxCtx();
    if (!ctx) return;
    if (this.playBaked("superJump", 1)) return;
    try {
      const t = this.now(ctx);
      this.tone({ type: "triangle", from: 220, to: 880, at: t, dur: 0.25, gain: SFX_GAIN.SUPERJUMP_TONE });
      this.tone({ type: "square", from: 110, to: 440, at: t, dur: 0.22, gain: SFX_GAIN.SUPERJUMP_SQUARE });
    } catch {}
  }

  /**
   * Lądowanie — ścieżka WYPALONA: 4 warianty impact + gain = amp.
   * To był najcięższy jednorazowy efekt (~19 węzłów na zdarzenie) i główny
   * winowajca zmuł przy szybkim schodzeniu po schodkach.
   * Fallback na żywo zostaje dla przeglądarek bez OfflineAudioContext.
   */
  public playLand(impact = 1) {
    const ctx = this.sfxCtx();
    if (!ctx || !this.sfxBus) return;
    const nowMs = performance.now();
    if (nowMs - this.lastLandAt < 45) return;
    this.lastLandAt = nowMs;

    const v = Math.max(0.15, Math.min(1.6, impact));
    const amp = 0.4 + 0.6 * Math.min(1, v);

    // Dobierz najbliższy wypalony wariant (maks. błąd wysokości ~3%).
    if (this.baked.size > 0) {
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < LAND_VARIANTS.length; i++) {
        const d = Math.abs(LAND_VARIANTS[i] - v);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      if (this.playBaked(`land${best}` as BakedName, amp)) return;
    }

    try {
      const t = this.now(ctx);
      const tone_ = 1 - 0.12 * v;

      this.tone({ type: "sine", from: 140 * tone_, to: 44, at: t, dur: 0.19, gain: SFX_GAIN.LAND_BODY * amp, attack: 0.003 });
      this.hiss({ at: t, dur: 0.055, gain: SFX_GAIN.LAND_WOOD_TAP * amp, type: "bandpass", freq: 300 * tone_, q: 1.4 });
      this.hiss({ at: t, dur: 0.03, gain: SFX_GAIN.LAND_WOOD_TONE * amp, type: "bandpass", freq: 1250 * tone_, q: 2.2 });
      this.tone({ type: "triangle", from: 190 * tone_, to: 120, at: t + 0.012, dur: 0.07, gain: SFX_GAIN.LAND_WOOD_TONE * amp });

      const squish = ctx.createOscillator();
      const squishGain = ctx.createGain();
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      squish.type = "triangle";
      squish.frequency.setValueAtTime(84 * tone_, t + 0.01);
      squish.frequency.exponentialRampToValueAtTime(56, t + 0.22);
      vibrato.frequency.value = 8.2;
      vibratoGain.gain.value = 22;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(squish.frequency);
      squishGain.gain.setValueAtTime(0.0001, t + 0.01);
      squishGain.gain.exponentialRampToValueAtTime(SFX_GAIN.LAND_JELLY * amp, t + 0.03);
      squishGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      squishGain.gain.linearRampToValueAtTime(0, t + 0.25);
      squish.connect(squishGain);
      squishGain.connect(this.sfxBus);
      squish.start(t + 0.01);
      vibrato.start(t + 0.01);
      squish.stop(t + 0.26);
      vibrato.stop(t + 0.26);
      this.budgetSfx(squish, this.fadeStopper(squishGain, [squish, vibrato]));
      this.retire(squish, [squishGain]);
      vibrato.onended = () => {
        try { vibrato.disconnect(); } catch {}
        try { vibratoGain.disconnect(); } catch {}
      };

      this.tone({ type: "sine", from: 104, to: 48, at: t + 0.055, dur: 0.1, gain: SFX_GAIN.LAND_ECHO * amp });
    } catch {}
  }

  public playCoin() {
    const ctx = this.sfxCtx();
    if (!ctx) return;
    if (this.playBaked("coin", 1)) return;
    try {
      const t = this.now(ctx);
      this.tone({ type: "sine", from: 987.77, at: t, dur: 0.1, gain: SFX_GAIN.COIN_TONE_A });
      this.tone({ type: "sine", from: 1318.51, at: t + 0.08, dur: 0.2, gain: SFX_GAIN.COIN_TONE_B });
      this.tone({ type: "sine", from: 1975.53, at: t, dur: 0.1, gain: SFX_GAIN.COIN_OCT_A });
      this.tone({ type: "sine", from: 2637.02, at: t + 0.08, dur: 0.2, gain: SFX_GAIN.COIN_OCT_B });
    } catch {}
  }

  public playCheckpoint() {
    const ctx = this.sfxCtx();
    if (!ctx) return;
    if (this.playBaked("checkpoint", 1)) return;
    try {
      const t = this.now(ctx);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        this.tone({ type: "triangle", from: f, at: t + i * 0.07, dur: 0.2, gain: SFX_GAIN.CHECKPOINT }),
      );
    } catch {}
  }

  /** Rzadki, jednorazowy — zostaje na żywo (nie warto trzymać 0.6 s w RAM). */
  public playGameOver() {
    const ctx = this.sfxCtx();
    if (!ctx) return;
    try {
      const t = this.now(ctx);
      [300, 260, 220, 150].forEach((f, i) =>
        this.tone({ type: "sawtooth", from: f, at: t + i * 0.12, dur: 0.18, gain: SFX_GAIN.GAMEOVER_TONE }),
      );
      this.hiss({ at: t, dur: 0.35, gain: SFX_GAIN.GAMEOVER_NOISE, type: "lowpass", freq: 900 });
    } catch {}
  }

  public playWin() {
    const ctx = this.sfxCtx();
    if (!ctx) return;
    try {
      const t = this.now(ctx);
      const melody = [523.25, 659.25, 783.99, 1046.5, 880.0, 1046.5, 1318.51];
      melody.forEach((f, i) => {
        const last = i === melody.length - 1;
        this.tone({ type: "square", from: f, at: t + i * 0.11, dur: last ? 0.6 : 0.15, gain: SFX_GAIN.WIN_TONE });
        this.tone({ type: "triangle", from: f / 2, at: t + i * 0.11, dur: last ? 0.5 : 0.13, gain: SFX_GAIN.WIN_OCTAVE });
      });
    } catch {}
  }

  public playBonk() {
    const ctx = this.sfxCtx();
    if (!ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastBonkAt < 90) return;
    this.lastBonkAt = nowMs;
    if (this.playBaked("bonk", 1)) return;
    try {
      const t = this.now(ctx);
      this.hiss({ at: t, dur: 0.018, gain: SFX_GAIN.BONK_STICK, type: "bandpass", freq: 2400, q: 1.1 });
      this.hiss({ at: t, dur: 0.04, gain: SFX_GAIN.BONK_BODY_TAP, type: "lowpass", freq: 380 });
      this.tone({ type: "sine", from: 118, to: 78, at: t, dur: 0.22, gain: SFX_GAIN.BONK_BODY_LOW, attack: 0.002 });
      this.tone({ type: "triangle", from: 92, to: 70, at: t, dur: 0.16, gain: SFX_GAIN.BONK_BODY_TRIANGLE, attack: 0.002 });
      const partials: Array<[number, number, number]> = [
        [186, 0.11, 0.28], [194, 0.07, 0.32], [312, 0.09, 0.22],
        [478, 0.06, 0.16], [741, 0.035, 0.12], [1124, 0.02, 0.09],
      ];
      for (const [freq, gain, dur] of partials) {
        this.tone({ type: "sine", from: freq, at: t + 0.004, dur, gain, attack: 0.0015 });
      }
    } catch {}
  }

  public playLever() {
    const ctx = this.sfxCtx();
    if (!ctx) return;
    if (this.playBaked("lever", 1)) return;
    try {
      const t = this.now(ctx);
      this.hiss({ at: t, dur: 0.035, gain: SFX_GAIN.LEVER_BANDPASS, type: "bandpass", freq: 980, q: 1.3 });
      this.tone({ type: "square", from: 420, to: 210, at: t, dur: 0.07, gain: SFX_GAIN.LEVER_SQUARE, attack: 0.001 });
      this.tone({ type: "sine", from: 96, to: 62, at: t + 0.012, dur: 0.1, gain: SFX_GAIN.LEVER_THUNK, attack: 0.002 });
      this.hiss({ at: t + 0.03, dur: 0.025, gain: SFX_GAIN.LEVER_TAP, type: "highpass", freq: 3500 });
    } catch {}
  }

  /**
   * Podgraf slajdu — DOKŁADNIE ten sam patch co wcześniej (waveshaper 2x,
   * AM z szumu 0.02, 4 pasma z dryftem, rumble 0.1, sub 0.04, HP 22 Hz).
   * Peak = SLIDE_PEAK; tłumienie odległością (atten) zadaje węzeł na zewnątrz.
   * Używany i przez render offline, i przez ścieżkę live.
   */
  private buildSlideGraph(
    ctx: BaseAudioContext,
    out: AudioNode,
    buf: AudioBuffer,
    t: number,
    dur: number,
  ): { sources: AudioScheduledSourceNode[]; nodes: AudioNode[]; env: GainNode } {
    const sources: AudioScheduledSourceNode[] = [];
    const nodes: AudioNode[] = [];

    const attack = 0.03;
    const release = Math.min(0.12, dur * 0.16);
    const peak = SFX_GAIN.SLIDE_PEAK;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + attack);
    env.gain.setValueAtTime(peak, t + Math.max(attack, dur - release));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.gain.linearRampToValueAtTime(0, t + dur + 0.01);
    env.connect(out);
    nodes.push(env);

    const amDepth = ctx.createGain();
    amDepth.gain.value = 0.85;
    const amOffset = ctx.createConstantSource();
    amOffset.offset.value = 0.5;
    const amNoise = ctx.createBufferSource();
    amNoise.buffer = buf;
    amNoise.loop = true;
    amNoise.playbackRate.value = 0.02;
    const amLp = ctx.createBiquadFilter();
    amLp.type = "lowpass";
    amLp.frequency.value = 55;
    amNoise.connect(amLp);
    amLp.connect(amDepth);
    nodes.push(amDepth, amLp);

    const amGain = ctx.createGain();
    amGain.gain.value = 0;
    amOffset.connect(amGain.gain);
    amDepth.connect(amGain.gain);
    nodes.push(amGain);
    sources.push(amNoise, amOffset);

    const shaper = ctx.createWaveShaper();
    shaper.curve = this.getSlideCurve();
    shaper.oversample = "2x";
    nodes.push(shaper);

    const grind = ctx.createBufferSource();
    grind.buffer = buf;
    grind.loop = true;
    grind.playbackRate.value = 0.28;
    grind.connect(shaper);
    sources.push(grind);

    const dark = ctx.createBiquadFilter();
    dark.type = "lowpass";
    dark.frequency.value = 700;
    dark.Q.value = 0.4;
    shaper.connect(dark);
    nodes.push(dark);

    const bands: Array<[number, number, number]> = [
      [70, 0.9, SFX_GAIN.SLIDE_BAND_LEVELS[0]],
      [130, 1.0, SFX_GAIN.SLIDE_BAND_LEVELS[1]],
      [260, 1.3, SFX_GAIN.SLIDE_BAND_LEVELS[2]],
      [520, 1.8, 0.16],
    ];
    for (const [freq, q, level] of bands) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(freq, t);
      bp.frequency.exponentialRampToValueAtTime(freq * 0.78, t + dur);
      bp.Q.value = q;
      const bg = ctx.createGain();
      bg.gain.value = level;
      dark.connect(bp);
      bp.connect(bg);
      bg.connect(amGain);
      nodes.push(bp, bg);
    }

    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = buf;
    rumbleSrc.loop = true;
    rumbleSrc.playbackRate.value = 0.1;
    const rumbleLp = ctx.createBiquadFilter();
    rumbleLp.type = "lowpass";
    rumbleLp.frequency.value = 80;
    rumbleLp.Q.value = 0.7;
    const rumbleG = ctx.createGain();
    rumbleG.gain.value = SFX_GAIN.SLIDE_RUMBLE;
    rumbleSrc.connect(rumbleLp);
    rumbleLp.connect(rumbleG);
    rumbleG.connect(amGain);
    sources.push(rumbleSrc);
    nodes.push(rumbleLp, rumbleG);

    const subSrc = ctx.createBufferSource();
    subSrc.buffer = buf;
    subSrc.loop = true;
    subSrc.playbackRate.value = 0.04;
    const subLp = ctx.createBiquadFilter();
    subLp.type = "lowpass";
    subLp.frequency.value = 45;
    subLp.Q.value = 0.9;
    const subG = ctx.createGain();
    subG.gain.value = SFX_GAIN.SLIDE_SUB;
    subSrc.connect(subLp);
    subLp.connect(subG);
    subG.connect(env);
    sources.push(subSrc);
    nodes.push(subLp, subG);

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 22;
    amGain.disconnect();
    amGain.connect(hp);
    hp.connect(env);
    nodes.push(hp);

    return { sources, nodes, env };
  }

  /**
   * FIX CPU (najdroższy patch w silniku): w grze ~27 węzłów na KAŻDY ruch
   * schodka, w tym WaveShaper z oversamplingiem 2× (przetwarzanie strumienia
   * przy podwójnym sample rate) i dwa źródła szumu resampłowane 50×/25×
   * wolniej (playbackRate 0.02 / 0.04).
   *
   * Czas trwania jest znany w momencie wywołania (w grze: 0.7 s dźwignia,
   * 1.0 s zapadnia), więc cały patch renderujemy OFFLINE raz na czas
   * trwania (bucket 0.05 s). W tle gry zostaje BufferSource + Gain.
   */
  private slideBaked = new Map<number, AudioBuffer>();
  private slideBaking = new Set<number>();

  private async bakeSlide(dur: number) {
    const ctx = this.ctx;
    if (!ctx || this.slideBaked.has(dur) || this.slideBaking.has(dur)) return;
    this.slideBaking.add(dur);
    try {
      const OfflineCtx =
        window.OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
          .webkitOfflineAudioContext;
      if (!OfflineCtx) return;
      const sr = ctx.sampleRate;
      const frames = Math.max(1, Math.ceil((dur + 0.12) * sr));
      const off = new OfflineCtx(1, frames, sr);
      const noise = makeNoiseBuffer(off, 0.5);
      const out = off.createGain();
      out.gain.value = 1;
      out.connect(off.destination);
      const { sources } = this.buildSlideGraph(off, out, noise, 0, dur);
      for (const s of sources) {
        try { s.start(0); s.stop(dur + 0.1); } catch {}
      }
      const rendered = await off.startRendering();
      if (this.ctx === ctx) {
        this.slideBaked.set(dur, rendered);
        if (this.slideBaked.size > 8) {
          const oldest = this.slideBaked.keys().next().value;
          if (oldest !== undefined) this.slideBaked.delete(oldest);
        }
      }
    } catch {} finally {
      this.slideBaking.delete(dur);
    }
  }

  /**
   * Wysuwanie/chowanie schodka.
   *   po 1. ruchu:   BufferSource (wypalony) → Gain(atten) → panner → SFX
   *   przy 1. ruchu: oryginalny graf live + start renderu w tle.
   */
  public playStairSlide(xDist: number, yDist: number, pan: number, duration = 1) {
    const ctx = this.sfxCtx();
    const buf = this.noise();
    if (!ctx || !buf || !this.sfxBus) return;
    const atten = ambientAttenuation(xDist, yDist);
    if (atten <= 0) return;
    if (SFX_GAIN.SLIDE_PEAK * atten < AMBIENT_SILENCE) return;
    const dur = Math.max(0.12, duration);
    const key = Math.round(dur * 20) / 20; // bucket 0.05 s

    // ── ścieżka tania: wypalony bufor ──
    const baked = this.slideBaked.get(key);
    if (baked) {
      this.slideStop?.();
      const t = this.now(ctx);
      const panNode =
        typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
      let panTarget: AudioNode = this.sfxBus;
      const nodes: AudioNode[] = [];
      if (panNode) {
        panNode.pan.value = Math.max(-1, Math.min(1, pan));
        panNode.connect(this.sfxBus);
        panTarget = panNode;
        nodes.push(panNode);
      }
      const g = ctx.createGain();
      g.gain.value = atten; // tłumienie odległością — jedyny parametr na żywo
      g.connect(panTarget);
      nodes.push(g);

      const src = ctx.createBufferSource();
      src.buffer = baked;
      src.connect(g);
      src.start(t);
      src.stop(t + baked.duration + 0.02);

      const stop = () => {
        const nowT = this.ctx?.currentTime ?? t;
        try {
          holdParam(g.gain, nowT);
          g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), nowT);
          g.gain.linearRampToValueAtTime(0, nowT + 0.06);
        } catch {}
        try { src.stop(nowT + 0.08); } catch {}
        if (this.slideStop === stop) this.slideStop = null;
      };
      this.budgetSfx(src, stop);
      this.retire(src, nodes);
      this.slideStop = stop;
      window.setTimeout(() => {
        if (this.slideStop === stop) this.slideStop = null;
      }, (baked.duration + 0.1) * 1000);
      return;
    }

    // ── ścieżka live (pierwsze użycie tego czasu trwania) ──
    void this.bakeSlide(key);
    try {
      this.slideStop?.();
      const t = this.now(ctx);
      const stopAt = t + dur + 0.04;

      const panNode =
        typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
      let panTarget: AudioNode = this.sfxBus;
      const nodes: AudioNode[] = [];
      if (panNode) {
        panNode.pan.value = Math.max(-1, Math.min(1, pan));
        panNode.connect(this.sfxBus);
        panTarget = panNode;
        nodes.push(panNode);
      }
      const attenG = ctx.createGain();
      attenG.gain.value = atten;
      attenG.connect(panTarget);
      nodes.push(attenG);

      const { sources, env } = this.buildSlideGraph(ctx, attenG, buf, t, dur);
      nodes.push(env);

      const stop = () => {
        const nowT = this.ctx?.currentTime ?? t;
        try {
          holdParam(attenG.gain, nowT);
          attenG.gain.setValueAtTime(Math.max(0.0001, attenG.gain.value), nowT);
          attenG.gain.linearRampToValueAtTime(0, nowT + 0.06);
        } catch {}
        for (const s of sources) {
          try { s.stop(nowT + 0.08); } catch {}
        }
        if (this.slideStop === stop) this.slideStop = null;
      };

      for (const s of sources) {
        s.start(t);
        s.stop(stopAt);
      }
      const first = sources[0];
      this.budgetSfx(first, stop);
      this.retire(first, nodes);
      for (const s of sources) {
        if (s === first) continue;
        s.onended = () => { try { s.disconnect(); } catch {} };
      }

      this.slideStop = stop;
      window.setTimeout(() => {
        if (this.slideStop === stop) this.slideStop = null;
      }, (dur + 0.1) * 1000);
    } catch {}
  }

  /* ================= DŹWIĘKI OTOCZENIA — BRZMIENIE BEZ ZMIAN ============= */

  private createAmbientVoice(kind: AmbientKind): AmbientVoice | null {
    const ctx = this.ctx;
    const buf = this.noise();
    if (!ctx || !this.sfxBus || ctx.state === "closed") return null;

    const gain = ctx.createGain();
    gain.gain.value = AMBIENT_SILENCE;

    let panner: StereoPannerNode | null = null;
    if (typeof ctx.createStereoPanner === "function") {
      panner = ctx.createStereoPanner();
      panner.pan.value = 0;
      gain.connect(panner);
      panner.connect(this.sfxBus);
    } else {
      gain.connect(this.sfxBus);
    }

    const voice: AmbientVoice = {
      kind, gain, panner,
      active: false,
      sources: [],
      runNodes: [],
      idleSince: 0,
      start: () => {},
      stop: () => {},
    };

    voice.start = () => {
      if (voice.active || ctx.state === "closed") return;
      const sources: AudioScheduledSourceNode[] = [];
      const runNodes: AudioNode[] = [];

      const osc = (type: OscillatorType, freq: number, level: number, out: AudioNode) => {
        const o = ctx.createOscillator();
        const og = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        og.gain.value = level;
        o.connect(og);
        og.connect(out);
        sources.push(o);
        runNodes.push(og);
        return o;
      };

      if (kind === "patrol") {
        const humLp = ctx.createBiquadFilter();
        humLp.type = "lowpass";
        humLp.frequency.value = 430;
        humLp.Q.value = 0.7;
        humLp.connect(gain);
        runNodes.push(humLp);

        osc("sawtooth", 57, 0.5, humLp);
        const o2 = osc("sawtooth", 114.7, 0.2, humLp);
        osc("triangle", 171, 0.1, gain);

        const drift = ctx.createOscillator();
        const driftG = ctx.createGain();
        drift.type = "sine";
        drift.frequency.value = 0.37;
        driftG.gain.value = 4.5;
        drift.connect(driftG);
        driftG.connect(o2.detune);
        sources.push(drift);
        runNodes.push(driftG);

        if (buf) {
          const noise = ctx.createBufferSource();
          noise.buffer = buf;
          noise.loop = true;
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = 4200;
          bp.Q.value = 1.3;
          const ng = ctx.createGain();
          ng.gain.value = 0.34;
          noise.connect(bp);
          bp.connect(ng);
          ng.connect(gain);
          sources.push(noise);
          runNodes.push(bp, ng);

          const flicker = ctx.createOscillator();
          const flickerG = ctx.createGain();
          flicker.type = "sine";
          flicker.frequency.value = 7.3;
          flickerG.gain.value = 0.14;
          flicker.connect(flickerG);
          flickerG.connect(ng.gain);
          sources.push(flicker);
          runNodes.push(flickerG);
        }
      } else {
        const motorLp = ctx.createBiquadFilter();
        motorLp.type = "lowpass";
        motorLp.frequency.value = 900;
        motorLp.Q.value = 0.8;
        motorLp.connect(gain);
        runNodes.push(motorLp);

        osc("sawtooth", 44, 0.55, motorLp);
        osc("sawtooth", 88.5, 0.28, motorLp);
        osc("triangle", 132, 0.1, motorLp);

        if (buf) {
          const noise = ctx.createBufferSource();
          noise.buffer = buf;
          noise.loop = true;
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = 1350;
          bp.Q.value = 0.7;
          const ng = ctx.createGain();
          ng.gain.value = 0.45;
          noise.connect(bp);
          bp.connect(ng);
          ng.connect(gain);
          sources.push(noise);
          runNodes.push(bp, ng);
        }
        osc("sine", 1180, 0.05, gain);
      }

      for (const s of sources) {
        try { s.start(); } catch {}
      }
      voice.sources = sources;
      voice.runNodes = runNodes;
      voice.active = true;
    };

    voice.stop = () => {
      if (!voice.active) return;
      voice.active = false;
      for (const s of voice.sources) {
        try { s.stop(); } catch {}
        try { s.disconnect(); } catch {}
      }
      for (const n of voice.runNodes) {
        try { n.disconnect(); } catch {}
      }
      voice.sources = [];
      voice.runNodes = [];
    };

    return voice;
  }

  private destroyAmbientVoice(voice: AmbientVoice) {
    voice.stop();
    try { voice.gain.disconnect(); } catch {}
    if (voice.panner) {
      try { voice.panner.disconnect(); } catch {}
    }
  }

  public updateAmbient(sources: AmbientSource[]) {
    const nowMs = performance.now();
    if (nowMs - this.lastAmbientUpdate < AMBIENT_UPDATE_MS) return;
    this.lastAmbientUpdate = nowMs;

    if (!this.ctx || this.ctx.state !== "running" || this.muted || !this.sfxEnabled || !this.sfxBus) {
      if (this.ambient.size) this.clearAmbient();
      return;
    }
    const t = this.ctx.currentTime;

    const ranked = sources
      .map((s) => {
        const atten = ambientAttenuation(s.xDist, s.yDist);
        const intensity = s.kind === "elevator" ? Math.max(0, Math.min(1, s.intensity ?? 1)) : 1;
        const base = s.kind === "patrol" ? AMBIENT_PATROL_LEVEL : AMBIENT_ELEVATOR_LEVEL;
        return { s, target: base * atten * intensity };
      })
      .filter((x) => x.target > AMBIENT_SILENCE)
      .sort((a, b) => b.target - a.target)
      .slice(0, MAX_AMBIENT_VOICES);

    const seen = new Set<string>();
    for (const { s, target } of ranked) {
      seen.add(s.id);
      let voice: AmbientVoice | null | undefined = this.ambient.get(s.id);
      if (!voice || voice.kind !== s.kind) {
        if (voice) {
          this.destroyAmbientVoice(voice);
          this.ambient.delete(s.id);
        }
        voice = this.createAmbientVoice(s.kind);
        if (!voice) continue;
        this.ambient.set(s.id, voice);
      }
      if (!voice.active) {
        voice.start();
        voice.gain.gain.cancelScheduledValues(t);
        voice.gain.gain.setValueAtTime(AMBIENT_SILENCE, t);
      }
      voice.idleSince = 0;
      voice.gain.gain.setTargetAtTime(target, t, 0.1);
      if (voice.panner) {
        voice.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, s.pan)), t, 0.1);
      }
    }

    // FIX CPU (patrol / windy): wróg krążący na granicy zasięgu słuchu
    // powodował wcześniej destroy + create ~12 węzłów za każdym razem
    // (AMBIENT_PARK_MS było zbyt krótkie i niszczyło głos po 300 ms).
    // Teraz pętla ZOSTAJE w grafie i jest tylko wyciszana — biegający
    // oscylator przy gain≈0 kosztuje praktycznie zero, a churn znika.
    for (const [id, voice] of this.ambient) {
      if (seen.has(id)) continue;
      if (voice.idleSince === 0) voice.idleSince = nowMs;
      voice.gain.gain.setTargetAtTime(AMBIENT_SILENCE, t, 0.08);
    }

    // LRU nadmiaru: niszczymy tylko, gdy zaparkowanych jest więcej niż
    // MAX_AMBIENT_VOICES + 2 (dalekie, nieużywane głosy — to nie churn).
    if (this.ambient.size > MAX_AMBIENT_VOICES + 2) {
      const parked = Array.from(this.ambient.entries())
        .filter(([id, v]) => !seen.has(id) && nowMs - v.idleSince > AMBIENT_PARK_MS)
        .sort((a, b) => a[1].idleSince - b[1].idleSince);
      while (this.ambient.size > MAX_AMBIENT_VOICES + 2 && parked.length) {
        const [id, v] = parked.shift()!;
        this.destroyAmbientVoice(v);
        this.ambient.delete(id);
      }
    }
    this.stats.ambient = this.ambient.size;
  }

  public clearAmbient() {
    for (const voice of this.ambient.values()) {
      this.destroyAmbientVoice(voice);
    }
    this.ambient.clear();
    this.stats.ambient = 0;
  }

  /* ====================== ODBIJAJĄCA SIĘ PIŁKA ============================ */

  private getBallPanner(pan: number, at: number): AudioNode | null {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return null;
    if (typeof ctx.createStereoPanner !== "function") return this.sfxBus;

    if (this.ballPanners.length < BALL_PANNER_POOL) {
      const p = ctx.createStereoPanner();
      p.connect(this.sfxBus);
      this.ballPanners.push(p);
    }
    const p = this.ballPanners[this.ballPannerIdx % this.ballPanners.length];
    this.ballPannerIdx = (this.ballPannerIdx + 1) % this.ballPanners.length;
    const clamped = Math.max(-1, Math.min(1, pan));
    try {
      p.pan.cancelScheduledValues(at);
      p.pan.setValueAtTime(clamped, at);
    } catch {
      p.pan.value = clamped;
    }
    return p;
  }

  public playBallBounce(xDist: number, yDist: number, pan: number) {
    const ctx = this.sfxCtx();
    if (!ctx || !this.sfxBus) return;

    const atten = ambientAttenuation(xDist, yDist);
    if (atten <= 0) return;
    const amp = atten * AMBIENT_BALL_LEVEL;
    if (amp * SFX_GAIN.BALL_METAL < AMBIENT_SILENCE) return;

    if (!this.ballQueued || amp > this.ballQueued.amp) {
      this.ballQueued = { amp, pan };
    }

    const nowMs = performance.now();
    const since = nowMs - this.lastBallAt;
    const louder = amp > this.lastBallAmp * BALL_BYPASS_RATIO;
    const minGap = louder ? BALL_BYPASS_MIN_MS : BALL_MIN_INTERVAL_MS;

    if (since < minGap) {
      this.stats.ballDropped++;
      return;
    }

    const hit = this.ballQueued;
    this.ballQueued = null;
    this.lastBallAt = nowMs;
    this.lastBallAmp = hit.amp;

    this.emitBallBounce(ctx, hit.amp, hit.pan);
  }

  /**
   * Emisja odbicia — ścieżka „tania”:
   *   BufferSource(wypalona próbka) → Gain(amp) → panner z puli → SFX bus
   *
   * Zero oscylatorów, zero filtrów, zero automatyzacji obwiedni w czasie gry.
   * Wariant i mikro-jitter tempa dają tę samą „żywość” co dawny random.
   */
  private emitBallBounce(ctx: AudioContext, amp: number, pan: number) {
    const t = this.now(ctx);
    const dest = this.getBallPanner(pan, t);
    if (!dest) return;

    const near = amp > AMBIENT_BALL_LEVEL * BALL_NEAR_RATIO;
    const variants = near ? BALL_NEAR_VARIANTS : BALL_FAR_VARIANTS;
    const idx = this.ballVariantIdx++ % variants;
    const name = (near ? `ballNear${idx}` : `ballFar${idx}`) as BakedName;
    const rate = 1 + (Math.random() * 2 - 1) * BALL_RATE_JITTER;

    if (this.playBaked(name, amp, dest, rate, t)) return;

    // Fallback (brak OfflineAudioContext): dawna synteza na żywo.
    const v = 0.94 + Math.random() * 0.12;
    try {
      this.hiss({
        at: t, dur: 0.02, gain: SFX_GAIN.BALL_METAL * amp,
        type: "bandpass", freq: 2600 * v, q: 1.2, attack: 0.002, dest,
      });
      this.tone({
        type: "sine", from: 205 * v, to: 140, at: t, dur: 0.09,
        gain: SFX_GAIN.BALL_TONE * amp, attack: 0.002, dest,
      });
      const ring: Array<[number, number, number]> = near
        ? [
            [1180, 0.28, SFX_GAIN.BALL_SHIMMER],
            [1560, 0.20, SFX_GAIN.BALL_SHIMMER * 0.77],
            [2340, 0.13, SFX_GAIN.BALL_SHIMMER * 0.67],
          ]
        : [[1180, 0.18, SFX_GAIN.BALL_SHIMMER * 0.8]];
      for (const [freq, dur, gain] of ring) {
        this.tone({
          type: "sine", from: freq * v, at: t + 0.003, dur,
          gain: gain * amp, attack: 0.0015, dest,
        });
      }
    } catch {}
  }

  /* ====================== MELODIE — BRZMIENIE BEZ ZMIAN ================== */

  public playMusic(track: MusicTrack) {
    this.desiredTrack = track;
    this.syncMusic();
  }

  public stopMusic() {
    this.desiredTrack = null;
    this.syncMusic();
  }

  private syncMusic() {
    const want = !this.muted && this.musicEnabled && !this.pageHidden ? this.desiredTrack : null;
    const have = this.voice ? this.voice.track : null;
    if (have === want) return;

    if (this.voice) {
      this.killVoice(this.voice, want ? TRACK_SWITCH_FADE : TRACK_STOP_FADE);
      this.voice = null;
    }
    if (!want) return;

    const ctx = this.ctx;
    if (!ctx || ctx.state === "closed" || !this.musicBus) return;

    const voiceGain = ctx.createGain();
    const t = ctx.currentTime;
    const targetLevel = want === "menu" ? MUSIC_MENU_LEVEL : MUSIC_GAME_LEVEL;

    voiceGain.gain.setValueAtTime(0.0001, t);
    voiceGain.gain.exponentialRampToValueAtTime(targetLevel, t + 0.18);
    voiceGain.connect(this.musicBus);

    const bpm = want === "menu" ? 94 : 126;
    const chords = want === "menu" ? MENU_CHORDS : GAME_CHORDS;
    const voice: MusicVoice = {
      track: want,
      gain: voiceGain,
      sources: new Set(),
      stopTicker: null,
      step: 0,
      nextTime: t + 0.06,
      stepDur: 60 / bpm / 4,
      loopSteps: chords.length * 16,
    };
    this.voice = voice;
    this.pump(voice);
    voice.stopTicker = createTicker(PUMP_INTERVAL, () => this.pump(voice));
  }

  private killVoice(voice: MusicVoice, fade: number) {
    voice.stopTicker?.();
    voice.stopTicker = null;
    const ctx = this.ctx;
    if (!ctx || ctx.state === "closed") return;
    const t = ctx.currentTime;
    const g = voice.gain.gain;
    try {
      holdParam(g, t);
      g.setValueAtTime(Math.max(0.0001, g.value), t);
      g.exponentialRampToValueAtTime(0.0001, t + fade);
      g.linearRampToValueAtTime(0, t + fade + 0.01);
    } catch {}
    voice.sources.forEach((s) => {
      try { s.stop(t + fade + 0.03); } catch {}
    });
    voice.sources.clear();
    window.setTimeout(() => {
      try { voice.gain.disconnect(); } catch {}
    }, (fade + 0.15) * 1000);
  }

  private forgetVoice() {
    if (!this.voice) return;
    this.voice.stopTicker?.();
    this.voice = null;
  }

  private pump(voice: MusicVoice) {
    const ctx = this.ctx;
    if (!ctx || this.voice !== voice) return;
    const now = ctx.currentTime;

    if (voice.nextTime < now - 0.05) {
      const missed = Math.ceil((now - voice.nextTime) / voice.stepDur);
      voice.step = (voice.step + missed) % voice.loopSteps;
      voice.nextTime = now + 0.02;
      this.stats.missedSteps += missed;
    }
    while (voice.nextTime < now + LOOKAHEAD) {
      this.scheduleStep(voice, voice.step, voice.nextTime);
      voice.nextTime += voice.stepDur;
      voice.step = (voice.step + 1) % voice.loopSteps;
    }
  }

  /* ----------------------- instrumenty ----------------------------------- */

  private drumKick(at: number, gain: number, voice: MusicVoice) {
    this.tone({ type: "sine", from: 120, at, dur: 0.16, gain, attack: 0.002, voice });
    this.hiss({ at, dur: 0.012, gain: gain * 0.35, type: "lowpass", freq: 900, voice });
  }

  private drumRim(at: number, gain: number, voice: MusicVoice) {
    this.hiss({ at, dur: 0.028, gain, type: "bandpass", freq: 1900, q: 4, voice });
    this.tone({ type: "triangle", from: 720, to: 500, at, dur: 0.035, gain: gain * 0.7, attack: 0.001, voice });
  }

  private drumSnare(at: number, gain: number, voice: MusicVoice) {
    this.hiss({ at, dur: 0.1, gain, type: "bandpass", freq: 1700, q: 0.8, voice });
    this.tone({ type: "triangle", from: 210, to: 150, at, dur: 0.07, gain: gain * 0.8, attack: 0.001, voice });
    this.hiss({ at: at + 0.006, dur: 0.09, gain: MUSIC_GAIN.GAME_CLAP, type: "bandpass", freq: 1800, q: 0.8, voice });
  }

  private drumHat(at: number, gain: number, voice: MusicVoice, open = false) {
    this.hiss({ at, dur: open ? 0.14 : 0.025, gain, type: "highpass", freq: 8000, voice });
  }

  private skankChord(chord: number[], at: number, gain: number, voice: MusicVoice, dur: number) {
    for (const n of chord.slice(0, 3)) {
      this.tone({ type: "triangle", from: midi(n + 12), at, dur, gain, attack: 0.004, voice });
    }
  }

  private bassNote(note: number, at: number, dur: number, gain: number, voice: MusicVoice) {
    const f = midi(note);
    this.tone({ type: "sine", from: f, at, dur, gain, attack: 0.012, voice });
    this.tone({ type: "triangle", from: f, at, dur: dur * 0.6, gain: gain * 0.25, attack: 0.012, voice });
  }

  private marimbaNote(note: number, at: number, gain: number, voice: MusicVoice, dur = 0.28) {
    const f = midi(note);
    this.tone({ type: "sine", from: f, at, dur, gain, attack: 0.002, voice });
    this.tone({ type: "sine", from: f * 4, at, dur: dur * 0.35, gain: gain * 0.22, attack: 0.001, voice });
    this.tone({ type: "triangle", from: f, at, dur: dur * 0.5, gain: gain * 0.3, attack: 0.002, voice });
    this.hiss({ at, dur: 0.012, gain: gain * 0.35, type: "bandpass", freq: 2200, q: 1.5, voice });
  }

  private fluteNote(note: number, at: number, dur: number, gain: number, voice: MusicVoice) {
    const ctx = this.ctx;
    const dest = this.musicDest(voice);
    if (!ctx || !dest) return;
    const f = midi(note);
    const hold = Math.min(dur * 0.6, Math.max(0.06, dur - 0.09));

    const body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.value = f;
    const bodyG = ctx.createGain();
    bodyG.gain.setValueAtTime(0.0001, at);
    bodyG.gain.exponentialRampToValueAtTime(gain, at + 0.06);
    bodyG.gain.setValueAtTime(gain, at + hold);
    bodyG.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    bodyG.gain.linearRampToValueAtTime(0, at + dur + 0.008);

    const edge = ctx.createOscillator();
    edge.type = "triangle";
    edge.frequency.value = f;
    const edgeG = ctx.createGain();
    edgeG.gain.setValueAtTime(0.0001, at);
    edgeG.gain.exponentialRampToValueAtTime(gain * 0.35, at + 0.05);
    edgeG.gain.setValueAtTime(gain * 0.35, at + hold);
    edgeG.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    edgeG.gain.linearRampToValueAtTime(0, at + dur + 0.008);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 5.2;
    const lfoG = ctx.createGain();
    lfoG.gain.setValueAtTime(0, at);
    lfoG.gain.linearRampToValueAtTime(9, at + Math.min(0.25, dur * 0.5));
    lfo.connect(lfoG);
    lfoG.connect(body.detune);
    lfoG.connect(edge.detune);

    body.connect(bodyG);
    edge.connect(edgeG);
    bodyG.connect(dest);
    edgeG.connect(dest);

    const end = at + dur + 0.03;
    body.start(at);
    edge.start(at);
    lfo.start(at);
    body.stop(end);
    edge.stop(end);
    lfo.stop(end);
    this.track(voice, body, [bodyG], bodyG);
    this.track(voice, edge, [edgeG], edgeG);
    this.track(voice, lfo, [lfoG], null);

    this.hiss({ at, dur: 0.07, gain: gain * 0.28, type: "bandpass", freq: f * 2, q: 2.5, voice });
  }

  /* ----------------------------- scheduler ------------------------------- */

  private scheduleStep(voice: MusicVoice, step: number, at: number) {
    const isMenu = voice.track === "menu";
    const chords = isMenu ? MENU_CHORDS : GAME_CHORDS;
    const bar = Math.floor(step / 16) % chords.length;
    const inBar = step % 16;
    const loopStep = step % STEPS_PER_LOOP;
    const loopBar = Math.floor(loopStep / 16);
    const chord = chords[bar];
    const sd = voice.stepDur;

    if (isMenu) this.scheduleMenuStep(voice, chord, bar, inBar, loopBar, loopStep, at, sd);
    else this.scheduleGameStep(voice, chord, bar, inBar, loopBar, loopStep, at, sd);
  }

  private scheduleMenuStep(
    voice: MusicVoice,
    chord: number[],
    bar: number,
    inBar: number,
    loopBar: number,
    loopStep: number,
    at: number,
    sd: number,
  ) {
    const root = chord[0];

    if (inBar === 8) {
      this.drumKick(at, MUSIC_GAIN.MENU_KICK, voice);
      this.drumRim(at, MUSIC_GAIN.MENU_RIM, voice);
    }
    if (loopBar === 3 && inBar === 14) this.drumKick(at, MUSIC_GAIN.MENU_KICK * 0.6, voice);
    if ((loopBar === 1 || loopBar === 3) && inBar === 14) this.drumRim(at, MUSIC_GAIN.MENU_RIM * 0.4, voice);
    if (inBar % 2 === 0) this.drumHat(at, MUSIC_GAIN.MENU_HAT, voice);
    else this.drumHat(at, MUSIC_GAIN.MENU_HAT * 0.4, voice);
    if (loopBar === 3 && inBar === 14) this.drumHat(at, MUSIC_GAIN.MENU_OPENHAT, voice, true);

    if (inBar % 4 === 2) {
      this.skankChord(chord, at, MUSIC_GAIN.MENU_SKANK, voice, sd * 0.9);
      this.skankChord(chord, at + 3 * sd, MUSIC_GAIN.MENU_SKANK * MUSIC_GAIN.MENU_ECHO, voice, sd * 0.8);
    }

    for (const [s, iv, len] of MENU_BASS_PATTERNS[loopBar]) {
      if (s === inBar) this.bassNote(root - 12 + iv, at, len * sd * 0.92, MUSIC_GAIN.MENU_BASS, voice);
    }

    const leadGain = MUSIC_GAIN.MENU_LEAD * (bar >= 4 ? 0.7 : 1);
    for (const [s, note, len] of MENU_LEAD) {
      if (s !== loopStep) continue;
      const dur = len * sd * 0.95;
      this.tone({ type: "triangle", from: midi(note), at, dur, gain: leadGain, attack: 0.03, voice });
      this.tone({ type: "sine", from: midi(note - 12), at, dur, gain: leadGain * 0.45, attack: 0.03, voice });
    }
  }

  private scheduleGameStep(
    voice: MusicVoice,
    chord: number[],
    bar: number,
    inBar: number,
    loopBar: number,
    loopStep: number,
    at: number,
    sd: number,
  ) {
    const root = chord[0];
    const bassRoot = root - 12;

    if (inBar === 0 || inBar === 6 || inBar === 8) this.drumKick(at, MUSIC_GAIN.GAME_KICK, voice);
    if (loopBar % 2 === 1 && inBar === 14) this.drumKick(at, MUSIC_GAIN.GAME_KICK * 0.7, voice);
    if (inBar === 4 || inBar === 12) this.drumSnare(at, MUSIC_GAIN.GAME_SNARE, voice);
    if (inBar % 2 === 0) this.drumHat(at, MUSIC_GAIN.GAME_HIHAT, voice);
    else if (inBar % 4 === 3) this.drumHat(at, MUSIC_GAIN.GAME_HIHAT * 0.45, voice);
    if (loopBar % 2 === 1 && inBar === 14) this.drumHat(at, MUSIC_GAIN.GAME_OPENHAT, voice, true);

    for (const [s, iv, len] of GAME_BASS_PATTERNS[loopBar % 2]) {
      if (s === inBar) this.bassNote(bassRoot + iv, at, len * sd * 0.9, MUSIC_GAIN.GAME_BASS, voice);
    }

    if (inBar % 4 === 2) {
      const pair = inBar === 2 || inBar === 10 ? [chord[1], chord[2]] : [chord[2], chord[3]];
      for (const n of pair) this.marimbaNote(n, at, MUSIC_GAIN.GAME_MARIMBA, voice);
    }
    if (loopBar === 3 && inBar >= 12) {
      this.marimbaNote(chord[3 - (inBar - 12)], at, MUSIC_GAIN.GAME_MARIMBA * 0.8, voice, 0.2);
    }

    const phrase = Math.floor(bar / 4) % 2 === 1 ? GAME_FLUTE_B : GAME_FLUTE_A;
    const keyRoot = GAME_CHORDS[0][0];
    let delta = root - keyRoot;
    if (delta > 6) delta -= 12;
    for (const [s, iv, len] of phrase) {
      if (s !== loopStep) continue;
      this.fluteNote(keyRoot + 12 + delta + iv, at, len * sd * 0.95, MUSIC_GAIN.GAME_FLUTE, voice);
    }
  }
}

export const soundEngine = new SoundEngine();
export type { SoundEngine };
