// ============================================================================
//  AMBIENT SPATIAL — pozycjonowanie dźwięków otoczenia względem gracza
// ============================================================================
//  • ambientSpatial()      — odległość (X/Y) i panorama stereo dla obiektu
//  • collectAmbientSources — lista ciągłych źródeł (wrogowie patrol, windy)
//                            do przekazania w soundEngine.updateAmbient()
//
//  OPTYMALIZACJA GC: wektory pomocnicze są alokowane statycznie, zero alokacji
//  obiektów THREE.Vector3 w pętli renderowania / dźwięku.
// ============================================================================

import * as THREE from "three";
import { FIXED_DT, stepToTheta, wrappedSignedDelta, wrappedStepDistance } from "../constants";
import type { ElevatorDef, HazardDef } from "../gameTypes";
import { ambientAttenuation, type AmbientSource } from "../../soundEngine";

export interface AmbientSpatial {
  xDist: number;
  yDist: number;
  /** -1 = lewo gracza … +1 = prawo (w układzie kamery). */
  pan: number;
}

/** Ile pól potrzeba do pełnego wychylenia lewo/prawo. */
const PAN_FULL_WIDTH = 3;

const _tempTangent = new THREE.Vector3();
const _tempRight = new THREE.Vector3();
const _rightBase = new THREE.Vector3(1, 0, 0);

/**
 * Odległość i panorama dźwięku obiektu w (objX, objY) względem gracza.
 * Zwraca null poza zasięgiem słuchu (X > 6,5 pola lub Y > 5,5).
 *
 * UWAGA: obiekt i gracz leżą na tym samym cylindrze, więc wektor między nimi
 * jest niemal styczny — kosinus kąta natychmiast skakałby do ±1. Dlatego
 * KIERUNEK bierzemy ze stabilnej stycznej w pozycji gracza, a WIELKOŚĆ pan
 * rośnie płynnie z odległością (prawdziwa przestrzeń stereo, nie przełącznik).
 */
export function ambientSpatial(
  objX: number,
  objY: number,
  playerX: number,
  playerY: number,
  camera: THREE.Camera
): AmbientSpatial | null {
  const xDist = wrappedStepDistance(objX, playerX);
  const yDist = Math.abs(objY - playerY);
  if (ambientAttenuation(xDist, yDist) <= 0) return null;

  const pTheta = stepToTheta(playerX);
  _tempTangent.set(Math.cos(pTheta), 0, -Math.sin(pTheta));
  _tempRight.copy(_rightBase).applyQuaternion(camera.quaternion);
  const screenSign = Math.sign(_tempTangent.dot(_tempRight)) || 1;

  const signedX = wrappedSignedDelta(playerX, objX);
  const pan = THREE.MathUtils.clamp((signedX / PAN_FULL_WIDTH) * screenSign, -1, 1);
  return { xDist, yDist, pan };
}

/** Ciągłe źródła: brzęczenie wrogów „patrol” i szmer jadących wind. */
export function collectAmbientSources(
  hazards: readonly HazardDef[],
  elevators: readonly ElevatorDef[],
  playerX: number,
  playerY: number,
  camera: THREE.Camera
): AmbientSource[] {
  const sources: AmbientSource[] = [];

  for (let i = 0; i < hazards.length; i++) {
    const haz = hazards[i];
    if (haz.behavior !== "patrol") continue;
    const info = ambientSpatial(haz.currentX, haz.bounceBaseY + 0.7, playerX, playerY, camera);
    if (info) sources.push({ id: `haz-${haz.id}`, kind: "patrol", ...info });
  }

  for (let i = 0; i < elevators.length; i++) {
    const elev = elevators[i];
    const prevTopY = (elev as unknown as { prevTopY?: number }).prevTopY ?? elev.currentTopY;
    const velocity = Math.abs(elev.currentTopY - prevTopY) / FIXED_DT;
    if (velocity < 0.05) continue; // winda stoi — silnik milczy
    // Winda: kąt liczony od ŚRODKA (x + width/2), tak jak siatka wizualna.
    const info = ambientSpatial(elev.x + elev.width * 0.5, elev.currentTopY, playerX, playerY, camera);
    if (info) sources.push({ id: `elev-${i}`, kind: "elevator", ...info, intensity: Math.min(1, velocity / 2.5) });
  }

  return sources;
}
