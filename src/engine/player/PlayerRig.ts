// ============================================================================
//  PLAYER RIG — siatka i ANIMACJA postaci gracza (Glut Żelek)
// ============================================================================
//  TU szukaj wszystkiego, co dotyczy wyglądu i ruchu ludzika:
//    • build()        — hierarchia siatek: powłoka (torso), rdzeń brzucha,
//                       oczy, nos, usta, ręce, nogi, stopy, kropla na czubku
//    • update()       — animacja co klatkę: obrót, squash/stretch, oddech,
//                       chód, mruganie, błysk korony, PULS BRZUCHA
//    • BELLY_* stałe  — strojenie świecącego brzucha
//
//  OPTYMALIZACJA WYDAJNOŚCIOWA:
//    • Wsparcie monitorów 60Hz / 120Hz / 144Hz / 240Hz / 360Hz: obroty i
//      animacje korzystają z rzeczywistego `dt` klatki renderu.
//    • Zero alokacji obiektów Vector3 / Color w pętli renderowania.
// ============================================================================

import * as THREE from "three";
import { PLAYER_FOOT_OFFSET, PLAYER_STAND_RADIUS, TAU, stepToTheta } from "../constants";

/** Podzbiór playerState potrzebny do animacji. `facingYaw` jest mutowany. */
export interface PlayerVisualState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facingRight: boolean;
  idleTimer: number;
  walkCycle: number;
  jiggle: number;
  crownFlash: number;
  facingYaw: number;
}

/* ------------------------ ŚWIECĄCY BRZUCH — strojenie --------------------- */

/** Kolor rdzenia (jasna, cytrynowa zieleń — odcina się od powłoki #4ade80). */
const BELLY_COLOR = "#d9f99d";
/** Kolor emisji (to, co „świeci” i łapie bloom). */
const BELLY_EMISSIVE = "#86efac";
/** Bazowa jasność emisji; z bloomem ~1.0–1.6 daje miękką poświatę bez przepału. */
const BELLY_EMISSIVE_BASE = 1.15;
/** Amplituda oddechu jasności. */
const BELLY_EMISSIVE_PULSE = 0.35;
/** Tempo pulsu (rad/s) — spokojny „oddech” ~0,4 Hz. */
const BELLY_PULSE_RATE = 2.4;
/** Wysokość środka brzucha nad stopami (w lokalnym układzie ciała). */
const BELLY_LOCAL_Y = 0.78;
/** Promień rdzenia; powłoka ma ~0,5 w tym miejscu, więc rdzeń zostaje w środku. */
const BELLY_RADIUS = 0.21;
/** Światło punktowe z brzucha (miękko oświetla najbliższe schodki). */
const BELLY_LIGHT_COLOR = "#8aef86";
const BELLY_LIGHT_BASE = 0.55;
const BELLY_LIGHT_PULSE = 0.25;
const BELLY_LIGHT_DISTANCE = 3.5;

/** Lokalny Y stóp w układzie siatki ciała (powłoka zaczyna się od zera). */
const FOOT_LOCAL_Y = 0.52;

// Wektory i kolory pomocnicze (GC free)
const _radial = new THREE.Vector3();
const _goldCrown = new THREE.Color("#fbbf24");
const _greenCrown = new THREE.Color("#6ee7a8");
const _goldBelly = new THREE.Color("#fde68a");
const _baseBelly = new THREE.Color(BELLY_EMISSIVE);
const _goldHalo = new THREE.Color("#fbbf24");
const _baseLight = new THREE.Color(BELLY_LIGHT_COLOR);
const _goldLight = new THREE.Color("#fbbf24");
const _baseDropColor = new THREE.Color("#48ff00");
const _baseDropEmissive = new THREE.Color("#37ca0b");

export class PlayerRig {
  /** Mnożnik prędkości wizualnej animacji chodu. 2 = dwa razy szybciej. */
  public walkAnimationSpeed = 2.0;
  /** Pivot w punkcie stóp; pozycjonowany na obwodzie wieży. */
  public readonly group = new THREE.Group();
  /** Ciało (przesunięte o -PLAYER_FOOT_OFFSET względem pivotu). */
  private readonly body = new THREE.Group();

  private torso!: THREE.Mesh;
  private belly!: THREE.Mesh;
  private bellyHalo!: THREE.Mesh;
  private bellyLight!: THREE.PointLight;
  private topDrop!: THREE.Mesh;
  private leftEye!: THREE.Mesh;
  private rightEye!: THREE.Mesh;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private leftLowerLeg!: THREE.Group;
  private rightLowerLeg!: THREE.Group;
  private leftFoot!: THREE.Mesh;
  private rightFoot!: THREE.Mesh;

  private readonly gelMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.body.position.y = -PLAYER_FOOT_OFFSET;
    this.group.add(this.body);
    scene.add(this.group);

    this.gelMat = new THREE.MeshStandardMaterial({
      color: "#4ade80",
      emissive: "#000000",
      emissiveIntensity: 0.0,
      roughness: 0.18,
      metalness: 0.0,
      transparent: true,
      opacity: 0.82,
    });

    this.buildShell();
    this.buildBelly();
    this.buildFace();
    this.buildLimbs();
    this.buildTopDrop();
  }

  /* ================================ BUILD ================================= */

  /** Galaretowa powłoka — bryła obrotowa z profilu. */
  private buildShell() {
    // Podwinięta od dołu powłoka: podciągnięta o ~0.08 nad stopy, aby w spoczynku
    // stopy delikatnie wystawały spod brzuszka, a w skoku były widoczne w całości.
    // Dolny promień (szerokość) pozostaje nienaruszony (0.40 -> 0.49 -> 0.53),
    // a wysokość góry (2.05) i pozostałe wymiary się nie zmieniają.
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.0, 0.08),
      new THREE.Vector2(0.4, 0.08),
      new THREE.Vector2(0.49, 0.16),
      new THREE.Vector2(0.53, 0.32),
      new THREE.Vector2(0.51, 0.56),
      new THREE.Vector2(0.45, 0.86),
      new THREE.Vector2(0.385, 1.12),
      new THREE.Vector2(0.4, 1.36),
      new THREE.Vector2(0.415, 1.56),
      new THREE.Vector2(0.365, 1.76),
      new THREE.Vector2(0.265, 1.93),
      new THREE.Vector2(0.125, 2.02),
      new THREE.Vector2(0.0, 2.05),
    ].map((p) => new THREE.Vector2(p.x, p.y + FOOT_LOCAL_Y));
    const geo = new THREE.LatheGeometry(profile, 24);
    geo.scale(0.9, 1, 0.9);
    geo.computeVertexNormals();
    this.torso = new THREE.Mesh(geo, this.gelMat);
    this.torso.castShadow = true;
    this.torso.renderOrder = 1; // powłoka rysowana PO rdzeniu (rdzeń widać przez nią)
    this.body.add(this.torso);
  }

  /**
   * ŚWIECĄCY BRZUCH — rdzeń wewnątrz powłoki.
   * Trzy elementy: (1) rdzeń emisyjny, (2) miękkie halo addytywne,
   * (3) światło punktowe. Wszystkie są dziećmi torso, więc dziedziczą
   * squash/stretch — brzuch „oddycha” razem z powłoką.
   */
  private buildBelly() {
    // (1) Rdzeń — lekko spłaszczona kula, emisyjna.
    const coreGeo = new THREE.SphereGeometry(BELLY_RADIUS, 18, 14);
    coreGeo.scale(1.0, 1.15, 0.92);
    const coreMat = new THREE.MeshStandardMaterial({
      color: BELLY_COLOR,
      emissive: BELLY_EMISSIVE,
      emissiveIntensity: BELLY_EMISSIVE_BASE,
      roughness: 0.35,
      metalness: 0.0,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.belly = new THREE.Mesh(coreGeo, coreMat);
    this.belly.position.set(0, FOOT_LOCAL_Y + BELLY_LOCAL_Y, 0.02);
    this.belly.renderOrder = 0;
    this.torso.add(this.belly);

    // (2) Halo — większa, bardzo słaba kula z mieszaniem addytywnym.
    //     Rozmywa krawędź rdzenia w galarecie (poświata, nie „kulka”).
    const haloGeo = new THREE.SphereGeometry(BELLY_RADIUS * 1.75, 14, 12);
    haloGeo.scale(1.0, 1.25, 0.9);
    const haloMat = new THREE.MeshBasicMaterial({
      color: BELLY_EMISSIVE,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.bellyHalo = new THREE.Mesh(haloGeo, haloMat);
    this.bellyHalo.position.copy(this.belly.position);
    this.bellyHalo.renderOrder = 0;
    this.torso.add(this.bellyHalo);

    // (3) Światło z brzucha — nie rzuca cieni (koszt), mały zasięg.
    this.bellyLight = new THREE.PointLight(BELLY_LIGHT_COLOR, BELLY_LIGHT_BASE, BELLY_LIGHT_DISTANCE, 2);
    this.bellyLight.castShadow = false;
    this.bellyLight.position.copy(this.belly.position);
    this.torso.add(this.bellyLight);
  }

  private buildFace() {
    const eyeGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const eyeMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const pupilGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const pupilMat = new THREE.MeshBasicMaterial({ color: "#000000" });

    const makeEye = (x: number) => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, FOOT_LOCAL_Y + 1.64, 0.32);
      eye.renderOrder = 3;
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(0, 0, 0.05);
      pupil.renderOrder = 4;
      eye.add(pupil);
      this.torso.add(eye);
      return eye;
    };
    this.leftEye = makeEye(-0.13);
    this.rightEye = makeEye(0.13);

    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 10),
      new THREE.MeshStandardMaterial({ color: "#34d399", emissive: "#065f46", emissiveIntensity: 0.2, roughness: 0.25 })
    );
    nose.position.set(0, FOOT_LOCAL_Y + 1.52, 0.37);
    nose.renderOrder = 3;
    this.torso.add(nose);

    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.022, 8, 18, Math.PI),
      new THREE.MeshBasicMaterial({ color: "#34d399" })
    );
    // Torus jest częściowo schowany w powłoce twarzy: jego przednia krawędź
    // pozostaje czytelna, ale wystaje wyraźnie mniej niż kulisty nos.
    mouth.position.set(0, FOOT_LOCAL_Y + 1.44, 0.365);
    mouth.rotation.z = Math.PI;
    mouth.renderOrder = 3;
    this.torso.add(mouth);
  }

  private buildLimbs() {
    // Ręce
    const armGeo = new THREE.SphereGeometry(0.12, 10, 10);
    armGeo.scale(0.75, 1.7, 0.75);
    armGeo.translate(0, -0.17, 0);
    const makeArm = (x: number, rotZ: number) => {
      const arm = new THREE.Group();
      arm.position.set(x, FOOT_LOCAL_Y + 1.02, 0);
      arm.rotation.z = rotZ;
      const mesh = new THREE.Mesh(armGeo, this.gelMat);
      mesh.castShadow = true;
      arm.add(mesh);
      this.body.add(arm);
      return arm;
    };
    // Dół rąk rozchylony na zewnątrz (ujemny rotZ dla lewej, dodatni dla prawej):
    // punkt zaczepienia u góry pozostaje ten sam, dłonie odsuwają się od ciała.
    this.leftArm = makeArm(-0.36, -0.22);
    this.rightArm = makeArm(0.36, 0.22);

    // Nogi (biodro → podudzie)
    const stubGeo = new THREE.SphereGeometry(0.15, 10, 10);
    stubGeo.scale(1, 0.85, 1);
    stubGeo.translate(0, -0.1, 0);
    const makeLeg = (x: number) => {
      const hip = new THREE.Group();
      hip.position.set(x, FOOT_LOCAL_Y + 0.3, 0);
      const lower = new THREE.Group();
      lower.position.y = -0.08;
      const stub = new THREE.Mesh(stubGeo, this.gelMat);
      stub.castShadow = true;
      lower.add(stub);
      hip.add(lower);
      this.body.add(hip);
      return { hip, lower };
    };
    const l = makeLeg(-0.19);
    const r = makeLeg(0.19);
    this.leftLeg = l.hip;
    this.leftLowerLeg = l.lower;
    this.rightLeg = r.hip;
    this.rightLowerLeg = r.lower;

    // Stopy
    const footGeo = new THREE.SphereGeometry(0.15, 10, 10);
    footGeo.scale(1.05, 0.42, 1.35);
    footGeo.translate(0, 0.063, 0.03);
    const makeFoot = (x: number) => {
      const foot = new THREE.Mesh(footGeo, this.gelMat);
      foot.position.set(x, FOOT_LOCAL_Y, 0.02);
      foot.castShadow = true;
      this.body.add(foot);
      return foot;
    };
    this.leftFoot = makeFoot(-0.19);
    this.rightFoot = makeFoot(0.19);
  }

  /** Kropla na czubku — błyska złotem przy zebraniu diamentu (crownFlash). */
  private buildTopDrop() {
    const geo = new THREE.OctahedronGeometry(0.11, 0);
    geo.rotateZ(Math.PI / 6);
    const mat = new THREE.MeshStandardMaterial({
      color: "#27c10c",
      emissive: "#37ca0b",
      emissiveIntensity: 0.5,
      metalness: 1.0,
      roughness: 0.8,
    });
    this.topDrop = new THREE.Mesh(geo, mat);
    this.topDrop.position.y = FOOT_LOCAL_Y + 2.15;
    this.topDrop.castShadow = true;
    this.body.add(this.topDrop);
  }

  /* ================================ UPDATE ================================ */

  /**
   * Animacja postaci — wołana raz na klatkę renderu.
   * @param state  stan gracza (mutuje tylko `facingYaw`)
   * @param sec    czas zegara w sekundach (do oddechu / mrugania / pulsu)
   * @param dt     delta-time klatki renderu w sekundach (dla 60Hz/144Hz/240Hz)
   */
  public update(state: PlayerVisualState, sec: number, dt: number = 1 / 60) {
    const safeDt = Math.max(0.001, Math.min(dt, 0.1));

    // --- pozycja na obwodzie wieży ---
    const theta = stepToTheta(state.x);
    _radial.set(Math.sin(theta), 0, Math.cos(theta));
    this.group.position.set(_radial.x * PLAYER_STAND_RADIUS, state.y, _radial.z * PLAYER_STAND_RADIUS);

    // --- obrót ciała: bokiem gdy się rusza, przodem gdy stoi ---
    const idleThreshold = 1.0;
    const wantsSideways = state.idleTimer < idleThreshold;
    const baseYaw = Math.atan2(_radial.x, _radial.z);
    const targetYaw = wantsSideways ? baseYaw + (state.facingRight ? Math.PI / 2 : -Math.PI / 2) : baseYaw;
    let delta = targetYaw - state.facingYaw;
    delta = ((((delta + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    const turnRate = wantsSideways ? 18 : 6;
    state.facingYaw += Math.sign(delta) * Math.min(Math.abs(delta), turnRate * safeDt);
    this.group.rotation.set(0, state.facingYaw, 0);

    // --- squash / stretch / oddech ---
    const isGrounded = state.grounded;
    const isMoving = Math.abs(state.vx) > 0.1;
    const breatheSway = !isMoving && isGrounded ? Math.sin(sec * 4.5) * 0.025 : 0;
    const airStretch = !isGrounded ? THREE.MathUtils.clamp(state.vy / 40, -0.1, 0.1) : 0;
    const squashY = airStretch + state.jiggle;
    const scaleY = 1.0 + breatheSway + squashY;
    const scaleXZ = 1.0 - (breatheSway + squashY) * 0.5;
    this.torso.scale.set(scaleXZ, scaleY, scaleXZ);
    this.body.position.y = -PLAYER_FOOT_OFFSET;

    const footSpread = 1 - squashY * 0.8;
    this.leftFoot.scale.set(footSpread, 1 + squashY * 0.35, footSpread);
    this.rightFoot.scale.set(footSpread, 1 + squashY * 0.35, footSpread);

    // --- ŚWIECĄCY BRZUCH: puls + reakcja na ruch ---
    this.updateBelly(state, sec, squashY, isGrounded);

    // --- kropla na czubku ---
    this.topDrop.position.y = PLAYER_FOOT_OFFSET + 2.15 + state.jiggle * 0.55 + breatheSway * 1.5;
    this.topDrop.rotation.y += safeDt * 1.6;
    this.topDrop.rotation.z = Math.sin(sec * 3.1) * 0.16 - state.vx * 0.05;
    this.topDrop.scale.set(1 - squashY * 0.4, 1 + squashY * 0.8, 1 - squashY * 0.4);
    const dropMat = this.topDrop.material as THREE.MeshStandardMaterial;
    if (state.crownFlash > 0) {
      const t = 1 - state.crownFlash / 0.2;
      dropMat.color.lerpColors(_goldCrown, _greenCrown, t);
      dropMat.emissive.set(_greenCrown.clone().multiplyScalar(0.3).lerp(_goldCrown.clone().multiplyScalar(0.6), 1 - t));
      dropMat.emissiveIntensity = 0.85 - t * 0.55;
      this.topDrop.scale.multiplyScalar(1 + (1 - t) * 0.85);
    } else {
      dropMat.color.copy(_baseDropColor);
      dropMat.emissive.copy(_baseDropEmissive);
      dropMat.emissiveIntensity = 0.5;
    }

    // --- mruganie ---
    const isBlinking = sec % 3.5 < 0.15;
    this.leftEye.scale.y = isBlinking ? 0.08 : 1.0;
    this.rightEye.scale.y = isBlinking ? 0.08 : 1.0;

    // --- ręce / nogi ---
    if (isGrounded && isMoving) {
      const walkPhase = state.walkCycle * this.walkAnimationSpeed;
      const stride = Math.sin(walkPhase);

      this.leftArm.rotation.x = stride * 0.48;
      this.rightArm.rotation.x = -stride * 0.48;
      this.leftLeg.rotation.x = -stride * 0.24;
      this.rightLeg.rotation.x = stride * 0.24;
      this.leftLowerLeg.rotation.x = Math.max(0, stride) * 0.55;
      this.rightLowerLeg.rotation.x = Math.max(0, -stride) * 0.55;
      this.leftFoot.rotation.x = stride * 0.28;
      this.rightFoot.rotation.x = -stride * 0.28;
    } else {
      this.leftArm.rotation.x = breatheSway * 1.5;
      this.rightArm.rotation.x = -breatheSway * 1.5;
      if (!isGrounded) {
        this.leftLeg.rotation.x = -0.12;
        this.rightLeg.rotation.x = 0.08;
        this.leftLowerLeg.rotation.x = 0.5;
        this.rightLowerLeg.rotation.x = 0.42;
      } else {
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        this.leftLowerLeg.rotation.x = 0;
        this.rightLowerLeg.rotation.x = 0;
      }
      this.leftFoot.rotation.x = 0;
      this.rightFoot.rotation.x = 0;
    }
  }

  /**
   * Puls brzucha:
   *  • spokojny oddech jasności (sinus),
   *  • w locie jaśniej (energia), po lądowaniu krótkie „zgniecenie” z jiggle,
   *  • przy błysku korony (diament) rdzeń zalewa się złotem,
   *  • rdzeń skaluje się ODWROTNIE do powłoki — zostaje w środku i wygląda,
   *    jakby galareta ściskała się wokół niego.
   */
  private updateBelly(state: PlayerVisualState, sec: number, squashY: number, isGrounded: boolean) {
    const mat = this.belly.material as THREE.MeshStandardMaterial;
    const haloMat = this.bellyHalo.material as THREE.MeshBasicMaterial;

    const pulse = 0.5 + 0.5 * Math.sin(sec * BELLY_PULSE_RATE);
    const airBoost = isGrounded ? 0 : 0.25;
    const impactBoost = Math.max(0, -state.jiggle) * 1.8; // zgniecenie → rozbłysk

    let intensity = BELLY_EMISSIVE_BASE + BELLY_EMISSIVE_PULSE * pulse + airBoost + impactBoost;
    let lightIntensity = BELLY_LIGHT_BASE + BELLY_LIGHT_PULSE * pulse + airBoost * 0.6 + impactBoost * 0.5;

    if (state.crownFlash > 0) {
      const t = 1 - state.crownFlash / 0.2; // 0 → 1 w trakcie gaśnięcia
      mat.emissive.lerpColors(_goldBelly, _baseBelly, t);
      haloMat.color.lerpColors(_goldHalo, _baseBelly, t);
      this.bellyLight.color.lerpColors(_goldLight, _baseLight, t);
      intensity += (1 - t) * 1.4;
      lightIntensity += (1 - t) * 0.9;
    } else {
      mat.emissive.set(BELLY_EMISSIVE);
      haloMat.color.set(BELLY_EMISSIVE);
      this.bellyLight.color.set(BELLY_LIGHT_COLOR);
    }

    mat.emissiveIntensity = intensity;
    haloMat.opacity = 0.11 + 0.08 * pulse + impactBoost * 0.08;
    this.bellyLight.intensity = lightIntensity;

    // Skala odwrotna do powłoki (powłoka: Y = 1+squash, XZ = 1-squash/2).
    const inv = 1 - squashY * 0.45;
    const invXZ = 1 + squashY * 0.25;
    const breathe = 1 + 0.04 * pulse;
    this.belly.scale.set(invXZ * breathe, inv * breathe, invXZ * breathe);
    this.bellyHalo.scale.copy(this.belly.scale);
  }

  /* =============================== DISPOSE ================================ */

  public dispose() {
    this.group.removeFromParent();
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
  }
}
