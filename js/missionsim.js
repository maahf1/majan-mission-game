// Mission simulation (v2) for the orbit phase. Pure logic, no 3D, runs in node too.
// Every orbit has a sunlit part (panels charge the battery) and a shadow part (battery only).
// Science = data that reaches the ground x how well the instruments suit the mission,
// and the map must keep growing for the mission's years: a satellite that dies early leaves gaps.

const STEP = 0.05; // hours
export const COMMISSION_H = 1.5; // checkout after launch, before the instruments start

export function starsFor(coverage, alive, deadAt, hours) {
  let stars = coverage >= 0.9 ? 3 : coverage >= 0.5 ? 2 : 1;
  if (!alive && deadAt < hours / 2) stars = 1;
  else if (!alive) stars = Math.min(stars, 2);
  return stars;
}

export class MissionSim {
  /** d: computeDesign() result; mission from rules.MISSIONS */
  constructor(d, mission, { random = Math.random, skipEvents = false } = {}) {
    this.d = d;
    this.m = mission;
    this.random = random;
    this.skipEvents = skipEvents;
    this.hour = 0;
    this.battery = 1;
    this.minBattery = 1;
    this.captured = 0;
    this.sent = 0;
    this.science = 0;
    this.backlog = 0;
    this.alive = true;
    this.deadAt = null;
    this.genFactor = 1;
    this.coverageLoss = 0;
    this.reserve = d.reserve;
    this.lifeYears = d.lifeYears;
    // Commissioning: the first hours in orbit are a checkout, no pictures yet
    this.cameraOffUntil = COMMISSION_H;
    this.downlinkOffUntil = 0;
    this.nextEvent = 0;
    this.decisions = [];
    // Events for this flight: the mission's own, plus an early fault if the dice say so
    // (less testing before launch = more likely)
    this.events = [...mission.events];
    if (!skipEvents && random() < (d.faultChance || 0)) this.events.unshift({ id: 'fault', hour: 1 });
  }

  get done() { return !this.alive || this.hour >= this.m.hours - 1e-6; }
  get period() { return this.d.orb.periodH; }
  /** 0..1 position along the current orbit */
  get phase() { return (this.hour % this.period) / this.period; }
  get inSun() { return this.phase < this.d.orb.sun; }
  /** Taking pictures now: not in safe mode, and in daylight unless an instrument works at night. */
  get cameraOn() { return this.alive && this.hour >= this.cameraOffUntil && (this.inSun || this.d.captureNight > 0); }
  /** Over the night side with only daylight cameras: they rest until the sun is back. */
  get nightRest() { return this.alive && this.hour >= this.cameraOffUntil && !this.inSun && !(this.d.captureNight > 0); }
  get downlinkOn() { return this.alive && this.hour >= this.downlinkOffUntil && this.backlog > 0.01; }
  /** Share of the mission's years the satellite will last */
  get lifeFactor() { return Math.min(1, this.lifeYears / this.m.years); }
  /** Map progress during the simulated days (before the lifetime check) */
  get rawCoverage() { return Math.min(1, (this.science * (1 - this.coverageLoss)) / this.m.target); }
  /** Science return compared with the goal, not capped at 100% (for the trade study chart) */
  get value() { return ((this.science * (1 - this.coverageLoss)) / this.m.target) * this.lifeFactor; }
  /** Final map: also needs the satellite to keep working for the mission's years */
  get coverage() { return this.rawCoverage * this.lifeFactor; }

  get pendingEvent() {
    if (this.skipEvents) return null;
    const e = this.events[this.nextEvent];
    return e && this.alive && this.hour >= e.hour - 1e-6 ? e : null;
  }

  advance(hours) {
    let left = hours;
    while (left > 1e-9 && !this.done && !this.pendingEvent) {
      let h = Math.min(STEP, left);
      const e = this.skipEvents ? null : this.events[this.nextEvent];
      if (e) h = Math.min(h, Math.max(1e-4, e.hour - this.hour)); // stop exactly at the event
      h = Math.min(h, Math.max(1e-4, this.m.hours - this.hour));
      this._tick(h);
      left -= h;
    }
  }

  _tick(h) {
    const d = this.d;
    const camOn = this.hour >= this.cameraOffUntil;
    const linkOn = this.hour >= this.downlinkOffUntil;
    const sun = this.inSun;
    const gen = sun ? d.powerGen * this.genFactor : 0;
    const instUse = !camOn ? 0 : sun ? d.instPower : d.instPowerNight;
    const use = d.powerUse - d.instPower + instUse;
    this.battery = Math.min(1, this.battery + ((gen - use) * h) / d.battery);
    this.minBattery = Math.min(this.minBattery, this.battery);
    if (this.battery <= 0) {
      this.battery = 0;
      this.alive = false;
      this.deadAt = this.hour;
      return;
    }
    const perHour = 1 / this.period;
    if (camOn) {
      const got = (sun ? d.captureDay : d.captureNight) * perHour * h;
      this.captured += got;
      this.backlog += got;
    }
    if (linkOn) {
      const send = Math.min(this.backlog, d.downlink * perHour * h);
      this.sent += send;
      this.science += send * d.fit;
      this.backlog -= send;
    }
    this.hour += h;
  }

  /** Apply 'a' (safe) or 'b' (risky / pay) to the pending event. Returns the outcome key. */
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
      case 'fault':
        // A solar wing did not open. Work the problem from the ground, or carry on with less power.
        if (choice === 'a') { this.cameraOffUntil = Math.max(this.cameraOffUntil, this.hour + 5); outcome = 'fault_fixed'; }
        else { this.genFactor *= 0.55; outcome = 'fault_ignored'; }
        break;
      case 'station':
        if (this.d.ground.backup) outcome = 'station_backup'; // another station takes the pass
        else if (choice === 'b' && this.reserve >= 1) { this.reserve -= 1; outcome = 'station_paid'; }
        else { this.downlinkOffUntil = this.hour + 4; outcome = 'station_waited'; }
        break;
      case 'debris':
        // Dodging: with a thruster it is routine. Without one the satellite turns to use air drag,
        // which costs time in orbit later.
        if (choice === 'a' && this.d.eom.thruster) { this.cameraOffUntil = this.hour + 1; outcome = 'debris_thruster'; }
        else if (choice === 'a') { this.cameraOffUntil = this.hour + 3; this.lifeYears = Math.max(0.5, this.lifeYears - 0.3); outcome = 'debris_dodged'; }
        else if (r < 0.25) { this.genFactor *= 0.7; outcome = 'debris_hit'; }
        else outcome = 'debris_lucky';
        break;
      default:
        outcome = 'none';
    }
    this.decisions.push({ id: e.id, choice, outcome });
    this.nextEvent++;
    return outcome;
  }

  results() {
    const cov = this.coverage;
    const stars = starsFor(cov, this.alive, this.deadAt, this.m.hours);
    const lifeOk = this.lifeYears >= this.m.years;
    const score = Math.round(cov * 1000 + Math.max(0, this.reserve) * 30 + (this.alive ? 200 + this.battery * 150 : 0) + (lifeOk ? 100 : 0));
    const d = this.d;
    const findings = [];
    if (!this.alive) {
      findings.push({ key: 'res_power_dead', bad: true, vars: { h: Math.round(this.deadAt), use: d.powerUse, gen: d.powerGen } });
    } else {
      findings.push({ key: 'res_power_ok', bad: false, vars: { b: this.minBattery } });
    }
    findings.push({ key: 'res_coverage', bad: cov < 0.5, vars: { cov } });
    if (this.backlog > 1) findings.push({ key: 'res_antenna', bad: true, vars: { sent: Math.round(this.sent), captured: Math.round(this.captured) } });
    if (d.fit < 0.9) findings.push({ key: 'res_fit_low', bad: true, vars: { fit: d.fit } });
    else if (d.fit >= 1.15) findings.push({ key: 'res_fit_good', bad: false, vars: { fit: d.fit } });
    if (d.cloud >= 0.05) findings.push({ key: d.cloudBlocked.length ? 'res_cloud' : 'res_cloud_ok', bad: d.cloudBlocked.length > 0, vars: { cloud: d.cloud } });
    if (!lifeOk) findings.push({ key: d.lifeLimit === 'orbit' ? 'res_life_orbit' : 'res_life_battery', bad: true, vars: { y: this.lifeYears, need: this.m.years } });
    else findings.push({ key: 'res_life_ok', bad: false, vars: { y: this.lifeYears, need: this.m.years } });
    if (this.backlog <= 1 && this.rawCoverage < 0.9 && this.alive && d.fit >= 0.9) findings.push({ key: 'res_camera', bad: true, vars: {} });
    for (const x of this.decisions) findings.push({ key: 'res_' + x.outcome, bad: /damaged|wrong|hit|ignored/.test(x.outcome), vars: {} });
    // End of mission: what happens to the satellite afterwards
    findings.push({ key: d.eom.thruster ? 'res_eom_thruster' : d.eom.sail ? 'res_eom_sail' : 'res_eom_natural', bad: false, vars: { y: d.disposal } });
    return {
      stars, score, coverage: cov, rawCoverage: this.rawCoverage, alive: this.alive, battery: this.battery,
      minBattery: this.minBattery, reserve: this.reserve, lifeYears: this.lifeYears, lifeOk,
      decisions: this.decisions, findings,
    };
  }
}

/** Predict a mission with no surprises: used by the forecast before launch. */
/** Plays the mission with the safe choice (a) at every event: a design forecast at 3 stars keeps
 *  them when the team plays it safe. Risky choices can win back the lost hours, or cost more. */
export function forecast(d, mission) {
  const s = new MissionSim(d, mission, { random: () => 0.99 });
  for (let guard = 0; guard < 50 && !s.done; guard++) {
    s.advance(mission.hours + 1);
    if (s.pendingEvent) s.choose('a');
  }
  return { stars: starsFor(s.coverage, s.alive, s.deadAt, mission.hours), coverage: s.coverage, rawCoverage: s.rawCoverage, value: s.value, alive: s.alive, deadAt: s.deadAt };
}
