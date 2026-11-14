// Majan Mission – 20-second motion-graphics film (1920x1080, 60 fps).
// Every animation is driven by the time value t, so renderAt(t) always draws the
// same frame. Rendered to MP4 by tools/render-film.mjs (Playwright + ffmpeg).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FX } from './fx.js';
import { Hangar } from './hangar.js';
import { LaunchScene } from './launch.js';
import { OrbitScene, latLonToVector } from './orbit.js';

const W = 1920;
const H = 1080;
export const DURATION = 20;

// Seeded random numbers so the launch smoke is identical in every render
let seed = 1;
const seeded = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
Math.random = seeded;

// --- timing helpers ----------------------------------------------------------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x) => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const fadeInOut = (t, a, b, f = 0.35) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));

const S = { title: [0, 3.6], build: [3.6, 8.0], launch: [8.0, 12.6], orbit: [12.6, 17.0], close: [17.0, 20.0] };
const CUTS = [3.6, 8.0, 12.6];
// Design shown in the film: hyperspectral camera, large panels + battery, dish antenna
const SNAPS = [{ slot: 'camera', at: 4.4 }, { slot: 'power', at: 5.2 }, { slot: 'comms', at: 6.0 }];
const SNAP_NODES = { camera: ['Camera_Hyper'], power: ['Wing_Extra', 'Battery_Pack'], comms: ['Antenna_Dish'] };

// --- renderer and scenes ------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.domElement.id = 'gl';
document.body.appendChild(renderer.domElement);
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const fx = new FX(renderer);
fx.setSize(W, H);

const hangar = new Hangar(renderer, env);
hangar.controls.enabled = false;
hangar.controls.autoRotate = false;
hangar.resize(W, H);
const launch = new LaunchScene(renderer, env);
launch.resize(W / H);
const orbit = new OrbitScene(renderer);
orbit.controls.enabled = false;
orbit.resize(W, H);
const GLOBE_BASE_Y = orbit.globe.rotation.y; // turned so Oman faces the camera
// Film-only orbit tilt: the satellite climbs through the empty top-right of the frame
orbit.plane.rotation.set(0.28, -0.72, 0);

let orbitSat = null;
const satLoad = new GLTFLoader().loadAsync('assets/satellite.glb').then((g) => {
  orbitSat = g.scene;
  const show = new Set(['Body', 'Camera_Hyper', 'Wing_Base', 'Wing_Extra', 'Battery_Pack', 'Antenna_Whip', 'Antenna_Dish']);
  orbitSat.traverse((o) => { if (o.parent === orbitSat) o.visible = show.has(o.name); });
  orbitSat.scale.setScalar(0.3);
  orbit.holder.add(orbitSat);
});

const out = document.getElementById('out');
const ctx = out.getContext('2d');

const FONT = { sans: "'Space Grotesk'", ar: "'IBM Plex Sans Arabic'", mono: "'JetBrains Mono'" };
export const ready = Promise.all([
  hangar.ready, launch.ready, orbit.dotsReady, satLoad,
  document.fonts.load(`700 120px ${FONT.sans}`), document.fonts.load(`500 40px ${FONT.sans}`),
  document.fonts.load(`700 100px ${FONT.ar}`), document.fonts.load(`600 40px ${FONT.ar}`),
  document.fonts.load(`600 24px ${FONT.mono}`), document.fonts.load(`400 20px ${FONT.mono}`),
]).then(() => {
  hangar.setDesign({ camera: 0, power: 0, comms: 0 }, false);
  // A lightning mast sits right in the launch camera's line of sight
  const masts = launch.scene.getObjectByName('Masts');
  if (masts) masts.visible = false;
});

// --- scene poses ------------------------------------------------------------------
function poseHangar(t) {
  const u = t - S.build[0];
  hangar.sky.material.uniforms.uTime.value = t;
  hangar.floor.material.uniforms.uTime.value = t;
  hangar.dust.rotation.y = t * 0.02;
  hangar.sat.position.y = Math.sin(t * 0.9) * 0.1;
  hangar.sat.rotation.y = -0.35 + u * 0.1; // wings spread across the screen

  // Parts snap on, with a little overshoot, and a scan ring sweeps the satellite
  const nodes = hangar.nodes;
  let lastSnap = -10;
  for (const s of SNAPS) {
    const k = (t - s.at) / 0.45;
    for (const n of SNAP_NODES[s.slot]) {
      const node = nodes[n];
      if (!node) continue;
      node.visible = k > 0;
      node.scale.setScalar(k > 0 ? Math.max(0.01, easeOutBack(clamp(k))) : 1);
    }
    if (t >= s.at) lastSnap = s.at;
  }
  if (nodes.Camera_Std) nodes.Camera_Std.visible = t < SNAPS[0].at;
  const sk = clamp((t - lastSnap) / 0.7);
  hangar.scan.material.opacity = sk < 1 ? Math.sin(sk * Math.PI) : 0;
  hangar.scan.position.y = -1.6 + sk * 3.2;
  hangar.scan.scale.setScalar(2.2 + Math.sin(sk * Math.PI) * 1.4);

  // Camera: whip in, then a slow orbit
  const e = easeOutExpo(seg(u, 0, 0.8));
  const ang = 0.95 - 0.45 * easeInOut(seg(u, 0, 4.4)) + 1.4 * (1 - e);
  const rad = 14.5 - 1.5 * easeInOut(seg(u, 0, 4.4));
  const cam = hangar.camera;
  cam.clearViewOffset();
  cam.position.set(Math.sin(ang) * rad, 2.8 - 1.0 * easeInOut(seg(u, 0, 4.4)), Math.cos(ang) * rad);
  cam.lookAt(0, -0.3, 0);
}

let launchState = null;
const LAUNCH_T0 = 7.25;
const LAUNCH_SPEED = 1.55;
function poseLaunch(t) {
  const tau = (t - LAUNCH_T0) * LAUNCH_SPEED;
  if (!launchState || t < launchState.t) {
    seed = 4242;
    launch.start('medium', true, () => {}, () => {}, { intro: false });
    launchState = { t: LAUNCH_T0, tau: 0 };
  }
  while (launchState.tau < tau - 1e-6) {
    const step = Math.min(LAUNCH_SPEED / 60, tau - launchState.tau);
    launch.update(step);
    launchState.tau += step;
  }
  launchState.t = t;
  return tau;
}

const OMAN = { lat: 21, lon: 57 };
function satAngle(t) { return 0.55 + (t - S.orbit[0]) * 0.21; }
function poseOrbit(t) {
  const o = orbit;
  o.dotMat.uniforms.uReveal.value = 0.0 + 1.05 * easeInOut(seg(t, 0.15, 2.4));
  o.globe.rotation.y = GLOBE_BASE_Y + t * 0.015;
  for (const r of o.beaconRings) {
    const k = (t * 0.6 + r.userData.phase) % 1;
    r.scale.setScalar(1 + k * 3);
    r.material.opacity = 1 - k;
  }
  const inOrbit = t >= S.orbit[0];
  o.holder.visible = inOrbit;
  o.trail.visible = inOrbit;
  const place = (a) => new THREE.Vector3(Math.cos(a) * 13.4, Math.sin(a) * 13.4, 0);
  const ang = satAngle(t);
  const pos = place(ang);
  o.holder.position.copy(pos);
  o.holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), pos.clone().negate().normalize());
  o.beam.visible = inOrbit && t < 17.4;
  o.beam.material.opacity = 0.12 + 0.05 * Math.sin(t * 6);
  o.plane.updateMatrixWorld(true);
  for (let i = 0; i < o.trailN; i++) {
    const w = o.plane.localToWorld(place(ang - i * 0.012));
    o.trailPos.set([w.x, w.y, w.z], i * 3);
  }
  o.trail.geometry.attributes.position.needsUpdate = true;

  // Data packets stream from the satellite down to Oman
  o.globe.updateMatrixWorld(true);
  const omanW = o.globe.localToWorld(o.omanLocal.clone());
  const satW = o.holder.getWorldPosition(new THREE.Vector3());
  o.packets.forEach((p, i) => {
    const born = 13.3 + i * 0.1;
    const k = (t - born) / 0.9;
    const alive = inOrbit && k > 0 && k < 1 && born < 16.9;
    p.mesh.visible = alive;
    if (!alive) return;
    const from = o.plane.localToWorld(place(satAngle(born)));
    const mid = from.clone().add(omanW).multiplyScalar(0.5).normalize().multiplyScalar(14.2);
    const a = from.clone().lerp(mid, k);
    const b = mid.clone().lerp(omanW, k);
    p.mesh.position.copy(a.lerp(b, k));
  });

  // Camera
  const lat = THREE.MathUtils.degToRad(OMAN.lat);
  let dist;
  let az;
  let el = lat;
  let shift = 0;
  if (t < S.title[1]) {
    dist = 78 - 40 * easeOutExpo(seg(t, 0, 3.0));
    az = -0.55 + 0.45 * easeInOut(seg(t, 0, 3.6));
    shift = 0.17;
  } else if (t < S.close[0]) {
    const u = t - S.orbit[0];
    dist = 31 - 1.5 * easeInOut(seg(u, 0, 4.4));
    az = 0.95 * (1 - easeOutExpo(seg(u, 0, 0.9))) + 0.12 - 0.2 * easeInOut(seg(u, 0, 4.4));
    el = lat + 0.12;
  } else {
    const u = t - S.close[0];
    dist = 29.5 + 30 * easeInOut(seg(u, 0, 3));
    az = -0.08 - 0.25 * easeInOut(seg(u, 0, 3));
    el = lat + 0.2 * easeInOut(seg(u, 0, 3));
  }
  const cam = o.camera;
  cam.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
  cam.lookAt(0, 0, 0);
  if (shift) cam.setViewOffset(W, H, -shift * W, 0, W, H);
  else cam.clearViewOffset();
  cam.updateMatrixWorld(true);
  return { omanW, satW };
}

// --- 2D overlay helpers -------------------------------------------------------------
function text(str, x, y, { font = FONT.sans, size = 32, weight = 500, color = '#e8f4ff', align = 'left', alpha = 1, glow = 0, glowColor = 'rgba(77,232,255,0.8)', rtl = false, spacing = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.direction = rtl ? 'rtl' : 'ltr';
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  if (glow) { ctx.shadowColor = glowColor; ctx.shadowBlur = glow; }
  ctx.fillText(str, x, y);
  ctx.restore();
}

function glass(x, y, w, h, alpha = 1, r = 18) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(18,30,58,0.62)');
  g.addColorStop(1, 'rgba(8,14,30,0.72)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(125,210,255,0.28)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  brackets(x, y, w, h, 18, alpha);
  ctx.restore();
}

function brackets(x, y, w, h, len, alpha = 1, color = '#4de8ff') {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
  ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len);
  ctx.stroke();
  ctx.restore();
}

function bar(x, y, w, frac, color = '#4de8ff', alpha = 1, mark = null) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.roundRect(x, y, w, 10, 5); ctx.fill();
  ctx.shadowColor = color; ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x, y, Math.max(10, w * clamp(frac)), 10, 5); ctx.fill();
  if (mark !== null) { ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.fillRect(x + w * mark - 1, y - 5, 2, 20); }
  ctx.restore();
}

function stars(cx, y, size, shownAt, t, gap) {
  for (let i = 0; i < 3; i++) {
    const k = clamp((t - shownAt[i]) / 0.4);
    const x = cx + (i - 1) * gap;
    text('★', x, y, { size, color: 'rgba(255,255,255,0.12)', align: 'center' });
    if (k > 0) {
      ctx.save();
      ctx.translate(x, y - size * 0.35);
      const s = easeOutBack(k);
      ctx.scale(s, s);
      ctx.rotate((1 - k) * -0.6);
      text('★', 0, size * 0.35, { size, color: '#ffb547', align: 'center', glow: 30, glowColor: 'rgba(255,181,71,0.9)' });
      ctx.restore();
    }
  }
}

function stepLabel(t, [a, b], num, en, ar) {
  const k = fadeInOut(t, a + 0.25, b - 0.15, 0.45);
  if (k <= 0) return;
  const dx = (1 - easeOutExpo(seg(t, a + 0.25, a + 0.9))) * -60;
  text(`STEP ${num}`, 120 + dx, 230, { font: FONT.mono, size: 26, weight: 600, color: '#ffb547', alpha: k, spacing: 6 });
  text(en, 116 + dx, 330, { size: 104, weight: 700, alpha: k, glow: 24 });
  ctx.save();
  ctx.font = `700 104px ${FONT.sans}`;
  const wEn = ctx.measureText(en).width;
  ctx.restore();
  text(ar, 116 + dx + wEn + 34, 322, { font: FONT.ar, size: 66, weight: 600, color: '#9fe9ff', alpha: k * 0.95, rtl: true });
}

function hudFrame(t) {
  const m = 36;
  // Soft dark bands keep the rail text readable over bright scenes (desert, smoke)
  for (const [y0, y1] of [[0, 150], [H, H - 150]]) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(0,4,12,0.7)');
    g.addColorStop(1, 'rgba(0,4,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.min(y0, y1), W, 150);
  }
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = 'rgba(77,232,255,0.75)';
  ctx.lineWidth = 2;
  const L = 34;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
  }
  ctx.restore();
  text('MAJAN MISSION  //  ', 86, 84, { font: FONT.mono, size: 18, weight: 600, color: '#9fe9ff', spacing: 4, alpha: 0.9 });
  ctx.save(); ctx.font = `600 18px ${FONT.mono}`; ctx.letterSpacing = '4px'; const w0 = ctx.measureText('MAJAN MISSION  //  ').width; ctx.restore();
  text('مهمة مجان', 86 + w0 + 90, 84, { font: FONT.ar, size: 20, weight: 600, color: '#9fe9ff', rtl: true, alpha: 0.9 });
  const tc = t.toFixed(2).padStart(5, '0');
  text(`T+00:00:${tc}`, W - 86, 84, { font: FONT.mono, size: 18, weight: 600, color: '#9fe9ff', align: 'right', spacing: 3, alpha: 0.9 });
  const steps = [['01 BUILD', S.build], ['02 LAUNCH', S.launch], ['03 OPERATE', S.orbit]];
  let x = W / 2 - 300;
  for (const [label, [a, b]] of steps) {
    const on = t >= a && t < b;
    ctx.save();
    ctx.globalAlpha = on ? 1 : 0.45;
    ctx.beginPath(); ctx.roundRect(x, 60, 190, 34, 17);
    ctx.fillStyle = on ? '#4de8ff' : 'rgba(255,255,255,0.04)';
    if (on) { ctx.shadowColor = '#4de8ff'; ctx.shadowBlur = 20; }
    ctx.fill();
    ctx.strokeStyle = 'rgba(125,210,255,0.4)'; ctx.stroke();
    ctx.restore();
    text(label, x + 95, 83, { font: FONT.mono, size: 15, weight: 700, color: on ? '#04111d' : '#9fb3cc', align: 'center', spacing: 3 });
    x += 210;
  }
  text('NASA SPACE APPS CHALLENGE 2026 · IBRA, OMAN', 86, H - 66, { font: FONT.mono, size: 15, color: '#7f93ad', spacing: 3 });
  text('TEAM MAJAN MISSION', W - 86, H - 66, { font: FONT.mono, size: 15, color: '#7f93ad', align: 'right', spacing: 3 });
}

// --- overlays per scene -------------------------------------------------------------
function overlayTitle(t) {
  const k = fadeInOut(t, 0.5, S.title[1] - 0.05, 0.5);
  if (k <= 0) return;
  const rise = (1 - easeOutExpo(seg(t, 0.5, 1.6))) * 40;
  text('CHALLENGE 13 · SPACE MISSION DESIGN GAME', 140, 400 + rise, { font: FONT.mono, size: 22, weight: 600, color: '#ffb547', spacing: 5, alpha: k });
  // Title wipes in from the left
  ctx.save();
  const wipe = easeOutExpo(seg(t, 0.7, 1.9));
  ctx.beginPath(); ctx.rect(0, 380, 140 + 1100 * wipe, 200); ctx.clip();
  text('MAJAN MISSION', 132, 535 + rise, { size: 138, weight: 700, alpha: k, glow: 40 });
  ctx.restore();
  text('مهمة مجان', 140, 650 + rise, { font: FONT.ar, size: 96, weight: 700, color: '#9fe9ff', alpha: k * easeOutExpo(seg(t, 1.2, 2.0)), glow: 30, rtl: true, align: 'left' });
  text('Design an Omani satellite. Launch it. Save the mission.', 142, 728 + rise, { size: 32, color: '#b9cbe3', alpha: k * seg(t, 1.6, 2.2) });
}

function overlayBuild(t) {
  const [a, b] = S.build;
  stepLabel(t, S.build, '01', 'BUILD', 'صمّم');
  const k = fadeInOut(t, a + 0.5, b - 0.1, 0.45);
  if (k <= 0) return;
  const slide = (1 - easeOutExpo(seg(t, a + 0.5, a + 1.3))) * 80;

  // Parts list
  const px = 120 - slide;
  glass(px, 410, 470, 330, k);
  text('PARTS', px + 28, 456, { font: FONT.mono, size: 16, weight: 700, color: '#4de8ff', spacing: 5, alpha: k });
  const rows = [['CAMERA', 'Hyperspectral', 'كاميرا طيفية', 4.4], ['POWER', 'Large panels + battery', 'ألواح + بطارية', 5.2], ['COMMS', 'Dish antenna', 'طبق إرسال', 6.0]];
  rows.forEach(([slot, name, ar, at], i) => {
    const y = 505 + i * 76;
    const on = t >= at;
    const flash = Math.exp(-Math.pow((t - at) / 0.18, 2));
    ctx.save();
    ctx.globalAlpha = k;
    ctx.beginPath(); ctx.roundRect(px + 22, y - 32, 426, 62, 12);
    ctx.fillStyle = on ? `rgba(77,232,255,${0.12 + flash * 0.3})` : 'rgba(255,255,255,0.03)';
    ctx.fill();
    ctx.strokeStyle = on ? '#4de8ff' : 'rgba(125,210,255,0.2)';
    ctx.stroke();
    ctx.restore();
    text(slot, px + 40, y - 6, { font: FONT.mono, size: 13, color: '#7f93ad', spacing: 3, alpha: k });
    text(name, px + 40, y + 18, { size: 21, weight: 600, alpha: k });
    text(on ? '✓' : '', px + 420, y + 8, { size: 26, color: '#43e6a0', align: 'center', alpha: k, glow: 12, glowColor: 'rgba(67,230,160,.8)' });
    text(ar, px + 380, y + 16, { font: FONT.ar, size: 17, color: '#9fe9ff', align: 'right', rtl: true, alpha: k * 0.8 });
  });

  // Telemetry
  const tx = W - 120 - 470 + slide;
  glass(tx, 230, 470, 560, k);
  text('TELEMETRY', tx + 28, 276, { font: FONT.mono, size: 16, weight: 700, color: '#4de8ff', spacing: 5, alpha: k });
  const p = (at) => easeInOut(seg(t, at, at + 0.6));
  const budget = 12 + 14 * p(4.4) + 7 * p(5.2) + 2 * p(6.0) + 14;
  const meters = [
    ['BUDGET', `${budget.toFixed(0)} / 50 M OMR`, budget / 62.5, 0.8, budget > 46 ? '#ffb547' : '#4de8ff'],
    ['POWER IN ORBIT', `${(60 + 100 * p(4.4) + 20 * p(6.0)).toFixed(0)} / ${(74 + 93 * p(5.2)).toFixed(0)} W`, (60 + 100 * p(4.4) + 20 * p(6.0)) / 300, (74 + 93 * p(5.2)) / 300, '#4de8ff'],
    ['MASS', `${(140 + 35 * p(4.4) + 40 * p(5.2) + 10 * p(6.0)).toFixed(0)} kg · ${t > 5.6 ? 'MEDIUM' : 'SMALL'} ROCKET`, (140 + 35 * p(4.4) + 40 * p(5.2) + 10 * p(6.0)) / 350, null, t > 5.6 ? '#ffb547' : '#4de8ff'],
    ['DATA PER ORBIT', `capture ${(1.2 + 4.8 * p(4.4)).toFixed(1)} · send ${(2 + 4 * p(6.0)).toFixed(1)}`, (1.2 + 4.8 * p(4.4)) / 16, (2 + 4 * p(6.0)) / 16, '#4de8ff'],
  ];
  meters.forEach(([label, val, frac, mark, color], i) => {
    const y = 330 + i * 78;
    text(label, tx + 28, y, { font: FONT.mono, size: 13, color: '#7f93ad', spacing: 3, alpha: k });
    text(val, tx + 442, y, { font: FONT.mono, size: 15, color: '#e8f4ff', align: 'right', alpha: k });
    bar(tx + 28, y + 16, 414, frac, color, k, mark);
  });
  text('FORECAST', tx + 28, 668, { font: FONT.mono, size: 13, color: '#7f93ad', spacing: 3, alpha: k });
  ctx.save(); ctx.globalAlpha = k; stars(tx + 235, 732, 58, [6.6, 6.9, 7.2], t, 74); ctx.restore();
  text('LAUNCH SUCCESS 97%', tx + 442, 668, { font: FONT.mono, size: 13, color: '#43e6a0', align: 'right', spacing: 2, alpha: k * seg(t, 7.2, 7.5) });
}

function overlayLaunch(t, tau) {
  stepLabel(t, S.launch, '02', 'LAUNCH', 'أطلق');
  if (tau < 3.0 && t >= S.launch[0]) {
    const n = 3 - Math.floor(tau / 0.9);
    const local = (tau % 0.9) / 0.9;
    if (n >= 1) {
      const s = 1.5 - 0.5 * easeOutExpo(clamp(local * 2));
      ctx.save();
      ctx.translate(W / 2, 600);
      ctx.scale(s, s);
      text(String(n), 0, 0, { font: FONT.mono, size: 230, weight: 700, align: 'center', alpha: 1 - local * 0.6, glow: 50 });
      ctx.restore();
    }
  }
  if (tau >= 3.0 && tau < 5.2) {
    const k = fadeInOut(tau, 3.0, 5.2, 0.3);
    // Placed in the dark sky, above the bright smoke and sand
    text('LIFTOFF', 120, 450, { font: FONT.mono, size: 96, weight: 700, alpha: k, glow: 40, spacing: 14 });
    ctx.save(); ctx.font = `700 96px ${FONT.mono}`; ctx.letterSpacing = '14px'; const lw = ctx.measureText('LIFTOFF').width; ctx.restore();
    text('انطلاق', 120 + lw + 30, 444, { font: FONT.ar, size: 58, weight: 700, color: '#ffb547', alpha: k, rtl: true, glow: 18, glowColor: 'rgba(0,0,0,0.6)' });
  }
  // Flight data
  const alt = Math.max(0, launch.rocketGroup.position.y - launch.mount.y);
  const k = fadeInOut(t, S.launch[0] + 0.5, S.launch[1] - 0.1);
  if (k > 0) {
    const x = W - 120 - 380;
    glass(x, 230, 380, 210, k);
    text('FLIGHT', x + 26, 274, { font: FONT.mono, size: 16, weight: 700, color: '#4de8ff', spacing: 5, alpha: k });
    text('ALTITUDE', x + 26, 322, { font: FONT.mono, size: 13, color: '#7f93ad', spacing: 3, alpha: k });
    text(`${(alt * 0.42).toFixed(1)} km`, x + 354, 322, { font: FONT.mono, size: 22, weight: 700, align: 'right', alpha: k });
    text('ROCKET', x + 26, 368, { font: FONT.mono, size: 13, color: '#7f93ad', spacing: 3, alpha: k });
    text('MEDIUM · ETLAQ, DUQM', x + 354, 368, { font: FONT.mono, size: 16, weight: 600, align: 'right', alpha: k });
    text('STAGE', x + 26, 414, { font: FONT.mono, size: 13, color: '#7f93ad', spacing: 3, alpha: k });
    text(tau >= 8.5 ? '2 · SEPARATED' : tau >= 3 ? '1 · BURNING' : 'PAD · GO', x + 354, 414, { font: FONT.mono, size: 16, weight: 600, align: 'right', color: tau >= 8.5 ? '#43e6a0' : '#ffb547', alpha: k });
  }
}

function overlayOrbit(t, pos) {
  stepLabel(t, S.orbit, '03', 'OPERATE', 'شغّل');
  const [a] = S.orbit;
  const k = fadeInOut(t, a + 0.5, 17.1, 0.45);
  // Ground station label pinned to Oman
  if (pos && k > 0) {
    const v = pos.omanW.clone().project(orbit.camera);
    const x = (v.x * 0.5 + 0.5) * W;
    const y = (-v.y * 0.5 + 0.5) * H;
    ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = '#ffb547'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 16, y + 10); ctx.lineTo(x - 90, y + 80); ctx.lineTo(x - 330, y + 80); ctx.stroke(); ctx.restore();
    text('OMAN GROUND STATION', x - 330, y + 70, { font: FONT.mono, size: 15, weight: 700, color: '#ffb547', spacing: 3, alpha: k });
  }
  if (k <= 0) return;
  const x = 120;
  glass(x, 400, 420, 290, k);
  const hour = Math.floor(6 + (t - a) * 6.5);
  text('MISSION CLOCK', x + 26, 444, { font: FONT.mono, size: 13, color: '#7f93ad', spacing: 3, alpha: k });
  text(`HOUR ${String(hour).padStart(2, '0')} / 48`, x + 26, 490, { font: FONT.mono, size: 32, weight: 700, alpha: k });
  const map = Math.min(0.97, 0.08 + (t - a) * 0.2);
  text('BATTERY', x + 26, 540, { font: FONT.mono, size: 13, color: '#7f93ad', spacing: 3, alpha: k });
  text(`${Math.round(96 - (t - a) * 2)}%`, x + 394, 540, { font: FONT.mono, size: 15, align: 'right', alpha: k });
  bar(x + 26, 554, 368, (96 - (t - a) * 2) / 100, '#43e6a0', k);
  text('MAP OF THE GOAL', x + 26, 604, { font: FONT.mono, size: 13, color: '#7f93ad', spacing: 3, alpha: k });
  text(`${Math.round(map * 100)}%`, x + 394, 604, { font: FONT.mono, size: 15, align: 'right', alpha: k });
  bar(x + 26, 618, 368, map, '#4de8ff', k);
  text('● IMAGING     ↓ SENDING TO OMAN', x + 26, 668, { font: FONT.mono, size: 14, weight: 700, color: '#43e6a0', spacing: 1, alpha: k });

  // Event card: solar storm, a choice, and the outcome
  const ck = fadeInOut(t, 14.2, 15.75, 0.3);
  if (ck > 0) {
    const s = 0.94 + 0.06 * easeOutBack(seg(t, 14.2, 14.6));
    const cw = 560;
    const ch = 330;
    const cx = W - 120 - cw;
    const cy = 380;
    ctx.save();
    ctx.translate(cx + cw / 2, cy + ch / 2); ctx.scale(s, s); ctx.translate(-(cx + cw / 2), -(cy + ch / 2));
    glass(cx, cy, cw, ch, ck);
    text('⚠ MISSION CONTROL', cx + 28, cy + 44, { font: FONT.mono, size: 14, weight: 700, color: '#4de8ff', spacing: 4, alpha: ck });
    text('SOLAR STORM!', cx + 28, cy + 100, { size: 46, weight: 700, color: '#ffb547', alpha: ck, glow: 22, glowColor: 'rgba(255,181,71,.7)' });
    text('عاصفة شمسية!', cx + cw - 28, cy + 44, { font: FONT.ar, size: 24, weight: 700, color: '#ffb547', align: 'right', rtl: true, alpha: ck });
    text('Real story: in October 2003, solar storms damaged several satellites.', cx + 28, cy + 142, { size: 17, color: '#8193ad', alpha: ck });
    const pick = seg(t, 15.0, 15.2);
    const opts = [['Safe mode: camera off for 6 hours', 0.15 + pick * 0.35], ['Keep imaging (risky)', 0.06]];
    opts.forEach(([label, fill], i) => {
      const y = cy + 175 + i * 66;
      ctx.save(); ctx.globalAlpha = ck;
      ctx.beginPath(); ctx.roundRect(cx + 28, y, cw - 56, 52, 12);
      ctx.fillStyle = i === 0 ? `rgba(77,232,255,${fill})` : 'rgba(255,181,71,0.06)';
      ctx.fill();
      ctx.strokeStyle = i === 0 ? '#4de8ff' : 'rgba(255,181,71,0.55)'; ctx.lineWidth = i === 0 && pick > 0 ? 3 : 1.5; ctx.stroke();
      ctx.restore();
      text(label, cx + 50, y + 34, { size: 20, weight: 600, alpha: ck });
    });
    // Click ripple
    const rk = seg(t, 15.0, 15.45);
    if (rk > 0 && rk < 1) {
      ctx.save(); ctx.globalAlpha = (1 - rk) * ck; ctx.strokeStyle = '#4de8ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx + 120, cy + 201, 10 + rk * 60, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  const tk = fadeInOut(t, 15.8, 16.9, 0.25);
  if (tk > 0) {
    const tw = 420;
    glass(W - 120 - tw, 470, tw, 70, tk, 35);
    text('✓  SATELLITE SAFE · STORM PASSED', W - 120 - tw / 2, 514, { font: FONT.mono, size: 16, weight: 700, color: '#43e6a0', align: 'center', spacing: 2, alpha: tk });
  }
}

function overlayClose(t) {
  const [a] = S.close;
  const sk = easeInOut(seg(t, a, a + 0.7));
  if (sk > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, `rgba(1,4,11,${0.74 * sk})`);
    g.addColorStop(1, `rgba(1,4,11,${0.86 * sk})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  stars(W / 2, 360, 120, [a + 0.35, a + 0.6, a + 0.85], t, 150);
  const k1 = easeOutExpo(seg(t, a + 1.0, a + 1.6));
  text('EVERY CHOICE HAS A CONSEQUENCE.', W / 2, 500 + (1 - k1) * 30, { size: 64, weight: 700, align: 'center', alpha: k1, glow: 26, spacing: 2 });
  const k2 = easeOutExpo(seg(t, a + 1.25, a + 1.85));
  text('كل قرار له أثر.', W / 2, 590 + (1 - k2) * 30, { font: FONT.ar, size: 58, weight: 700, color: '#9fe9ff', align: 'center', alpha: k2, rtl: true });
  const k3 = easeOutExpo(seg(t, a + 1.6, a + 2.2));
  if (k3 > 0) {
    const pw = 620;
    ctx.save(); ctx.globalAlpha = k3;
    ctx.beginPath(); ctx.roundRect(W / 2 - pw / 2, 650, pw, 56, 28);
    ctx.fillStyle = 'rgba(77,232,255,0.1)'; ctx.fill();
    ctx.strokeStyle = 'rgba(77,232,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    text('BUILT WITH THREE.JS · BLENDER · CLAUDE CODE', W / 2, 686, { font: FONT.mono, size: 17, weight: 700, color: '#9fe9ff', align: 'center', spacing: 3, alpha: k3 });
  }
  const k4 = easeOutExpo(seg(t, a + 1.9, a + 2.5));
  text('MAJAN MISSION  |  مهمة مجان', W / 2, 790, { font: FONT.ar, size: 30, weight: 700, align: 'center', alpha: k4 });
  text('Team Majan Mission · NASA Space Apps 2026 · Ibra, Oman', W / 2, 834, { size: 22, color: '#8193ad', align: 'center', alpha: k4 });
}

// --- one frame -------------------------------------------------------------------
export function renderAt(t) {
  let scene;
  let camera;
  let tau = 0;
  let pos = null;
  if (t < S.build[0] || t >= S.orbit[0]) {
    pos = poseOrbit(t);
    scene = orbit.scene; camera = orbit.camera;
  } else if (t < S.launch[0]) {
    poseHangar(t);
    scene = hangar.scene; camera = hangar.camera;
  } else {
    tau = poseLaunch(t);
    scene = launch.scene; camera = launch.camera;
  }
  if (t >= LAUNCH_T0 && t < S.launch[0]) poseLaunch(t); // pre-roll the launch off screen

  // Whip transitions: flash + chromatic aberration spike at each cut
  let flash = 0;
  let ca = 0.0016;
  for (const c of CUTS) {
    const g = Math.exp(-Math.pow((t - c) / 0.11, 2));
    flash = Math.max(flash, g * 0.45);
    ca += g * 0.014;
  }
  flash += Math.max(0, 1 - t / 0.35) * 0; // no flash on the very first frame
  fx.final.uniforms.uFlash.value = flash;
  fx.final.uniforms.uCA.value = ca;
  fx.render(scene, camera, Math.floor(t * 60) / 60);

  ctx.drawImage(renderer.domElement, 0, 0, W, H);
  // Fade in from black at the start, fade out at the end
  overlayTitle(t);
  if (t >= S.build[0] && t < S.build[1]) overlayBuild(t);
  if (t >= S.launch[0] && t < S.launch[1]) overlayLaunch(t, tau);
  if (t >= S.orbit[0] && t < S.close[0] + 0.2) overlayOrbit(t, pos);
  if (t >= S.close[0]) overlayClose(t);
  hudFrame(t);
  const black = Math.max(1 - seg(t, 0, 0.5), seg(t, DURATION - 0.4, DURATION));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}

export function frameDataURL(t, type = 'image/jpeg', quality = 0.93) {
  renderAt(t);
  return out.toDataURL(type, quality);
}

window.film = { ready, renderAt, frameDataURL, DURATION, orbit, hangar, launch };

// Preview mode: play in real time (add ?t=12.5 to freeze on one frame)
ready.then(() => {
  const params = new URLSearchParams(location.search);
  const ctl = document.getElementById('controls');
  if (params.has('t')) { renderAt(Number(params.get('t'))); ctl.textContent = `t = ${params.get('t')}`; return; }
  if (params.has('render')) return; // the renderer drives frames itself
  const start = performance.now();
  const tick = () => {
    const t = ((performance.now() - start) / 1000) % DURATION;
    renderAt(t);
    ctl.textContent = `t = ${t.toFixed(2)}`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
