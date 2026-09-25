// ============================================================================
//  CAMERA RIG — kamera śledząca gracza / orbita menu
// ============================================================================
//  • tryb "play": kamera za graczem na obwodzie, z wyprzedzeniem w kierunku
//    ruchu (camLeadAngle) i miękkim śledzeniem w pionie (smoothCamY),
//  • tryb "menu": powolna orbita wokół wieży, liczona z czasu zegara.
//
//  OPTYMALIZACJA 60Hz / 144Hz / 240Hz / 360Hz:
//    Wygładzanie (lerp) używa tłumienia wykładniczego zależnego od delta-time:
//    `factor = 1 - Math.exp(-lambda * dt)`.
//    Dzięki temu kamera zachowuje DOKŁADNIE taką samą bezwładność i prędkość
//    reakcji na monitorze 60Hz, 144Hz, jak i 240Hz, a ruch jest idealnie płynny.
//
//  OPTYMALIZACJA GC:
//    Wektory pomocnicze są zaalokowane statycznie — zero alokacji w pętli renderu.
// ============================================================================

import * as THREE from "three";
import { CIRCUMFERENCE_STEPS, PLAYER_STAND_RADIUS, STEP_HEIGHT, TAU, stepToTheta } from "../constants";

export interface CameraFollowState {
  x: number;
  y: number;
  vx: number;
  grounded: boolean;
  facingRight: boolean;
  idleTimer: number;
  camLeadAngle: number;
  verticalLead: number;
  smoothCamY: number;
}

// Stałe tłumienia przeliczone ze współczynników 60Hz: lambda = -ln(1 - rate60) * 60
const DAMP_ORBIT = 3.71;      // odpowiada lerp(0.06) @ 60Hz
const DAMP_LEAD_WANT = 5.66;  // odpowiada lerp(0.09) @ 60Hz
const DAMP_LEAD_IDLE = 3.39;  // odpowiada lerp(0.055) @ 60Hz
const DAMP_VLEAD = 5.00;      // odpowiada lerp(0.08) @ 60Hz
const DAMP_CAMY_GND = 5.66;   // odpowiada lerp(0.09) @ 60Hz
const DAMP_CAMY_AIR = 2.76;   // odpowiada lerp(0.045) @ 60Hz
const DAMP_POS = 6.32;        // odpowiada lerp(0.1) @ 60Hz

function expDamp(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

const _focus = new THREE.Vector3();
const _camRadial = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _lookAtTarget = new THREE.Vector3();

export class CameraRig {
  private menuCamAngle = 0;

  constructor(
    public readonly camera: THREE.PerspectiveCamera,
    private readonly towerHeight: number
  ) {}

  /**
   * @param mode  "menu" | "play"
   * @param state stan gracza (mutowane pola kamery)
   * @param sec   czas zegara w sekundach
   * @param dt    delta-time klatki renderu w sekundach (dla ekranów > 60Hz)
   */
  public update(mode: "menu" | "play", state: CameraFollowState, sec: number, dt: number = 1 / 60) {
    const safeDt = Math.max(0.001, Math.min(dt, 0.1));

    if (mode === "menu") {
      this.menuCamAngle = (sec * 0.12) % TAU;
      const orbitRadius = 42;
      const orbitHeight = this.towerHeight * 0.55 + 6;
      _desired.set(
        Math.sin(this.menuCamAngle) * orbitRadius,
        orbitHeight,
        Math.cos(this.menuCamAngle) * orbitRadius
      );
      this.camera.position.lerp(_desired, 1 - Math.exp(-DAMP_ORBIT * safeDt));
      this.camera.lookAt(0, this.towerHeight * 0.5, 0);
      return;
    }

    const theta = stepToTheta(state.x);
    const isMoving = Math.abs(state.vx) > 0.1;
    const isGrounded = state.grounded;

    // Wyprzedzenie kątowe w kierunku ruchu (o jeden schodek).
    const stepAngle = TAU / CIRCUMFERENCE_STEPS;
    const dir = state.facingRight ? 1 : -1;
    const wantsLead = state.idleTimer < 1.0;
    const targetLead = wantsLead ? dir * stepAngle : 0;
    state.camLeadAngle = expDamp(
      state.camLeadAngle,
      targetLead,
      wantsLead ? DAMP_LEAD_WANT : DAMP_LEAD_IDLE,
      safeDt
    );
    const lead = state.camLeadAngle;

    // Lekkie podniesienie punktu skupienia podczas marszu.
    state.verticalLead = expDamp(
      state.verticalLead,
      isMoving && isGrounded ? STEP_HEIGHT * 0.2 : 0,
      DAMP_VLEAD,
      safeDt
    );
    state.smoothCamY = expDamp(
      state.smoothCamY,
      state.y,
      isGrounded ? DAMP_CAMY_GND : DAMP_CAMY_AIR,
      safeDt
    );

    _focus.set(
      Math.sin(theta + lead) * PLAYER_STAND_RADIUS,
      state.smoothCamY + 1.9 + state.verticalLead * 0.55,
      Math.cos(theta + lead) * PLAYER_STAND_RADIUS
    );
    const orbitTheta = theta + lead * 2;
    _camRadial.set(Math.sin(orbitTheta), 0, Math.cos(orbitTheta));
    const lookUp = 0.1;

    _desired.copy(_focus)
      .addScaledVector(_camRadial, 18.0)
      .add({ x: 0, y: 5 + lookUp, z: 0 });

    this.camera.position.lerp(_desired, 1 - Math.exp(-DAMP_POS * safeDt));

    _lookAtTarget.copy(_focus);
    _lookAtTarget.y += lookUp;
    this.camera.lookAt(_lookAtTarget);
  }
}
