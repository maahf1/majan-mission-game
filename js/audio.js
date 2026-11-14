// Sound effects synthesized with the Web Audio API (no sound files needed).
let ctx = null;
let master = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.15, slide = 0, delay = 0 } = {}) {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur, { vol = 0.3, freq = 800, type = 'lowpass', attack = 0.01, delay = 0 } = {}) {
  const c = ac();
  if (!c || muted) return () => {};
  const t0 = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
  return () => { try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setTargetAtTime(0.0001, c.currentTime, 0.3); } catch { /* ignore */ } };
}

export const sfx = {
  click: () => tone(900, 0.05, { type: 'triangle', vol: 0.08 }),
  select: () => { tone(620, 0.07, { vol: 0.1 }); tone(930, 0.1, { vol: 0.1, delay: 0.05 }); },
  snap: () => { noise(0.12, { vol: 0.18, freq: 2600, type: 'bandpass' }); tone(240, 0.14, { type: 'square', vol: 0.05, slide: -90 }); },
  error: () => { tone(170, 0.16, { type: 'sawtooth', vol: 0.08 }); tone(125, 0.2, { type: 'sawtooth', vol: 0.07, delay: 0.08 }); },
  beep: () => tone(980, 0.12, { type: 'square', vol: 0.07 }),
  go: () => tone(1470, 0.45, { type: 'square', vol: 0.08 }),
  rumble: (dur = 10) => noise(dur, { vol: 0.55, freq: 160, attack: 0.6 }),
  thud: () => { noise(0.35, { vol: 0.3, freq: 380 }); tone(85, 0.3, { vol: 0.2, slide: -40 }); },
  boom: () => { noise(1.8, { vol: 0.8, freq: 520 }); tone(60, 1.2, { vol: 0.25, slide: -30 }); },
  card: () => { tone(523, 0.1, { vol: 0.1 }); tone(784, 0.16, { vol: 0.1, delay: 0.08 }); },
  good: () => [523, 659, 784].forEach((f, i) => tone(f, 0.18, { vol: 0.1, delay: i * 0.07 })),
  bad: () => [392, 330, 262].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.1, delay: i * 0.09 })),
  star: (i = 0) => tone(880 * Math.pow(1.26, i), 0.28, { type: 'triangle', vol: 0.16 }),
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.32, { type: 'triangle', vol: 0.13, delay: i * 0.11 })),
  badge: () => [1319, 1568, 2093].forEach((f, i) => tone(f, 0.2, { vol: 0.09, delay: i * 0.06 })),
  tick: () => tone(1750, 0.02, { vol: 0.03 }),
  step: () => noise(0.07, { vol: 0.05, freq: 700 + Math.random() * 300 }),
  pickup: () => { tone(330, 0.08, { type: 'triangle', vol: 0.08 }); tone(495, 0.1, { type: 'triangle', vol: 0.08, delay: 0.06 }); },
  place: () => { noise(0.1, { vol: 0.12, freq: 500 }); tone(160, 0.1, { vol: 0.08 }); },
  cash: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.12, { type: 'square', vol: 0.05, delay: i * 0.05 })),
  engine: (dur = 5) => noise(dur, { vol: 0.07, freq: 110, attack: 0.4 }),
  door: (dur = 1.6) => noise(dur, { vol: 0.12, freq: 260, attack: 0.2 }),
  ding: () => { tone(1320, 0.3, { vol: 0.1 }); tone(990, 0.4, { vol: 0.08, delay: 0.18 }); },
};

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }
export function unlockAudio() { ac(); }
