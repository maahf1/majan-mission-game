// Leaderboard saved on this device: the best scores for each mission, by player or team name.
const KEY = 'majan-board-v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* play without saving */ }
}

export const board = {
  all: load,
  /** Best first, for one mission. */
  top(mission, n = 5) {
    return load().filter((x) => x.mission === mission).sort((a, b) => b.score - a.score).slice(0, n);
  },
  /** Add a result. Returns { rank, total } for its mission. */
  add({ name, mission, stars, score, players, summary }) {
    const list = load();
    const entry = { name: String(name).trim().slice(0, 24) || '—', mission, stars, score, players, summary, at: Date.now() };
    list.push(entry);
    save(list.slice(-200));
    const same = list.filter((x) => x.mission === mission).sort((a, b) => b.score - a.score);
    return { rank: same.indexOf(entry) + 1, total: same.length };
  },
  clear() { save([]); },
};
