// Textures drawn in code (no image files): floors, walls, cardboard boxes, signs.
import * as THREE from 'three';

function canvasTex(w, h, draw, repeat = null) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

function speckle(g, w, h, n, alpha, light = true) {
  for (let i = 0; i < n; i++) {
    const v = light ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

/** Polished epoxy floor tiles (1 tile = 2 m). */
export function floorTex(base = '#3a414c', line = 'rgba(0,0,0,0.35)', repeat = [10, 6]) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 2500, 0.06);
    speckle(g, w, h, 2500, 0.08, false);
    g.strokeStyle = line;
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
  }, repeat);
}

/** Light wall panels with seams and small bolts. */
export function wallTex(base = '#d9dee6', repeat = [8, 2]) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 1200, 0.05, false);
    g.strokeStyle = 'rgba(0,0,0,0.18)';
    g.lineWidth = 3;
    g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (const [x, y] of [[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]]) {
      g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
    }
  }, repeat);
}

/** Dark ceiling panels. */
export function ceilingTex(repeat = [14, 8]) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#1b2029';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.06)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
  }, repeat);
}

const KIND = {
  inst: { color: '#2fb8d8', en: 'INSTRUMENT', ar: 'جهاز' },
  power: { color: '#e8a23a', en: 'POWER', ar: 'طاقة' },
  comms: { color: '#9a7bff', en: 'COMMS', ar: 'اتصالات' },
};
export const kindColor = (kind) => KIND[kind]?.color || '#4de8ff';

/** Cardboard box side with a printed label in both languages: category, name, specs. */
export function boxTex(kind, titleEn, titleAr, spec) {
  const k = KIND[kind] || KIND.inst;
  return canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = '#b98a55';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 3000, 0.08, false);
    speckle(g, w, h, 1500, 0.06);
    g.fillStyle = 'rgba(214,190,150,0.85)'; // packing tape
    g.fillRect(w / 2 - 34, 0, 68, h);
    g.fillStyle = '#f3efe6'; // label
    g.fillRect(36, 56, w - 72, 262);
    g.fillStyle = k.color;
    g.fillRect(36, 56, w - 72, 50);
    g.fillStyle = '#fff';
    g.font = '700 28px "JetBrains Mono", monospace';
    g.textAlign = 'left';
    g.direction = 'ltr';
    g.fillText('MAJAN · ' + k.en, 56, 92);
    g.textAlign = 'right';
    g.direction = 'rtl';
    g.font = '700 28px "IBM Plex Sans Arabic", sans-serif';
    g.fillText(k.ar, w - 56, 92);
    g.fillStyle = '#16202c';
    g.textAlign = 'left';
    g.direction = 'ltr';
    // Long English names shrink to fit the label
    let size = 38;
    g.font = `700 ${size}px "Space Grotesk", sans-serif`;
    while (g.measureText(titleEn).width > w - 112 && size > 22) { size -= 2; g.font = `700 ${size}px "Space Grotesk", sans-serif`; }
    g.fillText(titleEn, 56, 160);
    g.textAlign = 'right';
    g.direction = 'rtl';
    g.font = '600 34px "IBM Plex Sans Arabic", sans-serif';
    g.fillStyle = '#3a4656';
    g.fillText(titleAr, w - 56, 214);
    g.textAlign = 'left';
    g.direction = 'ltr';
    g.font = '600 20px "JetBrains Mono", monospace';
    g.fillStyle = '#5a6472';
    g.fillText(spec, 56, 262);
    g.fillText('↑ THIS SIDE UP · FRAGILE', 56, 298);
  });
}

/** A wall sign with large text. */
export function signTex(lines, { w = 1024, h = 256, bg = '#0b1222', color = '#e8f4ff', accent = '#4de8ff' } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = accent;
    g.lineWidth = 6;
    g.strokeRect(10, 10, w - 20, h - 20);
    lines.forEach(([text, size, font, col, y, dir]) => {
      g.font = `700 ${size}px ${font}`;
      // A line wider than the sign is drawn smaller, never cut off at the edges
      const wide = g.measureText(text).width;
      if (wide > w - 70) g.font = `700 ${Math.floor((size * (w - 70)) / wide)}px ${font}`;
      g.fillStyle = col || color;
      g.textAlign = 'center';
      g.direction = dir || 'ltr';
      g.shadowColor = accent;
      g.shadowBlur = 18;
      g.fillText(text, w / 2, y);
    });
  });
}

/** Yellow-black hazard stripes for the delivery zone. */
export function hazardTex(repeat = [3, 1]) {
  return canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#e8b22a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1a1a1a';
    for (let x = -h; x < w + h; x += 48) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 24, 0); g.lineTo(x + 24 - h, h); g.lineTo(x - h, h); g.closePath(); g.fill();
    }
  }, repeat);
}

// ---------------------------------------------------------------------------
// Realistic surfaces: colour + bump (normal map) + gloss variation (roughness map)
// ---------------------------------------------------------------------------
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function dataTex(canvas, repeat, srgb = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

/** Turn a greyscale height canvas into a normal map (Sobel filter, tiles seamlessly). */
function normalFromHeight(hc, strength) {
  const w = hc.width;
  const h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const H = (x, y) => src[((((y + h) % h) * w) + ((x + w) % w)) * 4] / 255;
  const out = makeCanvas(w, h);
  const g = out.getContext('2d');
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return out;
}

function blotches(g, w, h, n, rMin, rMax, color) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = rMin + Math.random() * (rMax - rMin);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/**
 * Tiled floor or panelled wall.
 * kind: 'tiles' (grooves at the edges) or 'panels' (seams + bolts)
 */
export function surface({ base, kind = 'tiles', repeat = [8, 8], rough = 0.35, roughVar = 0.25, bump = 3, stains = 0.08, size = 512 }) {
  const S = size;
  // Colour
  const col = makeCanvas(S, S);
  const g = col.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  speckle(g, S, S, 4000, 0.05);
  speckle(g, S, S, 4000, 0.07, false);
  blotches(g, S, S, 10, 30, 110, `rgba(0,0,0,${stains})`);
  blotches(g, S, S, 6, 30, 90, `rgba(255,255,255,${stains * 0.6})`);
  const grooves = kind !== 'plain';
  if (grooves) {
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 4;
    g.strokeRect(2, 2, S - 4, S - 4);
  }
  // Height: flat with grooves (tiles), seams and bolts (panels), or grainy (plain)
  const hc = makeCanvas(S, S);
  const hg = hc.getContext('2d');
  hg.fillStyle = '#c0c0c0';
  hg.fillRect(0, 0, S, S);
  hg.filter = 'blur(2px)';
  hg.strokeStyle = '#303030';
  hg.lineWidth = kind === 'tiles' ? 8 : 6;
  if (grooves) hg.strokeRect(0, 0, S, S);
  if (kind === 'panels') {
    hg.fillStyle = '#ffffff';
    for (const [x, y] of [[18, 18], [S - 18, 18], [18, S - 18], [S - 18, S - 18]]) { hg.beginPath(); hg.arc(x, y, 6, 0, Math.PI * 2); hg.fill(); }
  }
  hg.filter = 'none';
  if (kind === 'plain') {
    speckle(hg, S, S, 16000, 0.35);
    speckle(hg, S, S, 16000, 0.35, false);
  } else {
    speckle(hg, S, S, 3000, 0.06);
  }
  // Gloss: mostly smooth, with worn and scuffed patches
  const rc = makeCanvas(S, S);
  const rg = rc.getContext('2d');
  const v = Math.round(rough * 255);
  rg.fillStyle = `rgb(${v},${v},${v})`;
  rg.fillRect(0, 0, S, S);
  blotches(rg, S, S, 18, 20, 120, `rgba(255,255,255,${roughVar})`);
  blotches(rg, S, S, 10, 20, 90, `rgba(0,0,0,${roughVar * 0.6})`);
  speckle(rg, S, S, 3000, roughVar * 0.6);
  if (grooves) {
    rg.strokeStyle = '#ffffff';
    rg.lineWidth = 8;
    rg.strokeRect(0, 0, S, S); // grooves are rough (dirt)
  }
  return {
    map: dataTex(col, repeat, true),
    normalMap: dataTex(normalFromHeight(hc, bump), repeat),
    roughnessMap: dataTex(rc, repeat),
  };
}
