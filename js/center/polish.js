// Finishing touches for the Space Center, built in code with no downloads:
//   outside: date palms that sway in the wind, a pavement with planters along the facade
//   inside:  real NASA images of Oman framed on the office wall (the files in assets/nasa),
//            and a rug in the waiting area
// world.js calls buildPolish() once; the returned update(dt) is called every frame.
import * as THREE from 'three';

const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// --- Textures drawn on a canvas ---------------------------------------------------------------------
function frondTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 1024;
  const g = c.getContext('2d');
  const r = seeded(7);
  for (let i = 0; i < 68; i++) {
    const t = i / 67;                                   // 0 at the trunk, 1 at the tip
    const y = 1004 - t * 968;
    const len = (0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.1))) * 120 * (1 - t * 0.2);
    for (const side of [-1, 1]) {
      const s = 60 + r() * 60;
      g.strokeStyle = `rgb(${Math.round(34 + s * 0.42)}, ${Math.round(62 + s * 0.9)}, ${Math.round(26 + s * 0.22)})`;
      g.lineWidth = 8.5 - t * 4;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(128, y);
      g.quadraticCurveTo(128 + side * len * 0.6, y - 24, 128 + side * len, y - 44 - t * 22);
      g.stroke();
    }
  }
  g.strokeStyle = '#b3a45a';
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(128, 1024);
  g.lineTo(128, 28);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function trunkTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#7b6249';
  g.fillRect(0, 0, 128, 256);
  const r = seeded(3);
  // Old leaf bases: rows of dark scallops, each row shifted by half a step
  for (let row = 0; row < 8; row++) {
    for (let k = -1; k < 5; k++) {
      const x = k * 32 + (row % 2) * 16;
      const y = row * 32;
      g.fillStyle = `rgba(${40 + r() * 20}, ${28 + r() * 12}, ${18 + r() * 8}, 0.55)`;
      g.beginPath();
      g.moveTo(x, y + 30);
      g.quadraticCurveTo(x + 16, y - 2, x + 32, y + 30);
      g.quadraticCurveTo(x + 16, y + 18, x, y + 30);
      g.fill();
      g.strokeStyle = 'rgba(190,160,120,0.25)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x + 3, y + 31);
      g.quadraticCurveTo(x + 16, y + 20, x + 29, y + 31);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 9);
  return tex;
}

function rugTexture() {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 512;
  const g = c.getContext('2d');
  const band = (inset, colour) => { g.fillStyle = colour; g.fillRect(inset, inset, 768 - 2 * inset, 512 - 2 * inset); };
  band(0, '#e9dcc0');
  band(14, '#1d2c4a');
  band(34, '#e9dcc0');
  band(44, '#7c1f24');
  // Rows of diamonds and zigzags, like woven sadu
  const diamond = (x, y, w, h, colour) => { g.fillStyle = colour; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + w, y); g.lineTo(x, y + h); g.lineTo(x - w, y); g.closePath(); g.fill(); };
  for (let i = 0; i < 9; i++) {
    const x = 96 + i * 72;
    diamond(x, 256, 34, 70, '#e9dcc0');
    diamond(x, 256, 22, 46, '#1d2c4a');
    diamond(x, 256, 9, 19, '#d59a3a');
  }
  for (const y of [112, 400]) {
    g.strokeStyle = '#e9dcc0';
    g.lineWidth = 6;
    g.beginPath();
    for (let i = 0; i <= 28; i++) g.lineTo(64 + i * 22.9, y + (i % 2 ? -16 : 16));
    g.stroke();
    g.strokeStyle = '#d59a3a';
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i <= 28; i++) g.lineTo(64 + i * 22.9, y + 30 + (i % 2 ? -10 : 10));
    g.stroke();
  }
  // a little wear, so it is not a flat print
  const r = seeded(11);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 240 : 0},${r() > 0.5 ? 220 : 0},0.035)`;
    g.fillRect(r() * 768, r() * 512, 2 + r() * 3, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// --- Date palms ---------------------------------------------------------------------------------------
const FRONDS = 22;

function buildPalms(list, scene, outside) {
  const group = new THREE.Group();
  group.name = 'Palms';
  scene.add(group);
  outside.push(group);

  // One frond: a strip that rises from the crown, arches over and hangs, folded along its rib
  const frondGeo = new THREE.PlaneGeometry(1.7, 1, 2, 12);
  const p = frondGeo.attributes.position;
  const L = 4.5;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const t = p.getY(i) + 0.5;
    p.setXYZ(i, x * (1 - 0.3 * t), 1.25 * t - 2.7 * t * t - Math.abs(x) * 0.42, L * t * (1 - 0.14 * t));
  }
  frondGeo.computeVertexNormals();
  const frondMat = new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.75, metalness: 0 });
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, list.length * FRONDS);
  fronds.frustumCulled = false;

  // Trunk: a tapering column that leans a little
  const LEAN = 0.9;
  const trunkGeo = new THREE.CylinderGeometry(0.17, 0.31, 1, 10, 10, true);
  trunkGeo.translate(0, 0.5, 0);
  const q = trunkGeo.attributes.position;
  for (let i = 0; i < q.count; i++) q.setX(i, q.getX(i) + LEAN * q.getY(i) * q.getY(i));
  trunkGeo.computeVertexNormals();
  const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTexture(), roughness: 0.95 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, list.length);
  trunks.frustumCulled = false;

  // Crown: the knot of old leaf bases, with bunches of dates under it
  const knots = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.46, 1), new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 1, flatShading: true }), list.length);
  const dates = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xc27f24, roughness: 0.8, flatShading: true }), list.length * 3);
  knots.frustumCulled = dates.frustumCulled = false;

  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const eul = new THREE.Euler(0, 0, 0, 'YXZ');
  const crowns = [];
  list.forEach(([x, z, s], i) => {
    const r = seeded(101 + i * 37);
    const h = (6.4 + r() * 2.2) * s;
    const yaw = r() * Math.PI * 2;
    quat.setFromEuler(eul.set(0, yaw, 0));
    trunks.setMatrixAt(i, m.compose(pos.set(x, 0, z), quat, scl.set(s, h, s)));
    const top = new THREE.Vector3(LEAN * s, h, 0).applyQuaternion(quat).add(new THREE.Vector3(x, 0, z));
    knots.setMatrixAt(i, m.compose(top, quat, scl.set(s, s * 1.15, s)));
    for (let k = 0; k < 3; k++) {
      const a = yaw + k * 2.1 + r();
      dates.setMatrixAt(i * 3 + k, m.compose(pos.set(top.x + Math.cos(a) * 0.42 * s, top.y - 0.55 * s, top.z + Math.sin(a) * 0.42 * s), quat, scl.set(0.17 * s, 0.4 * s, 0.17 * s)));
    }
    const fr = [];
    for (let k = 0; k < FRONDS; k++) {
      const tier = k / (FRONDS - 1);                    // 0 = youngest, standing up; 1 = oldest, hanging
      fr.push({ az: k * 2.39996 + yaw, pitch: 1.0 - 1.45 * tier + (r() - 0.5) * 0.2, size: (0.72 + 0.4 * Math.sin(Math.PI * (0.25 + 0.7 * tier)) + r() * 0.12) * s, phase: r() * 6.28, roll: (r() - 0.5) * 0.35 });
    }
    crowns.push({ top, fr });
  });
  const eulF = new THREE.Euler(0, 0, 0, 'YXZ');
  const place = (time) => {
    let n = 0;
    for (const c of crowns) {
      for (const f of c.fr) {
        const sway = Math.sin(time * 1.25 + f.phase) * 0.045 + Math.sin(time * 0.43 + f.phase * 2) * 0.03;
        quat.setFromEuler(eulF.set(-(f.pitch + sway), f.az + sway * 0.4, f.roll));
        fronds.setMatrixAt(n++, m.compose(c.top, quat, scl.set(f.size, f.size, f.size)));
      }
    }
    fronds.instanceMatrix.needsUpdate = true;
  };
  place(0);
  group.add(trunks, knots, dates, fronds);
  let time = 0;
  return (dt) => { time += dt; place(time); };
}

// --- Pavement, kerb and planters along the south face ---------------------------------------------------
function buildForecourt({ scene, outside, colliders, pbr, ROOM }) {
  const group = new THREE.Group();
  group.name = 'Forecourt';
  scene.add(group);
  outside.push(group);
  const paving = pbr({ base: '#b3aea2', kind: 'tiles', repeat: [14, 2.4], rough: 0.85, roughVar: 0.12, bump: 2.2, stains: 0.16 });
  const kerbMat = new THREE.MeshStandardMaterial({ color: 0xd9d6cd, roughness: 0.9 });
  const planterMat = new THREE.MeshStandardMaterial({ color: 0xc9c4b8, roughness: 0.85 });
  const soil = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 1 });
  const leaves = [0x3f7d3a, 0x4d8f3f, 0x356b33].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }));
  const bloom = new THREE.MeshStandardMaterial({ color: 0xd6447a, roughness: 0.8, flatShading: true });   // bougainvillea
  const add = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); group.add(o); return o; };
  // Keep-clear hatching in front of the loading door
  const hc = document.createElement('canvas');
  hc.width = 256;
  hc.height = 384;
  const hg = hc.getContext('2d');
  hg.strokeStyle = '#e8b22a';
  hg.lineWidth = 9;
  hg.strokeRect(5, 5, 246, 374);
  hg.lineWidth = 7;
  for (let i = -8; i < 12; i++) { hg.beginPath(); hg.moveTo(i * 44, 0); hg.lineTo(i * 44 + 384, 384); hg.stroke(); }
  const hatchTex = new THREE.CanvasTexture(hc);
  hatchTex.colorSpace = THREE.SRGBColorSpace;
  hatchTex.anisotropy = 4;
  const hatch = add(new THREE.PlaneGeometry(6, 8.6), new THREE.MeshBasicMaterial({ map: hatchTex, transparent: true, opacity: 0.8, depthWrite: false }), -1, -0.008, ROOM.z1 + 4.9);
  hatch.rotation.x = -Math.PI / 2;
  const z0 = ROOM.z1 + 0.35;
  const depth = 3.2;
  const r = seeded(29);
  // two strips, left and right of the loading door
  for (const [x0, x1] of [[ROOM.x0 - 1.5, -4.6], [2.6, ROOM.x1 + 1.5]]) {
    const w = x1 - x0;
    const slab = add(new THREE.BoxGeometry(w, 0.14, depth), paving, (x0 + x1) / 2, 0.05, z0 + depth / 2);
    slab.receiveShadow = true;
    add(new THREE.BoxGeometry(w + 0.3, 0.18, 0.22), kerbMat, (x0 + x1) / 2, 0.06, z0 + depth + 0.11);
    add(new THREE.BoxGeometry(0.22, 0.18, depth), kerbMat, x0 < 0 ? x1 + 0.11 : x0 - 0.11, 0.06, z0 + depth / 2);
    const n = Math.floor(w / 5.2);
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * (w / n);
      const z = z0 + 0.75;
      add(new THREE.BoxGeometry(2.6, 0.6, 0.95), planterMat, x, 0.42, z);
      add(new THREE.BoxGeometry(2.4, 0.04, 0.75), soil, x, 0.73, z);
      for (let k = 0; k < 6; k++) {
        const sz = 0.26 + r() * 0.2;
        const b = add(new THREE.IcosahedronGeometry(sz, 1), k === 2 || k === 4 ? bloom : leaves[k % 3], x - 0.95 + k * 0.38, 0.86 + r() * 0.16, z + (r() - 0.5) * 0.25);
        b.scale.y = 0.8 + r() * 0.5;
        b.rotation.y = r() * 3;
      }
      colliders.push({ x0: x - 1.35, x1: x + 1.35, z0: z - 0.55, z1: z + 0.55 });
    }
  }
}

// --- Office: NASA images of Oman on the wall, and a rug ----------------------------------------------------
const WALL_IMAGES = [
  // file, English caption, Arabic caption, date
  ['khareef_a.jpg', 'Dhofar before the Khareef', 'ظفار قبل الخريف', '2024-05-10'],
  ['khareef_b.jpg', 'Dhofar in the Khareef · half under cloud', 'ظفار في الخريف · نصفها تحت السحب', '2024-08-10'],
  ['aflaj_a.jpg', 'Al Hajar mountains around Nizwa', 'جبال الحجر حول نزوى', '2023-12-12'],
  ['aflaj_b.png', 'Land surface temperature, Al Hajar', 'حرارة سطح الأرض، جبال الحجر', '2023-12-12'],
  ['dunes_a.jpg', 'Sharqiya Sands', 'رمال الشرقية', '2023-02-15'],
  ['dunes_b.jpg', 'Sharqiya Sands, one year later', 'رمال الشرقية بعد عام', '2024-01-20'],
];

function buildOffice({ scene, signTex }) {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.4, metalness: 0.6 });
  const loader = new THREE.TextureLoader();
  const X = -9.2;                 // the office side of the wall between the office and the warehouse
  const W = 2.2;
  const H = 1.24;
  const slots = [-9.3, -6.6, -3.9, 3.9, 6.6, 9.3];
  WALL_IMAGES.forEach(([file, en, ar, date], i) => {
    const z = slots[i];
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, H + 0.14, W + 0.14), frameMat);
    frame.position.set(X + 0.02, 2.55, z);
    scene.add(frame);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.3 });
    loader.load(`assets/nasa/${file}`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      // fill the frame without stretching the image
      const a = tex.image.width / tex.image.height;
      const f = W / H;
      if (a > f) { tex.repeat.x = f / a; tex.offset.x = (1 - tex.repeat.x) / 2; } else { tex.repeat.y = a / f; tex.offset.y = (1 - tex.repeat.y) / 2; }
      mat.map = tex;
      mat.emissiveMap = tex;
      mat.needsUpdate = true;
    });
    const picture = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
    picture.position.set(X - 0.012, 2.55, z);
    picture.rotation.y = -Math.PI / 2;
    scene.add(picture);
    const cap = signTex([[en, 50, '"Space Grotesk"', null, 58], [ar, 44, '"IBM Plex Sans Arabic"', '#ffb547', 118, 'rtl'], [`NASA MODIS · Terra · ${date}`, 30, '"JetBrains Mono"', '#8fa3bf', 166]], { w: 1024, h: 190 });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(W, W * 190 / 1024), new THREE.MeshStandardMaterial({ map: cap, emissiveMap: cap, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.4 }));
    plaque.position.set(X - 0.012, 1.64, z);
    plaque.rotation.y = -Math.PI / 2;
    scene.add(plaque);
  });
  for (const z of [-6.6, 6.6]) {
    const head = signTex([['OMAN FROM SPACE · REAL NASA IMAGES', 64, '"Space Grotesk"', null, 100], ['عُمان من الفضاء · صور حقيقية من ناسا', 56, '"IBM Plex Sans Arabic"', '#ffb547', 190, 'rtl']], { w: 1536, h: 256 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1), new THREE.MeshStandardMaterial({ map: head, emissiveMap: head, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.35 }));
    sign.position.set(X - 0.012, 3.95, z);
    sign.rotation.y = -Math.PI / 2;
    scene.add(sign);
  }
  // Rug under the sofa and coffee table
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.1), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }));
  rug.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  rug.position.set(-18.9, 0.012, 4);
  rug.receiveShadow = true;
  scene.add(rug);
}

// --- Omani identity: a crenellated roof line, as on Oman's forts and many public buildings,
//     and a coffee set (dallah and cups) on the table in the waiting area ----------------------------
function buildIdentity({ scene, outside, ROOM }) {
  const group = new THREE.Group();
  group.name = 'OmaniRoofLine';
  scene.add(group);
  outside.push(group);
  const stone = new THREE.MeshStandardMaterial({ color: 0xd9dee6, roughness: 0.8 });
  const x0 = ROOM.x0 - 0.25;
  const x1 = ROOM.x1 + 0.25;
  const z0 = ROOM.z0 - 0.25;
  const z1 = ROOM.z1 + 0.25;
  const y = ROOM.h + 1.0;                               // top of the parapet band
  const spots = [];
  const STEP = 1.45;
  for (let x = x0 + 0.5; x <= x1 - 0.4; x += STEP) { spots.push([x, z0, 0]); spots.push([x, z1, 0]); }
  for (let z = z0 + 0.5; z <= z1 - 0.4; z += STEP) { spots.push([x0, z, Math.PI / 2]); spots.push([x1, z, Math.PI / 2]); }
  const base = new THREE.InstancedMesh(new THREE.BoxGeometry(0.72, 0.42, 0.26), stone, spots.length);
  const cap = new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.24, 0.26), stone, spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  spots.forEach(([x, z, ry], i) => {
    q.setFromEuler(e.set(0, ry, 0));
    base.setMatrixAt(i, m.compose(new THREE.Vector3(x, y + 0.21, z), q, one));
    cap.setMatrixAt(i, m.compose(new THREE.Vector3(x, y + 0.54, z), q, one));
  });
  group.add(base, cap);

  // Coffee set on the table by the sofa
  const set = new THREE.Group();
  set.position.set(-18.9, 0.425, 4.06);
  scene.add(set);
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9b25a, roughness: 0.3, metalness: 0.85 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.4 });
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.008, 28), new THREE.MeshStandardMaterial({ color: 0x7a5a2c, roughness: 0.45, metalness: 0.5 }));
  tray.position.y = 0.004;
  set.add(tray);
  const P = (r, h) => new THREE.Vector2(r, h);
  const dallah = new THREE.Mesh(new THREE.LatheGeometry([P(0, 0), P(0.05, 0), P(0.062, 0.012), P(0.052, 0.05), P(0.031, 0.115), P(0.047, 0.165), P(0.03, 0.2), P(0.036, 0.208), P(0.02, 0.24), P(0.006, 0.262), P(0, 0.275)], 20), gold);
  dallah.position.set(-0.05, 0.008, 0);
  set.add(dallah);
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.11, 10), gold);
  spout.position.set(0.012, 0.165, 0);
  spout.rotation.z = -1.05;
  set.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.006, 6, 14, Math.PI), gold);
  handle.position.set(-0.098, 0.13, 0);
  handle.rotation.z = Math.PI / 2;
  set.add(handle);
  for (const [x, z] of [[0.08, 0.07], [0.1, -0.05], [0.03, -0.11]]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.015, 0.034, 12), white);
    cup.position.set(x, 0.025, z);
    set.add(cup);
  }
}

export function buildPolish({ scene, outside, colliders, pbr, signTex, ROOM, palms }) {
  const sway = buildPalms(palms, scene, outside);
  buildForecourt({ scene, outside, colliders, pbr, ROOM });
  buildOffice({ scene, signTex });
  buildIdentity({ scene, outside, ROOM });
  return { update(dt) { sway(dt); } };
}
