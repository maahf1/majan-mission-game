// Mission rules (v3): the whole mission in NASA's four segments.
//   Space segment:  orbit, two instrument bays, power, antenna, end-of-mission device
//   Launch segment: the rocket, and the test campaign before it
//   Ground segment: ground stations
//   User segment:   who uses the data (text only, see the mission report)
// Pure logic, no 3D, runs in node too. Numbers are simplified teaching values, shaped by
// real missions and NASA's challenge resources (see SOURCES).

import { CLOUD_COVER } from './nasa.js';

export const BUS = { cost: 12, mass: 140, power: 30 }; // structure, computer, attitude control: always included

// Higher orbits see more ground per pass and last longer, but images are less sharp,
// the radio link is weaker and the rocket can carry less mass that high.
// lifeY = years before thin air pulls a small satellite down from that height. It limits the
// mission in low orbit, and it is how long a dead satellite stays up there as debris.
export const ORBITS = [
  { id: 'leo', alt: 400, periodH: 1.54, sun: 0.62, view: 0.85, detail: 1.15, link: 0.85, lifeY: 2, capF: 1.0 },
  { id: 'sso', alt: 700, periodH: 1.65, sun: 0.68, view: 1.0, detail: 1.0, link: 1.0, lifeY: 60, capF: 0.85, polar: true },
  { id: 'high', alt: 1200, periodH: 1.82, sun: 0.72, view: 1.25, detail: 0.8, link: 0.8, lifeY: 2000, capF: 0.7, polar: true },
];

// Instrument types modelled on real ones. data = units per orbit; power in watts.
// wide: the image covers a wide strip, so orbit sharpness matters less for it.
// band = the part of the spectrum it sees, as [from, to] along SPECTRUM (0..1).
export const INSTRUMENTS = [
  { id: 'basic', cost: 0, mass: 0, power: 20, data: 1.2, node: 'Camera_Std', tint: null, band: [0.04, 0.3] },
  { id: 'ms', cost: 8, mass: 25, power: 90, data: 4, node: 'Camera_Hi', tint: null, band: [0.04, 0.46] },
  { id: 'thermal', cost: 6, mass: 18, power: 60, data: 2.2, node: 'Camera_Std', tint: 0xff7a3d, night: true, band: [0.64, 0.82] },
  { id: 'wide', cost: 5, mass: 20, power: 45, data: 3.2, node: 'Camera_Hi', tint: 0x6fd0ff, wide: true, band: [0.04, 0.46] },
  { id: 'hyper', cost: 14, mass: 35, power: 120, data: 6, node: 'Camera_Hyper', tint: null, band: [0.04, 0.62] },
  { id: 'radar', cost: 16, mass: 60, power: 170, data: 7, node: 'radar', tint: null, night: true, band: [0.88, 1] },
];
// The strip on instrument cards: visible light, near and shortwave infrared, heat, microwaves
export const SPECTRUM = [
  { id: 'vis', from: 0.04, to: 0.3 }, { id: 'nir', from: 0.3, to: 0.46 }, { id: 'swir', from: 0.46, to: 0.62 },
  { id: 'tir', from: 0.64, to: 0.82 }, { id: 'mw', from: 0.88, to: 1 },
];
export const NO_INSTRUMENT = 'none';

export const POWER = [
  { id: 'p1', cost: 0, mass: 0, gen: 120, battery: 250, nodes: ['Wing_Base'] },
  { id: 'p2', cost: 3, mass: 20, gen: 270, battery: 250, nodes: ['Wing_Base', 'Wing_Extra'] },
  { id: 'p3', cost: 7, mass: 40, gen: 270, battery: 900, nodes: ['Wing_Base', 'Wing_Extra', 'Battery_Pack'] },
  { id: 'p4', cost: 12, mass: 65, gen: 420, battery: 1200, nodes: ['Wing_Base', 'Wing_Extra', 'Battery_Pack'], big: true },
];

// downlink = data units per orbit the antenna can send to the ground station in Oman
export const COMMS = [
  { id: 'a1', cost: 0, mass: 0, power: 10, downlink: 2, nodes: ['Antenna_Whip'] },
  { id: 'a2', cost: 2, mass: 10, power: 30, downlink: 6, nodes: ['Antenna_Whip', 'Antenna_Dish'] },
  { id: 'a3', cost: 9, mass: 6, power: 45, downlink: 14, nodes: ['Antenna_Whip', 'Antenna_Laser'] },
];

// Ground segment: the stations that receive the data. f = how much more contact time the
// satellite gets per orbit, by orbit. A polar station sees polar orbits (sso, high) on every
// lap, but a low tilted orbit never passes over the pole. backup: another station can take a
// pass when Oman's is busy.
export const GROUND = [
  { id: 'g1', cost: 0, f: { leo: 1, sso: 1, high: 1 } },
  { id: 'g2', cost: 2, f: { leo: 1, sso: 1.6, high: 1.6 }, backup: true },
  { id: 'g3', cost: 5, f: { leo: 1.9, sso: 1.9, high: 1.9 }, backup: true },
];

// End of mission: a dead satellite must leave orbit within 25 years (NASA-STD-8719.14, also in
// CubeSat 101). Low orbits decay by themselves. A drag sail works where there is still some
// air (below about 800 km). A thruster works anywhere, keeps a low orbit up for longer, and
// dodges debris without using up the mission's life.
export const EOM = [
  { id: 'e0', cost: 0, mass: 0 },
  { id: 'e1', cost: 1, mass: 4, sail: true },
  { id: 'e2', cost: 4, mass: 22, thruster: true },
];
export const DISPOSAL_LIMIT = 25; // years

// Test campaign before launch (CubeSat 101: vibration, thermal vacuum, day-in-the-life).
// fault = chance that something fails in the first hours in orbit.
export const TESTS = [
  { id: 't0', cost: 0, fault: 0.3 },
  { id: 't1', cost: 1, fault: 0.1 },
  { id: 't2', cost: 3, fault: 0.02 },
];

// Launched from Etlaq Spaceport in Duqm (in the game's near future).
// cap = payload to low orbit (kg); higher orbits take less (orbit capF). rel = reliability.
export const ROCKETS = [
  { id: 'small', cap: 220, cost: 10, rel: 0.96 },
  { id: 'medium', cap: 380, cost: 15, rel: 0.97 },
  { id: 'heavy', cap: 900, cost: 25, rel: 0.98 },
];

// fit = how useful each instrument's data is for the mission's science (1 = normal).
// years = how long the mission must keep working to finish the job.
export const MISSIONS = [
  { id: 'aflaj', budget: 42, target: 80, hours: 48, years: 3, unlock: 0, region: 'aflaj',
    fit: { basic: 0.6, ms: 1.2, thermal: 1.4, wide: 0.5, hyper: 1.0, radar: 0.8 },
    events: [{ id: 'storm', hour: 12 }, { id: 'units', hour: 24 }, { id: 'station', hour: 34 }] },
  // fit here is for a clear sky. The multispectral and hyperspectral cameras look at the ground, so
  // they lose the cloudy share measured from NASA's image (cloudLoss). sky = the instruments whose
  // job in this mission is the clouds themselves.
  { id: 'khareef', budget: 50, target: 105, hours: 48, years: 2, unlock: 2, region: 'khareef',
    fit: { basic: 0.5, ms: 1.4, thermal: 1.0, wide: 1.4, hyper: 1.2, radar: 1.3 }, sky: ['basic', 'wide', 'thermal'],
    events: [{ id: 'station', hour: 9 }, { id: 'storm', hour: 20 }, { id: 'debris', hour: 33 }] },
  { id: 'dunes', budget: 58, target: 170, hours: 60, years: 5, unlock: 5, region: 'dunes',
    fit: { basic: 0.5, ms: 1.1, thermal: 0.6, wide: 0.6, hyper: 1.2, radar: 1.4 },
    events: [{ id: 'debris', hour: 10 }, { id: 'storm', hour: 24 }, { id: 'units', hour: 38 }, { id: 'station', hour: 50 }] },
];

/**
 * Share of an instrument's images lost to cloud in this mission (0..1), from the cloud cover
 * measured in NASA's MODIS image of the target (nasa.js, CLOUD_COVER).
 * Radar uses microwaves, which pass through cloud. Instruments in mission.sky watch the clouds.
 */
export function cloudLoss(mission, instId) {
  const cover = CLOUD_COVER[mission.region || mission.id]?.cover || 0;
  if (cover < 0.02) return 0;                               // under 2% is a clear sky (a few bright pixels)
  if (instId === 'radar' || mission.sky?.includes(instId)) return 0;
  return cover;
}
/** How useful an instrument is for a mission, after cloud. */
export const instrumentFit = (mission, instId) => mission.fit[instId] * (1 - cloudLoss(mission, instId));
export const cloudInfo = (mission) => CLOUD_COVER[mission.region || mission.id] || { cover: 0, date: '', key: '' };

export const RANKS = [
  { id: 'cadet', xp: 0 },
  { id: 'engineer', xp: 250 },
  { id: 'director', xp: 800 },
  { id: 'commander', xp: 1800 },
];

export const BADGES = ['first_orbit', 'perfect_map', 'penny', 'shadow', 'units_guard', 'storm_rider', 'heavy', 'comeback', 'team_player', 'long_life'];

// Team mode: who decides what. 2-4 players share the roles below.
export const ROLES = [
  { id: 'planner', parts: ['orbit', 'eom', 'rocket'], color: '#ffb547' },
  { id: 'engineer', parts: ['power', 'test'], color: '#43e6a0' },
  { id: 'science', parts: ['inst1', 'inst2'], color: '#4de8ff' },
  { id: 'comms', parts: ['comms', 'ground'], color: '#a78bff' },
];
export function rolesFor(players) {
  // who plays which role: [player index per role]
  if (players <= 1) return [0, 0, 0, 0];
  if (players === 2) return [0, 0, 1, 1];
  if (players === 3) return [0, 1, 2, 2];
  return [0, 1, 2, 3];
}
// The player who decides each orbit event
export const EVENT_ROLE = { storm: 'engineer', units: 'planner', station: 'comms', debris: 'planner', fault: 'engineer' };

export const DEFAULT_DESIGN = { orbit: 'sso', inst1: 'basic', inst2: NO_INSTRUMENT, power: 'p1', comms: 'a1', ground: 'g1', eom: 'e0', test: 't0', rocket: 'small' };
export const DESIGN_KEYS = ['orbit', 'inst1', 'inst2', 'power', 'comms', 'ground', 'eom', 'test', 'rocket'];

export const SOURCES = [
  'NASA CubeSat 101 (tests, orbital debris, mission phases)',
  'NASA-STD-8719.14 (leave orbit within 25 years)',
  'NASA Small Spacecraft Technology State-of-the-Art report (power, batteries, antennas)',
  'Space Mission Engineering: The New SMAD (orbits, lifetime, link budget)',
  'Landsat 9 OLI-2 and TIRS-2, Terra MODIS, EMIT, NISAR (instrument types)',
];

const byId = (list, id) => list.find((x) => x.id === id) || list[0];
export const instrument = (id) => (id === NO_INSTRUMENT ? null : byId(INSTRUMENTS, id));

/** Battery wear: the deeper the battery empties in every shadow, the sooner it wears out. */
export function batteryYears(depth) {
  if (depth <= 0.25) return 12;
  if (depth <= 0.4) return 7;
  if (depth <= 0.6) return 4;
  if (depth <= 0.85) return 2;
  return 1;
}

/** Years a dead satellite stays in orbit, for an orbit and an end-of-mission device. */
export function disposalYears(orb, eom) {
  if (eom.thruster) return 1;                                        // steered down at the end
  if (eom.sail) return orb.alt <= 800 ? Math.max(1, Math.round(orb.lifeY / 10)) : Math.round(orb.lifeY / 2); // too little air up high
  return orb.lifeY;
}

/** Cheapest end-of-mission device that meets the 25-year rule in an orbit. */
export function cheapestEom(orbitId) {
  const orb = byId(ORBITS, orbitId);
  return (EOM.find((e) => disposalYears(orb, e) <= DISPOSAL_LIMIT) || EOM[EOM.length - 1]).id;
}

/** Totals for a design: { orbit, inst1, inst2, power, comms, ground, eom, test, rocket } ids. */
export function computeDesign(design, mission) {
  const orb = byId(ORBITS, design.orbit);
  const insts = [instrument(design.inst1), instrument(design.inst2)].filter(Boolean);
  const pwr = byId(POWER, design.power);
  const com = byId(COMMS, design.comms);
  const ground = byId(GROUND, design.ground);
  const eom = byId(EOM, design.eom);
  const test = byId(TESTS, design.test);
  const rocket = byId(ROCKETS, design.rocket);
  const sum = (k) => insts.reduce((a, x) => a + x[k], 0);

  const cost = BUS.cost + sum('cost') + pwr.cost + com.cost + eom.cost; // the satellite itself
  const mass = BUS.mass + sum('mass') + pwr.mass + com.mass + eom.mass;
  const instPower = sum('power');
  const powerUse = BUS.power + instPower + com.power;
  const capacity = Math.round(rocket.cap * orb.capF);
  const tooHeavy = mass > capacity;
  const margin = mass / capacity;
  const totalCost = cost + rocket.cost + ground.cost + test.cost;
  const reserve = mission.budget - totalCost;

  // Data: cameras see the ground only in daylight; thermal cameras (heat) and radar (their own
  // radio waves) also work at night. More ground is seen from higher up.
  const nightInsts = insts.filter((x) => x.night);
  const captureDay = sum('data') * orb.view;
  const captureNight = nightInsts.reduce((a, x) => a + x.data, 0) * orb.view;
  const capture = captureDay * orb.sun + captureNight * (1 - orb.sun); // per orbit
  // Daylight-only cameras rest in Earth's shadow, which saves battery
  const instPowerNight = nightInsts.reduce((a, x) => a + x.power, 0);
  const shadowUse = BUS.power + instPowerNight + com.power;
  // How useful that data is for this mission: data-weighted fit, sharper from lower orbits
  const raw = sum('data');
  const fit = raw > 0 ? insts.reduce((a, x) => a + x.data * instrumentFit(mission, x.id) * (x.wide ? 1 : orb.detail), 0) / raw : 0;
  // Cloud over the target (measured from NASA's image), and which of these instruments it blocks
  const cloud = cloudInfo(mission).cover;
  const cloudBlocked = insts.filter((x) => cloudLoss(mission, x.id) >= 0.05).map((x) => x.id);
  const downlink = com.downlink * orb.link * ground.f[orb.id];

  // Power: panels only work in sunlight
  const avgGen = pwr.gen * orb.sun;
  const shadowH = orb.periodH * (1 - orb.sun);
  const depth = (shadowUse * shadowH) / pwr.battery; // share of the battery used in each shadow
  const avgUse = powerUse * orb.sun + shadowUse * (1 - orb.sun);
  const batYears = batteryYears(depth);
  const orbitYears = orb.lifeY * (eom.thruster && orb.lifeY < 10 ? 3 : 1); // a thruster pushes a low orbit back up
  const lifeYears = Math.min(orbitYears, batYears);
  const lifeLimit = orbitYears <= batYears ? 'orbit' : 'battery';
  const disposal = disposalYears(orb, eom);
  const compliant = disposal <= DISPOSAL_LIMIT;

  const failChance = (1 - rocket.rel) + (margin > 0.95 ? 0.25 : margin > 0.85 ? 0.08 : 0);
  return {
    design: { ...design }, orb, insts, pwr, com, ground, eom, test, rocket,
    cost, mass, powerUse, instPower, instPowerNight, shadowUse, avgUse, capacity, tooHeavy, margin, totalCost, reserve,
    overBudget: totalCost > mission.budget, capture, captureDay, captureNight, fit, downlink, cloud, cloudBlocked,
    powerGen: pwr.gen, avgGen, battery: pwr.battery, depth, batYears, orbitYears, lifeYears, lifeLimit,
    disposal, compliant, faultChance: test.fault,
    failChance: Math.min(failChance, 0.6), canLaunch: !tooHeavy && totalCost <= mission.budget && compliant,
  };
}

/** Smallest rocket that can carry the design to its orbit (null if none). */
export function smallestRocket(design, mission) {
  for (const r of ROCKETS) {
    const d = computeDesign({ ...design, rocket: r.id }, mission);
    if (!d.tooHeavy) return r.id;
  }
  return null;
}

/** A design from the Space Center simulator (camera/power/comms levels 0..2). */
export function fromLegacy([camera, power, comms], mission) {
  const design = { ...DEFAULT_DESIGN, inst1: ['basic', 'ms', 'hyper'][camera] || 'basic', power: POWER[power]?.id || 'p1', comms: COMMS[comms]?.id || 'a1' };
  design.eom = cheapestEom(design.orbit);
  design.rocket = smallestRocket(design, mission) || 'heavy';
  return design;
}

/**
 * The mission's requirements, checked against a design and its forecast (verification).
 * hard: the mission cannot be approved for launch without it.
 */
export function requirements(d, f, mission) {
  return [
    { id: 'budget', ok: !d.overBudget, hard: true },
    { id: 'mass', ok: !d.tooHeavy, hard: true },
    { id: 'disposal', ok: d.compliant, hard: true },
    { id: 'power', ok: f.alive },
    { id: 'life', ok: d.lifeYears >= mission.years },
    { id: 'science', ok: f.coverage >= 0.9 },
  ];
}

/**
 * Concept Maturity Level 1-4 (JPL): 1 = an idea (a mission was chosen), 2 = feasible
 * (it could fly), 3 = trade space (several feasible designs were compared),
 * 4 = point design (one design meets every requirement).
 */
export function maturity(reqs, feasibleTried) {
  const feasible = reqs.filter((r) => r.hard).every((r) => r.ok) && reqs.find((r) => r.id === 'power').ok;
  if (!feasible) return 1;
  if (feasibleTried < 3) return 2;
  return reqs.every((r) => r.ok) ? 4 : 3;
}

/** Master equipment list: mass, power and cost by subsystem, for the point-design sheet. */
export function equipmentList(d) {
  const rows = [{ id: 'bus', mass: BUS.mass, power: BUS.power, cost: BUS.cost }];
  for (const x of d.insts) rows.push({ id: 'i_' + x.id, mass: x.mass, power: x.power, cost: x.cost });
  rows.push({ id: d.pwr.id, mass: d.pwr.mass, power: 0, cost: d.pwr.cost, gen: d.pwr.gen });
  rows.push({ id: d.com.id, mass: d.com.mass, power: d.com.power, cost: d.com.cost });
  if (d.eom.id !== 'e0') rows.push({ id: d.eom.id, mass: d.eom.mass, power: 0, cost: d.eom.cost });
  rows.push({ id: 'rocket_' + d.rocket.id, mass: 0, power: 0, cost: d.rocket.cost, launch: true });
  if (d.ground.cost) rows.push({ id: d.ground.id, mass: 0, power: 0, cost: d.ground.cost, ground: true });
  if (d.test.cost) rows.push({ id: d.test.id, mass: 0, power: 0, cost: d.test.cost, ground: true });
  return rows;
}
