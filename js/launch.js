// Launch scene: the launch site at Etlaq Spaceport, Duqm, on the Arabian Sea coast; the chosen
// rocket, countdown, liftoff, booster / stage / fairing separation, or a failure. Models come
// from Blender (models/make_launchpad.py and models/make_rockets.py); the sea and sign are built here.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ROCKET_NODE = { small: 'Rocket_Small', medium: 'Rocket_Medium', heavy: 'Rocket_Heavy' };
const PREFIX = { small: 'Small', medium: 'Medium', heavy: 'Heavy' };
const FLAME = {
  small: { r: 0.28, len: 2.2 },
  medium: { r: 0.5, len: 3.2 },
  heavy: { r: 0.6, len: 3.8 },
  booster: { r: 0.32, len: 2.6 },
  upper: { r: 0.22, len: 1.6 },
};

// Timeline in seconds from the start of the countdown
const T = { count2: 0.9, count1: 1.8, ignite: 2.4, liftoff: 3.0, boosters: 6.5, stage: 8.5, fairing: 10.5, end: 13.5, fail: 6.2 };
const ACCEL = 1.7; // units per second squared, straight-up climb
const INTRO = 2.4; // seconds of establishing shot before the countdown
const CAM = new THREE.Vector3(6, 4.5, 28); // launch camera, relative to the pad (low, clear of the tanks)
// The sea lies behind the pad as seen from the launch camera
const SEA_DIR = new THREE.Vector3(-0.3, 0, -0.95).normalize();
const COAST = 52; // distance from the pad where the land starts to slope into the sea
const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/** Tileable ripple normal map for the sea, from a sum of waves. */
function makeWaveNormals() {
  const N = 256;
  const h = new Float32Array(N * N);
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const waves = [];
  while (waves.length < 22) {
    const kx = Math.round((rnd() - 0.5) * 18);
    const ky = Math.round((rnd() - 0.5) * 18);
    if (kx || ky) waves.push({ kx, ky, p: rnd() * Math.PI * 2, a: 1 / Math.hypot(kx, ky) });
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let v = 0;
      for (const w of waves) v += w.a * Math.sin(((w.kx * x + w.ky * y) / N) * Math.PI * 2 + w.p);
      h[y * N + x] = v;
    }
  }
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const n = new THREE.Vector3();
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x - 1 + N) % N)];
      const dy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x];
      n.set(-dx * 4, -dy * 4, 1).normalize();
      const i = (y * N + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(90, 64);
  return tex;
}

function makeSkyTexture() {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0b1733');
  grad.addColorStop(0.45, '#35588f');
  grad.addColorStop(0.8, '#e9a46b');
  grad.addColorStop(1, '#f6c58f');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeFlame({ r, len }) {
  const group = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(r, len, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(r * 0.55, len * 0.6, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff1c2, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  // Cones point up by default; flip so the tip points down, base at y = 0
  outer.rotation.x = Math.PI;
  outer.position.y = -len / 2;
  inner.rotation.x = Math.PI;
  inner.position.y = -len * 0.3;
  group.add(outer, inner);
  group.visible = false;
  return group;
}

export class LaunchScene {
  constructor(renderer, environment) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = makeSkyTexture();
    this.scene.environment = environment;
    this.scene.fog = new THREE.Fog(0xe2b48a, 90, 420);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 3000);
    this.loaded = false;
    this.running = false;

    this.scene.add(new THREE.HemisphereLight(0x9db4d0, 0xd8b07a, 1.3));
    const sun = new THREE.DirectionalLight(0xffd6a8, 2.6);
    sun.position.set(60, 45, -40);
    this.scene.add(sun);

    this.rocketGroup = new THREE.Group();
    this.scene.add(this.rocketGroup);

    this.engineLight = new THREE.PointLight(0xff9a40, 0, 60, 1.6);
    this.scene.add(this.engineLight);

    this._makeSmokePool();
    this._makeBlast();
    this.ready = this._load();
  }

  async _load() {
    const loader = new GLTFLoader();
    const [pad, rockets] = await Promise.all([
      loader.loadAsync('assets/launchpad.glb'),
      loader.loadAsync('assets/rockets.glb'),
    ]);
    this.scene.add(pad.scene);
    // White paint was blowing out in the desert sun
    pad.scene.traverse((o) => {
      if (o.isMesh && /White/.test(o.material.name) && !o.material.userData.toned) {
        o.material.color.multiplyScalar(0.8);
        o.material.userData.toned = true;
      }
    });
    pad.scene.updateMatrixWorld(true);
    this.mount = pad.scene.getObjectByName('RocketMount').getWorldPosition(new THREE.Vector3());
    this._coast(pad.scene.getObjectByName('Ground'));
    this._sign();

    this.rocketGroup.position.copy(this.mount);
    this.rocketGroup.add(rockets.scene);
    this.rockets = {};
    for (const [id, nodeName] of Object.entries(ROCKET_NODE)) {
      const root = rockets.scene.getObjectByName(nodeName);
      const P = PREFIX[id];
      const pieces = {
        stage1: root.getObjectByName(`${P}_Stage1`),
        stage2: root.getObjectByName(`${P}_Stage2`),
        fairingL: root.getObjectByName(`${P}_Fairing_L`),
        fairingR: root.getObjectByName(`${P}_Fairing_R`),
        boosterL: root.getObjectByName(`${P}_Booster_L`),
        boosterR: root.getObjectByName(`${P}_Booster_R`),
      };
      // Remember where each piece starts, so the rocket can be reset
      const home = new Map();
      for (const obj of Object.values(pieces)) {
        if (obj) home.set(obj, { parent: obj.parent, pos: obj.position.clone(), quat: obj.quaternion.clone() });
      }
      // Where the upper stage's engine is (bottom of stage 2, in rocket space)
      const box = new THREE.Box3().setFromObject(pieces.stage2);
      root.visible = false;
      this.rockets[id] = { root, pieces, home, stage2Bottom: box.min.y - this.mount.y };
    }
    this.loaded = true;
  }

  _makeSmokePool() {
    this.smoke = [];
    const geo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xe6ddcf, roughness: 1, transparent: true, opacity: 0, depthWrite: false }));
      m.visible = false;
      this.scene.add(m);
      this.smoke.push({ mesh: m, life: 0, max: 1, vel: new THREE.Vector3(), grow: 1 });
    }
    this.smokeIndex = 0;
  }

  _puff(pos, vel, size, life, color = 0xe6ddcf) {
    const s = this.smoke[this.smokeIndex];
    this.smokeIndex = (this.smokeIndex + 1) % this.smoke.length;
    s.mesh.position.copy(pos);
    s.mesh.scale.setScalar(size);
    s.mesh.material.color.setHex(color);
    s.mesh.visible = true;
    s.vel.copy(vel);
    s.life = 0;
    s.max = life;
    s.grow = size * 3;
  }

  _makeBlast() {
    this.blast = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.blast.visible = false;
    this.scene.add(this.blast);
  }

  /** Duqm is on the coast: the sand slopes down into the Arabian Sea behind the pad. */
  _coast(ground) {
    if (ground?.geometry) {
      const p = ground.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const along = (p.getX(i) - this.mount.x) * SEA_DIR.x + (p.getZ(i) - this.mount.z) * SEA_DIR.z;
        const k = smooth(COAST, COAST + 30, along);
        if (k > 0) p.setY(i, p.getY(i) * (1 - k) - 5 * k);
      }
      p.needsUpdate = true;
      ground.geometry.computeVertexNormals();
    }
    this.waves = makeWaveNormals();
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(1600, 1100),
      new THREE.MeshStandardMaterial({
        color: 0x1b5a6e, roughness: 0.16, metalness: 0.15, envMapIntensity: 0.55,
        normalMap: this.waves, normalScale: new THREE.Vector2(0.45, 0.45),
      })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.12, -(COAST + 6 + 550));
    const holder = new THREE.Group();
    holder.position.set(this.mount.x, 0, this.mount.z);
    holder.rotation.y = Math.atan2(-SEA_DIR.x, -SEA_DIR.z); // local -z points out to sea
    holder.add(sea);
    this.scene.add(holder);
    this.sea = sea;
  }

  /** Site sign by the pad, in both languages: the current one on top. */
  _sign() {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 400;
    this.signCanvas = c;
    this.signTex = new THREE.CanvasTexture(c);
    this.signTex.colorSpace = THREE.SRGBColorSpace;
    this.signTex.anisotropy = 4;
    const grp = new THREE.Group();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 3.2), new THREE.MeshBasicMaterial({ map: this.signTex, toneMapped: false }));
    board.position.y = 4.1;
    const back = new THREE.Mesh(new THREE.BoxGeometry(8.5, 3.5, 0.18), new THREE.MeshStandardMaterial({ color: 0x1a2236, metalness: 0.6, roughness: 0.4 }));
    back.position.set(0, 4.1, -0.11);
    grp.add(board, back);
    for (const x of [-3.2, 3.2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.22), new THREE.MeshStandardMaterial({ color: 0x9aa3b5, metalness: 0.8, roughness: 0.3 }));
      post.position.set(x, 1.2, -0.11);
      grp.add(post);
    }
    // To the right of the rocket as seen from the launch camera, facing it
    const right = new THREE.Vector3(-SEA_DIR.z, 0, SEA_DIR.x);
    grp.position.copy(this.mount).addScaledVector(right, 8.5).addScaledVector(SEA_DIR, -4);
    grp.position.y = 0.6;
    grp.lookAt(this.mount.x + CAM.x, 0.6, this.mount.z + CAM.z);
    this.scene.add(grp);
    this.signGroup = grp;
    this._drawSign();
    document.fonts?.ready.then(() => this._drawSign());
  }

  _drawSign() {
    const c = this.signCanvas;
    if (!c) return;
    const g = c.getContext('2d');
    const W = c.width;
    const H = c.height;
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0e1d3d');
    bg.addColorStop(1, '#081226');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffb547';
    g.fillRect(0, 0, W, 14);
    g.strokeStyle = 'rgba(77,232,255,0.7)';
    g.lineWidth = 4;
    g.strokeRect(18, 30, W - 36, H - 48);
    const ar = { big: 'إطلاق · الدقم', small: 'ميناء فضائي · سلطنة عُمان', font: '"IBM Plex Sans Arabic"', dir: 'rtl' };
    const en = { big: 'ETLAQ · DUQM', small: 'SPACEPORT · SULTANATE OF OMAN', font: '"Space Grotesk"', dir: 'ltr' };
    const [top, bottom] = this.lang === 'en' ? [en, ar] : [ar, en];
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.direction = top.dir;
    g.fillStyle = '#ffffff';
    g.font = `700 112px ${top.font}, sans-serif`;
    g.fillText(top.big, W / 2, 128);
    g.fillStyle = '#4de8ff';
    g.font = `600 40px ${top.font}, sans-serif`;
    g.fillText(top.small, W / 2, 222);
    g.fillStyle = 'rgba(77,232,255,0.35)';
    g.fillRect(W * 0.2, 262, W * 0.6, 2);
    g.direction = bottom.dir;
    g.fillStyle = '#ffb547';
    g.font = `600 50px ${bottom.font}, sans-serif`;
    g.fillText(bottom.big, W / 2, 318);
    this.signTex.needsUpdate = true;
  }

  setLang(lang) {
    this.lang = lang;
    this._drawSign();
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    // Tall phone screens: keep about 40 degrees across, so the pad and the sign still fit
    this.camera.fov = aspect < 1 ? Math.min(85, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(20)) / aspect))) : 45;
    this.camera.updateProjectionMatrix();
  }

  _reset() {
    for (const rocket of Object.values(this.rockets)) {
      rocket.root.visible = false;
      for (const [obj, h] of rocket.home) {
        h.parent.add(obj);
        obj.position.copy(h.pos);
        obj.quaternion.copy(h.quat);
        obj.visible = true;
      }
    }
    for (const f of this.flames || []) f.parent?.remove(f);
    this.rocketGroup.position.copy(this.mount);
    this.rocketGroup.rotation.set(0, 0, 0);
    this.falling = [];
    this.blast.visible = false;
    for (const s of this.smoke) { s.mesh.visible = false; s.life = s.max; }
    this.engineLight.intensity = 0;
  }

  /**
   * rocketId: 'small' | 'medium' | 'heavy'
   * success: decided before the launch, from the design's margins
   * onStatus(key): 'count3' | 'count2' | 'count1' | 'liftoff' | 'boosters' | 'stage' | 'fairing' | 'orbit' | 'fail'
   * onDone(success)
   */
  start(rocketId, success, onStatus, onDone, opts = {}) {
    this._reset();
    this.id = rocketId;
    this.rocket = this.rockets[rocketId];
    this.rocket.root.visible = true;
    this.success = success;
    this.onStatus = onStatus;
    this.onDone = onDone;
    this.t = 0;
    this.fired = new Set();
    this.running = true;

    // Engine flames: main engine, boosters, and the upper stage (lit later)
    const p = this.rocket.pieces;
    this.mainFlame = makeFlame(FLAME[rocketId]);
    p.stage1.add(this.mainFlame);
    this.mainFlame.position.set(0, -0.05, 0);
    this.boosterFlames = [];
    for (const b of [p.boosterL, p.boosterR]) {
      if (!b) continue;
      const f = makeFlame(FLAME.booster);
      const bb = new THREE.Box3().setFromObject(b);
      const center = bb.getCenter(new THREE.Vector3());
      b.add(f);
      f.position.set(b.worldToLocal(center.clone()).x, -0.05, 0);
      this.boosterFlames.push(f);
    }
    this.upperFlame = makeFlame(FLAME.upper);
    p.stage2.add(this.upperFlame);
    this.upperFlame.position.set(0, this.rocket.stage2Bottom - 0.05, 0);
    this.flames = [this.mainFlame, this.upperFlame, ...this.boosterFlames];

    // Start wide over the coast, then move in to the pad while the countdown starts
    this.t = -INTRO;
    this.camFrom = new THREE.Vector3(this.mount.x + 34, this.mount.y + 24, this.mount.z + 58);
    this.camTo = this.mount.clone().add(CAM);
    this.lookFrom = this.mount.clone().addScaledVector(SEA_DIR, 45);
    this.camera.position.copy(this.camFrom);
    this.lookAt = new THREE.Vector3(this.mount.x, this.mount.y + 6, this.mount.z);
    this.camera.lookAt(this.lookFrom);
    if (opts.intro === false) { // straight to the countdown (the promo film)
      this.t = 0;
      this.camera.position.copy(this.camTo);
      this.camera.lookAt(this.lookAt);
    }
  }

  _emit(key) {
    if (this.fired.has(key)) return;
    this.fired.add(key);
    this.onStatus?.(key);
  }

  _detach(obj, vel, spin) {
    if (!obj) return;
    this.scene.attach(obj); // keep its place in the world
    this.falling.push({ obj, vel, spin });
  }

  update(dt) {
    if (this.waves) this.waves.offset.set(this.waves.offset.x + dt * 0.012, this.waves.offset.y + dt * 0.02);
    if (!this.running) return;
    this.t += dt;
    const t = this.t;
    const p = this.rocket.pieces;

    if (t < 0) {
      const k = smooth(-INTRO, 0, t);
      this.camera.position.lerpVectors(this.camFrom, this.camTo, k);
      this.camera.lookAt(new THREE.Vector3().lerpVectors(this.lookFrom, this.lookAt, k));
      return;
    }
    this._emit('count3');

    if (t >= T.count2) this._emit('count2');
    if (t >= T.count1) this._emit('count1');

    // Engines on
    const engineOn = t >= T.ignite && !(this.fired.has('fail'));
    if (engineOn) {
      const flick = 0.85 + Math.random() * 0.3;
      this.mainFlame.visible = !this.fired.has('stage');
      for (const f of this.boosterFlames) f.visible = !this.fired.has('boosters');
      this.upperFlame.visible = this.fired.has('stage');
      for (const f of this.flames) f.scale.set(1, flick, 1);
      const worldBase = this.rocketGroup.position;
      this.engineLight.position.set(worldBase.x, worldBase.y - 1, worldBase.z);
      this.engineLight.intensity = 400 * flick;
    }

    // Climb
    let climbT = Math.max(0, t - T.liftoff);
    if (this.fired.has('fail')) climbT = T.fail - T.liftoff;
    const altitude = 0.5 * ACCEL * climbT * climbT;
    const pitchT = Math.max(0, climbT - 4);
    this.rocketGroup.position.set(this.mount.x + 0.12 * pitchT * pitchT, this.mount.y + altitude, this.mount.z);
    this.rocketGroup.rotation.z = -Math.min(0.35, 0.025 * pitchT * pitchT);
    if (t >= T.liftoff) this._emit('liftoff');

    // Smoke near the ground
    if (engineOn && altitude < 30) {
      const base = this.rocketGroup.position.clone();
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const out = new THREE.Vector3(Math.cos(a) * 6 + 5, 0.6 + Math.random(), Math.sin(a) * 6);
        this._puff(new THREE.Vector3(this.mount.x + (Math.random() - 0.5), this.mount.y + 0.3, this.mount.z), out, 0.8, 3 + Math.random() * 2);
      }
      if (altitude > 2) this._puff(base.clone().add(new THREE.Vector3(0, -2, 0)), new THREE.Vector3(0, -1, 0), 0.6, 2.5);
    }

    if (this.success) {
      if (this.id === 'heavy' && t >= T.boosters && !this.fired.has('boosters')) {
        const v = new THREE.Vector3(0, ACCEL * (t - T.liftoff), 0);
        this._detach(p.boosterL, v.clone().add(new THREE.Vector3(-2, 0, 0)), 0.6);
        this._detach(p.boosterR, v.clone().add(new THREE.Vector3(2, 0, 0)), -0.6);
        this._emit('boosters');
      }
      if (t >= T.stage && !this.fired.has('stage')) {
        this._detach(p.stage1, new THREE.Vector3(0.5, ACCEL * (t - T.liftoff) * 0.7, 0), 0.25);
        this._emit('stage');
      }
      if (t >= T.fairing && !this.fired.has('fairing')) {
        const v = new THREE.Vector3(0, ACCEL * (t - T.liftoff) * 0.8, 0);
        this._detach(p.fairingL, v.clone().add(new THREE.Vector3(0, 0, 3)), 1.2);
        this._detach(p.fairingR, v.clone().add(new THREE.Vector3(0, 0, -3)), -1.2);
        this._emit('fairing');
      }
      if (t >= T.end) this._finish(true, 'orbit');
    } else if (t >= T.fail && !this.fired.has('fail')) {
      // Explosion: hide the rocket, flash and dark smoke
      this._emit('fail');
      this.rocket.root.visible = false;
      for (const f of this.flames) f.visible = false;
      this.engineLight.intensity = 0;
      this.blast.position.copy(this.rocketGroup.position).add(new THREE.Vector3(0, 4, 0));
      this.blast.visible = true;
      this.blastStart = t;
      for (let i = 0; i < 30; i++) {
        const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).multiplyScalar(10);
        this._puff(this.blast.position, v, 1.2, 3 + Math.random() * 2, 0x3a3532);
      }
    }
    if (this.fired.has('fail')) {
      const k = Math.min((t - this.blastStart) / 1.2, 1);
      this.blast.scale.setScalar(1 + k * 14);
      this.blast.material.opacity = 1 - k;
      if (t >= T.fail + 3.5) this._finish(false, null);
    }

    // Separated pieces fall away
    for (const f of this.falling) {
      f.vel.y -= 4.5 * dt;
      f.obj.position.addScaledVector(f.vel, dt);
      f.obj.rotation.z += f.spin * dt;
      f.obj.rotation.x += f.spin * 0.5 * dt;
    }

    // Smoke puffs grow, drift and fade
    for (const s of this.smoke) {
      if (!s.mesh.visible) continue;
      s.life += dt;
      const k = s.life / s.max;
      if (k >= 1) { s.mesh.visible = false; continue; }
      s.mesh.position.addScaledVector(s.vel, dt);
      s.vel.multiplyScalar(0.97);
      s.mesh.scale.setScalar(s.grow * (0.35 + k));
      s.mesh.material.opacity = 0.75 * (1 - k);
    }

    // Camera: shake at liftoff, then follow the rocket up
    const target = this.rocketGroup.position.clone().add(new THREE.Vector3(0, 4, 0));
    this.lookAt.lerp(target, Math.min(1, dt * 2.5));
    const wantY = this.mount.y + CAM.y + altitude * 0.75;
    this.camera.position.y += (wantY - this.camera.position.y) * Math.min(1, dt * 1.5);
    const shake = engineOn && altitude < 20 ? 0.12 : 0;
    this.camera.lookAt(
      this.lookAt.x + (Math.random() - 0.5) * shake,
      this.lookAt.y + (Math.random() - 0.5) * shake,
      this.lookAt.z
    );
  }

  _finish(success, statusKey) {
    if (!this.running) return;
    this.running = false;
    if (statusKey) this._emit(statusKey);
    this.onDone?.(success);
  }
}
