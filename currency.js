/* بوضوح — تحويل العملة التقريبي لعرض الأسعار (الدفع الفعلي دائماً بالدولار الأمريكي).
   أسعار الصرف: open.er-api.com (تُخزَّن ١٢ ساعة بالمتصفح)، ومعها جدول احتياطي إن تعذّر الجلب. window.BWCUR */
(function () {
  const EN = document.documentElement.lang === 'en';
  // [code, عربي, English, رمز عربي, خانات عشرية, سعر احتياطي لكل دولار]
  const LIST = [
    ['USD', 'دولار أمريكي', 'US dollar', '$', 2, 1],
    ['JOD', 'دينار أردني', 'Jordanian dinar', 'د.أ', 2, 0.709],
    ['EGP', 'جنيه مصري', 'Egyptian pound', 'ج.م', 0, 49],
    ['SAR', 'ريال سعودي', 'Saudi riyal', 'ر.س', 0, 3.75],
    ['AED', 'درهم إماراتي', 'UAE dirham', 'د.إ', 0, 3.6725],
    ['KWD', 'دينار كويتي', 'Kuwaiti dinar', 'د.ك', 2, 0.307],
    ['QAR', 'ريال قطري', 'Qatari riyal', 'ر.ق', 0, 3.64],
    ['BHD', 'دينار بحريني', 'Bahraini dinar', 'د.ب', 2, 0.376],
    ['OMR', 'ريال عُماني', 'Omani rial', 'ر.ع', 2, 0.3845],
    ['IQD', 'دينار عراقي', 'Iraqi dinar', 'د.ع', 0, 1310],
    ['MAD', 'درهم مغربي', 'Moroccan dirham', 'د.م', 0, 9.3],
    ['DZD', 'دينار جزائري', 'Algerian dinar', 'د.ج', 0, 133],
    ['TND', 'دينار تونسي', 'Tunisian dinar', 'د.ت', 2, 3.0],
    ['TRY', 'ليرة تركية', 'Turkish lira', 'ل.ت', 0, 41],
    ['GBP', 'جنيه إسترليني', 'Pound sterling', '£', 2, 0.76],
    ['EUR', 'يورو', 'Euro', '€', 2, 0.88],
    ['CAD', 'دولار كندي', 'Canadian dollar', 'CAD', 2, 1.38],
  ];
  const META = Object.fromEntries(LIST.map(c => [c[0], c]));
  const TZ_CUR = { 'Asia/Amman': 'JOD', 'Africa/Cairo': 'EGP', 'Asia/Riyadh': 'SAR', 'Asia/Dubai': 'AED', 'Asia/Kuwait': 'KWD', 'Asia/Qatar': 'QAR', 'Asia/Bahrain': 'BHD', 'Asia/Muscat': 'OMR',
    'Asia/Baghdad': 'IQD', 'Africa/Casablanca': 'MAD', 'Africa/Algiers': 'DZD', 'Africa/Tunis': 'TND', 'Europe/Istanbul': 'TRY', 'Europe/London': 'GBP', 'America/Toronto': 'CAD' };
  const EUR_TZ = /^Europe\/(Paris|Berlin|Madrid|Rome|Amsterdam|Brussels|Vienna|Lisbon|Dublin|Athens|Helsinki)$/;
  let rates = Object.fromEntries(LIST.map(c => [c[0], c[5]]));
  let live = false;

  function detect() {
    try { const s = localStorage.getItem('bw_cur'); if (s && META[s]) return s; } catch (_) {}
    try { const z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (TZ_CUR[z]) return TZ_CUR[z]; if (EUR_TZ.test(z)) return 'EUR'; } catch (_) {}
    return 'USD';
  }
  let cur = detect();
  const get = () => cur;
  const set = (c) => { if (!META[c]) return; cur = c; try { localStorage.setItem('bw_cur', c); } catch (_) {} window.dispatchEvent(new CustomEvent('bw-currency', { detail: { code: c } })); };

  const ready = (async function () {
    try {
      const cached = JSON.parse(localStorage.getItem('bw_rates') || 'null');
      if (cached && Date.now() - cached.t < 12 * 3600e3) { Object.assign(rates, cached.r); live = true; return; }
    } catch (_) {}
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: ctl.signal }); clearTimeout(to);
      if (!r.ok) return;
      const j = await r.json();
      if (j && j.rates) {
        const pick = {}; LIST.forEach(c => { if (Number(j.rates[c[0]]) > 0) pick[c[0]] = Number(j.rates[c[0]]); });
        Object.assign(rates, pick); live = true;
        try { localStorage.setItem('bw_rates', JSON.stringify({ t: Date.now(), r: pick })); } catch (_) {}
      }
    } catch (_) { /* نبقى على الاحتياطي */ }
  })();

  function convert(usd, code) { return Number(usd) * (rates[code || cur] || 1); }
  function fmt(usd, code) {
    code = code || cur; const m = META[code] || META.USD; let v = convert(usd, code);
    if (code === 'USD') { const r = Math.round(v * 100) / 100; return '$' + (Number.isInteger(r) ? r : r.toFixed(2)); }
    const dec = m[4]; v = dec ? v.toFixed(dec) : String(Math.round(v));
    const s = Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return EN ? s + ' ' + code : s + ' ' + m[3];
  }
  const optionsHtml = (sel) => LIST.map(c => `<option value="${c[0]}"${c[0] === (sel || cur) ? ' selected' : ''}>${EN ? c[2] : c[1]} (${c[0]})</option>`).join('');
  const note = () => EN
    ? 'Prices in your currency are approximate' + (live ? ' (live exchange rate)' : '') + '. You pay in US dollars, and your bank applies its own rate.'
    : 'الأسعار بعملتك تقريبية' + (live ? ' (بسعر الصرف الحالي)' : '') + '، والدفع الفعلي بالدولار الأمريكي وقد يطبّق بنكك سعره الخاص.';
  window.BWCUR = { LIST, get, set, fmt, convert, optionsHtml, note, ready, isLive: () => live, meta: META };
})();
