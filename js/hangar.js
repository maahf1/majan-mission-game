// The hangar: holographic floor, glowing turntable, rim lights and the satellite.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SatParts } from './satparts.js';

const CYAN = new THREE.Color(0x4de8ff);

function backdrop() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(80, 48, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vDir; uniform float uTime;
        float blob(vec3 d, vec3 c, float s){ return exp(-pow(distance(d, normalize(c)) / s, 2.0)); }
        void main(){
          float h = vDir.y;
          vec3 col = mix(vec3(0.012,0.02,0.05), vec3(0.03,0.05,0.12), smoothstep(-0.2, 0.5, h));
          col += vec3(0.25,0.12,0.55) * 0.35 * blob(vDir, vec3(-1.0,0.35,-0.6), 0.55);
          col += vec3(0.05,0.45,0.6) * 0.25 * blob(vDir, vec3(1.0,0.15,-0.8), 0.5);
          col += vec3(0.6,0.35,0.08) * 0.12 * blob(vDir, vec3(0.2,-0.1,1.0), 0.6);
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
}

function holoFloor() {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: CYAN.clone() } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vP; uniform float uTime; uniform vec3 uColor;
      void main(){
        float r = length(vP);
        vec2 g = abs(fract(vP * 1.25 - 0.5) - 0.5) / fwidth(vP * 1.25);
        float grid = 1.0 - min(min(g.x, g.y), 1.0);
        float rings = 1.0 - min(abs(fract(r * 0.8) - 0.5) / fwidth(r * 0.8), 1.0);
        float pulse = exp(-pow((r - mod(uTime * 2.2, 14.0)) * 2.5, 2.0));
        float table = exp(-pow((r - 2.9) * 9.0, 2.0)) * 2.2;
        float fade = 1.0 - smoothstep(3.0, 12.0, r);
        float a = (grid * 0.18 + rings * 0.12 + pulse * 0.45) * fade + table;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(13, 96), mat);
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** A night panorama of Muscat around the hangar: Hajar mountains, old forts like Muttrah's,
 *  domes and minarets, low white houses with lit windows. Drawn once on a canvas. */
function skyline() {
  const W = 4096;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const ground = H * 0.86;
  // Hajar mountains, two layers. Ridges are sums of sharp-peaked waves that repeat exactly
  // around the panorama, so there is no seam.
  const peak = (x, k, ph) => 1 - Math.abs(Math.sin((Math.PI * k * x) / W + ph));
  const layers = [
    { col: '#1b2350', min: 0.16, amp: 0.34, ph: 0.7 },
    { col: '#0e1431', min: 0.06, amp: 0.2, ph: 2.1 },
  ];
  for (const L of layers) {
    g.fillStyle = L.col;
    g.beginPath();
    g.moveTo(0, ground);
    for (let x = 0; x <= W; x += 8) {
      const h = 0.5 * Math.pow(peak(x, 5, L.ph), 1.6) + 0.32 * peak(x, 13, L.ph * 1.7) + 0.18 * peak(x, 37, L.ph * 2.9);
      g.lineTo(x, ground - H * (L.min + L.amp * h));
    }
    g.lineTo(W, ground);
    g.fill();
  }
  // city: houses, domes, minarets, forts
  const house = (x, w, h) => {
    g.fillStyle = '#121a2e';
    g.fillRect(x, ground - h, w, h);
    g.fillStyle = 'rgba(255,190,110,0.85)';
    for (let wy = ground - h + 8; wy < ground - 6; wy += 12) for (let wx = x + 5; wx < x + w - 6; wx += 11) if (rnd() < 0.35) g.fillRect(wx, wy, 4, 5);
  };
  const dome = (x, r) => {
    g.fillStyle = '#16203a';
    g.fillRect(x - r, ground - r * 1.3, r * 2, r * 1.3);
    g.beginPath(); g.arc(x, ground - r * 1.3, r, Math.PI, 0); g.fill();
    g.fillStyle = 'rgba(255,200,120,0.9)'; g.fillRect(x - 1, ground - r * 2.5, 2, r * 0.3);
  };
  const minaret = (x, h) => {
    g.fillStyle = '#16203a';
    g.fillRect(x - 4, ground - h, 8, h);
    g.fillRect(x - 7, ground - h * 0.72, 14, 4);
    g.beginPath(); g.arc(x, ground - h, 5, Math.PI, 0); g.fill();
    g.fillStyle = 'rgba(120,230,255,0.9)'; g.fillRect(x - 1, ground - h * 0.72 - 3, 2, 2);
  };
  const fort = (x, w) => {
    g.fillStyle = '#141c33';
    g.fillRect(x, ground - 46, w, 46);
    for (const tx of [x, x + w]) { g.beginPath(); g.arc(tx, ground - 46, 14, 0, Math.PI * 2); g.fill(); g.fillRect(tx - 14, ground - 46, 28, 46); }
    for (let k = x - 14; k < x + w + 14; k += 9) g.fillRect(k, ground - 62, 5, 8);
    g.fillStyle = 'rgba(255,170,80,0.9)'; g.fillRect(x + w / 2 - 4, ground - 30, 8, 12);
  };
  let x = 0;
  while (x < W) {
    const r = rnd();
    if (r < 0.06) { fort(x + 20, 90 + rnd() * 60); x += 190; }
    else if (r < 0.16) { dome(x + 30, 16 + rnd() * 14); minaret(x + 62, 70 + rnd() * 40); x += 90; }
    else if (r < 0.22) { minaret(x + 10, 60 + rnd() * 50); x += 30; }
    else { const w = 26 + rnd() * 40; house(x, w, 18 + rnd() * 34); x += w + rnd() * 8; }
  }
  // horizon glow, and a fade to transparent at the top
  const glow = g.createLinearGradient(0, ground - 4, 0, H);
  glow.addColorStop(0, 'rgba(77,232,255,0.55)');
  glow.addColorStop(0.12, 'rgba(20,40,70,0.9)');
  glow.addColorStop(1, 'rgba(5,10,20,1)');
  g.fillStyle = glow;
  g.fillRect(0, ground - 2, W, H - ground + 2);
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createLinearGradient(0, 0, 0, H * 0.3);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fade;
  g.fillRect(0, 0, W, H);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(46, 46, 16, 96, 1, true),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false })
  );
  m.position.y = -2.3 + 16 * 0.5 - 16 * 0.14;
  return m;
}

export class Hangar {
  constructor(renderer, environment) {
    this.scene = new THREE.Scene();
    this.scene.environment = environment;
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
    this.camera.position.set(7.2, 2.4, 8.6);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    Object.assign(this.controls, {
      enableDamping: true, enablePan: false, minDistance: 6.5, maxDistance: 17,
      maxPolarAngle: 1.62, autoRotate: true, autoRotateSpeed: 0.55,
    });
    this.controls.target.set(0, 0.1, 0);
    this.controls.addEventListener('start', () => { this.controls.autoRotate = false; this.idle = 0; });
    this.idle = 0;
    this.shift = 0;

    this.sky = backdrop();
    this.scene.add(this.sky);
    this.city = skyline();
    this.scene.add(this.city);
    this.floor = holoFloor();
    this.floor.position.y = -2.3;
    this.scene.add(this.floor);

    // Glowing turntable ring (bright enough to bloom)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.025, 8, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.4, 3.0) }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -2.28;
    this.scene.add(ring);

    this.scene.add(new THREE.HemisphereLight(0x3a5a88, 0x05080f, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(5, 8, 6);
    const rimC = new THREE.DirectionalLight(0x9fdcff, 1.3); // soft blue rim: a strong cyan one turned the gold foil green
    rimC.position.set(-6, 3, -6);
    const rimA = new THREE.DirectionalLight(0xffb547, 1.3);
    rimA.position.set(7, 0.5, -5);
    this.scene.add(key, rimC, rimA);

    this._dust();
    this._scanRing();

    this.sat = new THREE.Group();
    this.scene.add(this.sat);
    this.nodes = {};
    this.pops = [];
    this.ready = new GLTFLoader().loadAsync('assets/satellite.glb').then((gltf) => {
      this.model = gltf.scene;
      this.parts = new SatParts(this.model);
      this.nodes = this.parts.nodes; // the promo film poses these directly
      this.pops = this.parts.pops;
      this.sat.add(this.model);
      if (this.design) this.setDesign(this.design, false);
    });
  }

  _dust() {
    const n = 500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = Math.random() * 10 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0x9fdcff, size: 0.04, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.scene.add(this.dust);
  }

  _scanRing() {
    this.scan = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.02, 8, 120),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.5, 3.2), transparent: true, opacity: 0, depthWrite: false })
    );
    this.scan.rotation.x = Math.PI / 2;
    this.scene.add(this.scan);
    this.scanT = 1;
  }

  /** design: { orbit, inst1, inst2, power, comms, rocket }. New parts pop in with a scan ring. */
  setDesign(design, animate = true) {
    const prev = this.design;
    this.design = { ...design };
    if (!this.parts) return;
    const changed = this.parts.apply(design, animate && !!prev);
    if (animate && prev && changed) this.scanT = 0;
  }

  /** Move the satellite off-centre (x as a share of the width, up as a share of the height); zoom below 1 shows more. */
  setShift(fraction, up = 0, zoom = 1) {
    this.shift = fraction;
    this.shiftUp = up;
    if (this.camera.zoom !== zoom) { this.camera.zoom = zoom; this.camera.updateProjectionMatrix(); }
    this._applyShift();
  }

  _applyShift() {
    if (!this.w) return;
    if (this.shift || this.shiftUp) this.camera.setViewOffset(this.w, this.h, -this.shift * this.w, (this.shiftUp || 0) * this.h, this.w, this.h);
    else this.camera.clearViewOffset();
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._applyShift();
  }

  update(dt, time) {
    this.sky.material.uniforms.uTime.value = time;
    this.city.rotation.y = time * 0.004;
    this.floor.material.uniforms.uTime.value = time;
    this.sat.position.y = Math.sin(time * 0.7) * 0.12;
    this.sat.rotation.y += dt * 0.05;
    this.dust.rotation.y += dt * 0.01;
    this.parts?.update(dt);
    this.scan.visible = this.scanT < 1; // hidden once the sweep is done
    if (this.scanT < 1) {
      this.scanT = Math.min(this.scanT + dt / 0.7, 1);
      this.scan.position.y = -1.6 + this.scanT * 3.2 + this.sat.position.y;
      this.scan.scale.setScalar(2.2 + Math.sin(this.scanT * Math.PI) * 1.4);
      this.scan.material.opacity = Math.sin(this.scanT * Math.PI);
    }
    // Resume the slow spin after a few idle seconds
    this.idle += dt;
    if (!this.controls.autoRotate && this.idle > 5) this.controls.autoRotate = true;
    this.controls.update();
  }
}
