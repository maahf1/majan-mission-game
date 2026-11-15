// Majan Mission: screens, UI and the game loop. Rules v3 follow NASA's challenge resources:
// four mission segments, requirements and a design review, design maturity (CML), a trade
// study, tests before launch, end-of-mission disposal, and a mission timeline in orbit.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FX } from './fx.js';
import { Hangar } from './hangar.js';
import { LaunchScene } from './launch.js';
import { OrbitScene } from './orbit.js';
import {
  MISSIONS, RANKS, ORBITS, INSTRUMENTS, POWER, COMMS, GROUND, EOM, TESTS, ROCKETS, ROLES, rolesFor, EVENT_ROLE,
  DEFAULT_DESIGN, DESIGN_KEYS, NO_INSTRUMENT, SPECTRUM, DISPOSAL_LIMIT, computeDesign, disposalYears, fromLegacy,
  requirements, maturity, SOURCES, instrumentFit } from './rules.js';
import { forecast, COMMISSION_H } from './missionsim.js';
import { t, fmt, pct, sep, getLang, setLang, startLang, extendText } from './i18n.js';
import './text2.js';
import { NASA_RESOURCES } from './text3.js';
import { openReview, cmlLadder } from './review.js';
import { board } from './board.js';
import { quiz } from './quiz.js';
import { imageSources, setCloudCover } from './nasa.js';
import './text4.js';
import { twinLine } from './realmissions.js';
import { openReport } from './report.js';
import { sfx, setMuted, unlockAudio } from './audio.js';
import { profile } from './progress.js';

const $ = (s) => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const forcedLaunch = qs.get('launch'); // ?launch=ok|fail for demos
// Opened from the Space Center simulator: ?center=1&mission=aflaj&d=1,1,1
// From the Space Center: the full design (orbit, inst1, inst2, power, comms, rocket), or the first version's d=camera,power,comms
if (qs.get('embed') === '1') document.body.classList.add('embed');   // the mission console inside the Space Center (style-phone.css)
const CENTER = qs.get('center') ? { embed: qs.get('embed') === '1', mission: qs.get('mission'), design: (qs.get('d') || '0,0,0').split(',').map(Number), full: qs.get('inst1') ? Object.fromEntries(DESIGN_KEYS.map((k) => [k, qs.get(k) || DEFAULT_DESIGN[k]])) : null } : null;
extendText({ ar: { c_back: 'العودة إلى مركز الفضاء' }, en: { c_back: 'Back to the Space Center' } });

function backToCenterButton(container) {
  const row = container.querySelector('.btn-row');
  if (!row) return;
  // Keep the mission report and the quiz; the other buttons belong to the classic menu
  row.querySelectorAll('#r-retry, #r-next, #r-menu').forEach((b) => b.remove());
  row.insertAdjacentHTML('afterbegin', `<button id="r-center" class="primary" type="button">${t('c_back')}</button>`);
  row.querySelector('#r-center').addEventListener('click', () => {
    sfx.click();
    if (CENTER.embed) parent.postMessage({ type: 'majan-mission-done' }, location.origin);   // flown at the console inside the center
    else location.href = 'center.html';
  });
}

// ---------------------------------------------------------------------------
// Renderer, effects and the three 3D scenes
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const fx = new FX(renderer);
const hangar = new Hangar(renderer, env);
const launch = new LaunchScene(renderer, env);
const orbit = new OrbitScene(renderer);

// Design tabs, and the order of turns in team mode (the rocket comes last, once the mass is known)
const TABS = [
  { id: 'orbit', role: 'planner' },
  { id: 'inst', role: 'science' },
  { id: 'power', role: 'engineer' },
  { id: 'comms', role: 'comms' },
  { id: 'rocket', role: 'planner' },
];
const TURNS = ['orbit', 'inst', 'power', 'comms', 'rocket'];

const app = {
  screen: 'menu', view: 'hangar', mission: MISSIONS[0],
  design: { ...DEFAULT_DESIGN }, designs: {}, tab: 'orbit', slot: 'inst1',
  d: null, lastRes: null, fcStars: 0, startedAt: performance.now(),
  team: { players: 1, turn: 0 }, engineer: !!profile.get().engineer, quizAsked: false,
  tried: {}, cml: 1, cmlAtLaunch: 0, // designs explored per mission (for the trade study), and design maturity
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
const bdi = (s) => `<bdi>${s}</bdi>`;
const isSmall = () => innerWidth <= 860;
const isTeam = () => app.team.players > 1;
const inReview = () => !isTeam() || app.team.turn >= TURNS.length;
const roleIndex = (roleId) => ROLES.findIndex((r) => r.id === roleId);
const playerOf = (roleId) => rolesFor(app.team.players)[roleIndex(roleId)] + 1;
const roleLabel = (roleId) => t('role_' + roleId);
const playerLabel = (roleId) => t('player_n', { n: fmt(playerOf(roleId)) });
const tabRole = (tabId) => TABS.find((x) => x.id === tabId).role;
const tabLocked = (tabId) => isTeam() && !inReview() && TURNS[app.team.turn] !== tabId;
const instName = (id) => t('i_' + id);
const fitClass = (f) => (f >= 1.15 ? 'good' : f >= 0.9 ? 'ok' : 'poor');

function toast(text, cls = '') {
  const el = document.createElement('div');
  el.className = `toast glass ${cls}`;
  el.textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3300);
}

function meter(sel, fill, mark, state, value) {
  const m = $(sel);
  m.classList.remove('warn', 'bad');
  if (state) m.classList.add(state);
  m.querySelector('.fill').style.width = `${Math.max(0, Math.min(fill, 1)) * 100}%`;
  const mk = m.querySelector('.mark');
  if (mk) mk.style.insetInlineStart = `${Math.max(0, Math.min(mark, 1)) * 100}%`;
  m.querySelector('.val').textContent = value;
}

function applyStaticText() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $('#btn-lang').textContent = t('lang');
  $('#btn-sound').textContent = profile.get().sound ? t('sound_on') : t('sound_off');
  $('#btn-eng').classList.toggle('on', app.engineer);
}

function renderRail() {
  const p = profile.get();
  const i = profile.rankIndex();
  const rank = RANKS[i];
  const next = RANKS[i + 1];
  $('#rank-name').textContent = t('rank_' + rank.id);
  $('#xp-fill').style.width = `${next ? ((p.xp - rank.xp) / (next.xp - rank.xp)) * 100 : 100}%`;
  $('#stars-total').textContent = fmt(profile.totalStars());
  const order = ['build', 'launch', 'orbit'];
  const cur = { build: 0, flight: 1, orbit: 2, results: 3 }[app.screen] ?? -1;
  document.querySelectorAll('#steps span').forEach((s) => {
    const k = order.indexOf(s.dataset.step);
    s.classList.toggle('on', k === cur);
    s.classList.toggle('done', k < cur);
  });
}

function applyShift() {
  // On the menu, move the satellite away from the title
  const shift = app.screen === 'menu' && !isSmall() ? (getLang() === 'ar' ? -0.2 : 0.2) : 0;
  const phoneBuild = isSmall() && app.screen === 'build';
  hangar.setShift(shift, phoneBuild ? 0.27 : 0, phoneBuild ? 0.62 : 1);
}

function show(screen) {
  app.screen = screen;
  for (const s of ['menu', 'build', 'flight', 'orbit', 'results']) {
    const el = $(`#screen-${s}`);
    el.hidden = s !== screen;
    if (s === screen) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
  }
  hangar.controls.enabled = app.view === 'hangar';
  $('#toasts').classList.toggle('low', screen === 'results');
  applyShift();
  renderRail();
}

// ---------------------------------------------------------------------------
// Learning check (quiz)
// ---------------------------------------------------------------------------
const quizSound = (k) => sfx[k]?.();
async function runQuiz(kind) {
  const layer = $('#quiz-layer');
  layer.hidden = false;
  const score = await quiz.run($('#quiz'), kind, { onSound: quizSound });
  layer.hidden = true;
  renderQuizStats();
  return score;
}

function renderQuizStats() {
  const el = $('#quiz-stats');
  const st = quiz.stats();
  const any = quiz.attempts().length > 0;
  el.hidden = !any;
  if (!any) return;
  el.innerHTML = `<span>${st ? t('quiz_stats', { n: fmt(st.n), a: fmt(st.pre, 1), b: fmt(st.post, 1) }) : ''}</span>
    <button type="button" class="chip-btn" id="qz-export">${t('quiz_export')}</button>
    <button type="button" class="chip-btn" id="qz-clear">${t('quiz_reset')}</button>`;
  $('#qz-export').onclick = () => {
    const blob = new Blob(['﻿' + quiz.csv()], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `majan-learning-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#qz-clear').onclick = () => { if (confirm(t('quiz_reset_q'))) { quiz.clear(); renderQuizStats(); } };
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
function renderPlayers() {
  const el = $('#players');
  el.innerHTML = `<span class="lbl">${t('players')}</span>` + [1, 2, 3, 4].map((n) =>
    `<button type="button" class="chip-btn ${app.team.players === n ? 'on' : ''}" data-n="${n}">${n === 1 ? t('solo') : t('team_n', { n: fmt(n) })}</button>`).join('');
  el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    unlockAudio();
    sfx.click();
    app.team.players = Number(b.dataset.n);
    renderPlayers();
  }));
}

function renderMenu() {
  renderPlayers();
  const list = $('#mission-list');
  list.innerHTML = '';
  MISSIONS.forEach((m, i) => {
    const p = profile.get();
    const unlocked = profile.unlocked(m);
    const best = p.best[m.id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mission glass brackets' + (unlocked ? '' : ' locked');
    b.innerHTML = `
      <div class="top"><span class="num">0${i + 1}</span><span class="diff">${t('diff_' + m.id)}</span></div>
      <h3>${t('m_' + m.id)}</h3>
      <p>${t('m_' + m.id + '_goal')}</p>
      <div class="mmeta">${t('m_meta', { b: fmt(m.budget), y: fmt(m.years) })}</div>
      <div class="meta">${unlocked
        ? `<span class="stars">${starStr(p.stars[m.id] || 0)}</span><span class="best">${best ? `${t('best')} ${fmt(best)}` : ''}</span>`
        : `<span class="lock">🔒 ${t('locked', { n: fmt(m.unlock) })}</span>`}</div>`;
    b.addEventListener('click', async () => {
      unlockAudio();
      if (!unlocked) { sfx.error(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
      sfx.select();
      if (!app.quizAsked && !quiz.current) {
        app.quizAsked = true;
        await runQuiz('pre');
      }
      openBuild(m);
    });
    list.appendChild(b);
  });
  renderQuizStats();
}

function goMenu() {
  app.view = 'hangar';
  orbit.stop();
  show('menu');
  renderMenu();
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
function openBuild(m) {
  app.mission = m;
  app.design = { ...DEFAULT_DESIGN, ...(app.designs[m.id] || {}) };
  app.view = 'hangar';
  app.team.turn = 0;
  app.tab = isTeam() ? TURNS[0] : 'orbit';
  app.slot = 'inst1';
  orbit.stop();
  hangar.setDesign(app.design, false);
  app.fcStars = 0;
  showStatus(false);
  show('build');
  renderBuild();
}

function choose(part, value) {
  unlockAudio();
  if (app.design[part] === value) return;
  app.design[part] = value;
  app.designs[app.mission.id] = { ...app.design };
  hangar.setDesign(app.design);
  sfx.snap();
  renderBuild();
}

function card({ sel, disabled, title, sub, extra, stats, badge, why, onClick }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'opt' + (sel ? ' sel' : '') + (disabled ? ' dis' : '');
  b.innerHTML = `<span class="name">${title}</span>${sub ? `<span class="sub">${sub}</span>` : ''}${extra || ''}
    ${stats ? `<span class="stats">${stats}</span>` : ''}${badge || ''}${why ? `<span class="why">${why}</span>` : ''}`;
  b.addEventListener('click', () => {
    if (tabLocked(app.tab)) { lockedShake(b); return; }
    if (disabled) { sfx.error(); return; }
    onClick();
  });
  return b;
}

function lockedShake(el) {
  sfx.error();
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  toast(t('turn_locked', { role: roleLabel(tabRole(app.tab)) }));
}

function choiceSummary(tabId, d) {
  if (tabId === 'orbit') return t('o_alt', { km: fmt(d.orb.alt) });
  if (tabId === 'inst') return d.insts.length ? d.insts.map((x) => instName(x.id)).join(' + ') : t('i_none');
  if (tabId === 'power') return t(d.pwr.id);
  if (tabId === 'comms') return t(d.com.id);
  return t('rocket_' + d.rocket.id);
}

function renderBuild() {
  const m = app.mission;
  const d = computeDesign(app.design, m);
  $('#build-mission').textContent = `${String(MISSIONS.indexOf(m) + 1).padStart(2, '0')} · ${t('m_' + m.id)}`;
  $('#build-goal').textContent = t('m_' + m.id + '_goal');
  $('#build-meta').textContent = t('m_meta', { b: fmt(m.budget), y: fmt(m.years) });

  // Team turn bar
  const bar = $('#turnbar');
  bar.hidden = !isTeam();
  if (isTeam()) {
    const dots = TURNS.map((tab, k) => {
      const role = tabRole(tab);
      const cls = k < app.team.turn ? 'done' : k === app.team.turn ? 'now' : '';
      return `<i class="${cls}" style="--c:${ROLES[roleIndex(role)].color}"></i>`;
    }).join('');
    const now = inReview() ? t('turn_review') : t('turn_now', { role: roleLabel(tabRole(TURNS[app.team.turn])), p: playerLabel(tabRole(TURNS[app.team.turn])) });
    bar.innerHTML = `<div class="dots">${dots}</div><div class="now">${now}</div>`;
  }

  // Tabs
  const tabs = $('#tabs');
  tabs.innerHTML = '';
  for (const tab of TABS) {
    const b = document.createElement('button');
    b.type = 'button';
    const locked = tabLocked(tab.id);
    b.className = 'tab' + (app.tab === tab.id ? ' on' : '') + (locked ? ' locked' : '');
    if (isTeam()) b.style.setProperty('--c', ROLES[roleIndex(tab.role)].color);
    b.innerHTML = `<span class="t">${t('tab_' + tab.id)}</span><span class="s">${choiceSummary(tab.id, d)}</span>`;
    b.addEventListener('click', () => { sfx.click(); app.tab = tab.id; renderBuild(); });
    tabs.appendChild(b);
  }

  // The active tab's choices
  const box = $('#slots');
  box.innerHTML = '';
  if (tabLocked(app.tab)) {
    const note = document.createElement('div');
    note.className = 'locknote';
    note.textContent = t('turn_locked', { role: `${roleLabel(tabRole(app.tab))} (${playerLabel(tabRole(app.tab))})` });
    box.appendChild(note);
  }
  let opts = document.createElement('div');
  opts.className = 'opts';
  box.appendChild(opts);
  const money = (x) => `${fmt(x)} ${t('u_m')}`;
  const kg = (x) => `${fmt(x)} ${t('u_kg')}`;
  // A second group of choices in the same tab, under its own heading
  const section = (titleKey, noteKey) => {
    const h = document.createElement('h4');
    h.className = 'sechead';
    h.textContent = t(titleKey);
    box.appendChild(h);
    if (noteKey) {
      const n = document.createElement('div');
      n.className = 'secnote';
      n.textContent = t(noteKey);
      box.appendChild(n);
    }
    opts = document.createElement('div');
    opts.className = 'opts';
    box.appendChild(opts);
  };

  if (app.tab === 'orbit') {
    for (const o of ORBITS) {
      opts.appendChild(card({
        sel: app.design.orbit === o.id, title: t('o_' + o.id),
        sub: [t('o_alt', { km: fmt(o.alt) }), t('o_period', { m: fmt(Math.round(o.periodH * 60)) }), t('o_sunlit', { p: pct(o.sun) }), t('o_life', { y: fmt(o.lifeY) })].map(bdi).join(sep()),
        why: t('o_' + o.id + '_d'), onClick: () => choose('orbit', o.id),
      }));
    }
    // End of mission: how the satellite leaves orbit afterwards (the 25-year rule)
    section('sec_eom', 'eom_rule');
    for (const e of EOM) {
      const y = disposalYears(d.orb, e);
      const ok = y <= DISPOSAL_LIMIT;
      opts.appendChild(card({
        sel: app.design.eom === e.id, title: t(e.id),
        stats: e.cost ? [money(e.cost), kg(e.mass)].map(bdi).join(sep()) : '',
        badge: `<span class="fit ${ok ? 'good' : 'poor'}">${t(ok ? 'eom_ok' : 'eom_bad', { y: fmt(y) })}</span>`,
        why: t(e.id + '_d'), onClick: () => choose('eom', e.id),
      }));
    }
  } else if (app.tab === 'inst') {
    const need = document.createElement('div');
    need.className = 'secnote need';
    need.textContent = t('need_' + m.id);
    box.insertBefore(need, opts);
    const slots = document.createElement('div');
    slots.className = 'slotpick';
    for (const s of ['inst1', 'inst2']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn' + (app.slot === s ? ' on' : '');
      b.innerHTML = `${t(s === 'inst1' ? 'slot_a' : 'slot_b')}: <b>${instName(app.design[s])}</b>`;
      b.addEventListener('click', () => { sfx.click(); app.slot = s; renderBuild(); });
      slots.appendChild(b);
    }
    box.insertBefore(slots, opts);
    const other = app.design[app.slot === 'inst1' ? 'inst2' : 'inst1'];
    for (const ins of [{ id: NO_INSTRUMENT }, ...INSTRUMENTS]) {
      const none = ins.id === NO_INSTRUMENT;
      const f = none ? 0 : instrumentFit(m, ins.id);
      opts.appendChild(card({
        sel: app.design[app.slot] === ins.id, disabled: !none && other === ins.id,
        title: instName(ins.id), sub: t('i_' + ins.id + '_r'),
        extra: none ? '' : `<span class="spec" title="${SPECTRUM.map((x) => t('spec_' + x.id)).join(' · ')}"><i style="left:${ins.band[0] * 100}%;width:${(ins.band[1] - ins.band[0]) * 100}%"></i></span><span class="bandname">${t('i_' + ins.id + '_b')}</span>`,
        stats: none ? '' : [money(ins.cost), kg(ins.mass), `−${fmt(ins.power)} ${t('u_w')}`, `${fmt(ins.data, 1)} ${t('u_data')}`].map(bdi).join(sep()),
        badge: none ? '' : `<span class="fit ${fitClass(f)}">${t('fit_' + fitClass(f))}</span>${ins.night ? `<span class="fit night">☾ ${t('i_night')}</span>` : ''}`,
        why: none ? '' : t(`why_${m.id}_${ins.id}`),
        onClick: () => choose(app.slot, ins.id),
      }));
    }
  } else if (app.tab === 'power') {
    const h = document.createElement('h4');
    h.className = 'sechead first';
    h.textContent = t('sec_power');
    box.insertBefore(h, opts);
    for (const p of POWER) {
      opts.appendChild(card({
        sel: app.design.power === p.id, title: t(p.id),
        stats: [money(p.cost), kg(p.mass), `+${fmt(p.gen)} ${t('u_w')}`, `${fmt(p.battery)} Wh`].map(bdi).join(sep()),
        onClick: () => choose('power', p.id),
      }));
    }
    // Test campaign before launch: money now, or a risk in orbit
    section('sec_test');
    for (const x of TESTS) {
      opts.appendChild(card({
        sel: app.design.test === x.id, title: t(x.id),
        stats: x.cost ? bdi(money(x.cost)) : '',
        badge: `<span class="fit ${x.fault <= 0.05 ? 'good' : x.fault <= 0.15 ? 'ok' : 'poor'}">${t('test_risk', { p: pct(x.fault) })}</span>`,
        why: t(x.id + '_d'), onClick: () => choose('test', x.id),
      }));
    }
  } else if (app.tab === 'comms') {
    const h = document.createElement('h4');
    h.className = 'sechead first';
    h.textContent = t('sec_antenna');
    box.insertBefore(h, opts);
    for (const c of COMMS) {
      opts.appendChild(card({
        sel: app.design.comms === c.id, title: t(c.id),
        stats: [money(c.cost), kg(c.mass), `${fmt(c.downlink, 1)} ${t('u_link')}`, `−${fmt(c.power)} ${t('u_w')}`].map(bdi).join(sep()),
        onClick: () => choose('comms', c.id),
      }));
    }
    // Ground segment: who listens when the satellite talks
    section('sec_ground');
    for (const gs of GROUND) {
      const f = gs.f[d.orb.id];
      const useless = gs.id !== 'g1' && f <= 1;
      opts.appendChild(card({
        sel: app.design.ground === gs.id, title: t(gs.id),
        stats: gs.cost ? bdi(money(gs.cost)) : '',
        badge: gs.id === 'g1' ? '' : `<span class="fit ${useless ? 'poor' : 'good'}">${useless ? t('g_nohelp') : t('g_factor', { x: fmt(f, 1) })}</span><span class="fit ok">${t('g_backup')}</span>`,
        why: t(gs.id + '_d'), onClick: () => choose('ground', gs.id),
      }));
    }
  } else if (app.tab === 'rocket') {
    const from = document.createElement('div');
    from.className = 'from';
    from.textContent = t('rk_from');
    box.insertBefore(from, opts);
    for (const r of ROCKETS) {
      const cap = Math.round(r.cap * d.orb.capF);
      const heavy = d.mass > cap;
      opts.appendChild(card({
        sel: app.design.rocket === r.id, title: t('rocket_' + r.id),
        stats: [money(r.cost), t('rk_cap', { kg: fmt(cap) }), t('rk_rel', { p: pct(r.rel) })].map(bdi).join(sep()),
        badge: heavy ? `<span class="fit poor">${t('rk_too_heavy', { kg: fmt(d.mass) })}</span>` : '',
        onClick: () => choose('rocket', r.id),
      }));
    }
  }

  // Team: hand over to the next role
  const tb = $('#btn-turn');
  tb.hidden = !isTeam() || inReview();
  if (!tb.hidden) {
    const next = TURNS[app.team.turn + 1];
    tb.textContent = next ? t('turn_done', { role: `${roleLabel(tabRole(next))} (${playerLabel(tabRole(next))})` }) : t('turn_finish');
  }
  renderTelemetry(d);
}

$('#btn-turn').addEventListener('click', () => {
  sfx.select();
  app.team.turn++;
  app.tab = inReview() ? app.tab : TURNS[app.team.turn];
  renderBuild();
});

function renderTelemetry(d = computeDesign(app.design, app.mission)) {
  const m = app.mission;
  const f = forecast(d, m);
  const noInst = d.insts.length === 0;

  // Requirements check, the designs explored so far, and design maturity (CML 1-4)
  const reqs = requirements(d, f, m);
  const feasible = !noInst && reqs.filter((r) => r.hard).every((r) => r.ok) && f.alive;
  const tried = (app.tried[m.id] ||= new Map());
  // arch = the big choices (orbit and instruments): comparing those is what counts as a trade study
  if (!noInst) tried.set(DESIGN_KEYS.map((k) => app.design[k]).join('|'), { cost: d.totalCost, value: f.value, feasible, arch: [app.design.orbit, ...[app.design.inst1, app.design.inst2].sort()].join('|') });
  const compared = new Set([...tried.values()].filter((x) => x.feasible).map((x) => x.arch)).size;
  app.cml = noInst ? 1 : maturity(reqs, compared);
  const okCount = reqs.filter((r) => r.ok).length;
  $('#btn-review').textContent = `${t('review_btn')} · ${t('req_count', { a: fmt(okCount), b: fmt(reqs.length) })}`;
  $('#btn-review').classList.toggle('on', okCount === reqs.length);
  $('#cml').innerHTML = `<span class="cml-row">${cmlLadder(app.cml)}</span>
    <span class="cml-next">${t('cml_next_' + app.cml, { n: fmt(compared) })}</span>`;

  meter('#m-budget', d.totalCost / (m.budget * 1.25), 0.8, d.overBudget ? 'bad' : d.totalCost > m.budget * 0.92 ? 'warn' : null,
    `${fmt(d.totalCost)} / ${fmt(m.budget)} ${t('million')}`);
  meter('#m-power', d.avgUse / 450, d.avgGen / 450, !f.alive ? 'bad' : d.avgUse > d.avgGen ? 'warn' : null,
    t('bar_power_v', { use: fmt(Math.round(d.avgUse)), avg: fmt(d.avgGen) }));
  meter('#m-mass', d.mass / (d.capacity * 1.25), 0.8, d.tooHeavy ? 'bad' : d.margin > 0.85 ? 'warn' : null,
    t('bar_mass_v', { m: fmt(d.mass), c: fmt(d.capacity) }));
  meter('#m-data', d.capture / 16, d.downlink / 16, d.capture > d.downlink ? 'warn' : null,
    t('bar_data_v', { c: fmt(d.capture, 1), s: fmt(d.downlink, 1) }));
  meter('#m-fit', d.fit / 1.5, 0.6, noInst || d.fit < 0.9 ? 'warn' : null, noInst ? t('i_none') : t('fit_' + fitClass(d.fit)));
  meter('#m-life', d.lifeYears / (m.years * 2), 0.5, d.lifeYears < m.years ? 'bad' : null,
    t('bar_life_v', { y: fmt(d.lifeYears), n: fmt(m.years) }));

  // Engineer view: the formulas behind the numbers
  const eng = $('#eng');
  eng.hidden = !app.engineer;
  if (app.engineer) {
    eng.innerHTML = [
      t('eng_power', { gen: fmt(d.powerGen), sun: fmt(d.orb.sun, 2), avg: fmt(d.avgGen) }),
      t('eng_shadow', { sh: fmt(Math.round(d.orb.periodH * (1 - d.orb.sun) * 60)), use: fmt(d.shadowUse), d: pct(Math.min(d.depth, 1)) }),
      t('eng_capture', { day: fmt(d.captureDay, 1), sun: fmt(d.orb.sun, 2), night: fmt(d.captureNight, 1), c: fmt(d.capture, 1) }),
      t('eng_link', { a: fmt(d.com.downlink, 1), o: fmt(d.orb.link, 2), g: fmt(d.ground.f[d.orb.id], 1), s: fmt(d.downlink, 1) }),
      t('eng_data', { c: fmt(d.capture, 1), s: fmt(d.downlink, 1) }),
      t('eng_mass', { m: fmt(d.mass), c: fmt(d.capacity), p: pct(d.margin), f: pct(d.failChance) }),
      t('eng_life', { o: fmt(d.orbitYears), b: fmt(d.batYears) }),
      t('eng_disposal', { y: fmt(d.disposal) }),
    ].map((x) => `<div>${x}</div>`).join('') + `<div class="src">${t('sources')}: ${SOURCES.join(' · ')}</div>`;
  }

  $('#fc-stars').innerHTML = [0, 1, 2].map((k) => `<span class="${k < f.stars ? '' : 'off'}">★</span>`).join('');
  $('#fc-cov').textContent = pct(f.coverage);
  $('#fc-odds').textContent = `${t('launch_odds', { p: pct(1 - d.failChance) })}${sep()}${t('fault_odds', { p: pct(d.faultChance) })}`;
  if (f.stars > app.fcStars && app.fcStars > 0) sfx.star(f.stars - 1);
  app.fcStars = f.stars;

  const tip = $('#tip');
  let text;
  let cls = 'bad';
  if (noInst) text = t('tip_none');
  else if (d.overBudget) text = t('tip_over', { x: fmt(d.totalCost - m.budget) });
  else if (d.tooHeavy) text = t('tip_heavy');
  else if (!d.compliant) text = t('tip_deorbit', { y: fmt(d.disposal) });
  else if (!f.alive) text = t('tip_power', { h: fmt(Math.round(f.deadAt)) });
  else if (d.lifeYears < m.years) text = d.lifeLimit === 'orbit' ? t('tip_life_orbit', { n: fmt(m.years) }) : t('tip_life_battery', { y: fmt(d.batYears) });
  else if (d.fit < 0.9) { text = t('tip_fit'); cls = 'warn'; }
  else if (d.capture > d.downlink && f.coverage < 0.9) { text = t('tip_link'); cls = 'warn'; }
  else if (f.coverage < 0.9) { text = t('tip_cam'); cls = 'warn'; }
  else if (d.margin > 0.85) { text = t('tip_margin', { p: pct(d.margin) }); cls = 'warn'; }
  else { text = t('tip_good'); cls = ''; }
  if (isTeam() && !inReview() && cls !== 'bad') { text = t('turn_wait'); cls = 'warn'; }
  tip.textContent = text;
  tip.className = 'tip ' + cls;
  $('#btn-launch').disabled = !d.canLaunch || noInst || !inReview();
  $('#mb-stars').textContent = '★'.repeat(f.stars) + '☆'.repeat(3 - f.stars);
  $('#mb-status').dataset.state = cls;
  $('#mb-launch').disabled = $('#btn-launch').disabled;
}

// Phones: one panel at a time, Design or Status
function showStatus(on) {
  $('#screen-build').classList.toggle('show-status', on);
  $('#mb-design').classList.toggle('on', !on);
  $('#mb-status').classList.toggle('on', on);
}
$('#mb-design').addEventListener('click', () => { sfx.click(); showStatus(false); });
$('#mb-status').addEventListener('click', () => { sfx.click(); showStatus(true); });
$('#mb-launch').addEventListener('click', () => $('#btn-launch').click());

$('#btn-to-menu').addEventListener('click', () => { sfx.click(); goMenu(); });

// Design review: requirements, trade study, equipment list, the four segments
function review(tab) {
  sfx.select();
  openReview({
    layer: $('#info-layer'), el: $('#info'), mission: app.mission, design: app.design,
    tried: app.tried[app.mission.id] || new Map(), cml: app.cml, sound: (k) => sfx[k]?.(), tab,
  });
}
$('#btn-review').addEventListener('click', () => review('req'));
$('#cml').addEventListener('click', () => review(app.cml === 2 ? 'trade' : 'req'));
$('#info-layer').addEventListener('click', (e) => { if (e.target === $('#info-layer')) closeInfo(); });
function closeInfo() { $('#info-layer').hidden = true; $('#info').innerHTML = ''; }
function openInfo(html, cls = '') {
  const el = $('#info');
  el.className = 'glass modal brackets info ' + cls;
  el.innerHTML = html;
  $('#info-layer').hidden = false;
  el.querySelector('#info-close')?.addEventListener('click', () => { sfx.click(); closeInfo(); });
}
const infoHead = (title) => `<div class="rv-head"><h2>${title}</h2><button type="button" class="x" id="info-close" aria-label="${t('close')}">✕</button></div>`;

// Leaderboard on this device
function showBoard() {
  sfx.select();
  const any = board.all().length > 0;
  const cols = MISSIONS.map((m) => {
    const rows = board.top(m.id, 5);
    return `<div class="lb-col"><h4>${t('m_' + m.id)}</h4>${rows.length ? `<ol>${rows.map((r) => `<li><b>${r.name.replace(/[<&>]/g, '')}</b>
      <span class="lb-stars">${'★'.repeat(r.stars)}</span><span class="lb-score">${fmt(r.score)}</span>
      <small>${r.players > 1 ? t('lb_team', { n: fmt(r.players) }) + sep() : ''}${(r.summary || []).map((x) => t(x)).join(sep())}</small></li>`).join('')}</ol>` : '<p class="rv-note">—</p>'}</div>`;
  }).join('');
  openInfo(`${infoHead(t('lb_title'))}${any ? `<div class="lb-cols">${cols}</div><button type="button" class="chip-btn" id="lb-clear">${t('lb_clear')}</button>` : `<p class="rv-note">${t('lb_empty')}</p>`}`, 'wide');
  $('#lb-clear')?.addEventListener('click', () => { if (confirm(t('lb_clear_q'))) { board.clear(); showBoard(); } });
}
$('#btn-board').addEventListener('click', showBoard);
// How to play: the whole loop in five steps, plus team roles and what the stars mean
function showHow() {
  sfx.click();
  const steps = [1, 2, 3, 4, 5].map((n) => `<li><b>${fmt(n)}</b><div><strong>${t('how_' + n + '_t')}</strong><span>${t('how_' + n)}</span></div></li>`).join('');
  openInfo(`${infoHead(t('how_title'))}<ol class="how">${steps}</ol><p class="rv-note">${t('how_team')}</p><p class="rv-note">${t('how_stars')}</p>`, 'wide');
  try { localStorage.setItem('majan-how-seen', '1'); } catch { /* private window */ }
  $('#btn-how').classList.remove('pulse');
}
$('#btn-how').addEventListener('click', showHow);
try { if (!localStorage.getItem('majan-how-seen')) $('#btn-how').classList.add('pulse'); } catch { /* private window */ }
// About: the team, NASA data and resources, tools, and where AI was used
$('#btn-about').addEventListener('click', () => {
  sfx.click();
  openInfo(`${infoHead(t('ab_title'))}<p class="rv-note">${t('ab_team')}</p>
    <h4 class="rm-h">${t('ab_data_t')}</h4><ul class="ab-list">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<li>${t('ab_d' + n)}</li>`).join('')}</ul>
    <h4 class="rm-h">${t('ab_tools_t')}</h4><p class="rv-note">${t('ab_tools')}</p>
    <h4 class="rm-h">${t('ab_ai_t')}</h4><p class="rv-note">${t('ab_ai')}</p>`, 'wide');
});

// Where each of NASA's challenge resources shows up in the game
$('#btn-nasa').addEventListener('click', () => {
  sfx.select();
  openInfo(`${infoHead(t('nr_title'))}<p class="rv-note">${t('nr_intro')}</p>
    <ol class="nr">${NASA_RESOURCES.map((name, i) => `<li><b>${name}</b><span>${t('nr_' + (i + 1))}</span></li>`).join('')}</ol>
    <p class="rv-note">${t('nr_data')}</p><p class="rv-note">${t('sources')}: ${SOURCES.join(' · ')}</p>`, 'wide');
});
$('#btn-eng').addEventListener('click', () => {
  sfx.click();
  app.engineer = !app.engineer;
  profile.set('engineer', app.engineer);
  applyStaticText();
  if (app.screen === 'build') renderTelemetry();
});

// ---------------------------------------------------------------------------
// Launch
// ---------------------------------------------------------------------------
$('#btn-launch').addEventListener('click', async () => {
  const m = app.mission;
  const d = computeDesign(app.design, m);
  if (!d.canLaunch || !d.insts.length) { sfx.error(); return; }
  unlockAudio();
  sfx.select();
  let success = Math.random() >= d.failChance;
  if (forcedLaunch === 'ok') success = true;
  if (forcedLaunch === 'fail') success = false;
  app.d = d;
  app.cmlAtLaunch = CENTER ? 0 : app.cml;
  // From the Space Center the liftoff was already watched in first person: go straight to orbit
  if (CENTER?.embed) { setTimeout(success ? startOrbit : showLaunchFail, 350); return; }
  await launch.ready;
  app.view = 'launch';
  show('flight');
  const ft = $('#flight-text');
  ft.textContent = '';
  let stopRumble = null;
  launch.start(d.rocket.id, success, (key) => {
    let text;
    let cls = '';
    if (key.startsWith('count')) { text = fmt(Number(key.slice(5))); cls = 'big'; sfx.beep(); }
    else { text = t('st_' + key); cls = key === 'fail' ? 'bad' : key === 'orbit' ? 'good' : ''; }
    if (key === 'liftoff') { sfx.go(); stopRumble = sfx.rumble(11); }
    if (key === 'boosters' || key === 'stage' || key === 'fairing') sfx.thud();
    if (key === 'fail') { stopRumble?.(); sfx.boom(); }
    if (key === 'orbit') { stopRumble?.(); sfx.good(); }
    ft.className = '';
    void ft.offsetWidth;
    ft.textContent = text;
    ft.className = `${cls} pop`;
  }, (ok) => {
    stopRumble?.();
    if (ok) setTimeout(startOrbit, 700);
    else setTimeout(showLaunchFail, 900);
  });
});

function showLaunchFail() {
  const d = app.d;
  profile.set('lastFailed', true);
  const msg = d.margin > 0.85
    ? t('msg_fail_margin', { p: pct(d.margin), rocket: t('rocket_the_' + d.rocket.id) })
    : t('msg_fail_luck');
  app.lastRes = null;
  $('#results').innerHTML = `
    <div class="eyebrow">${t('m_' + app.mission.id)}</div>
    <h2 style="color:var(--bad)">${t('fail_title')}</h2>
    <ul class="findings"><li class="bad">${msg}</li></ul>
    <div class="btn-row"><button id="r-retry" class="primary" type="button">${t('btn_retry')}</button><button id="r-menu" type="button">${t('btn_menu')}</button></div>`;
  $('#r-retry').addEventListener('click', () => { sfx.click(); openBuild(app.mission); });
  $('#r-menu').addEventListener('click', () => { sfx.click(); goMenu(); });
  if (CENTER) {
    try { localStorage.setItem('majan-center-result', JSON.stringify({ mission: app.mission.id, ok: false, stars: 0, score: 0 })); } catch { /* ignore */ }
    backToCenterButton($('#results'));
  }
  sfx.bad();
  show('results');
}

// ---------------------------------------------------------------------------
// Orbit
// ---------------------------------------------------------------------------
function startOrbit() {
  const copy = hangar.model.clone(true);
  copy.traverse((o) => { if (o !== copy && o.userData.base) o.scale.copy(o.userData.base); });
  copy.position.set(0, 0, 0);
  copy.rotation.set(0, 0, 0);
  app.view = 'orbit';
  show('orbit');
  $('#event').hidden = true;
  $('#hud-mission').textContent = t('m_' + app.mission.id);
  orbit.start(app.d, app.mission, copy, {
    onEvent: showEvent,
    onDone: (res) => setTimeout(() => finishMission(res), 1200),
  });
  buildTimeline();
  renderHud();
}

// Mission timeline (concept of operations): commissioning, operations, end of mission,
// with a marker for every event as it happens
const EVENT_ICON = { fault: '⚡', storm: '☀', units: '⚙', station: '📡', debris: '☄' };
function buildTimeline() {
  const total = app.mission.hours;
  $('#timeline').innerHTML = `<div class="tl-track"><i class="tl-com" style="width:${(COMMISSION_H / total) * 100}%"></i><i class="tl-fill"></i><span class="tl-marks"></span><b class="tl-cursor"></b></div>
    <div class="tl-labels"><span class="now">${t('ph_commission')}</span><span>${t('ph_ops')}</span><span>${t('ph_end')}</span></div>`;
  $('#timeline').dataset.marks = '0';
}
function renderTimeline(s) {
  const el = $('#timeline');
  if (!el.firstChild) return;
  const total = app.mission.hours;
  const k = Math.min(1, s.hour / total);
  el.querySelector('.tl-fill').style.width = `${k * 100}%`;
  el.querySelector('.tl-cursor').style.left = `${k * 100}%`;
  const labels = el.querySelectorAll('.tl-labels span');
  const phase = s.done ? 2 : s.hour < COMMISSION_H ? 0 : 1;
  labels.forEach((x, i) => x.classList.toggle('now', i === phase));
  // Events reached so far (the one waiting for a decision included)
  const reached = s.events.filter((e) => s.hour >= e.hour - 1e-6).length;
  if (Number(el.dataset.marks) !== reached) {
    el.dataset.marks = String(reached);
    el.querySelector('.tl-marks').innerHTML = s.events.slice(0, reached).map((e) =>
      `<i style="left:${(e.hour / total) * 100}%" title="${t('ev_' + e.id + '_title')}">${EVENT_ICON[e.id] || '•'}</i>`).join('');
  }
}

let hudTimer = 0;
function renderHud() {
  const s = orbit.sim;
  if (!s) return;
  renderTimeline(s);
  $('#hud-hour').textContent = t('hud_hour', { h: fmt(Math.floor(s.hour)), total: fmt(app.mission.hours) });
  $('#hud-orbit').textContent = `${t('o_' + app.d.orb.id)} · ${t('o_alt', { km: fmt(app.d.orb.alt) })}`;
  meter('#h-battery', s.battery, 0, s.battery < 0.25 ? 'bad' : s.battery < 0.5 ? 'warn' : null, pct(s.battery));
  meter('#h-map', s.coverage, 0, null, pct(s.coverage));
  const pills = [];
  if (!s.alive) pills.push(`<span class="pill bad">${t('status_dead')}</span>`);
  else {
    pills.push(s.inSun ? `<span class="pill amber">☀ ${t('hud_sun')}</span>` : `<span class="pill">☾ ${t('hud_shadow')}</span>`);
    pills.push(s.hour < COMMISSION_H ? `<span class="pill">✓ ${t('status_commission')}</span>`
      : s.cameraOn ? `<span class="pill on">● ${t('status_imaging')}</span>`
      : s.nightRest ? `<span class="pill">☾ ${t('status_night')}</span>` : `<span class="pill">${t('status_camera_off')}</span>`);
    if (s.downlinkOn) pills.push(`<span class="pill amber">↓ ${t('status_sending')}</span>`);
  }
  $('#hud-status').innerHTML = pills.join('');
  $('#btn-speed').textContent = orbit.speed === 1 ? t('speed_fast') : t('speed_normal');
}

$('#btn-speed').addEventListener('click', () => { sfx.click(); orbit.speed = orbit.speed === 1 ? 4 : 1; renderHud(); });

function showEvent(e) {
  sfx.card();
  app.event = e;
  renderEvent();
  const el = $('#event');
  el.hidden = false;
  el.classList.remove('enter');
  void el.offsetWidth;
}

function renderEvent() {
  const e = app.event;
  if (!e) return;
  const role = EVENT_ROLE[e.id];
  const r = $('#ev-role');
  r.hidden = !isTeam();
  if (isTeam()) {
    r.textContent = t('ev_for', { role: roleLabel(role), p: playerLabel(role) });
    r.style.setProperty('--c', ROLES[roleIndex(role)].color);
  }
  const backup = e.id === 'station' && app.d.ground.backup; // another station takes the pass
  const thruster = e.id === 'debris' && app.d.eom.thruster;
  $('#ev-title').textContent = t(`ev_${e.id}_title`);
  $('#ev-text').textContent = backup ? t('ev_station_backup') : t(`ev_${e.id}_text`);
  $('#ev-real').textContent = t(`ev_${e.id}_real`);
  $('#ev-a').textContent = backup ? t('ev_ok') : thruster ? t('ev_debris_a_thr') : t(`ev_${e.id}_a`);
  $('#ev-b').hidden = backup;
  const canPay = e.id !== 'station' || orbit.sim.reserve >= 1;
  $('#ev-b').disabled = !canPay;
  $('#ev-b').textContent = canPay ? t(`ev_${e.id}_b`, { r: fmt(orbit.sim.reserve) }) : t('ev_station_b_none');
}

for (const [id, choice] of [['#ev-a', 'a'], ['#ev-b', 'b']]) {
  $(id).addEventListener('click', () => {
    const outcome = orbit.choose(choice);
    app.event = null;
    $('#event').hidden = true;
    const bad = /damaged|wrong|hit|waited|ignored/.test(outcome);
    bad ? sfx.bad() : sfx.good();
    toast(t('out_' + outcome), bad ? '' : 'badge');
    renderHud();
  });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------
function finishMission(res) {
  const m = app.mission;
  // A design that was matured before launch (compared, then verified) earns a bonus
  res.cml = app.cmlAtLaunch;
  res.cmlBonus = Math.max(0, res.cml - 1) * 40;
  res.score += res.cmlBonus;
  const rec = profile.record(m.id, res);
  const earned = [];
  const outs = res.decisions.map((x) => x.outcome);
  const check = (id, cond) => { if (cond && profile.addBadge(id)) earned.push(id); };
  check('first_orbit', true);
  check('perfect_map', res.coverage >= 0.999);
  check('penny', res.stars === 3 && res.reserve >= 3);
  check('shadow', res.alive && res.minBattery < 0.1);
  check('units_guard', outs.includes('units_checked'));
  check('storm_rider', outs.includes('storm_lucky'));
  check('heavy', app.d.rocket.id === 'heavy');
  check('comeback', res.stars === 3 && profile.get().lastFailed);
  check('team_player', isTeam() && res.stars === 3);
  check('long_life', res.lifeOk && res.lifeYears >= 10);
  profile.set('lastFailed', res.stars < 2);
  if (CENTER) {
    try { localStorage.setItem('majan-center-result', JSON.stringify({ mission: m.id, ok: true, stars: res.stars, score: res.score })); } catch { /* ignore */ }
  }
  app.lastRes = { res, rec, earned, d: app.d, players: app.team.players };
  renderResults(true);
  show('results');
  earned.forEach((b, i) => setTimeout(() => { sfx.badge(); toast(t('badge_new', { name: t('b_' + b) }), 'badge'); }, 1800 + i * 900));
  if (res.stars === 3 || (rec.newRecord && rec.prevBest > 0)) setTimeout(() => confetti(), 1300);
}

function fvars(v) {
  const out = { ...v };
  for (const k of ['h', 'use', 'gen', 'sent', 'captured']) if (k in out) out[k] = fmt(out[k]);
  for (const k of ['cov', 'b', 'cloud']) if (k in out) out[k] = pct(out[k]);
  for (const k of ['y', 'need']) if (k in out) out[k] = fmt(out[k], 1);
  return out;
}

function teamReport(res, d) {
  const ok = {
    planner: res.lifeOk && d.failChance < 0.12,
    engineer: res.alive && res.minBattery > 0.15,
    science: d.fit >= 1.0,
    comms: !res.findings.some((f) => f.key === 'res_antenna'),
  };
  return `<h3 class="sec">${t('team_title')}</h3><ul class="findings team">${ROLES.map((r) => `
    <li class="${ok[r.id] ? '' : 'bad'}" style="--c:${r.color}"><b>${roleLabel(r.id)}</b> <small>${playerLabel(r.id)}</small><br>${t(`team_${r.id}_${ok[r.id] ? 'ok' : 'bad'}`)}</li>`).join('')}</ul>`;
}

function nasaGallery(mission) {
  const imgs = imageSources(mission);
  if (!imgs.length) return '';
  return `<h3 class="sec">${t('img_title')}</h3>
    <div class="gallery">${imgs.map((s, i) => `
      <figure><img data-local="${s.local}" data-remote="${s.remote}" alt="${t(s.key)}" id="nasa-${i}">
      <figcaption>${t(s.key)} <span class="date">${s.date}</span></figcaption></figure>`).join('')}</div>
    <div class="credit-line">${t('img_credit')}</div>`;
}

function loadGallery() {
  // Saved copy first (works offline at the venue), then NASA GIBS
  document.querySelectorAll('.gallery img').forEach((img) => {
    img.onerror = () => {
      if (img.dataset.tried) {
        img.closest('figure').classList.add('missing');
        const g = img.closest('.gallery');
        if (g && [...g.querySelectorAll('figure')].every((f) => f.classList.contains('missing'))) g.outerHTML = `<p class="credit-line">${t('img_offline')}</p>`;
        return;
      }
      img.dataset.tried = '1';
      img.src = img.dataset.remote;
    };
    img.src = img.dataset.local;
  });
}

function renderResults(animate) {
  if (!app.lastRes) return;
  const { res, rec, d, players } = app.lastRes;
  const m = app.mission;
  const i = MISSIONS.indexOf(m);
  const next = MISSIONS[i + 1];
  const nextOpen = next && profile.unlocked(next);
  const rankI = profile.rankIndex();
  const rank = RANKS[rankI];
  const nextRank = RANKS[rankI + 1];
  const xp = profile.get().xp;
  const xpFrac = nextRank ? (xp - rank.xp) / (nextRank.xp - rank.xp) : 1;
  let close = '';
  if (res.stars < 3) {
    const target = res.stars === 1 ? 0.5 : 0.9;
    const gap = target - res.coverage;
    if (gap > 0 && gap <= 0.15) close = t('res_close', { p: pct(gap) });
  }
  const askQuiz = quiz.current && quiz.current.post == null;
  $('#results').innerHTML = `
    <div class="eyebrow">${t('m_' + m.id)}</div>
    <h2>${t('res_title')}</h2>
    <div class="big-stars" id="r-stars">${animate ? '☆☆☆' : `${'<b>★</b>'.repeat(res.stars)}${'☆'.repeat(3 - res.stars)}`}</div>
    ${rec.newRecord && rec.prevBest > 0 ? `<div class="record">${t('res_record')}</div>` : ''}
    <div class="score-row">
      <div><small>${t('res_score')}</small><strong id="r-score">${animate ? fmt(0) : fmt(res.score)}</strong></div>
      <div><small>${t('res_best')}</small><strong>${fmt(rec.best)}</strong></div>
    </div>
    ${close ? `<div class="close-call">${close}</div>` : ''}
    <div class="xp-line">
      <div style="display:flex;justify-content:space-between"><span>${t('rank_' + rank.id)}</span><span>${t('res_xp', { x: fmt(rec.xp) })}</span></div>
      <div class="xpbar"><i id="r-xp" style="width:${animate ? 0 : xpFrac * 100}%"></i></div>
      ${rec.rankUp ? `<div class="rankup">${t('res_rankup', { rank: t('rank_' + rank.id) })}</div>` : ''}
    </div>
    <ul class="findings">${res.findings.map((f) => `<li class="${f.bad ? 'bad' : ''}">${t(f.key, fvars(f.vars))}</li>`).join('')}
      ${res.cml ? `<li>${t('res_cml', { n: fmt(res.cml), x: fmt(res.cmlBonus) })}</li>` : ''}</ul>
    <p class="nasa-twin">${t('res_nasa', { name: twinLine(d) })}</p>
    <p class="nasa-twin users">${t('res_users', { who: t('user_' + m.id) })}</p>
    ${CENTER ? '' : `<div class="lb-row" id="lb-row">${app.lastRes.saved
      ? `<span class="lb-done">${t('lb_saved', { r: fmt(app.lastRes.saved.rank), n: fmt(app.lastRes.saved.total) })}</span>`
      : `<input id="lb-name" type="text" maxlength="24" placeholder="${t('lb_name')}" value="${(profile.get().name || '').replace(/"/g, '')}"><button id="lb-save" type="button">${t('lb_save')}</button>`}</div>`}
    ${players > 1 ? teamReport(res, d) : ''}
    ${nasaGallery(m.region || m.id)}
    <div class="btn-row">
      ${askQuiz ? `<button id="r-quiz" class="primary" type="button">${t('quiz_btn')}</button>` : ''}
      <button id="r-retry" class="${askQuiz ? '' : 'primary'}" type="button">${t('btn_retry')}</button>
      ${nextOpen ? `<button id="r-next" type="button">${t('btn_next')}</button>` : ''}
      <button id="r-report" type="button">${t('rep_btn')}</button>
      <button id="r-menu" type="button">${t('btn_menu')}</button>
    </div>`;
  loadGallery();
  $('#r-quiz')?.addEventListener('click', async () => {
    sfx.click();
    quiz.meta = { mission: m.id, players };
    await runQuiz('post');
    renderResults(false);
  });
  $('#lb-save')?.addEventListener('click', () => {
    const name = $('#lb-name').value.trim() || (players > 1 ? t('team_n', { n: fmt(players) }) : t('solo'));
    profile.set('name', name);
    app.lastRes.saved = board.add({
      name, mission: m.id, stars: res.stars, score: res.score, players,
      summary: ['o_' + d.orb.id, ...d.insts.map((x) => 'i_' + x.id), 'rocket_' + d.rocket.id],
    });
    sfx.good();
    renderResults(false);
  });
  $('#r-report').addEventListener('click', () => {
    sfx.click();
    openReport({ mission: m, res, d, players, cml: res.cml || app.cmlAtLaunch || 1, quiz: quiz.current, findingText: (f) => t(f.key, fvars(f.vars)), sound: (k) => sfx[k]?.() });
  });
  $('#r-retry').addEventListener('click', () => { sfx.click(); openBuild(m); });
  $('#r-next')?.addEventListener('click', () => { sfx.select(); openBuild(next); });
  $('#r-menu').addEventListener('click', () => { sfx.click(); goMenu(); });
  if (CENTER) backToCenterButton($('#results'));
  renderRail();
  if (!animate) return;

  // Stars pop in one by one, then the score counts up
  for (let k = 0; k < res.stars; k++) {
    setTimeout(() => {
      sfx.star(k);
      const el = $('#r-stars');
      if (el) el.innerHTML = `${'<b>★</b>'.repeat(k + 1)}${'☆'.repeat(2 - k)}`;
    }, 350 + k * 380);
  }
  const t0 = performance.now() + 350 + res.stars * 380;
  let lastTick = 0;
  const count = (now) => {
    const k = Math.min(1, Math.max(0, (now - t0) / 1200));
    const el = $('#r-score');
    if (!el) return;
    el.textContent = fmt(Math.round(res.score * (1 - Math.pow(1 - k, 3))));
    if (k > 0 && now - lastTick > 70 && k < 1) { sfx.tick(); lastTick = now; }
    if (k < 1) requestAnimationFrame(count);
    else if (rec.newRecord && rec.prevBest > 0) sfx.fanfare();
  };
  requestAnimationFrame(count);
  setTimeout(() => { const x = $('#r-xp'); if (x) x.style.width = `${xpFrac * 100}%`; }, 600);
}

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------
const cvs = $('#confetti');
const cctx = cvs.getContext('2d');
let bits = [];
function confetti() {
  const colors = ['#4de8ff', '#ffb547', '#ffffff', '#a78bff', '#43e6a0'];
  for (let i = 0; i < 180; i++) {
    bits.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 900, vy: -Math.random() * 900 - 200,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 12,
      w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, c: colors[i % colors.length], life: 0,
    });
  }
  sfx.fanfare();
}
function updateConfetti(dt) {
  if (!bits.length) return;
  cctx.clearRect(0, 0, cvs.width, cvs.height);
  const dpr = cvs.width / innerWidth;
  for (const b of bits) {
    b.vy += 1400 * dt; b.vx *= 0.99; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt; b.life += dt;
    cctx.save();
    cctx.translate(b.x * dpr, b.y * dpr);
    cctx.rotate(b.r);
    cctx.globalAlpha = Math.max(0, 1 - b.life / 3.5);
    cctx.fillStyle = b.c;
    cctx.fillRect((-b.w / 2) * dpr, (-b.h / 2) * dpr, b.w * dpr, b.h * dpr);
    cctx.restore();
  }
  bits = bits.filter((b) => b.life < 3.5 && b.y < innerHeight + 40);
  if (!bits.length) cctx.clearRect(0, 0, cvs.width, cvs.height);
}

// ---------------------------------------------------------------------------
// Rail buttons, language, sound
// ---------------------------------------------------------------------------
$('#btn-lang').addEventListener('click', () => {
  sfx.click();
  setLang(getLang() === 'ar' ? 'en' : 'ar');
  profile.set('lang', getLang());
  applyStaticText();
  renderRail();
  applyShift();
  launch.setLang?.(getLang());
  if (app.screen === 'menu') renderMenu();
  if (app.screen === 'build') renderBuild();
  if (app.screen === 'orbit') { renderHud(); renderEvent(); $('#hud-mission').textContent = t('m_' + app.mission.id); }
  if (app.screen === 'results') { if (app.lastRes) renderResults(false); else showLaunchFail(); }
});

$('#btn-sound').addEventListener('click', () => {
  const on = !profile.get().sound;
  profile.set('sound', on);
  setMuted(!on);
  applyStaticText();
  if (on) { unlockAudio(); sfx.select(); }
});

addEventListener('pointerdown', unlockAudio, { once: true });

// ---------------------------------------------------------------------------
// Resize and the main loop
// ---------------------------------------------------------------------------
function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  fx.setSize(w, h);
  hangar.resize(w, h);
  launch.resize(w / h);
  orbit.resize(w, h);
  const dpr = Math.min(devicePixelRatio, 2);
  cvs.width = w * dpr;
  cvs.height = h * dpr;
  applyShift();
}
addEventListener('resize', resize);

let last = performance.now();
let time = 0;
function timecode() {
  let secs;
  if (app.view === 'orbit' && orbit.sim) secs = orbit.sim.hour * 3600;
  else secs = (performance.now() - app.startedAt) / 1000;
  const hh = String(Math.floor(secs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const ss = String(Math.floor(secs % 60)).padStart(2, '0');
  $('#timecode').textContent = `T+${hh}:${mm}:${ss}`;
}

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  time += dt;
  let scene;
  let cam;
  if (app.view === 'launch') { launch.update(dt); scene = launch.scene; cam = launch.camera; }
  else if (app.view === 'orbit') {
    orbit.update(dt); scene = orbit.scene; cam = orbit.camera;
    hudTimer += dt;
    if (hudTimer > 0.1) { hudTimer = 0; renderHud(); }
  } else { hangar.update(dt, time); scene = hangar.scene; cam = hangar.camera; }
  fx.render(scene, cam, time);
  updateConfetti(dt);
  timecode();
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
{ const l0 = startLang(profile.get().lang); if (profile.get().lang !== l0) profile.set('lang', l0); setLang(l0); }
setMuted(!profile.get().sound);
applyStaticText();
launch.setLang?.(getLang());
resize();
if (CENTER) {
  // Straight from the Space Center: load the built satellite and launch at once
  const m = MISSIONS.find((x) => x.id === CENTER.mission) || MISSIONS[0];
  const full = CENTER.full;
  const valid = full && ORBITS.some((o) => o.id === full.orbit) && ROCKETS.some((r) => r.id === full.rocket)
    && POWER.some((p) => p.id === full.power) && COMMS.some((c) => c.id === full.comms)
    && GROUND.some((x) => x.id === full.ground) && EOM.some((x) => x.id === full.eom) && TESTS.some((x) => x.id === full.test)
    && [full.inst1, full.inst2].every((x) => x === NO_INSTRUMENT || INSTRUMENTS.some((i) => i.id === x));
  app.designs[m.id] = valid ? { ...full } : fromLegacy(CENTER.design, m);
  app.quizAsked = true;
  // The sky the player measured live at the office computer (cloud cover, date of NASA's image)
  const skyQ = (qs.get('sky') || '').split(',');
  if (skyQ.length === 2 && skyQ[0] !== '' && Number.isFinite(Number(skyQ[0]))) setCloudCover(m.region || m.id, Math.min(1, Math.max(0, Number(skyQ[0]))), skyQ[1].replace(/[^0-9-]/g, '').slice(0, 10));
  // A team at the center: the design was made at its stations, so the console starts unlocked
  const teamN = Math.min(4, Math.max(1, Number(qs.get('team')) || 1));
  app.team.players = teamN;
  openBuild(m);
  if (teamN > 1) { app.team.turn = TURNS.length; renderBuild(); }   // redraw, so the launch button is enabled
  Promise.all([hangar.ready, launch.ready]).then(() => setTimeout(() => $('#btn-launch').click(), 400));
} else {
  goMenu();
}
requestAnimationFrame(loop);

// For testing in the browser console and in tools/shot.mjs
window.__majan = { app, hangar, launch, orbit, profile, quiz, openBuild, goMenu, startOrbit, computeDesign, choose, renderBuild };
