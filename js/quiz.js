// The 5-question learning check, taken before and after playing. Answers are shuffled,
// each question explains the right answer, and the results are kept on this device so the
// team can report the average learning gain (exportable as CSV).
import { t, fmt } from './i18n.js';

const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5'];
const KEY = 'majan-quiz-v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* private mode: keep going without saving */ }
}

export const quiz = {
  /** Attempts on this device: { id, date, pre, post, mission, players } */
  attempts: load,
  /** The attempt in progress for this page (set by the pre-play check) */
  current: null,

  stats() {
    const done = load().filter((a) => a.pre != null && a.post != null);
    if (!done.length) return null;
    const avg = (k) => done.reduce((s, a) => s + a[k], 0) / done.length;
    return { n: done.length, pre: avg('pre'), post: avg('post') };
  },

  csv() {
    const rows = [['date', 'mission', 'players', 'before (of 5)', 'after (of 5)', 'gain']];
    for (const a of load()) rows.push([a.date, a.mission || '', a.players || 1, a.pre ?? '', a.post ?? '', a.pre != null && a.post != null ? a.post - a.pre : '']);
    return rows.map((r) => r.join(',')).join('\n');
  },

  clear() { save([]); this.current = null; },

  /** Show the quiz in el (an empty modal). kind 'pre' | 'post'. Resolves with the score, or null if skipped. */
  run(el, kind, { onSound } = {}) {
    return new Promise((resolve) => {
      const order = QUESTIONS.map((q) => ({ q, opts: ['a', 'b', 'c'].sort(() => Math.random() - 0.5) }));
      let i = -1;
      let score = 0;
      const title = t(kind === 'pre' ? 'quiz_pre_title' : 'quiz_post_title');
      const close = (value) => { el.hidden = true; el.innerHTML = ''; resolve(value); };

      const intro = () => {
        el.innerHTML = `
          <h2>${title}</h2>
          <p>${t('quiz_intro')}</p>
          <div class="btn-row"><button class="primary" id="qz-start" type="button">${t('quiz_start')}</button>
          <button id="qz-skip" type="button">${t('quiz_skip')}</button></div>`;
        el.querySelector('#qz-start').onclick = () => { onSound?.('click'); next(); };
        el.querySelector('#qz-skip').onclick = () => { onSound?.('click'); close(null); };
      };

      const next = () => {
        i++;
        if (i >= order.length) return finish();
        const { q, opts } = order[i];
        el.innerHTML = `
          <div class="eyebrow">${t('quiz_q', { n: fmt(i + 1), m: fmt(order.length) })}</div>
          <h2 class="qz-q">${t(q)}</h2>
          <div class="qz-opts">${opts.map((o) => `<button class="choice" data-o="${o}" type="button">${t(`${q}_${o}`)}</button>`).join('')}</div>
          <p class="qz-why" hidden></p>
          <div class="btn-row" hidden><button class="primary" id="qz-next" type="button">${t('quiz_next')}</button></div>`;
        el.querySelectorAll('.qz-opts .choice').forEach((b) => {
          b.onclick = () => {
            const right = b.dataset.o === 'a';
            if (right) score++;
            onSound?.(right ? 'good' : 'bad');
            el.querySelectorAll('.qz-opts .choice').forEach((x) => {
              x.disabled = true;
              if (x.dataset.o === 'a') x.classList.add('right');
              else if (x === b) x.classList.add('wrong');
            });
            const why = el.querySelector('.qz-why');
            why.textContent = t(`${q}_why`);
            why.hidden = false;
            el.querySelector('.btn-row').hidden = false;
            el.querySelector('#qz-next').onclick = () => { onSound?.('click'); next(); };
          };
        });
      };

      const finish = () => {
        const list = load();
        if (kind === 'pre') {
          this.current = { id: Date.now(), date: new Date().toISOString().slice(0, 16).replace('T', ' '), pre: score, post: null };
          list.push(this.current);
        } else {
          let a = this.current && list.find((x) => x.id === this.current.id);
          if (!a) { a = { id: Date.now(), date: new Date().toISOString().slice(0, 16).replace('T', ' '), pre: null }; list.push(a); }
          a.post = score;
          Object.assign(a, this.meta || {});
          this.current = a;
        }
        save(list);
        const gain = kind === 'post' && this.current.pre != null
          ? `<p class="qz-gain">${t('quiz_gain', { a: fmt(this.current.pre), b: fmt(score) })}</p>` : '';
        el.innerHTML = `
          <h2>${title}</h2>
          <div class="qz-score">${t('quiz_result', { s: fmt(score), m: fmt(order.length) })}</div>
          ${gain}
          <div class="btn-row"><button class="primary" id="qz-done" type="button">${t('quiz_close')}</button></div>`;
        onSound?.(score >= 4 ? 'fanfare' : 'good');
        el.querySelector('#qz-done').onclick = () => { onSound?.('click'); close(score); };
      };

      el.hidden = false;
      intro();
    });
  },
};
