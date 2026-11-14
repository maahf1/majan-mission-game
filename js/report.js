// The mission report: one printable page (A4) with the outcome, the design in NASA's four
// segments, the equipment list, the requirements check, what happened in orbit, real missions
// to compare with and NASA's own images of the target. Opens from the results screen.
// A teacher can print it or save it as a PDF from the browser's print dialog.
import { requirements, equipmentList } from './rules.js';
import { reqText } from './review.js';
import { realMissionsHtml } from './realmissions.js';
import { imageSources } from './nasa.js';
import { cloudInfo } from './rules.js';
import { t, fmt, pct, getLang } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** ctx = { mission, res, d, players, cml, quiz: {pre, post} | null, findingText(f), sound } */
export function openReport(ctx) {
  const { mission: m, res, d, players } = ctx;
  const lang = getLang();
  const date = new Date().toLocaleDateString(lang === 'ar' ? 'ar-OM-u-nu-arab' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const reqs = requirements(d, { alive: res.alive, coverage: res.coverage }, m);
  const rows = equipmentList(d);
  const name = (id) => (id === 'bus' ? t('mel_bus') : t(id));
  const instNames = d.insts.length ? d.insts.map((x) => t('i_' + x.id)).join(' + ') : t('i_none');
  const kv = (k, v) => `<div><small>${k}</small><b>${v}</b></div>`;
  const seg = (title, lines) => `<tr><th>${t(title)}</th><td>${lines.map(esc).join(' · ')}</td></tr>`;
  const imgs = imageSources(m.region || m.id);

  const layer = document.createElement('div');
  layer.id = 'report-layer';
  layer.innerHTML = `
    <div class="rep-bar"><button type="button" class="primary" id="rep-print">${t('rep_print')}</button><button type="button" id="rep-close">${t('close')}</button></div>
    <article class="rep-paper" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
      <header class="rep-head">
        <div><div class="rep-eyebrow">${t('rep_sub')}</div><h1>${t('rep_title')}: ${t('m_' + m.id)}</h1></div>
        <div class="rep-stars" aria-label="${fmt(res.stars)}">${'★'.repeat(res.stars)}<span>${'★'.repeat(3 - res.stars)}</span></div>
      </header>
      <div class="rep-meta">${kv(t('rep_date'), date)}${kv(t('rep_crew'), players > 1 ? t('team_n', { n: fmt(players) }) : t('solo'))}${kv(t('rep_cml'), t('rep_cml_v', { n: fmt(ctx.cml || 1) }))}</div>

      <h2>${t('rep_outcome')}</h2>
      <div class="rep-kpis">
        ${kv(t('rep_score'), fmt(res.score))}${kv(t('rep_cov'), pct(res.coverage))}${kv(t('rep_batt'), pct(res.minBattery))}
        ${kv(t('rep_life'), t('rep_life_v', { y: fmt(res.lifeYears, 1), need: fmt(m.years) }))}${kv(t('rep_reserve'), `${fmt(res.reserve)} ${t('u_m')}`)}
      </div>

      <h2>${t('rep_design')}</h2>
      <table class="rep-table rep-seg"><tbody>
        ${seg('seg_launch', [t('rocket_' + d.rocket.id), t('rk_from'), t(d.test.id)])}
        ${seg('seg_space', [`${t('o_' + d.orb.id)} (${t('o_alt', { km: fmt(d.orb.alt) })})`, instNames, t(d.pwr.id), t(d.com.id), t(d.eom.id)])}
        ${seg('seg_ground', [t(d.ground.id), t('seg_mc')])}
        ${seg('seg_user', [t('user_' + m.id)])}
      </tbody></table>

      <div class="rep-cols">
        <section><h2>${t('rep_mel')}</h2>
          <table class="rep-table rep-mel"><thead><tr><th>${t('mel_item')}</th><th>${t('mel_mass')}</th><th>${t('mel_power')}</th><th>${t('mel_cost')}</th></tr></thead><tbody>
          ${rows.map((r) => `<tr><td>${esc(name(r.id))}</td><td>${r.mass ? `${fmt(r.mass)} ${t('u_kg')}` : '—'}</td>
            <td>${r.gen ? t('mel_gen', { w: fmt(r.gen) }) : r.power ? `${fmt(r.power)} ${t('u_w')}` : '—'}</td><td>${r.cost ? `${fmt(r.cost)} ${t('u_m')}` : '—'}</td></tr>`).join('')}
          </tbody><tfoot><tr><td>${t('mel_total')}</td><td>${fmt(d.mass)} ${t('u_kg')}</td><td>${fmt(d.powerUse)} ${t('u_w')}</td><td>${fmt(d.totalCost)} ${t('u_m')}</td></tr></tfoot></table>
        </section>
        <section><h2>${t('rep_reqs')}</h2>
          <ul class="rep-reqs">${reqs.map((r) => `<li class="${r.ok ? 'ok' : 'no'}"><b>${r.ok ? '✓' : '✗'}</b><span>${reqText(r, d, { coverage: res.coverage }, m)}</span></li>`).join('')}</ul>
        </section>
      </div>

      <h2>${t('rep_events')}</h2>
      <ul class="rep-findings">${res.findings.map((f) => `<li class="${f.bad ? 'bad' : ''}">${ctx.findingText(f)}</li>`).join('')}</ul>
      ${ctx.quiz && ctx.quiz.pre != null && ctx.quiz.post != null ? `<p class="rep-quiz">${t('rep_quiz', { a: fmt(ctx.quiz.pre), b: fmt(ctx.quiz.post) })}</p>` : ''}

      <h2>${t('rep_real')}</h2>
      <div class="rep-real">${realMissionsHtml(d, { full: false })}</div>

      ${imgs.length ? `<h2>${t('rep_images')}</h2>
      <div class="rep-imgs">${imgs.map((s) => `<figure><img src="${s.local}" alt="${esc(t(s.key))}"><figcaption>${esc(t(s.key))} · ${s.date}</figcaption></figure>`).join('')}</div>
      <p class="rep-cloud">${t('rep_cloud', { cloud: pct(cloudInfo(m).cover), date: cloudInfo(m).date })} ${t(cloudInfo(m).cover >= 0.05 ? 'rep_cloud_rule' : 'rep_cloud_clear')}</p>
      <p class="rep-credit">${t('rep_img_credit')}</p>` : ''}

      <footer class="rep-foot">${t('rep_foot')}</footer>
    </article>`;
  document.body.appendChild(layer);
  document.documentElement.classList.add('report-open');
  layer.querySelectorAll('.rep-imgs img').forEach((img) => { img.onerror = () => img.closest('figure').remove(); });
  const close = () => { layer.remove(); document.documentElement.classList.remove('report-open'); };
  layer.querySelector('#rep-close').onclick = () => { ctx.sound?.('click'); close(); };
  layer.querySelector('#rep-print').onclick = () => { ctx.sound?.('click'); window.print(); };
  return close;
}
