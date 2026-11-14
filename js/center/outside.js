// Everything outside the Space Center building: the sky with sun and clouds, dunes and a
// mountain ridge on the horizon, the Arabian Sea and its beach, the building's facade and
// roof, the ground station dishes, and the Etlaq launch site (masts, tanks, hangar, fence,
// lights, roads). Built in code, no downloads. world.js calls buildOutside() once and
// main.js calls the returned update(dt) every frame (waves, dishes, flags, beacons).
import * as THREE from 'three';

// --- Noise -------------------------------------------------------------------------------------
const fract = (v) => v - Math.floor(v);
const hash = (x, y, z = 0) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
const fade = (t) => t * t * (3 - 2 * t);
const smooth = (a, b, v) => fade(Math.min(1, Math.max(0, (v - a) / (b - a))));
function noise2(x, y) {
  const xi = Math.floor(x); const yi = Math.floor(y);
  const u = fade(x - xi); const v = fade(y - yi);
  const a = hash(xi, yi); const b = hash(xi + 1, yi); const c = hash(xi, yi + 1); const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 4) {
  let s = 0; let amp = 0.5; let f = 1; let norm = 0;
  for (let i = 0; i < oct; i++) { s += amp * noise2(x * f, y * f); norm += amp; amp *= 0.5; f *= 2.03; }
  return s / norm;
}

// The ground is flat where people walk and things are built; dunes begin outside this box
export const FLAT = { x0: -70, x1: 172, z0: -62, z1: 72 };
const SEA_Y = -0.7;
export function groundHeight(x, z) {
  const dx = Math.max(FLAT.x0 - x, 0, x - FLAT.x1);
  const dz = Math.max(FLAT.z0 - z, 0, z - FLAT.z1);
  const m = smooth(0, 150, Math.hypot(dx, dz));
  const ripples = Math.abs(Math.sin(x / 31 + z / 77 + 6 * fbm(x / 140, z / 140, 2)));
  const dunes = 18 * fbm(x / 230 + 7, z / 230 + 3) - 5 + 3.2 * ripples;
  const beach = smooth(176, 262, x);                       // east: the ground slopes into the sea
  return m * dunes * (1 - smooth(150, 236, x)) - beach * 10;
}

// --- Sky: gradient, sun glow and clouds, as one picture wrapped around the world ---------------
export function skyTexture(sunDir) {
  const W = 2048; const H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#16469a');
  gr.addColorStop(0.24, '#2f74c9');
  gr.addColorStop(0.4, '#6fa9e0');
  gr.addColorStop(0.47, '#b9d6ee');
  gr.addColorStop(0.497, '#ecdfc8');
  gr.addColorStop(0.503, '#e4cfa9');
  gr.addColorStop(1, '#d6bd94');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);

  // Clouds on a flat layer high above: stretched and packed together towards the horizon
  const cw = 1024; const ch = 512;
  const cl = document.createElement('canvas');
  cl.width = cw; cl.height = ch;
  const cg = cl.getContext('2d');
  const img = cg.createImageData(cw, ch);
  for (let y = 0; y < ch / 2; y++) {
    const e = (0.5 - (y + 0.5) / ch) * Math.PI;            // elevation, radians
    if (e < 0.012) continue;
    const sy = Math.sin(e); const cy = Math.cos(e);
    const low = smooth(0.012, 0.11, e); const high = 1 - smooth(0.85, 1.35, e);
    for (let x = 0; x < cw; x++) {
      const a = ((x + 0.5) / cw - 0.5) * Math.PI * 2;
      const px = (cy * Math.cos(a)) / sy; const pz = (cy * Math.sin(a)) / sy;
      const wisps = fbm(px * 0.22 + 31, pz * 0.9 + 17, 5);  // long streaks
      const puffs = fbm(px * 0.55 + 5, pz * 0.55 + 9, 5);
      const d = Math.max(smooth(0.56, 0.8, wisps) * 0.75, smooth(0.6, 0.78, puffs)) * low * high;
      if (d <= 0.003) continue;
      const i = (y * cw + x) * 4;
      const shade = 255 - 46 * smooth(0.5, 1, d) * (1 - smooth(0.62, 0.8, puffs + 0.1));
      img.data[i] = shade; img.data[i + 1] = shade - 3; img.data[i + 2] = shade - 8; img.data[i + 3] = Math.round(232 * d);
    }
  }
  cg.putImageData(img, 0, 0);
  g.imageSmoothingQuality = 'high';
  g.drawImage(cl, 0, 0, W, H);

  // Sun: where the light really comes from, so shadows and sky agree
  const u = Math.atan2(sunDir.z, sunDir.x) / (Math.PI * 2) + 0.5;
  const v = Math.asin(sunDir.y) / Math.PI + 0.5;
  const sx = u * W; const sy2 = (1 - v) * H;
  const halo = g.createRadialGradient(sx, sy2, 0, sx, sy2, 430);
  halo.addColorStop(0, 'rgba(255,246,226,0.95)');
  halo.addColorStop(0.05, 'rgba(255,240,210,0.6)');
  halo.addColorStop(0.3, 'rgba(255,232,196,0.2)');
  halo.addColorStop(1, 'rgba(255,230,190,0)');
  g.fillStyle = halo;
  g.fillRect(sx - 430, sy2 - 430, 860, 860);
  g.fillStyle = '#fffdf6';
  g.beginPath(); g.arc(sx, sy2, 15, 0, Math.PI * 2); g.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

function waveNormals() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  const h = (x, y) => {
    const a = (x / S) * Math.PI * 2; const b = (y / S) * Math.PI * 2;
    return Math.sin(a * 3 + Math.sin(b * 2) * 1.3) * 0.5 + Math.sin(b * 5 + a * 2) * 0.3 + Math.sin((a + b) * 9) * 0.14 + Math.sin(a * 17 - b * 13) * 0.06;
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 1.6; const dy = (h(x, y + 1) - h(x, y - 1)) * 1.6;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * S + x) * 4;
      img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function fenceTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(190,198,208,1)';
  g.lineWidth = 2.2;
  for (let i = -64; i < 128; i += 16) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke();
    g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function flagTexture() {
  // The flag of Oman, simplified: red bar at the hoist, then white, red and green stripes
  const c = document.createElement('canvas');
  c.width = 192; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 192, 43);
  g.fillStyle = '#d7141a'; g.fillRect(0, 43, 192, 42);
  g.fillStyle = '#128a3c'; g.fillRect(0, 85, 192, 43);
  g.fillStyle = '#d7141a'; g.fillRect(0, 0, 50, 128);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(25, 22, 9, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * @param {object} o  { scene, outside, colliders, M, pbr, signTex, sunDir, ROOM, pad: {x, z} }
 * @returns {{ update(dt: number): void, setStations(id: string): void }}
 */
export function buildOutside({ scene, outside, colliders, M, pbr, signTex, sunDir, ROOM, pad }) {
  const add = (o, parent = scene) => { parent.add(o); if (parent === scene) outside.push(o); return o; };
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return add(m, parent); };
  const box = (w, h, d, mat, x, y, z, parent = scene) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const cyl = (r0, r1, h, mat, x, y, z, seg = 16, parent = scene) => mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat, x, y, z, parent);
  const solid = (x0, x1, z0, z1) => colliders.push({ x0, x1, z0, z1 });
  const rod = (a, b, r, material, parent) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 6), material);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    parent.add(m);
    return m;
  };
  const animated = [];

  const mat = {
    concrete: pbr({ base: '#b9b6ae', kind: 'plain', repeat: [10, 10], rough: 0.9, roughVar: 0.1, bump: 1.4, stains: 0.2 }),
    asphalt: pbr({ base: '#5a5d63', kind: 'plain', repeat: [30, 3], rough: 0.88, roughVar: 0.1, bump: 0.4, stains: 0.1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe9edf2, roughness: 0.55, metalness: 0.05 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa3b0, roughness: 0.4, metalness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x232a35, roughness: 0.5, metalness: 0.5 }),
    band: new THREE.MeshStandardMaterial({ color: 0x1b2a44, roughness: 0.45, metalness: 0.4 }),
    glassDark: new THREE.MeshStandardMaterial({ color: 0x0f2238, roughness: 0.08, metalness: 0.85 }),
    cyan: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 1.9, 2.4) }),
    red: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.25, 0.2) }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.6) }),
    rock: new THREE.MeshStandardMaterial({ color: 0x8a765e, roughness: 1, flatShading: true }),
    hangar: pbr({ base: '#cfd5dd', kind: 'panels', repeat: [8, 2], rough: 0.6, roughVar: 0.15, bump: 2, stains: 0.08 }),
    tank: new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.35, metalness: 0.25 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xd8692e, roughness: 0.5, metalness: 0.3 }),
  };

  // --- Ground: dunes with a flat middle, darker wet sand by the water -----------------------------
  const SIZE = 3000; const SEG = 240;
  const ground = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  ground.rotateX(-Math.PI / 2);
  const gp = ground.attributes.position;
  const colors = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i) + 200; const z = gp.getZ(i);
    const h = groundHeight(x, z);
    gp.setX(i, x);
    gp.setY(i, h - 0.05);
    const wet = 1 - smooth(SEA_Y, SEA_Y + 1.6, h);
    const tint = 0.95 + 0.1 * fbm(x / 260, z / 260, 2);       // broad and gentle, so the grid of the mesh never shows
    colors[i * 3] = tint * (1 - 0.36 * wet); colors[i * 3 + 1] = tint * (1 - 0.36 * wet); colors[i * 3 + 2] = tint * (1 - 0.3 * wet);
  }
  ground.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  ground.computeVertexNormals();
  const sandMat = M.sand.clone();
  sandMat.vertexColors = true;
  for (const k of ['map', 'normalMap', 'roughnessMap']) if (sandMat[k]) { sandMat[k] = sandMat[k].clone(); sandMat[k].repeat.set(750, 750); sandMat[k].needsUpdate = true; }
  const land = add(new THREE.Mesh(ground, sandMat));
  land.receiveShadow = true;

  // --- Sea ---------------------------------------------------------------------------------------
  const waves = waveNormals();
  waves.repeat.set(160, 220);
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x1a6a80, roughness: 0.1, metalness: 0.35, normalMap: waves, normalScale: new THREE.Vector2(0.55, 0.55) });
  const sea = mesh(new THREE.PlaneGeometry(2600, 3600), seaMat, 150 + 1300, SEA_Y, 0);
  sea.rotation.x = -Math.PI / 2;
  const shallows = mesh(new THREE.PlaneGeometry(90, 3600), new THREE.MeshStandardMaterial({ color: 0x4fb3b6, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.55, normalMap: waves, normalScale: new THREE.Vector2(0.3, 0.3) }), 238, SEA_Y + 0.03, 0);
  shallows.rotation.x = -Math.PI / 2;
  animated.push((dt) => { waves.offset.x += dt * 0.012; waves.offset.y += dt * 0.007; });

  // --- Mountains on the horizon (not to the east, where the sea is) -------------------------------
  const ridge = (radius, peak, colour, seed, depth) => {
    const N = 220;
    const a0 = (52 * Math.PI) / 180; const a1 = (308 * Math.PI) / 180;
    const pos = [];
    const idx = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = a0 + (a1 - a0) * t;
      const taper = smooth(0, 0.14, t) * smooth(0, 0.14, 1 - t);
      const n = fbm(t * 9 + seed, seed * 3.1, 5);
      const jag = 1 - Math.abs(2 * fbm(t * 34 + seed * 2, 1.7, 3) - 1);
      const h = peak * taper * (0.25 + 0.55 * n + 0.3 * jag * n);
      const cx = Math.cos(a); const cz = Math.sin(a);
      pos.push(cx * radius, -3, cz * radius);
      pos.push(cx * (radius + depth * 0.45), h * (0.5 + 0.2 * hash(i, seed)), cz * (radius + depth * 0.45));
      pos.push(cx * (radius + depth), h, cz * (radius + depth));
      pos.push(cx * (radius + depth * 1.9), -3, cz * (radius + depth * 1.9));
      if (i < N) { const b = i * 4; for (let r = 0; r < 3; r++) idx.push(b + r, b + r + 4, b + r + 1, b + r + 1, b + r + 4, b + r + 5); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colour, roughness: 1, flatShading: true, side: THREE.DoubleSide })));
  };
  ridge(640, 175, 0x7b6853, 3, 150);
  ridge(930, 330, 0x8c7d6c, 11, 230);

  // --- Rocks along the edge of the flat ground ----------------------------------------------------
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat.rock, 150);
  const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const s3 = new THREE.Vector3(); const p3 = new THREE.Vector3();
  for (let i = 0; i < 150; i++) {
    const a = hash(i, 1) * Math.PI * 2; const r = 75 + hash(i, 2) * 260;
    const x = 40 + Math.cos(a) * r * 1.3; const z = Math.sin(a) * r;
    const sc = 0.4 + hash(i, 3) ** 2 * 3.2;
    p3.set(x, groundHeight(x, z) + sc * 0.2, z);
    q.setFromEuler(new THREE.Euler(hash(i, 4) * 3, hash(i, 5) * 6, hash(i, 6) * 3));
    s3.set(sc * (0.8 + hash(i, 7) * 0.7), sc * 0.6, sc);
    rocks.setMatrixAt(i, m4.compose(p3, q, s3));
  }
  add(rocks);

  // --- The building from outside: plinth, parapet, light strip, name, windows, roof plant ---------
  const bx0 = ROOM.x0 - 0.2; const bx1 = ROOM.x1 + 0.2; const bz0 = ROOM.z0 - 0.2; const bz1 = ROOM.z1 + 0.2;
  const W = bx1 - bx0; const D = bz1 - bz0; const top = ROOM.h;
  for (const [w, d, x, z] of [[W + 0.5, 0.25, 0, bz0 - 0.05], [W + 0.5, 0.25, 0, bz1 + 0.05], [0.25, D + 0.5, bx0 - 0.05, 0], [0.25, D + 0.5, bx1 + 0.05, 0]]) {
    box(w, 1.1, d, mat.band, x, top + 0.45, z);               // parapet
    box(w, 0.07, d, mat.cyan, x, top - 0.16, z);              // light strip under it
  }
  box(W + 0.5, 0.5, 0.2, mat.band, 0, 0.25, bz0 - 0.08);      // plinth, north and west (the south has the door, the east the window)
  box(0.2, 0.5, D + 0.5, mat.band, bx0 - 0.08, 0.25, 0);
  box(W + 0.6, 0.2, D + 0.6, mat.dark, 0, top + 0.1, 0).castShadow = false;   // roof slab
  // Name on the south and the east face
  const nameTex = signTex([['MAJAN SPACE CENTER', 104, '"Space Grotesk"', null, 118], ['مركز مجان الفضائي', 74, '"IBM Plex Sans Arabic"', '#ffb547', 214, 'rtl']]);
  const nameMat = new THREE.MeshStandardMaterial({ map: nameTex, emissiveMap: nameTex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.4 });
  mesh(new THREE.PlaneGeometry(11, 2.75), nameMat, 11.5, 5.1, bz1 + 0.09);
  // ... and standing on the roof, facing the launch site
  const nameE = mesh(new THREE.PlaneGeometry(16, 4), nameMat, bx1 - 1.2, top + 3.3, 0);
  nameE.rotation.y = Math.PI / 2;
  box(0.2, 4.4, 16.4, mat.dark, bx1 - 1.36, top + 3.3, 0);
  for (const z of [-7, -2.3, 2.3, 7]) box(0.16, 1.3, 0.16, mat.steel, bx1 - 1.3, top + 0.75, z);
  // Dark glass strips on the office side and the north face
  for (let i = 0; i < 5; i++) mesh(new THREE.PlaneGeometry(1.9, 2.6), mat.glassDark, -19.4 + i * 2.3, 3.2, bz1 + 0.06);
  for (let i = 0; i < 12; i++) { const w = mesh(new THREE.PlaneGeometry(2.4, 1.5), mat.glassDark, -17.5 + i * 3.2, 4.9, bz0 - 0.06); w.rotation.y = Math.PI; }
  for (let i = 0; i < 6; i++) { const w = mesh(new THREE.PlaneGeometry(2.4, 2.6), mat.glassDark, bx0 - 0.06, 3.2, -8.6 + i * 3.4); w.rotation.y = -Math.PI / 2; }
  // Canopy and bollards at the loading door
  box(8.4, 0.22, 3.2, mat.band, -1, 5.3, bz1 + 1.6);
  for (const x of [-4.9, 2.9]) cyl(0.09, 0.09, 5.3, mat.steel, x, 2.65, bz1 + 3.0, 10);
  for (const x of [-5.4, 3.4]) { cyl(0.16, 0.16, 1.0, mat.orange, x, 0.5, bz1 + 1.2, 12); solid(x - 0.2, x + 0.2, bz1 + 1.0, bz1 + 1.4); }
  // Roof plant: air units, a radome, a mast with a beacon
  for (const [x, z] of [[-14, -5], [-6, 4], [3, -4], [12, 5]]) { box(3.2, 1.5, 2.2, mat.white, x, top + 0.95, z); cyl(0.7, 0.7, 0.25, mat.dark, x, top + 1.8, z, 18); }
  mesh(new THREE.SphereGeometry(2.3, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), mat.white, -17, top + 0.9, 6);
  cyl(0.07, 0.14, 9, mat.steel, 17, top + 4.6, -8, 8);
  const roofBeacon = mesh(new THREE.SphereGeometry(0.2, 10, 8), mat.red, 17, top + 9.2, -8);

  // --- Flags at the entrance ----------------------------------------------------------------------
  const flagTex = flagTexture();
  const flags = [];
  for (const x of [-12, -9.5, -7]) {
    cyl(0.07, 0.09, 9, mat.steel, x, 4.5, bz1 + 5.5, 10);
    solid(x - 0.12, x + 0.12, bz1 + 5.38, bz1 + 5.62);
    const geo = new THREE.PlaneGeometry(2.4, 1.6, 12, 4);
    geo.translate(1.2, 0, 0);
    const f = mesh(geo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 }), x + 0.08, 8.1, bz1 + 5.5);
    f.rotation.y = -0.5;
    flags.push({ geo, base: Float32Array.from(geo.attributes.position.array), phase: x });
  }
  let clock = 0;
  animated.push((dt) => {
    clock += dt;
    for (const f of flags) {
      const pos = f.geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = f.base[i * 3];
        pos.setZ(i, Math.sin(x * 2.4 - clock * 4.2 + f.phase) * 0.14 * (x / 2.4));
      }
      pos.needsUpdate = true;
    }
    roofBeacon.visible = Math.sin(clock * 3.2) > 0;
  });

  // --- Ground station: one big dish that tracks, two small ones that light up with the plan -------
  const dish = (x, z, radius, parent = scene) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    add(g, parent);
    cyl(radius * 0.22, radius * 0.3, radius * 0.9, mat.concrete, 0, radius * 0.45, 0, 16, g);
    const head = new THREE.Group();
    head.position.y = radius * 1.05;
    g.add(head);
    box(radius * 0.5, radius * 0.34, radius * 0.5, mat.steel, 0, 0, 0, head);
    const tilt = new THREE.Group();
    tilt.rotation.x = -0.75;
    head.add(tilt);
    const pts = [];
    for (let i = 0; i <= 12; i++) { const r = (i / 12) * radius; pts.push(new THREE.Vector2(r, (r * r) / (radius * 1.9))); }
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: 0xf1f3f6, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide }));
    bowl.position.y = radius * 0.18;
    tilt.add(bowl);
    const rim = radius * 0.86;
    const feedY = radius * 0.18 + radius * 1.0;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      rod(new THREE.Vector3(Math.cos(a) * rim, radius * 0.18 + (rim * rim) / (radius * 1.9), Math.sin(a) * rim), new THREE.Vector3(0, feedY, 0), radius * 0.014, mat.steel, tilt);
    }
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.05, radius * 0.08, radius * 0.16, 12), mat.dark);
    feed.position.y = feedY;
    tilt.add(feed);
    const led = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.035, 8, 6), mat.cyan.clone());
    led.position.set(0, radius * 0.24, radius * 0.27);
    head.add(led);
    solid(x - radius * 0.3, x + radius * 0.3, z - radius * 0.3, z + radius * 0.3);
    return { head, tilt, led };
  };
  const big = dish(-40, -2, 6.5);
  const small = [dish(-52, 12, 3.2), dish(-50, -16, 3.2)];
  big.head.rotation.y = 0.6;
  small[0].head.rotation.y = 2.2;
  small[1].head.rotation.y = -1.1;
  animated.push((dt) => { big.head.rotation.y += dt * 0.05; big.tilt.rotation.x = -0.75 + Math.sin(clock * 0.07) * 0.22; });
  box(30, 0.06, 40, mat.concrete, -45, -0.02, -2);
  const gsTex = signTex([['GROUND STATION', 100, '"Space Grotesk"', null, 118], ['المحطة الأرضية', 72, '"IBM Plex Sans Arabic"', '#ffb547', 214, 'rtl']]);
  const gsG = new THREE.Group();
  gsG.position.set(-30.5, 0, 15);
  gsG.rotation.y = Math.PI / 2 - 0.5;
  add(gsG);
  mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshStandardMaterial({ map: gsTex, emissiveMap: gsTex, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.4 }), 0, 2.6, 0, gsG);
  for (const x of [-2.8, 2.8]) cyl(0.08, 0.08, 1.8, mat.steel, x, 0.9, -0.1, 8, gsG);
  /** The plan's ground segment: g1 = Oman only, g2 = + polar station, g3 = global network. */
  const setStations = (id) => {
    const n = id === 'g3' ? 2 : id === 'g2' ? 1 : 0;
    small.forEach((d, i) => { d.led.material.color.setRGB(...(i < n ? [0.35, 1.9, 2.4] : [0.25, 0.27, 0.3])); });
  };
  setStations('g1');

  // --- Roads: from the yard to the launch site -----------------------------------------------------
  const road = (w, d, x, z) => { const r = mesh(new THREE.PlaneGeometry(w, d), mat.asphalt, x, -0.015, z); r.rotation.x = -Math.PI / 2; r.receiveShadow = true; return r; };
  road(70, 8, 90, 30);                                        // east along the yard
  road(8, 50, pad.x - 4, 9);                                   // north to the pad
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  for (let x = 58; x < 120; x += 6) { const l = mesh(new THREE.PlaneGeometry(3, 0.2), lineMat, x, -0.005, 30); l.rotation.x = -Math.PI / 2; }
  const apron = mesh(new THREE.PlaneGeometry(46, 46), mat.concrete, pad.x, -0.03, pad.z);
  apron.rotation.x = -Math.PI / 2;
  apron.receiveShadow = true;

  // Street lamps along the road (they glow, they do not cast light: the sun does that)
  const lampPoles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 7, 8), mat.steel, 14);
  const lampHeads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.12, 0.34), mat.lamp, 14);
  let li = 0;
  for (let x = -30; x <= 120 && li < 14; x += 12) {
    lampPoles.setMatrixAt(li, m4.compose(p3.set(x, 3.5, 39), q.identity(), s3.set(1, 1, 1)));
    lampHeads.setMatrixAt(li, m4.compose(p3.set(x, 7.0, 38.4), q.identity(), s3.set(0.25, 1, 4)));
    li++;
  }
  lampPoles.count = li; lampHeads.count = li;
  add(lampPoles); add(lampHeads);

  // --- Etlaq launch site ----------------------------------------------------------------------------
  const P = pad;
  // Lightning masts with red beacons
  const beacons = [];
  for (const [dx, dz] of [[-17, -17], [17, -17], [-17, 17], [17, 17]]) {
    cyl(0.14, 0.55, 48, mat.steel, P.x + dx, 24, P.z + dz, 10);
    for (const y of [12, 24, 36]) box(1.6, 0.12, 0.12, mat.steel, P.x + dx, y, P.z + dz);
    beacons.push(mesh(new THREE.SphereGeometry(0.32, 10, 8), mat.red, P.x + dx, 48.3, P.z + dz));
  }
  animated.push(() => { const on = Math.sin(clock * 2.4) > -0.2; for (const b of beacons) b.visible = on; });
  // Flame trench and service road marks
  box(9, 0.5, 26, mat.dark, P.x + 9, -0.2, P.z).rotation.y = 0;
  // Tank farm: propellant spheres on legs, and horizontal tanks
  for (const [dx, dz] of [[26, 20], [34, 20]]) {
    mesh(new THREE.SphereGeometry(3.4, 28, 18), mat.tank, P.x + dx, 4.6, P.z + dz);
    for (let k = 0; k < 4; k++) cyl(0.14, 0.14, 4.4, mat.steel, P.x + dx + Math.cos(k * 1.57 + 0.78) * 2.4, 2.2, P.z + dz + Math.sin(k * 1.57 + 0.78) * 2.4, 8);
  }
  for (const dz of [28, 32, 36]) { const t = cyl(1.5, 1.5, 11, mat.tank, P.x + 30, 2.1, P.z + dz, 24); t.rotation.z = Math.PI / 2; }
  box(13, 0.6, 12, mat.concrete, P.x + 30, 0.3, P.z + 32);
  cyl(0.12, 0.12, 30, mat.orange, P.x + 16, 0.5, P.z + 22, 8).rotation.set(0, 0.5, Math.PI / 2);
  // Integration hangar with a tall door, and a rail to the pad
  const hx = P.x - 6; const hz = P.z - 58;
  box(34, 17, 22, mat.hangar, hx, 8.5, hz);
  box(34.6, 1.2, 22.6, mat.band, hx, 17.5, hz);
  box(12, 14, 0.3, mat.dark, hx, 7, hz + 11.1);
  for (let i = 0; i < 7; i++) box(12, 0.12, 0.34, mat.steel, hx, 1 + i * 2, hz + 11.2);
  const etlaq = signTex([['ETLAQ', 150, '"Space Grotesk"', null, 130], ['إطلاق', 84, '"IBM Plex Sans Arabic"', '#ffb547', 218, 'rtl']]);
  mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshStandardMaterial({ map: etlaq, emissiveMap: etlaq, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.4 }), hx - 10.5, 13.6, hz + 11.2);
  for (const dx of [-1.1, 1.1]) box(0.16, 0.12, 46, mat.steel, hx + dx, 0.06, hz + 34);
  // Floodlight towers
  for (const [dx, dz] of [[-24, 8], [24, -24]]) {
    cyl(0.16, 0.3, 22, mat.steel, P.x + dx, 11, P.z + dz, 8);
    box(3.4, 1.3, 0.3, mat.dark, P.x + dx, 22.4, P.z + dz);
    for (let k = -1; k <= 1; k++) box(0.8, 0.7, 0.1, mat.lamp, P.x + dx + k * 1.05, 22.4, P.z + dz + (dz > 0 ? -0.2 : 0.2));
  }
  // Fence around the site, with a gap for the road
  const fx0 = P.x - 34; const fx1 = P.x + 44; const fz0 = P.z - 74; const fz1 = P.z + 46;
  const ftex = fenceTexture();
  const fenceMat = (len) => { const t = ftex.clone(); t.repeat.set(len / 0.9, 2.4); t.needsUpdate = true; return new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, color: 0xc7ced8 }); };
  const run = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const f = mesh(new THREE.PlaneGeometry(len, 2.2), fenceMat(len), (x0 + x1) / 2, 1.1, (z0 + z1) / 2);
    f.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    const n = Math.round(len / 3);
    for (let i = 0; i <= n; i++) cyl(0.045, 0.045, 2.4, mat.steel, x0 + ((x1 - x0) * i) / n, 1.2, z0 + ((z1 - z0) * i) / n, 6);
    solid(Math.min(x0, x1) - 0.15, Math.max(x0, x1) + 0.15, Math.min(z0, z1) - 0.15, Math.max(z0, z1) + 0.15);
  };
  run(fx0, fz0, fx1, fz0); run(fx1, fz0, fx1, fz1); run(fx0, fz0, fx0, fz1);
  run(fx0, fz1, P.x - 9, fz1); run(P.x + 1, fz1, fx1, fz1);    // the gate is where the road comes in
  // Gate house
  box(4, 3, 3, mat.white, P.x - 12, 1.5, fz1 + 3);
  box(4.4, 0.25, 3.4, mat.band, P.x - 12, 3.1, fz1 + 3);
  mesh(new THREE.PlaneGeometry(2.4, 1.1), mat.glassDark, P.x - 12, 1.9, fz1 + 4.52);
  solid(P.x - 14, P.x - 10, fz1 + 1.5, fz1 + 4.5);

  // --- Keep walkers on the flat ground ---------------------------------------------------------------
  solid(FLAT.x0 - 6, FLAT.x0, FLAT.z0 - 6, FLAT.z1 + 6);
  solid(FLAT.x1, FLAT.x1 + 6, FLAT.z0 - 6, FLAT.z1 + 6);
  solid(FLAT.x0 - 6, FLAT.x1 + 6, FLAT.z0 - 6, FLAT.z0);
  solid(FLAT.x0 - 6, FLAT.x1 + 6, FLAT.z1, FLAT.z1 + 6);

  return { update(dt) { for (const f of animated) f(dt); }, setStations };
}
