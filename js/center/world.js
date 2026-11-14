// Majan Space Center: the building, its three zones and everything you can touch.
//   Office (x -21..-9): terminal desk, sign, Oman flag
//   Warehouse (x -9..7): loading door, delivery zone, shelves
//   Clean room (x 7..21): satellite stand, wall screen, launch console, window to the launch pad
//   Outside: the yard and road, Etlaq launch pad to the east, the Arabian Sea on the horizon
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { ceilingTex, signTex, hazardTex, surface } from './textures.js';
import { buildPolish } from './polish.js';
import { buildSettlement } from './settlement.js';
import { buildOutside, skyTexture as outsideSky } from './outside.js';

export const ROOM = { x0: -21, x1: 21, z0: -12, z1: 12, h: 7 };
const T = 0.3; // wall thickness

// Desert sky wrapped around the world (top of the image = straight up, middle = horizon),
// so the horizon stays put when you look up or down. The physical Sky shader rendered
// almost white through the window, so it is no longer shown.
function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#1d58ad');
  gr.addColorStop(0.3, '#3f86d6');
  gr.addColorStop(0.43, '#8cbde9');
  gr.addColorStop(0.49, '#d5e6f2');
  gr.addColorStop(0.505, '#e7e2d6');
  gr.addColorStop(1, '#d6bd94');
  g.fillStyle = gr;
  g.fillRect(0, 0, 2, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

// Physically based material from a generated surface (colour + bumps + gloss).
const pbr = (opts, extra = {}) => {
  const s = surface(opts);
  return new THREE.MeshStandardMaterial({ ...s, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(1, 1), ...extra });
};

export const SUN_DIR = new THREE.Vector3(80, 60, 20).normalize();

export function buildWorld(environment) {
  const scene = new THREE.Scene();
  scene.background = outsideSky(SUN_DIR);   // sun, clouds and haze (outside.js)
  scene.environment = environment;
  // Desert haze: hides the edge of the ground and softens the launch pad far away
  scene.fog = new THREE.FogExp2(0xd5e5f1, 0.0011);
  const colliders = [];
  const interactables = [];
  const shelfSlots = [];
  const outside = []; // outdoor objects get reflections of the yard, not the building

  const M = {
    floorOffice: pbr({ base: '#353e4b', repeat: [6, 12], rough: 0.3, roughVar: 0.22, bump: 2.5, stains: 0.06 }, { metalness: 0.05 }),
    floorWare: pbr({ base: '#5d6168', repeat: [8, 12], rough: 0.55, roughVar: 0.3, bump: 2, stains: 0.16 }),
    floorClean: pbr({ base: '#e3e8ee', repeat: [7, 12], rough: 0.16, roughVar: 0.12, bump: 2, stains: 0.03 }),
    wall: pbr({ base: '#d9dee6', kind: 'panels', repeat: [10, 2], rough: 0.7, roughVar: 0.15, bump: 2, stains: 0.05 }),
    wallDark: pbr({ base: '#475163', kind: 'panels', repeat: [6, 2], rough: 0.6, roughVar: 0.15, bump: 2, stains: 0.05 }),
    ceiling: new THREE.MeshStandardMaterial({ map: ceilingTex(), roughness: 0.9 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8b939e, metalness: 0.7, roughness: 0.35 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1f252e, metalness: 0.4, roughness: 0.5 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xd8692e, metalness: 0.3, roughness: 0.5 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xa8dcff, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.2, depthWrite: false }),
    light: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.28, 1.35) }),
    cyanGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 2.8) }),
    sand: pbr({ base: '#d8b07a', kind: 'plain', repeat: [400, 400], rough: 0.95, roughVar: 0.05, bump: 1.2, stains: 0.12, size: 256 }),
    hit: new THREE.MeshBasicMaterial({ visible: false }),
    cardboard: new THREE.MeshStandardMaterial({ color: 0xb08250, roughness: 0.9 }),
  };

  const box = (w, h, d, mat, x, y, z, { collide = false, parent = scene, name } = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (name) m.name = name;
    parent.add(m);
    if (collide) colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    return m;
  };
  const plane = (w, h, mat, x, y, z, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    scene.add(m);
    return m;
  };

  // --- Floors and ceiling ------------------------------------------------------
  const floor = (x0, x1, mat) => plane(x1 - x0, ROOM.z1 - ROOM.z0, mat, (x0 + x1) / 2, 0, 0, 0, -Math.PI / 2);
  floor(-21, -9, M.floorOffice);
  floor(-9, 7, M.floorWare);
  floor(7, 21, M.floorClean);
  plane(42, 24, M.ceiling, 0, ROOM.h, 0, 0, Math.PI / 2);
  // Ceiling light panels
  for (let x = -18; x <= 18; x += 6) {
    for (const z of [-6, 0, 6]) box(2.4, 0.05, 0.6, M.light, x, ROOM.h - 0.03, z);
  }

  // --- Outer walls (with a loading door and a big window) -----------------------
  const wallZ = (z, x0, x1, mat = M.wall, y0 = 0, y1 = ROOM.h) =>
    box(x1 - x0, y1 - y0, T, mat, (x0 + x1) / 2, (y0 + y1) / 2, z, { collide: y0 < 1.5 });
  const wallX = (x, z0, z1, mat = M.wall, y0 = 0, y1 = ROOM.h) =>
    box(T, y1 - y0, z1 - z0, mat, x, (y0 + y1) / 2, (z0 + z1) / 2, { collide: y0 < 1.5 });

  wallZ(ROOM.z0, ROOM.x0, ROOM.x1);                 // north
  wallZ(ROOM.z1, ROOM.x0, -4);                      // south, left of the loading door
  wallZ(ROOM.z1, 2, ROOM.x1);                       // south, right of the door
  wallZ(ROOM.z1, -4, 2, M.wall, 4.6, ROOM.h);       // above the door
  wallX(ROOM.x0, ROOM.z0, ROOM.z1, M.wallDark);     // west (office)
  // East wall with a window looking at the launch pad
  wallX(ROOM.x1, ROOM.z0, -8);
  wallX(ROOM.x1, 8, ROOM.z1);
  wallX(ROOM.x1, -8, 8, M.wall, 0, 1.0);
  wallX(ROOM.x1, -8, 8, M.wall, 6.0, ROOM.h);
  plane(16, 5, M.glass, ROOM.x1 - 0.05, 3.5, 0, -Math.PI / 2);
  for (const z of [-8, -4, 0, 4, 8]) box(0.12, 5, 0.12, M.dark, ROOM.x1 - 0.1, 3.5, z);
  box(0.16, 0.12, 16, M.dark, ROOM.x1 - 0.1, 1.0, 0);
  box(0.16, 0.12, 16, M.dark, ROOM.x1 - 0.1, 6.0, 0);
  colliders.push({ x0: ROOM.x1 - 0.2, x1: ROOM.x1 + 0.2, z0: -8, z1: 8 });

  // Loading door (rolls up when a delivery arrives)
  const door = new THREE.Group();
  door.position.set(-1, 0, ROOM.z1);
  scene.add(door);
  const slats = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.6, roughness: 0.45 });
  for (let i = 0; i < 15; i++) box(6, 0.28, 0.08, slats, 0, 0.15 + i * 0.3, 0, { parent: door });
  const doorCollider = { x0: -4, x1: 2, z0: ROOM.z1 - 0.2, z1: ROOM.z1 + 0.2 };
  colliders.push(doorCollider);
  box(6.4, 0.25, 0.4, M.dark, -1, 4.7, ROOM.z1 - 0.1);

  // --- Partitions -----------------------------------------------------------------
  // Office | Warehouse: solid wall with a doorway
  wallX(-9, ROOM.z0, -1.6, M.wallDark);
  wallX(-9, 1.6, ROOM.z1, M.wallDark);
  wallX(-9, -1.6, 1.6, M.wallDark, 3.2, ROOM.h);
  // Warehouse | Clean room: glass wall with a frame and a doorway
  for (const [z0, z1] of [[ROOM.z0, -1.6], [1.6, ROOM.z1]]) {
    plane(z1 - z0, ROOM.h, M.glass, 7, ROOM.h / 2, (z0 + z1) / 2, Math.PI / 2);
    colliders.push({ x0: 6.85, x1: 7.15, z0, z1 });
    for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / 3) box(0.1, ROOM.h, 0.1, M.dark, 7, ROOM.h / 2, z);
  }
  box(0.2, ROOM.h - 3.2, 3.2, M.wall, 7, 3.2 + (ROOM.h - 3.2) / 2, 0);
  box(0.12, 0.12, ROOM.z1 - ROOM.z0, M.dark, 7, 3.15, 0);

  // Zone signs above the doorways
  // Backlit signs: lit like real panels, with a gentle glow (no bloom flare)
  const sign = (lines, w, h, x, y, z, ry) => {
    const tex = signTex(lines);
    const m = plane(w, h, new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.35 }), x, y, z, ry);
    return m;
  };
  sign([['WAREHOUSE', 92, '"Space Grotesk"', null, 120], ['المستودع', 64, '"IBM Plex Sans Arabic"', '#ffb547', 205, 'rtl']], 3, 0.75, -9.2, 3.8, 0, -Math.PI / 2);
  sign([['CLEAN ROOM', 92, '"Space Grotesk"', null, 120], ['الغرفة النظيفة', 64, '"IBM Plex Sans Arabic"', '#ffb547', 205, 'rtl']], 3, 0.75, 6.8, 3.8, 0, -Math.PI / 2);

  // --- Office -----------------------------------------------------------------------
  sign([['MAJAN SPACE CENTER', 96, '"Space Grotesk"', null, 120], ['مركز مجان الفضائي', 70, '"IBM Plex Sans Arabic"', '#ffb547', 210, 'rtl']], 7, 1.75, -15, 4.6, ROOM.z0 + 0.17, 0);
  // Oman flag on the west wall
  const flag = new THREE.Group();
  flag.position.set(ROOM.x0 + 0.17, 4.2, 6);
  flag.rotation.y = Math.PI / 2;
  scene.add(flag);
  const fm = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  box(0.9, 1.8, 0.02, fm(0xc8102e), -1.05, 0, 0, { parent: flag });
  box(2.1, 0.6, 0.02, fm(0xf4f4f2), 0.45, 0.6, 0, { parent: flag });
  box(2.1, 0.6, 0.02, fm(0xc8102e), 0.45, 0, 0, { parent: flag });
  box(2.1, 0.6, 0.02, fm(0x00843d), 0.45, -0.6, 0, { parent: flag });

  // Mission briefing screen (drawn by main.js with NASA images of the contract's area)
  const briefScreen = plane(4.2, 2.36, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), ROOM.x0 + 0.25, 2.95, -4.4, Math.PI / 2);
  box(0.08, 2.56, 4.4, M.dark, ROOM.x0 + 0.17, 2.95, -4.4);
  box(0.06, 0.06, 4.6, M.cyanGlow, ROOM.x0 + 0.28, 1.6, -4.4);

  // The office computer (the terminal): its big screen and stand. The desk and chair are props.
  colliders.push({ x0: -16.25, x1: -13.75, z0: -10.8, z1: -9.9 });
  box(0.12, 0.45, 0.12, M.dark, -15, 1.0, -10.7);
  box(0.4, 0.03, 0.24, M.dark, -15, 0.775, -10.66);
  const termScreen = plane(1.5, 0.88, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), -15, 1.62, -10.68);
  box(1.6, 0.98, 0.06, M.dark, -15, 1.62, -10.74);
  const termHit = box(1.8, 1.2, 0.8, M.hit, -15, 1.4, -10.5, { name: 'terminal' });
  termHit.userData = { kind: 'terminal' };
  interactables.push(termHit);
  // Waiting area: the sofa and coffee table are props; these keep you from walking through them
  colliders.push({ x0: -20.85, x1: -19.85, z0: 2.75, z1: 5.25 });
  colliders.push({ x0: -19.25, x1: -18.55, z0: 3.4, z1: 4.6 });

  // --- Warehouse ---------------------------------------------------------------------
  // Delivery zone with hazard stripes, in front of the loading door
  const dz = { x0: -4, x1: 2, z0: 7.6, z1: 11.6 };
  const haz = new THREE.MeshStandardMaterial({ map: hazardTex([6, 1]), roughness: 0.6 });
  plane(6, 0.25, haz, -1, 0.01, dz.z0, 0, -Math.PI / 2);
  for (const x of [dz.x0, dz.x1]) plane(4, 0.25, haz, x, 0.01, (dz.z0 + dz.z1) / 2, Math.PI / 2, -Math.PI / 2).rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  sign([['DELIVERIES', 92, '"Space Grotesk"', null, 120], ['الاستلام', 64, '"IBM Plex Sans Arabic"', '#ffb547', 205, 'rtl']], 2.6, 0.65, -1, 5.3, ROOM.z1 - 0.18, Math.PI);
  // Shelves along the north wall: 3 units x 3 levels x 3 slots
  for (const cx of [-5.6, -1, 3.6]) {
    const z = ROOM.z0 + 0.75;
    for (const dx of [-1.8, 1.8]) for (const dz2 of [-0.42, 0.42]) box(0.08, 3.2, 0.08, M.orange, cx + dx, 1.6, z + dz2);
    for (const y of [0.12, 1.12, 2.12]) {
      box(3.7, 0.06, 0.95, M.metal, cx, y, z);
      for (const sx of [-1.2, 0, 1.2]) {
        const hit = box(1.1, 0.75, 0.9, M.hit, cx + sx, y + 0.42, z);
        const slot = { pos: new THREE.Vector3(cx + sx, y + 0.03 + 0.225, z), box: null, hit };
        hit.userData = { kind: 'shelf', slot };
        shelfSlots.push(slot);
        interactables.push(hit);
      }
    }
    box(3.7, 0.06, 0.95, M.metal, cx, 3.12, z);
    for (const [dx, w, h] of [[-1.15, 0.7, 0.5], [-0.3, 0.55, 0.4], [0.75, 0.8, 0.6]]) {
      box(w, h, 0.6, M.cardboard, cx + dx + (cx % 2) * 0.1, 3.15 + h / 2, z - 0.05).rotation.y = (dx * 7) % 0.3;
    }
    colliders.push({ x0: cx - 1.9, x1: cx + 1.9, z0: ROOM.z0, z1: z + 0.5 });
  }

  // --- Clean room ----------------------------------------------------------------------
  const stand = new THREE.Group();
  stand.position.set(14, 0, -1);
  scene.add(stand);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.9, 2.4) });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.035, 8, 140), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.03;
  stand.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.0, 64), new THREE.MeshStandardMaterial({ color: 0xc9d3de, roughness: 0.3, metalness: 0.3 }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.02;
  stand.add(disc);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 0.8, 32), M.dark);
  ped.position.y = 0.4;
  stand.add(ped);
  const satHolder = new THREE.Group();
  satHolder.position.y = 1.7; // about eye level
  stand.add(satHolder);
  colliders.push({ x0: 14 - 1.2, x1: 14 + 1.2, z0: -1 - 1.2, z1: -1 + 1.2 });
  const standHit = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 4, 16), M.hit);
  standHit.position.set(14, 2, -1);
  standHit.userData = { kind: 'satellite' };
  scene.add(standHit);
  interactables.push(standHit);

  // Big wall screen with the forecast
  const screen = plane(7, 3.94, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 14, 3.8, ROOM.z0 + 0.17);
  box(7.3, 4.2, 0.1, M.dark, 14, 3.8, ROOM.z0 + 0.12);

  // Launch console with a big red button
  const consoleG = new THREE.Group();
  consoleG.position.set(18.2, 0, 7.4);
  consoleG.rotation.y = -Math.PI * 0.75;
  scene.add(consoleG);
  box(1.4, 1.0, 0.9, M.dark, 0, 0.5, 0, { parent: consoleG });
  const top = box(1.5, 0.08, 1.0, M.metal, 0, 1.05, 0.05, { parent: consoleG });
  top.rotation.x = -0.25;
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.12, 32), new THREE.MeshStandardMaterial({ color: 0xd8202f, emissive: 0x8a0010, emissiveIntensity: 1.2, roughness: 0.35 }));
  button.position.set(0, 1.15, 0.05);
  consoleG.add(button);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 32), new THREE.MeshStandardMaterial({ color: 0xe8b22a, metalness: 0.4, roughness: 0.4 }));
  guard.rotation.x = Math.PI / 2;
  guard.position.set(0, 1.12, 0.05);
  consoleG.add(guard);
  colliders.push({ x0: 18.2 - 0.9, x1: 18.2 + 0.9, z0: 7.4 - 0.9, z1: 7.4 + 0.9 });
  const consoleHit = box(1.8, 1.6, 1.4, M.hit, 18.2, 0.9, 7.4);
  consoleHit.userData = { kind: 'launch' };
  interactables.push(consoleHit);
  sign([['LAUNCH CONTROL', 84, '"Space Grotesk"', null, 120], ['التحكم بالإطلاق', 64, '"IBM Plex Sans Arabic"', '#ffb547', 205, 'rtl']], 2.6, 0.65, 20.8, 3.2, 7.4, -Math.PI / 2);

  // --- Lights ----------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xe3ecff, 0x40382e, 0.18);
  scene.add(hemi);
  // Desert sun: casts shadows over the building and the yard (light comes in through the window and door)
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.2);
  sun.target.position.set(8, 0, 10);
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 10, far: 260 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  // Soft ceiling lights: one long area light per row of panels (no hot spots like point lights)
  RectAreaLightUniformsLib.init();
  const areaLights = [];
  for (let x = -18; x <= 18; x += 6) {
    const a = new THREE.RectAreaLight(0xf4f7ff, 2.2, 2.4, 13);
    a.position.set(x, ROOM.h - 0.06, 0);
    a.rotation.x = -Math.PI / 2; // face the floor
    scene.add(a);
    areaLights.push(a);
  }
  const satLight = new THREE.SpotLight(0xffffff, 40, 14, 0.6, 0.5, 1.4);
  satLight.position.set(14, ROOM.h - 0.4, 1.5);
  satLight.target.position.set(14, 2, -1);
  satLight.castShadow = true;
  satLight.shadow.mapSize.set(1024, 1024);
  satLight.shadow.bias = -0.0005;
  satLight.shadow.normalBias = 0.02;
  scene.add(satLight, satLight.target);
  // Physical sky that matches the sun
  const sky = new Sky();
  sky.scale.setScalar(2000);
  const su = sky.material.uniforms;
  su.turbidity.value = 4.5;
  su.rayleigh.value = 2.0;
  su.mieCoefficient.value = 0.003;
  su.mieDirectionalG.value = 0.82;
  su.sunPosition.value.copy(SUN_DIR);
  sky.visible = false; // kept for its sun settings; the gradient background is the sky (see skyTexture)
  scene.add(sky);

  // --- Structure: roof trusses, columns, LED strips --------------------------------------
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a424e, metalness: 0.7, roughness: 0.45 });
  for (let x = -18; x <= 18; x += 6) {
    box(0.22, 0.22, 24, steel, x, ROOM.h - 0.35, 0);                 // top chord
    box(0.16, 0.16, 24, steel, x, ROOM.h - 1.25, 0);                 // bottom chord
    for (let z = -11; z <= 11; z += 2) {
      const web = box(0.08, 1.05, 0.08, steel, x, ROOM.h - 0.8, z);
      web.rotation.x = (z / 2) % 2 === 0 ? 0.6 : -0.6;
    }
  }
  // Columns on the south wall only, clear of the door, shelves, screen and posters
  for (const x of [-9, 3, 9, 15]) box(0.45, ROOM.h, 0.45, steel, x, ROOM.h / 2, ROOM.z1 - 0.35, { collide: true });
  const ledC = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 2.0, 2.6) });
  const ledA = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.6, 0.45) });
  for (const [x0, x1, mat] of [[-21, -9, ledC], [-9, 7, ledA], [7, 21, ledC]]) {
    // High on the walls, above the signs and the big screen
    box(x1 - x0 - 0.4, 0.05, 0.05, mat, (x0 + x1) / 2, 6.3, ROOM.z0 + 0.2);
    if (x0 !== -9) box(x1 - x0 - 0.4, 0.05, 0.05, mat, (x0 + x1) / 2, 6.3, ROOM.z1 - 0.2);
  }

  // --- Floor lanes and posters ---------------------------------------------------------------
  const lane = new THREE.MeshBasicMaterial({ color: 0xe8b22a });
  plane(16, 0.12, lane, -1, 0.012, -1.7, 0, -Math.PI / 2);
  plane(16, 0.12, lane, -1, 0.012, 1.7, 0, -Math.PI / 2);
  plane(0.12, 5.8, lane, -4.6, 0.012, 4.6, 0, -Math.PI / 2);
  plane(0.12, 5.8, lane, 2.6, 0.012, 4.6, 0, -Math.PI / 2);
  const blueTape = new THREE.MeshBasicMaterial({ color: 0x2f7fe0 });
  for (const [w, h, x, z] of [[13, 0.1, 14, -11.2], [13, 0.1, 14, 11.2], [0.1, 22.4, 7.6, 0], [0.1, 22.4, 20.4, 0]]) {
    plane(w, h, blueTape, x, 0.012, z, 0, -Math.PI / 2);
  }
  sign([['SAFETY FIRST', 96, '"Space Grotesk"', '#ffb547', 120], ['السلامة أولًا', 70, '"IBM Plex Sans Arabic"', null, 210, 'rtl']], 3.2, 0.8, -6.5, 4.6, ROOM.z0 + 0.17, 0);
  sign([['ESD PROTECTED AREA', 80, '"Space Grotesk"', null, 120], ['منطقة محمية من الكهرباء الساكنة', 52, '"IBM Plex Sans Arabic"', '#ffb547', 205, 'rtl']], 3.4, 0.85, 19, 4.6, ROOM.z1 - 0.17, Math.PI);
  const missions = [['AFLAJ WATCH', 'عين على الأفلاج'], ['KHAREEF WATCH', 'حارس الخريف'], ['DUNE HUNTER', 'صياد الكثبان']];
  missions.forEach(([en, ar], i) => {
    sign([[`0${i + 1}`, 70, '"JetBrains Mono"', '#4de8ff', 90], [en, 76, '"Space Grotesk"', null, 175], [ar, 60, '"IBM Plex Sans Arabic"', '#ffb547', 245, 'rtl']],
      2.0, 0.9, -19.6 + i * 2.4, 2.9, ROOM.z1 - 0.17, Math.PI).material.map.repeat.set(1, 1);
  });

  // --- Outside: desert, apron, road, palms ------------------------------------------------
  // Dunes, sea, mountains, the facade, the ground station and the launch site are in outside.js
  const outsideBase = buildOutside({ scene, outside, colliders, M, pbr, signTex, sunDir: SUN_DIR, ROOM, pad: { x: 125, z: -12 } });
  // Date palms [x, z, size], kept clear of the name on the facade and of the view from the window to the pad
  const PALMS = [[-15, 19.5, 1], [23, 18, 1.1], [-25, 27, 0.9], [29, 24, 1.2], [31, -52, 1.1], [46, 9, 1.3], [25.5, -31, 1], [52, 30, 1.2],
    [-36, 42, 1.2], [-24, 43, 1], [-6, 42.5, 1.3], [14, 43, 1.1], [34, 42, 1.25], [58, 42.5, 1], [78, 41, 1.2], [98, 42, 1.1], [70, 49, 1.3], [84, 50, 1], [-30, -20, 1.2], [-28, 20, 1.1], [26, -16, 1], [66, 17, 1.2]];
  const polish = buildPolish({ scene, outside, colliders, pbr, signTex, ROOM, palms: PALMS });
  for (const [x, z, s] of PALMS) colliders.push({ x0: x - 0.3 * s, x1: x + 0.3 * s, z0: z - 0.3 * s, z1: z + 0.3 * s });
  // The Duqm Space Settlement, north-east of the building: seen from the clean room window
  const settlement = buildSettlement({ scene, outside, colliders, interactables, pbr, signTex, hitMat: M.hit, at: { x: 58, z: -38 } });
  const outsideFx = { setStations: outsideBase.setStations, update(dt) { outsideBase.update(dt); polish.update(dt); settlement.update(dt); } };
  const asphalt = pbr({ base: '#5a5d63', kind: 'plain', repeat: [24, 9], rough: 0.88, roughVar: 0.1, bump: 0.4, stains: 0.1 });
  outside.push(plane(90, 34, asphalt, 10, -0.02, 29, 0, -Math.PI / 2));
  const roadLine = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  for (let x = -30; x < 54; x += 6) plane(3, 0.2, roadLine, x, -0.01, 34, 0, -Math.PI / 2);
  plane(0.2, 9, new THREE.MeshBasicMaterial({ color: 0xe8b22a }), -4.2, -0.01, 17, 0, -Math.PI / 2);
  plane(0.2, 9, new THREE.MeshBasicMaterial({ color: 0xe8b22a }), 2.2, -0.01, 17, 0, -Math.PI / 2);

  // --- Props from Blender (models/make_props.py) -------------------------------------------
  const objects = {};
  const loader = new GLTFLoader();
  const props = loader.loadAsync('assets/props.glb').then((g) => {
    // Tone down glowing materials from Blender so monitors and lights don't flare
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (/^Screen/.test(m.name)) m.emissiveIntensity = 0.6;
        if (m.name === 'LedG' || m.name === 'LedB') m.emissiveIntensity = 1.2;
        if (m.name === 'Cyan') m.emissiveIntensity = 0.8;
      }
    });
    const lib = (n) => g.scene.getObjectByName(n);
    const put = (name, x, z, ry = 0, { collide = null, y = 0, scale = 1 } = {}) => {
      const o = lib(name).clone(true);
      o.position.set(x, y, z);
      o.rotation.y = ry;
      o.scale.setScalar(scale);
      scene.add(o);
      if (collide) colliders.push({ x0: x - collide[0], x1: x + collide[0], z0: z - collide[1], z1: z + collide[1] });
      return o;
    };
    // Office
    for (const [x, z] of [[-19, -5.5], [-15.5, -5.5], [-12, -5.5], [-19, -1.8], [-15.5, -1.8], [-12, -1.8]]) {
      put('Desk', x, z, 0, { collide: [0.85, 0.45] });
      put('Chair', x - 0.05 + (x % 2) * 0.12, z + 0.78, (x % 3) * 0.14 - 0.1);
    }
    put('TermDesk', -15, -10.35, 0);
    put('Chair', -15.05, -9.5, 0.12);
    put('Sofa', -20.38, 4, Math.PI / 2);
    put('CoffeeTable', -18.9, 4, Math.PI / 2);
    // Drawers face into the room (they used to face the wall)
    for (const z of [-11, -10.2, -9.4]) put('Cabinet', -20.5, z + 6.8, -Math.PI / 2, { collide: [0.35, 0.3] });
    for (const [x, z] of [[-20.3, -11.2], [-9.9, -11.2], [-20.3, 11.2], [-9.9, 6.5]]) put('Plant', x, z, 0, { scale: 1.3 });
    put('WaterCooler', -10.0, 10.9, 0, { collide: [0.25, 0.25] });
    put('FireExt', -9.5, 2.4, 0);
    // Warehouse
    put('Forklift', 4.6, 3.8, -Math.PI / 2 + 0.3, { collide: [1.0, 1.0] });
    put('PalletStack', 5.6, 9.6, 0.1, { collide: [0.7, 0.7] });
    put('PalletStack', 5.6, 7.9, -0.05, { collide: [0.7, 0.7] });
    put('Crate', -7.9, 10.8, 0.2, { collide: [0.6, 0.6] });
    put('Crate', -7.9, 9.4, -0.1, { collide: [0.6, 0.6] });
    put('Crate', -7.9, 10.1, 0.4, { y: 1.0, scale: 0.8 });
    for (const [x, z] of [[5.6, -7.6], [6.2, -7.0], [5.5, -6.6]]) put('Barrel', x, z, 0, { collide: [0.35, 0.35] });
    put('FireExt', 6.6, 2.4, 0);
    // Clean room
    put('Workbench', 10.5, 11.0, Math.PI, { collide: [1.05, 0.45] });
    put('Workbench', 13.5, 11.0, Math.PI, { collide: [1.05, 0.45] });
    put('RobotArm', 9.4, -9.6, 0.6, { collide: [0.5, 0.5] });
    put('ServerRack', 20.4, 10.2, Math.PI / 2, { collide: [0.55, 0.4] });
    put('ServerRack', 20.4, 9.0, Math.PI / 2, { collide: [0.55, 0.4] });
    put('FireExt', 7.6, -2.4, 0);
    // Outside
    // The palms are built in polish.js
    outside.push(put('Car', 13, 22, Math.PI / 2 + 0.05));
    outside.push(put('Car', 17, 22, Math.PI / 2 - 0.04));
    // Delivery truck (animated by main.js), parked out of sight until an order is placed
    const truck = put('Truck', 70, 34, Math.PI / 2);
    outside.push(truck);
    objects.truck = truck;
    objects.truckWheels = [0, 1, 2, 3, 4, 5].map((i) => truck.getObjectByName(`Truck_Wheel_${i}`));
  });

  const padRockets = {};
  const ready = Promise.all([props, loader.loadAsync('assets/launchpad.glb'), loader.loadAsync('assets/rockets.glb')]).then(([, pad, rockets]) => {
    pad.scene.position.set(125, -0.04, -12);
    pad.scene.rotation.y = Math.PI / 2;
    pad.scene.getObjectByName('Ground')?.removeFromParent();
    scene.add(pad.scene);
    outside.push(pad.scene);
    pad.scene.updateMatrixWorld(true);
    const mount = pad.scene.getObjectByName('RocketMount').getWorldPosition(new THREE.Vector3());
    for (const [id, name] of [['small', 'Rocket_Small'], ['medium', 'Rocket_Medium'], ['heavy', 'Rocket_Heavy']]) {
      const r = rockets.scene.getObjectByName(name);
      if (!r) continue;
      r.position.copy(mount);
      r.visible = id === 'medium';
      scene.add(r);
      outside.push(r);
      padRockets[id] = r;
    }
    // Site sign by the pad, facing the building
    const pole = new THREE.MeshStandardMaterial({ color: 0x9aa3b5, metalness: 0.8, roughness: 0.3 });
    const signG = new THREE.Group();
    signG.position.set(104, 0, 8);
    signG.rotation.y = -Math.PI / 2;
    scene.add(signG);
    outside.push(signG);
    const st = signTex([['ETLAQ · DUQM', 120, '"Space Grotesk"', null, 120], ['إطلاق · الدقم', 76, '"IBM Plex Sans Arabic"', '#ffb547', 212, 'rtl']]);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshStandardMaterial({ map: st, emissiveMap: st, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.4 }));
    face.position.y = 5;
    signG.add(face);
    for (const x of [-4.5, 4.5]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), pole);
      p.position.set(x, 2, -0.2);
      signG.add(p);
    }
  });
  /** Show the rocket chosen at Mission Control on the launch pad. */
  const setPadRocket = (id) => { for (const [k, r] of Object.entries(padRockets)) r.visible = k === id; };

  return {
    scene, colliders, interactables, shelfSlots, ready, outside, setPadRocket, outsideFx, settlement, setStations: outsideFx.setStations, padRocket: () => Object.values(padRockets).find((r) => r.visible) || null,
    anchors: {
      start: new THREE.Vector3(-15, 0, 5),
      delivery: dz,
      stand: new THREE.Vector3(14, 0, -1),
    },
    lights: { sun, satLight, hemi, areaLights, sky },
    objects: Object.assign(objects, { door, doorCollider, termScreen, screen, briefScreen, satHolder, button, stand }),
  };
}
