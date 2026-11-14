// Guided tutorial: a card that explains each step of the game in order, and a
// glowing beacon in the world that shows where to go. Progress is saved, so the
// tutorial continues after the launch scene sends you back to the center.
import * as THREE from 'three';
import { t, extendText } from '../i18n.js';

extendText({
  ar: {
    tut_btn: 'الدرس التعليمي', tut_rail: '؟ الدرس', tut_next: 'التالي', tut_end: 'إنهاء الدرس', tut_done: 'انتهيت', tut_step: 'الخطوة {n} من {m}',
    tut_m: 'متر',
    tut_move_h: 'تحرّك وانظر حولك',
    tut_move_p_touch: 'حرّك العصا في أسفل الشاشة للمشي، واسحب بإصبعك على الشاشة للنظر. زر E للاستخدام والحمل، وزر Q لإنزال الصندوق. امشِ بضع خطوات للمتابعة.',
    tut_move_p: 'استخدم W A S D للمشي، وحرّك الفأرة للنظر. اضغط Shift للركض. امشِ بضع خطوات للمتابعة.',
    tut_term_h: 'اذهب إلى الحاسوب',
    tut_term_p: 'اتبع العمود المضيء إلى الحاسوب في المكتب. انظر إلى الشاشة واضغط E (أو انقر) لفتحه.',
    tut_contract_h: 'اقبل عقدًا',
    tut_contract_p: 'في تبويب «العقود» اقبل «عين على الأفلاج». لكل عقد حد ميزانية لا يمكنك تجاوزه، وعمر مطلوب للقمر، ومكافأة حسب عدد النجوم التي تحققها المهمة (١ أو ٢ أو ٣ نجوم).',
    tut_shop_h: 'اشترِ ترقية',
    tut_shop_p: 'افتح «متجر القطع». القمر يأتي بكاميرا أساسية وألواح صغيرة وهوائي سلكي. لكل جهاز علامة تقول هل يناسب العقد الحالي. اشترِ جهازًا مناسبًا (مثل الكاميرا الحرارية) أو ألواحًا أكبر، ثم اضغط Esc لإغلاق الحاسوب.',
    tut_truck_h: 'استلم الشحنة',
    tut_truck_p: 'شاحنة التوصيل في الطريق. اذهب إلى منطقة الاستلام ذات الخطوط الصفراء والسوداء في المستودع. سيُفتح باب التحميل وتنزل الصناديق.',
    tut_pick_h: 'احمل الصندوق',
    tut_pick_p: 'انظر إلى الصندوق واضغط E لحمله. Q تُنزله على الأرض. يمكنك أيضًا ترتيب الصناديق على الرفوف لتحتفظ بها لاحقًا.',
    tut_install_h: 'ركّب القطعة على القمر',
    tut_install_p: 'احمل الصندوق إلى الغرفة النظيفة، انظر إلى القمر الصناعي واضغط E. للأجهزة حجرتان (أ و ب): يدخل الجهاز في الحجرة الفارغة، وإن كانتا ممتلئتين يحل مكان الجهاز الأقل ملاءمة ويعود القديم صندوقًا. بيدين فارغتين، E يُخرج جهاز الحجرة ب.',
    tut_screen_h: 'اقرأ شاشة الجاهزية',
    tut_screen_p: 'الشاشة تقرأ تصميمك بنفس قواعد المهمة: الميزانية تحت الحد، والطاقة تكفي في ظل الأرض، والكتلة تحت قدرة الصاروخ، والبيانات لا تتجاوز ما يرسله الهوائي، والأجهزة مناسبة، والعمر يكفي. النجوم المتوقعة على الجانب.',
    tut_launch_h: 'خطّط وأطلق',
    tut_launch_p: 'اذهب إلى منصة التحكم بالإطلاق واضغط E لفتح «التحكم بالمهمة». اختر المدار (المنخفض أوضح لكنه يسقط بسرعة) والصاروخ (الأكبر يحمل أكثر ويكلف أكثر)، راجع التوقع، ثم اضغط «إطلاق». تُدفع رسوم الإطلاق من رصيدك.',
    tut_after_h: 'كيف تُنهي اللعبة',
    tut_after_p: 'تحصل على المكافأة حسب النجوم وتُضاف إلى رصيدك، ويُسجَّل الإطلاق في «سجل المهام». النجوم تفتح مهامًا جديدة: «حارس الخريف» عند نجمتين و«صياد الكثبان» عند ٥ نجوم. تنتهي اللعبة عندما تحصل على ٣ نجوم في المهام الثلاث (٩ نجوم). إذا نفد المال، اطلب منحة من الحاسوب.',
  },
  en: {
    tut_btn: 'Tutorial', tut_rail: '? Tutorial', tut_next: 'Next', tut_end: 'End tutorial', tut_done: 'Done', tut_step: 'Step {n} of {m}',
    tut_m: 'm',
    tut_move_h: 'Move and look around',
    tut_move_p_touch: 'Use the stick at the bottom of the screen to walk, and drag on the screen to look. The E button uses and picks up, the Q button puts a box down. Walk a few steps to continue.',
    tut_move_p: 'Use W A S D to walk and move the mouse to look. Hold Shift to run. Walk a few steps to continue.',
    tut_term_h: 'Go to the computer',
    tut_term_p: 'Follow the glowing beam to the computer in the office. Look at the screen and press E (or click) to open it.',
    tut_contract_h: 'Accept a contract',
    tut_contract_p: 'In the Contracts tab, accept "Aflaj Watch". Every contract has a budget cap you cannot go over, a lifetime the satellite must reach, and pays a reward based on how many stars the mission earns (1, 2 or 3).',
    tut_shop_h: 'Buy an upgrade',
    tut_shop_p: 'Open the Parts shop. The satellite comes with a basic camera, small panels and a whip antenna. Each instrument shows whether it suits your contract. Buy a good one (the thermal camera, say) or bigger panels, then press Esc to close the computer.',
    tut_truck_h: 'Collect the delivery',
    tut_truck_p: 'The delivery truck is on its way. Go to the yellow-and-black delivery zone in the warehouse. The loading door rolls up and the boxes slide in.',
    tut_pick_h: 'Pick up the box',
    tut_pick_p: 'Look at the box and press E to pick it up. Q puts it down. You can also store boxes on the shelves to use later.',
    tut_install_h: 'Install the part on the satellite',
    tut_install_p: 'Carry the box to the clean room, look at the satellite and press E. Instruments have two bays (A and B): a new one goes in the empty bay; if both are full it replaces the one that suits the contract least, and the old one comes back as a box. With empty hands, E takes the bay B instrument out.',
    tut_screen_h: 'Read the readiness screen',
    tut_screen_p: "The screen checks your design with the same rules as the mission: budget under the cap, enough power in Earth's shadow, mass under the rocket's limit, no more data than the antenna can send, the right instruments, and a long enough life. The forecast stars are on the side.",
    tut_launch_h: 'Plan and launch',
    tut_launch_p: 'Go to the launch console and press E to open Mission Control. Choose the orbit (low is sharper but falls sooner) and the rocket (bigger carries more and costs more), check the forecast, then press LAUNCH. The launch fee comes out of your cash.',
    tut_after_h: 'How to finish the game',
    tut_after_p: 'Your reward depends on the stars and is added to your cash; every launch is saved in the Mission log. Stars unlock new missions: Khareef Watch at 2 stars, Dune Hunter at 5 stars. You finish the game with 3 stars on all three missions (9 stars). If you run out of money, ask for a grant at the computer.',
  },
});

const KEY = 'majan-tutorial';
const touch = matchMedia('(pointer: coarse)').matches;

/**
 * ctx: { S(), held(), terminalOpen(), mcOpen(), player, scene, sfx }
 */
export function createTutorial(ctx) {
  // The satellite starts with a basic camera, small panels and a whip antenna; anything else was installed
  const anyInstalled = () => { const s = ctx.S().sat; return s.inst1 !== 'basic' || s.inst2 !== 'none' || s.power !== 'p1' || s.comms !== 'a1'; };
  const boxInCenter = () => ctx.S().boxes.some((b) => b.where === 'floor' || b.where === 'shelf');
  let startPos = null;

  // id, beacon position (or null), done test, show "Next" button
  const STEPS = [
    { id: 'move', at: null, done: () => startPos && ctx.player.pos.distanceTo(startPos) > 3 },
    { id: 'term', at: [-15, 0, -9.6], done: () => ctx.terminalOpen() || !!ctx.S().contract },
    { id: 'contract', at: [-15, 0, -9.6], done: () => !!ctx.S().contract },
    { id: 'shop', at: [-15, 0, -9.6], done: () => (ctx.S().boxes.length > 0 || anyInstalled()) && !ctx.terminalOpen(), next: true },
    { id: 'truck', at: [-1, 0, 9.6], done: () => boxInCenter() || !!ctx.held() || anyInstalled(), next: true },
    { id: 'pick', at: null, done: () => !!ctx.held() || anyInstalled(), next: true },
    { id: 'install', at: [14, 0, -1], done: () => anyInstalled() && !ctx.held(), next: true },
    { id: 'screen', at: [14, 0, -9], done: () => false, next: true },
    { id: 'launch', at: [18.2, 0, 7.4], done: () => !!ctx.S().inFlight, next: true },
    { id: 'after', at: null, done: () => false, next: true, last: true },
  ];

  let step = -1;
  try { const v = localStorage.getItem(KEY); if (v !== null) step = Number(v); } catch { /* ignore */ }
  // Back from the launch scene: show how to finish the game
  if (STEPS[step]?.id === 'launch' && !ctx.S().inFlight && localStorage.getItem('majan-tut-launched')) step = STEPS.length - 1;

  // --- Card ----------------------------------------------------------------------
  const card = document.createElement('aside');
  card.id = 'tut';
  card.className = 'glass brackets';
  card.hidden = true;
  document.body.appendChild(card);

  // --- Beacon: a soft light beam with a bobbing arrow on top -------------------
  const beacon = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 2.0), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 5, 32, 1, true), beamMat);
  beam.position.y = 2.5;
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.4), toneMapped: false }));
  arrow.rotation.x = Math.PI; // point down
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 2.0), transparent: true, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  beacon.add(beam, arrow, ring);
  beacon.visible = false;
  ctx.scene.add(beacon);

  function save() { try { localStorage.setItem(KEY, String(step)); } catch { /* ignore */ } }

  function render() {
    const s = STEPS[step];
    if (!s) { card.hidden = true; beacon.visible = false; return; }
    card.hidden = false;
    card.innerHTML = `
      <div class="eyebrow">${t('tut_btn')} · ${t('tut_step', { n: step + 1, m: STEPS.length })}</div>
      <h3>${t(`tut_${s.id}_h`)}</h3>
      <p>${t(touch && s.id === 'move' ? 'tut_move_p_touch' : `tut_${s.id}_p`)}</p>
      <div class="tut-dist mono"></div>
      <div class="tut-btns">
        ${s.next ? `<button type="button" class="tut-next">${s.last ? t('tut_done') : t('tut_next')} <kbd>Enter</kbd></button>` : ''}
        ${s.last ? '' : `<button type="button" class="tut-end ghost">${t('tut_end')}</button>`}
      </div>`;
    card.querySelector('.tut-next')?.addEventListener('click', next);
    card.querySelector('.tut-end')?.addEventListener('click', stop);
    beacon.visible = !!s.at;
    if (s.at) beacon.position.set(...s.at);
  }

  function go(i) {
    step = i;
    if (step >= STEPS.length) step = -1;
    if (STEPS[step]?.id === 'launch') { try { localStorage.setItem('majan-tut-launched', '1'); } catch { /* ignore */ } }
    save();
    render();
  }
  function next() { ctx.sfx.click(); go(step + 1); }
  function stop() {
    step = -1;
    try { localStorage.removeItem(KEY); localStorage.removeItem('majan-tut-launched'); } catch { /* ignore */ }
    render();
  }
  function start() {
    startPos = ctx.player.pos.clone();
    go(0);
  }

  addEventListener('keydown', (e) => {
    if (step < 0 || e.code !== 'Enter') return;
    if (STEPS[step].next) { e.preventDefault(); next(); }
  });

  let clock = 0;
  function update(dt) {
    if (step < 0) return;
    clock += dt;
    if (!startPos && ctx.player.enabled) startPos = ctx.player.pos.clone();
    const s = STEPS[step];
    // Skip ahead over steps that are already done (e.g. a contract was taken before)
    if (s.done()) { ctx.sfx.good?.(); go(step + 1); return; }
    if (s.at) {
      arrow.position.y = 3.1 + Math.sin(clock * 3) * 0.2;
      arrow.rotation.y += dt * 1.5;
      ring.scale.setScalar(1 + 0.15 * Math.sin(clock * 4));
      const d = Math.hypot(ctx.player.pos.x - s.at[0], ctx.player.pos.z - s.at[2]);
      beamMat.opacity = d < 3 ? 0.08 : 0.22; // fade when you're there
      const el = card.querySelector('.tut-dist');
      if (el) el.textContent = d > 2.5 ? `➜ ${Math.round(d)} ${t('tut_m')}` : '';
    }
  }

  render();
  return { start, stop, update, render, get active() { return step >= 0; } };
}
