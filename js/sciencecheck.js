// Science check: every number below is computed in the browser when the page opens, from the
// same rules the game plays with (rules.js, missionsim.js, nasa.js), and set beside physics or
// a figure NASA publishes. Nothing here is typed in as a result.
import { ORBITS, INSTRUMENTS, POWER, COMMS, GROUND, EOM, TESTS, ROCKETS, MISSIONS, BUS, NO_INSTRUMENT, DISPOSAL_LIMIT, computeDesign, cloudLoss } from './rules.js';
import { forecast } from './missionsim.js';
import { CLOUD_COVER, savedCloud, measureCloud, liveSky, yesterday } from './nasa.js';

const MU = 398600.4418;     // Earth's gravitational parameter, km^3/s^2
const RE = 6378.137;        // Earth's equatorial radius, km

/** Kepler's third law: minutes for one lap of a circular orbit at this height. */
export const periodMin = (altKm) => (2 * Math.PI * Math.sqrt((RE + altKm) ** 3 / MU)) / 60;

/** Share of a circular orbit spent in sunlight; beta = angle between the orbit plane and the Sun. */
export function sunShare(altKm, betaDeg) {
  const r = RE + altKm;
  const x = Math.sqrt(altKm * altKm + 2 * RE * altKm) / (r * Math.cos((betaDeg * Math.PI) / 180));
  return x >= 1 ? 1 : 1 - Math.acos(x) / Math.PI;
}

// Orbit periods NASA publishes for real missions (their mission pages)
const REAL = [
  { name: 'Landsat 9', alt: 705, period: 99, src: 'NASA / USGS Landsat 9' },
  { name: 'Terra', alt: 705, period: 98.8, src: 'NASA Terra' },
  { name: 'SMAP', alt: 685, period: 98.5, src: 'NASA SMAP' },
  { name: 'GPM Core Observatory', alt: 407, period: 93, src: 'NASA GPM' },
  { name: 'Sentinel-6 Michael Freilich', alt: 1336, period: 112, src: 'NASA / ESA Sentinel-6' },
];

const f1 = (v) => v.toFixed(1);
const pc = (v) => (v * 100).toFixed(1) + '%';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('not loaded'));
    img.src = src;
  });
}

/** Every design the game allows for a mission (standard test campaign), with its forecast. */
function allDesigns(m) {
  const rows = [];
  for (const orbit of ORBITS) for (const i1 of INSTRUMENTS) for (const i2 of [{ id: NO_INSTRUMENT }, ...INSTRUMENTS]) {
    if (i2.id === i1.id || (i2.id !== NO_INSTRUMENT && INSTRUMENTS.indexOf(i2) < INSTRUMENTS.indexOf(i1))) continue;
    for (const power of POWER) for (const comms of COMMS) for (const ground of GROUND) for (const eom of EOM) for (const rocket of ROCKETS) {
      const design = { orbit: orbit.id, inst1: i1.id, inst2: i2.id, power: power.id, comms: comms.id, ground: ground.id, eom: eom.id, test: 't1', rocket: rocket.id };
      rows.push({ design, d: computeDesign(design, m), parts: { orbit, i1, i2, power, comms, ground, eom, rocket } });
    }
  }
  return rows;
}

/**
 * Runs all checks. Each row: { group, name, ours, ref, src, ok } with ok true, false, or null
 * for a row that only reports (live data that has no fixed right answer).
 * tr(key, vars) translates the row labels.
 */
export async function runChecks(tr) {
  const rows = [];
  const add = (group, name, ours, ref, src, ok) => rows.push({ group, name, ours, ref, src, ok });

  // 1. The game's three orbits against Kepler's third law
  for (const o of ORBITS) {
    const k = periodMin(o.alt);
    add('kepler', tr('k_orbit', { alt: o.alt }), `${f1(o.periodH * 60)} min`, `${f1(k)} min`, tr('src_kepler'), Math.abs(o.periodH * 60 - k) <= 0.5);
  }

  // 2. The same formula against orbits NASA publishes
  for (const r of REAL) {
    const k = periodMin(r.alt);
    add('real', tr('k_real', { name: r.name, alt: r.alt }), `${f1(k)} min`, `${r.period} min`, r.src, Math.abs(k - r.period) <= 0.6);
  }

  // 3. Sunlight: the game's share of each orbit in the Sun against the geometry of Earth's shadow
  const beta = { leo: 0, sso: 22, high: 22 };
  for (const o of ORBITS) {
    const g = sunShare(o.alt, beta[o.id]);
    add('sun', tr('k_sun', { alt: o.alt, beta: beta[o.id] }), pc(o.sun), pc(g), tr('src_shadow'), Math.abs(o.sun - g) <= 0.03);
  }

  // 4. Cloud cover: measure NASA's saved images again, here, and compare with the numbers the rules use
  for (const m of MISSIONS) {
    const region = m.region || m.id;
    const saved = savedCloud(region);
    try {
      const img = await loadImage(`assets/nasa/${region}_${saved.key.endsWith('_b') ? 'b' : 'a'}.jpg`);
      const got = measureCloud(img).cover;
      add('cloud', tr('k_cloud', { region: tr('r_' + region), date: saved.date }), pc(got), pc(saved.cover), tr('src_modis'), Math.abs(got - saved.cover) <= 0.02);
    } catch {
      add('cloud', tr('k_cloud', { region: tr('r_' + region), date: saved.date }), tr('no_image'), pc(saved.cover), tr('src_modis'), false);
    }
  }
  // ... and the cloud rule itself, with the saved Khareef sky
  const kh = MISSIONS.find((m) => m.id === 'khareef');
  const savedKh = savedCloud('khareef').cover;
  const liveNow = CLOUD_COVER.khareef.live;
  if (!liveNow) {
    add('cloud', tr('k_rule_cam'), pc(cloudLoss(kh, 'ms')), pc(savedKh), tr('src_rule'), Math.abs(cloudLoss(kh, 'ms') - savedKh) < 1e-9);
    add('cloud', tr('k_rule_radar'), pc(cloudLoss(kh, 'radar')), pc(0), tr('src_rule'), cloudLoss(kh, 'radar') === 0);
  }

  // 5. Every design the game allows, counted now
  let total = 0, launchable = 0, lateDisposal = 0, overMass = 0, overCost = 0, costMismatch = 0;
  const three = {};
  for (const m of MISSIONS) {
    const stars3 = [];
    for (const r of allDesigns(m)) {
      total++;
      if (!r.d.canLaunch) continue;
      launchable++;
      const p = r.parts;
      // independent sums, straight from the parts tables
      const mass = BUS.mass + p.i1.mass + (p.i2.mass || 0) + p.power.mass + p.comms.mass + p.eom.mass;
      const cost = BUS.cost + p.i1.cost + (p.i2.cost || 0) + p.power.cost + p.comms.cost + p.eom.cost + p.rocket.cost + p.ground.cost + TESTS.find((t) => t.id === 't1').cost;
      if (r.d.disposal > DISPOSAL_LIMIT) lateDisposal++;
      if (mass > p.rocket.cap * p.orbit.capF + 1e-9) overMass++;
      if (cost > m.budget) overCost++;
      if (cost !== r.d.totalCost) costMismatch++;
      if (forecast(r.d, m).stars === 3) stars3.push(r.design);
    }
    three[m.id] = { n: stars3.length, orbits: new Set(stars3.map((d) => d.orbit)).size };
  }
  const n = (v) => v.toLocaleString('en');
  add('rules', tr('k_all', { total: n(total), ok: n(launchable) }), tr('v_none', { v: n(lateDisposal) }), tr('v_limit', { y: DISPOSAL_LIMIT }), 'NASA-STD-8719.14', lateDisposal === 0);
  add('rules', tr('k_mass'), tr('v_none', { v: n(overMass) }), '0', tr('src_tables'), overMass === 0);
  add('rules', tr('k_cost'), tr('v_none', { v: n(overCost + costMismatch) }), '0', tr('src_tables'), overCost + costMismatch === 0);
  for (const m of MISSIONS) {
    const t3 = three[m.id];
    add('rules', tr('k_fair', { mission: tr('r_' + (m.region || m.id)) }), tr('v_three', { n: t3.n, o: t3.orbits }), tr('v_more'), tr('src_challenge'), t3.n > 1 && t3.orbits > 1);
  }

  // 6. Live from NASA, if there is a connection: the newest complete image of Dhofar, measured now
  try {
    let got = null;
    for (const back of [1, 2, 3, 4]) {
      const r = await liveSky('khareef', yesterday(back));
      if (r.empty <= 0.3) { got = r; break; }
    }
    if (got) add('live', tr('k_live', { date: got.date }), pc(got.cover), tr('v_live'), 'NASA GIBS · MODIS Terra', null);
    else add('live', tr('k_live_none'), '—', tr('v_live'), 'NASA GIBS · MODIS Terra', null);
  } catch {
    add('live', tr('k_live_off'), '—', tr('v_live'), 'NASA GIBS · MODIS Terra', null);
  }
  return rows;
}
