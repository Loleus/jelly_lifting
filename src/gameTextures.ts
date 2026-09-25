// import * as THREE from "three";

// // ---------------------------------------------------------------------------
// // Fallback proceduralny tekstur.
// //
// // Gra pierwotnie ładuje bitmapy z src/textures/*. Żeby działać w 100% offline
// // (także bez sklonowanych oryginałów), TextureFallback wrapped TextureLoader:
// // każdy kolor = jednolita tekstura canvas w bazowym kolorze materiału, każda
// // mapa normalnych = jednolity niebieski (128,128,255) — czyli „płaska”
// // powierzchnia. Dzięki temu geometria, cienie i oświetlenie pozostają nienaruszone.
// // W środowisku z plikami tekstur wszystko działa jak dotąd (fetch wygrywa).
// // ---------------------------------------------------------------------------

// const FALLBACK_COLORS: Record<string, string> = {
//   "door_col": "#5a6b78",
//   "STEP_col": "#a06e41",
//   "WALL_col": "#77828f",
//   "ENEMY_col": "#d23838",
//   "waternormals": "#8080ff",
//   "STEP_nrm": "#8080ff",
//   "door_nrm": "#8080ff",
//   "WALL_nrm": "#8080ff",
//   "ENEMY_nrm": "#8080ff",
// };

// function fallbackKey(url: string): string {
//   const base = url.split("/").pop() ?? "";
//   return base.replace(/\.(jpe?g|png)$/i, "");
// }

// function makeFallbackTexture(url: string): THREE.Texture {
//   const key = fallbackKey(url);
//   const colorHex = FALLBACK_COLORS[key] ?? (key.toLowerCase().includes("nrm") ? "#8080ff" : "#888888");
//   const canvas = document.createElement("canvas");
//   canvas.width = canvas.height = 4;
//   const ctx = canvas.getContext("2d");
//   if (ctx) {
//     ctx.fillStyle = colorHex;
//     ctx.fillRect(0, 0, canvas.width, canvas.height);
//   }
//   const texture = new THREE.CanvasTexture(canvas);
//   texture.colorSpace = THREE.SRGBColorSpace;
//   return texture;
// }

// /** Ładuje teksturę; w razie braku pliku/offline zwraca jednolitą teksturę. */
// function loadTextureSafe(textureLoader: THREE.TextureLoader, url: string): THREE.Texture {
//   const texture = textureLoader.load(url) as unknown as THREE.Texture;
//   // Wstrzykujemy asynchroniczny fallback: przy błędzie sieci/404 podmieniamy
//   // obrazek na jednolity canvas, a normal maps na płaski niebieski.
//   const onError = () => {
//     try {
//       const replacement = makeFallbackTexture(url);
//       texture.image = replacement.image;
//       texture.colorSpace = url.toLowerCase().includes("nrm")
//         ? THREE.NoColorSpace
//         : THREE.SRGBColorSpace;
//       texture.needsUpdate = true;
//     } catch {
//       // brak wsparcia canvas — zostawiamy domyślną (czarną) teksturę.
//     }
//   };
//   // Three.js wywołuje onError po nieudanym fetchu; podpinamy się do DOM image.
//   const rawImage = texture.image as unknown;
//   const image = rawImage as HTMLImageElement | undefined;
//   if (image && typeof image.addEventListener === "function") {
//     image.addEventListener("error", onError, { once: true });
//   }
//   return texture;
// }

// // ---------------------------------------------------------------------------
// // JEDEN loader + cache obrazow + memoizacja skonfigurowanych tekstur.
// //
// // BYLO (zrodlo dlugiego budowania swiata): kazda fabryka materialu tworzyla
// // `new THREE.TextureLoader()` i ladowala swoje pliki od zera. Przy wiezy
// // z 3 drzwiami, 2 windami i 4 schodkami przelaczanymi ten sam
// // STEP_col/STEP_nrm byl ladowany ~10x na JEDNA budowe silnika — za kazdym
// // razem nowy Image, dekodowanie JPEG i osobna tekstura GPU. Dodatkowo
// // THREE.Cache.enabled jest domyslnie FALSE (three/src/loaders/Cache.js),
// // wiec nawet powtorzone ladowanie tego samego URL nie bylo cache'owane.
// //
// // TERAZ: obrazy przechodza przez Cache, a skonfigurowane tekstury sa
// // memoizowane kluczem (url + wrap + repeat + anisotropy), wiec N drzwi
// // dzieli jedna teksture zamiast N kopii.
// //
// // UWAGA dla konsumentow: zwracane tekstury sa WSPOLDZIELONE. Jesli ktos
// // zmienia repeat/offset/center/rotation, musi najpierw zrobic texture.clone()
// // (tak robia checkpointowy kij i nadproze drzwi).
// // ---------------------------------------------------------------------------
// const sharedTextureLoader = new THREE.TextureLoader();
// THREE.Cache.enabled = true;

// interface TextureOptions {
//   wrapS?: THREE.Wrapping;
//   wrapT?: THREE.Wrapping;
//   repeat?: [number, number];
//   anisotropy?: number;
// }

// const configuredTextureCache = new Map<string, THREE.Texture>();

// function textureKey(url: string, kind: "color" | "normal", opts: TextureOptions): string {
//   return [
//     url,
//     kind,
//     opts.wrapS ?? -1,
//     opts.wrapT ?? -1,
//     opts.repeat ? `${opts.repeat[0]}x${opts.repeat[1]}` : "-",
//     opts.anisotropy ?? -1,
//   ].join("|");
// }

// /** Mapa koloru z cache (patrz komentarz wyzej). */
// function cachedColorMap(url: string, opts: TextureOptions = {}): THREE.Texture {
//   const key = textureKey(url, "color", opts);
//   const hit = configuredTextureCache.get(key);
//   if (hit) return hit;
//   const texture = configureColorMap(loadTextureSafe(sharedTextureLoader, url), opts);
//   configuredTextureCache.set(key, texture);
//   return texture;
// }

// /** Mapa normalnych z cache (patrz komentarz wyzej). */
// function cachedNormalMap(url: string, opts: TextureOptions = {}): THREE.Texture {
//   const key = textureKey(url, "normal", opts);
//   const hit = configuredTextureCache.get(key);
//   if (hit) return hit;
//   const texture = configureNormalMap(loadTextureSafe(sharedTextureLoader, url), opts);
//   configuredTextureCache.set(key, texture);
//   return texture;
// }

// function configureColorMap(
//   texture: THREE.Texture,
//   opts: {
//     wrapS?: THREE.Wrapping;
//     wrapT?: THREE.Wrapping;
//     repeat?: [number, number];
//     anisotropy?: number;
//   } = {}
// ): THREE.Texture {
//   texture.colorSpace = THREE.SRGBColorSpace;
//   texture.wrapS = opts.wrapS ?? THREE.ClampToEdgeWrapping;
//   texture.wrapT = opts.wrapT ?? THREE.ClampToEdgeWrapping;
//   if (opts.repeat) texture.repeat.set(opts.repeat[0], opts.repeat[1]);
//   if (opts.anisotropy !== undefined) texture.anisotropy = opts.anisotropy;
//   return texture;
// }

// function configureNormalMap(
//   texture: THREE.Texture,
//   opts: {
//     wrapS?: THREE.Wrapping;
//     wrapT?: THREE.Wrapping;
//     repeat?: [number, number];
//     anisotropy?: number;
//   } = {}
// ): THREE.Texture {
//   texture.colorSpace = THREE.NoColorSpace;
//   texture.wrapS = opts.wrapS ?? THREE.ClampToEdgeWrapping;
//   texture.wrapT = opts.wrapT ?? THREE.ClampToEdgeWrapping;
//   if (opts.repeat) texture.repeat.set(opts.repeat[0], opts.repeat[1]);
//   if (opts.anisotropy !== undefined) texture.anisotropy = opts.anisotropy;
//   return texture;
// }

// export function createElevatorRailMaterial(): THREE.MeshStandardMaterial {
//   return createDoorFrameMaterial();
// }

// export function createDoorMaterial(): THREE.MeshStandardMaterial {
//   const liftColorUrl = new URL("./textures/door/door_col.jpg", import.meta.url).href;
//   const liftNormalUrl = new URL("./textures/door/door_nrm.jpg", import.meta.url).href;

//   // Bylo: per drzwi nowy loader + nowy Image + dekodowanie door_col/nrm.
//   const colorTexture = cachedColorMap(liftColorUrl);
//   const normalTexture = cachedNormalMap(liftNormalUrl);

//   return new THREE.MeshStandardMaterial({
//     map: colorTexture,
//     normalMap: normalTexture,
//     normalScale: new THREE.Vector2(30.0, 30.0),
//     roughness: 1.0,
//     metalness: 0.1,
//   });
// }

// export function createDoorFrameMaterial(): THREE.MeshStandardMaterial {
//   const liftColorUrl = new URL("./textures/step/STEP_col.jpg", import.meta.url).href;
//   const liftNormalUrl = new URL("./textures/step/STEP_nrm.jpg", import.meta.url).href;

//   const repeat: [number, number] = [0.5, 0.9];
//   const opts = { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat, anisotropy: 7 } as const;

//   // Ta fabryka jest wola per drzwi, per prowadnica windy i per checkpoint —
//   // bez cache to bylo kilkanascie ladowan STEP_col/STEP_nrm na budowe.
//   const texture = cachedColorMap(liftColorUrl, opts);
//   const normalTexture = cachedNormalMap(liftNormalUrl, opts);
//   return new THREE.MeshStandardMaterial({
//     map: texture,
//     normalMap: normalTexture,
//     normalScale: new THREE.Vector2(30.0, 30.0),
//     roughness: 1.0,
//     metalness: 0.1,
//   });
// }

// export function createTowerMaterial(
//   _loader?: THREE.TextureLoader,
//   _radius: number = 6.12,
//   _height: number = 52
// ): THREE.Material {
//   const wallColorTextureUrl = new URL("./textures/wall/WALL_col.jpg", import.meta.url).href;
//   const wallNormalTextureUrl = new URL("./textures/wall/WALL_nrm.jpg", import.meta.url).href;

//   const repeatU = 7;
//   const repeatV = Math.max(1, Math.ceil((_height || 52) / 6));
//   const repeat: [number, number] = [repeatU, repeatV];

//   const wallOpts = { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat, anisotropy: 7 } as const;
//   // WALL_nrm to 285 kB JPEG — z cache dekodowany raz na sesje, nie raz na budowe.
//   const texture = cachedColorMap(wallColorTextureUrl, wallOpts);
//   const normalTexture = cachedNormalMap(wallNormalTextureUrl, wallOpts);

//   return new THREE.MeshStandardMaterial({
//     map: texture,
//     normalMap: normalTexture,
//     normalScale: new THREE.Vector2(3.85, 3.85),
//     roughness: 1.0,
//     metalness: 0.18,
//   });
// }

// // --- OSAD NA MURZE (pierwszy rząd kafli) --------------------------------------
// //
// // Gradient DWOCH kolorow: CZARNY (dol) -> ZIELONY Glutka (gora), nalozony na
// // dolny rzad kafli wiezy. Mieszanie dziala tak samo jak tint schodkow
// // (material.color.set("#4ade80" / "#ef4444")): kolor jest MNOZONY z texelem
// // mapy, wiec spoiny i rysunek muru pozostaja widoczne. Sila osadu na dole = 1
// // („opacity 1”), u gory = 0. Dolny kraniec lezy ponizej lustra wody, dlatego
// // miejsce zlaczenia nie jest widoczne — gradient „wychodzi” spod wody.

// export interface MossGradientOptions {
//   /** Swiatowe Y, gdzie osad ma pelna sile („opacity 1”). */
//   bottomY: number;
//   /** Swiatowe Y, gdzie osad zanika do zera („opacity 0”). */
//   topY: number;
//   /** Poziom wody — koniec gradientu chowa sie pod lustrem. */
//   waterY: number;
//   /** Maksymalna sila osadu (1 = pelna zaslona, ale tekstura i tak przebija). */
//   strength?: number;
//   /**
//    * Ile „mokrego polysku” dodac w pasie osadu (0..1): 1 = pelne obnizenie
//    * chropowatosci w strefie przy wodzie. Ta sama wartosc na murze i na
//    * stopniach daje identyczny blask; ku gorze pasa maleje do 0 (sucho).
//    */
//   wet?: number;
//   /**
//    * Dyskretna kwantyzacja wysokosci (np. 0.5 = „co pol pietra”): kolor i krycie
//    * sa stale w obrebie progu, wiec kazdy schodek dostaje jeden, skokowy odcien.
//    * 0 = plynny gradient (mur).
//    */
//   quantizeStep?: number;
//   /**
//    * „moss” (domyslnie) = tinta czarny -> zielen Glutka mnozona z mapa.
//    * „darken” = zachowuje ISTNIEJACA tinte schodka (np. czerwony/zielony stan
//    * dzwigni) i tylko ja przyciemnia: im bardziej mokro (nizej), tym ciemniejsza.
//    */
//   mode?: "moss" | "darken";
//   /** Przy trybie „darken”: mnoznik jasnosci na samym dole (im mniej, tym ciemniej). */
//   darkMin?: number;
//   /** Kolor CZARNY (dol gradientu, pelna sila). */
//   mudColor?: string;
//   /** Kolor ZIELONY Glutka (gorna krawedz gradientu, zanik do zera). */
//   slimeColor?: string;
// }

// export function applyMossGradient(material: THREE.Material, options: MossGradientOptions): void {
//   if (!(material instanceof THREE.MeshStandardMaterial)) return;

//   const uniforms = {
//     uMossBottomY: { value: options.bottomY },
//     uMossTopY: { value: Math.max(options.topY, options.bottomY + 0.5) },
//     uMossWaterY: { value: options.waterY },
//     uMossStrength: { value: options.strength ?? 1.0 },
//     uMossWet: { value: options.wet ?? 0.9 },
//     uMossStep: { value: options.quantizeStep ?? 0.0 },
//     uMossMode: { value: options.mode === "darken" ? 1.0 : 0.0 },
//     uMossDarkMin: { value: options.darkMin ?? 0.22 },
//     // Dwa kolory, tak jak w zamowieniu: CZARNY -> ZIELONY Glutka.
//     // To MNOZNIKI (jak material.color schodkow: color × mapa), a nie farby.
//     // "#3a3d3a" w sRGB -> w linearze ~0.04, czyli czern z widocznymi spoinami
//     // kafli, a "#4ade80" to dokladnie kolor powloki Glutka.
//     uMossColor: { value: new THREE.Color(options.mudColor ?? "#3a3d3a") },
//     uMossSlime: { value: new THREE.Color(options.slimeColor ?? "#4ade80") },
//   };

//   material.onBeforeCompile = (shader) => {
//     Object.assign(shader.uniforms, uniforms);

//     shader.vertexShader = shader.vertexShader
//       .replace(
//         "#include <common>",
//         `#include <common>
//         varying float vMossWorldY;
//         varying float vMossAngle;`
//       )
//       .replace(
//         "#include <begin_vertex>",
//         `#include <begin_vertex>
//         {
//           // Pozycja SWIATOWA, a nie lokalne transformed.y: dla InstancedMesh
//           // (schodki) przesuniecie kazdego stopnia siedzi w instanceMatrix.
//           #ifdef USE_INSTANCING
//             vec4 mossLocal = instanceMatrix * vec4(transformed, 1.0);
//           #else
//             vec4 mossLocal = vec4(transformed, 1.0);
//           #endif
//           vec4 mossWorldPos = modelMatrix * mossLocal;
//           vMossWorldY = mossWorldPos.y;
//           vMossAngle = atan(mossWorldPos.z, mossWorldPos.x);
//         }`
//       );

//     shader.fragmentShader = shader.fragmentShader
//       .replace(
//         "#include <common>",
//         `#include <common>
//         uniform float uMossBottomY;
//         uniform float uMossTopY;
//         uniform float uMossWaterY;
//         uniform float uMossStrength;
//         uniform float uMossWet;
//         uniform float uMossStep;
//         uniform float uMossMode;
//         uniform float uMossDarkMin;
//         uniform vec3 uMossColor;
//         uniform vec3 uMossSlime;
//         varying float vMossWorldY;
//         varying float vMossAngle;

//         // 0.0 = dol (pelne krycie), 1.0 = gora (zero osadu).
//         // uMossStep > 0 kwantyzuje wysokosc (np. 0.5 = „co pol pietra”), wiec
//         // kolor i krycie sa stale w obrebie progu -> dyskretne odcienie stopni.
//         float mossBandT() {
//           float h = vMossWorldY;
//           if (uMossStep > 0.0) h = uMossBottomY + floor((h - uMossBottomY) / uMossStep) * uMossStep;
//           return clamp((h - uMossBottomY) / max(0.001, uMossTopY - uMossBottomY), 0.0, 1.0);
//         }
//         // poszarpany, organiczny brzeg mchu
//         float mossRagged() {
//           float a = 0.5 + 0.5 * sin(vMossAngle * 7.0 - vMossWorldY * 4.1);
//           float b = 0.5 + 0.5 * sin(vMossAngle * 2.0 + vMossWorldY * 1.7 + 1.3);
//           return clamp(a * 0.62 + b * 0.38, 0.0, 1.0);
//         }
//         // „opacity” osadu z GOTOWEGO t — bez ponownego liczenia pasma.
//         float mossCoverageFromT(float t) {
//           float ragged = mix(1.0, 0.70 + 0.30 * mossRagged(), smoothstep(0.30, 0.70, t));
//           return clamp((1.0 - t) * ragged, 0.0, 1.0);
//         }
//         // MNOZNIK koloru z GOTOWEGO t: CZARNY przy dnie -> ZIELONY Glutka.
//         vec3 mossFactorFromT(float t) {
//           return mix(uMossColor, uMossSlime, smoothstep(0.0, 0.9, t));
//         }`
//       )
//       .replace(
//         "#include <map_fragment>",
//         `#include <map_fragment>
//         // Mieszanie identyczne jak tint schodkow (material.color × mapa): mapa
//         // zostaje POD spodem i jest tylko mnozona, wiec spoiny i rysunek tekstury
//         // pozostaja widoczne.
//         //   moss   -> tinta CZARNY (parter) -> ZIELEN Glutka, krycie 1 -> 0
//         //   darken -> zachowana tinta schodka (czerwony/zielony) jest tylko
//         //             przyciemniana: im bardziej mokro (nizej), tym ciemniejsza.
//         //
//         // BEZ ROZGALEZIEN: poprzednia wersja owinela to w warunek if, co na wielu GPU
//         // kosztuje wiecej niz policzenie wyrazenia bezwarunkowo (dywergencja,
//         // blokada schedulowania) i dawalo wieksze skoki klatki. Liczymy wiec
//         // liniowo, ale TANIO: pasmo (mossBandT) liczone RAZ i przekazywane do
//         // obu funkcji — wczesniej to samo bylo liczone 2-3 razy na piksel.
//         // Rozgalezienie trybu (moss/darken) jest jednorodne per material, wiec
//         // jest darmowe na poziomie warpa.
//         float mossT = mossBandT();
//         if (uMossMode < 0.5) {
//           diffuseColor.rgb *= mix(vec3(1.0), mossFactorFromT(mossT), clamp(mossCoverageFromT(mossT) * uMossStrength, 0.0, 1.0));
//         } else {
//           float darkAmt = clamp((1.0 - mossT) * uMossStrength, 0.0, 1.0);
//           diffuseColor.rgb *= mix(1.0, uMossDarkMin, darkAmt);
//         }`
//       )
//       .replace(
//         "#include <roughnessmap_fragment>",
//         `#include <roughnessmap_fragment>
//         // Liniowo, bez warunku (patrz komentarz przy map_fragment). Pasmo liczone
//         // raz na piksel; blask 0.40 — przy mocnej normal mapie (3.85) i kadrze
//         // 640x640 nizsza wartosc iskrzylaby sie w pojedynczych pikselach.
//         {
//           float mossT = mossBandT();
//           float slope = 1.0 - smoothstep(uMossWaterY - 0.5, uMossTopY, vMossWorldY);
//           float amount = uMossMode < 0.5 ? mossCoverageFromT(mossT) : (1.0 - mossT);
//           roughnessFactor = mix(roughnessFactor, 0.40, clamp(amount * uMossWet * max(slope, 0.0), 0.0, 1.0));
//         }`
//       );
//   };

//   // UWAGA (bug, ktory tu byl): trzy cache'uje PROGRAM per klucz, a klucz
//   // domyslny to tresc `onBeforeCompile` — identyczna dla wszystkich wywolan,
//   // wiec wszystkie cztery materialy (mur, schodki, zapadnie, chowane) dzielily
//   // JEDEN program. Trzy nie wywoluje wtedy onBeforeCompile dla kolejnych
//   // materialow, wiec obiekty uniformow pochodzily z PIERWSZEGO z nich i
//   // ustawienia przeciekaly miedzy typami schodkow (np. kwantyzacja 0.5 ze
//   // schodkow ladowala na murze -> skokowe pasma zamiast gladkiej sciany).
//   // Klucz MUSI kodowac konfiguracje, zeby kazdy wariant mial wlasne uniformy.
//   const cacheKey = [
//     "moss-gradient-v11",
//     options.mode === "darken" ? "darken" : "moss",
//     options.bottomY.toFixed(3),
//     options.topY.toFixed(3),
//     options.waterY.toFixed(3),
//     (options.strength ?? 1).toFixed(3),
//     (options.wet ?? 0.9).toFixed(3),
//     (options.quantizeStep ?? 0).toFixed(3),
//     (options.darkMin ?? 0.22).toFixed(3),
//     options.mudColor ?? "#3a3d3a",
//     options.slimeColor ?? "#4ade80",
//   ].join("|");
//   material.customProgramCacheKey = () => cacheKey;
//   material.needsUpdate = true;
// }

// // --- STAIRS MATERIAL ----------------------------------------------------------

// export function createStairsMaterial(_loader?: THREE.TextureLoader): THREE.Material {
//   const stepColorUrl = new URL("./textures/step/STEP_col.jpg", import.meta.url).href;
//   const stepNormalUrl = new URL("./textures/step/STEP_nrm.jpg", import.meta.url).href;

//   const repeat: [number, number] = [1.0, 1.0];
//   const stepOpts = { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat, anisotropy: 7 } as const;
//   const colorTexture = cachedColorMap(stepColorUrl, stepOpts);
//   const normalTexture = cachedNormalMap(stepNormalUrl, stepOpts);

//   return new THREE.MeshStandardMaterial({
//     map: colorTexture,
//     normalMap: normalTexture,
//     normalScale: new THREE.Vector2(10,10),
//     roughness: 1.0,
//     metalness: 0.1,
//   });
// }

// // --- ELEVATOR MATERIAL ----------------------------------------------------------

// export function createElevatorMaterial(): THREE.MeshStandardMaterial {
//   const liftColorUrl = new URL("./textures/lift/STEP_col.png", import.meta.url).href;
//   const liftNormalUrl = new URL("./textures/lift/STEP_nrm.png", import.meta.url).href;
//   const repeat: [number, number] = [1.0, 1.0];
//   // Wola per winda — z cache kolejne windy dziela te same tekstury.
//   const liftOpts = { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat, anisotropy: 7 } as const;
//   const colorTexture = cachedColorMap(liftColorUrl, liftOpts);
//   const normalTexture = cachedNormalMap(liftNormalUrl, liftOpts);

//   return new THREE.MeshStandardMaterial({
//     map: colorTexture,
//     normalMap: normalTexture,
//     normalScale: new THREE.Vector2(20, 20),
//     roughness: 0.3,
//     metalness: 0.5,
//   });
// }


// // --- ENEMY MATERIAL ----------------------------------------------------------

// export function createEnemyMaterial(): THREE.MeshStandardMaterial {
//   const enemyColorUrl = new URL("./textures/enemy/ENEMY_col.jpg", import.meta.url).href;
//   const enemyNormalUrl = new URL("./textures/enemy/ENEMY_nrm.jpg", import.meta.url).href;

//   // ClampToEdge jest domyslne w cached*Map, wiec wrap ustawia sie sam.
//   const colorTexture = cachedColorMap(enemyColorUrl);
//   const normalTexture = cachedNormalMap(enemyNormalUrl);

//   return new THREE.MeshStandardMaterial({
//     map: colorTexture,
//     normalMap: normalTexture,
//     normalScale: new THREE.Vector2(10.0, 10.0),
//     roughness: 0.55,
//     metalness: 0.25,
//   });
// }

// // --- DOOR FRAME ----------------------------------------------------------

// export function createCollapsingStairMaterial(): THREE.MeshStandardMaterial {
//   const colUrl = new URL("./textures/collapse/STEP_col.jpg", import.meta.url).href;
//   const nrmUrl = new URL("./textures/collapse/STEP_nrm.jpg", import.meta.url).href;

//   // TA SAMA siatka UV i te same ustawienia co schodek statyczny: repeat 1:1
//   // (bylo 1.5 — tekstura byla gestsza, wiec zapadnia wygladala jak inny material)
//   // i normalScale 10 (bylo 30 — mocno przedmuchana normalna dawala plaski,
//   // brudny kolor bez czytelnego swiatlocienia).
//   const repeat: [number, number] = [1, 1];
//   const collapseOpts = { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat, anisotropy: 7 } as const;
//   const colorTexture = cachedColorMap(colUrl, collapseOpts);
//   const normalTexture = cachedNormalMap(nrmUrl, collapseOpts);

//   return new THREE.MeshStandardMaterial({
//     map: colorTexture,
//     normalMap: normalTexture,
//     normalScale: new THREE.Vector2(10, 10),
//     roughness: 1.0, // bylo 0.9
//     // 0.4 -> 0.1: to byl glowny powod "plaskiego, brazowego, niereagujacego na
//     // swiatlo" — metal bez envMap zabiera 40% diffuse i nie ma z czego zrobic
//     // refleksu. Teraz zapadnia reaguje na swiatlo jak kazdy inny schodek.
//     metalness: 0.1,
//   });
// }


// // --- KLEJNOTY: SZLIF / BLYSK ---------------------------------------------------
// //
// // Problem: klejnot mial metalness 0.9, a scena ma scene.environment = null.
// // Metal bez odbicia nie ma ANI diffuse, ANI specularu, wiec w cieniu zostawal
// // sam obrys (dokladnie to bylo widac). Tu dochodzi tani, ale czytelny szlif:
// // jasnosc liczona z normalnej SCIANY (przy flatShading kazda sciana ma wlasna),
// // wiec bryle widac takze bez bezposredniego swiatla, a obracajacy sie klejnot
// // ma wedrujacy refleks. Koszt: kilka ALU w istniejacym shaderze, zero
// // dodatkowych draw calls i zero nowych tekstur.

// export interface GemGlowOptions {
//   /**
//    * Barwa poswiaty szlifu. Domyslnie dokladnie emisja klejnotu z repo
//    * (#d97706) — funkcja NIE wprowadza nowego koloru, tylko moduluje jasnosc
//    * istniejacej palety zaleznie od sciany.
//    */
//   coreColor?: string;
//   /** Mnoznik sily poswiaty (1 = wartosci domyslne). */
//   glow?: number;
//   /** Roznica jasnosci miedzy scianami szlifu. */
//   facetStrength?: number;
//   /** Sila wedrujacego blysku na scianach ustawionych w strone swiatla. */
//   glintStrength?: number;
// }

// export function applyGemGlow(material: THREE.MeshStandardMaterial, options: GemGlowOptions = {}): void {
//   const uniforms = {
//     uGemCore: { value: new THREE.Color(options.coreColor ?? "#d97706") },
//     uGemGlow: { value: options.glow ?? 1.0 },
//     uGemFacet: { value: options.facetStrength ?? 0.9 },
//     uGemGlint: { value: options.glintStrength ?? 0.9 },
//   };

//   material.onBeforeCompile = (shader) => {
//     Object.assign(shader.uniforms, uniforms);

//     shader.vertexShader = shader.vertexShader
//       .replace(
//         "#include <common>",
//         `#include <common>
//         varying vec3 vGemFaceNormal;`
//       )
//       .replace(
//         "#include <begin_vertex>",
//         `#include <begin_vertex>
//         // normalna w przestrzeni OBIEKTU: przy flatShading jest to dokladnie
//         // normalna sciany, wiec nie zalezy od ustawienia kamery
//         vGemFaceNormal = normal;`
//       );

//     shader.fragmentShader = shader.fragmentShader
//       .replace(
//         "#include <common>",
//         `#include <common>
//         uniform vec3 uGemCore;
//         uniform float uGemGlow;
//         uniform float uGemFacet;
//         uniform float uGemGlint;
//         varying vec3 vGemFaceNormal;`
//       )
//       .replace(
//         "#include <aomap_fragment>",
//         `#include <aomap_fragment>
//         {
//           vec3 gemFace = normalize( vGemFaceNormal );
//           // kazda sciana inna jasnosc -> widac bryle zamiast plaskiego obrysu
//           float facet = 0.5 + 0.5 * dot( gemFace, normalize( vec3( 0.45, 0.72, 0.53 ) ) );
//           // blysk na scianach skierowanych „ku swiatlu”; przy obrocie klejnotu
//           // (rotation.y w updateVisuals) wedruje po kolejnych scianach
//           float glint = pow( max( 0.0, dot( gemFace, normalize( vec3( 0.18, 0.94, 0.29 ) ) ) ), 6.0 );
//           // Tylko MODULACJA: bez skladnika stalego, wiec srednia jasnosc i barwa
//           // klejnotu zostaja takie jak w repo — zmienia sie jedynie to, ze
//           // sciany roznia sie jasnoscia (bryle widac takze w cieniu).
//           totalEmissiveRadiance += uGemCore * uGemGlow * ( facet * uGemFacet * 0.55 + glint * uGemGlint * 0.6 );
//         }`
//       );
//   };

//   // Ten sam powod co w applyMossGradient: klucz musi zawierac konfiguracje,
//   // inaczej dwa klejnoty o roznych ustawieniach podzielilyby jedna kompilacje
//   // i jeden zestaw uniformow.
//   const gemKey = [
//     "gem-glow-v3",
//     options.coreColor ?? "#d97706",
//     (options.glow ?? 1).toFixed(3),
//     (options.facetStrength ?? 0.9).toFixed(3),
//     (options.glintStrength ?? 0.9).toFixed(3),
//   ].join("|");
//   material.customProgramCacheKey = () => gemKey;
//   material.needsUpdate = true;
// }

// export function createTogglableStairMaterial(): THREE.MeshStandardMaterial {
//   const colUrl = new URL("./textures/step/STEP_col.jpg", import.meta.url).href;
//   const nrmUrl = new URL("./textures/step/STEP_nrm.jpg", import.meta.url).href;

//   // DOKLADNIE te same ustawienia tekstur co schodek statyczny
//   // (createStairsMaterial): RepeatWrapping + repeat 1:1 + anisotropy 7.
//   // Wczesniej bylo ClampToEdge bez repeat, a normalScale 20 zamiast 10 — stad
//   // "inaczej nalozona tekstura i inne ustawienie normal mapy".
//   const stepOpts = { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat: [1, 1] as [number, number], anisotropy: 7 };
//   const map = cachedColorMap(colUrl, stepOpts);
//   const normalMap = cachedNormalMap(nrmUrl, stepOpts);

//   return new THREE.MeshStandardMaterial({
//     map,
//     normalMap,
//     normalScale: new THREE.Vector2(10, 10), // bylo 20 — jak na schodku statycznym
//     roughness: 1.0,
//     // 0.3 -> 0.1: bez scene.environment metal oddaje czesc diffuse refleksowi,
//     // ktorego nie ma czym policzyc, wiec stopien ciemnial i "nie reagowal na
//     // swiatlo". 0.1 = zachowanie zwyklego drewnianego schodka.
//     metalness: 0.1,
//   });
// }


















import * as THREE from "three";

// ---------------------------------------------------------------------------
// Fallback proceduralny tekstur.
//
// Gra ładuje bitmapy z src/textures/*. Żeby działać w 100% offline (także bez
// oryginalnych plików), loadTextureSafe() opakowuje TextureLoader: przy błędzie
// pobrania każdy kolor staje się jednolitą teksturą canvas w bazowym kolorze
// materiału, a mapa normalnych — jednolitym niebieskim (128,128,255), czyli
// „płaską” powierzchnią. Geometria, cienie i oświetlenie pozostają nienaruszone.
// ---------------------------------------------------------------------------

const FALLBACK_COLORS: Record<string, string> = {
  door_col: "#5a6b78",
  STEP_col: "#a06e41",
  WALL_col: "#77828f",
  ENEMY_col: "#d23838",
  waternormals: "#8080ff",
  STEP_nrm: "#8080ff",
  door_nrm: "#8080ff",
  WALL_nrm: "#8080ff",
  ENEMY_nrm: "#8080ff",
};

function fallbackKey(url: string): string {
  const base = url.split("/").pop() ?? "";
  return base.replace(/\.(jpe?g|png)$/i, "");
}

function makeFallbackTexture(url: string): THREE.Texture {
  const key = fallbackKey(url);
  const colorHex = FALLBACK_COLORS[key] ?? (key.toLowerCase().includes("nrm") ? "#8080ff" : "#888888");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 4;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Ładuje teksturę; przy braku pliku / błędzie sieci podstawia jednolitą
 * teksturę canvas: kolor w bazowym odcieniu materiału, mapa normalnych jako
 * płaski niebieski (NoColorSpace).
 */
function loadTextureSafe(textureLoader: THREE.TextureLoader, url: string): THREE.Texture {
  const texture = textureLoader.load(url) as unknown as THREE.Texture;
  const onError = () => {
    try {
      const replacement = makeFallbackTexture(url);
      texture.image = replacement.image;
      texture.colorSpace = url.toLowerCase().includes("nrm")
        ? THREE.NoColorSpace
        : THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      // Diagnostyka: brak pliku = jednolity kolor (dla "nrm" płaski niebieski,
      // czyli powierzchnia BEZ rzeźby). Ten komunikat mówi wprost, którego
      // assetu brakuje, zamiast zgadywać ze screenu. Do usunięcia w każdej chwili.
      console.warn(`[textures] brak pliku — uzywam jednolitego fallbacku: ${url}`);
    } catch {
      // brak wsparcia canvas — zostawiamy domyślną (czarną) teksturę.
    }
  };
  // Three.js wywołuje onError po nieudanym fetchu; podpinamy się do DOM image.
  const rawImage = texture.image as unknown;
  const image = rawImage as HTMLImageElement | undefined;
  if (image && typeof image.addEventListener === "function") {
    image.addEventListener("error", onError, { once: true });
  }
  return texture;
}

// ---------------------------------------------------------------------------
// Wspólny loader, cache obrazów i memoizacja skonfigurowanych tekstur.
//
// Wszystkie fabryki materiałów korzystają z JEDNEGO loadera, obrazy przechodzą
// przez THREE.Cache (domyślnie wyłączony w three), a gotowe tekstury są
// memoizowane kluczem (url + wrap + repeat + anisotropy). Dzięki temu np.
// STEP_col/STEP_nrm jest dekodowany raz na sesję i dzielony przez wszystkie
// drzwi, windy, checkpointy i rodzaje stopni.
//
// UWAGA dla konsumentów: zwracane tekstury są WSPÓŁDZIELONE. Modyfikacja
// repeat/offset/center/rotation wymaga wcześniejszego texture.clone()
// (tak robią kij checkpointu, nadproże drzwi i kula wroga).
// ---------------------------------------------------------------------------
const sharedTextureLoader = new THREE.TextureLoader();
THREE.Cache.enabled = true;

interface TextureOptions {
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
  repeat?: [number, number];
  anisotropy?: number;
}

const configuredTextureCache = new Map<string, THREE.Texture>();

function textureKey(url: string, kind: "color" | "normal", opts: TextureOptions): string {
  return [
    url,
    kind,
    opts.wrapS ?? -1,
    opts.wrapT ?? -1,
    opts.repeat ? `${opts.repeat[0]}x${opts.repeat[1]}` : "-",
    opts.anisotropy ?? -1,
  ].join("|");
}

/** Mapa koloru z cache (klucz: url + ustawienia samplowania). */
function cachedColorMap(url: string, opts: TextureOptions = {}): THREE.Texture {
  const key = textureKey(url, "color", opts);
  const hit = configuredTextureCache.get(key);
  if (hit) return hit;
  const texture = configureColorMap(loadTextureSafe(sharedTextureLoader, url), opts);
  configuredTextureCache.set(key, texture);
  return texture;
}

/** Mapa normalnych z cache (klucz: url + ustawienia samplowania). */
function cachedNormalMap(url: string, opts: TextureOptions = {}): THREE.Texture {
  const key = textureKey(url, "normal", opts);
  const hit = configuredTextureCache.get(key);
  if (hit) return hit;
  const texture = configureNormalMap(loadTextureSafe(sharedTextureLoader, url), opts);
  configuredTextureCache.set(key, texture);
  return texture;
}

function configureColorMap(
  texture: THREE.Texture,
  opts: {
    wrapS?: THREE.Wrapping;
    wrapT?: THREE.Wrapping;
    repeat?: [number, number];
    anisotropy?: number;
  } = {}
): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = opts.wrapS ?? THREE.ClampToEdgeWrapping;
  texture.wrapT = opts.wrapT ?? THREE.ClampToEdgeWrapping;
  if (opts.repeat) texture.repeat.set(opts.repeat[0], opts.repeat[1]);
  if (opts.anisotropy !== undefined) texture.anisotropy = opts.anisotropy;
  return texture;
}

function configureNormalMap(
  texture: THREE.Texture,
  opts: {
    wrapS?: THREE.Wrapping;
    wrapT?: THREE.Wrapping;
    repeat?: [number, number];
    anisotropy?: number;
  } = {}
): THREE.Texture {
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = opts.wrapS ?? THREE.ClampToEdgeWrapping;
  texture.wrapT = opts.wrapT ?? THREE.ClampToEdgeWrapping;
  if (opts.repeat) texture.repeat.set(opts.repeat[0], opts.repeat[1]);
  if (opts.anisotropy !== undefined) texture.anisotropy = opts.anisotropy;
  return texture;
}

export function createElevatorRailMaterial(): THREE.MeshStandardMaterial {
  return createDoorFrameMaterial();
}

export function createDoorMaterial(): THREE.MeshStandardMaterial {
  const doorColorUrl = new URL("./textures/door/door_col.jpg", import.meta.url).href;
  const doorNormalUrl = new URL("./textures/door/door_nrm.jpg", import.meta.url).href;

  return new THREE.MeshStandardMaterial({
    map: cachedColorMap(doorColorUrl),
    normalMap: cachedNormalMap(doorNormalUrl),
    normalScale: new THREE.Vector2(30.0, 30.0),
    roughness: 1.0,
    metalness: 0.1,
  });
}

/** Drewniana rama drzwi i prowadnica windy — wspólna tekstura STEP_col/nrm. */
export function createDoorFrameMaterial(): THREE.MeshStandardMaterial {
  const frameColorUrl = new URL("./textures/step/STEP_col.jpg", import.meta.url).href;
  const frameNormalUrl = new URL("./textures/step/STEP_nrm.jpg", import.meta.url).href;

  const opts = {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    repeat: [0.5, 0.9] as [number, number],
    anisotropy: 7,
  };

  return new THREE.MeshStandardMaterial({
    map: cachedColorMap(frameColorUrl, opts),
    normalMap: cachedNormalMap(frameNormalUrl, opts),
    normalScale: new THREE.Vector2(30.0, 30.0),
    roughness: 1.0,
    metalness: 0.1,
  });
}

/** Mur wieży. UV: repeatU kafelków na obwód, repeatV na wysokość (rząd ~6 j.). */
export function createTowerMaterial(
  _loader?: THREE.TextureLoader,
  _radius: number = 6.12,
  _height: number = 52
): THREE.Material {
  const wallColorUrl = new URL("./textures/wall/WALL_col.jpg", import.meta.url).href;
  const wallNormalUrl = new URL("./textures/wall/WALL_nrm.jpg", import.meta.url).href;

  const repeatU = 7;
  const repeatV = Math.max(1, Math.ceil((_height || 52) / 6));

  const wallOpts = {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    repeat: [repeatU, repeatV] as [number, number],
    anisotropy: 7,
  };

  return new THREE.MeshStandardMaterial({
    map: cachedColorMap(wallColorUrl, wallOpts),
    normalMap: cachedNormalMap(wallNormalUrl, wallOpts),
    normalScale: new THREE.Vector2(3.85, 3.85),
    roughness: 1.0,
    metalness: 0.18,
  });
}

// --- OSAD NA MURZE I STOPNIACH -------------------------------------------------
//
// Gradient DWÓCH kolorów: CZARNY (dół) -> ZIELONY Glutka (góra), nałożony na
// pas przy wodzie. Mieszanie działa tak samo jak tint schodków
// (material.color.set("#4ade80" / "#ef4444")): kolor jest MNOŻONY z texelem
// mapy, więc spoiny i rysunek tekstury pozostają widoczne. Siła osadu na dole
// to 1 („opacity 1”), u góry 0. Dolny koniec leży poniżej lustra wody, dlatego
// miejsce złączenia nie jest widoczne — gradient „wychodzi” spod wody.

export interface MossGradientOptions {
  /** Światowe Y, gdzie osad ma pełną siłę („opacity 1”). */
  bottomY: number;
  /** Światowe Y, gdzie osad zanika do zera („opacity 0”). */
  topY: number;
  /** Poziom wody — koniec gradientu chowa się pod lustrem. */
  waterY: number;
  /** Maksymalna siła osadu (1 = pełne krycie tła, tekstura i tak przebija). */
  strength?: number;
  /**
   * Ile „mokrego połysku” dodaje pas osadu (0..1): obniża chropowatość, więc
   * powierzchnia łapie refleks. Ku górze pasa maleje do 0 (sucho).
   */
  wet?: number;
  /**
   * Dyskretna kwantyzacja wysokości (np. 0.5 = „co pół piętra”): kolor i krycie
   * są stałe w obrębie progu, więc każdy schodek dostaje jeden, skokowy odcień.
   * 0 = płynny gradient (mur).
   */
  quantizeStep?: number;
  /**
   * „moss” = tinta czarny -> zieleń Glutka mnożona z mapą.
   * „darken” = zachowuje istniejącą tintę schodka (czerwony/zielony stan
   * dźwigni) i tylko ją przyciemnia: im bardziej mokro, tym ciemniejsza.
   */
  mode?: "moss" | "darken";
  /** Przy trybie „darken”: mnożnik jasności na samym dole (im mniej, tym ciemniej). */
  darkMin?: number;
  /**
   * Minimalne albedo w pasie osadu (0 = brak podłogi). Czysta czerń ma albedo
   * 0, a 0 × światło = 0, więc dolny koniec gradientu nie odbijałby żadnego
   * światła. Wartość musi być MAŁA (0.05–0.1): podłoga jest barwiona zielenią
   * Glutka, więc wyższa zastępuje czerń zielenią i rampa czarny -> zielony
   * przestaje być czytelna.
   */
  shadowFloor?: number;
  /** Kolor CZARNY (dolny koniec gradientu, pełna siła). */
  mudColor?: string;
  /** Kolor ZIELONY Glutka (górna krawędź gradientu, zanik do zera). */
  slimeColor?: string;
}

export function applyMossGradient(material: THREE.Material, options: MossGradientOptions): void {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;

  const uniforms = {
    uMossBottomY: { value: options.bottomY },
    uMossTopY: { value: Math.max(options.topY, options.bottomY + 0.5) },
    uMossWaterY: { value: options.waterY },
    uMossStrength: { value: options.strength ?? 1.0 },
    uMossWet: { value: options.wet ?? 0.9 },
    uMossStep: { value: options.quantizeStep ?? 0.0 },
    uMossMode: { value: options.mode === "darken" ? 1.0 : 0.0 },
    uMossDarkMin: { value: options.darkMin ?? 0.22 },
    // Oba kolory są MNOŻNIKAMI (jak material.color schodków: color × mapa),
    // a nie farbami. #4ade80 to kolor powłoki Glutka z PlayerRig.
    uMossColor: { value: new THREE.Color(options.mudColor ?? "#3a3d3a") },
    uMossSlime: { value: new THREE.Color(options.slimeColor ?? "#4ade80") },
    uMossFloor: { value: options.shadowFloor ?? 0.0 },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vMossWorldY;
        varying float vMossAngle;
        varying float vMossUp;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          // Pozycja i kąt liczone w przestrzeni ŚWIATA: dla InstancedMesh
          // (schodki) przesunięcie każdego stopnia siedzi w instanceMatrix.
          #ifdef USE_INSTANCING
            vec4 mossLocal = instanceMatrix * vec4(transformed, 1.0);
          #else
            vec4 mossLocal = vec4(transformed, 1.0);
          #endif
          vec4 mossWorldPos = modelMatrix * mossLocal;
          vMossWorldY = mossWorldPos.y;
          vMossAngle = atan(mossWorldPos.z, mossWorldPos.x);
          // Składnik Y normalnej w przestrzeni OBIEKTU: 1 = góra stopnia,
          // 0 = pion (ściana wieży, boki stopni), -1 = spód. Bez transformacji
          // jest poprawny, bo instancje obraca się tylko wokół Y, a skala to
          // (x, 1, 1) — składowa Y normalnej się nie zmienia.
          vMossUp = normal.y;
        }`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uMossBottomY;
        uniform float uMossTopY;
        uniform float uMossWaterY;
        uniform float uMossStrength;
        uniform float uMossWet;
        uniform float uMossStep;
        uniform float uMossMode;
        uniform float uMossDarkMin;
        uniform float uMossFloor;
        uniform vec3 uMossColor;
        uniform vec3 uMossSlime;
        varying float vMossWorldY;
        varying float vMossAngle;
        varying float vMossUp;

        // 0.0 = dół (pełne krycie), 1.0 = góra (zero osadu).
        // uMossStep > 0 kwantyzuje wysokość, więc kolor i krycie są stałe
        // w obrębie progu — daje to dyskretne odcienie kolejnych stopni.
        float mossBandT() {
          float h = vMossWorldY;
          if (uMossStep > 0.0) h = uMossBottomY + floor((h - uMossBottomY) / uMossStep) * uMossStep;
          return clamp((h - uMossBottomY) / max(0.001, uMossTopY - uMossBottomY), 0.0, 1.0);
        }
        // Poszarpany, organiczny brzeg osadu.
        float mossRagged() {
          float a = 0.5 + 0.5 * sin(vMossAngle * 7.0 - vMossWorldY * 4.1);
          float b = 0.5 + 0.5 * sin(vMossAngle * 2.0 + vMossWorldY * 1.7 + 1.3);
          return clamp(a * 0.62 + b * 0.38, 0.0, 1.0);
        }
        // „Opacity” osadu z gotowego t — bez ponownego liczenia pasma.
        float mossCoverageFromT(float t) {
          float ragged = mix(1.0, 0.70 + 0.30 * mossRagged(), smoothstep(0.30, 0.70, t));
          return clamp((1.0 - t) * ragged, 0.0, 1.0);
        }
        // MNOŻNIK koloru z gotowego t: CZARNY przy dnie -> ZIELONY Glutka.
        vec3 mossFactorFromT(float t) {
          return mix(uMossColor, uMossSlime, smoothstep(0.0, 0.9, t));
        }
        // Ile „mokro” na danej wysokości (1 w pasie, 0 przy jego górnej krawędzi).
        // W trybie „moss” nosnikiem mokrości jest samo krycie osadu: ono już
        // wygasa 1 -> 0 przez cały pas, więc dodatkowe tłumienie wysokością
        // dawałoby podwójny spadek i środek pasa byłby suchy (stopnie na
        // gradiencie wyglądały na wysuszone). W trybie „darken” (stopnie
        // przełączane) wysokość jest nadal potrzebna, bo krycie tam nie maleje.
        float mossWetness() {
          float t = mossBandT();
          if (uMossMode < 0.5) return clamp(mossCoverageFromT(t) * uMossWet, 0.0, 1.0);
          float slope = 1.0 - smoothstep(uMossWaterY - 0.5, uMossTopY, vMossWorldY);
          return clamp((1.0 - t) * uMossWet * max(slope, 0.0), 0.0, 1.0);
        }`
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        // Kolor jest MNOŻONY z mapą (jak tint schodków), więc mapa zostaje pod
        // spodem, a spoiny i rysunek tekstury są widoczne także w czarnej strefie.
        //   moss   -> tinta CZARNY (parter) -> ZIELEŃ Glutka, krycie 1 -> 0
        //   darken -> zachowana tinta schodka jest tylko przyciemniana
        // Bez rozgałęzień: pasmo (mossBandT) liczone raz na piksel i przekazane
        // do obu funkcji; rozgałęzienie trybu jest jednorodne per materiał.
        float mossT = mossBandT();
        if (uMossMode < 0.5) {
          vec3 osad = mix(vec3(1.0), mossFactorFromT(mossT), clamp(mossCoverageFromT(mossT) * uMossStrength, 0.0, 1.0));
          // Podłoga albedo: czerń z zerowym albedo nie odbija światła, więc
          // zacieniona strona wieży byłaby nieczytelna. Barwiona zielenią, żeby
          // pas pozostał czarno-zielony, a nie szary.
          osad = max(osad, uMossSlime * uMossFloor);
          diffuseColor.rgb *= osad;
        } else {
          float darkAmt = clamp((1.0 - mossT) * uMossStrength, 0.0, 1.0);
          diffuseColor.rgb *= mix(1.0, uMossDarkMin, darkAmt);
        }`
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        // Mokry połysk: niższa chropowatość = ostrzejszy refleks słońca na
        // obmytej wodą powierzchni. Piony (ściana wieży, boki stopni) świecą
        // minimalnie mocniej niż góra stopnia.
        {
          float wet = mossWetness();
          float vertical = 1.0 - clamp(abs(vMossUp), 0.0, 1.0);
          float target = mix(0.38, 0.30, vertical);
          roughnessFactor = mix(roughnessFactor, target, wet);
        }`
      );
  };

  // Klucz programu MUSI kodować konfigurację: domyślny klucz three to treść
  // onBeforeCompile, identyczna dla wszystkich wywołań, więc mur, schodki
  // statyczne, zapadnie i schodki chowane dzieliłyby JEDEN program i JEDEN
  // zestaw uniformów (ustawienia jednego typu przeciekałyby na pozostałe).
  const cacheKey = [
    "moss-gradient-v19",
    options.mode === "darken" ? "darken" : "moss",
    options.bottomY.toFixed(3),
    options.topY.toFixed(3),
    options.waterY.toFixed(3),
    (options.strength ?? 1).toFixed(3),
    (options.wet ?? 0.9).toFixed(3),
    (options.quantizeStep ?? 0).toFixed(3),
    (options.darkMin ?? 0.22).toFixed(3),
    (options.shadowFloor ?? 0).toFixed(3),
    options.mudColor ?? "#3a3d3a",
    options.slimeColor ?? "#4ade80",
  ].join("|");
  material.customProgramCacheKey = () => cacheKey;
  material.needsUpdate = true;
}

// --- MATERIAŁ SCHODKÓW ---------------------------------------------------------

export function createStairsMaterial(_loader?: THREE.TextureLoader): THREE.Material {
  const stepColorUrl = new URL("./textures/step/STEP_col.jpg", import.meta.url).href;
  const stepNormalUrl = new URL("./textures/step/STEP_nrm.jpg", import.meta.url).href;

  const stepOpts = {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    repeat: [1.0, 1.0] as [number, number],
    anisotropy: 7,
  };

  return new THREE.MeshStandardMaterial({
    map: cachedColorMap(stepColorUrl, stepOpts),
    normalMap: cachedNormalMap(stepNormalUrl, stepOpts),
    normalScale: new THREE.Vector2(10, 10),
    roughness: 1.0,
    metalness: 0.1,
  });
}

// --- MATERIAŁ WINDY -----------------------------------------------------------

export function createElevatorMaterial(): THREE.MeshStandardMaterial {
  const liftColorUrl = new URL("./textures/lift/STEP_col.png", import.meta.url).href;
  const liftNormalUrl = new URL("./textures/lift/STEP_nrm.png", import.meta.url).href;

  const liftOpts = {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    repeat: [1.0, 1.0] as [number, number],
    anisotropy: 7,
  };

  return new THREE.MeshStandardMaterial({
    map: cachedColorMap(liftColorUrl, liftOpts),
    normalMap: cachedNormalMap(liftNormalUrl, liftOpts),
    normalScale: new THREE.Vector2(20, 20),
    roughness: 0.3,
    metalness: 0.5,
  });
}

// --- MATERIAŁ WROGA -----------------------------------------------------------

export function createEnemyMaterial(): THREE.MeshStandardMaterial {
  const enemyColorUrl = new URL("./textures/enemy/ENEMY_col.jpg", import.meta.url).href;
  const enemyNormalUrl = new URL("./textures/enemy/ENEMY_nrm.jpg", import.meta.url).href;

  // ClampToEdge to domyślne ustawienie cached*Map.
  return new THREE.MeshStandardMaterial({
    map: cachedColorMap(enemyColorUrl),
    normalMap: cachedNormalMap(enemyNormalUrl),
    normalScale: new THREE.Vector2(10.0, 10.0),
    roughness: 0.55,
    // Scena nie ma environment map, więc metal oddawałby część diffuse
    // refleksowi, którego nie ma czym policzyć — kolor ENEMY_col gasłby
    // do czerni, zwłaszcza w cieniu. 0.25 zostawia metaliczny błysk słońca.
    metalness: 0.25,
  });
}

// --- MATERIAŁ ZAPADNI ---------------------------------------------------------

export function createCollapsingStairMaterial(): THREE.MeshStandardMaterial {
  const collapseColorUrl = new URL("./textures/collapse/STEP_col.jpg", import.meta.url).href;
  const collapseNormalUrl = new URL("./textures/collapse/STEP_nrm.jpg", import.meta.url).href;

  // repeat 2: wzór kamienia jest o połowę mniejszy niż na schodku statycznym
  // (UV bryły zapadni jest identyczne jak w instancjach stopni, więc gęstość
  // wzoru reguluje wyłącznie ten mnożnik).
  const collapseOpts = {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    repeat: [2, 2] as [number, number],
    anisotropy: 7,
  };

  return new THREE.MeshStandardMaterial({
    map: cachedColorMap(collapseColorUrl, collapseOpts),
    normalMap: cachedNormalMap(collapseNormalUrl, collapseOpts),
    // 3: czytelna rzeźba kamienia. three mnoży TYLKO składowe styczne:
    //   mapN.xy *= normalScale;  normal = normalize( tbn * mapN );
    // Składowa Z tekstury wynosi maksymalnie 1, więc powyżej ~4 styczne XY
    // zaczynają dominować i normalna wychodzi prawie pozioma — oświetlenie
    // rozjeżdża się, a po uśrednieniu w kadrze powierzchnia wygląda płasko.
    // Wartości 10-30 (używane wcześniej) to właśnie ten efekt.
    normalScale: new THREE.Vector2(3, 3),
    roughness: 1.0,
    // Bez environment mapy metal zabiera diffuse, a refleksu nie ma z czego
    // policzyć — zapadnia przestawałaby reagować na światło.
    metalness: 0.1,
  });
}

// --- KLEJNOTY: SZLIF / BŁYSK ---------------------------------------------------
//
// Scena nie ma environment mapy, więc metaliczny klejnot nie miałby ani
// diffuse, ani specularu i w cieniu zostawałby sam obrys. applyGemGlow dodaje
// tani szlif: jasność liczona z normalnej ŚCIANY (przy flatShading każda ściana
// ma własną), więc bryłę widać także bez bezpośredniego światła, a obracający
// się klejnot ma wędrujący refleks. Koszt: kilka ALU w istniejącym shaderze,
// zero dodatkowych draw calls i zero nowych tekstur.

export interface GemGlowOptions {
  /**
   * Barwa poświaty szlifu. Domyślnie emisja klejnotu z repo (#d97706) —
   * funkcja nie wprowadza nowego koloru, tylko moduluje jasność istniejącej
   * palety zależnie od ściany.
   */
  coreColor?: string;
  /** Mnożnik siły poświaty (1 = wartości domyślne). */
  glow?: number;
  /** Różnica jasności między ścianami szlifu. */
  facetStrength?: number;
  /** Siła wędrującego błysku na ścianach ustawionych w stronę światła. */
  glintStrength?: number;
}

export function applyGemGlow(material: THREE.MeshStandardMaterial, options: GemGlowOptions = {}): void {
  const uniforms = {
    uGemCore: { value: new THREE.Color(options.coreColor ?? "#d97706") },
    uGemGlow: { value: options.glow ?? 1.0 },
    uGemFacet: { value: options.facetStrength ?? 0.9 },
    uGemGlint: { value: options.glintStrength ?? 0.9 },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vGemFaceNormal;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        // Normalna w przestrzeni OBIEKTU: przy flatShading to dokładnie
        // normalna ściany, więc nie zależy od ustawienia kamery.
        vGemFaceNormal = normal;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 uGemCore;
        uniform float uGemGlow;
        uniform float uGemFacet;
        uniform float uGemGlint;
        varying vec3 vGemFaceNormal;`
      )
      .replace(
        "#include <aomap_fragment>",
        `#include <aomap_fragment>
        {
          vec3 gemFace = normalize( vGemFaceNormal );
          // Każda ściana inna jasność -> widać bryłę zamiast płaskiego obrysu.
          float facet = 0.5 + 0.5 * dot( gemFace, normalize( vec3( 0.45, 0.72, 0.53 ) ) );
          // Błysk na ścianach skierowanych ku światłu; przy obrocie klejnotu
          // (rotation.y w updateVisuals) wędruje po kolejnych ścianach.
          float glint = pow( max( 0.0, dot( gemFace, normalize( vec3( 0.18, 0.94, 0.29 ) ) ) ), 6.0 );
          // Sama modulacja, bez składnika stałego: średnia jasność i barwa
          // klejnotu zostają takie jak w materiale, zmienia się tylko rozkład
          // jasności między ścianami.
          totalEmissiveRadiance += uGemCore * uGemGlow * ( facet * uGemFacet * 0.55 + glint * uGemGlint * 0.6 );
        }`
      );
  };

  // Jak w applyMossGradient: klucz koduje konfigurację, inaczej dwa klejnoty
  // o różnych ustawieniach dzieliłyby jedną kompilację i jeden zestaw uniformów.
  const gemKey = [
    "gem-glow-v3",
    options.coreColor ?? "#d97706",
    (options.glow ?? 1).toFixed(3),
    (options.facetStrength ?? 0.9).toFixed(3),
    (options.glintStrength ?? 0.9).toFixed(3),
  ].join("|");
  material.customProgramCacheKey = () => gemKey;
  material.needsUpdate = true;
}

// --- MATERIAŁ SCHODKÓW PRZEŁĄCZANYCH ------------------------------------------

export function createTogglableStairMaterial(): THREE.MeshStandardMaterial {
  const stepColorUrl = new URL("./textures/step/STEP_col.jpg", import.meta.url).href;
  const stepNormalUrl = new URL("./textures/step/STEP_nrm.jpg", import.meta.url).href;

  // Identyczne parametry tekstur jak schodek statyczny (createStairsMaterial),
  // żeby stopień na dźwigni wyglądał jak każdy inny.
  const stepOpts = {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    repeat: [1, 1] as [number, number],
    anisotropy: 7,
  };

  return new THREE.MeshStandardMaterial({
    map: cachedColorMap(stepColorUrl, stepOpts),
    normalMap: cachedNormalMap(stepNormalUrl, stepOpts),
    normalScale: new THREE.Vector2(10, 10),
    roughness: 1.0,
    // Bez environment mapy metal oddawałby diffuse refleksowi, którego nie ma
    // czym policzyć — stopień ciemniałby i przestawał reagować na światło.
    metalness: 0.1,
  });
}
