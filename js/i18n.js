// All game text in Arabic and English, plus number formatting.
const TEXT = {
  ar: {
    title: 'مهمة مجان', subtitle: 'صمّم قمرًا صناعيًا عُمانيًا. أطلقه. أنقذ المهمة.',
    lang: 'English', sound_on: 'الصوت: يعمل', sound_off: 'الصوت: مطفأ',
    missions: 'اختر مهمتك', locked: 'تحتاج {n} ★', best: 'أفضل', start: 'ابدأ', stars_total: 'نجومك',
    m_aflaj: 'عين على الأفلاج', m_aflaj_goal: 'ارسم خريطة كاملة لأفلاج عُمان ليعرف المزارعون أين تتسرب المياه.',
    m_khareef: 'حارس الخريف', m_khareef_goal: 'راقب سحب الخريف فوق ظفار لتنبيه الناس قبل الأمطار والضباب.',
    m_dunes: 'صياد الكثبان', m_dunes_goal: 'تتبّع حركة كثبان رمال الشرقية لحماية الطرق والقرى.',
    diff_aflaj: 'سهل', diff_khareef: 'متوسط', diff_dunes: 'صعب',
    step_build: 'الخطوة ١ — صمّم', step_launch: 'الخطوة ٢ — أطلق', step_orbit: 'الخطوة ٣ — شغّل',
    slot_camera: 'الكاميرا', slot_power: 'الطاقة', slot_comms: 'الاتصالات',
    c1: 'كاميرا أساسية', c2: 'كاميرا عالية الدقة', c3: 'كاميرا طيفية',
    p1: 'ألواح صغيرة', p2: 'ألواح كبيرة', p3: 'ألواح كبيرة + بطارية',
    a1: 'هوائي سلكي', a2: 'طبق إرسال', a3: 'اتصال ليزري',
    u_m: 'م.ر', u_kg: 'كغ', u_w: 'واط', u_data: 'بيانات', u_link: 'إرسال', u_bat: 'بطارية',
    bar_budget: 'الميزانية', bar_power: 'الطاقة في المدار', bar_power_v: '{use} من {avg} واط (متوسط)',
    bar_mass: 'الكتلة والصاروخ', bar_data: 'البيانات لكل دورة', bar_data_v: 'التقاط {c}، إرسال {s}',
    million: 'مليون ريال', rocket_small: 'صاروخ صغير', rocket_medium: 'صاروخ متوسط', rocket_heavy: 'صاروخ ثقيل',
    forecast: 'التوقع', launch_odds: 'فرصة نجاح الإطلاق {p}',
    tip_over: 'تجاوزت الميزانية بـ {x} مليون ريال. اختر قطعًا أرخص.',
    tip_power: 'ستنفد البطارية في الساعة {h}: الألواح لا تعمل في ظل الأرض.',
    tip_link: 'الكاميرا تلتقط أكثر مما يستطيع الهوائي إرساله.',
    tip_cam: 'الكاميرا لا تلتقط بيانات كافية لهذا الهدف.',
    tip_margin: 'الصاروخ محمّل بنسبة {p}: الإطلاق خطير.',
    tip_good: 'تصميم قوي! جاهز للإطلاق.',
    btn_launch: 'إطلاق', btn_menu: 'المهمات', btn_retry: 'حاول مرة أخرى', btn_edit: 'عدّل التصميم', btn_next: 'المهمة التالية',
    st_liftoff: 'انطلاق!', st_boosters: 'انفصال المعززات', st_stage: 'انفصال المرحلة الأولى',
    st_fairing: 'انفصال غطاء الحمولة', st_orbit: 'في المدار!', st_fail: 'فشل الإطلاق',
    fail_title: 'فشل الإطلاق',
    msg_fail_margin: 'كان القمر يستخدم {p} من حمولة {rocket} القصوى، فلم يبقَ هامش أمان لأي مشكلة صغيرة.',
    msg_fail_luck: 'حتى الصواريخ الجيدة تفشل أحيانًا، نحو ٣ مرات من كل ١٠٠ إطلاق. جرّب مرة أخرى!',
    rocket_the_small: 'الصاروخ الصغير', rocket_the_medium: 'الصاروخ المتوسط', rocket_the_heavy: 'الصاروخ الثقيل',
    hud_hour: 'الساعة {h} / {total}', hud_battery: 'البطارية', hud_map: 'الخريطة',
    speed_fast: 'أسرع ×٤', speed_normal: 'عادي ×١',
    status_dead: 'انقطعت الطاقة!', status_imaging: 'تصوير', status_camera_off: 'الكاميرا مطفأة', status_sending: 'إرسال إلى عُمان',
    ev_storm_title: 'عاصفة شمسية!', ev_storm_text: 'انفجار قوي على الشمس يرسل جسيمات قد تتلف الأجهزة والألواح الشمسية.',
    ev_storm_real: 'قصة حقيقية: في أكتوبر ٢٠٠٣ أتلفت عواصف شمسية ضخمة عدة أقمار صناعية.',
    ev_storm_a: 'وضع الأمان: أطفئ الكاميرا ٦ ساعات', ev_storm_b: 'واصل التصوير (مخاطرة)',
    ev_units_title: 'تصحيح المدار', ev_units_text: 'جهّز الفريق أمر تشغيل المحرك لتصحيح المدار. هل تراجع الوحدات قبل الإرسال؟',
    ev_units_real: 'قصة حقيقية: في ١٩٩٩ فقدت ناسا مسبار Mars Climate Orbiter لأن فريقًا استخدم وحدات إمبراطورية وفريقًا آخر استخدم الوحدات المترية.',
    ev_units_a: 'راجع الوحدات (ساعتان بلا تصوير)', ev_units_b: 'أرسل الآن',
    ev_station_title: 'محطة الاستقبال مشغولة', ev_station_text: 'محطة الاستقبال في عُمان مشغولة بقمر آخر لمدة ٤ ساعات.',
    ev_station_real: 'في الواقع تتشارك الأقمار الصناعية محطات الاستقبال، وتستأجر الوكالات محطات شريكة حول العالم.',
    ev_station_a: 'انتظر ٤ ساعات', ev_station_b: 'استأجر محطة شريكة (١ مليون ريال، لديك {r})',
    ev_station_b_none: 'لا يكفي المال لاستئجار محطة شريكة',
    ev_debris_title: 'حطام فضائي!', ev_debris_text: 'قطعة حطام تقترب من مدارك. هل تناور لتتفاداها؟',
    ev_debris_real: 'قصة حقيقية: محطة الفضاء الدولية تشغّل محركاتها أحيانًا لتتفادى قطع الحطام.',
    ev_debris_a: 'ناور (٣ ساعات بلا تصوير)', ev_debris_b: 'ابقَ في مسارك (مخاطرة)',
    out_storm_safe: 'الكاميرا مطفأة ٦ ساعات. القمر آمن.', out_storm_damaged: 'العاصفة أتلفت الألواح: طاقة أقل بنسبة ٢٠٪.',
    out_storm_lucky: 'نجوت هذه المرة! لا ضرر.', out_units_checked: 'وُجد خطأ في الوحدات وصُحّح. نجح التصحيح.',
    out_units_wrong: 'كانت الوحدات خاطئة! مال المدار وستفوتك بعض المناطق.', out_units_lucky: 'كانت الوحدات صحيحة هذه المرة.',
    out_station_paid: 'المحطة الشريكة تستقبل بياناتك.', out_station_waited: 'لا إرسال للبيانات لمدة ٤ ساعات.',
    out_debris_dodged: 'تفاديت الحطام بنجاح.', out_debris_hit: 'أصاب الحطام الألواح: طاقة أقل بنسبة ٣٠٪.',
    out_debris_lucky: 'مرّ الحطام بعيدًا هذه المرة.',
    res_title: 'نتائج المهمة', res_score: 'النقاط', res_best: 'الأفضل', res_record: 'رقم قياسي جديد!',
    res_xp: '+{x} خبرة', res_rankup: 'ترقية! أصبحت {rank}', res_close: 'قريب جدًا! ينقصك {p} للنجمة التالية.',
    res_power_dead: 'انقطعت الطاقة في الساعة {h}: الأجهزة تستهلك {use} واط، لكن الألواح تعطي {avg} واط فقط في المتوسط لأن القمر يقضي نحو ٣٨٪ من كل دورة في ظل الأرض.',
    res_power_ok: 'الطاقة كفت طوال المهمة (البطارية {b} في النهاية).',
    res_coverage: 'اكتمل {cov} من الهدف.',
    res_antenna: 'أرسل الهوائي {sent} فقط من {captured} وحدة التقطتها الكاميرا. هوائي أقوى يرسل أكثر.',
    res_camera: 'الكاميرا لم تلتقط بيانات كافية. كاميرا أقوى ترى أكثر.',
    res_storm_safe: 'العاصفة: اخترت الأمان فخسرت ٦ ساعات تصوير.', res_storm_damaged: 'العاصفة: واصلت التصوير فتضررت الألواح.',
    res_storm_lucky: 'العاصفة: واصلت التصوير ونجوت بالحظ.', res_units_checked: 'تصحيح المدار: راجعت الوحدات فنجح.',
    res_units_wrong: 'تصحيح المدار: أرسلت دون مراجعة فكانت الوحدات خاطئة (فاتك ١٥٪).', res_units_lucky: 'تصحيح المدار: أرسلت دون مراجعة وكانت صحيحة بالصدفة.',
    res_station_paid: 'المحطة: استأجرت محطة شريكة فلم يتوقف الإرسال.', res_station_waited: 'المحطة: انتظرت ٤ ساعات دون إرسال.',
    res_debris_dodged: 'الحطام: ناورت فخسرت ٣ ساعات تصوير.', res_debris_hit: 'الحطام: بقيت في مسارك فأصاب الألواح.',
    res_debris_lucky: 'الحطام: بقيت في مسارك ومرّ بعيدًا.',
    rank_cadet: 'متدرب', rank_engineer: 'مهندس', rank_director: 'مدير رحلة', rank_commander: 'قائد مهمة',
    badge_new: 'وسام جديد: {name}',
    b_first_orbit: 'أول مدار', b_perfect_map: 'خريطة كاملة', b_penny: 'المقتصد', b_shadow: 'ناجٍ من الظل',
    b_units_guard: 'حارس الوحدات', b_storm_rider: 'راكب العاصفة', b_heavy: 'الرافعة الثقيلة', b_comeback: 'العودة القوية',
    credit: 'صور الأرض: NASA Visible Earth',
  },
  en: {
    title: 'Majan Mission', subtitle: 'Design an Omani satellite. Launch it. Save the mission.',
    lang: 'العربية', sound_on: 'Sound: on', sound_off: 'Sound: off',
    missions: 'Choose your mission', locked: 'Needs {n} ★', best: 'Best', start: 'Start', stars_total: 'Your stars',
    m_aflaj: 'Aflaj Watch', m_aflaj_goal: "Map all of Oman's aflaj so farmers can see where water is lost.",
    m_khareef: 'Khareef Watch', m_khareef_goal: 'Track the Khareef monsoon clouds over Dhofar to warn people before rain and fog.',
    m_dunes: 'Dune Hunter', m_dunes_goal: 'Track the moving dunes of the Sharqiya Sands to protect roads and villages.',
    diff_aflaj: 'Easy', diff_khareef: 'Medium', diff_dunes: 'Hard',
    step_build: 'STEP 01 · BUILD', step_launch: 'STEP 02 · LAUNCH', step_orbit: 'STEP 03 · OPERATE',
    slot_camera: 'Camera', slot_power: 'Power', slot_comms: 'Comms',
    c1: 'Basic camera', c2: 'HD camera', c3: 'Hyperspectral camera',
    p1: 'Small panels', p2: 'Large panels', p3: 'Large panels + battery',
    a1: 'Whip antenna', a2: 'Dish antenna', a3: 'Laser link',
    u_m: 'M OMR', u_kg: 'kg', u_w: 'W', u_data: 'data', u_link: 'link', u_bat: 'battery',
    bar_budget: 'Budget', bar_power: 'Power in orbit', bar_power_v: '{use} of {avg} W (average)',
    bar_mass: 'Mass and rocket', bar_data: 'Data per orbit', bar_data_v: 'capture {c} · send {s}',
    million: 'million OMR', rocket_small: 'small rocket', rocket_medium: 'medium rocket', rocket_heavy: 'heavy rocket',
    forecast: 'Forecast', launch_odds: 'Launch success {p}',
    tip_over: 'Over budget by {x} million. Pick cheaper parts.',
    tip_power: "The battery runs out at hour {h}: panels don't work in Earth's shadow.",
    tip_link: 'The camera captures more than the antenna can send.',
    tip_cam: "The camera doesn't capture enough data for this goal.",
    tip_margin: 'Rocket loaded to {p}: risky launch.',
    tip_good: 'Strong design! Ready for launch.',
    btn_launch: 'LAUNCH', btn_menu: 'Missions', btn_retry: 'Try again', btn_edit: 'Edit design', btn_next: 'Next mission',
    st_liftoff: 'Liftoff!', st_boosters: 'Boosters separated', st_stage: 'First stage separated',
    st_fairing: 'Fairing separated', st_orbit: 'In orbit!', st_fail: 'Launch failed',
    fail_title: 'Launch failed',
    msg_fail_margin: "The satellite used {p} of {rocket}'s maximum load, leaving no safety margin for small problems.",
    msg_fail_luck: 'Even good rockets sometimes fail, about 3 times in 100 launches. Try again!',
    rocket_the_small: 'the small rocket', rocket_the_medium: 'the medium rocket', rocket_the_heavy: 'the heavy rocket',
    hud_hour: 'Hour {h} / {total}', hud_battery: 'Battery', hud_map: 'Map',
    speed_fast: 'Faster ×4', speed_normal: 'Normal ×1',
    status_dead: 'Power lost!', status_imaging: 'Imaging', status_camera_off: 'Camera off', status_sending: 'Sending to Oman',
    ev_storm_title: 'Solar storm!', ev_storm_text: 'A big blast on the Sun is sending particles that can damage electronics and solar panels.',
    ev_storm_real: 'Real story: in October 2003, huge solar storms damaged several satellites.',
    ev_storm_a: 'Safe mode: camera off for 6 hours', ev_storm_b: 'Keep imaging (risky)',
    ev_units_title: 'Orbit correction', ev_units_text: 'The team prepared an engine burn to correct the orbit. Double-check the units before sending?',
    ev_units_real: 'Real story: in 1999 NASA lost the Mars Climate Orbiter because one team used imperial units and another used metric.',
    ev_units_a: 'Check the units (2 hours without imaging)', ev_units_b: 'Send now',
    ev_station_title: 'Ground station busy', ev_station_text: 'The ground station in Oman is busy with another satellite for 4 hours.',
    ev_station_real: 'In real missions, satellites share ground stations, and agencies rent partner stations around the world.',
    ev_station_a: 'Wait 4 hours', ev_station_b: 'Rent a partner station (1 million; you have {r})',
    ev_station_b_none: 'Not enough money to rent a partner station',
    ev_debris_title: 'Space debris!', ev_debris_text: 'A piece of debris is heading toward your orbit. Fire the engine to dodge it?',
    ev_debris_real: 'Real story: the International Space Station sometimes fires its engines to dodge pieces of debris.',
    ev_debris_a: 'Dodge (3 hours without imaging)', ev_debris_b: 'Stay on course (risky)',
    out_storm_safe: 'Camera off for 6 hours. The satellite is safe.', out_storm_damaged: 'The storm damaged the panels: 20% less power.',
    out_storm_lucky: 'Lucky this time! No damage.', out_units_checked: 'A units mistake was found and fixed. The burn worked.',
    out_units_wrong: 'The units were wrong! The orbit tilted and some areas will be missed.', out_units_lucky: 'The units were right this time.',
    out_station_paid: 'The partner station is receiving your data.', out_station_waited: 'No data sent for 4 hours.',
    out_debris_dodged: 'You dodged the debris.', out_debris_hit: 'The debris hit the panels: 30% less power.',
    out_debris_lucky: 'The debris passed by this time.',
    res_title: 'Mission results', res_score: 'Score', res_best: 'Best', res_record: 'NEW RECORD!',
    res_xp: '+{x} XP', res_rankup: 'Promoted! You are now {rank}', res_close: 'So close! {p} more for the next star.',
    res_power_dead: "Power ran out at hour {h}: the equipment uses {use} W, but the panels only average {avg} W because the satellite spends about 38% of each orbit in Earth's shadow.",
    res_power_ok: 'Power lasted the whole mission (battery at {b} at the end).',
    res_coverage: '{cov} of the goal completed.',
    res_antenna: 'The antenna sent only {sent} of the {captured} data units the camera captured. A stronger link sends more.',
    res_camera: "The camera didn't capture enough data. A stronger camera sees more.",
    res_storm_safe: 'Storm: you chose safe mode and lost 6 hours of imaging.', res_storm_damaged: 'Storm: you kept imaging and the panels were damaged.',
    res_storm_lucky: 'Storm: you kept imaging and got lucky.', res_units_checked: 'Orbit correction: you checked the units and it worked.',
    res_units_wrong: 'Orbit correction: you sent without checking and the units were wrong (15% missed).', res_units_lucky: 'Orbit correction: you sent without checking and got lucky.',
    res_station_paid: 'Station: you rented a partner station, so data kept flowing.', res_station_waited: 'Station: you waited 4 hours without sending.',
    res_debris_dodged: 'Debris: you dodged and lost 3 hours of imaging.', res_debris_hit: 'Debris: you stayed on course and it hit the panels.',
    res_debris_lucky: 'Debris: you stayed on course and it missed.',
    rank_cadet: 'Cadet', rank_engineer: 'Engineer', rank_director: 'Flight Director', rank_commander: 'Mission Commander',
    badge_new: 'New badge: {name}',
    b_first_orbit: 'First Orbit', b_perfect_map: 'Perfect Map', b_penny: 'Penny Wise', b_shadow: 'Shadow Survivor',
    b_units_guard: 'Units Guardian', b_storm_rider: 'Storm Rider', b_heavy: 'Heavy Lifter', b_comeback: 'Comeback',
    credit: 'Earth data: NASA Visible Earth',
  },
};

/** Add more text (used by the Space Center simulator). */
export function extendText(extra) {
  for (const l of Object.keys(extra)) Object.assign(TEXT[l], extra[l]);
}

let lang = 'ar';
const listeners = new Set();

export function getLang() { return lang; }
export function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  listeners.forEach((fn) => fn(l));
}
export function onLang(fn) { listeners.add(fn); }
/**
 * Language to start in: ?lang=en|ar in the link first, then the player's saved choice, then the
 * browser's own language (Arabic browsers start in Arabic, all others in English).
 */
export function startLang(saved) {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'ar') return q;
  if (saved === 'en' || saved === 'ar') return saved;
  return /^ar/i.test(navigator.language || '') ? 'ar' : 'en';
}

/** Text in a given language, whatever the current one is (labels printed in both languages). */
export function tIn(l, key) { return TEXT[l]?.[key] ?? TEXT.en[key] ?? key; }
export function t(key, vars = {}) {
  let s = TEXT[lang][key] ?? TEXT.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(v);
  return s;
}
const loc = () => (lang === 'ar' ? 'ar-OM' : 'en-US');
export const fmt = (n, digits = 0) => new Intl.NumberFormat(loc(), { maximumFractionDigits: digits }).format(n);
export const pct = (x) => new Intl.NumberFormat(loc(), { style: 'percent' }).format(x);
// "·" looks like the Arabic zero, so Arabic uses a comma between items
export const sep = () => (lang === 'ar' ? '، ' : ' · ');
