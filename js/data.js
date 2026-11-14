// Game data: parts, rockets, missions, ranks and badges.
// All numbers are placeholders until the team's sourced parts list replaces them.

export const BUS = { cost: 12, mass: 140, power: 30 }; // satellite body, always included

// Three slots, three levels each. `nodes` = Blender objects shown for that level.
export const SLOTS = {
  camera: [
    { id: 'c1', cost: 0, mass: 0, power: 20, data: 1.2, nodes: ['Camera_Std'] },
    { id: 'c2', cost: 8, mass: 25, power: 90, data: 4, nodes: ['Camera_Hi'] },
    { id: 'c3', cost: 14, mass: 35, power: 120, data: 6, nodes: ['Camera_Hyper'] },
  ],
  power: [
    { id: 'p1', cost: 0, mass: 0, gen: 120, battery: 250, nodes: ['Wing_Base'] },
    { id: 'p2', cost: 3, mass: 20, gen: 270, battery: 250, nodes: ['Wing_Base', 'Wing_Extra'] },
    { id: 'p3', cost: 7, mass: 40, gen: 270, battery: 900, nodes: ['Wing_Base', 'Wing_Extra', 'Battery_Pack'] },
  ],
  comms: [
    { id: 'a1', cost: 0, mass: 0, power: 10, downlink: 2, nodes: ['Antenna_Whip'] },
    { id: 'a2', cost: 2, mass: 10, power: 30, downlink: 6, nodes: ['Antenna_Whip', 'Antenna_Dish'] },
    { id: 'a3', cost: 9, mass: 6, power: 45, downlink: 14, nodes: ['Antenna_Whip', 'Antenna_Laser'] },
  ],
};
export const SLOT_ORDER = ['camera', 'power', 'comms'];
export const ALL_PART_NODES = ['Camera_Std', 'Camera_Hi', 'Camera_Hyper', 'Wing_Base', 'Wing_Extra',
  'Battery_Pack', 'Antenna_Whip', 'Antenna_Dish', 'Antenna_Laser'];

export const ROCKETS = [
  { id: 'small', maxMass: 200, cost: 10 },
  { id: 'medium', maxMass: 300, cost: 14 },
  { id: 'heavy', maxMass: Infinity, cost: 24 },
];

export const SUN_FRACTION = 0.62; // share of each orbit in sunlight

// Missions unlock with total stars. Events are played in this order at these hours.
export const MISSIONS = [
  { id: 'aflaj', budget: 40, target: 100, hours: 48, unlock: 0,
    events: [{ id: 'storm', hour: 12 }, { id: 'units', hour: 24 }, { id: 'station', hour: 34 }] },
  { id: 'khareef', budget: 50, target: 160, hours: 48, unlock: 2,
    events: [{ id: 'station', hour: 9 }, { id: 'storm', hour: 20 }, { id: 'debris', hour: 33 }] },
  { id: 'dunes', budget: 52, target: 205, hours: 60, unlock: 5,
    events: [{ id: 'debris', hour: 10 }, { id: 'storm', hour: 24 }, { id: 'units', hour: 38 }, { id: 'station', hour: 50 }] },
];

export const RANKS = [
  { id: 'cadet', xp: 0 },
  { id: 'engineer', xp: 250 },
  { id: 'director', xp: 800 },
  { id: 'commander', xp: 1800 },
];

export const BADGES = ['first_orbit', 'perfect_map', 'penny', 'shadow', 'units_guard', 'storm_rider', 'heavy', 'comeback'];

/** Totals for a design: { camera: 0..2, power: 0..2, comms: 0..2 } (level indexes). */
export function computeDesign(design, mission) {
  const cam = SLOTS.camera[design.camera];
  const pwr = SLOTS.power[design.power];
  const com = SLOTS.comms[design.comms];
  const cost = BUS.cost + cam.cost + pwr.cost + com.cost;
  const mass = BUS.mass + cam.mass + pwr.mass + com.mass;
  const powerUse = BUS.power + cam.power + com.power;
  const rocket = ROCKETS.find((r) => mass <= r.maxMass);
  const totalCost = cost + rocket.cost;
  const margin = mass / rocket.maxMass; // 0 for the heavy rocket (no limit)
  return {
    cam, pwr, com, cost, mass, powerUse, rocket, totalCost, margin,
    powerGen: pwr.gen,
    avgGen: pwr.gen * SUN_FRACTION,
    battery: pwr.battery,
    reserve: mission.budget - totalCost,
    overBudget: totalCost > mission.budget,
    failChance: margin > 0.95 ? 0.35 : margin > 0.85 ? 0.12 : 0.03,
  };
}
