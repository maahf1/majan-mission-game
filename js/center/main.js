// Majan Space Center: a first-person space-agency simulator.
// Accept contracts, order parts, carry boxes, stock shelves, build the satellite,
// plan the orbit and rocket at Mission Control, launch. Uses the same rules as the
// main game (rules.js), so the forecast here matches the mission you then play.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FX } from '../fx.js';
import { buildWorld } from './world.js';
import { SETTLEMENT_STAGES } from './settlement.js';
import { Player } from './player.js';
import { boxTex, kindColor } from './textures.js';
import { createTutorial } from './tutorial.js';
import { MISSIONS, ORBITS, INSTRUMENTS, POWER, COMMS, GROUND, EOM, TESTS, ROCKETS, BUS, NO_INSTRUMENT, DISPOSAL_LIMIT, DESIGN_KEYS, computeDesign, disposalYears, instrument, requirements, maturity, instrumentFit, cloudLoss, cloudInfo, ROLES, rolesFor } from '../rules.js';
import { forecast } from '../missionsim.js';
import { SatParts } from '../satparts.js';
import '../text2.js';
import '../text3.js';
import '../text4.js';
import { openReview } from '../review.js';
import { t, tIn, fmt, pct, sep, getLang, setLang, extendText } from '../i18n.js';
import { sfx, setMuted, unlockAudio } from '../audio.js';
import { profile } from '../progress.js';

extendText({
  ar: { e8_obj: 'الأهداف', e8_inst: 'الأجهزة', e8_rocket: 'مركبة الإطلاق', e8_budget: 'الميزانية', e8_power: 'الطاقة', e8_mass: 'الكتلة', e8_comms: 'الاتصالات', e8_orbit: 'المدار',
    con_title: 'مركز التحكم · مباشر', con_hint: 'قمرك في المدار. قرّر عند كل حدث.' },
  en: { e8_obj: 'Objectives', e8_inst: 'Instruments', e8_rocket: 'Launch vehicle', e8_budget: 'Budget', e8_power: 'Power', e8_mass: 'Mass', e8_comms: 'Communications', e8_orbit: 'Orbit',
    con_title: 'MISSION CONTROL · LIVE', con_hint: 'Your satellite is in orbit. Decide at each event.' },
});

extendText({
  ar: {
    c_title: 'مركز مجان الفضائي',
    c_intro: 'أدر مركز الفضاء العُماني: اقبل العقود، اطلب القطع، رتّب المستودع، جمّع القمر الصناعي، ثم خطّط المدار والصاروخ وأطلقه.',
    c_k_move: 'المشي', c_k_look: 'النظر', c_k_run: 'الركض', c_k_use: 'استخدام / حمل', c_k_drop: 'إنزال الصندوق', c_k_pause: 'إيقاف مؤقت',
    c_start: 'ادخل المركز', c_continue: 'تابع', c_classic: 'النسخة الكلاسيكية', c_objectives: 'المهام',
    c_zone_office: 'المكتب', c_zone_ware: 'المستودع', c_zone_clean: 'الغرفة النظيفة', c_zone_out: 'الساحة',
    gfx_high: 'الرسومات: عالية', gfx_low: 'الرسومات: منخفضة',
    team_btn: 'اللاعبون: {n}', team_toast: 'فريق من {n}: لكل لاعب دور، واللعبة تقول من صاحب القرار في كل محطة.', team_toast_solo: 'لاعب واحد.',
    team_term_a: '{who} يختار الأجهزة', team_term_b: '{who} يختار نظام الطاقة', team_term_c: '{who} يختار الهوائي',
    team_mc_a: '{who} يقرر المدار والصاروخ والتخلص من القمر', team_mc_b: '{who} يقرر الاختبارات', team_mc_c: '{who} يقرر المحطات الأرضية',
    c_tab_contracts: 'العقود', c_tab_shop: 'متجر القطع', c_tab_stock: 'المخزون', c_tab_log: 'سجل المهام',
    c_pay_v: 'المكافأة: {a} / {b} / {c} مليون حسب النجوم', c_cap: 'حد الميزانية {b} مليون', c_years: 'العمر المطلوب {y} سنوات', c_accept: 'اقبل', c_active: 'العقد الحالي',
    c_buy: 'اشترِ', c_owned: 'لديك {n}', c_sell: 'بِع واحدًا (+{x})',
    c_shop_note: 'القمر يأتي بكاميرا أساسية وألواح صغيرة وهوائي سلكي. للأجهزة حجرتان (أ و ب). اشترِ القطع وستصل صناديقها إلى منطقة الاستلام في المستودع.',
    c_stock_empty: 'لا توجد صناديق بعد.', c_in_stock: 'صناديق في المركز', c_installed: 'مركّب على القمر الصناعي', c_cash: 'رصيدك',
    c_fit_for: 'للعقد الحالي:',
    c_grant_h: 'منحة دعم', c_grant_p: 'رصيدك منخفض. يمكن لمجلس الوكالة أن يمنح دعمًا مرة واحدة لكل عقد ليستمر البرنامج.', c_grant_btn: 'اطلب المنحة (+{x})', t_grant: 'تمت الموافقة على المنحة: +{x} مليون',
    c_log_empty: 'لم تُطلق أي مهمة بعد.', c_log_ok: '{stars} ★ — المكافأة +{x} مليون', c_log_fail: 'فشل الإطلاق — لا مكافأة',
    p_terminal: 'استخدم الحاسوب', p_pick: 'احمل: {name}', p_shelf_place: 'ضع الصندوق على الرف',
    p_install: 'ركّب {name} في {bay}', p_replace: 'ركّب {name} مكان {old}', p_dup: 'هذه القطعة مركّبة بالفعل', p_takeout: 'أخرج {name} من {bay}',
    p_sat: 'القمر الصناعي', p_mc: 'افتح التحكم بالمهمة', p_need_contract: 'اقبل عقدًا أولًا من الحاسوب',
    p_over: 'تجاوزت حد الميزانية بـ {x} مليون', p_cash: 'لا يكفي المال لرسوم الإطلاق ({x} مليون). اطلب منحة من الحاسوب أو استخدم «إعادة المهمة».', p_full: 'يداك مشغولتان',
    o_contract: 'اقبل عقدًا من الحاسوب في المكتب', o_order: 'اشترِ القطع من متجر القطع', o_collect: 'احمل الصناديق من منطقة الاستلام',
    o_install: 'ركّب القطع على القمر في الغرفة النظيفة', o_launch: 'في التحكم بالإطلاق اختر المدار والصاروخ ثم أطلق',
    c_no_contract: 'لا يوجد عقد بعد', c_contract_line: '{name} · الحد {b} مليون',
    t_delivered: 'وصلت الشحنة إلى منطقة الاستلام', t_installed: 'تم التركيب: {name}', t_returned: 'وُضعت القطعة القديمة في صندوق بجانب القمر',
    t_accepted: 'عقد جديد: {name}', t_reward: '{stars} ★ — المكافأة +{x} مليون ريال', t_failed: 'فشل الإطلاق وفُقد القمر. لم تُدفع المكافأة.',
    t_truck: 'شاحنة التوصيل في الطريق', t_nocash: 'لا يكفي المال', t_sold: 'بِيع صندوق: +{x} مليون',
    s_title: 'جاهزية المهمة', s_fee: 'رسوم الإطلاق', s_parts: 'القطع', s_plan: 'الخطة', c_back: 'العودة إلى مركز الفضاء',
    c_bay_a: 'الحجرة أ', c_bay_b: 'الحجرة ب',
    mc_title: 'التحكم بالمهمة', mc_close: 'إغلاق', mc_cap: 'يحمل {kg} كغ إلى هذا المدار', mc_rel: 'موثوقية {p}', mc_ready: 'جاهز للإطلاق.', mc_after: 'بعد الإطلاق: {x} مليون',
    c_brief_none: 'اقبل عقدًا لترى صور ناسا لمنطقة المهمة', c_brief_title: 'إحاطة المهمة',
    c_restart: '↻ إعادة المهمة', c_restart_h: 'إعادة المهمة؟', c_restart_q: 'سيبدأ مركز الفضاء من جديد: يعود الرصيد إلى ٥٠ مليونًا، ويُلغى العقد والصناديق والقطع المركّبة. نجومك والمهام المفتوحة تبقى كما هي.', c_restart_yes: 'نعم، أعد البدء', c_cancel: 'إلغاء',
  },
  en: {
    c_title: 'Majan Space Center',
    c_intro: "Run Oman's space center: accept contracts, order parts, stock the warehouse, build the satellite, then plan the orbit and rocket and launch it.",
    c_k_move: 'Move', c_k_look: 'Look', c_k_run: 'Run', c_k_use: 'Use / pick up', c_k_drop: 'Put box down', c_k_pause: 'Pause',
    c_start: 'Enter the center', c_continue: 'Continue', c_classic: 'Classic version', c_objectives: 'Objectives',
    c_zone_office: 'Office', c_zone_ware: 'Warehouse', c_zone_clean: 'Clean room', c_zone_out: 'Yard',
    gfx_high: 'Graphics: High', gfx_low: 'Graphics: Low',
    team_btn: 'Players: {n}', team_toast: 'Team of {n}: each player has a role, and every station says whose decision it is.', team_toast_solo: 'One player.',
    team_term_a: '{who} picks the instruments', team_term_b: '{who} picks the power system', team_term_c: '{who} picks the antenna',
    team_mc_a: '{who} decides the orbit, the rocket and the disposal', team_mc_b: '{who} decides the tests', team_mc_c: '{who} decides the ground stations',
    c_tab_contracts: 'Contracts', c_tab_shop: 'Parts shop', c_tab_stock: 'Stock', c_tab_log: 'Mission log',
    c_pay_v: 'Reward: {a} / {b} / {c} M by stars', c_cap: 'Budget cap {b} M', c_years: 'Must last {y} years', c_accept: 'Accept', c_active: 'Active contract',
    c_buy: 'Buy', c_owned: 'Owned: {n}', c_sell: 'Sell one (+{x})',
    c_shop_note: 'The satellite comes with a basic camera, small panels and a whip antenna. Instruments fit in two bays (A and B). Boxes arrive at the delivery zone in the warehouse.',
    c_stock_empty: 'No boxes yet.', c_in_stock: 'Boxes in the center', c_installed: 'Installed on the satellite', c_cash: 'Cash',
    c_fit_for: 'For this contract:',
    c_grant_h: 'Support grant', c_grant_p: 'Your cash is low. The agency board can approve one grant per contract so the program goes on.', c_grant_btn: 'Request grant (+{x})', t_grant: 'Grant approved: +{x} M',
    c_log_empty: 'No missions launched yet.', c_log_ok: '{stars} ★ — reward +{x} M', c_log_fail: 'Launch failed — no reward',
    p_terminal: 'Use the computer', p_pick: 'Pick up: {name}', p_shelf_place: 'Put the box on the shelf',
    p_install: 'Install {name} in {bay}', p_replace: 'Install {name} (replaces {old})', p_dup: 'That part is already installed', p_takeout: 'Take {name} out of {bay}',
    p_sat: 'Satellite', p_mc: 'Open Mission Control', p_need_contract: 'Accept a contract at the computer first',
    p_over: 'Over the budget cap by {x} M', p_cash: 'Not enough cash for the launch fee ({x} M). Ask for a grant at the computer, or use Restart mission.', p_full: 'Your hands are full',
    o_contract: 'Accept a contract at the office computer', o_order: 'Buy parts in the parts shop', o_collect: 'Carry the boxes from the delivery zone',
    o_install: 'Install the parts on the satellite in the clean room', o_launch: 'At launch control, choose the orbit and rocket, then launch',
    c_no_contract: 'No contract yet', c_contract_line: '{name} · cap {b} M',
    t_delivered: 'Delivery arrived at the loading bay', t_installed: 'Installed: {name}', t_returned: 'The old part was boxed up next to the satellite',
    t_accepted: 'New contract: {name}', t_reward: '{stars} ★ — reward +{x} M OMR', t_failed: 'Launch failed and the satellite was lost. No reward.',
    t_truck: 'The delivery truck is on its way', t_nocash: 'Not enough cash', t_sold: 'Box sold: +{x} M',
    s_title: 'MISSION READINESS', s_fee: 'Launch fee', s_parts: 'PARTS', s_plan: 'PLAN', c_back: 'Back to the Space Center',
    c_bay_a: 'bay A', c_bay_b: 'bay B',
    mc_title: 'MISSION CONTROL', mc_close: 'Close', mc_cap: 'Carries {kg} kg to this orbit', mc_rel: '{p} reliable', mc_ready: 'Ready for launch.', mc_after: 'After launch: {x} M',
    c_brief_none: 'Accept a contract to see NASA images of the mission area', c_brief_title: 'MISSION BRIEFING',
    c_restart: '↻ Restart mission', c_restart_h: 'Restart the mission?', c_restart_q: 'The space center starts again from the beginning: cash back to 50 M, and the contract, boxes and installed parts are cleared. Your stars and unlocked missions are kept.', c_restart_yes: 'Yes, restart', c_cancel: 'Cancel',
  },
});

const $ = (s) => document.querySelector(s);
// Contract rewards by stars. A 3-star build costs about 38–41 M (Aflaj), 43–50 (Khareef) and
// 50–58 (Dunes) including the launch, so good play makes a profit and weak play loses money.
const PAY = { aflaj: [12, 30, 55], khareef: [20, 45, 75], dunes: [30, 65, 100] };
const GRANT = 25; // support grant when cash runs low, once per contract
const START_CASH = 50;
const BASE_SAT = { inst1: 'basic', inst2: NO_INSTRUMENT, power: 'p1', comms: 'a1' };
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');   // center-phone.css

// Every part that can be bought, stored, carried and installed
const PARTS = {};
for (const x of INSTRUMENTS) PARTS[x.id] = { ...x, kind: 'inst' };
for (const x of POWER) PARTS[x.id] = { ...x, kind: 'power' };
for (const x of COMMS) PARTS[x.id] = { ...x, kind: 'comms' };
const nameKey = (id) => (PARTS[id]?.kind === 'inst' ? 'i_' + id : id);
const partName = (id) => t(nameKey(id));
const bayName = (slot) => t(slot === 'inst1' ? 'c_bay_a' : 'c_bay_b');

// ---------------------------------------------------------------------------
// Saved state (v2). An old save from the first version is converted once.
// ---------------------------------------------------------------------------
const KEY = 'majan-center-v2';
const OLD_KEY = 'majan-center-v1';
const fresh = () => ({
  v: 2, cash: START_CASH, contract: null, sat: { ...BASE_SAT },
  // The plan made at Mission Control. The sun-synchronous orbit needs a drag sail to meet the 25-year rule.
  plan: { orbit: 'sso', rocket: 'medium', ground: 'g1', eom: 'e1', test: 't0' },
  boxes: [], nextId: 1, inFlight: null, grantFor: null, log: [],
});
function fromV1(o) {
  const cam = ['basic', 'ms', 'hyper'];
  const part = (slot, level) => (slot === 'camera' ? cam[level] : slot === 'power' ? POWER[level]?.id : COMMS[level]?.id);
  const s = fresh();
  s.cash = typeof o.cash === 'number' ? o.cash : START_CASH;
  s.contract = o.contract || null;
  s.nextId = o.nextId || 1;
  if (o.installed) s.sat = { ...BASE_SAT, inst1: cam[o.installed.camera] || 'basic', power: POWER[o.installed.power]?.id || 'p1', comms: COMMS[o.installed.comms]?.id || 'a1' };
  s.boxes = (o.boxes || []).map((b) => {
    const { slot, level, ...rest } = b;
    return { ...rest, part: part(slot, level) };
  }).filter((b) => PARTS[b.part]);
  s.inFlight = o.inFlight ? { mission: o.inFlight.mission } : null;
  return s;
}
let S = fresh();
try {
  const s = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (s) S = { ...S, ...s, sat: { ...BASE_SAT, ...s.sat }, plan: { ...S.plan, ...s.plan } };
  else {
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
    if (old) S = fromV1(old);
  }
} catch { /* no saving */ }
S.boxes = S.boxes.filter((b) => PARTS[b.part]);
let restarting = false; // stops saving while the page reloads after Restart
const save = () => { if (restarting) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* ignore */ } };

const mission = () => MISSIONS.find((x) => x.id === S.contract) || null;
const designNow = () => ({ ...S.sat, ...S.plan });
// Paid at launch: the satellite bus, the rocket, and everything chosen at Mission Control
const launchFee = (d) => BUS.cost + d.rocket.cost + d.ground.cost + d.eom.cost + d.test.cost;

// ---------------------------------------------------------------------------
// Renderer, world, player
// ---------------------------------------------------------------------------
const canvas = $('#gl');
// Graphics quality: High = shadows + sharper image; Low for weak laptops and phones
const GFX_KEY = 'majan-gfx';
let gfx = 'high';
try { gfx = localStorage.getItem(GFX_KEY) || (isTouch ? 'low' : 'high'); } catch { /* default */ }
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, gfx === 'high' ? 1.5 : 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = gfx === 'high';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const fx = new FX(renderer, { samples: isTouch ? 0 : 4 });
fx.bloom.enabled = gfx === 'high';   // low graphics: no glow pass
fx.bloom.strength = 0.18;
fx.bloom.threshold = 1.0;
fx.bloom.radius = 0.5;
// Lighter film effects: a clean, realistic image
fx.final.uniforms.uGrain.value = 0.014;
fx.final.uniforms.uVignette.value = 0.22;
fx.final.uniforms.uCA.value = 0.0005;
const world = buildWorld(env);
world.scene.updateMatrixWorld(true); // so looking at things works before the first frame

// Paint the Majan logo on both sides of the delivery truck
world.ready.then(() => document.fonts.ready).then(() => {
  const tr = world.objects.truck;
  if (!tr) return;
  const c = document.createElement('canvas');
  c.width = 1040;
  c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#1f5fa8';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.font = '700 70px "Space Grotesk"';
  g.fillText('MAJAN SPACE CENTER', 520, 92);
  g.fillStyle = '#ffb547';
  g.font = '700 58px "IBM Plex Sans Arabic"';
  g.direction = 'rtl';
  g.fillText('مركز مجان الفضائي', 520, 172);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
  for (const side of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), mat);
    p.position.set(side * 1.275, 2.9, -4.2);
    p.rotation.y = side * Math.PI / 2;
    tr.add(p);
  }
});
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 2500);
world.scene.add(camera);
const player = new Player(camera, canvas, world.colliders);
player.place(world.anchors.start.x, world.anchors.start.z, 0);
player.onStep = () => sfx.step();
const raycaster = new THREE.Raycaster();
raycaster.far = 3.4;
const tut = createTutorial({
  S: () => S,
  held: () => held,
  terminalOpen: () => !$('#terminal').hidden,
  mcOpen: () => !$('#mc').hidden,
  player,
  scene: world.scene,
  sfx,
});

// ---------------------------------------------------------------------------
// Satellite on the integration stand (built like the main game's: satparts.js)
// ---------------------------------------------------------------------------
let satModel = null;
let parts = null;
const satReady = new GLTFLoader().loadAsync('assets/satellite.glb').then((g) => {
  satModel = g.scene;
  satModel.scale.setScalar(0.55);
  parts = new SatParts(satModel);
  // Integration fixture: a turntable plate on the pedestal and four struts up to the corners
  // of the body, clear of the instrument bays (the satellite used to float in mid-air)
  const steel = new THREE.MeshStandardMaterial({ color: 0x3c4552, metalness: 0.75, roughness: 0.35 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.06, 40), steel);
  plate.position.y = -1.6;
  satModel.add(plate);
  const up = new THREE.Vector3(0, 1, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const from = new THREE.Vector3(x * 0.55, -1.58, z * 0.55);
    const to = new THREE.Vector3(x * 0.6, -0.77, z * 0.8);
    const len = from.distanceTo(to);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, len, 10), steel);
    strut.position.copy(from).add(to).multiplyScalar(0.5);
    strut.quaternion.setFromUnitVectors(up, to.clone().sub(from).normalize());
    satModel.add(strut);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.16), steel);
    foot.position.set(to.x, -0.78, to.z);
    satModel.add(foot);
  }
  world.objects.satHolder.add(satModel);
  parts.apply(S.sat, false);
});
const applySatellite = (animate) => { parts?.apply(S.sat, animate); world.setPadRocket?.(S.plan.rocket); world.setStations?.(S.plan.ground); };

// ---------------------------------------------------------------------------
// Realism: shadows on every solid object, and reflections captured from the
// real building (inside) and the yard (outside) instead of a generic studio.
// ---------------------------------------------------------------------------
function shadowify(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m.transparent || !m.visible)) return; // glass and hit boxes
    if (mats.every((m) => m.isShaderMaterial)) return; // sky
    if (mats.some((m) => m.isMeshStandardMaterial)) o.castShadow = o.receiveShadow = true;
  });
}

function captureProbe(pos, size = 256) {
  const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
  const cube = new THREE.CubeCamera(0.1, 900, rt);
  cube.position.copy(pos);
  world.scene.add(cube);
  camera.visible = false; // don't capture the box in your hands
  cube.update(renderer, world.scene);
  camera.visible = true;
  world.scene.remove(cube);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromCubemap(rt.texture).texture;
  pm.dispose();
  rt.dispose();
  return tex;
}

Promise.all([world.ready, satReady]).then(() => document.fonts.ready).then(() => {
  world.setPadRocket?.(S.plan.rocket);
  shadowify(world.scene);
  world.scene.updateMatrixWorld(true);
  // Inside: two bounces so reflections themselves contain reflections
  for (let i = 0; i < 2; i++) world.scene.environment = captureProbe(new THREE.Vector3(0, 2.4, 0));
  const outside = captureProbe(new THREE.Vector3(10, 3, 26));
  const swapped = new Map();
  for (const root of world.outside) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const one = (m) => {
        if (!m.isMeshStandardMaterial) return m;
        if (!swapped.has(m)) { const c = m.clone(); c.envMap = outside; swapped.set(m, c); }
        return swapped.get(m);
      };
      o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
    });
  }
  // Prepare every material now, so the first look into each room does not stutter
  renderer.compile(world.scene, camera);
  warmUpLiftoff();
});

// ---------------------------------------------------------------------------
// Boxes
// ---------------------------------------------------------------------------
const texCache = {};
const cardboard = new THREE.MeshStandardMaterial({ color: 0xb98a55, roughness: 0.85 });
const boxGeo = new THREE.BoxGeometry(0.62, 0.45, 0.62);
const meshes = new Map(); // box id -> mesh
let held = null; // box record in hands

function specLine(id) {
  const p = PARTS[id];
  const bits = [`${p.mass} KG`];
  if (p.kind === 'inst') bits.push(`${p.power} W`, `${p.data} DATA`);
  if (p.kind === 'power') bits.push(`+${p.gen} W`, `${p.battery} WH`);
  if (p.kind === 'comms') bits.push(`${p.downlink} LINK`);
  return bits.join(' · ');
}

// Box labels are printed in both languages, so they never need redrawing
function boxMaterial(id) {
  if (!texCache[id]) {
    const side = new THREE.MeshStandardMaterial({ map: boxTex(PARTS[id].kind, tIn('en', nameKey(id)).toUpperCase(), tIn('ar', nameKey(id)), specLine(id)), roughness: 0.85 });
    texCache[id] = [side, side, cardboard, cardboard, side, side];
  }
  return texCache[id];
}

function spawnBoxMesh(b) {
  const m = new THREE.Mesh(boxGeo, boxMaterial(b.part));
  m.userData = { kind: 'box', id: b.id };
  m.position.set(b.x, b.y, b.z);
  m.rotation.y = b.ry || 0;
  m.castShadow = m.receiveShadow = true;
  world.scene.add(m);
  world.interactables.push(m);
  meshes.set(b.id, m);
  if (b.where === 'shelf') world.shelfSlots[b.shelf].box = b.id;
  return m;
}

function removeInteractable(m) {
  const i = world.interactables.indexOf(m);
  if (i >= 0) world.interactables.splice(i, 1);
}

const floorTaken = (x, z) => S.boxes.some((b) => b.where === 'floor' && Math.abs(b.x - x) < 0.55 && Math.abs(b.z - z) < 0.55);

function freeDeliverySpot() {
  const dz = world.anchors.delivery;
  for (let z = dz.z1 - 0.6; z > dz.z0 + 0.3; z -= 0.8) {
    for (let x = dz.x0 + 0.6; x < dz.x1 - 0.2; x += 0.8) if (!floorTaken(x, z)) return [x, z];
  }
  return [dz.x0 + 1 + Math.random() * 4, dz.z0 + 1 + Math.random() * 2];
}

// A free spot on the floor next to the satellite stand, for parts taken off the satellite
function freeStandSpot() {
  const c = world.anchors.stand;
  for (let ring = 0; ring < 3; ring++) {
    for (let k = 0; k < 10; k++) {
      const a = Math.PI * 0.5 + (k / 10) * Math.PI * 2;
      const r = 2.0 + ring * 0.75;
      const x = c.x + Math.cos(a) * r;
      const z = c.z + Math.sin(a) * r;
      if (!floorTaken(x, z) && !player._blocked(x, z)) return [x, z];
    }
  }
  return [c.x - 2.6, c.z + 3.2];
}

// Restore boxes from the save (a box that was in hands goes back to the floor)
for (const b of S.boxes) {
  if (b.where === 'held' || b.where === 'pending') {
    const [x, z] = freeDeliverySpot();
    Object.assign(b, { where: 'floor', x, y: 0.225, z });
  }
  spawnBoxMesh(b);
}

// ---------------------------------------------------------------------------
// Deliveries: the truck drives along the road, reverses to the loading door, the door
// rolls up, boxes slide in one by one, the door closes and the truck drives away.
// ---------------------------------------------------------------------------
let doorT = 0; // 0 closed, 1 open
let doorTarget = 0;
const ROAD_Z = 34;
const P_START = new THREE.Vector3(80, 0, ROAD_Z);
const P_TURN = new THREE.Vector3(13, 0, ROAD_Z);
const P_BEND = new THREE.Vector3(-1, 0, ROAD_Z - 2);
const DOCK = new THREE.Vector3(-1, 0, 12.75);
const P_EXIT = new THREE.Vector3(-1, 0, 95);
const DUR = { arriving: 4.5, reversing: 4.5, leaving: 5 };
const truck = { state: 'idle', t: 0, cargo: [], pending: [], beep: 0, unload: 0, wait: 0, stopEngine: null, collider: null };
const slides = []; // boxes sliding off the truck
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const bezier = (a, b, c, k) => a.clone().multiplyScalar((1 - k) ** 2).add(b.clone().multiplyScalar(2 * (1 - k) * k)).add(c.clone().multiplyScalar(k * k));

function order(id) {
  const p = PARTS[id];
  if (!p || p.cost <= 0) return;
  if (S.cash < p.cost) { sfx.error(); toast(t('t_nocash')); return; }
  S.cash -= p.cost;
  const b = { id: S.nextId++, part: id, where: 'pending' };
  S.boxes.push(b);
  save();
  sfx.cash();
  truck.pending.push(b);
  if (truck.state === 'idle') dispatchTruck();
  else if (truck.state === 'arriving' || truck.state === 'reversing') truck.cargo.push(...truck.pending.splice(0));
  renderAll();
}

function dispatchTruck() {
  truck.cargo = truck.pending.splice(0);
  truck.state = 'arriving';
  truck.t = 0;
  truck.stopEngine = sfx.engine(DUR.arriving + DUR.reversing);
  toast(t('t_truck'));
}

function placeTruck(pos, ry) {
  const o = world.objects.truck;
  if (!o) return;
  const delta = pos.clone().sub(o.position);
  const fwd = new THREE.Vector3(-Math.sin(ry), 0, -Math.cos(ry));
  const roll = Math.sign(delta.dot(fwd)) * delta.length() / 0.5;
  for (const w of world.objects.truckWheels) if (w) w.rotation.x -= roll;
  o.position.copy(pos);
  o.rotation.y = ry;
}

function updateTruck(dt) {
  truck.t += dt;
  const s = truck.state;
  if (s === 'arriving') {
    const k = Math.min(1, truck.t / DUR.arriving);
    placeTruck(P_START.clone().lerp(P_TURN, easeOut(k)), Math.PI / 2);
    if (k >= 1) { truck.state = 'reversing'; truck.t = 0; }
  } else if (s === 'reversing') {
    const k = Math.min(1, truck.t / DUR.reversing);
    const e = easeInOut(k);
    placeTruck(bezier(P_TURN, P_BEND, DOCK, e), Math.PI / 2 + (Math.PI / 2) * easeInOut(Math.min(1, k * 1.35)));
    truck.beep -= dt;
    if (truck.beep <= 0 && k < 0.97) { sfx.beep(); truck.beep = 0.6; }
    if (k >= 1) {
      truck.state = 'docked';
      truck.t = 0;
      truck.unload = 0.6;
      truck.wait = 0;
      truck.stopEngine?.();
      truck.collider = { x0: -2.4, x1: 0.4, z0: 12.6, z1: 21.6 };
      world.colliders.push(truck.collider);
      doorTarget = 1;
      sfx.door();
    }
  } else if (s === 'docked') {
    if (doorT > 0.9 && truck.cargo.length) {
      truck.unload -= dt;
      if (truck.unload <= 0) {
        truck.unload = 0.45;
        const b = truck.cargo.shift();
        const [x, z] = freeDeliverySpot();
        Object.assign(b, { where: 'floor', x, y: 0.225, z, ry: (Math.random() - 0.5) * 0.4 });
        const m = spawnBoxMesh(b);
        slides.push({ mesh: m, from: new THREE.Vector3(-1 + (Math.random() - 0.5), 1.15, 12.4), to: new THREE.Vector3(x, 0.225, z), t: 0 });
        sfx.place();
        if (!truck.cargo.length) { save(); sfx.ding(); toast(t('t_delivered')); renderAll(); }
      }
    }
    if (!truck.cargo.length && !slides.length) {
      truck.wait += dt;
      // Close the door once the player isn't standing in the doorway or outside
      if (truck.wait > 1.5 && doorTarget === 1 && player.pos.z < 11.3) { doorTarget = 0; sfx.door(); }
      if (doorTarget === 0 && doorT < 0.05) {
        world.colliders.splice(world.colliders.indexOf(truck.collider), 1);
        truck.state = 'leaving';
        truck.t = 0;
        truck.stopEngine = sfx.engine(DUR.leaving);
      }
    }
  } else if (s === 'leaving') {
    const k = Math.min(1, truck.t / DUR.leaving);
    placeTruck(DOCK.clone().lerp(P_EXIT, k * k), Math.PI);
    if (k >= 1) {
      truck.state = 'idle';
      placeTruck(P_START.clone(), Math.PI / 2);
      if (truck.pending.length) dispatchTruck();
    }
  }
  for (let i = slides.length - 1; i >= 0; i--) {
    const sl = slides[i];
    sl.t = Math.min(1, sl.t + dt / 0.55);
    const p = sl.from.clone().lerp(sl.to, easeOut(sl.t));
    p.y += Math.sin(sl.t * Math.PI) * 0.25;
    sl.mesh.position.copy(p);
    if (sl.t >= 1) slides.splice(i, 1);
  }
}

function updateDoor(dt) {
  doorT += (doorTarget - doorT) * Math.min(1, dt * 2.2);
  world.objects.door.position.y = doorT * 4.4;
  world.objects.doorCollider.x1 = doorT > 0.5 ? -4 : 2; // walkable when open
}

// ---------------------------------------------------------------------------
// Carrying, shelving, installing
// ---------------------------------------------------------------------------
function holdMesh(m) {
  camera.add(m);
  m.position.set(0.32, -0.42, -0.85);
  m.rotation.set(0.05, -0.25, 0);
  m.scale.setScalar(0.8);
}

function pickUp(id) {
  if (held) { toast(t('p_full')); return; }
  const b = S.boxes.find((x) => x.id === id);
  const m = meshes.get(id);
  if (!b || !m) return;
  if (b.where === 'shelf') world.shelfSlots[b.shelf].box = null;
  b.where = 'held';
  removeInteractable(m);
  holdMesh(m);
  held = b;
  sfx.pickup();
  save();
  renderAll();
}

function putDown(target) {
  if (!held) return;
  const b = held;
  const m = meshes.get(b.id);
  camera.remove(m);
  world.scene.add(m);
  m.scale.setScalar(1);
  if (target) { // shelf slot
    Object.assign(b, { where: 'shelf', shelf: world.shelfSlots.indexOf(target), x: target.pos.x, y: target.pos.y, z: target.pos.z, ry: 0 });
    target.box = b.id;
  } else {
    const f = player.forward().setY(0).normalize();
    let x = player.pos.x + f.x * 1.1;
    let z = player.pos.z + f.z * 1.1;
    if (player._blocked(x, z)) { x = player.pos.x; z = player.pos.z; }
    Object.assign(b, { where: 'floor', x, y: 0.225, z, ry: player.yaw });
  }
  m.position.set(b.x, b.y, b.z);
  m.rotation.set(0, b.ry || 0, 0);
  world.interactables.push(m);
  held = null;
  sfx.place();
  save();
  renderAll();
}

/** Where a part would go on the satellite, and what it would replace. */
function installTarget(id) {
  const p = PARTS[id];
  if (p.kind === 'power') return S.sat.power === id ? { dup: true } : { slot: 'power', old: S.sat.power };
  if (p.kind === 'comms') return S.sat.comms === id ? { dup: true } : { slot: 'comms', old: S.sat.comms };
  if (S.sat.inst1 === id || S.sat.inst2 === id) return { dup: true };
  if (S.sat.inst1 === NO_INSTRUMENT) return { slot: 'inst1', old: NO_INSTRUMENT };
  if (S.sat.inst2 === NO_INSTRUMENT) return { slot: 'inst2', old: NO_INSTRUMENT };
  // Both bays are full: replace the instrument that suits the contract least
  const m = mission();
  const score = (x) => (m ? instrumentFit(m, x) : instrument(x).data);
  return score(S.sat.inst1) < score(S.sat.inst2) ? { slot: 'inst1', old: S.sat.inst1 } : { slot: 'inst2', old: S.sat.inst2 };
}

// The built-in small panels and whip antenna are thrown away when replaced; everything else comes back as a box
const keepsBox = (id) => id && id !== NO_INSTRUMENT && (PARTS[id].kind === 'inst' || PARTS[id].cost > 0);

function install() {
  if (!held) return;
  const b = held;
  const tgt = installTarget(b.part);
  if (tgt.dup) { sfx.error(); toast(t('p_dup')); return; }
  S.sat[tgt.slot] = b.part;
  // The box is used up
  const m = meshes.get(b.id);
  camera.remove(m);
  meshes.delete(b.id);
  S.boxes = S.boxes.filter((x) => x.id !== b.id);
  held = null;
  if (keepsBox(tgt.old)) {
    const [x, z] = freeStandSpot();
    const nb = { id: S.nextId++, part: tgt.old, where: 'floor', x, y: 0.225, z, ry: Math.random() - 0.5 };
    S.boxes.push(nb);
    spawnBoxMesh(nb);
    toast(t('t_returned'));
  }
  applySatellite(true);
  sfx.snap();
  setTimeout(() => sfx.good(), 120);
  toast(t('t_installed', { name: partName(b.part) }));
  save();
  renderAll();
}

/** Empty hands at the satellite: take the instrument out of bay B (bay A is only ever swapped). */
function takeOut() {
  if (held || S.sat.inst2 === NO_INSTRUMENT) return;
  const id = S.sat.inst2;
  S.sat.inst2 = NO_INSTRUMENT;
  const b = { id: S.nextId++, part: id, where: 'held' };
  S.boxes.push(b);
  holdMesh(spawnBoxMesh({ ...b, x: 0, y: 0, z: 0 }));
  removeInteractable(meshes.get(b.id));
  held = b;
  applySatellite(false);
  sfx.pickup();
  save();
  renderAll();
}

// ---------------------------------------------------------------------------
// Mission Control: choose the orbit and the rocket, check the forecast, launch
// ---------------------------------------------------------------------------
function launchCheck() {
  const m = mission();
  if (!m) return { ok: false, msg: t('p_need_contract') };
  const d = computeDesign(designNow(), m);
  const fee = launchFee(d);
  const base = { d, m, fee };
  if (!d.insts.length) return { ...base, ok: false, msg: t('tip_none') };
  if (d.tooHeavy) return { ...base, ok: false, msg: t('tip_heavy') };
  if (!d.compliant) return { ...base, ok: false, msg: t('tip_deorbit', { y: fmt(d.disposal) }) };
  if (d.overBudget) return { ...base, ok: false, msg: t('p_over', { x: fmt(d.totalCost - m.budget) }) };
  if (S.cash < fee) return { ...base, ok: false, msg: t('p_cash', { x: fmt(fee) }) };
  return { ...base, ok: true, msg: t('mc_ready') };
}

function doLaunch() {
  const c = launchCheck();
  if (!c.ok) { sfx.error(); toast(c.msg); return; }
  S.cash -= c.fee;
  const d = designNow();
  S.inFlight = { mission: c.m.id, design: d };
  save();
  const q = new URLSearchParams({ center: '1', mission: c.m.id, ...d });
  if (teamSize() > 1) q.set('team', String(teamSize()));
  // Watch the liftoff, then fly the mission at the console, here in the center
  startLiftoff(() => openConsole(q));
}

// ---------------------------------------------------------------------------
// Liftoff as a short film, in three shots from outside: the whole pad during the
// countdown, a low shot by the flame trench at ignition, then a long lens that
// follows the climb. The player does not move; the camera is put back afterwards.
// ---------------------------------------------------------------------------
let lift = null;
const LIFT_END = 11.6;
/** Flames, light and smoke for the liftoff. Made once: see warmUpLiftoff(). */
let liftKit = null;
function liftoffKit() {
  if (liftKit) return liftKit;
  const glowMat = (r, g, b, o) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  // Exhaust: a white-hot core inside an orange flame inside a long faint plume
  const flames = [
    new THREE.Mesh(new THREE.ConeGeometry(0.55, 6, 16, 1, true), glowMat(4, 3.4, 2.4, 0.95)),
    new THREE.Mesh(new THREE.ConeGeometry(1.15, 11, 18, 1, true), glowMat(3, 1.5, 0.45, 0.8)),
    new THREE.Mesh(new THREE.ConeGeometry(1.9, 22, 18, 1, true), glowMat(1.6, 0.7, 0.25, 0.28)),
  ];
  flames.forEach((m, i) => { m.rotation.x = Math.PI; m.position.y = -[3, 5.5, 11][i] - 0.4; m.visible = false; });
  // The light stays in the scene at zero strength: adding a light later would rebuild every shader
  const glow = new THREE.PointLight(0xffa040, 0, 140, 1.3);
  world.scene.add(glow);
  // Unlit smoke: lit see-through puffs are costly, and slow laptops dropped frames here
  const geo = new THREE.SphereGeometry(1, 10, 7);
  const puff = (colour) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; world.scene.add(m); return m; };
  const ground = [];
  for (let i = 0; i < 30; i++) {
    const m = puff(i % 3 ? 0xece4d6 : 0xd9cdb8);
    const ang = (i / 30) * Math.PI * 2 + Math.random() * 0.3;
    m.userData = { dir: new THREE.Vector3(Math.cos(ang), 0.05 + Math.random() * 0.22, Math.sin(ang)), speed: 0.6 + Math.random() * 0.7, size: 0.7 + Math.random() * 0.8 };
    ground.push(m);
  }
  const trail = [];
  for (let i = 0; i < 46; i++) trail.push(puff(0xf1ece2));
  liftKit = { flames, glow, ground, trail };
  return liftKit;
}

/** Draw the launch site and the liftoff effects once, unseen, so nothing is prepared mid-film. */
function warmUpLiftoff() {
  const rocket = world.padRocket?.();
  if (!rocket) return;
  const K = liftoffKit();
  K.flames.forEach((m) => { rocket.add(m); m.visible = true; });
  for (const m of [...K.ground, ...K.trail]) { m.visible = true; m.position.copy(rocket.position); m.material.opacity = 0.01; }
  renderer.compile(world.scene, camera);
  const cam = camera.clone();
  const B = rocket.position;
  for (const [x, y, z] of [[B.x - 40, 4, B.z - 24], [B.x - 24, 2, B.z - 9], [B.x - 96, 12, B.z + 62], [0, 30, 60]]) {
    cam.position.set(x, y, z);
    cam.lookAt(B.x, B.y + 8, B.z);
    cam.updateMatrixWorld();
    renderer.render(world.scene, cam);
  }
  K.flames.forEach((m) => { m.visible = false; m.removeFromParent(); });
  for (const m of [...K.ground, ...K.trail]) { m.visible = false; m.material.opacity = 0; }
}

function startLiftoff(done) {
  const rocket = world.padRocket?.();
  player.enabled = false;
  document.exitPointerLock?.();
  $('#prompt').hidden = true;
  if (!rocket) { sfx.go(); done(); return; }
  const K = liftoffKit();
  K.flames.forEach((m) => { rocket.add(m); m.visible = false; });
  K.glow.position.copy(rocket.position).add(new THREE.Vector3(0, 2, 0));
  for (const m of [...K.ground, ...K.trail]) { m.visible = false; m.material.opacity = 0; }
  const el = document.createElement('div');
  el.id = 'liftoff';
  document.body.appendChild(el);
  document.body.classList.add('cine');
  lift = {
    t: 0, rocket, y0: rocket.position.y, base: rocket.position.clone(), flames: K.flames, glow: K.glow, ground: K.ground, trail: K.trail,
    nextTrail: 0, trailI: 0, el, done, said: new Set(), stopRumble: null, fov: camera.fov,
  };
}

function endLiftoff() {
  const L = lift;
  L.stopRumble?.();
  L.flames.forEach((m) => { m.visible = false; m.removeFromParent(); });
  for (const m of [...L.ground, ...L.trail]) m.visible = false;
  L.glow.intensity = 0;
  L.rocket.position.y = L.y0;
  camera.fov = L.fov;
  camera.updateProjectionMatrix();
  document.body.classList.remove('cine');
  L.el.remove();
  lift = null;
  L.done();
}

function updateLiftoff(dt) {
  if (!lift) return;
  const L = lift;
  L.t += dt;
  const time = L.t;
  // Countdown, then ignition at 3 s and liftoff at 3.6 s
  for (const [at, key, text] of [[0, 'c3', fmt(3)], [1, 'c2', fmt(2)], [2, 'c1', fmt(1)], [3, 'go', t('st_liftoff')]]) {
    if (time >= at && !L.said.has(key)) {
      L.said.add(key);
      L.el.textContent = text;
      L.el.className = '';
      void L.el.offsetWidth;
      L.el.className = 'pop';
      if (key === 'go') { sfx.go(); L.stopRumble = sfx.rumble(9); } else sfx.beep();
    }
  }
  const climb = Math.max(0, time - 3.6);
  const B = L.base;
  L.rocket.position.y = L.y0 + 0.5 * 7 * climb * climb;
  const nozzle = L.rocket.position.y - 1.5;
  if (time >= 3) {
    const burn = Math.min(1, (time - 3) / 0.5);
    L.flames.forEach((m, i) => { m.visible = true; m.scale.set(burn, burn * (0.85 + Math.random() * 0.3), burn); if (i === 2) m.material.opacity = 0.28 * burn; });
    L.glow.intensity = 8000 * burn * (0.8 + Math.random() * 0.4);
    L.glow.position.y = nozzle;
    // Smoke rolls out along the ground from the flame trench, then thins as the rocket leaves
    const k = Math.min(1, (time - 3) / 4.5);
    for (const m of L.ground) {
      const u = m.userData;
      m.visible = true;
      m.position.copy(B).setY(L.y0 - 1).addScaledVector(u.dir, (4 + k * 17) * u.speed);
      m.scale.setScalar((2.2 + k * 6.5) * u.size);
      m.material.opacity = 0.3 * (1 - k * 0.5) * Math.min(1, (time - 3) / 0.6);
    }
    // A column of smoke left behind on the way up
    if (climb > 0 && time >= L.nextTrail) {
      L.nextTrail = time + 0.07;
      const m = L.trail[L.trailI++ % L.trail.length];
      m.visible = true;
      m.position.set(B.x + (Math.random() - 0.5) * 1.2, nozzle - 6, B.z + (Math.random() - 0.5) * 1.2);
      m.userData.born = time;
    }
    for (const m of L.trail) {
      if (!m.visible) continue;
      const age = time - m.userData.born;
      m.scale.setScalar(2.4 + age * 2.4);
      m.material.opacity = Math.max(0, 0.36 - age * 0.1);
    }
  }

  // The three shots
  const look = new THREE.Vector3(B.x, L.rocket.position.y + 5, B.z);
  let pos; let fov; let shake = 0;
  if (time < 3) {
    const u = time / 3;
    pos = new THREE.Vector3(B.x - 40 + 6 * u, 4 + 1.2 * u, B.z - 24 + 4 * u);
    look.y = L.y0 + 10;
    fov = 44 - 6 * u;
  } else if (time < 7.4) {
    pos = new THREE.Vector3(B.x - 24, 2.0, B.z - 9);
    fov = 64;
    shake = 0.22 * Math.min(1, (time - 3) / 0.4) * Math.max(0.15, 1 - climb / 4.5);
  } else {
    pos = new THREE.Vector3(B.x - 96, 12, B.z + 62);
    look.y = L.rocket.position.y - 4;
    fov = 30 - 6 * Math.min(1, (time - 7.4) / 4);
    shake = 0.03;
  }
  if (shake) pos.add(new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
  camera.position.copy(pos);
  camera.lookAt(look);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  if (time > 5.4) L.el.style.opacity = '0';        // the word has been read; let the picture have the screen
  if (time >= LIFT_END) endLiftoff();
}

function openMC() {
  if (!mission()) { sfx.error(); toast(t('p_need_contract')); return; }
  player.enabled = false;
  document.exitPointerLock?.();
  $('#mc').hidden = false;
  sfx.select();
  renderMC();
}
function closeMC() {
  $('#mc').hidden = true;
  sfx.click();
  player.enabled = true;
  lockPointer();
}
$('#mc-close').addEventListener('click', closeMC);
$('#mc-launch').addEventListener('click', () => { closeMCQuiet(); doLaunch(); });
function closeMCQuiet() { $('#mc').hidden = true; }

function designWarning(d, f, m) {
  if (!f.alive) return t('tip_power', { h: fmt(Math.round(f.deadAt)) });
  if (d.lifeYears < m.years) return d.lifeLimit === 'orbit' ? t('tip_life_orbit', { n: fmt(m.years) }) : t('tip_life_battery', { y: fmt(d.batYears) });
  if (d.fit < 0.9) return t('tip_fit');
  if (d.capture > d.downlink && f.coverage < 0.9) return t('tip_link');
  if (f.coverage < 0.9) return t('tip_cam');
  if (d.margin > 0.85) return t('tip_margin', { p: pct(d.margin) });
  return null;
}

function optButton(sel, title, sub, badge, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'mc-opt' + (sel ? ' sel' : '');
  b.innerHTML = `<b>${title}</b><span>${sub}</span>${badge || ''}`;
  b.addEventListener('click', () => { sfx.click(); onClick(); });
  return b;
}

function meterRow(label, value, frac, state) {
  const w = Math.max(0.02, Math.min(1, frac)) * 100;
  return `<div class="mc-meter ${state || ''}"><div class="row"><span>${label}</span><span class="val">${value}</span></div><div class="track"><i style="width:${w}%"></i></div></div>`;
}

/** The eight things the challenge asks a mission designer to decide, each with its state. */
function eightStatus(d, f, m) {
  const st = (key, ok, warn = false) => ({ key, ok, warn: !ok && warn });
  return [
    st('e8_obj', !!m),
    st('e8_inst', d.insts.length > 0 && d.fit >= 0.9, d.insts.length > 0),
    st('e8_rocket', !d.tooHeavy && d.margin <= 0.85, !d.tooHeavy),
    st('e8_budget', !d.overBudget),
    st('e8_power', f.alive && d.avgUse <= d.avgGen, f.alive),
    st('e8_mass', !d.tooHeavy),
    st('e8_comms', d.capture <= d.downlink, true),
    st('e8_orbit', d.compliant && d.lifeYears >= m.years, d.compliant),
  ];
}

// Designs tried at Mission Control for the current contract: the trade study and the maturity level
const triedDesigns = new Map();
let triedFor = null;
let reviewInfo = { cml: 1 };
function openReviewMC() {
  const m = mission();
  if (!m) return;
  sfx.select();
  openReview({ layer: $('#info-layer'), el: $('#info'), mission: m, design: designNow(), tried: triedDesigns, cml: reviewInfo.cml, sound: (k) => sfx[k]?.() });
}

// The mission console: after liftoff the orbit phase runs in a frame inside the center
let consoleOpen = false;
function openConsole(query) {
  consoleOpen = true;
  $('#mc').hidden = true;
  $('#console').hidden = false;
  $('#console-frame').src = `index.html?${query}&embed=1`;
}
function closeConsole() {
  if (!consoleOpen) return;
  consoleOpen = false;
  $('#console').hidden = true;
  $('#console-frame').src = 'about:blank';
  profile.reload();            // the console recorded stars and score in the saved progress
  collectResult();
  applySatellite(false);
  renderAll();
  // The mouse was released for the liftoff: ask for a click to take it again (phones just carry on)
  if (isTouch || dragLook) player.enabled = true;
  else { player.enabled = false; $('#start').hidden = false; $('#btn-start').textContent = t('c_continue'); }
}
addEventListener('message', (e) => { if (e.origin === location.origin && e.data && e.data.type === 'majan-mission-done') closeConsole(); });

function renderMC() {
  const c = launchCheck();
  const { d, m } = c;
  if (!d) return;
  const f = forecast(d, m);
  // The eight decisions, the designs tried so far, and the design review button
  $('#mc-eight').innerHTML = eightStatus(d, f, m).map((e) => `<span class="${e.ok ? 'ok' : e.warn ? 'warn' : 'bad'}"><i></i>${t(e.key)}</span>`).join('');
  if (triedFor !== m.id) { triedDesigns.clear(); triedFor = m.id; }
  const reqs = requirements(d, f, m);
  const design = designNow();
  if (d.insts.length) {
    triedDesigns.set(DESIGN_KEYS.map((k) => design[k]).join('|'), {
      cost: d.totalCost, value: f.value, feasible: reqs.filter((r) => r.hard).every((r) => r.ok) && f.alive,
      arch: [design.orbit, ...[design.inst1, design.inst2].sort()].join('|'),
    });
  }
  const compared = new Set([...triedDesigns.values()].filter((x) => x.feasible).map((x) => x.arch)).size;
  reviewInfo = { cml: d.insts.length ? maturity(reqs, compared) : 1 };
  $('#mc-review').textContent = `${t('review_btn')} · ${t('req_count', { a: fmt(reqs.filter((r) => r.ok).length), b: fmt(reqs.length) })}`;
  $('#mc-contract').textContent = t('c_contract_line', { name: t('m_' + m.id), b: fmt(m.budget) });
  const orbits = $('#mc-orbits');
  orbits.innerHTML = '';
  for (const o of ORBITS) {
    orbits.appendChild(optButton(S.plan.orbit === o.id, t('o_' + o.id),
      [t('o_alt', { km: fmt(o.alt) }), t('o_sunlit', { p: pct(o.sun) }), t('o_life', { y: fmt(o.lifeY) })].join(sep()),
      '', () => { S.plan.orbit = o.id; save(); renderAll(); renderMC(); }));
  }
  const rockets = $('#mc-rockets');
  rockets.innerHTML = '';
  for (const r of ROCKETS) {
    const cap = Math.round(r.cap * d.orb.capF);
    const heavy = d.mass > cap;
    rockets.appendChild(optButton(S.plan.rocket === r.id, t('rocket_' + r.id),
      [`${fmt(r.cost)} ${t('u_m')}`, t('mc_cap', { kg: fmt(cap) }), t('mc_rel', { p: pct(r.rel) })].join(sep()),
      heavy ? `<em class="bad">${t('rk_too_heavy', { kg: fmt(d.mass) })}</em>` : '',
      () => { S.plan.rocket = r.id; save(); world.setPadRocket?.(r.id); renderAll(); renderMC(); }));
  }
  const setPlan = (k, v) => { S.plan[k] = v; save(); renderAll(); renderMC(); };
  const money = (x) => (x ? `${fmt(x)} ${t('u_m')}` : '');
  const eoms = $('#mc-eom');
  eoms.innerHTML = '';
  for (const e of EOM) {
    const y = disposalYears(d.orb, e);
    const ok = y <= DISPOSAL_LIMIT;
    eoms.appendChild(optButton(S.plan.eom === e.id, t(e.id), [money(e.cost), e.mass ? `${fmt(e.mass)} ${t('u_kg')}` : ''].filter(Boolean).join(sep()),
      `<em class="${ok ? 'good' : 'bad'}">${t(ok ? 'eom_ok' : 'eom_bad', { y: fmt(y) })}</em>`, () => setPlan('eom', e.id)));
  }
  const grounds = $('#mc-ground');
  grounds.innerHTML = '';
  for (const gs of GROUND) {
    const f = gs.f[d.orb.id];
    grounds.appendChild(optButton(S.plan.ground === gs.id, t(gs.id), [money(gs.cost), t(gs.id + '_d')].filter(Boolean).join(sep()),
      gs.id === 'g1' ? '' : `<em class="${f > 1 ? 'good' : 'bad'}">${f > 1 ? t('g_factor', { x: fmt(f, 1) }) : t('g_nohelp')}</em>`, () => setPlan('ground', gs.id)));
  }
  const tests = $('#mc-tests');
  tests.innerHTML = '';
  for (const x of TESTS) {
    tests.appendChild(optButton(S.plan.test === x.id, t(x.id), [money(x.cost), t(x.id + '_d')].filter(Boolean).join(sep()),
      `<em class="${x.fault <= 0.15 ? 'good' : 'bad'}">${t('test_risk', { p: pct(x.fault) })}</em>`, () => setPlan('test', x.id)));
  }
  $('#mc-meters').innerHTML = [
    meterRow(t('bar_budget'), `${fmt(d.totalCost)} / ${fmt(m.budget)}`, d.totalCost / m.budget, d.overBudget ? 'bad' : d.totalCost > m.budget * 0.92 ? 'warn' : ''),
    meterRow(t('bar_power'), t('bar_power_v', { use: fmt(Math.round(d.avgUse)), avg: fmt(d.avgGen) }), d.avgUse / Math.max(1, d.avgGen) / 1.4, !f.alive ? 'bad' : d.avgUse > d.avgGen ? 'warn' : ''),
    meterRow(t('bar_mass'), t('bar_mass_v', { m: fmt(d.mass), c: fmt(d.capacity) }), d.mass / Math.max(1, d.capacity), d.tooHeavy ? 'bad' : d.margin > 0.85 ? 'warn' : ''),
    meterRow(t('bar_data'), t('bar_data_v', { c: fmt(d.capture, 1), s: fmt(d.downlink, 1) }), d.capture / 16, d.capture > d.downlink ? 'warn' : ''),
    meterRow(t('bar_fit'), d.insts.length ? t('fit_' + (d.fit >= 1.15 ? 'good' : d.fit >= 0.9 ? 'ok' : 'poor')) : t('i_none'), d.fit / 1.5, d.fit < 0.9 ? 'warn' : ''),
    meterRow(t('bar_life'), t('bar_life_v', { y: fmt(d.lifeYears), n: fmt(m.years) }), d.lifeYears / (m.years * 2), d.lifeYears < m.years ? 'bad' : ''),
  ].join('');
  $('#mc-stars').innerHTML = [0, 1, 2].map((k) => `<span class="${k < f.stars ? '' : 'off'}">★</span>`).join('');
  $('#mc-cov').textContent = pct(f.coverage);
  $('#mc-odds').textContent = `${t('launch_odds', { p: pct(1 - d.failChance) })}${sep()}${t('fault_odds', { p: pct(d.faultChance) })}`;
  $('#mc-fee').textContent = `${t('s_fee')}: ${fmt(c.fee)} ${t('u_m')}${sep()}${t('c_cash')}: ${fmt(S.cash)} ${t('u_m')}`;
  // Launch is allowed with a weak design, but say what will go wrong (same advice as the main game)
  const warn = c.ok ? designWarning(d, f, m) : null;
  const tip = $('#mc-tip');
  tip.textContent = c.ok ? warn || t('tip_good') : c.msg;
  tip.className = 'mc-tip ' + (!c.ok ? 'bad' : warn ? 'warn' : 'ok');
  $('#mc-launch').disabled = !c.ok;
}

// A mission has ended (called at start-up, and when the mission console closes)
function collectResult() {
try {
  const r = JSON.parse(localStorage.getItem('majan-center-result') || 'null');
  if (r && S.inFlight && r.mission === S.inFlight.mission) {
    localStorage.removeItem('majan-center-result');
    S.sat = { ...BASE_SAT }; // the satellite is in space now (or lost); a new bus arrives
    if (r.ok) {
      const x = PAY[r.mission][Math.max(0, r.stars - 1)];
      S.cash += x;
      S.contract = null;
      S.grantFor = null;
      S.log.push({ mission: r.mission, ok: true, stars: r.stars, reward: x, design: S.inFlight.design || null });
      setTimeout(() => { sfx.cash(); toast(t('t_reward', { stars: fmt(r.stars), x: fmt(x) })); }, 1200);
    } else {
      S.log.push({ mission: r.mission, ok: false, stars: 0, reward: 0, design: S.inFlight.design || null });
      setTimeout(() => { sfx.bad(); toast(t('t_failed')); }, 1200);
    }
    S.inFlight = null;
    save();
  }
} catch { /* ignore */ }
}
collectResult();

// ---------------------------------------------------------------------------
// Looking at things
// ---------------------------------------------------------------------------
let target = null;
function findTarget() {
  camera.updateMatrixWorld();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(world.interactables, false);
  // Invisible zones (shelf slots, the satellite stand) can sit in front of a box, which
  // made boxes on shelves or next to the satellite impossible to pick up. Rank what you
  // look at by what you can do with it, then by distance.
  const rank = (u) => {
    if (u.kind === 'shelf') return held && !u.slot.box ? 0 : 99; // 99 = ignore
    if (u.kind === 'box') return held ? 3 : 0;
    if (u.kind === 'satellite') return held ? 0 : 2;
    return 1; // terminal, launch console
  };
  let best = null;
  let bestRank = 99;
  for (const h of hits) {
    const r = rank(h.object.userData);
    if (r < bestRank) { best = h.object; bestRank = r; }
  }
  return best;
}

function promptFor(obj) {
  if (!obj) return null;
  const u = obj.userData;
  const k = '<kbd>E</kbd>';
  if (u.kind === 'terminal') return `${k}${t('p_terminal')}`;
  if (u.kind === 'box') {
    if (held) return `<span class="bad">${t('p_full')}</span>`;
    const b = S.boxes.find((x) => x.id === u.id);
    return b ? `${k}${t('p_pick', { name: partName(b.part) })}` : null;
  }
  if (u.kind === 'shelf') {
    if (held && !u.slot.box) return `${k}${t('p_shelf_place')}`;
    return null;
  }
  if (u.kind === 'satellite') {
    if (held) {
      const tg = installTarget(held.part);
      if (tg.dup) return `<span class="bad">${t('p_dup')}</span>`;
      if (tg.old !== NO_INSTRUMENT) return `${k}${t('p_replace', { name: partName(held.part), old: partName(tg.old) })}`;
      return `${k}${t('p_install', { name: partName(held.part), bay: bayName(tg.slot) })}`;
    }
    if (S.sat.inst2 !== NO_INSTRUMENT) return `${k}${t('p_takeout', { name: partName(S.sat.inst2), bay: bayName('inst2') })}`;
    return `${t('p_sat')}: ${[S.sat.inst1, S.sat.power, S.sat.comms].map(partName).join(sep())}`;
  }
  if (u.kind === 'launch') return S.contract ? `${k}${t('p_mc')}` : `<span class="bad">${t('p_need_contract')}</span>`;
  if (u.kind === 'board') return `${k}${t('p_board')}`;
  return null;
}

function interact() {
  unlockAudio();
  const obj = target;
  if (!obj) return;
  const u = obj.userData;
  if (u.kind === 'terminal') openTerminal('contracts');
  else if (u.kind === 'box') pickUp(u.id);
  else if (u.kind === 'shelf' && held && !u.slot.box) putDown(u.slot);
  else if (u.kind === 'satellite') { if (held) install(); else takeOut(); }
  else if (u.kind === 'launch') openMC();
  else if (u.kind === 'board') openBoard();
}

const overlayOpen = () => !$('#terminal').hidden || !$('#mc').hidden || !$('#info-layer').hidden || consoleOpen;
$('#mc-review').addEventListener('click', openReviewMC);
$('#info-layer').addEventListener('click', (e) => { if (e.target === $('#info-layer')) $('#rv-close')?.click(); });
addEventListener('keydown', (e) => {
  if (consoleOpen) return;
  if (!$('#info-layer').hidden) { if (e.code === 'Escape') $('#rv-close')?.click(); return; }
  if (!$('#terminal').hidden) { if (e.code === 'Escape') closeTerminal(); return; }
  if (!$('#mc').hidden) { if (e.code === 'Escape') closeMC(); return; }
  if (e.code === 'Escape' && dragLook && player.enabled) { player.enabled = false; $('#start').hidden = false; $('#btn-start').textContent = t('c_continue'); return; }
  if (!player.enabled) return;
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyQ' && held) putDown(null);
});
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0 && player.locked) interact();
});
$('#t-use').addEventListener('click', interact);
$('#t-drop').addEventListener('click', () => held && putDown(null));

// --- Phones -----------------------------------------------------------------------------------
// The top bar keeps the money and the stars; the other buttons are listed in a menu
const PHONE_MENU = ['#btn-tut', '#btn-restart', '#btn-team', '#btn-gfx', '#btn-sound', '#btn-lang'];
function openPhoneMenu() {
  const m = $('#phone-menu');
  m.innerHTML = '';
  for (const sel of PHONE_MENU) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-btn';
    b.textContent = $(sel).textContent;
    b.addEventListener('click', () => { m.hidden = true; $(sel).click(); });
    m.appendChild(b);
  }
  m.hidden = false;
}
$('#btn-menu').addEventListener('click', () => { sfx.click(); if ($('#phone-menu').hidden) openPhoneMenu(); else $('#phone-menu').hidden = true; });
// The objectives show one line; a tap opens the list
$('#objectives').addEventListener('click', () => { if (isTouch) $('#objectives').classList.toggle('open'); });
// A short tap on the picture uses what is in the middle of the screen
let tap = null;
canvas.addEventListener('pointerdown', (e) => {
  $('#phone-menu').hidden = true;
  if (e.pointerType === 'touch') tap = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now() };
});
canvas.addEventListener('pointerup', (e) => {
  if (!tap || e.pointerId !== tap.id) return;
  const quick = performance.now() - tap.at < 280 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 12;
  tap = null;
  if (quick && player.enabled && !overlayOpen()) interact();
});
if (isTouch) { const quickLink = document.querySelector('#start a.link'); if (quickLink) quickLink.dataset.i18n = 'ph_quick'; }

// ---------------------------------------------------------------------------
// Start / pause and pointer lock
// ---------------------------------------------------------------------------
// Some places (embedded pages, previews) block pointer lock: then drag with the mouse to look
let dragLook = false;
function lockPointer() {
  if (isTouch || dragLook) return;
  const attempt = (opts) => {
    try {
      const p = opts ? canvas.requestPointerLock(opts) : canvas.requestPointerLock();
      return p && p.then ? p : Promise.resolve();
    } catch (err) { return Promise.reject(err); }
  };
  // Raw mouse input (no Windows acceleration) is smoother; fall back if not supported
  attempt({ unadjustedMovement: true })
    .catch((err) => (err && err.name === 'NotSupportedError' ? attempt() : Promise.reject(err)))
    .catch(() => { dragLook = true; });
}
let dragging = null;
canvas.addEventListener('mousedown', (e) => { if (dragLook && player.enabled) dragging = { x: e.clientX, y: e.clientY, moved: 0 }; });
addEventListener('blur', () => { dragging = null; });
addEventListener('mousemove', (e) => {
  if (!dragging) return;
  if (!(e.buttons & 1)) { dragging = null; return; } // button released outside the window
  player.look(e.clientX - dragging.x, e.clientY - dragging.y, 0.004);
  dragging.moved += Math.abs(e.clientX - dragging.x) + Math.abs(e.clientY - dragging.y);
  dragging.x = e.clientX;
  dragging.y = e.clientY;
});
addEventListener('mouseup', () => {
  if (dragging && dragging.moved < 6) interact(); // a click without dragging = use
  dragging = null;
});

function enter() {
  unlockAudio();
  $('#start').hidden = true;
  player.enabled = true;
  if (isTouch) {
    $('#touch').hidden = false;
    // Phones: fill the screen and turn sideways, where the browser allows it
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  } else lockPointer();
}
$('#btn-start').addEventListener('click', () => { sfx.select(); enter(); });
$('#btn-start-tut').addEventListener('click', () => { sfx.select(); tut.start(); enter(); });
$('#btn-tut').addEventListener('click', () => { sfx.select(); tut.start(); });

// Restart: the space center starts again from the beginning (stars and unlocked missions are kept)
const openRestart = () => { sfx.click(); player.enabled = false; document.exitPointerLock?.(); $('#confirm').hidden = false; };
$('#btn-restart').addEventListener('click', openRestart);
$('#btn-start-restart').addEventListener('click', openRestart);
$('#btn-restart-no').addEventListener('click', () => { sfx.click(); $('#confirm').hidden = true; });
$('#btn-restart-yes').addEventListener('click', () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(fresh()));
    localStorage.removeItem(OLD_KEY);
    localStorage.removeItem('majan-center-result');
  } catch { /* ignore */ }
  restarting = true;
  location.reload();
});
document.addEventListener('pointerlockchange', () => {
  // Not during the liftoff: launching releases the mouse, and the pause card must not cover it
  if (!player.locked && !overlayOpen() && !isTouch && !dragLook && !lift && !S.inFlight) {
    player.enabled = false;
    $('#start').hidden = false;
    $('#btn-start').textContent = t('c_continue');
  }
});

// ---------------------------------------------------------------------------
// Terminal
// ---------------------------------------------------------------------------
let tab = 'contracts';
function openTerminal(which) {
  tab = which;
  player.enabled = false;
  document.exitPointerLock?.();
  $('#terminal').hidden = false;
  sfx.select();
  renderTerminal();
}
function closeTerminal() {
  $('#terminal').hidden = true;
  sfx.click();
  player.enabled = true;
  lockPointer();
}
$('#term-close').addEventListener('click', closeTerminal);
document.querySelectorAll('#terminal .tabs button').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; sfx.click(); renderTerminal(); }));

function card(html, btnText, disabled, onClick, cls = '') {
  const el = document.createElement('div');
  el.className = 'row-card ' + cls;
  el.innerHTML = html;
  if (btnText) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = btnText;
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    el.appendChild(btn);
  }
  return el;
}

const fitBadge = (m, id) => {
  if (!m || PARTS[id].kind !== 'inst') return '';
  const f = instrumentFit(m, id);
  const c = f >= 1.15 ? 'good' : f >= 0.9 ? 'ok' : 'poor';
  const lost = cloudLoss(m, id);
  const cloud = lost >= 0.05 ? ` <span class="fit poor">${t('cloud_tag', { cloud: pct(lost) })}</span>`
    : cloudInfo(m).cover >= 0.05 && id === 'radar' ? ` <span class="fit good">${t('cloud_radar')}</span>` : '';
  return ` <span class="fit ${c}">${t('c_fit_for')} ${t('fit_' + c)}</span>${cloud}`;
};

function sellBox(id) {
  const b = S.boxes.find((x) => x.part === id && (x.where === 'floor' || x.where === 'shelf'));
  if (!b) return;
  const x = Math.floor(PARTS[id].cost / 2);
  if (b.where === 'shelf') world.shelfSlots[b.shelf].box = null;
  const m = meshes.get(b.id);
  if (m) { removeInteractable(m); world.scene.remove(m); meshes.delete(b.id); }
  S.boxes = S.boxes.filter((o) => o.id !== b.id);
  S.cash += x;
  sfx.cash();
  toast(t('t_sold', { x: fmt(x) }));
  save();
  renderAll();
}

function renderTerminal() {
  document.querySelectorAll('#terminal .tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  const body = $('#term-body');
  body.innerHTML = `<div class="row-card"><h3>${t('c_cash')}: <span class="pay">${fmt(S.cash)} ${t('million')}</span></h3></div>`;
  const m = mission();
  if (tab === 'contracts') {
    // Support grant when the money runs out (once per contract)
    if (S.cash < GRANT && !S.inFlight && S.contract && S.grantFor !== S.contract) {
      body.appendChild(card(`<h3>${t('c_grant_h')}</h3><p>${t('c_grant_p')}</p>`, t('c_grant_btn', { x: fmt(GRANT) }), false, () => {
        S.cash += GRANT;
        S.grantFor = S.contract;
        save();
        sfx.cash();
        toast(t('t_grant', { x: fmt(GRANT) }));
        renderAll();
      }, 'active'));
    }
    MISSIONS.forEach((ms) => {
      const open = profile.unlocked(ms);
      const active = S.contract === ms.id;
      const p = PAY[ms.id];
      body.appendChild(card(`<h3>${t('m_' + ms.id)} <span class="meta">· ${t('diff_' + ms.id)} · ${'★'.repeat(profile.get().stars[ms.id] || 0)}</span></h3>
        <p>${t('m_' + ms.id + '_goal')}</p>
        <div class="meta"><span class="pay">${t('c_pay_v', { a: fmt(p[0]), b: fmt(p[1]), c: fmt(p[2]) })}</span>${sep()}${t('c_cap', { b: fmt(ms.budget) })}${sep()}${t('c_years', { y: fmt(ms.years) })}</div>`,
      active ? t('c_active') : open ? t('c_accept') : `🔒 ${t('locked', { n: fmt(ms.unlock) })}`, active || !open || !!S.inFlight, () => {
        S.contract = ms.id;
        save();
        sfx.fanfare();
        toast(t('t_accepted', { name: t('m_' + ms.id) }));
        renderAll();
      }, active ? 'active' : ''));
    });
  } else if (tab === 'shop') {
    body.insertAdjacentHTML('beforeend', `<p class="cart-note">${t('c_shop_note')}</p>`);
    const groups = [['tab_inst', INSTRUMENTS.filter((x) => x.cost > 0)], ['tab_power', POWER.filter((x) => x.cost > 0)], ['tab_comms', COMMS.filter((x) => x.cost > 0)]];
    for (const [title, list] of groups) {
      body.insertAdjacentHTML('beforeend', `<h4 class="section-title">${t(title)}</h4>`);
      for (const p of list) {
        const owned = S.boxes.filter((b) => b.part === p.id).length + Object.values(S.sat).filter((v) => v === p.id).length;
        const sub = PARTS[p.id].kind === 'inst' ? `<p>${t('i_' + p.id + '_r')}</p>` : '';
        body.appendChild(card(`<h3>${partName(p.id)}${fitBadge(m, p.id)}</h3>${sub}<p class="meta">${specLine(p.id).toLowerCase()}${sep()}${t('c_owned', { n: fmt(owned) })}</p><div class="pay">${fmt(p.cost)} ${t('million')}</div>`,
          t('c_buy'), S.cash < p.cost, () => order(p.id)));
      }
    }
  } else if (tab === 'stock') {
    body.insertAdjacentHTML('beforeend', `<h4 class="section-title">${t('c_installed')}</h4>`);
    const sat = [[t('slot_a'), S.sat.inst1], [t('slot_b'), S.sat.inst2], [t('tab_power'), S.sat.power], [t('tab_comms'), S.sat.comms]];
    body.insertAdjacentHTML('beforeend', `<div class="row-card"><p>${sat.map(([k, v]) => `${k}: <b>${v === NO_INSTRUMENT ? t('i_none') : partName(v)}</b>`).join('<br>')}</p></div>`);
    body.insertAdjacentHTML('beforeend', `<h4 class="section-title">${t('c_in_stock')}</h4>`);
    if (!S.boxes.length) body.insertAdjacentHTML('beforeend', `<p class="cart-note">${t('c_stock_empty')}</p>`);
    const counts = {};
    S.boxes.forEach((b) => { counts[b.part] = (counts[b.part] || 0) + 1; });
    for (const [id, n] of Object.entries(counts)) {
      const sellable = PARTS[id].cost > 0 && S.boxes.some((b) => b.part === id && (b.where === 'floor' || b.where === 'shelf'));
      body.appendChild(card(`<h3>${partName(id)}</h3><p class="meta">× ${fmt(n)}</p>`,
        PARTS[id].cost > 0 ? t('c_sell', { x: `${fmt(Math.floor(PARTS[id].cost / 2))} ${t('u_m')}` }) : null, !sellable, () => sellBox(id)));
    }
  } else {
    if (!S.log.length) body.insertAdjacentHTML('beforeend', `<p class="cart-note">${t('c_log_empty')}</p>`);
    [...S.log].reverse().forEach((r) => {
      const d = r.design;
      const what = d ? [t('o_' + d.orbit), partName(d.inst1), d.inst2 !== NO_INSTRUMENT ? partName(d.inst2) : null, t('rocket_' + d.rocket)].filter(Boolean).join(sep()) : '';
      body.appendChild(card(`<h3>${t('m_' + r.mission)}</h3><p class="${r.ok ? 'pay' : 'bad-text'}">${r.ok ? t('c_log_ok', { stars: fmt(r.stars), x: fmt(r.reward) }) : t('c_log_fail')}</p><p class="meta">${what}</p>`));
    });
  }
}

// ---------------------------------------------------------------------------
// Screens in the world (canvas textures)
// ---------------------------------------------------------------------------
function canvasFor(mesh, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  // A real display: lit by the room, with a soft self-glow that stays below the
  // bloom threshold (full-brightness screens flared when the camera moved)
  mesh.material = new THREE.MeshStandardMaterial({
    map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.18, metalness: 0,
  });
  return { c, g: c.getContext('2d'), tex };
}
const wall = canvasFor(world.objects.screen, 1280, 720);
const term = canvasFor(world.objects.termScreen, 640, 375);
const brief = world.objects.briefScreen ? canvasFor(world.objects.briefScreen, 1280, 720) : null;

function drawText(g, s, x, y, size, color = '#e8f4ff', weight = 700, align = 'left', font = '"Space Grotesk", "IBM Plex Sans Arabic"') {
  g.font = `${weight} ${size}px ${font}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.direction = getLang() === 'ar' ? 'rtl' : 'ltr';
  g.fillText(s, x, y);
}

function screenFrame(g, W, H) {
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#071328');
  grd.addColorStop(1, '#030914');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(77,232,255,.6)';
  g.lineWidth = 4;
  g.strokeRect(14, 14, W - 28, H - 28);
}

function drawWallScreen() {
  const { g, c, tex } = wall;
  const W = c.width;
  const H = c.height;
  screenFrame(g, W, H);
  const ar = getLang() === 'ar';
  const L = ar ? W - 60 : 60;
  const al = ar ? 'right' : 'left';
  drawText(g, t('s_title'), L, 80, 44, '#4de8ff', 700, al);
  const m = mission();
  drawText(g, m ? t('c_contract_line', { name: t('m_' + m.id), b: fmt(m.budget) }) : t('c_no_contract'), L, 130, 30, '#ffb547', 600, al);
  if (!m) { tex.needsUpdate = true; return; }
  const d = computeDesign(designNow(), m);
  const f = forecast(d, m);
  const ok = '#4de8ff';
  const warn = '#ffb547';
  const bad = '#ff5f6d';
  const rows = [
    [t('bar_budget'), `${fmt(d.totalCost)} / ${fmt(m.budget)}`, d.totalCost / m.budget, d.overBudget ? bad : ok],
    [t('bar_power'), t('bar_power_v', { use: fmt(Math.round(d.avgUse)), avg: fmt(d.avgGen) }), d.avgUse / Math.max(1, d.avgGen) / 1.4, !f.alive ? bad : d.avgUse > d.avgGen ? warn : ok],
    [t('bar_mass'), t('bar_mass_v', { m: fmt(d.mass), c: fmt(d.capacity) }), d.mass / Math.max(1, d.capacity), d.tooHeavy ? bad : d.margin > 0.85 ? warn : ok],
    [t('bar_data'), t('bar_data_v', { c: fmt(d.capture, 1), s: fmt(d.downlink, 1) }), d.capture / 16, d.capture > d.downlink ? warn : ok],
    [t('bar_fit'), d.insts.length ? t('fit_' + (d.fit >= 1.15 ? 'good' : d.fit >= 0.9 ? 'ok' : 'poor')) : t('i_none'), d.fit / 1.5, d.fit < 0.9 ? warn : ok],
    [t('bar_life'), t('bar_life_v', { y: fmt(d.lifeYears), n: fmt(m.years) }), d.lifeYears / (m.years * 2), d.lifeYears < m.years ? bad : ok],
  ];
  const bx = ar ? W - 760 : 60; // bar column
  rows.forEach(([label, val, frac, col], i) => {
    const y = 190 + i * 62;
    drawText(g, label, ar ? bx + 700 : bx, y, 22, '#8193ad', 600, ar ? 'right' : 'left');
    drawText(g, val, ar ? bx : bx + 700, y, 22, '#e8f4ff', 600, ar ? 'left' : 'right');
    g.fillStyle = 'rgba(255,255,255,.1)';
    g.fillRect(bx, y + 12, 700, 10);
    g.fillStyle = col;
    const wfill = 700 * Math.max(0.02, Math.min(1, frac));
    g.fillRect(ar ? bx + 700 - wfill : bx, y + 12, wfill, 10);
  });
  // The eight decisions of the challenge, each with a status light
  eightStatus(d, f, m).forEach((e, i) => {
    const x = 68 + i * 146;
    g.fillStyle = e.ok ? '#43e6a0' : e.warn ? '#ffb547' : '#ff5f6d';
    g.beginPath(); g.arc(ar ? W - x : x, 549, 7, 0, Math.PI * 2); g.fill();
    drawText(g, t(e.key), ar ? W - x - 14 : x + 14, 556, 18, '#c8d6ea', 600, ar ? 'right' : 'left');
  });
  // Forecast stars, odds and fee
  const sx = ar ? 230 : W - 230;
  drawText(g, t('forecast'), sx, 200, 26, '#8193ad', 600, 'center');
  for (let i = 0; i < 3; i++) drawText(g, '★', sx - 85 + i * 85, 300, 84, i < f.stars ? '#ffb547' : 'rgba(255,255,255,.12)', 700, 'center');
  drawText(g, pct(f.coverage), sx, 360, 30, '#e8f4ff', 700, 'center');
  drawText(g, t('launch_odds', { p: pct(1 - d.failChance) }), sx, 408, 22, '#43e6a0', 600, 'center');
  drawText(g, `${t('s_fee')}: ${fmt(launchFee(d))} ${t('million')}`, sx, 452, 22, '#ffb547', 600, 'center');
  drawText(g, d.compliant ? t('eom_ok', { y: fmt(d.disposal) }) : t('eom_bad', { y: fmt(d.disposal) }), sx, 496, 20, d.compliant ? '#43e6a0' : '#ff5f6d', 600, 'center');
  // Plan and parts
  drawText(g, `${t('s_plan')}: ${[t('o_' + d.orb.id), t('rocket_' + d.rocket.id), t(d.eom.id), t(d.ground.id), t(d.test.id)].join(sep())}`, L, 600, 22, '#4de8ff', 600, al);
  drawText(g, `${t('s_parts')}: ${[S.sat.inst1, S.sat.inst2, S.sat.power, S.sat.comms].filter((x) => x !== NO_INSTRUMENT).map(partName).join(sep())}`, L, 648, 24, '#e8f4ff', 600, al);
  tex.needsUpdate = true;
}

function drawTerminalScreen() {
  const { g, c, tex } = term;
  g.fillStyle = '#06101f';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#4de8ff';
  g.lineWidth = 4;
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  drawText(g, 'MAJAN OS', c.width / 2, 120, 64, '#4de8ff', 700, 'center', '"JetBrains Mono"');
  drawText(g, `${fmt(S.cash)} ${t('million')}`, c.width / 2, 210, 44, '#43e6a0', 700, 'center');
  drawText(g, S.contract ? t('m_' + S.contract) : t('c_no_contract'), c.width / 2, 280, 32, '#ffb547', 600, 'center');
  tex.needsUpdate = true;
}

// Mission briefing in the office: real NASA satellite images of the contract's area
const briefImgs = {};
function briefImage(id) {
  if (!briefImgs[id]) {
    const img = new Image();
    img.onload = () => drawBriefScreen();
    img.src = `assets/nasa/${id}_${cloudInfo({ id }).key.endsWith('_b') ? 'b' : 'a'}.jpg`;   // the image the cloud cover was measured in
    briefImgs[id] = img;
  }
  return briefImgs[id];
}
function drawBriefScreen() {
  if (!brief) return;
  const { g, c, tex } = brief;
  const W = c.width;
  const H = c.height;
  screenFrame(g, W, H);
  const ar = getLang() === 'ar';
  const L = ar ? W - 50 : 50;
  const al = ar ? 'right' : 'left';
  drawText(g, t('c_brief_title'), L, 70, 36, '#4de8ff', 700, al);
  const m = mission();
  if (!m) {
    drawText(g, t('c_brief_none'), W / 2, H / 2 + 10, 30, '#8193ad', 600, 'center');
    tex.needsUpdate = true;
    return;
  }
  drawText(g, t('m_' + m.id), L, 120, 32, '#ffb547', 700, al);
  const img = briefImage(m.id);
  const x0 = 40;
  const y0 = 150;
  const iw = W - 80;
  const ih = H - y0 - 100;
  if (img.complete && img.naturalWidth) {
    // cover the box, keeping the image's shape
    const s = Math.max(iw / img.naturalWidth, ih / img.naturalHeight);
    const sw = iw / s;
    const sh = ih / s;
    g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x0, y0, iw, ih);
    g.strokeStyle = 'rgba(77,232,255,.5)';
    g.lineWidth = 2;
    g.strokeRect(x0, y0, iw, ih);
  }
  drawText(g, t('m_' + m.id + '_goal'), L, H - 58, 24, '#e8f4ff', 600, al);
  // Cloud cover measured in this NASA image: it decides what the cameras can see
  const ci = cloudInfo(m);
  g.fillStyle = 'rgba(6,12,24,.82)';
  g.fillRect(x0 + 12, y0 + 12, ar ? 470 : 500, 46);
  drawText(g, t('cloud_brief', { cloud: pct(ci.cover), date: ci.date }), ar ? x0 + 12 + 470 - 14 : x0 + 26, y0 + 43, 22, ci.cover >= 0.05 ? '#ffb547' : '#7dffb0', 700, al);
  drawText(g, 'NASA Worldview / GIBS · MODIS Terra', ar ? 50 : W - 50, H - 26, 16, '#8193ad', 600, ar ? 'left' : 'right', '"JetBrains Mono"');
  tex.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast glass';
  el.textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3300);
}

function renderObjectives() {
  const changed = S.sat.inst1 !== BASE_SAT.inst1 || S.sat.inst2 !== BASE_SAT.inst2 || S.sat.power !== BASE_SAT.power || S.sat.comms !== BASE_SAT.comms;
  const anyBox = S.boxes.length > 0;
  const steps = [
    ['o_contract', !!S.contract],
    ['o_order', anyBox || changed],
    ['o_collect', changed || !!held || S.boxes.some((b) => b.where === 'shelf')],
    ['o_install', changed],
    ['o_launch', false],
  ];
  // A step only counts as done when every step before it is done too
  // (a leftover box from an earlier mission shouldn't tick off "order" before a contract)
  for (let i = 1; i < steps.length; i++) steps[i][1] = steps[i][1] && steps[i - 1][1];
  const nowIdx = steps.findIndex(([, done]) => !done);
  $('#obj-list').innerHTML = steps.map(([k, done], i) => `<li class="${done ? 'done' : i === nowIdx ? 'now' : ''}">${t(k)}</li>`).join('');
  const m = mission();
  $('#contract-line').textContent = m ? t('c_contract_line', { name: t('m_' + m.id), b: fmt(m.budget) }) : t('c_no_contract');
}

// The Duqm Space Settlement: the stars of the player's missions add its modules
let settlementShown = -1;
function syncSettlement() {
  if (!world.settlement) return;
  const shown = world.settlement.setStars(profile.totalStars());
  if (settlementShown >= 0 && shown > settlementShown) toast(t('st_new', { name: t('st_name_' + SETTLEMENT_STAGES[shown - 1].id) }));
  settlementShown = shown;
}
// The notice board at the settlement: the real project, what the stars have built, Oman's space plans
function openBoard() {
  player.enabled = false;
  document.exitPointerLock?.();
  sfx.select();
  const n = profile.totalStars();
  const el = $('#info');
  el.className = 'glass modal brackets info wide';
  el.innerHTML = `<div class="rv-head"><div><div class="eyebrow">${t('st_eyebrow')}</div><h2>${t('st_title')}</h2></div>
    <button type="button" class="x" id="rv-close" aria-label="Close">✕</button></div>
    <p class="rv-note st-lead">${t('st_real')}</p>
    <h4 class="rm-h">${t('st_build_t', { n: fmt(n) })}</h4>
    <ul class="st-list">${SETTLEMENT_STAGES.map((s) => `<li class="${n >= s.stars ? 'on' : ''}"><b>★ ${fmt(s.stars)}</b> ${t('st_' + s.id)}</li>`).join('')}</ul>
    <h4 class="rm-h">${t('st_oman_t')}</h4>
    <ul class="ab-list">${[1, 2, 3, 4].map((k) => `<li>${t('st_o' + k)}</li>`).join('')}</ul>
    <p class="rv-note">${t('st_src')}</p><p class="rv-note">${t('st_note')}</p>`;
  const close = () => { $('#info-layer').hidden = true; el.innerHTML = ''; el.className = 'glass modal brackets info'; player.enabled = true; lockPointer(); };
  el.querySelector('#rv-close').onclick = () => { sfx.click(); close(); };
  $('#info-layer').hidden = false;
}

// Team play: 2 to 4 players share the four roles of rules.js (planner, engineer, science, comms)
const teamSize = () => Math.min(4, Math.max(1, Number(S.team) || 1));
const teamWho = (roleId) => `${t('role_' + roleId)} (${t('player_n', { n: fmt(rolesFor(teamSize())[ROLES.findIndex((r) => r.id === roleId)] + 1) })})`;
function renderTeam() {
  $('#btn-team').textContent = t('team_btn', { n: fmt(teamSize()) });
  const on = teamSize() > 1;
  $('#term-team').hidden = $('#mc-team').hidden = !on;
  if (!on) return;
  $('#term-team').textContent = [t('team_term_a', { who: teamWho('science') }), t('team_term_b', { who: teamWho('engineer') }), t('team_term_c', { who: teamWho('comms') })].join(sep());
  $('#mc-team').textContent = [t('team_mc_a', { who: teamWho('planner') }), t('team_mc_b', { who: teamWho('engineer') }), t('team_mc_c', { who: teamWho('comms') })].join(sep());
}
$('#btn-team').addEventListener('click', () => {
  S.team = (teamSize() % 4) + 1;
  save();
  renderTeam();
  toast(teamSize() > 1 ? t('team_toast', { n: fmt(teamSize()) }) : t('team_toast_solo'));
});

function renderAll() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $('#btn-lang').textContent = t('lang');
  $('#btn-sound').textContent = profile.get().sound ? t('sound_on') : t('sound_off');
  $('#btn-gfx').textContent = t(gfx === 'high' ? 'gfx_high' : 'gfx_low');
  renderTeam();
  syncSettlement();
  $('#c-cash').textContent = `${fmt(S.cash)} ${t('u_m')}`;
  $('#stars-total').textContent = fmt(profile.totalStars());
  if (zone) $('#c-zone').textContent = t(zone);
  const h = $('#holding');
  h.hidden = !held;
  if (held) {
    const kind = PARTS[held.part].kind;
    h.innerHTML = `📦 <b>${partName(held.part)}</b> <span class="kind" style="--k:${kindColor(kind)}">${t({ inst: 'tab_inst', power: 'tab_power', comms: 'tab_comms' }[kind])}</span> <span class="meta"><kbd>Q</kbd></span>`;
  }
  renderObjectives();
  drawWallScreen();
  drawTerminalScreen();
  drawBriefScreen();
  if (!$('#terminal').hidden) renderTerminal();
  if (!$('#mc').hidden) renderMC();
  tut.render();
}

$('#btn-lang').addEventListener('click', () => {
  setLang(getLang() === 'ar' ? 'en' : 'ar');
  profile.set('lang', getLang());
  renderAll();
});
// Graphics quality button: switches live and remembers the choice
function applyGfx() {
  const high = gfx === 'high';
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.5 : 1));
  renderer.shadowMap.enabled = high;
  fx.bloom.enabled = high;
  world.scene.traverse((o) => {
    if (!o.isMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; });
  });
  resize();
  $('#btn-gfx').textContent = t(high ? 'gfx_high' : 'gfx_low');
}
$('#btn-gfx').addEventListener('click', () => {
  gfx = gfx === 'high' ? 'low' : 'high';
  try { localStorage.setItem(GFX_KEY, gfx); } catch { /* ignore */ }
  sfx.click();
  applyGfx();
});
$('#btn-sound').addEventListener('click', () => {
  const on = !profile.get().sound;
  profile.set('sound', on);
  setMuted(!on);
  renderAll();
});

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  fx.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

let clock = 0;
let frames = 0; // drawn frames, for the playtest tool
let last = performance.now();
let zone = '';
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (consoleOpen) { requestAnimationFrame(loop); return; }   // the console has the screen: the room is not drawn
  clock += dt;
  player.update(dt);
  if (window.__viewLift) camera.position.y += window.__viewLift;   // tools/view-center.mjs: screenshots from the air
  updateTruck(dt);
  world.outsideFx?.update(dt);
  updateDoor(dt);
  tut.update(dt);
  updateLiftoff(dt);

  // Satellite turntable and parts growing in
  if (satModel) satModel.rotation.y += dt * 0.15;
  parts?.update(dt);
  // Held box sways with walking
  if (held) {
    const m = meshes.get(held.id);
    if (m) m.position.y = -0.42 + Math.sin(player.bob * 2) * 0.012;
  }
  world.objects.button.material.emissiveIntensity = 0.8 + 0.6 * Math.sin(clock * 4) ** 2;

  // What are we looking at?
  if (player.enabled) {
    target = findTarget();
    const p = promptFor(target);
    const el = $('#prompt');
    el.hidden = !p;
    if (p && el.innerHTML !== p) el.innerHTML = p;
    $('#crosshair').classList.toggle('hot', !!p && !p.includes('class="bad"'));
    if (isTouch) { $('#t-use').classList.toggle('ready', !!p && !p.includes('class="bad"')); $('#t-drop').hidden = !held; }
  } else {
    $('#prompt').hidden = true;
  }
  const px = player.pos.x;
  const z = player.pos.z > 12.2 ? 'c_zone_out' : px < -9 ? 'c_zone_office' : px < 7 ? 'c_zone_ware' : 'c_zone_clean';
  if (z !== zone) { zone = z; $('#c-zone').textContent = t(z); }

  fx.render(world.scene, camera, clock);
  frames++;
  requestAnimationFrame(loop);
}

setLang(profile.get().lang || 'ar');
setMuted(!profile.get().sound);
resize();
renderAll();
document.fonts.ready.then(() => { for (const k of Object.keys(texCache)) delete texCache[k]; for (const b of S.boxes) { const m = meshes.get(b.id); if (m) m.material = boxMaterial(b.part); } renderAll(); });
requestAnimationFrame(loop);

window.__center = {
  get S() { return S; }, applySatellite, world, player, camera, renderer, fx, interact, openTerminal, openMC, order, pickUp, putDown, install, takeOut, doLaunch, renderAll, sellBox,
  get target() { return target ? target.userData : null; },
  get frames() { return frames; },
  truck, step(dt) { updateTruck(dt); updateDoor(dt); }, openBoard,
  probe() { const o = findTarget(); return o ? o.userData : null; },
};
