// The Duqm Space Settlement: an analog habitat north-east of the Space Center, where crews
// rehearse life on the Moon and Mars. This is our own model, inspired by the Space Settlement
// Centre that Global Space and Technology Company is building in the Duqm Special Economic
// Zone (its space zone, Zone 88). It is not the official design. Built in code, no downloads.
//
// The base (a central dome, four arms, eight pods, an airlock, rovers) is always there.
// Four more modules appear as the player's missions earn stars: see SETTLEMENT_STAGES.
// world.js calls buildSettlement() once; main.js calls setStars(n) and update(dt).
import * as THREE from 'three';

export const SETTLEMENT_STAGES = [
  { id: 'greenhouse', stars: 2 },
  { id: 'solar', stars: 4 },
  { id: 'lab', stars: 6 },
  { id: 'lander', stars: 9 },
];
const OFF = { x0: 1e6, x1: 1e6, z0: 1e6, z1: 1e6 };

export function buildSettlement({ scene, outside, colliders, interactables, pbr, signTex, hitMat, at }) {
  const root = new THREE.Group();
  root.name = 'DuqmSpaceSettlement';
  root.position.set(at.x, 0, at.z);
  scene.add(root);
  outside.push(root);
  const stages = SETTLEMENT_STAGES.map((s) => {
    const group = new THREE.Group();
    group.name = s.id;
    root.add(group);
    return { ...s, group, solids: [] };
  });
  const [greenhouse, solar, lab, lander] = stages;

  const mat = {
    shell: pbr({ base: '#ece6d9', kind: 'panels', repeat: [6, 1], rough: 0.62, roughVar: 0.12, bump: 1.4, stains: 0.08 }),
    cap: new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.5, metalness: 0.03 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xe2dccf, roughness: 0.66 }),
    ring: new THREE.MeshStandardMaterial({ color: 0x8f98a3, roughness: 0.5, metalness: 0.5 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xd8692e, roughness: 0.55, metalness: 0.2 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x10263d, roughness: 0.08, metalness: 0.85 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x232a35, roughness: 0.6, metalness: 0.4 }),
    ground: new THREE.MeshStandardMaterial({ color: 0xb08f6a, roughness: 1 }),
    path: new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.92 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xa9a59b, roughness: 0.9 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc9a04a, roughness: 0.35, metalness: 0.8 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4f9a45, roughness: 0.9, flatShading: true }),
    soil: new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 }),
    film: new THREE.MeshStandardMaterial({ color: 0xcfeee2, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.36, side: THREE.DoubleSide, depthWrite: false }),
    beacon: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.25, 0.2) }),
    amber: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.5) }),
    cyan: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 1.9, 2.4) }),
  };

  const add = (geo, material, x, y, z, parent = root) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const rod = (a, b, r, material, parent) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8), material);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    parent.add(m);
    return m;
  };
  /** Something you cannot walk through, in the settlement's own coordinates. */
  const solid = (x0, x1, z0, z1, stage) => {
    const on = { x0: at.x + x0, x1: at.x + x1, z0: at.z + z0, z1: at.z + z1 };
    const c = { ...on };
    colliders.push(c);
    if (stage) stage.solids.push({ c, on });
  };

  // A dome on a short drum, with a ring at the joint and windows between the corridors
  const dome = (x, z, r, { h = r * 0.42, windows = 0, parent = root, stage } = {}) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    parent.add(g);
    add(new THREE.CylinderGeometry(r * 1.05, r * 1.09, 0.3, 36), mat.ring, 0, 0.15, 0, g);
    add(new THREE.CylinderGeometry(r, r, h, 36, 1, true), mat.shell, 0, 0.3 + h / 2, 0, g);
    const cap = add(new THREE.SphereGeometry(r, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat.cap, 0, 0.3 + h, 0, g);
    cap.scale.y = 0.74;
    add(new THREE.TorusGeometry(r * 1.005, 0.07, 8, 48), mat.orange, 0, 0.3 + h, 0, g).rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(r * 0.16, r * 0.2, 0.25, 16), mat.ring, 0, 0.3 + h + r * 0.74, 0, g);
    for (let i = 0; i < windows; i++) {
      const a = ((i + 0.5) / windows) * Math.PI * 2;
      add(new THREE.BoxGeometry(Math.min(1.2, r * 0.3), h * 0.5, 0.1), mat.glass, Math.sin(a) * (r + 0.01), 0.3 + h * 0.56, Math.cos(a) * (r + 0.01), g).rotation.y = a;
    }
    solid(x - r * 0.85, x + r * 0.85, z - r * 0.85, z + r * 0.85, stage);
    return g;
  };

  // A corridor between two points, along x or along z: low walls and a round roof with ribs
  const tube = (x0, z0, x1, z1, { w = 2.3, parent = root, stage } = {}) => {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const wall = 0.9;
    add(new THREE.BoxGeometry(alongX ? len : w, wall, alongX ? w : len), mat.wall, cx, wall / 2, cz, parent);
    const roof = add(new THREE.CylinderGeometry(w / 2, w / 2, len, 20, 1, true, alongX ? 0 : Math.PI / 2, Math.PI), mat.cap, cx, wall, cz, parent);
    if (alongX) roof.rotation.z = Math.PI / 2; else roof.rotation.x = Math.PI / 2;
    const n = Math.max(1, Math.round(len / 2));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5;
      const rib = add(new THREE.TorusGeometry(w / 2 + 0.02, 0.05, 6, 16, Math.PI), mat.ring, cx + (alongX ? t * len : 0), wall, cz + (alongX ? 0 : t * len), parent);
      if (alongX) rib.rotation.y = Math.PI / 2;
    }
    solid(Math.min(x0, x1) - (alongX ? 0 : w / 2), Math.max(x0, x1) + (alongX ? 0 : w / 2), Math.min(z0, z1) - (alongX ? w / 2 : 0), Math.max(z0, z1) + (alongX ? w / 2 : 0), stage);
  };

  // --- Ground: packed regolith under the habitat, and the path from the Space Center ---------------
  const yard = add(new THREE.CircleGeometry(30, 56), mat.ground, 0, -0.012, 0);
  yard.rotation.x = -Math.PI / 2;
  add(new THREE.BoxGeometry(3, 0.04, 51), mat.path, -28, -0.025, 25.5);        // north from the yard of the Space Center
  add(new THREE.BoxGeometry(8.2, 0.04, 3), mat.path, -25.4, -0.024, 0);        // east to the airlock

  // --- The base: central dome, four arms, two pods on each arm ---------------------------------------
  dome(0, 0, 6.5, { h: 2.4, windows: 8 });
  const ARM = 15.5;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = dx * ARM;
    const z = dz * ARM;
    dome(x, z, 3.4, { h: 1.7, windows: 4 });
    tube(dx * 6.3, dz * 6.3, dx * (ARM - 3.2), dz * (ARM - 3.2));
    for (const s of [-1, 1]) {
      const sx = dz !== 0 ? s : 0;                    // the pods sit to the sides of the arm
      const sz = dx !== 0 ? s : 0;
      dome(x + sx * 6.4, z + sz * 6.4, 2.1, { h: 1.3 });
      tube(x + sx * 3.2, z + sz * 3.2, x + sx * 4.5, z + sz * 4.5, { w: 1.7 });
    }
  }
  // Mast on the central dome, with a beacon
  add(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 8), mat.ring, 0, 0.3 + 2.4 + 6.5 * 0.74 + 1.6, 0);
  const beacons = [add(new THREE.SphereGeometry(0.16, 10, 8), mat.beacon.clone(), 0, 0.3 + 2.4 + 6.5 * 0.74 + 3.3, 0)];

  // Airlock on the west arm, facing the path
  const AX = -(ARM + 3.3 + 1.3);
  add(new THREE.BoxGeometry(2.8, 2.6, 3.2), mat.wall, AX, 1.3, 0);
  add(new THREE.BoxGeometry(2.9, 0.22, 3.3), mat.orange, AX, 2.7, 0);
  add(new THREE.BoxGeometry(0.08, 2.0, 1.3), mat.dark, AX - 1.41, 1.05, 0);                  // the door
  add(new THREE.BoxGeometry(0.1, 2.3, 0.14), mat.orange, AX - 1.42, 1.15, -0.78);
  add(new THREE.BoxGeometry(0.1, 2.3, 0.14), mat.orange, AX - 1.42, 1.15, 0.78);
  add(new THREE.BoxGeometry(0.12, 0.12, 0.5), mat.cyan, AX - 1.44, 2.3, 0);                  // light over the door
  add(new THREE.BoxGeometry(1.4, 0.1, 2.2), mat.concrete, AX - 2.1, 0.05, 0);                // step
  solid(AX - 1.4, AX + 1.4, -1.6, 1.6);

  // Two rovers parked by the airlock
  const rover = (x, z, ry) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    root.add(g);
    add(new THREE.BoxGeometry(2.4, 0.42, 1.3), mat.cap, 0, 0.78, 0, g);
    add(new THREE.BoxGeometry(1.15, 0.75, 1.2), mat.wall, 0.45, 1.35, 0, g);
    add(new THREE.BoxGeometry(0.06, 0.5, 1.05), mat.glass, 1.04, 1.4, 0, g);
    add(new THREE.BoxGeometry(1.0, 0.05, 1.1), mat.glass, -0.6, 1.05, 0, g).rotation.z = -0.2;      // solar deck
    for (const wx of [-0.85, 0, 0.85]) for (const wz of [-0.78, 0.78]) add(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 14), mat.dark, wx, 0.38, wz, g).rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), mat.ring, -0.2, 2.2, 0.3, g);
    add(new THREE.BoxGeometry(0.22, 0.16, 0.3), mat.dark, -0.2, 2.78, 0.3, g);
    solid(x - 1.3, x + 1.3, z - 1.3, z + 1.3);
  };
  rover(-22.6, 8.2, 0.5);
  rover(-19.6, 11.2, -0.9);

  // Flag of Oman, simplified, on a mast by the entrance
  const fm = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, side: THREE.DoubleSide });
  add(new THREE.CylinderGeometry(0.07, 0.09, 8.4, 10), mat.ring, -24.2, 4.2, -8.5);
  add(new THREE.BoxGeometry(0.03, 1.5, 0.7), fm(0xc8102e), -24.2, 7.4, -8.05);
  add(new THREE.BoxGeometry(0.03, 0.5, 1.7), fm(0xf4f4f2), -24.2, 7.9, -6.85);
  add(new THREE.BoxGeometry(0.03, 0.5, 1.7), fm(0xc8102e), -24.2, 7.4, -6.85);
  add(new THREE.BoxGeometry(0.03, 0.5, 1.7), fm(0x00843d), -24.2, 6.9, -6.85);

  // Marker lights around the yard (not across the entrance)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2;
    const x = Math.sin(a) * 28.6;
    const z = Math.cos(a) * 28.6;
    if (x < -24 && Math.abs(z) < 9) continue;
    add(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 6), mat.ring, x, 0.45, z);
    add(new THREE.SphereGeometry(0.09, 8, 6), mat.amber, x, 0.95, z);
  }

  // --- Name sign and the notice board you can read (E) ------------------------------------------------
  const lit = (tex) => new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.42, roughness: 0.4 });
  const signG = new THREE.Group();
  signG.position.set(-23.6, 0, -4.4);
  signG.rotation.y = -Math.PI / 4;
  root.add(signG);
  add(new THREE.PlaneGeometry(7.8, 1.3), lit(signTex([['DUQM SPACE SETTLEMENT', 92, '"Space Grotesk"', null, 116], ['مستوطنة الدقم للفضاء', 74, '"IBM Plex Sans Arabic"', '#ffb547', 212, 'rtl']], { w: 1536, h: 256 })), 0, 3.3, 0, signG);
  add(new THREE.BoxGeometry(8.0, 1.5, 0.08), mat.dark, 0, 3.3, -0.06, signG);
  for (const x of [-3.5, 3.5]) add(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), mat.ring, x, 1.3, -0.08, signG);
  solid(-26, -21.2, -6.6, -2.2);

  // Direction sign in the yard of the Space Center, where the path starts
  const wayG = new THREE.Group();
  wayG.position.set(-24.3, 0, 52.6);
  root.add(wayG);
  add(new THREE.PlaneGeometry(6.0, 1.0), lit(signTex([['↑ DUQM SPACE SETTLEMENT', 84, '"Space Grotesk"', null, 112], ['مستوطنة الدقم للفضاء ↑', 70, '"IBM Plex Sans Arabic"', '#ffb547', 208, 'rtl']], { w: 1536, h: 256 })), 0, 2.3, 0, wayG);
  add(new THREE.BoxGeometry(6.15, 1.15, 0.08), mat.dark, 0, 2.3, -0.06, wayG);
  for (const x of [-2.7, 2.7]) add(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 8), mat.ring, x, 0.9, -0.08, wayG);
  solid(-27.2, -21.4, 52.2, 52.9);

  const boardG = new THREE.Group();
  boardG.position.set(-25.2, 0, 4.6);
  boardG.rotation.y = -Math.PI / 4;
  root.add(boardG);
  const boardTex = signTex([
    ['ABOUT THE SETTLEMENT', 62, '"Space Grotesk"', null, 92],
    ['عن المستوطنة ودور عُمان في الفضاء', 56, '"IBM Plex Sans Arabic"', '#ffb547', 176, 'rtl'],
    ['Crews rehearse life on the Moon and Mars', 40, '"Space Grotesk"', '#c9d8ee', 262],
    ['طواقم تتدرب على العيش على القمر والمريخ', 40, '"IBM Plex Sans Arabic"', '#c9d8ee', 328, 'rtl'],
    ['E', 64, '"JetBrains Mono"', '#4de8ff', 440],
  ], { w: 1024, h: 512 });
  add(new THREE.PlaneGeometry(3.2, 1.6), lit(boardTex), 0, 1.7, 0, boardG);
  add(new THREE.BoxGeometry(3.36, 1.76, 0.08), mat.dark, 0, 1.7, -0.06, boardG);
  for (const x of [-1.4, 1.4]) add(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), mat.ring, x, 0.5, -0.08, boardG);
  const hit = add(new THREE.BoxGeometry(3.6, 2.4, 1.6), hitMat, 0, 1.6, 0.4, boardG);
  hit.userData = { kind: 'board', board: 'settlement' };
  interactables.push(hit);
  solid(-26.2, -24.2, 3.6, 5.6);

  // --- Stage 1 (2 stars): greenhouse --------------------------------------------------------------------
  {
    const g = greenhouse.group;
    const cx = 19.5;
    const cz = 17;
    const len = 13;
    const r = 2.7;
    add(new THREE.BoxGeometry(len, 0.5, r * 2), mat.wall, cx, 0.25, cz, g);
    add(new THREE.CylinderGeometry(r, r, len, 28, 1, true, 0, Math.PI), mat.film, cx, 0.5, cz, g).rotation.z = Math.PI / 2;
    for (let i = 0; i <= 8; i++) add(new THREE.TorusGeometry(r + 0.02, 0.055, 6, 20, Math.PI), mat.cap, cx - len / 2 + (i / 8) * len, 0.5, cz, g).rotation.y = Math.PI / 2;
    for (const s of [-1, 1]) {
      const end = add(new THREE.CircleGeometry(r, 20, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xe2dccf, roughness: 0.66, side: THREE.DoubleSide }), cx + s * len / 2, 0.5, cz, g);
      end.rotation.y = Math.PI / 2;
      add(new THREE.BoxGeometry(0.08, 1.9, 1.1), mat.dark, cx + s * (len / 2 + 0.03), 1.25, cz, g);
    }
    for (const bz of [-1.5, 0, 1.5]) {
      add(new THREE.BoxGeometry(len - 1.4, 0.3, 0.8), mat.soil, cx, 0.65, cz + bz, g);
      for (let i = 0; i < 9; i++) {
        const p = add(new THREE.IcosahedronGeometry(0.34 + ((i * 7 + bz * 3) % 3) * 0.06, 1), mat.leaf, cx - (len - 2.4) / 2 + i * ((len - 2.4) / 8), 1.0, cz + bz, g);
        p.scale.y = 1.1 + (i % 2) * 0.3;
      }
    }
    tube(8.4, 16, cx - len / 2, 16, { w: 1.7, parent: g, stage: greenhouse });
    solid(cx - len / 2, cx + len / 2, cz - r, cz + r, greenhouse);
  }

  // --- Stage 2 (4 stars): solar field -------------------------------------------------------------------
  {
    const g = solar.group;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const x2 = c.getContext('2d');
    x2.fillStyle = '#12233f';
    x2.fillRect(0, 0, 256, 128);
    x2.strokeStyle = 'rgba(160,190,230,.5)';
    x2.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { x2.beginPath(); x2.moveTo(i * 32, 0); x2.lineTo(i * 32, 128); x2.stroke(); }
    for (let i = 0; i <= 4; i++) { x2.beginPath(); x2.moveTo(0, i * 32); x2.lineTo(256, i * 32); x2.stroke(); }
    const cells = new THREE.CanvasTexture(c);
    cells.colorSpace = THREE.SRGBColorSpace;
    cells.wrapS = cells.wrapT = THREE.RepeatWrapping;
    cells.repeat.set(5, 1);
    const panel = new THREE.MeshStandardMaterial({ map: cells, roughness: 0.22, metalness: 0.55 });
    for (const z of [-20.2, -16.6, -13]) {
      const row = add(new THREE.BoxGeometry(12.6, 0.07, 1.7), panel, -15.6, 1.25, z, g);
      row.rotation.x = 0.45;
      for (let i = 0; i < 5; i++) {
        add(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), mat.ring, -21.2 + i * 2.8, 0.75, z + 0.35, g);
        add(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), mat.ring, -21.2 + i * 2.8, 0.45, z - 0.5, g);
      }
      solid(-21.9, -9.3, z - 0.6, z + 0.6, solar);
    }
    add(new THREE.BoxGeometry(2.4, 2.2, 1.6), mat.wall, -24.6, 1.1, -16.6, g);                 // battery store
    add(new THREE.BoxGeometry(2.45, 0.25, 1.65), mat.orange, -24.6, 1.9, -16.6, g);
    solid(-25.8, -23.4, -17.4, -15.8, solar);
  }

  // --- Stage 3 (6 stars): research and training building ---------------------------------------------------
  {
    const g = lab.group;
    const cx = 17.5;
    const cz = -15.5;
    const half = 4.5;
    const r = 2.9;
    const H = 6;
    add(new THREE.BoxGeometry(half * 2 + r * 2 + 0.6, 0.3, r * 2 + 0.6), mat.concrete, cx, 0.15, cz, g);
    add(new THREE.BoxGeometry(half * 2, H, r * 2), mat.cap, cx, 0.3 + H / 2, cz, g);
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(r, r, H, 28, 1, false, s > 0 ? 0 : Math.PI, Math.PI), mat.cap, cx + s * half, 0.3 + H / 2, cz, g);
    for (const y of [2.0, 4.6]) {
      add(new THREE.BoxGeometry(half * 2, 1.05, r * 2 + 0.06), mat.glass, cx, 0.3 + y, cz, g);
      for (const s of [-1, 1]) add(new THREE.CylinderGeometry(r + 0.03, r + 0.03, 1.05, 28, 1, true, s > 0 ? 0 : Math.PI, Math.PI), mat.glass, cx + s * half, 0.3 + y, cz, g);
    }
    add(new THREE.BoxGeometry(half * 2, 0.26, r * 2 + 0.5), mat.ring, cx, 0.3 + H + 0.13, cz, g);
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(r + 0.25, r + 0.25, 0.26, 28, 1, false, s > 0 ? 0 : Math.PI, Math.PI), mat.ring, cx + s * half, 0.3 + H + 0.13, cz, g);
    // a small observatory on the roof
    add(new THREE.CylinderGeometry(1.45, 1.45, 0.8, 24), mat.wall, cx + 3.2, 0.3 + H + 0.66, cz, g);
    add(new THREE.SphereGeometry(1.45, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat.cap, cx + 3.2, 0.3 + H + 1.06, cz, g);
    add(new THREE.BoxGeometry(0.5, 1.2, 0.1), mat.dark, cx + 3.2, 0.3 + H + 1.75, cz + 1.05, g).rotation.x = -0.75;
    // entrance and name, on the south face
    add(new THREE.BoxGeometry(1.8, 2.2, 0.1), mat.dark, cx - 1.5, 1.4, cz + r + 0.04, g);
    add(new THREE.BoxGeometry(2.6, 0.14, 1.3), mat.orange, cx - 1.5, 2.65, cz + r + 0.6, g);
    add(new THREE.PlaneGeometry(5.2, 0.9), lit(signTex([['RESEARCH AND TRAINING', 84, '"Space Grotesk"', null, 108], ['مركز الأبحاث والتدريب', 70, '"IBM Plex Sans Arabic"', '#ffb547', 206, 'rtl']], { w: 1480, h: 256 })), cx + 1.4, 0.3 + 3.3, cz + r + 0.05, g);
    tube(15.5, -8.4, 15.5, cz + r, { w: 1.7, parent: g, stage: lab });
    solid(cx - half - r, cx + half + r, cz - r, cz + r, lab);
  }

  // --- Stage 4 (9 stars): landing pad with a lander mock-up -------------------------------------------------
  {
    const g = lander.group;
    const cx = -17.5;
    const cz = 17.5;
    add(new THREE.CylinderGeometry(5.2, 5.3, 0.14, 44), mat.concrete, cx, 0.05, cz, g);
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x2 = c.getContext('2d');
    x2.strokeStyle = '#e8b22a';
    x2.lineWidth = 16;
    x2.beginPath(); x2.arc(256, 256, 236, 0, Math.PI * 2); x2.stroke();
    x2.lineWidth = 10;
    x2.beginPath(); x2.arc(256, 256, 120, 0, Math.PI * 2); x2.stroke();
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; x2.beginPath(); x2.moveTo(256 + Math.cos(a) * 130, 256 + Math.sin(a) * 130); x2.lineTo(256 + Math.cos(a) * 226, 256 + Math.sin(a) * 226); x2.stroke(); }
    const marks = new THREE.CanvasTexture(c);
    marks.colorSpace = THREE.SRGBColorSpace;
    marks.anisotropy = 4;
    const mk = add(new THREE.PlaneGeometry(10.4, 10.4), new THREE.MeshBasicMaterial({ map: marks, transparent: true, opacity: 0.85, depthWrite: false }), cx, 0.125, cz, g);
    mk.rotation.x = -Math.PI / 2;
    const L = new THREE.Group();
    L.position.set(cx, 0.12, cz);
    L.rotation.y = 0.4;
    g.add(L);
    add(new THREE.CylinderGeometry(1.5, 1.7, 1.3, 8), mat.gold, 0, 1.9, 0, L);
    add(new THREE.CylinderGeometry(0.25, 0.62, 0.75, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x232a35, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }), 0, 0.9, 0, L);
    add(new THREE.CylinderGeometry(1.0, 1.15, 1.2, 12), mat.cap, 0, 3.15, 0, L);
    add(new THREE.BoxGeometry(0.7, 0.45, 0.06), mat.glass, 0, 3.3, 1.08, L);
    add(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat.ring, 0.2, 3.75, -0.2, L);
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), mat.ring, -0.5, 4.2, 0.2, L);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const top = new THREE.Vector3(Math.cos(a) * 1.45, 1.6, Math.sin(a) * 1.45);
      const foot = new THREE.Vector3(Math.cos(a) * 2.9, 0.12, Math.sin(a) * 2.9);
      rod(top, foot, 0.07, mat.ring, L);
      rod(new THREE.Vector3(Math.cos(a) * 1.55, 2.4, Math.sin(a) * 1.55), foot.clone().lerp(top, 0.45), 0.045, mat.ring, L);
      add(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 14), mat.gold, foot.x, 0.06, foot.z, L);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      beacons.push(add(new THREE.SphereGeometry(0.1, 8, 6), mat.beacon.clone(), cx + Math.cos(a) * 5.0, 0.2, cz + Math.sin(a) * 5.0, g));
    }
    solid(cx - 2.2, cx + 2.2, cz - 2.2, cz + 2.2, lander);
  }

  let stars = -1;
  /** Show the modules that this many stars have earned. Returns how many are showing. */
  const setStars = (n) => {
    if (n !== stars) {
      stars = n;
      for (const s of stages) {
        const on = n >= s.stars;
        s.group.visible = on;
        for (const { c, on: box } of s.solids) Object.assign(c, on ? box : OFF);
      }
    }
    return stages.filter((s) => s.group.visible).length;
  };
  setStars(0);

  let clock = 0;
  return {
    setStars,
    update(dt) {
      clock += dt;
      const k = 0.35 + 0.65 * Math.max(0, Math.sin(clock * 2.2));
      beacons.forEach((b, i) => b.material.color.setRGB(2.6 * (i === 0 ? k : 0.4 + 0.6 * Math.max(0, Math.sin(clock * 3 - i * 0.8))), 0.25, 0.2));
    },
  };
}
