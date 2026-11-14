// Mission simulation for the orbit phase. Pure logic, no 3D, easy to test.
import { SUN_FRACTION } from './data.js';

export const ORBIT_HOURS = 1.5; // about 90 minutes, like a real low Earth orbit
const STEP = 0.05;              // simulation step, in hours

export function starsFor(coverage, alive, deadAt, hours) {
  let stars = coverage >= 0.9 ? 3 : coverage >= 0.5 ? 2 : 1;
  if (!alive && deadAt < hours / 2) stars = 1;
  else if (!alive) stars = Math.min(stars, 2);
  return stars;
}

export class MissionSim {
  /** d: result of computeDesign(); mission: from MISSIONS */
  constructor(d, mission, { random = Math.random, skipEvents = false } = {}) {
    this.d = d;
    this.m = mission;
    this.random = random;
    this.skipEvents = skipEvents;
    this.hour = 0;
    this.battery = 1;
    this.captured = 0;
    this.sent = 0;
    this.backlog = 0;
    this.alive = true;
    this.deadAt = null;
    this.genFactor = 1;
    this.coverageLoss = 0;
    this.reserve = d.reserve;
    this.cameraOffUntil = 0;
    this.downlinkOffUntil = 0;
    this.nextEvent = 0;
    this.decisions = [];
    this.minBattery = 1;
  }

  get done() { return !this.alive || this.hour >= this.m.hours; }
  get avgPowerGen() { return this.d.powerGen * this.genFactor * SUN_FRACTION; }
  get coverage() { return Math.min(1, (this.sent * (1 - this.coverageLoss)) / this.m.target); }
  get cameraOn() { return this.alive && this.hour >= this.cameraOffUntil; }
  get downlinkOn() { return this.alive && this.hour >= this.downlinkOffUntil && this.backlog > 0.01; }

  get pendingEvent() {
    if (this.skipEvents) return null;
    const e = this.m.events[this.nextEvent];
    return e && this.alive && this.hour >= e.hour ? e : null;
  }

  advance(hours) {
    let left = hours;
    while (left > 1e-9 && !this.done && !this.pendingEvent) {
      const h = Math.min(STEP, left);
      this._tick(h);
      left -= h;
    }
  }

  _tick(h) {
    const camOn = this.hour >= this.cameraOffUntil;
    const linkOn = this.hour >= this.downlinkOffUntil;
    const use = this.d.powerUse - (camOn ? 0 : this.d.cam.power);
    this.battery += ((this.avgPowerGen - use) * h) / this.d.battery;
    this.battery = Math.min(1, this.battery);
    this.minBattery = Math.min(this.minBattery, this.battery);
    if (this.battery <= 0) {
      this.battery = 0;
      this.alive = false;
      this.deadAt = this.hour;
      return;
    }
    const perHour = 1 / ORBIT_HOURS;
    if (camOn) {
      const got = this.d.cam.data * perHour * h;
      this.captured += got;
      this.backlog += got;
    }
    if (linkOn) {
      const send = Math.min(this.backlog, this.d.com.downlink * perHour * h);
      this.sent += send;
      this.backlog -= send;
    }
    this.hour += h;
  }

  /** Apply 'a' or 'b' to the pending event. Returns the outcome key. */
  choose(choice) {
    const e = this.pendingEvent;
    if (!e) return null;
    let outcome;
    const r = this.random();
    switch (e.id) {
      case 'storm':
        if (choice === 'a') { this.cameraOffUntil = this.hour + 6; outcome = 'storm_safe'; }
        else if (r < 0.5) { this.genFactor *= 0.8; outcome = 'storm_damaged'; }
        else outcome = 'storm_lucky';
        break;
      case 'units':
        if (choice === 'a') { this.cameraOffUntil = this.hour + 2; outcome = 'units_checked'; }
        else if (r < 0.3) { this.coverageLoss = 0.15; outcome = 'units_wrong'; }
        else outcome = 'units_lucky';
        break;
      case 'station':
        if (choice === 'b' && this.reserve >= 1) { this.reserve -= 1; outcome = 'station_paid'; }
        else { this.downlinkOffUntil = this.hour + 4; outcome = 'station_waited'; }
        break;
      case 'debris':
        if (choice === 'a') { this.cameraOffUntil = this.hour + 3; outcome = 'debris_dodged'; }
        else if (r < 0.25) { this.genFactor *= 0.7; outcome = 'debris_hit'; }
        else outcome = 'debris_lucky';
        break;
    }
    this.decisions.push({ id: e.id, choice, outcome });
    this.nextEvent++;
    return outcome;
  }

  results() {
    const cov = this.coverage;
    const stars = starsFor(cov, this.alive, this.deadAt, this.m.hours);
    const score = Math.round(cov * 1000 + Math.max(0, this.reserve) * 30 + (this.alive ? 200 + this.battery * 150 : 0));
    const findings = [];
    if (!this.alive) {
      findings.push({ key: 'res_power_dead', bad: true,
        vars: { h: Math.round(this.deadAt), use: this.d.powerUse, avg: Math.round(this.avgPowerGen) } });
    } else {
      findings.push({ key: 'res_power_ok', bad: false, vars: { b: this.battery } });
    }
    findings.push({ key: 'res_coverage', bad: cov < 0.5, vars: { cov } });
    if (this.backlog > 1) {
      findings.push({ key: 'res_antenna', bad: true, vars: { sent: Math.round(this.sent), captured: Math.round(this.captured) } });
    } else if (cov < 0.9 && this.alive) {
      findings.push({ key: 'res_camera', bad: true, vars: {} });
    }
    for (const dcs of this.decisions) {
      findings.push({ key: 'res_' + dcs.outcome, bad: /damaged|wrong|hit/.test(dcs.outcome), vars: {} });
    }
    return { stars, score, coverage: cov, alive: this.alive, battery: this.battery, minBattery: this.minBattery,
      reserve: this.reserve, decisions: this.decisions, findings };
  }
}

/** Predict a mission with no surprises: used by the forecast before launch. */
export function forecast(d, mission) {
  const s = new MissionSim(d, mission, { skipEvents: true });
  s.advance(mission.hours + 1);
  return { stars: starsFor(s.coverage, s.alive, s.deadAt, mission.hours), coverage: s.coverage, alive: s.alive, deadAt: s.deadAt };
}
