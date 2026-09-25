// ============================================================================
//  PARTICLE SYSTEM — iskry (skok, lądowanie, diament, drzwi, kolizje)
// ============================================================================
//  Jedna siatka THREE.Points z buforem `maxParticles`. Cząsteczki mają
//  grawitację, opór i opcjonalną podłogę (floorY), na której się osadzają.
// ============================================================================

import * as THREE from "three";
import { GRAVITY, JUMP_SPEED, TAU } from "../constants";
import type { Particle } from "../gameTypes";

export type ParticleMode = "burst" | "jump" | "land";

type SimParticle = Particle & { floorY?: number | null; gravityScale?: number; drag?: number };

export class ParticleSystem {
  private readonly particles: SimParticle[] = [];
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly points: THREE.Points;

  constructor(scene: THREE.Scene, private readonly maxParticles = 250) {
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /**
   * @param mode  "jump" — trail w górę; "land" — wybuch spod stóp na boki; "burst" — kulisty
   * @param floorY podłoga, na której iskry się osadzają (null = spadają bez końca)
   */
  public spawn(
    pos: THREE.Vector3,
    count: number,
    colorHex: number | string,
    speed = 2.5,
    mode: ParticleMode = "burst",
    floorY: number | null = null
  ) {
    const color = new THREE.Color(colorHex);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) this.particles.shift();

      let offset: THREE.Vector3;
      let vel: THREE.Vector3;
      let maxLife: number;
      let gravityScale: number;
      let drag = 0;

      if (mode === "jump") {
        offset = new THREE.Vector3((Math.random() - 0.5) * 0.25, Math.random() * 0.12, (Math.random() - 0.5) * 0.25);
        vel = new THREE.Vector3((Math.random() - 0.5) * speed * 0.35, JUMP_SPEED * (0.22 + Math.random() * 0.22), (Math.random() - 0.5) * speed * 0.35);
        maxLife = 0.9 + Math.random() * 0.6;
        gravityScale = 0.75;
        drag = 0.6;
      } else if (mode === "land") {
        const angle = Math.random() * TAU;
        const outward = 0.55 + Math.random() * 0.9;
        offset = new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.02 + Math.random() * 0.08, (Math.random() - 0.5) * 0.2);
        vel = new THREE.Vector3(Math.cos(angle) * outward * speed, speed * (0.55 + Math.random() * 0.75), Math.sin(angle) * outward * speed);
        maxLife = 0.45 + Math.random() * 0.4;
        gravityScale = 0.55;
        drag = 1.4;
      } else {
        offset = new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3);
        vel = new THREE.Vector3((Math.random() - 0.5) * speed, speed * (0.3 + Math.random() * 0.9), (Math.random() - 0.5) * speed);
        maxLife = 0.6 + Math.random() * 0.5;
        gravityScale = 0.7;
        drag = 0.5;
      }

      this.particles.push({
        pos: pos.clone().add(offset),
        vel,
        color: color.clone(),
        size: 0.15 + Math.random() * 0.15,
        life: 0,
        maxLife,
        floorY,
        gravityScale,
        drag,
      });
    }
  }

  public update(dt: number) {
    let active = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      const drag = p.drag ?? 0;
      if (drag > 0) {
        const damp = Math.exp(-drag * dt);
        p.vel.x *= damp;
        p.vel.z *= damp;
      }
      p.vel.y -= GRAVITY * (p.gravityScale ?? 0.3) * dt;
      p.pos.addScaledVector(p.vel, dt);

      // Nie przenikaj przez schodek — osiądź na nim z lekkim odbiciem.
      if (p.floorY != null && p.pos.y < p.floorY + 0.02) {
        p.pos.y = p.floorY + 0.02;
        if (p.vel.y < 0) p.vel.y *= -0.18;
        p.vel.x *= 0.82;
        p.vel.z *= 0.82;
      }

      const idx = active * 3;
      this.positions[idx] = p.pos.x;
      this.positions[idx + 1] = p.pos.y;
      this.positions[idx + 2] = p.pos.z;
      const alpha = 1 - p.life / p.maxLife;
      this.colors[idx] = p.color.r * alpha;
      this.colors[idx + 1] = p.color.g * alpha;
      this.colors[idx + 2] = p.color.b * alpha;
      active++;
    }
    const geo = this.points.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.setDrawRange(0, active);
  }

  public dispose() {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
