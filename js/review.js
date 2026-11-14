// Design review: the mission's requirements checked against the design, the trade study
// chart, the equipment list and NASA's four mission segments. Opens from the design screen.
// Ideas from NASA's challenge resources: systems engineering (requirements, then
// verification), JPL's Concept Maturity Levels, and the Mission Design Lab's trade studies
// and point designs.
import {
  ORBITS, INSTRUMENTS, POWER, COMMS, GROUND, ROCKETS, NO_INSTRUMENT,
  computeDesign, requirements, equipmentList, cheapestEom,
} from './rules.js';
import { forecast } from './missionsim.js';
import { t, fmt, pct, sep, getLang } from './i18n.js';
import { realMissionsHtml } from './realmissions.js';

// --- Trade space: a fixed sample of everything that could be built for a mission -------------
const spaceCache = {};
export function tradeSpace(mission) {
  if (spaceCache[mission.id]) return spaceCache[mission.id];
  let seed = 20261114;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const insts = [NO_INSTRUMENT, ...INSTRUMENTS.map((x) => x.id)];
  const out = [];
  for (let i = 0; i < 1500; i++) {
    const orbit = pick(ORBITS).id;
    const inst1 = pick(INSTRUMENTS).id;
    let inst2 = pick(insts);
    if (inst2 === inst1) inst2 = NO_INSTRUMENT;
    const design = {
      orbit, inst1, inst2, power: pick(POWER).id, comms: pick(COMMS).id, ground: pick(GROUND).id,
      eom: rnd() < 0.3 ? 'e2' : cheapestEom(orbit), test: 't1', rocket: pick(ROCKETS).id,
    };
    const d = computeDesign(design, mission);
    if (d.tooHeavy || !d.compliant) continue;
    out.push({ cost: d.totalCost, value: forecast(d, mission).value });
  }
  spaceCache[mission.id] = out;
  return out;
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function reqText(r, d, f, m) {
  const v = {
    budget: { a: fmt(d.totalCost), b: fmt(m.budget) },
    mass: { a: fmt(d.mass), b: fmt(d.capacity) },
    disposal: { a: fmt(d.disposal) },
    life: { a: fmt(d.lifeYears), b: fmt(m.years) },
    science: { a: pct(f.coverage) },
  }[r.id] || {};
  return t('req_' + r.id, v);
}

export function cmlLadder(level) {
  return [1, 2, 3, 4].map((n) => `<span class="${n < level ? 'done' : n === level ? 'now' : ''}"><b>${fmt(n)}</b>${t('cml_' + n)}</span>`).join('<i></i>');
}

function drawTrade(canvas, mission, tried, you) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const ar = getLang() === 'ar';
  const font = ar ? '"IBM Plex Sans Arabic", sans-serif' : '"Space Grotesk", sans-serif';
  const space = tradeSpace(mission);
  const pad = { l: 46, r: 14, t: 14, b: 38 };
  const x0 = 20;
  const x1 = Math.ceil(mission.budget * 1.2);
  const yMax = 1.5;
  const X = (c) => pad.l + ((Math.min(Math.max(c, x0), x1) - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const Y = (v) => H - pad.b - (Math.min(v, yMax) / yMax) * (H - pad.t - pad.b);
  g.clearRect(0, 0, W, H);

  // Over-budget zone, grid and axes
  g.fillStyle = 'rgba(255,95,109,.07)';
  g.fillRect(X(mission.budget), pad.t, W - pad.r - X(mission.budget), H - pad.t - pad.b);
  g.strokeStyle = 'rgba(255,255,255,.08)';
  g.lineWidth = 1;
  g.font = `11px ${font}`;
  g.fillStyle = '#8193ad';
  g.direction = 'ltr';
  g.textAlign = 'right';
  for (const v of [0, 0.5, 1, 1.5]) {
    g.beginPath(); g.moveTo(pad.l, Y(v)); g.lineTo(W - pad.r, Y(v)); g.stroke();
    g.fillText(pct(v), pad.l - 6, Y(v) + 4);
  }
  g.textAlign = 'center';
  for (let c = x0; c <= x1; c += 10) g.fillText(fmt(c), X(c), H - pad.b + 14);
  g.direction = ar ? 'rtl' : 'ltr';
  g.fillText(t('trade_x'), (pad.l + W - pad.r) / 2, H - 6);
  // Star lines and the budget line
  const hline = (v, col, label) => {
    g.strokeStyle = col; g.setLineDash([5, 4]);
    g.beginPath(); g.moveTo(pad.l, Y(v)); g.lineTo(W - pad.r, Y(v)); g.stroke();
    g.setLineDash([]); g.fillStyle = col; g.textAlign = 'left'; g.direction = 'ltr';
    g.fillText(label, pad.l + 6, Y(v) - 4);
  };
  hline(0.9, 'rgba(255,181,71,.8)', '★★★');
  hline(0.5, 'rgba(255,181,71,.45)', '★★');
  g.strokeStyle = 'rgba(255,95,109,.8)';
  g.setLineDash([5, 4]);
  g.beginPath(); g.moveTo(X(mission.budget), pad.t); g.lineTo(X(mission.budget), H - pad.b); g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,95,109,.9)';
  g.textAlign = 'center';
  g.direction = ar ? 'rtl' : 'ltr';
  g.fillText(t('trade_budget'), X(mission.budget), pad.t + 10);

  // Every possible design, faint
  g.fillStyle = 'rgba(150,185,230,.42)';
  for (const p of space) { if (p.cost > x1) continue; g.beginPath(); g.arc(X(p.cost), Y(p.value), 2.2, 0, 7); g.fill(); }
  // Best value at each price (the Pareto front)
  const all = [...space, ...tried].filter((p) => p.cost <= x1).sort((a, b) => a.cost - b.cost || b.value - a.value);
  let best = -1;
  g.strokeStyle = '#ffb547';
  g.lineWidth = 2;
  g.beginPath();
  let started = false;
  for (const p of all) {
    if (p.value <= best) continue;
    if (!started) { g.moveTo(X(p.cost), Y(p.value)); started = true; } else { g.lineTo(X(p.cost), Y(best)); g.lineTo(X(p.cost), Y(p.value)); }
    best = p.value;
  }
  if (started) { g.lineTo(X(x1), Y(best)); g.stroke(); }
  // Designs the player tried, then the current one
  for (const p of tried) {
    g.fillStyle = p.feasible ? '#4de8ff' : 'rgba(77,232,255,.35)';
    g.beginPath(); g.arc(X(p.cost), Y(p.value), 4.5, 0, 7); g.fill();
  }
  if (you) {
    g.strokeStyle = '#fff';
    g.lineWidth = 2.5;
    g.fillStyle = '#ffb547';
    g.beginPath(); g.arc(X(you.cost), Y(you.value), 7, 0, 7); g.fill(); g.stroke();
  }
}

/**
 * Open the review. ctx: { layer, el, mission, design, tried: Map, cml, sound(key), tab }
 * Returns a close function.
 */
export function openReview(ctx) {
  const { layer, el, mission: m, sound } = ctx;
  let tab = ctx.tab || 'req';
  const d = computeDesign(ctx.design, m);
  const f = forecast(d, m);
  const reqs = requirements(d, f, m);
  const tried = [...ctx.tried.values()];
  const close = () => { layer.hidden = true; el.innerHTML = ''; el.className = 'glass modal brackets info'; removeEventListener('resize', redraw); };
  function redraw() { const c = el.querySelector('#trade'); if (c) drawTrade(c, m, tried, { cost: d.totalCost, value: f.value }); }

  function body() {
    if (tab === 'req') {
      return `<div class="cml-big">${cmlLadder(ctx.cml)}</div>
        <p class="rv-note">${t('cml_next_' + ctx.cml, { n: fmt(new Set(tried.filter((x) => x.feasible).map((x) => x.arch)).size) })}</p>
        <ul class="reqs">${reqs.map((r) => `<li class="${r.ok ? 'ok' : 'no'}"><b>${r.ok ? '✓' : '✗'}</b><span>${reqText(r, d, f, m)}</span>${r.hard ? `<em>${t('req_hard')}</em>` : ''}</li>`).join('')}</ul>
        <p class="rv-note">${t('rv_req_note')}</p><p class="rv-note">${t('cml_note')}</p>`;
    }
    if (tab === 'trade') {
      return `<canvas id="trade" class="trade"></canvas>
        <div class="trade-legend">
          <span><i class="you"></i>${t('trade_you')}</span><span><i class="tried"></i>${t('trade_tried', { n: fmt(tried.length) })}</span>
          <span><i class="all"></i>${t('trade_all')}</span><span><i class="best"></i>${t('trade_best')}</span>
        </div>
        <p class="rv-note">${t('trade_note')}</p>`;
    }
    if (tab === 'mel') {
      const rows = equipmentList(d);
      const name = (id) => (id === 'bus' ? t('mel_bus') : t(id));
      return `<table class="mel"><thead><tr><th>${t('mel_item')}</th><th>${t('mel_mass')}</th><th>${t('mel_power')}</th><th>${t('mel_cost')}</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${esc(name(r.id))}</td><td>${r.mass ? `${fmt(r.mass)} ${t('u_kg')}` : '—'}</td>
          <td>${r.gen ? t('mel_gen', { w: fmt(r.gen) }) : r.power ? `${fmt(r.power)} ${t('u_w')}` : '—'}</td><td>${r.cost ? `${fmt(r.cost)} ${t('u_m')}` : '—'}</td></tr>`).join('')}
        </tbody><tfoot><tr><td>${t('mel_total')}</td><td>${fmt(d.mass)} ${t('u_kg')}</td><td>${fmt(d.powerUse)} ${t('u_w')}</td><td>${fmt(d.totalCost)} ${t('u_m')}</td></tr></tfoot></table>
        <p class="rv-note">${t('mel_margin', { p: pct(Math.max(0, 1 - d.margin)), x: fmt(d.reserve) })}</p>
        <p class="rv-note">${t('launch_odds', { p: pct(1 - d.failChance) })}${sep()}${t('test_risk', { p: pct(d.faultChance) })}${sep()}${t('eng_disposal', { y: fmt(d.disposal) })}</p>`;
    }
    if (tab === 'real') return realMissionsHtml(d);
    const instNames = d.insts.length ? d.insts.map((x) => t('i_' + x.id)).join(' + ') : t('i_none');
    const seg = (cls, title, lines) => `<div class="seg ${cls}"><h4>${t(title)}</h4>${lines.map((x) => `<div>${esc(x)}</div>`).join('')}</div>`;
    return `<p class="rv-note">${t('seg_note')}</p><div class="segs">
      ${seg('launch', 'seg_launch', [t('rocket_' + d.rocket.id), t('rk_from'), t(d.test.id)])}
      ${seg('space', 'seg_space', [`${t('o_' + d.orb.id)} (${t('o_alt', { km: fmt(d.orb.alt) })})`, instNames, t(d.pwr.id), t(d.com.id), t(d.eom.id)])}
      ${seg('ground', 'seg_ground', [t(d.ground.id), t('seg_mc')])}
      ${seg('user', 'seg_user', [t('user_' + m.id)])}
    </div>`;
  }

  function render() {
    const okCount = reqs.filter((r) => r.ok).length;
    el.className = 'glass modal brackets info review';
    el.innerHTML = `<div class="rv-head"><div><div class="eyebrow">${t('m_' + m.id)}</div><h2>${t('rv_title')}</h2></div>
        <button type="button" class="x" id="rv-close" aria-label="${t('close')}">✕</button></div>
      <nav class="rv-tabs">${[['req', `${t('rv_tab_req')} ${fmt(okCount)}/${fmt(reqs.length)}`], ['trade', t('rv_tab_trade')], ['mel', t('rv_tab_mel')], ['seg', t('rv_tab_seg')], ['real', t('rv_tab_real')]]
    .map(([id, label]) => `<button type="button" data-tab="${id}" class="${tab === id ? 'on' : ''}">${label}</button>`).join('')}</nav>
      <div class="rv-body">${body()}</div>`;
    el.querySelector('#rv-close').onclick = () => { sound?.('click'); close(); };
    el.querySelectorAll('.rv-tabs button').forEach((b) => { b.onclick = () => { sound?.('click'); tab = b.dataset.tab; render(); }; });
    redraw();
  }
  layer.hidden = false;
  render();
  addEventListener('resize', redraw);
  return close;
}
