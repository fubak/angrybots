import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GrokBot } from './entities/GrokBot';
import { Block } from './entities/Block';
import { Pig } from './entities/Pig';
import { PhysicsWorld } from './systems/PhysicsWorld';
import { SlingSystem } from './systems/SlingSystem';
import { CameraRig } from './systems/CameraRig';
import { JuiceSystem } from './systems/JuiceSystem';
import { AudioSystem } from './systems/AudioSystem';
import { LEVEL_1, blockVector } from './levels/level1';
import {
  GROK_BOT_RADIUS,
  MATERIAL,
  SLING_ANCHOR,
  SIDE_VIEW,
  type BlockMaterial,
} from './config';
import { clamp } from './math';
import { grassMaterial, loadAbTextures } from './visuals/abTextures';

function blockAtBody(blocks: Block[], body: CANNON.Body): Block | undefined {
  return blocks.find((b) => !b.dead && b.body === body);
}

function pigAtBody(pigs: Pig[], body: CANNON.Body): Pig | undefined {
  return pigs.find((p) => !p.dead && p.body === body);
}

const MAX_SHOTS = 3;

type ParallaxLayer = {
  root: THREE.Object3D;
  factor: number;
  baseX: number;
};

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly renderer: THREE.WebGLRenderer;
  private physics = new PhysicsWorld();
  private sling: SlingSystem;
  private cameraRig: CameraRig;
  private juice: JuiceSystem;
  private audio = new AudioSystem();
  private bot: GrokBot;
  private blocks: Block[] = [];
  private pigs: Pig[] = [];
  private hud: HTMLElement;
  private settledTimer = 0;
  private shotsLeft = 3;
  private won = false;
  private pendingBlockRemovals: Block[] = [];
  private pendingPigRemovals: Pig[] = [];
  private launchedThisShot = false;
  /** Suppress spawn settle from triggering break/damage logic. */
  private structureWarmup = 1.8;
  private playerHasShot = false;
  private flightTimer = 0;
  private flightPeakX = -Infinity;
  private lastFlightPeakX: number | null = null;
  private parallax: ParallaxLayer[] = [];
  private readonly cameraHomeX = SIDE_VIEW.centerX;
  private readonly pigGoal = LEVEL_1.pigs.length;

  constructor(container: HTMLElement) {
    this.scene.background = this.makeSkyGradient();
    // Side camera sits at z≈42; linear fog near 22–48 washed the whole playfield.
    this.scene.fog = null;

    const aspect = window.innerWidth / window.innerHeight;
    const fh = SIDE_VIEW.frustumHeight;
    this.camera = new THREE.OrthographicCamera(
      (-fh * aspect) / 2,
      (fh * aspect) / 2,
      fh / 2,
      -fh / 2,
      0.1,
      100
    );
    this.camera.position.set(
      SIDE_VIEW.centerX,
      SIDE_VIEW.centerY,
      SIDE_VIEW.cameraZ
    );
    this.camera.lookAt(SIDE_VIEW.centerX, SIDE_VIEW.centerY, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    this.sling = new SlingSystem(this.scene, this.camera);
    this.sling.bind(this.renderer.domElement);
    this.cameraRig = new CameraRig(this.camera);
    this.juice = new JuiceSystem(this.scene);

    loadAbTextures();
    this.setupLights();
    this.setupParallax();
    this.setupEnvironment();
    this.buildLevel();
    this.lockCastle();
    this.bot = new GrokBot(this.physics.world);
    this.scene.add(this.bot.group);
    this.physics.setupMaterials(this.blocks, this.pigs);
    this.bindCollisions();

    this.hud = document.createElement('div');
    this.hud.id = 'hud';
    container.appendChild(this.hud);
    this.updateHud();

    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('pointerdown', () =>
      this.audio.unlock()
    );
  }

  private makeSkyGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#2a6dad');
    g.addColorStop(0.45, '#6ec4f0');
    g.addColorStop(1, '#9ed8f7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private setupLights() {
    const hemi = new THREE.HemisphereLight(0xb8dcff, 0x4a8a3a, 0.42);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4e8, 1.28);
    sun.position.set(-4, 8, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -5;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc8e0ff, 0.22);
    fill.position.set(10, 6, 14);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffddbb, 0.18);
    rim.position.set(6, 4, -8);
    this.scene.add(rim);
  }

  private setupParallax() {
    const addLayer = (factor: number, build: (g: THREE.Group) => void) => {
      const root = new THREE.Group();
      build(root);
      this.scene.add(root);
      this.parallax.push({ root, factor, baseX: root.position.x });
    };

    addLayer(0.08, (g) => {
      g.position.set(0, 0, -22);
      const hillMat = new THREE.MeshStandardMaterial({
        color: 0x6aab62,
        roughness: 1,
        flatShading: true,
      });
      for (const [x, s] of [
        [-14, 1.4],
        [-4, 1.8],
        [6, 1.5],
        [16, 1.3],
      ] as const) {
        const hill = new THREE.Mesh(
          new THREE.ConeGeometry(5 * s, 3.5 * s, 5),
          hillMat
        );
        hill.position.set(x, 1.2 * s, 0);
        hill.rotation.y = x * 0.05;
        g.add(hill);
      }
    });

    addLayer(0.14, (g) => {
      g.position.set(0, 0, -16);
      const hillMat = new THREE.MeshStandardMaterial({
        color: 0x4f9a48,
        roughness: 1,
        flatShading: true,
      });
      for (const [x, s] of [
        [-10, 1.1],
        [2, 1.35],
        [12, 1.05],
      ] as const) {
        const hill = new THREE.Mesh(
          new THREE.ConeGeometry(4.5 * s, 2.8 * s, 5),
          hillMat
        );
        hill.position.set(x, 0.9 * s, 0);
        g.add(hill);
      }
    });

    addLayer(0.22, (g) => {
      g.position.set(0, 5.5, -12);
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1,
        transparent: true,
        opacity: 0.92,
        flatShading: true,
      });
      for (const [x, y, s] of [
        [-6, 0, 1],
        [4, 0.4, 0.85],
        [14, -0.2, 1.1],
      ] as const) {
        const cloud = new THREE.Group();
        for (const [ox, oy, r] of [
          [0, 0, 0.55],
          [-0.5, -0.1, 0.4],
          [0.55, -0.05, 0.45],
        ] as const) {
          const puff = new THREE.Mesh(
            new THREE.SphereGeometry(r * s, 6, 5),
            cloudMat
          );
          puff.position.set(ox * s, oy * s, 0);
          cloud.add(puff);
        }
        cloud.position.set(x, y, 0);
        g.add(cloud);
      }
    });
  }

  private updateParallax() {
    const dx = this.camera.position.x - this.cameraHomeX;
    for (const layer of this.parallax) {
      layer.root.position.x = layer.baseX + dx * layer.factor;
    }
  }

  private setupEnvironment() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 20),
      grassMaterial()
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 3),
      new THREE.MeshStandardMaterial({ color: 0x4d8a3f, roughness: 1 })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.01, -4);
    strip.receiveShadow = true;
    this.scene.add(strip);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.12, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x8a7355, roughness: 0.9 })
    );
    pad.position.set(5.35, 0.06, 0);
    pad.receiveShadow = true;
    this.scene.add(pad);

    const slingBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.7, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x5c4033 })
    );
    slingBase.position.set(SLING_ANCHOR.x, 0.3, 0);
    this.scene.add(slingBase);

    const forkMat = new THREE.MeshStandardMaterial({
      color: 0x6b4f38,
      roughness: 0.88,
    });
    for (const x of [-0.35, 0.35]) {
      const fork = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8),
        forkMat
      );
      fork.position.set(SLING_ANCHOR.x + x, 1.1, 0);
      fork.rotation.z = x < 0 ? 0.25 : -0.25;
      this.scene.add(fork);
    }
  }

  private lockCastle() {
    for (const b of this.blocks) b.lockPhysics();
    for (const p of this.pigs) p.lockPhysics();
  }

  private buildLevel() {
    for (const b of LEVEL_1.blocks) {
      const { size, pos, rot } = blockVector(b);
      this.blocks.push(
        new Block(
          this.physics.world,
          this.scene,
          b.material,
          size,
          pos,
          rot
        )
      );
    }
    for (const [x, y] of LEVEL_1.pigs) {
      this.pigs.push(new Pig(this.physics.world, this.scene, x, y));
    }
  }

  private audioImpactForMaterial(material: BlockMaterial, impulse: number) {
    let norm = Math.min(impulse / (material === 'stone' ? 14 : 18), 1);
    if (material === 'stone') norm = 0.35 + norm * 0.65;
    if (material === 'glass') norm *= 0.75;
    this.audio.impact(norm, material);
  }

  private damageBlockFromHit(
    block: Block,
    impulse: number,
    hitPos: THREE.Vector3,
    chainFromBreak = false
  ) {
    if (this.structureWarmup > 0) return;
    const def = MATERIAL[block.materialType];
    let effectiveImpulse = impulse;
    if (this.playerHasShot) {
      const fallSpeed = Math.abs(block.body.velocity.y);
      if (fallSpeed > def.fallSpeedThreshold) {
        effectiveImpulse +=
          (fallSpeed - def.fallSpeedThreshold) * def.fallDamageScale * 0.08;
      }
    }
    if (effectiveImpulse <= def.minImpulse) return;

    const damage = effectiveImpulse * def.damageScale;
    if (damage <= def.minDamage) return;

    block.applyDamage(damage, effectiveImpulse);
    const hitStrength = clamp(
      effectiveImpulse / (block.materialType === 'stone' ? 20 : 14),
      0.12,
      1
    );
    this.audioImpactForMaterial(block.materialType, effectiveImpulse);
    this.juice.impact(hitPos, hitStrength, def.color);
    this.cameraRig.shakeFromImpulse(
      effectiveImpulse * (block.materialType === 'stone' ? 0.75 : 1)
    );

    if (block.dead) {
      this.breakBlock(block, hitPos, effectiveImpulse, chainFromBreak);
    }
  }

  private breakBlock(
    block: Block,
    hitPos: THREE.Vector3,
    impulse: number,
    skipChain = false
  ) {
    const wasExplosive = block.materialType === 'explosive';
    this.pendingBlockRemovals.push(block);
    block.playBreakJuice(this.juice, hitPos, impulse);
    this.audio.breakBlock(block.materialType);
    this.cameraRig.addShake(
      block.materialType === 'glass'
        ? 0.28
        : block.materialType === 'stone'
          ? 0.18
          : block.materialType === 'explosive'
            ? 0.55
            : 0.22
    );

    if (wasExplosive) {
      this.detonateExplosive(hitPos);
    }

    if (skipChain) return;

    const def = MATERIAL[block.materialType];
    for (const other of this.blocks) {
      if (other === block || other.dead) continue;
      const dx = other.body.position.x - hitPos.x;
      const dy = other.body.position.y - hitPos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > def.chainRadius || dist < 0.05) continue;

      const falloff = 1 - dist / def.chainRadius;
      const chainImpulse = impulse * falloff * def.chainDamageScale;
      const otherPos = new THREE.Vector3(
        other.body.position.x,
        other.body.position.y,
        other.body.position.z
      );
      this.damageBlockFromHit(other, chainImpulse, otherPos, true);

      const push = chainImpulse * 0.08;
      other.body.applyImpulse(
        new CANNON.Vec3((dx / dist) * push, (dy / dist) * push, 0),
        other.body.position
      );
      if (other.materialType === 'glass') {
        other.body.angularVelocity.z += (Math.random() - 0.5) * falloff * 4;
      }
    }
  }

  /** AB-style TNT burst — wakes and shoves nearby bodies. */
  private detonateExplosive(center: THREE.Vector3) {
    const def = MATERIAL.explosive;
    this.audio.explosion();
    this.juice.burst(center, 0xff4400, 36);
    this.juice.burst(center, 0xffee88, 24);
    this.cameraRig.addShake(0.75);

    for (const block of this.blocks) {
      if (block.dead || block === undefined) continue;
      const dx = block.body.position.x - center.x;
      const dy = block.body.position.y - center.y;
      const dist = Math.hypot(dx, dy);
      if (dist > def.blastRadius || dist < 0.02) continue;
      block.forceWake();
      const falloff = 1 - dist / def.blastRadius;
      const blastImpulse = def.blastImpulse * falloff;
      const pos = new THREE.Vector3(
        block.body.position.x,
        block.body.position.y,
        0
      );
      this.damageBlockFromHit(block, blastImpulse, pos, true);
      block.body.applyImpulse(
        new CANNON.Vec3((dx / dist) * blastImpulse * 0.12, (dy / dist) * blastImpulse * 0.12, 0),
        block.body.position
      );
    }

    for (const pig of this.pigs) {
      if (pig.dead) continue;
      const dx = pig.body.position.x - center.x;
      const dy = pig.body.position.y - center.y;
      const dist = Math.hypot(dx, dy);
      if (dist > def.blastRadius) continue;
      pig.forceWake();
      const falloff = 1 - dist / def.blastRadius;
      pig.body.applyImpulse(
        new CANNON.Vec3(
          (dx / dist) * def.blastImpulse * 0.14 * falloff,
          (dy / dist) * def.blastImpulse * 0.14 * falloff,
          0
        ),
        pig.body.position
      );
      if (def.blastImpulse * falloff > 8) {
        this.killPig(pig);
      }
    }
  }

  private killPig(pig: Pig) {
    if (pig.dead) return;
    pig.dead = true;
    this.pendingPigRemovals.push(pig);
    this.juice.burst(
      new THREE.Vector3(pig.body.position.x, pig.body.position.y, 0),
      0x6ecf5a,
      20
    );
    this.audio.pigPop();
    this.cameraRig.addShake(0.45);
    this.updateHud();
  }

  /** Sleeping castle pieces need explicit velocity transfer on bot hit. */
  private transferBotStrike(target: CANNON.Body) {
    const bot = this.bot.body;
    const speed = Math.max(bot.velocity.length(), 2);
    const dx = target.position.x - bot.position.x;
    const dy = target.position.y - bot.position.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const push = Math.min(speed * bot.mass * 1.15, 52);
    target.velocity.set(
      bot.velocity.x * 0.72 + (nx * push) / target.mass,
      bot.velocity.y * 0.72 + (ny * push) / target.mass,
      0
    );
    target.angularVelocity.z += (Math.random() - 0.5) * speed * 0.55;
    target.wakeUp();
  }

  private pinAnchoredStructures() {
    for (const b of this.blocks) b.pinIfAnchored();
    for (const p of this.pigs) p.pinIfAnchored();
  }

  private sphereBoxOverlap2D(
    cx: number,
    cy: number,
    radius: number,
    bx: number,
    by: number,
    hx: number,
    hy: number
  ): boolean {
    const dx = Math.abs(cx - bx);
    const dy = Math.abs(cy - by);
    const closestX = Math.max(0, dx - hx);
    const closestY = Math.max(0, dy - hy);
    return closestX * closestX + closestY * closestY < radius * radius;
  }

  /** Cannon often misses fast sphere vs sleeping stack — overlap wake while flying. */
  private resolveFlyingBotHits() {
    if (
      this.sling.phase !== 'flying' ||
      !this.launchedThisShot ||
      this.structureWarmup > 0
    ) {
      return;
    }
    const bot = this.bot.body;
    const hitRadius = GROK_BOT_RADIUS * 1.08;
    const speed = bot.velocity.length();
    if (speed < 1.4) return;
    const bx = bot.position.x;
    const by = bot.position.y;

    for (const block of this.blocks) {
      if (block.dead || !block.isAnchored()) continue;
      const he = block.halfExtents;
      const p = block.body.position;
      if (
        !this.sphereBoxOverlap2D(
          bx,
          by,
          hitRadius,
          p.x,
          p.y,
          he.x,
          he.y
        )
      ) {
        continue;
      }
      block.forceWake();
      this.transferBotStrike(block.body);
      this.bot.onImpact(Math.min(speed * 3.5, 18));
      const strike = this.botStrikeImpulse(speed * 3.2);
      this.damageBlockFromHit(
        block,
        strike,
        new THREE.Vector3(p.x, p.y, p.z)
      );
    }

    for (const pig of this.pigs) {
      if (pig.dead || !pig.isAnchored()) continue;
      const p = pig.body.position;
      const pr = pig.radius;
      const dx = bx - p.x;
      const dy = by - p.y;
      if (dx * dx + dy * dy > (hitRadius + pr) * (hitRadius + pr)) continue;
      pig.forceWake();
      this.transferBotStrike(pig.body);
      const strike = this.botStrikeImpulse(speed * 3.2);
      if (strike > 6.5) this.killPig(pig);
    }
  }

  private botStrikeImpulse(contactImpulse: number): number {
    const botSpeed = this.bot.body.velocity.length();
    const fromBot = botSpeed * this.bot.body.mass * 0.22;
    return Math.max(contactImpulse, fromBot, 3);
  }

  private bindCollisions() {
    this.physics.world.addEventListener('postStep', () => {
      if (this.structureWarmup > 0) return;
      for (const pig of this.pigs) {
        if (pig.dead || pig.isAnchored()) continue;
        if (pig.body.position.y < -1) this.killPig(pig);
      }
    });

    this.physics.world.addEventListener(
      'collisionStart',
      (e: { bodyA: CANNON.Body; bodyB: CANNON.Body; contact: CANNON.ContactEquation }) => {
        const { bodyA, bodyB, contact } = e;
        const relVel = contact.getImpactVelocityAlongNormal();
        if (relVel > 0) return;
        const impulse = -relVel;
        const botA = bodyA === this.bot.body;
        const botB = bodyB === this.bot.body;
        const botHit = botA || botB;

        if (botHit && impulse > 2.5) {
          this.bot.onImpact(impulse);
        }

        const strike = this.botStrikeImpulse(impulse);

        if (botHit && this.structureWarmup <= 0) {
          const other = botA ? bodyB : bodyA;
          const hitBlock = blockAtBody(this.blocks, other);
          const hitPig = pigAtBody(this.pigs, other);
          if (hitBlock) {
            hitBlock.forceWake();
            this.transferBotStrike(hitBlock.body);
          }
          if (hitPig) {
            hitPig.forceWake();
            this.transferBotStrike(hitPig.body);
          }
        }

        const blockA = blockAtBody(this.blocks, bodyA);
        const blockB = blockAtBody(this.blocks, bodyB);

        if (blockA && !blockA.isAnchored()) {
          const p = blockA.body.position;
          this.damageBlockFromHit(
            blockA,
            botHit ? strike : impulse,
            new THREE.Vector3(p.x, p.y, p.z)
          );
        }
        if (blockB && !blockB.isAnchored()) {
          const p = blockB.body.position;
          this.damageBlockFromHit(
            blockB,
            botHit ? strike : impulse,
            new THREE.Vector3(p.x, p.y, p.z)
          );
        }

        const pigA = pigAtBody(this.pigs, bodyA);
        const pigB = pigAtBody(this.pigs, bodyB);
        const pig = pigA ?? pigB;
        if (
          pig &&
          botHit &&
          !pig.isAnchored() &&
          impulse > 6.5 &&
          this.structureWarmup <= 0
        ) {
          this.killPig(pig);
        }
      }
    );
  }

  private hudPhaseLabel(): string {
    if (this.won) return 'Cleared';
    if (this.shotsLeft <= 0 && this.sling.phase !== 'flying') return 'Out of shots';
    switch (this.sling.phase) {
      case 'aiming':
        return 'Aim — pull back';
      case 'coiling':
        return 'Release!';
      case 'flying':
        return 'In flight';
      case 'settled':
        return 'Next Grok bot…';
      default:
        return 'Pull the Grok bot';
    }
  }

  private renderShotPips(): string {
    const used = MAX_SHOTS - this.shotsLeft;
    let html = '';
    for (let i = 0; i < MAX_SHOTS; i++) {
      const spent = i < used;
      const active =
        !spent &&
        i === used &&
        this.sling.phase !== 'flying' &&
        !this.won &&
        this.shotsLeft > 0;
      const cls = spent ? 'spent' : active ? 'active' : 'ready';
      html += `<span class="shot-pip ${cls}" title="Launch ${i + 1}"></span>`;
    }
    return html;
  }

  private updateHud() {
    const alive = this.pigs.filter((p) => !p.dead).length;
    const cleared = this.pigGoal - alive;
    const phase = this.hudPhaseLabel();
    this.hud.innerHTML = `
      <div class="hud-card">
        <div class="hud-title">${LEVEL_1.name}</div>
        <div class="hud-sub">${LEVEL_1.subtitle}</div>
        <div class="hud-stats">
          <div class="hud-stat">
            <span class="hud-label">Launches</span>
            <div class="shot-row">${this.renderShotPips()}</div>
            <span class="hud-meta">${this.shotsLeft} of ${MAX_SHOTS} left</span>
          </div>
          <div class="hud-stat">
            <span class="hud-label">Rival pigs</span>
            <strong class="hud-value">${alive}</strong>
            <div class="pig-bar" role="progressbar" aria-valuenow="${cleared}" aria-valuemin="0" aria-valuemax="${this.pigGoal}">
              <div class="pig-bar-fill" style="width:${(cleared / this.pigGoal) * 100}%"></div>
            </div>
          </div>
        </div>
        <div class="hud-phase">${phase}</div>
        <div class="hud-hint">Drag the Grok bot backward on the slingshot · <a href="/progress.html">Progress</a></div>
      </div>
    `;
  }

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const fh = SIDE_VIEW.frustumHeight;
    const aspect = w / h;
    this.camera.left = (-fh * aspect) / 2;
    this.camera.right = (fh * aspect) / 2;
    this.camera.top = fh / 2;
    this.camera.bottom = -fh / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private resetShot() {
    const restX = this.sling.anchor.x + this.sling.perchOffset.x;
    const restY = this.sling.anchor.y + this.sling.perchOffset.y;
    this.bot.reset(new CANNON.Vec3(restX, restY, 0));
    this.sling.resetPull();
    this.launchedThisShot = false;
    this.shotsLeft -= 1;
    this.updateHud();
  }

  tick(dt: number) {
    this.sling.tick(dt);

    const onSlingshot =
      this.sling.phase === 'ready' ||
      this.sling.phase === 'aiming' ||
      this.sling.phase === 'coiling';
    if (onSlingshot) {
      this.bot.body.type = CANNON.Body.KINEMATIC;
      if (this.sling.phase === 'ready') {
        const restX = this.sling.anchor.x + this.sling.perchOffset.x;
        const restY = this.sling.anchor.y + this.sling.perchOffset.y;
        this.bot.body.position.set(restX, restY, 0);
        this.bot.body.velocity.set(0, 0, 0);
        this.bot.body.angularVelocity.set(0, 0, 0);
      }
    } else if (this.sling.phase === 'flying') {
      this.bot.body.type = CANNON.Body.DYNAMIC;
    }

    if (this.sling.phase === 'aiming' || this.sling.phase === 'coiling') {
      const pullPos = this.sling.anchor.clone().add(
        new THREE.Vector3(this.sling.pull.x, this.sling.pull.y, 0)
      );
      const minY = GROK_BOT_RADIUS + 0.12;
      pullPos.y = Math.max(pullPos.y, minY);
      this.bot.body.position.set(pullPos.x, pullPos.y, 0);
      this.bot.body.velocity.set(0, 0, 0);
      this.bot.setMood('aim');
      this.bot.setLookDirection(this.sling.pull.x, this.sling.pull.y);
      const { squash, stretch } = this.sling.getStretchFactors();
      this.bot.setSquashStretch(squash, stretch);
    }

    if (this.sling.phase === 'flying' && !this.launchedThisShot) {
      const impulse = this.sling.consumeLaunchImpulse();
      if (impulse.length() > 0.05) {
        const minY = GROK_BOT_RADIUS + 0.12;
        if (this.bot.body.position.y < minY) {
          this.bot.body.position.y = minY;
        }
        this.bot.launch(impulse);
        this.audio.launch(impulse.length());
        this.cameraRig.addShake(
          clamp(impulse.length() / 22, 0.14, 0.38)
        );
        this.launchedThisShot = true;
        this.playerHasShot = true;
        this.flightTimer = 0;
        this.flightPeakX = this.bot.body.position.x;
        this.sling.trajectory.visible = false;
        this.bot.setSquashStretch(0.75, 1.25);
      }
    }

    if (this.structureWarmup > 0) {
      this.structureWarmup = Math.max(0, this.structureWarmup - dt);
    }

    this.pinAnchoredStructures();
    this.physics.step(dt);
    this.resolveFlyingBotHits();
    this.pinAnchoredStructures();

    for (const block of this.pendingBlockRemovals) {
      block.dispose(this.physics.world, this.scene);
    }
    this.pendingBlockRemovals = [];
    for (const pig of this.pendingPigRemovals) {
      pig.dispose(this.physics.world, this.scene);
    }
    this.pendingPigRemovals = [];

    const botPos = new THREE.Vector3(
      this.bot.body.position.x,
      this.bot.body.position.y,
      this.bot.body.position.z
    );
    const botVel = new THREE.Vector3(
      this.bot.body.velocity.x,
      this.bot.body.velocity.y,
      this.bot.body.velocity.z
    );
    this.bot.update(dt, this.camera);
    this.sling.updateBands(botPos);
    this.sling.updateTrajectory(botPos, this.sling.previewLaunchImpulse());

    for (const b of this.blocks) b.sync(dt);
    for (const p of this.pigs) p.sync();

    if (this.sling.phase === 'flying' && this.launchedThisShot) {
      this.flightTimer += dt;
      this.flightPeakX = Math.max(this.flightPeakX, this.bot.body.position.x);
      const v = this.bot.body.velocity.length();
      const onGround = this.bot.body.position.y < 1.35;
      const asleep = this.bot.body.sleepState === CANNON.Body.SLEEPING;
      const outOfPlay =
        this.bot.body.position.x > 17 ||
        this.bot.body.position.x < -11 ||
        this.flightTimer > 5.5;
      if ((onGround && v < 0.85) || asleep || outOfPlay) {
        this.settledTimer += dt;
        if (this.settledTimer > 0.65) {
          this.lastFlightPeakX = this.flightPeakX;
          this.sling.phase = 'settled';
          this.settledTimer = 0;
          this.flightTimer = 0;
          if (this.shotsLeft > 1) this.resetShot();
          else {
            this.shotsLeft = 0;
            this.sling.resetPull();
            this.sling.phase = 'ready';
            this.launchedThisShot = false;
            this.updateHud();
          }
        }
      } else {
        this.settledTimer = 0;
      }
    }

    const alive = this.pigs.filter((p) => !p.dead).length;
    if (alive === 0 && !this.won) {
      this.won = true;
      this.audio.win();
      this.updateHud();
      const win = document.createElement('div');
      win.className = 'hud-win-banner';
      win.textContent = 'Structure cleared!';
      this.hud.appendChild(win);
    }

    this.juice.update(dt);
    this.cameraRig.update(
      dt,
      this.sling.phase,
      botPos,
      botVel,
      this.sling.isDragging
    );
    this.updateParallax();
    this.renderer.render(this.scene, this.camera);
  }

  /** Dev-only playtest hook (see main.ts `window.__game`). */
  debugSnapshot() {
    const eff = this.sling.effectivePull();
    const rest = this.sling.restPosition();
    const ndc = rest.clone().project(this.camera);
    const imp = this.sling.previewLaunchImpulse();
    const m = 1.2;
    const launchSpeed = imp.length() / m;
    const atRelease = this.launchedThisShot
      ? {
          vx: this.bot.lastLaunchVel.vx,
          vy: this.bot.lastLaunchVel.vy,
          speed: Math.hypot(
            this.bot.lastLaunchVel.vx,
            this.bot.lastLaunchVel.vy
          ),
        }
      : null;
    return {
      perchNdc: { x: ndc.x, y: ndc.y },
      launchPreview: {
        vx: imp.x / m,
        vy: imp.y / m,
        speed: launchSpeed,
      },
      launchAtRelease: atRelease,
      phase: this.sling.phase,
      dragging: this.sling.isDragging,
      launchedThisShot: this.launchedThisShot,
      effPull: { x: eff.x, y: eff.y, len: eff.length() },
      screenDragPeakNdc: this.sling.screenDragPeakNdc,
      bot: {
        x: this.bot.body.position.x,
        y: this.bot.body.position.y,
        vx: this.bot.body.velocity.x,
        vy: this.bot.body.velocity.y,
      },
      flightPeakX: this.launchedThisShot
        ? this.flightPeakX
        : this.lastFlightPeakX,
      shotsLeft: this.shotsLeft,
    };
  }
}
