// Player progress saved in this browser: stars, best scores, XP, badges, settings.
import { MISSIONS, RANKS } from './data.js';

const KEY = 'majan-mission-v1';
const fresh = () => ({ stars: {}, best: {}, xp: 0, badges: [], lastFailed: false, sound: true, lang: 'ar' });

let state = fresh();
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved) state = { ...fresh(), ...saved };
} catch { /* private mode or blocked storage: play without saving */ }

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export const profile = {
  get: () => state,
  totalStars: () => MISSIONS.reduce((n, m) => n + (state.stars[m.id] || 0), 0),
  unlocked: (m) => profile.totalStars() >= m.unlock,
  rankIndex: (xp = state.xp) => {
    let i = 0;
    RANKS.forEach((r, k) => { if (xp >= r.xp) i = k; });
    return i;
  },
  /** Read the saved progress again: another page (the mission console in the Space Center) may have changed it. */
  reload() {
    try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) state = { ...fresh(), ...saved }; } catch { /* ignore */ }
  },
  set(key, value) { state[key] = value; save(); },
  /** Record a finished mission. Returns what changed, for the results screen. */
  record(missionId, { stars, score }) {
    const prevRank = profile.rankIndex();
    const prevBest = state.best[missionId] || 0;
    const newRecord = score > prevBest;
    state.stars[missionId] = Math.max(state.stars[missionId] || 0, stars);
    if (newRecord) state.best[missionId] = score;
    const xp = Math.round(score / 6) + stars * 20;
    state.xp += xp;
    save();
    return { xp, newRecord, prevBest, best: state.best[missionId], rankUp: profile.rankIndex() > prevRank };
  },
  addBadge(id) {
    if (state.badges.includes(id)) return false;
    state.badges.push(id);
    save();
    return true;
  },
};
