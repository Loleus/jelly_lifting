# `src/engine/` — mapa silnika

```
engine/
├── GlowerTowerGame.ts     orkiestrator: stan gry, pętla, FIZYKA i KOLIZJE, budowa świata
├── constants.ts           JEDYNE źródło stałych + matematyka obwodu wieży
├── gameTypes.ts           typy danych poziomu (ElevatorDef, HazardDef, …)
├── culling.ts             widoczność obiektów względem kamery
│
├── player/
│   └── PlayerRig.ts       ★ SIATKA + ANIMACJA GRACZA (tu edytuj wygląd ludzika)
├── camera/
│   └── CameraRig.ts       kamera śledząca / orbita w menu
├── fx/
│   └── ParticleSystem.ts  iskry (skok, lądowanie, diament, drzwi, kolizje)
└── audio/
    └── ambientSpatial.ts  odległość + panorama dźwięków otoczenia (wróg, winda, schodek)
```

## Gdzie co zmienić

| Chcę… | Plik | Miejsce |
|---|---|---|
| zmienić wygląd gracza (kolor, kształt, dodać element) | `player/PlayerRig.ts` | `buildShell / buildBelly / buildFace / buildLimbs / buildTopDrop` |
| **świecący brzuch** — kolor, jasność, tempo pulsu | `player/PlayerRig.ts` | stałe `BELLY_*` na górze + `updateBelly()` |
| animację chodu, squash, mruganie, obrót | `player/PlayerRig.ts` | `update()` |
| jak kamera śledzi gracza / orbituje w menu | `camera/CameraRig.ts` | `update()` |
| wygląd / fizykę iskier | `fx/ParticleSystem.ts` | `spawn()` (tryby) / `update()` |
| zasięg słuchu, panoramę stereo | `audio/ambientSpatial.ts` + `soundEngine.ts` (`AMBIENT_*`) | `ambientSpatial()` |
| prędkość, skok, grawitację, wymiary wieży | `constants.ts` | sekcje `gracz` / `geometria` |
| fizykę, kolizje, windy, zapadnie, dźwignie | `GlowerTowerGame.ts` | `stepPhysics()`, `findGround()`, `checkCeilingCollision()`, … |
| budowę schodków / wind / wrogów / drzwi | `GlowerTowerGame.ts` | `buildWorld()` → `buildStairs()`, `buildElevators()`, … |

## Kontrakty między modułami

- `PlayerRig.update(state, sec)` — czyta `playerState`, **mutuje tylko `facingYaw`**.
- `CameraRig.update(mode, state, sec)` — mutuje `camLeadAngle`, `verticalLead`, `smoothCamY`.
- `ParticleSystem.spawn(...)` — wołane przez `GlowerTowerGame.spawnParticles(...)` (API bez zmian).
- `ambientSpatial(objX, objY, playerX, playerY, camera)` — czysta funkcja, bez stanu.

Żaden moduł nie zna fizyki ani kolizji — te zostają w `GlowerTowerGame.ts`.
