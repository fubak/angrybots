import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GrokBot } from './entities/GrokBot';
import { Block } from './entities/Block';
import { Pig } from './entities/Pig';
import { PhysicsWorld } from './systems/PhysicsWorld';
import { SlingSystem } from './systems/SlingSystem';
import { CameraRig } from './systems/CameraRig';
import { JuiceSystem } from './systems/JuiceSystem';
import { DebrisSystem } from './systems/DebrisSystem';
import { AudioSystem } from './systems/AudioSystem';
import { blockVector } from './levels/level1';
import { LEVELS, nextLevelId } from './levels/registry';
import type { LevelDef } from './levels/types';
import {
  GROK_BOT_RADIUS,
  MATERIAL,
  PIG_FATAL_FALL_DELTA,
  PORTRAIT_FRUSTUM_HEIGHT,
  SLING_ANCHOR,
  SIDE_VIEW,
  type BlockMaterial,
} from './config';
import { clamp } from './math';
import { loadAbTextures } from './visuals/abTextures';
import { buildGroundCrossSection } from './visuals/groundCrossSection';
import {
  bindBodyContacts,
  beginContactFrame,
  type ContactContext,
} from './game/ContactSystem';
import { canAim, isTerminal, type GameState } from './game/GameState';
import { sceneHasMeaningfulMotion } from './game/SceneQuiescence';
import { computeScore, starsForScore } from './game/Scoring';
import {
  loadProgress,
  recordLevelResult,
  updateSettings,
} from './game/ProgressStore';
import { applyImpulseAtCenter } from './physics/planar';
import { FlowOverlay } from './ui/FlowOverlay';

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
  private debris: DebrisSystem;
  private audio = new AudioSystem();
  private bot: GrokBot;
  private blocks: Block[] = [];
  private pigs: Pig[] = [];
  private hud: HTMLElement;
  private gameState: GameState = 'title';
  private levelDef: LevelDef = LEVELS[0];
  private maxShots = 3;
  private settledTimer = 0;
  private resolveTimer = 0;
  private shotsLeft = 3;
  private shotsConsumed = 0;
  private score = 0;
  private blocksBroken = 0;
  private pigsCleared = 0;
  private pendingExplosions = 0;
  private explosiveDetonated = new Set<Block>();
  private launchedThisShot = false;
  /** Suppress spawn settle from triggering break/damage logic. */
  private structureWarmup = 1.8;
  private playerHasShot = false;
  private flightTimer = 0;
  private flightPeakX = -Infinity;
  private lastFlightPeakX: number | null = null;
  private parallax: ParallaxLayer[] = [];
  private readonly cameraHomeX = SIDE_VIEW.centerX;
  private pigGoal = 0;
  private overlay: FlowOverlay;
  private contactCtx!: ContactContext;
  private readonly mount: HTMLElement;
  private pauseSnapshot: {
    gameState: GameState;
    slingPhase: import('./systems/SlingSystem').SlingPhase;
  } | null = null;
  private lastHudKey = '';

  constructor(container: HTMLElement) {
    this.mount = container;
    this.scene.background = this.makeSkyGradient();
    // Side camera sits at z≈42; linear fog near 22–48 washed the whole playfield.
    this.scene.fog = null;

    const { w, h, fh, aspect } = this.viewportMetrics();
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
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.effectivePixelRatio());
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    container.appendChild(this.renderer.domElement);

    this.sling = new SlingSystem(this.scene, this.camera);
    this.sling.onAimCancelled = () => this.audio.slingCancel();
    this.sling.onAimTension = (t) => this.audio.slingTension(t);
    this.sling.bind(this.renderer.domElement);
    this.cameraRig = new CameraRig(this.camera);
    this.juice = new JuiceSystem(this.scene);
    this.debris = new DebrisSystem();

    loadAbTextures();
    this.setupLights();
    this.setupParallax();
    this.setupEnvironment();
    this.bot = new GrokBot(this.physics.world, this.physics.materials);
    this.scene.add(this.bot.group);
    this.bindCollisions();

    this.hud = document.createElement('div');
    this.hud.id = 'hud';
    container.appendChild(this.hud);

    const progress = loadProgress();
    this.audio.setVolumes(
      progress.settings.masterVolume,
      progress.settings.sfxVolume
    );
    this.cameraRig.setReducedMotion(progress.settings.reducedMotion);

    this.overlay = new FlowOverlay(container, {
      onStart: () => this.startPlay(),
      onRetry: () => this.retryLevel(),
      onNext: () => this.advanceLevel(),
      onMenu: () => this.showLevelSelect(),
      onPause: () => this.pauseGame(),
      onResume: () => this.resumeGame(),
      onSettingsChange: (partial) => this.applyPlayerSettings(partial),
    });
    (this.overlay as unknown as { pickLevel?: (id: string) => void }).pickLevel =
      (id: string) => {
        const def = LEVELS.find((l) => l.id === id);
        if (def) this.loadLevel(def);
        this.startPlay();
      };

    this.loadLevel(this.levelDef);
    this.gameState = 'title';
    this.overlay.showTitle(this.overlaySettings());

    window.addEventListener('resize', () => this.onResize());
    window.visualViewport?.addEventListener('resize', () => this.onResize());
    window.visualViewport?.addEventListener('scroll', () => this.onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.gameState !== 'paused' && !isTerminal(this.gameState)) {
        this.pauseGame();
      }
    });
    this.renderer.domElement.addEventListener('pointerdown', () => {
      this.audio.unlock();
      if (this.overlay.isVisible() && this.gameState === 'title') {
        this.startPlay();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.gameState === 'paused') this.resumeGame();
        else if (!isTerminal(this.gameState) && this.gameState !== 'title') {
          this.pauseGame();
        }
      }
    });
    this.onResize();
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
    const hemi = new THREE.HemisphereLight(0xc8e8ff, 0x5a9a48, 0.5);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff6ee, 1.38);
    sun.position.set(-4, 8, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -5;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd4e8ff, 0.28);
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
        color: 0x5a9460,
        roughness: 1,
        flatShading: false,
      });
      for (const [x, s] of [
        [-14, 1.4],
        [-4, 1.8],
        [6, 1.5],
        [16, 1.3],
      ] as const) {
        const hill = new THREE.Mesh(
          new THREE.SphereGeometry(2.2 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.42),
          hillMat
        );
        hill.position.set(x, 0.15 * s, 0);
        hill.scale.y = 0.55;
        g.add(hill);
      }
    });

    addLayer(0.14, (g) => {
      g.position.set(0, 0, -16);
      const hillMat = new THREE.MeshStandardMaterial({
        color: 0x4a8552,
        roughness: 1,
        flatShading: false,
      });
      for (const [x, s] of [
        [-10, 1.1],
        [2, 1.35],
        [12, 1.05],
      ] as const) {
        const hill = new THREE.Mesh(
          new THREE.SphereGeometry(1.9 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.4),
          hillMat
        );
        hill.position.set(x, 0.1 * s, 0);
        hill.scale.y = 0.5;
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
    this.scene.add(buildGroundCrossSection());

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

  private clearLevelEntities() {
    for (const b of this.blocks) b.dispose(this.physics.world, this.scene);
    for (const p of this.pigs) p.dispose(this.physics.world, this.scene);
    this.blocks = [];
    this.pigs = [];
    this.debris.clear(this.physics.world, this.scene);
    this.explosiveDetonated.clear();
  }

  loadLevel(def: LevelDef) {
    this.clearLevelEntities();
    this.levelDef = def;
    this.maxShots = def.shots;
    this.shotsLeft = def.shots;
    this.shotsConsumed = 0;
    this.pigGoal = def.pigs.length;
    this.score = 0;
    this.blocksBroken = 0;
    this.pigsCleared = 0;
    this.playerHasShot = false;
    this.structureWarmup = 1.8;
    this.gameState = 'ready';
    this.sling.resetPull();
    this.sling.phase = 'ready';
    this.launchedThisShot = false;
    this.flightTimer = 0;
    this.settledTimer = 0;
    this.resolveTimer = 0;
    this.flightPeakX = -Infinity;
    this.lastFlightPeakX = null;
    this.pauseSnapshot = null;

    for (const b of def.blocks) {
      const { size, pos, rot } = blockVector(b);
      this.blocks.push(
        new Block(
          this.physics.world,
          this.scene,
          b.material,
          size,
          pos,
          rot,
          this.physics.materials
        )
      );
    }
    for (const [x, y] of def.pigs) {
      this.pigs.push(
        new Pig(this.physics.world, this.scene, x, y, this.physics.materials)
      );
    }
    this.lockCastle();
    this.rebindStructureContacts();
    this.resetBotToSlingshot();
    this.updateHud();
  }

  private rebindStructureContacts() {
    for (const b of this.blocks) bindBodyContacts(b.body, this.contactCtx);
    for (const p of this.pigs) bindBodyContacts(p.body, this.contactCtx);
  }

  private startPlay() {
    this.overlay.hide();
    this.gameState = 'ready';
    this.sling.phase = 'ready';
    this.sling.resetPull();
    this.cameraRig.playLevelReveal();
    this.onResize();
    this.updateHud();
  }

  private viewportMetrics() {
    const vv = window.visualViewport;
    const w = Math.max(
      1,
      Math.floor(vv?.width ?? this.mount.clientWidth)
    );
    const h = Math.max(
      1,
      Math.floor(vv?.height ?? this.mount.clientHeight)
    );
    const portrait = h > w;
    const fh = portrait ? PORTRAIT_FRUSTUM_HEIGHT : SIDE_VIEW.frustumHeight;
    const aspect = w / h;
    return { w, h, fh, aspect, portrait };
  }

  private effectivePixelRatio() {
    return Math.min(window.devicePixelRatio || 1, 2.5);
  }

  private pauseGame() {
    if (isTerminal(this.gameState) || this.gameState === 'title') return;
    if (this.gameState === 'paused') return;
    this.pauseSnapshot = {
      gameState: this.gameState,
      slingPhase: this.sling.phase,
    };
    this.gameState = 'paused';
    const cancelable =
      this.sling.phase === 'ready' ||
      this.sling.phase === 'aiming' ||
      this.sling.phase === 'coiling';
    if (cancelable) this.sling.resetPull();
    this.overlay.showPaused(this.overlaySettings());
  }

  private overlaySettings() {
    const s = loadProgress().settings;
    return { masterVolume: s.masterVolume, reducedMotion: s.reducedMotion };
  }

  private applyPlayerSettings(
    partial: Partial<{ masterVolume: number; reducedMotion: boolean }>
  ) {
    const next = updateSettings(partial);
    this.audio.setVolumes(next.masterVolume, next.sfxVolume);
    this.cameraRig.setReducedMotion(next.reducedMotion);
  }

  private resumeGame() {
    if (this.gameState !== 'paused' || !this.pauseSnapshot) return;
    this.overlay.hide();
    this.gameState = this.pauseSnapshot.gameState;
    this.sling.phase = this.pauseSnapshot.slingPhase;
    this.pauseSnapshot = null;
  }

  private retryLevel() {
    this.overlay.hide();
    this.loadLevel(this.levelDef);
  }

  private advanceLevel() {
    const next = nextLevelId(this.levelDef.id);
    if (!next) {
      this.showLevelSelect();
      return;
    }
    const def = LEVELS.find((l) => l.id === next);
    if (def) this.loadLevel(def);
    this.overlay.hide();
    this.gameState = 'ready';
  }

  private showLevelSelect() {
    const save = loadProgress();
    this.overlay.showLevelSelect(
      LEVELS.map((l) => ({
        id: l.id,
        name: l.name,
        unlocked: save.levels[l.id]?.unlocked ?? l.id === 'training-yard',
        stars: save.levels[l.id]?.stars ?? 0,
      })),
      this.levelDef.id
    );
  }

  private finishRound(won: boolean) {
    this.gameState = won ? 'won' : 'lost';
    const alive = this.pigs.filter((p) => !p.dead).length;
    this.pigsCleared = this.pigGoal - alive;
    const breakdown = computeScore(
      this.pigsCleared,
      this.blocksBroken,
      won ? this.shotsLeft : 0
    );
    this.score = breakdown.total;
    const stars = won
      ? starsForScore(this.score, this.levelDef.starScores)
      : 0;
    if (won) {
      recordLevelResult(
        this.levelDef.id,
        this.score,
        stars,
        nextLevelId(this.levelDef.id)
      );
    }
    this.overlay.showResults({
      won,
      score: this.score,
      stars,
      hasNext: Boolean(nextLevelId(this.levelDef.id)),
    });
    this.updateHud();
  }

  private resetBotToSlingshot() {
    const restX = this.sling.anchor.x + this.sling.perchOffset.x;
    const restY = this.sling.anchor.y + this.sling.perchOffset.y;
    this.bot.reset(new CANNON.Vec3(restX, restY, 0));
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
      this.blocksBroken += 1;
      this.breakBlock(block, hitPos, effectiveImpulse, chainFromBreak);
      const alive = this.pigs.filter((p) => !p.dead).length;
      this.pigsCleared = this.pigGoal - alive;
      this.score = computeScore(
        this.pigsCleared,
        this.blocksBroken,
        this.shotsLeft
      ).total;
      this.lastHudKey = '';
    }
  }

  private breakBlock(
    block: Block,
    hitPos: THREE.Vector3,
    impulse: number,
    skipChain = false
  ) {
    const wasExplosive = block.materialType === 'explosive';
    this.debris.spawnFromBlock(
      this.physics.world,
      this.scene,
      this.physics.materials,
      {
        materialType: block.materialType,
        halfExtents: block.halfExtents,
        position: block.body.position,
        quaternion: block.body.quaternion,
        linearVelocity: block.body.velocity,
        angularVelocity: block.body.angularVelocity,
        impulse,
      }
    );
    block.retireFromPlay();
    block.playBreakJuice(this.juice, hitPos, impulse);
    if (!wasExplosive) {
      this.audio.breakBlock(block.materialType);
    }
    this.cameraRig.addShake(
      block.materialType === 'glass'
        ? 0.28
        : block.materialType === 'stone'
          ? 0.18
          : block.materialType === 'explosive'
            ? 0.55
            : 0.22
    );

    if (wasExplosive && !this.explosiveDetonated.has(block)) {
      this.explosiveDetonated.add(block);
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

      other.forceWake();
      const push = chainImpulse * 0.08;
      applyImpulseAtCenter(
        other.body,
        new CANNON.Vec3((dx / dist) * push, (dy / dist) * push, 0)
      );
      if (other.materialType === 'glass') {
        other.body.angularVelocity.z += (Math.random() - 0.5) * falloff * 4;
      }
    }
  }

  /** AB-style TNT burst — wakes and shoves nearby bodies. */
  private detonateExplosive(center: THREE.Vector3) {
    const def = MATERIAL.explosive;
    this.pendingExplosions += 1;
    this.audio.explosion();
    this.juice.burst(center, 0xff4400, 36);
    this.juice.burst(center, 0xffee88, 24);
    this.cameraRig.addShake(0.75);

    for (const block of this.blocks) {
      if (block.dead || block === undefined) continue;
      let dx = block.body.position.x - center.x;
      let dy = block.body.position.y - center.y;
      let dist = Math.hypot(dx, dy);
      if (dist > def.blastRadius) continue;
      if (dist < 0.02) {
        dx = 1;
        dy = 0;
        dist = 1;
      }
      block.forceWake();
      const falloff = 1 - dist / def.blastRadius;
      const blastImpulse = def.blastImpulse * falloff;
      const pos = new THREE.Vector3(
        block.body.position.x,
        block.body.position.y,
        0
      );
      this.damageBlockFromHit(block, blastImpulse, pos, true);
      applyImpulseAtCenter(
        block.body,
        new CANNON.Vec3(
          (dx / dist) * blastImpulse * 0.12,
          (dy / dist) * blastImpulse * 0.12,
          0
        )
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
      applyImpulseAtCenter(
        pig.body,
        new CANNON.Vec3(
          (dx / dist) * def.blastImpulse * 0.14 * falloff,
          (dy / dist) * def.blastImpulse * 0.14 * falloff,
          0
        )
      );
      if (def.blastImpulse * falloff > 8) {
        this.killPig(pig);
      }
    }
    this.pendingExplosions = Math.max(0, this.pendingExplosions - 1);
  }

  private killPig(pig: Pig) {
    if (pig.dead) return;
    const px = pig.body.position.x;
    const py = pig.body.position.y;
    pig.beginDefeatPop();
    this.juice.burst(new THREE.Vector3(px, py, 0), 0x6ecf5a, 20);
    this.juice.burst(new THREE.Vector3(px, py, 0), 0xffffff, 8);
    this.audio.pigPop();
    this.cameraRig.addShake(0.45);
    const alive = this.pigs.filter((p) => !p.dead).length;
    this.pigsCleared = this.pigGoal - alive;
    const breakdown = computeScore(
      this.pigsCleared,
      this.blocksBroken,
      this.shotsLeft
    );
    this.score = breakdown.total;
    this.lastHudKey = '';
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
    if (this.structureWarmup <= 0 && this.playerHasShot) return;
    for (const b of this.blocks) b.pinIfAnchored();
    for (const p of this.pigs) p.pinIfAnchored();
  }

  private flushQueuedBodyRemovals() {
    const world = this.physics.world;
    for (const b of this.blocks) {
      if (b.consumeBodyRemovalQueue()) world.removeBody(b.body);
    }
    for (const p of this.pigs) {
      if (p.consumeBodyRemovalQueue()) world.removeBody(p.body);
    }
  }

  private botStrikeImpulse(contactImpulse: number): number {
    const botSpeed = this.bot.body.velocity.length();
    const fromBot = botSpeed * this.bot.body.mass * 0.22;
    return Math.max(contactImpulse, fromBot, 3);
  }

  private bindCollisions() {
    this.contactCtx = {
      structureWarmup: 0,
      botBody: this.bot.body,
      blocks: this.blocks,
      pigs: this.pigs,
      onBotImpact: (impulse) => this.bot.onImpact(impulse),
      onBotStrikeStructure: (_other, block, pig) => {
        if (block) {
          block.forceWake();
          this.transferBotStrike(block.body);
        }
        if (pig) {
          pig.forceWake();
          this.transferBotStrike(pig.body);
        }
      },
      onBlockDamage: (block, impulse, botHit) => {
        const p = block.body.position;
        const strike = this.botStrikeImpulse(impulse);
        this.damageBlockFromHit(
          block,
          botHit ? strike : impulse,
          new THREE.Vector3(p.x, p.y, p.z)
        );
      },
      onPigStrike: (pig, impulse) => {
        if (impulse > 5.5) this.killPig(pig);
      },
    };

    bindBodyContacts(this.bot.body, this.contactCtx);

    this.physics.world.addEventListener('postStep', () => {
      beginContactFrame();
      this.contactCtx.structureWarmup = this.structureWarmup;
      this.contactCtx.blocks = this.blocks;
      this.contactCtx.pigs = this.pigs;
      if (this.structureWarmup > 0) return;
      for (const pig of this.pigs) {
        if (pig.dead || pig.isAnchored()) continue;
        if (pig.body.position.y < pig.spawnY - PIG_FATAL_FALL_DELTA) {
          this.killPig(pig);
        }
      }
    });
  }

  private hudPhaseLabel(): string {
    if (this.gameState === 'won') return 'Level cleared';
    if (this.gameState === 'lost') return 'Try again';
    if (this.gameState === 'resolving') return 'Watching destruction…';
    if (this.gameState === 'paused') return 'Paused';
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
    const used = this.maxShots - this.shotsLeft;
    let html = '';
    for (let i = 0; i < this.maxShots; i++) {
      const spent = i < used;
      const active =
        !spent &&
        i === used &&
        this.sling.phase !== 'flying' &&
        !isTerminal(this.gameState) &&
        this.shotsLeft > 0;
      const cls = spent ? 'spent' : active ? 'active' : 'ready';
      html += `<span class="shot-pip ${cls}" title="Launch ${i + 1}"></span>`;
    }
    return html;
  }

  private maybeUpdateHud() {
    const alive = this.pigs.filter((p) => !p.dead).length;
    const key = `${this.gameState}|${this.sling.phase}|${this.shotsLeft}|${this.score}|${alive}`;
    if (key === this.lastHudKey) return;
    this.lastHudKey = key;
    this.updateHud();
  }

  private updateHud() {
    const alive = this.pigs.filter((p) => !p.dead).length;
    const phase = this.hudPhaseLabel();
    this.hud.innerHTML = `
      <div class="hud-bar">
        <button type="button" class="hud-icon-btn" id="hud-pause" aria-label="Pause">⏸</button>
        <div class="hud-bar-title">${this.levelDef.name}</div>
        <div class="hud-bar-score">${this.score.toLocaleString()}</div>
        <div class="shot-row compact">${this.renderShotPips()}</div>
        <div class="hud-bar-pigs">🐷 ${alive}</div>
      </div>
      <div class="hud-phase-chip">${phase}</div>
    `;
    this.hud.querySelector('#hud-pause')?.addEventListener('click', () => {
      if (!isTerminal(this.gameState)) this.pauseGame();
    });
  }

  private onResize() {
    const { w, h, fh, aspect, portrait } = this.viewportMetrics();
    const centerX = portrait ? -3.85 : SIDE_VIEW.centerX;
    const centerY = portrait ? 2.05 : SIDE_VIEW.centerY;
    this.cameraRig.setFramingCenter(centerX, centerY);
    this.camera.left = centerX - (fh * aspect) / 2;
    this.camera.right = centerX + (fh * aspect) / 2;
    this.camera.top = centerY + fh / 2;
    this.camera.bottom = centerY - fh / 2;
    this.camera.updateProjectionMatrix();
    const dpr = this.effectivePixelRatio();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    const canvas = this.renderer.domElement;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  /** Intro dismissed without Play leaves title + settled sling — unblock play. */
  private reconcilePlayability() {
    if (!this.overlay.isVisible() && this.gameState === 'title') {
      this.gameState = 'ready';
      this.sling.phase = 'ready';
      this.sling.resetPull();
    }
    if (
      this.shotsLeft > 0 &&
      this.sling.phase === 'settled' &&
      !isTerminal(this.gameState) &&
      this.gameState !== 'paused' &&
      this.gameState !== 'resolving' &&
      !this.overlay.isVisible()
    ) {
      this.sling.phase = 'ready';
      this.sling.resetPull();
      this.gameState = 'ready';
    }
  }

  private resetShot() {
    this.resetBotToSlingshot();
    this.sling.resetPull();
    this.launchedThisShot = false;
    this.gameState = 'ready';
    this.updateHud();
  }

  private syncGameStateFromSling() {
    if (isTerminal(this.gameState) || this.gameState === 'paused' || this.gameState === 'title') {
      return;
    }
    if (this.gameState === 'resolving') return;
    if (this.sling.phase === 'aiming') this.gameState = 'aiming';
    else if (this.sling.phase === 'coiling') this.gameState = 'coiling';
    else if (this.sling.phase === 'flying') this.gameState = 'flying';
    else if (this.sling.phase === 'ready') this.gameState = 'ready';
  }

  tick(dt: number) {
    this.reconcilePlayability();

    if (this.gameState === 'paused' || isTerminal(this.gameState)) {
      this.bot.update(dt, this.camera);
      this.juice.update(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.sling.tick(dt);
    this.syncGameStateFromSling();
    this.maybeUpdateHud();

    if (
      !this.overlay.isVisible() &&
      !canAim(this.gameState, this.shotsLeft) &&
      this.sling.phase === 'ready'
    ) {
      this.sling.phase = 'settled';
    }

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
        if (this.shotsLeft > 0) {
          this.shotsLeft -= 1;
          this.shotsConsumed += 1;
        }
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
    if (this.gameState !== 'resolving') {
      this.physics.step(dt);
    }
    this.flushQueuedBodyRemovals();
    this.pinAnchoredStructures();

    this.debris.update();

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
    for (const p of this.pigs) {
      if (p.isPopping()) p.updateDefeatPop(dt);
      else p.sync();
    }

    if (this.sling.phase === 'flying' && this.launchedThisShot) {
      this.flightTimer += dt;
      this.flightPeakX = Math.max(this.flightPeakX, this.bot.body.position.x);
      const v = this.bot.body.velocity.length();
      const onGround = this.bot.body.position.y < 1.35;
      const asleep = this.bot.body.sleepState === CANNON.Body.SLEEPING;
      const outOfPlay =
        this.bot.body.position.x > 17 ||
        this.bot.body.position.x < -11 ||
        this.flightTimer > 8;
      if ((onGround && v < 0.85) || asleep || outOfPlay) {
        this.settledTimer += dt;
        if (this.settledTimer > 0.45) {
          this.lastFlightPeakX = this.flightPeakX;
          this.sling.phase = 'settled';
          this.gameState = 'resolving';
          this.settledTimer = 0;
          this.flightTimer = 0;
          this.resolveTimer = 0;
          this.launchedThisShot = false;
        }
      } else {
        this.settledTimer = 0;
      }
    }

    if (this.gameState === 'resolving') {
      this.physics.step(dt);
      this.flushQueuedBodyRemovals();
      this.pinAnchoredStructures();
      this.resolveTimer += dt;
      const structMotion = sceneHasMeaningfulMotion(
        this.bot.body,
        this.blocks,
        this.pigs,
        this.pendingExplosions
      );
      const debrisMotion = this.debris.hasMotion();
      const alive = this.pigs.filter((p) => !p.dead).length;
      if (alive === 0 && !structMotion && this.resolveTimer > 0.5) {
        this.audio.win();
        this.finishRound(true);
      } else if (
        !structMotion &&
        !debrisMotion &&
        this.resolveTimer > 1.2 &&
        this.resolveTimer < 12
      ) {
        if (this.shotsLeft > 0) {
          this.resetShot();
        } else if (alive > 0) {
          this.finishRound(false);
        }
      } else if (this.resolveTimer > 14) {
        if (alive === 0) {
          this.audio.win();
          this.finishRound(true);
        } else if (this.shotsLeft > 0) {
          this.resetShot();
        } else {
          this.finishRound(false);
        }
      }
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

  /** Dev/E2E: jump to a level without menu navigation. */
  debugLoadLevel(levelId: string) {
    const def = LEVELS.find((l) => l.id === levelId);
    if (!def) return false;
    this.loadLevel(def);
    this.startPlay();
    return true;
  }

  /** Dev/E2E: unpause and dismiss overlays so physics/fixtures keep running. */
  debugEnsurePlayable() {
    if (this.gameState === 'paused') this.resumeGame();
    if (this.overlay.isVisible()) this.startPlay();
    this.reconcilePlayability();
    if (this.sling.phase === 'settled') {
      this.sling.phase = 'ready';
      this.gameState = 'ready';
    }
  }

  /** Dev/E2E: launch with custom impulse (physics scenario tests). */
  debugLaunchWithImpulse(ix: number, iy: number) {
    this.debugEnsurePlayable();
    if (this.shotsLeft <= 0 || this.sling.phase === 'flying') return false;
    if (this.sling.phase === 'coiling') return false;

    this.resetBotToSlingshot();
    this.sling.phase = 'flying';
    this.bot.body.type = CANNON.Body.DYNAMIC;
    const impulse = new CANNON.Vec3(ix, iy, 0);
    this.bot.launch(impulse);
    this.audio.launch(impulse.length());
    this.launchedThisShot = true;
    this.playerHasShot = true;
    this.shotsLeft -= 1;
    this.shotsConsumed += 1;
    this.gameState = 'flying';
    this.flightTimer = 0;
    this.flightPeakX = this.bot.body.position.x;
    this.sling.trajectory.visible = false;
    return true;
  }

  /** Dev/E2E: reliable launch into fort when synthetic mouse drag is flaky. */
  debugLaunchIntoFort() {
    return this.debugLaunchWithImpulse(13.5, 9.5);
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
      score: this.score,
      gameState: this.gameState,
      hudPhase: this.hudPhaseLabel(),
      pigsAlive: this.pigs.filter((p) => !p.dead).length,
      cameraRevealDone: this.cameraRig.isRevealComplete(),
      debrisFragments: this.debris.fragmentCount,
      blocks: this.blocks.map((b) => ({
        dead: b.dead,
        anchored: b.isAnchored(),
        x: b.body.position.x,
        y: b.body.position.y,
      })),
    };
  }
}
