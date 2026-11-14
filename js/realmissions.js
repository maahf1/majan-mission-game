// Real Earth-observation missions, to compare the player's design with what has flown.
// Figures are rounded, from each agency's own mission page (src). alt = orbit height in km,
// mass = launch mass in kg (null for an instrument that rides on the space station).
// kinds = the game's instrument types that the real payload is closest to.
// Partners of Space Apps 2026 appear here too: ISRO, JAXA, ESA and the UAE's MBRSC.
import { t, fmt } from './i18n.js';

export const REAL_MISSIONS = [
  { id: 'tropics', name: 'TROPICS', agency: 'NASA', year: 2023, alt: 550, mass: 5.3, kinds: [], src: 'science.nasa.gov/mission/tropics' },
  { id: 'raincube', name: 'RainCube', agency: 'NASA JPL', year: 2018, alt: 400, mass: 12, kinds: ['radar'], src: 'jpl.nasa.gov/missions/radar-in-a-cubesat-raincube' },
  { id: 'cygnss', name: 'CYGNSS', agency: 'NASA', year: 2016, alt: 520, mass: 29, kinds: [], src: 'science.nasa.gov/mission/cygnss' },
  { id: 'khalifasat', name: 'KhalifaSat', agency: 'MBRSC', year: 2018, alt: 613, mass: 330, kinds: ['basic', 'ms'], sso: true, src: 'mbrsc.ae' },
  { id: 'smap', name: 'SMAP', agency: 'NASA', year: 2015, alt: 685, mass: 944, kinds: ['radar'], sso: true, src: 'smap.jpl.nasa.gov' },
  { id: 'sentinel6', name: 'Sentinel-6 Michael Freilich', agency: 'NASA / ESA', year: 2020, alt: 1336, mass: 1190, kinds: ['radar'], src: 'sealevel.jpl.nasa.gov' },
  { id: 'nisar', name: 'NISAR', agency: 'NASA / ISRO', year: 2025, alt: 747, mass: 2400, kinds: ['radar'], sso: true, src: 'nisar.jpl.nasa.gov' },
  { id: 'landsat9', name: 'Landsat 9', agency: 'NASA / USGS', year: 2021, alt: 705, mass: 2710, kinds: ['ms', 'thermal'], sso: true, src: 'landsat.gsfc.nasa.gov/satellites/landsat-9' },
  { id: 'gpm', name: 'GPM Core Observatory', agency: 'NASA / JAXA', year: 2014, alt: 407, mass: 3850, kinds: ['radar'], src: 'gpm.nasa.gov' },
  { id: 'terra', name: 'Terra', agency: 'NASA', year: 1999, alt: 705, mass: 5000, kinds: ['wide', 'thermal'], sso: true, src: 'terra.nasa.gov' },
  { id: 'ecostress', name: 'ECOSTRESS', agency: 'NASA JPL', year: 2018, alt: 410, mass: null, kinds: ['thermal'], iss: true, src: 'ecostress.jpl.nasa.gov' },
  { id: 'emit', name: 'EMIT', agency: 'NASA JPL', year: 2022, alt: 410, mass: null, kinds: ['hyper'], iss: true, src: 'earth.jpl.nasa.gov/emit' },
];

/** The real missions most like a computed design: same kind of orbit, same kind of instrument. */
export function closestMissions(d, n = 3) {
  const mine = d.insts.map((x) => x.id);
  return REAL_MISSIONS.map((m) => {
    const gap = Math.abs(m.alt - d.orb.alt);
    const shared = m.kinds.filter((k) => mine.includes(k));
    const union = new Set([...m.kinds, ...mine]).size || 1;
    const score = 0.4 * (1 - Math.min(1, gap / 600)) + 0.6 * (shared.length / union) + (shared.length ? 0.15 : 0);
    return { m, score, shared, sameOrbit: gap <= 60 };
  }).sort((a, b) => b.score - a.score).slice(0, n);
}

/** One line for the results screen: "Landsat 9 (NASA / USGS), which ..." */
export function twinLine(d) {
  const [best] = closestMissions(d, 1);
  return `${best.m.name} (${best.m.agency}): ${t('rm_' + best.m.id)}`;
}

function why(x, d) {
  const out = [];
  if (x.sameOrbit) out.push(t('rm_same_orbit', { km: fmt(x.m.alt) }));
  if (x.shared.length) out.push(t('rm_same_inst', { list: x.shared.map((k) => t('i_' + k)).join(' + ') }));
  if (!out.length) out.push(t('rm_near', { km: fmt(Math.abs(x.m.alt - d.orb.alt)) }));
  return out.join(' · ');
}

const massText = (kg) => (kg == null ? '—' : `≈ ${fmt(kg, kg < 10 ? 1 : 0)} ${t('u_kg')}`);

/** The mass ladder: real missions and the player's satellite on one scale (each step ×10). */
function ladder(d) {
  const lo = Math.log10(3);
  const hi = Math.log10(6000);
  const at = (kg) => `${(((Math.log10(kg) - lo) / (hi - lo)) * 100).toFixed(1)}%`;
  const dots = REAL_MISSIONS.filter((m) => m.mass).map((m, i) => `<i class="rm-dot ${i % 2 ? 'low' : ''}" style="inset-inline-start:${at(m.mass)}"><b>${m.name.split(' ')[0]}</b></i>`).join('');
  const ticks = [10, 100, 1000].map((kg) => `<u style="inset-inline-start:${at(kg)}">${fmt(kg)}</u>`).join('');
  return `<div class="rm-ladder" dir="ltr">${ticks}${dots}<i class="rm-dot you" style="inset-inline-start:${at(d.mass)}"><b>${t('rm_you')}</b></i></div>`;
}

/** Whole "real missions" view: the closest three, the mass ladder, then every mission. */
export function realMissionsHtml(d, { full = true } = {}) {
  const top = closestMissions(d, 3);
  const heavier = REAL_MISSIONS.filter((m) => m.mass && m.mass > d.mass).sort((a, b) => a.mass - b.mass)[0];
  const lighter = REAL_MISSIONS.filter((m) => m.mass && m.mass <= d.mass).sort((a, b) => b.mass - a.mass)[0];
  const cards = top.map((x, i) => `<div class="rm-card ${i === 0 ? 'best' : ''}">
      <div class="rm-name"><b>${x.m.name}</b><span>${x.m.agency} · ${x.m.year}</span></div>
      <p>${t('rm_' + x.m.id)}</p>
      <div class="rm-facts"><span>${t('o_alt', { km: fmt(x.m.alt) })}${x.m.sso ? ` · ${t('rm_sso')}` : ''}${x.m.iss ? ` · ${t('rm_iss')}` : ''}</span><span>${massText(x.m.mass)}</span></div>
      <em>${why(x, d)}</em></div>`).join('');
  const rows = REAL_MISSIONS.slice().sort((a, b) => a.alt - b.alt).map((m) => `<tr><td><b>${m.name}</b><small>${m.agency} · ${m.year}</small></td>
      <td>${fmt(m.alt)}</td><td>${massText(m.mass)}</td><td>${t('rm_' + m.id)}</td><td class="rm-src" dir="ltr">${m.src}</td></tr>`).join('');
  return `<p class="rv-note">${t('rm_intro')}</p>
    <div class="rm-cards">${cards}</div>
    <h4 class="rm-h">${t('rm_ladder')}</h4>${ladder(d)}
    <p class="rv-note">${t('rm_between', { kg: fmt(d.mass), a: lighter ? `${lighter.name} (${massText(lighter.mass)})` : '—', b: heavier ? `${heavier.name} (${massText(heavier.mass)})` : '—' })}</p>
    ${full ? `<h4 class="rm-h">${t('rm_all')}</h4>
    <div class="rm-scroll"><table class="mel rm-table"><thead><tr><th>${t('rm_col_name')}</th><th>${t('rm_col_alt')}</th><th>${t('rm_col_mass')}</th><th>${t('rm_col_job')}</th><th>${t('rm_col_src')}</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="rv-note">${t('rm_note')}</p>` : ''}`;
}
