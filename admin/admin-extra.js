/* بوضوح — إضافات لوحة التحكم: التحليلات، متابعة الجلسات، مستحقات الأخصائيين، بانر الرئيسية،
   وإعادة تصميم صفحتي الفريق والمستخدمين. تُحمَّل بعد السكربت الرئيسي وتستخدم supabaseClient / esc / canAccess منه.
   كل الصلاحيات مفروضة من قاعدة البيانات (RLS + دوال SECURITY DEFINER)؛ هذا الملف واجهة فقط. */
(function () {
  const sb = () => supabaseClient;
  const $ = (id) => document.getElementById(id);
  const num = (n, d) => (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d });
  const usd = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: Math.abs(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const FEE_FIRST = 10, FEE_NEXT = 15; // عقد الأخصائي: 10$ أول جلسة مكتملة مع كل مستفيد، 15$ لكل جلسة لاحقة (تشمل غياب المراجع)
  const DUE_DAY = 5;                   // تُدفع الأتعاب بحلول اليوم الخامس من الشهر التالي
  const AR = 'ar-EG';
  const fmtDT = (iso, tz) => new Date(iso).toLocaleString(AR, { dateStyle: 'medium', timeStyle: 'short', ...(tz ? { timeZone: tz } : {}) });
  const fmtD = (iso) => new Date(iso).toLocaleDateString(AR, { year: 'numeric', month: 'long', day: 'numeric' });
  const monthKey = (iso) => { const d = new Date(iso); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
  const monthLabel = (k) => { const [y, m] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(AR, { month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  const dueDate = (k) => { const [y, m] = k.split('-').map(Number); return new Date(Date.UTC(y, m, DUE_DAY)); };
  const csvEsc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  function downloadCsv(name, rows) {
    const blob = new Blob(['﻿' + rows.map(r => r.map(csvEsc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- أنماط ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .kx-kpis{ display:grid; grid-template-columns:repeat(auto-fill,minmax(168px,1fr)); gap:12px; margin:0 0 20px; }
  .kx-kpi{ background:#fff; border:1px solid var(--fog-dim); border-radius:14px; padding:14px 16px; }
  .kx-kpi b{ display:block; font-size:24px; font-family:'Noto Kufi Arabic',sans-serif; color:var(--ink); line-height:1.3; }
  .kx-kpi span{ font-size:12.5px; color:var(--text-muted-light); }
  .kx-kpi small{ display:block; font-size:11.5px; color:#2E6B45; margin-top:2px; }
  .kx-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
  @media (max-width:760px){ .kx-grid2{ grid-template-columns:1fr; } }
  .kx-card{ background:#fff; border:1px solid var(--fog-dim); border-radius:14px; padding:16px 18px; margin-bottom:16px; }
  .kx-card h3{ font-size:14.5px; margin:0 0 12px; }
  .kx-card svg{ width:100%; height:auto; display:block; }
  .kx-hbar{ display:flex; align-items:center; gap:10px; font-size:12.5px; margin:7px 0; }
  .kx-hbar .nm{ flex:0 0 38%; max-width:210px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .kx-hbar .tr{ flex:1; background:var(--fog); border-radius:100px; height:11px; overflow:hidden; }
  .kx-hbar .tr i{ display:block; height:100%; background:var(--clarity); border-radius:100px; }
  .kx-hbar .v{ flex:0 0 auto; min-width:60px; text-align:end; font-weight:700; }
  .kx-bar{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:16px; }
  .kx-bar select, .kx-bar input{ border:1.5px solid var(--fog-dim); border-radius:12px; padding:9px 12px; font-family:inherit; font-size:13.5px; background:#fff; }
  .kx-chip{ border:1.5px solid var(--fog-dim); background:#fff; border-radius:100px; padding:7px 14px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; color:var(--ink); display:inline-flex; gap:7px; align-items:center; }
  .kx-chip .n{ background:var(--fog); border-radius:100px; padding:0 8px; font-size:11.5px; }
  .kx-chip.on{ background:var(--ink); color:var(--fog); border-color:var(--ink); }
  .kx-chip.on .n{ background:rgba(255,255,255,.18); }
  .kx-st{ display:inline-block; font-size:11.5px; font-weight:700; padding:3px 11px; border-radius:100px; white-space:nowrap; background:var(--bg,#eee); color:var(--c,#555); }
  .kx-warn{ background:#FDF3E8; border:1px solid #EBD3B5; border-radius:12px; padding:10px 14px; font-size:13px; margin-bottom:14px; color:#7D5F27; }
  .kx-tl{ list-style:none; padding:0; margin:0; border-inline-start:2px solid var(--fog-dim); }
  .kx-tl li{ position:relative; padding:0 16px 14px 0; margin-inline-start:10px; font-size:13.5px; }
  .kx-tl li::before{ content:''; position:absolute; inset-inline-start:-17px; top:5px; width:10px; height:10px; border-radius:50%; background:var(--clarity); }
  .kx-tl time{ display:block; font-size:11.5px; color:var(--text-muted-light); }
  .kx-modal{ position:fixed; inset:0; background:rgba(36,29,46,.6); z-index:1100; display:flex; align-items:flex-start; justify-content:center; padding:24px 14px; overflow-y:auto; }
  .kx-modal-box{ background:#fff; border-radius:18px; width:100%; max-width:640px; margin:auto; padding:22px 26px; box-shadow:0 30px 80px -30px rgba(0,0,0,.5); }
  .kx-modal-box .hd{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
  .kx-modal-box .hd h3{ font-size:17px; margin:0; }
  .kx-x{ background:var(--fog); border:1px solid var(--fog-dim); border-radius:50%; width:36px; height:36px; font-size:22px; line-height:1; cursor:pointer; color:var(--ink); }
  @media (max-width:600px){ .kx-modal{ padding:0; } .kx-modal-box{ border-radius:0; min-height:100%; padding:18px 16px; } }
  .kx-team .app-tile .ph{ aspect-ratio:4/5; }
  .kx-slide{ display:flex; gap:14px; align-items:center; background:#fff; border:1px solid var(--fog-dim); border-radius:14px; padding:12px; margin-bottom:10px; flex-wrap:wrap; }
  .kx-slide .th{ width:200px; height:64px; border-radius:10px; background:var(--fog-dim) center/cover; flex:none; }
  .kx-slide .tx{ flex:1; min-width:180px; }
  .kx-slide .tx b{ display:block; font-size:14px; }
  .kx-slide .tx span{ font-size:12.5px; color:var(--text-muted-light); }
  .kx-two{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  @media (max-width:560px){ .kx-two{ grid-template-columns:1fr; } }
  `;
  document.head.appendChild(css);

  /* ---------- تسجيل التبويبات الجديدة ---------- */
  const NEW_TABS = [
    { id: 'analytics', label: 'لوحة التحليلات', perm: 'bookings', first: true },
    { id: 'sessions', label: 'متابعة الجلسات', perm: 'bookings', after: 'bookings' },
    { id: 'payouts', label: 'مستحقات الأخصائيين', perm: 'bookings', after: 'sessions' },
    { id: 'banner', label: 'بانر الرئيسية', perm: 'pages', after: 'promos' },
  ];
  const tabsBar = document.querySelector('.admin-tabs');
  const panelHost = $('tab-packages').parentNode;
  NEW_TABS.forEach(t => {
    TAB_PERMISSION[t.id] = t.perm;
    const btn = document.createElement('button'); btn.className = 'admin-tab'; btn.dataset.tab = t.id; btn.textContent = t.label;
    const ref = t.first ? tabsBar.firstElementChild : (tabsBar.querySelector('[data-tab="' + t.after + '"]') || {}).nextElementSibling;
    tabsBar.insertBefore(btn, t.after ? ref : tabsBar.firstElementChild);
    const panel = document.createElement('div'); panel.id = 'tab-' + t.id; panel.className = 'admin-tab-panel'; panel.style.display = 'none';
    panelHost.appendChild(panel);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(x => x.classList.remove('active')); btn.classList.add('active');
      document.querySelectorAll('.admin-tab-panel').forEach(p => p.style.display = 'none'); panel.style.display = 'block';
      LOADERS[t.id]();
    });
  });

  /* ---------- بيانات مشتركة ---------- */
  let CACHE = null, SESS = {};
  async function loadCore(force) {
    if (CACHE && !force && Date.now() - CACHE.t < 45000) return CACHE;
    const [b, s, p, ss] = await Promise.all([
      sb().from('bookings').select('*').order('created_at', { ascending: false }).limit(5000),
      sb().from('specialists').select('id, full_name, photo_url, timezone, is_published').limit(500),
      sb().from('packages').select('name, price'),
      sb().from('booking_sessions').select('*').order('seq', { ascending: true }).limit(20000),
    ]);
    if (b.error) throw b.error;
    const price = Object.fromEntries((p.data || []).map(x => [x.name, Number(x.price)]));
    const spec = Object.fromEntries((s.data || []).map(x => [x.id, x]));
    const amount = (bk) => (bk.final_price_usd != null ? Number(bk.final_price_usd) : (price[bk.package_name] || 0));
    const sessions = ss.data || []; SESS = {}; sessions.forEach(x => { (SESS[x.booking_id] = SESS[x.booking_id] || []).push(x); });
    CACHE = { t: Date.now(), bookings: b.data || [], specialists: s.data || [], sessions, spec, price, amount };
    return CACHE;
  }
  // حالة الجلسة المشتقة (من الدفع والموعد والنتيجة)
  const ST = {
    unpaid: { l: 'بانتظار الدفع', c: '#9C3F47', bg: '#F6E5E7' },
    upcoming: { l: 'مدفوع — بانتظار الموعد', c: '#7D5F27', bg: '#FBF1DC' },
    soon: { l: 'قريباً (خلال ٢٤ ساعة)', c: '#fff', bg: '#C9A15F' },
    norecord: { l: 'انتهى الموعد — لم تُسجَّل النتيجة', c: '#fff', bg: '#C0562E' },
    progress: { l: 'جارية (جلسات مسجّلة وأخرى بانتظار)', c: '#fff', bg: '#5B4A86' },
    completed: { l: 'تمت', c: '#2E6B45', bg: '#DCEFE3' },
    noshow: { l: 'لم يحضر المراجع', c: '#5B4A86', bg: '#E8E2F4' },
    cancelled: { l: 'ملغاة', c: '#6B6072', bg: '#ECE8EE' },
  };
  const isActiveB = (b) => b.paid && b.status !== 'ملغى';
  const overdueS = (x, hours) => x.status === 'scheduled' && x.scheduled_at && Date.now() - new Date(x.scheduled_at).getTime() > (hours || 0) * 3600e3;
  function sessState(b) {
    if (b.status === 'ملغى') return 'cancelled';
    if (!b.paid) return 'unpaid';
    const list = SESS[b.id], now = Date.now();
    if (list && list.length) {
      const done = list.filter(x => x.status !== 'scheduled');
      if (done.length === list.length) return list.some(x => x.status === 'completed') ? 'completed' : 'noshow';
      if (list.some(x => overdueS(x, 0))) return 'norecord';
      if (done.length) return 'progress';
      const t0 = Math.min(...list.map(x => (x.scheduled_at ? new Date(x.scheduled_at).getTime() : Infinity)), Infinity);
      return t0 - now < 24 * 3600e3 && t0 !== Infinity ? 'soon' : 'upcoming';
    }
    if (b.outcome === 'completed') return 'completed';
    if (b.outcome === 'client_no_show') return 'noshow';
    const t = new Date(b.preferred_datetime).getTime();
    if (t < now) return 'norecord';
    return t - now < 24 * 3600e3 ? 'soon' : 'upcoming';
  }
  const stChip = (k) => `<span class="kx-st" style="--c:${ST[k].c}; --bg:${ST[k].bg};">${ST[k].l}</span>`;

  // الأتعاب: 10$ لأول جلسة محتسبة مع كل مستفيد (لكل أخصائي) و15$ لكل لاحقة
  function computeFees(core) {
    const bk = Object.fromEntries(core.bookings.map(b => [b.id, b]));
    const rows = (core.sessions || []).filter(x => x.status !== 'scheduled' && x.done_at && bk[x.booking_id] && isActiveB(bk[x.booking_id]) && (x.specialist_id || bk[x.booking_id].specialist_id))
      .sort((a, c) => new Date(a.done_at) - new Date(c.done_at) || a.seq - c.seq);
    const seen = {}; const out = [];
    rows.forEach(x => {
      const b = bk[x.booking_id], sid = x.specialist_id || b.specialist_id, k = sid + '|' + String(b.email).toLowerCase(); seen[k] = (seen[k] || 0) + 1;
      out.push({ b, s: x, sid, first: seen[k] === 1, fee: seen[k] === 1 ? FEE_FIRST : FEE_NEXT, month: monthKey(x.done_at) });
    });
    return out;
  }

  /* =====================================================================
     1) لوحة التحليلات
     ===================================================================== */
  function svgBars(series, { color = '#C9A15F', h = 150, fmt = (v) => num(v) } = {}) {
    const W = 640, pad = 22, n = series.length || 1, bw = (W - pad * 2) / n, max = Math.max(1, ...series.map(s => s.v));
    const bars = series.map((s, i) => {
      const bh = Math.round((s.v / max) * (h - 30)), x = pad + i * bw;
      return `<rect x="${(x + bw * 0.14).toFixed(1)}" y="${h - 18 - bh}" width="${(bw * 0.72).toFixed(1)}" height="${Math.max(bh, s.v ? 2 : 0)}" rx="2" fill="${color}"><title>${esc(s.l)}: ${esc(fmt(s.v))}</title></rect>`;
    }).join('');
    const step = Math.max(1, Math.ceil(n / 8));
    const labels = series.map((s, i) => (i % step === 0 || i === n - 1) ? `<text x="${(pad + i * bw + bw / 2).toFixed(1)}" y="${h - 3}" font-size="10" text-anchor="middle" fill="#8b8197">${esc(s.sl || s.l)}</text>` : '').join('');
    return `<svg viewBox="0 0 ${W} ${h}" role="img"><line x1="${pad}" x2="${W - pad}" y1="${h - 18}" y2="${h - 18}" stroke="#E6DFDA"/><text x="${pad}" y="12" font-size="10" fill="#8b8197">${esc(fmt(max))}</text>${bars}${labels}</svg>`;
  }
  const hbars = (rows, fmt, color) => {
    fmt = fmt || ((v) => num(v));
    const max = Math.max(1, ...rows.map(r => r.v));
    return rows.length ? rows.map(r => `<div class="kx-hbar"><span class="nm" title="${esc(r.l)}">${esc(r.l)}</span><span class="tr"><i style="width:${Math.round(r.v / max * 100)}%;${color ? 'background:' + color : ''}"></i></span><span class="v">${esc(fmt(r.v))}</span></div>`).join('') : '<p style="color:var(--text-muted-light); font-size:13px;">لا بيانات بعد.</p>';
  };
  const dayKey = (d) => d.toISOString().slice(0, 10);
  let anaDays = 30;
  async function loadAnalytics() {
    const el = $('tab-analytics');
    el.innerHTML = '<h2 class="section-title">لوحة التحليلات</h2><p class="section-sub">جارٍ التحميل...</p>';
    let core, signups = [];
    try { core = await loadCore(true); } catch (e) { el.innerHTML = '<h2 class="section-title">لوحة التحليلات</h2><p class="section-sub">تعذّر تحميل البيانات.</p>'; console.error(e); return; }
    const sr = await sb().rpc('admin_signup_series', { p_days: anaDays });
    signups = sr.data || [];
    const since = Date.now() - anaDays * 86400e3;
    const inRange = core.bookings.filter(b => new Date(b.created_at).getTime() >= since);
    const paid = inRange.filter(b => b.paid && b.status !== 'ملغى');
    const revenue = paid.reduce((s, b) => s + core.amount(b), 0);
    const fees = computeFees(core).filter(f => new Date(f.s.done_at).getTime() >= since);
    const feeSum = fees.reduce((s, f) => s + f.fee, 0);
    const bkMap = Object.fromEntries(core.bookings.map(b => [b.id, b]));
    const heldSessions = core.sessions.filter(x => x.status !== 'scheduled' && x.done_at && new Date(x.done_at).getTime() >= since && bkMap[x.booking_id] && isActiveB(bkMap[x.booking_id]));
    const completed = heldSessions.filter(x => x.status === 'completed').length, noshow = heldSessions.filter(x => x.status === 'no_show').length;
    const cancelledPaid = inRange.filter(b => b.paid && b.status === 'ملغى').length;
    const conv = inRange.length ? Math.round(paid.length / inRange.length * 100) : 0;
    const days = []; for (let i = anaDays - 1; i >= 0; i--) days.push(new Date(Date.now() - i * 86400e3));
    const dayLbl = (d) => d.toLocaleDateString(AR, { day: 'numeric', month: 'numeric' });
    const byDayCreated = {}, byDayRev = {};
    inRange.forEach(b => { const k = dayKey(new Date(b.created_at)); byDayCreated[k] = (byDayCreated[k] || 0) + 1; });
    paid.forEach(b => { const k = dayKey(new Date(b.created_at)); byDayRev[k] = (byDayRev[k] || 0) + core.amount(b); });
    const grp = (arr, f, v) => { const m = {}; arr.forEach(x => { const k = f(x) || '—'; m[k] = (m[k] || 0) + (v ? v(x) : 1); }); return Object.entries(m).map(([l, val]) => ({ l, v: val })).sort((a, b) => b.v - a.v); };
    const byPkg = grp(paid, b => b.package_name, b => core.amount(b));
    const bySpecRev = grp(paid, b => (core.spec[b.specialist_id] || {}).full_name || b.specialist_name || 'بدون أخصائي', b => core.amount(b)).slice(0, 8);
    const bySpecN = grp(heldSessions, x => (core.spec[x.specialist_id] || {}).full_name || '—').slice(0, 8);
    const methods = grp(paid, b => (b.payment_method === 'cliq' ? 'كليك' : 'بطاقة (Stripe)'));
    const tz = grp(inRange, b => b.client_tz).slice(0, 8);
    const wd = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((l, i) => ({ l, v: paid.filter(b => new Date(b.preferred_datetime).getUTCDay() === i).length }));
    const promos = grp(inRange.filter(b => Number(b.discount_percent) > 0), b => b.promo_code || 'عرض أول جلسة');
    const discountCost = paid.filter(b => Number(b.discount_percent) > 0).reduce((s, b) => s + Math.max(0, (core.price[b.package_name] || 0) - core.amount(b)), 0);
    const kpi = (v, l, sub) => `<div class="kx-kpi"><b>${v}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
    const sigTotal = signups.reduce((s, x) => s + x.signups, 0);
    el.innerHTML = `
      <h2 class="section-title">لوحة التحليلات</h2>
      <div class="kx-bar"><span style="font-size:13px;">الفترة:</span>
        ${[7, 30, 90, 365].map(d => `<button type="button" class="kx-chip${d === anaDays ? ' on' : ''}" data-ana="${d}">${d === 365 ? 'سنة' : d + ' يوم'}</button>`).join('')}
        <button type="button" class="btn-secondary" id="anaCsv" style="margin-inline-start:auto; padding:8px 16px;">تصدير الحجوزات CSV</button></div>
      <div class="kx-kpis">
        ${kpi(num(inRange.length), 'طلبات حجز')}${kpi(num(paid.length), 'حجوزات مدفوعة', conv + '% من الطلبات')}
        ${kpi(usd(revenue), 'الإيرادات (مدفوعة)', paid.length ? 'متوسط ' + usd(revenue / paid.length) : '')}${kpi(usd(feeSum), 'أتعاب الأخصائيين (تقديري)')}
        ${kpi(usd(revenue - feeSum), 'هامش تقديري قبل الرسوم', 'الإيراد − أتعاب الجلسات المحتسبة')}${kpi(num(completed), 'جلسات تمت', noshow ? num(noshow) + ' لم يحضر المراجع' : '')}
        ${kpi(num(cancelledPaid), 'ملغاة بعد الدفع')}${kpi(num(sigTotal), 'مسجَّلون جدد')}${kpi(usd(discountCost), 'تكلفة الخصومات', num(promos.reduce((s, p) => s + p.v, 0)) + ' حجز بخصم')}
      </div>
      <div class="kx-grid2">
        <div class="kx-card"><h3>طلبات الحجز يومياً</h3>${svgBars(days.map(d => ({ l: d.toLocaleDateString(AR, { dateStyle: 'medium' }), sl: dayLbl(d), v: byDayCreated[dayKey(d)] || 0 })))}</div>
        <div class="kx-card"><h3>الإيرادات اليومية (دولار)</h3>${svgBars(days.map(d => ({ l: d.toLocaleDateString(AR, { dateStyle: 'medium' }), sl: dayLbl(d), v: byDayRev[dayKey(d)] || 0 })), { color: '#2E6B45', fmt: usd })}</div>
      </div>
      <div class="kx-grid2">
        <div class="kx-card"><h3>التسجيلات الجديدة يومياً</h3>${svgBars(signups.map(s => ({ l: fmtD(s.day), sl: new Date(s.day).toLocaleDateString(AR, { day: 'numeric', month: 'numeric' }), v: s.signups })), { color: '#5B4A86' })}</div>
        <div class="kx-card"><h3>قمع الحجز</h3>${hbars([{ l: 'طلبات الحجز', v: inRange.length }, { l: 'مدفوعة', v: paid.length }, { l: 'جلسات مسجَّلة', v: heldSessions.length }, { l: 'جلسات تمت', v: completed }], null, '#C9A15F')}</div>
      </div>
      <div class="kx-grid2">
        <div class="kx-card"><h3>الإيراد حسب الباقة</h3>${hbars(byPkg, usd)}</div>
        <div class="kx-card"><h3>الإيراد حسب الأخصائي (الأعلى ٨)</h3>${hbars(bySpecRev, usd, '#2E6B45')}</div>
      </div>
      <div class="kx-grid2">
        <div class="kx-card"><h3>الجلسات المسجَّلة حسب الأخصائي</h3>${hbars(bySpecN, null, '#5B4A86')}</div>
        <div class="kx-card"><h3>طريقة الدفع</h3>${hbars(methods)}<h3 style="margin-top:18px;">أكواد وعروض الخصم</h3>${hbars(promos)}</div>
      </div>
      <div class="kx-grid2">
        <div class="kx-card"><h3>أيام الأسبوع الأكثر حجزاً (موعد الجلسة)</h3>${svgBars(wd, { h: 130 })}</div>
        <div class="kx-card"><h3>مناطق العملاء الزمنية (من الأكثر)</h3>${hbars(tz)}</div>
      </div>
      <p class="section-sub">الأرقام من الحجوزات المسجَّلة بالموقع. الأتعاب تُحسب بالعقد (${FEE_FIRST}$ أول جلسة مع كل مستفيد و${FEE_NEXT}$ لاحقاً) على الجلسات التي سُجّلت نتيجتها فقط.</p>`;
    el.querySelectorAll('[data-ana]').forEach(b => b.addEventListener('click', () => { anaDays = +b.dataset.ana; loadAnalytics(); }));
    $('anaCsv').addEventListener('click', () => downloadCsv('bookings.csv', [['id', 'created', 'session_at', 'client', 'email', 'package', 'amount_usd', 'paid', 'status', 'outcome', 'specialist', 'method', 'promo', 'client_tz']].concat(
      core.bookings.map(b => [b.id, b.created_at, b.preferred_datetime, b.full_name, b.email, b.package_name, core.amount(b), b.paid, b.status, b.outcome || '', (core.spec[b.specialist_id] || {}).full_name || b.specialist_name || '', b.payment_method || 'card', b.promo_code || '', b.client_tz || '']))));
  }

  /* =====================================================================
     2) متابعة الجلسات
     ===================================================================== */
  const sf = { state: 'all', spec: '', q: '', month: '' };
  const KIND_LABEL = {
    session: 'سُجّلت جلسة', session_time: 'حُدّد موعد جلسة', created: 'أُنشئ الطلب', paid: 'تم الدفع', status: 'تغيّرت الحالة', outcome: 'سُجّلت نتيجة الجلسة', assigned: 'عُيّن الأخصائي',
    payment_method: 'تغيّرت طريقة الدفع', cliq_reported: 'العميل أبلغ بحوالة كليك', rescheduled: 'تغيّر الموعد', meeting_link: 'أُضيف رابط الجلسة', deleted: 'حُذف الحجز',
  };
  const OUT_L = { completed: 'جلسة تمت', client_no_show: 'لم يحضر المراجع' };
  const evText = (e) => {
    const d = e.detail || {};
    switch (e.kind) {
      case 'created': return `${KIND_LABEL.created}${d.specialist ? ' مع ' + d.specialist : ''}${d.session_at ? ' — موعد ' + fmtDT(d.session_at) : ''}`;
      case 'paid': return `${KIND_LABEL.paid}${d.method === 'cliq' ? ' (كليك)' : ''}${d.amount_usd != null ? ' — ' + usd(d.amount_usd) : ''}${d.approx_time ? ' (الوقت تقريبي)' : ''}`;
      case 'status': return `الحالة: ${d.from || '—'} ← ${d.to || '—'}`;
      case 'outcome': return `${KIND_LABEL.outcome}: ${OUT_L[d.to] || d.to || 'مسح النتيجة'}${d.approx_time ? ' (الوقت تقريبي)' : ''}`;
      case 'session': return `الجلسة ${d.seq}: ${d.to === 'completed' ? 'تمت' : d.to === 'no_show' ? 'لم يحضر المراجع' : 'أُعيدت لبانتظار'}`;
      case 'session_time': return `موعد الجلسة ${d.seq}: ${d.at ? fmtDT(d.at) : 'بدون موعد'}`;
      case 'assigned': return `${KIND_LABEL.assigned}: ${d.specialist || '—'}`;
      case 'payment_method': return `${KIND_LABEL.payment_method}: ${d.to === 'cliq' ? 'كليك' : 'بطاقة'}`;
      case 'rescheduled': return `${KIND_LABEL.rescheduled}: ${d.from ? fmtDT(d.from) : '—'} ← ${d.to ? fmtDT(d.to) : '—'}`;
      default: return KIND_LABEL[e.kind] || e.kind;
    }
  };
  const actorTxt = (a) => !a ? '' : a === 'client' ? 'العميل' : a === 'system' ? 'النظام' : a === 'backfill' ? 'سجل سابق' : a;
  function modal(html, onClose) {
    const m = document.createElement('div'); m.className = 'kx-modal';
    m.innerHTML = `<div class="kx-modal-box">${html}</div>`;
    const close = () => { m.remove(); document.body.style.overflow = ''; if (onClose) onClose(); };
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
    document.body.appendChild(m); document.body.style.overflow = 'hidden';
    const x = m.querySelector('.kx-x'); if (x) x.addEventListener('click', close);
    return { el: m, close };
  }
  async function openTimeline(b, core) {
    const sp = core.spec[b.specialist_id];
    const mm = modal(`<div class="hd"><h3>مسار الحجز: ${esc(b.full_name)}</h3><button type="button" class="kx-x" aria-label="إغلاق">&times;</button></div>
      <div style="font-size:13.5px; line-height:2; margin-bottom:12px;">${esc(b.package_name)} · ${usd(core.amount(b))}${Number(b.discount_percent) > 0 ? ' (خصم ' + b.discount_percent + '%)' : ''}<br>
      الموعد: <b>${fmtDT(b.preferred_datetime, 'Asia/Amman')}</b> بتوقيت عمّان${b.client_tz ? ' · عند العميل: ' + fmtDT(b.preferred_datetime, b.client_tz) + ' (' + esc(b.client_tz) + ')' : ''}<br>
      الأخصائي: <b>${esc(sp ? sp.full_name : (b.specialist_name || 'غير معيّن'))}</b> · الحالة: ${stChip(sessState(b))}<br>
      <span dir="ltr">${esc(b.email)} · ${esc(b.phone || '')}</span></div>
      <h3 style="font-size:14.5px; margin:14px 0 10px;">سجل الأحداث</h3><div id="kxTl">جارٍ التحميل...</div>`);
    const { data, error } = await sb().from('booking_events').select('*').eq('booking_id', b.id).order('created_at', { ascending: true });
    const box = mm.el.querySelector('#kxTl');
    if (error) { box.textContent = 'تعذّر تحميل السجل.'; return; }
    box.innerHTML = (data || []).length ? `<ul class="kx-tl">${data.map(e => `<li>${esc(evText(e))}<time>${fmtDT(e.created_at)}${e.actor ? ' · ' + esc(actorTxt(e.actor)) : ''}</time></li>`).join('')}</ul>` : '<p style="color:var(--text-muted-light);">لا أحداث مسجّلة.</p>';
  }
  const SESS_ERR_AR = { set_time_first: 'حدّد موعد الجلسة أولاً', session_in_future: 'لم يحن موعد الجلسة', previous_session_pending: 'سجّل الجلسة السابقة أولاً', too_soon_after_previous: 'أقل من ١٢ ساعة بعد الجلسة السابقة', booking_not_active: 'الحجز غير نشط', forbidden: 'غير مسموح' };
  const sessErrAr = (e) => { const m = String((e && e.message) || ''); const k = Object.keys(SESS_ERR_AR).find(x => m.includes(x)); return k ? SESS_ERR_AR[k] : 'تعذّر الحفظ'; };
  const toInput = (iso) => { if (!iso) return ''; const d = new Date(iso), p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  function openSessions(b, core) {
    const mm = modal('<div id="smBox"></div>');
    const paint = () => {
      const ls = SESS[b.id] || [], sp = core.spec[b.specialist_id];
      mm.el.querySelector('#smBox').innerHTML = `<div class="hd"><h3>جلسات: ${esc(b.full_name)}</h3><button type="button" class="kx-x" aria-label="إغلاق">&times;</button></div>
        <p style="font-size:13.5px; line-height:1.9; margin-bottom:10px;">${esc(b.package_name)} · الأخصائي: <b>${esc(sp ? sp.full_name : (b.specialist_name || 'غير معيّن'))}</b><br><span style="color:var(--text-muted-light);">الجلسة المسجّلة (تمت أو لم يحضر) تُحتسب أتعابها للأخصائي. غير المسجّلة لا تُحتسب. لا استرجاع للعميل.</span></p>
        ${ls.map(x => `<div style="border-top:1px solid var(--fog-dim); padding:12px 0; display:flex; gap:8px 10px; flex-wrap:wrap; align-items:center;"><b>الجلسة ${x.seq} من ${ls.length}</b>
          ${x.status === 'scheduled' ? (overdueS(x, 0) ? '<span class="kx-st" style="--c:#fff; --bg:#C0562E;">بانتظار التسجيل</span>' : '<span class="kx-st" style="--c:#7D5F27; --bg:#FBF1DC;">مجدولة</span>') : x.status === 'completed' ? '<span class="kx-st" style="--c:#2E6B45; --bg:#DCEFE3;">تمت</span>' : '<span class="kx-st" style="--c:#5B4A86; --bg:#E8E2F4;">لم يحضر المراجع</span>'}
          <input type="datetime-local" data-at="${esc(x.id)}" value="${esc(toInput(x.scheduled_at))}" style="border:1.5px solid var(--fog-dim); border-radius:10px; padding:6px 9px; font-family:inherit; font-size:13px;">
          <button type="button" class="btn-secondary" data-act="time:${esc(x.id)}" style="padding:5px 12px; font-size:12px;">حفظ الموعد</button>
          ${x.status === 'scheduled' ? `<button type="button" class="btn-primary" data-act="completed:${esc(x.id)}" style="width:auto; margin:0; padding:6px 14px; font-size:12.5px;">تمّت ✓</button><button type="button" class="btn-secondary" data-act="no_show:${esc(x.id)}" style="padding:5px 12px; font-size:12px;">لم يحضر</button>` : `<button type="button" class="btn-secondary" data-act="scheduled:${esc(x.id)}" style="padding:5px 12px; font-size:12px; color:var(--alert);">تراجع</button><span style="font-size:11.5px; color:var(--text-muted-light);">${x.done_at ? fmtDT(x.done_at) : ''}${x.marked_by ? ' · ' + esc(x.marked_by) : ''}</span>`}</div>`).join('') || '<p>لا جلسات لهذا الحجز.</p>'}
        <span id="smMsg" style="font-size:13px; color:var(--alert);"></span>`;
      mm.el.querySelector('.kx-x').addEventListener('click', mm.close);
      mm.el.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', async () => {
        const [act, id] = btn.dataset.act.split(':'); let r;
        if (act === 'time') { const v = mm.el.querySelector('[data-at="' + id + '"]').value; r = await sb().rpc('set_session_time', { p_session: id, p_at: v ? new Date(v).toISOString() : null }); }
        else { if (!confirm(act === 'scheduled' ? 'التراجع عن تسجيل هذه الجلسة؟ ستعود بانتظار التسجيل.' : (act === 'completed' ? 'تسجيل الجلسة «تمت»؟ تُحتسب أتعابها للأخصائي ويُسجَّل اسمك.' : 'تسجيل «لم يحضر المراجع»؟ تُحتسب بالأتعاب حسب العقد.'))) return;
          r = await sb().rpc('mark_session', { p_session: id, p_status: act }); }
        if (r.error) { mm.el.querySelector('#smMsg').textContent = sessErrAr(r.error); return; }
        const fresh = await sb().from('booking_sessions').select('*').eq('booking_id', b.id).order('seq', { ascending: true });
        SESS[b.id] = fresh.data || []; CACHE = null; paint();
      }));
    };
    paint();
    const closeOrig = mm.close; mm.close = () => { closeOrig(); loadSessions(); };
  }
  async function loadSessions() {
    const el = $('tab-sessions');
    el.innerHTML = '<h2 class="section-title">متابعة الجلسات</h2><p class="section-sub">جارٍ التحميل...</p>';
    let core; try { core = await loadCore(true); } catch (e) { el.innerHTML = '<h2 class="section-title">متابعة الجلسات</h2><p class="section-sub">تعذّر التحميل.</p>'; return; }
    const all = core.bookings;
    const months = [...new Set(all.map(b => monthKey(b.preferred_datetime)))].sort().reverse();
    const counts = { all: all.length }; Object.keys(ST).forEach(k => counts[k] = 0); all.forEach(b => counts[sessState(b)]++);
    const bkM = Object.fromEntries(all.map(b => [b.id, b]));
    const attention = core.sessions.filter(x => overdueS(x, 12) && bkM[x.booking_id] && isActiveB(bkM[x.booking_id]));
    const unassigned = all.filter(b => b.paid && b.status !== 'ملغى' && !b.specialist_id && new Date(b.preferred_datetime) > Date.now());
    el.innerHTML = `
      <h2 class="section-title">متابعة الجلسات</h2>
      <p class="section-sub">كل حجز وحالته الفعلية: الدفع، الموعد، ونتيجة الجلسة. كل تغيير يُسجَّل في سجل أحداث بمن فعله ومتى.</p>
      ${attention.length ? `<div class="kx-warn">⚠ <b>${attention.length}</b> جلسة مرّ موعدها بأكثر من ١٢ ساعة ولم تُسجَّل. اضغط الفلتر «انتهى الموعد — لم تُسجَّل النتيجة» وتابع مع الأخصائيين؛ الجلسة التي لا تُسجَّل لا تدخل في الأتعاب، ولا يُعاد للعميل أي مبلغ.</div>` : ''}
      ${unassigned.length ? `<div class="kx-warn">⚠ <b>${unassigned.length}</b> حجز مدفوع قادم بدون أخصائي معيّن.</div>` : ''}
      <div class="kx-bar" id="sfChips">${[['all', 'الكل']].concat(Object.entries(ST).map(([k, v]) => [k, v.l])).map(([k, l]) => `<button type="button" class="kx-chip${sf.state === k ? ' on' : ''}" data-st="${k}">${l}<span class="n">${counts[k] || 0}</span></button>`).join('')}</div>
      <div class="kx-bar">
        <input type="search" id="sfQ" placeholder="بحث بالاسم أو البريد أو الهاتف" value="${esc(sf.q)}" style="min-width:230px;">
        <select id="sfSpec"><option value="">كل الأخصائيين</option>${core.specialists.sort((a, b) => a.full_name.localeCompare(b.full_name)).map(s => `<option value="${esc(s.id)}"${sf.spec === s.id ? ' selected' : ''}>${esc(s.full_name)}</option>`).join('')}</select>
        <select id="sfMonth"><option value="">كل الأشهر</option>${months.map(m => `<option value="${m}"${sf.month === m ? ' selected' : ''}>${monthLabel(m)}</option>`).join('')}</select>
        <span id="sfCount" style="font-size:12.5px; color:var(--text-muted-light);"></span>
      </div>
      <div style="overflow-x:auto;"><table><thead><tr><th>الموعد</th><th>العميل</th><th>الباقة / المبلغ</th><th>الأخصائي</th><th>الحالة</th><th>الجلسات</th><th></th></tr></thead><tbody id="sfBody"></tbody></table></div>`;
    const draw = () => {
      const q = sf.q.trim().toLowerCase();
      const list = all.filter(b => (sf.state === 'all' || sessState(b) === sf.state) && (!sf.spec || b.specialist_id === sf.spec) && (!sf.month || monthKey(b.preferred_datetime) === sf.month)
        && (!q || (b.full_name + ' ' + b.email + ' ' + (b.phone || '')).toLowerCase().includes(q))).sort((a, c) => new Date(c.preferred_datetime) - new Date(a.preferred_datetime));
      $('sfCount').textContent = list.length + ' حجز';
      $('sfBody').innerHTML = list.length ? list.map(b => {
        const sp = core.spec[b.specialist_id], st = sessState(b);
        const ls = SESS[b.id] || [], dn = ls.filter(x => x.status !== 'scheduled').length;
        const outSel = isActiveB(b) && ls.length ? `<div style="font-weight:700;">${dn} / ${ls.length}</div><div style="display:flex; gap:3px; margin:4px 0 6px;">${ls.map(x => `<i title="${x.seq}" style="width:11px; height:11px; border-radius:50%; background:${x.status === 'completed' ? '#2E6B45' : x.status === 'no_show' ? '#5B4A86' : overdueS(x, 0) ? '#C0562E' : '#DDD7E2'};"></i>`).join('')}</div><button type="button" class="btn-secondary" data-sm="${esc(b.id)}" style="padding:4px 12px; font-size:12px;">إدارة الجلسات</button>` : '—';
        return `<tr><td>${fmtDT(b.preferred_datetime, 'Asia/Amman')}<div style="font-size:11.5px; color:var(--text-muted-light);">بتوقيت عمّان${b.client_tz ? ' · العميل: ' + esc(b.client_tz.split('/').pop().replace(/_/g, ' ')) : ''}</div></td>
          <td>${esc(b.full_name)}<div style="font-size:12px; color:var(--text-muted-light);" dir="ltr">${esc(b.email)}</div></td>
          <td>${esc(b.package_name)}<div style="font-size:12px; color:var(--text-muted-light);">${usd(core.amount(b))}${Number(b.discount_percent) > 0 ? ' · خصم ' + b.discount_percent + '%' : ''}${b.payment_method === 'cliq' ? ' · كليك' : ''}</div></td>
          <td>${sp ? esc(sp.full_name) : '<span style="color:var(--alert);">غير معيّن</span>'}</td><td>${stChip(st)}</td><td>${outSel}</td>
          <td><button type="button" class="btn-secondary" data-tl="${esc(b.id)}" style="padding:5px 12px; font-size:12px;">المسار</button></td></tr>`;
      }).join('') : '<tr><td colspan="7">لا نتائج.</td></tr>';
      $('sfBody').querySelectorAll('[data-tl]').forEach(btn => btn.addEventListener('click', () => openTimeline(all.find(x => x.id === btn.dataset.tl), core)));
      $('sfBody').querySelectorAll('[data-sm]').forEach(btn => btn.addEventListener('click', () => openSessions(all.find(x => x.id === btn.dataset.sm), core)));
    };
    $('sfChips').querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => { sf.state = b.dataset.st; loadSessions(); }));
    $('sfQ').addEventListener('input', (e) => { sf.q = e.target.value; draw(); });
    $('sfSpec').addEventListener('change', (e) => { sf.spec = e.target.value; draw(); });
    $('sfMonth').addEventListener('change', (e) => { sf.month = e.target.value; draw(); });
    draw();
  }

  /* =====================================================================
     3) مستحقات الأخصائيين
     ===================================================================== */
  let payMonth = '';
  async function loadPayouts() {
    const el = $('tab-payouts');
    el.innerHTML = '<h2 class="section-title">مستحقات الأخصائيين</h2><p class="section-sub">جارٍ التحميل...</p>';
    let core, pay;
    try { core = await loadCore(true); const r = await sb().from('specialist_payouts').select('*'); if (r.error) throw r.error; pay = r.data || []; }
    catch (e) { el.innerHTML = '<h2 class="section-title">مستحقات الأخصائيين</h2><p class="section-sub">تعذّر التحميل.</p>'; console.error(e); return; }
    const fees = computeFees(core);
    const months = [...new Set(fees.map(f => f.month).concat(monthKey(new Date().toISOString())))].sort().reverse();
    if (!payMonth || !months.includes(payMonth)) payMonth = months[0];
    const payMap = Object.fromEntries(pay.map(p => [p.specialist_id + '|' + p.period.slice(0, 7), p]));
    const agg = {}; // specialist|month
    fees.forEach(f => { const k = f.sid + '|' + f.month; const a = agg[k] = agg[k] || { sid: f.sid, month: f.month, completed: 0, noshow: 0, first: 0, later: 0, amount: 0 }; if (f.s.status === 'completed') a.completed++; else a.noshow++; f.first ? a.first++ : a.later++; a.amount += f.fee; });
    const rows = Object.values(agg).filter(a => a.month === payMonth).sort((a, b) => b.amount - a.amount);
    const due = dueDate(payMonth), overdue = Date.now() > due.getTime();
    const unrec = {}; const bkP = Object.fromEntries(core.bookings.map(b => [b.id, b])); core.sessions.forEach(x => { const bb = bkP[x.booking_id]; if (bb && isActiveB(bb) && overdueS(x, 0) && (x.specialist_id || bb.specialist_id) && monthKey(x.scheduled_at) === payMonth) { const sid = x.specialist_id || bb.specialist_id; unrec[sid] = (unrec[sid] || 0) + 1; } });
    const totalDue = rows.reduce((s, r) => s + r.amount, 0), totalPaid = rows.reduce((s, r) => { const p = payMap[r.sid + '|' + r.month]; return s + (p ? Number(p.amount_usd) : 0); }, 0);
    // رصيد كل أخصائي عبر كل الأشهر
    const life = {}; Object.values(agg).forEach(a => { const l = life[a.sid] = life[a.sid] || { earned: 0, paid: 0, sessions: 0 }; l.earned += a.amount; l.sessions += a.completed + a.noshow; });
    pay.forEach(p => { const l = life[p.specialist_id] = life[p.specialist_id] || { earned: 0, paid: 0, sessions: 0 }; l.paid += Number(p.amount_usd); });
    el.innerHTML = `
      <h2 class="section-title">مستحقات الأخصائيين</h2>
      <p class="section-sub">محسوبة تلقائياً من الجلسات المسجَّلة نتيجتها: <b>${FEE_FIRST}$</b> عن أول جلسة مكتملة مع كل مستفيد و<b>${FEE_NEXT}$</b> عن كل جلسة لاحقة مع المستفيد نفسه (غياب المراجع يُحتسب). تُدفع بحلول <b>اليوم ${DUE_DAY}</b> من الشهر التالي.</p>
      <div class="kx-bar"><select id="pyMonth">${months.map(m => `<option value="${m}"${m === payMonth ? ' selected' : ''}>${monthLabel(m)}</option>`).join('')}</select>
        <span style="font-size:13px;">موعد الدفع: <b>${due.toLocaleDateString(AR, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</b>${overdue && totalPaid < totalDue ? ' <span style="color:var(--alert); font-weight:700;">— متأخر</span>' : ''}</span>
        <button type="button" class="btn-secondary" id="pyCsv" style="margin-inline-start:auto; padding:8px 16px;">تصدير CSV</button></div>
      <div class="kx-kpis"><div class="kx-kpi"><b>${usd(totalDue)}</b><span>مستحق عن ${monthLabel(payMonth)}</span></div><div class="kx-kpi"><b>${usd(totalPaid)}</b><span>مدفوع</span></div><div class="kx-kpi"><b style="color:${totalDue - totalPaid > 0 ? '#C0562E' : '#2E6B45'}">${usd(totalDue - totalPaid)}</b><span>متبقٍ</span></div><div class="kx-kpi"><b>${rows.length}</b><span>أخصائي لهم جلسات</span></div></div>
      <div style="overflow-x:auto;"><table><thead><tr><th>الأخصائي</th><th>جلسات (تمت / غياب)</th><th>أولى × ${FEE_FIRST}$</th><th>لاحقة × ${FEE_NEXT}$</th><th>المستحق</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${rows.length ? rows.map(r => { const sp = core.spec[r.sid] || { full_name: '—' }; const p = payMap[r.sid + '|' + r.month];
        return `<tr><td>${esc(sp.full_name)}${unrec[r.sid] ? `<div style="font-size:11.5px; color:#C0562E;">⚠ ${unrec[r.sid]} جلسة بدون نتيجة (غير محتسبة)</div>` : ''}</td><td>${r.completed + r.noshow} <span style="color:var(--text-muted-light); font-size:12px;">(${r.completed} / ${r.noshow})</span></td><td>${r.first}</td><td>${r.later}</td><td><b>${usd(r.amount)}</b></td>
          <td>${p ? `<span class="kx-st" style="--c:#2E6B45; --bg:#DCEFE3;">دُفع ${usd(p.amount_usd)}</span><div style="font-size:11.5px; color:var(--text-muted-light);">${fmtD(p.paid_at)}${p.method ? ' · ' + esc(p.method) : ''}${p.reference ? ' · ' + esc(p.reference) : ''}</div>` : `<span class="kx-st" style="--c:${overdue ? '#fff' : '#7D5F27'}; --bg:${overdue ? '#C0562E' : '#FBF1DC'};">${overdue ? 'متأخر' : 'مستحق'}</span>`}</td>
          <td>${p ? `<button type="button" class="btn-secondary" data-unpay="${esc(p.id)}" style="padding:5px 12px; font-size:12px;">تراجع</button>` : `<button type="button" class="btn-primary" data-pay="${esc(r.sid)}|${r.month}|${r.amount}|${r.completed + r.noshow}" style="padding:6px 14px; font-size:12.5px; width:auto; margin:0;">تعليم كمدفوع</button>`}</td></tr>`; }).join('') : '<tr><td colspan="7">ما في جلسات محتسبة بهذا الشهر.</td></tr>'}</tbody></table></div>
      <h3 style="font-size:15px; margin:26px 0 10px;">رصيد كل أخصائي (كل الأشهر)</h3>
      <div style="overflow-x:auto;"><table><thead><tr><th>الأخصائي</th><th>جلسات محتسبة</th><th>إجمالي المستحق</th><th>إجمالي المدفوع</th><th>الرصيد</th></tr></thead>
      <tbody>${Object.entries(life).sort((a, b) => (b[1].earned - b[1].paid) - (a[1].earned - a[1].paid)).map(([sid, l]) => `<tr><td>${esc((core.spec[sid] || { full_name: '—' }).full_name)}</td><td>${l.sessions}</td><td>${usd(l.earned)}</td><td>${usd(l.paid)}</td><td><b style="color:${l.earned - l.paid > 0 ? '#C0562E' : '#2E6B45'}">${usd(l.earned - l.paid)}</b></td></tr>`).join('') || '<tr><td colspan="5">لا بيانات بعد.</td></tr>'}</tbody></table></div>
      <p class="section-sub" style="margin-top:14px;">الجلسة تُحتسب فقط بعد أن يسجّل الأخصائي (أو الأدمن) نتيجتها. راجع «متابعة الجلسات» للجلسات غير المسجَّلة قبل صرف المستحقات. هذا كشف تقديري يعتمد على عقد الأخصائي، وتأكد من تطابقه مع الاتفاقية والفواتير الفعلية.</p>`;
    $('pyMonth').addEventListener('change', (e) => { payMonth = e.target.value; loadPayouts(); });
    $('pyCsv').addEventListener('click', () => downloadCsv('payouts-' + payMonth + '.csv', [['specialist', 'month', 'sessions_completed', 'no_show', 'first_x10', 'later_x15', 'due_usd', 'paid_usd', 'paid_at']].concat(rows.map(r => { const p = payMap[r.sid + '|' + r.month]; return [(core.spec[r.sid] || {}).full_name, r.month, r.completed, r.noshow, r.first, r.later, r.amount, p ? p.amount_usd : '', p ? p.paid_at : '']; }))));
    el.querySelectorAll('[data-pay]').forEach(btn => btn.addEventListener('click', () => {
      const [sid, month, amount, sessions] = btn.dataset.pay.split('|'); const sp = core.spec[sid] || { full_name: '' };
      const mm = modal(`<div class="hd"><h3>تعليم مدفوع: ${esc(sp.full_name)}</h3><button type="button" class="kx-x" aria-label="إغلاق">&times;</button></div>
        <p style="font-size:13.5px;">${monthLabel(month)} · ${sessions} جلسة · المستحق ${usd(amount)}</p>
        <div class="field"><label>المبلغ المدفوع فعلياً (دولار)</label><input type="number" id="pyAmt" step="0.01" min="0" value="${amount}"></div>
        <div class="field"><label>طريقة الدفع</label><input type="text" id="pyMethod" placeholder="تحويل بنكي / Wise / PayPal ..."></div>
        <div class="field"><label>مرجع التحويل (اختياري)</label><input type="text" id="pyRef"></div>
        <button type="button" class="btn-primary" id="pyOk" style="width:auto;">حفظ</button> <span id="pyMsg" style="font-size:13px; color:var(--alert);"></span>`);
      mm.el.querySelector('#pyOk').addEventListener('click', async () => {
        const amt = parseFloat(mm.el.querySelector('#pyAmt').value);
        if (!(amt >= 0)) { mm.el.querySelector('#pyMsg').textContent = 'المبلغ غير صالح.'; return; }
        const { data: u } = await sb().auth.getUser();
        const { error } = await sb().from('specialist_payouts').insert({ specialist_id: sid, period: month + '-01', amount_usd: amt, sessions: +sessions, method: mm.el.querySelector('#pyMethod').value.trim() || null, reference: mm.el.querySelector('#pyRef').value.trim() || null, paid_by: u && u.user ? u.user.email : null });
        if (error) { mm.el.querySelector('#pyMsg').textContent = 'تعذّر الحفظ: ' + error.message; return; }
        mm.close(); loadPayouts();
      });
    }));
    el.querySelectorAll('[data-unpay]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('إلغاء تعليم الدفع لهذا الشهر؟')) return;
      const { error } = await sb().from('specialist_payouts').delete().eq('id', btn.dataset.unpay);
      if (error) alert('تعذّر: ' + error.message); loadPayouts();
    }));
  }

  /* =====================================================================
     4) بانر الرئيسية
     ===================================================================== */
  const BANNER_BUCKET = 'site-banners';
  async function resizeBanner(file) {
    return new Promise((res, rej) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const W = 1800, H = 600; // نسبة 3:1، تُقص من المنتصف
        const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
        const k = Math.max(W / img.width, H / img.height), w = img.width * k, h = img.height * k;
        x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        URL.revokeObjectURL(u); c.toBlob(b => b ? res(b) : rej(new Error('encode')), 'image/jpeg', 0.84);
      };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('bad image')); }; img.src = u;
    });
  }
  async function loadBanner() {
    const el = $('tab-banner');
    el.innerHTML = '<h2 class="section-title">بانر الصفحة الرئيسية</h2><p class="section-sub">جارٍ التحميل...</p>';
    const { data, error } = await sb().from('hero_slides').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
    if (error) { el.innerHTML = '<h2 class="section-title">بانر الصفحة الرئيسية</h2><p class="section-sub">تعذّر التحميل.</p>'; console.error(error); return; }
    const slides = data || [];
    el.innerHTML = `<h2 class="section-title">بانر الصفحة الرئيسية</h2>
      <p class="section-sub">شرائح تتقلّب أعلى الصفحة الرئيسية (عربي وإنجليزي): صورة + عنوان + نص + <b>كود خصم</b> يظهر للزائر بزر نسخ + زر. الصورة تُقصّ تلقائياً بنسبة عريضة (٣:١). إن لم تضف شريحة نشطة تظهر الشرائح الافتراضية للموقع.</p>
      <button type="button" class="btn-primary" id="bnNew" style="width:auto; margin:0 0 16px;">+ شريحة جديدة</button>
      <div id="bnList">${slides.length ? slides.map((s, i) => `<div class="kx-slide">
        <div class="th" style="${s.image_url ? `background-image:url('${esc(s.image_url)}')` : 'background:linear-gradient(120deg,#241D2E,#5B4A86)'}"></div>
        <div class="tx"><b>${esc(s.title_ar || s.title_en || '(بدون عنوان)')}</b><span>${s.code ? 'الكود: <b dir="ltr">' + esc(s.code) + '</b> · ' : ''}${s.active ? '<span style="color:#2E6B45; font-weight:700;">ظاهرة</span>' : '<span style="color:#9a90a6;">مخفية</span>'}</span></div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button type="button" class="btn-secondary" data-up="${esc(s.id)}"${i === 0 ? ' disabled' : ''} style="padding:6px 12px;">↑</button>
          <button type="button" class="btn-secondary" data-down="${esc(s.id)}"${i === slides.length - 1 ? ' disabled' : ''} style="padding:6px 12px;">↓</button>
          <button type="button" class="btn-secondary" data-edit="${esc(s.id)}" style="padding:6px 14px;">تعديل</button>
          <button type="button" class="btn-secondary" data-del="${esc(s.id)}" style="padding:6px 14px; color:var(--alert);">حذف</button></div></div>`).join('') : '<p style="color:var(--text-muted-light);">ما في شرائح بعد. الموقع يعرض الشرائح الافتراضية حالياً.</p>'}</div>`;
    $('bnNew').addEventListener('click', () => editSlide(null, slides));
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editSlide(slides.find(s => s.id === b.dataset.edit), slides)));
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { if (!confirm('حذف هذه الشريحة؟')) return; await sb().from('hero_slides').delete().eq('id', b.dataset.del); loadBanner(); }));
    const move = async (id, dir) => {
      const i = slides.findIndex(s => s.id === id), j = i + dir; if (j < 0 || j >= slides.length) return;
      const a = slides[i], b = slides[j];
      await Promise.all([sb().from('hero_slides').update({ sort_order: j }).eq('id', a.id), sb().from('hero_slides').update({ sort_order: i }).eq('id', b.id)]);
      loadBanner();
    };
    el.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => move(b.dataset.up, -1)));
    el.querySelectorAll('[data-down]').forEach(b => b.addEventListener('click', () => move(b.dataset.down, 1)));
    // نُعيد ترقيم الترتيب إن تكرّر
    if (slides.some((s, i) => s.sort_order !== i)) Promise.all(slides.map((s, i) => sb().from('hero_slides').update({ sort_order: i }).eq('id', s.id)));
  }
  function editSlide(s, slides) {
    const v = s || { active: true };
    let img = v.image_url || '', uploaded = [];
    const f = (id, label, val, ph, area) => `<div class="field"><label for="${id}">${label}</label>${area ? `<textarea id="${id}" rows="2" maxlength="300" placeholder="${ph || ''}">${esc(val || '')}</textarea>` : `<input id="${id}" value="${esc(val || '')}" placeholder="${ph || ''}">`}</div>`;
    const mm = modal(`<div class="hd"><h3>${s ? 'تعديل الشريحة' : 'شريحة جديدة'}</h3><button type="button" class="kx-x" aria-label="إغلاق">&times;</button></div>
      <div class="field"><label>الصورة (تُقصّ عريضة ٣:١ — الأفضل صورة أفقية)</label>
        <div id="bnPrev" style="height:110px; border-radius:12px; background:var(--fog-dim) center/cover; margin-bottom:8px;"></div>
        <label class="btn-secondary" for="bnFile" style="display:inline-block; cursor:pointer;">رفع / تغيير الصورة</label><input type="file" id="bnFile" accept="image/jpeg,image/png,image/webp" style="display:none;"> <button type="button" class="btn-secondary" id="bnNoImg" style="color:var(--alert);">بدون صورة (خلفية بنفسجية)</button> <span id="bnImgMsg" style="font-size:12.5px; color:var(--text-muted-light);"></span></div>
      <div class="kx-two">${f('bnEyeAr', 'شارة صغيرة (عربي)', v.eyebrow_ar, 'عرض خاص')}${f('bnEyeEn', 'Small badge (English)', v.eyebrow_en, 'Special offer')}</div>
      <div class="kx-two">${f('bnTitleAr', 'العنوان (عربي) *', v.title_ar, 'خصم ٥٠٪ على أول جلسة')}${f('bnTitleEn', 'Title (English)', v.title_en, '50% off your first session')}</div>
      <div class="kx-two">${f('bnTextAr', 'نص قصير (عربي)', v.text_ar, '', true)}${f('bnTextEn', 'Short text (English)', v.text_en, '', true)}</div>
      <div class="kx-two">${f('bnCode', 'كود الخصم (يظهر بزر نسخ)', v.code, 'FIRST50')}${f('bnUrl', 'رابط الزر', v.cta_url, '/sales-page/')}</div>
      <div class="kx-two">${f('bnCtaAr', 'نص الزر (عربي)', v.cta_ar, 'احجز الآن')}${f('bnCtaEn', 'Button text (English)', v.cta_en, 'Book now')}</div>
      <label style="display:flex; gap:8px; align-items:center; margin:8px 0 16px; font-size:14px;"><input type="checkbox" id="bnActive"${v.active ? ' checked' : ''} style="width:auto;"> ظاهرة في الموقع</label>
      <button type="button" class="btn-primary" id="bnSave" style="width:auto;">حفظ</button> <span id="bnMsg" style="font-size:13px; color:var(--alert);"></span>`,
      () => { /* الصور المرفوعة وغير المستخدمة تُترك (صغيرة) */ });
    const q = (id) => mm.el.querySelector('#' + id);
    const paint = () => { q('bnPrev').style.backgroundImage = img ? `url('${img}')` : 'none'; if (!img) q('bnPrev').style.background = 'linear-gradient(120deg,#241D2E,#5B4A86)'; };
    paint();
    q('bnNoImg').addEventListener('click', () => { img = ''; paint(); });
    q('bnFile').addEventListener('change', async () => {
      const file = q('bnFile').files[0]; if (!file) return;
      q('bnImgMsg').textContent = 'جارٍ الرفع...';
      try {
        const blob = await resizeBanner(file); const path = 'slide-' + Date.now() + '.jpg';
        const { error } = await sb().storage.from(BANNER_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
        img = sb().storage.from(BANNER_BUCKET).getPublicUrl(path).data.publicUrl; uploaded.push(path); paint(); q('bnImgMsg').textContent = 'تم الرفع. اضغط حفظ.';
      } catch (e) { console.error(e); q('bnImgMsg').textContent = 'تعذّر رفع الصورة.'; }
    });
    q('bnSave').addEventListener('click', async () => {
      const row = { image_url: img || null, eyebrow_ar: q('bnEyeAr').value.trim() || null, eyebrow_en: q('bnEyeEn').value.trim() || null, title_ar: q('bnTitleAr').value.trim(), title_en: q('bnTitleEn').value.trim(),
        text_ar: q('bnTextAr').value.trim() || null, text_en: q('bnTextEn').value.trim() || null, code: q('bnCode').value.trim().toUpperCase() || null, cta_url: q('bnUrl').value.trim() || null,
        cta_ar: q('bnCtaAr').value.trim() || null, cta_en: q('bnCtaEn').value.trim() || null, active: q('bnActive').checked };
      if (!row.title_ar && !row.title_en) { q('bnMsg').textContent = 'اكتب عنواناً بالعربي أو بالإنجليزي.'; return; }
      if (row.cta_url && !/^(\/|https:\/\/)/.test(row.cta_url)) { q('bnMsg').textContent = 'الرابط يبدأ بـ / أو https://'; return; }
      const res = s ? await sb().from('hero_slides').update(row).eq('id', s.id) : await sb().from('hero_slides').insert({ ...row, sort_order: slides.length });
      if (res.error) { q('bnMsg').textContent = 'تعذّر الحفظ: ' + res.error.message; return; }
      mm.close(); loadBanner();
    });
  }

  /* =====================================================================
     5) الفريق: بطاقات بدل الجدول (مثل طلبات الانضمام)
     ===================================================================== */
  const tf = { f: 'all', q: '' };
  window.loadTeam = async function () {
    const table = document.querySelector('#tab-team table');
    if (table) table.style.display = 'none';
    let host = $('kxTeam');
    if (!host) { host = document.createElement('div'); host.id = 'kxTeam'; host.className = 'kx-team'; (table || $('tab-team')).insertAdjacentElement('beforebegin', host); }
    host.innerHTML = '<p style="color:var(--text-muted-light);">جارٍ التحميل...</p>';
    const { data, error } = await sb().from('specialists').select('*').order('sort_order', { ascending: true });
    if (error) { host.textContent = 'تعذّر تحميل البيانات.'; return; }
    const portal = await loadPortalStatus();
    const core = await loadCore(false).catch(() => ({ bookings: [] }));
    const slotRes = await sb().from('availability_slots').select('specialist_id').is('booking_id', null).gt('starts_at', new Date().toISOString()).limit(5000);
    const slotN = {}; (slotRes.data || []).forEach(r => { slotN[r.specialist_id] = (slotN[r.specialist_id] || 0) + 1; });
    const sess = {}; core.bookings.forEach(b => { if (b.paid && b.specialist_id && b.status !== 'ملغى') { const x = sess[b.specialist_id] = sess[b.specialist_id] || { paid: 0, done: 0 }; x.paid++; if (b.outcome) x.done++; } });
    const flags = (sp) => ({ pub: !!sp.is_published, hidden: !sp.is_published, nologin: !(portal[sp.id] && portal[sp.id].registered), noslots: !slotN[sp.id], notz: !sp.timezone_confirmed });
    const chips = [['all', 'الكل'], ['pub', 'منشور'], ['hidden', 'مخفي'], ['nologin', 'حسابه غير مفعّل'], ['noslots', 'بدون مواعيد'], ['notz', 'لم يؤكد توقيته']];
    host.innerHTML = `<div class="app-filters"><div class="app-chips" id="tmChips">${chips.map(([k, l]) => `<button type="button" class="app-chip${tf.f === k ? ' on' : ''}" data-f="${k}">${l}<span class="n">${data.filter(sp => k === 'all' || flags(sp)[k]).length}</span></button>`).join('')}</div>
      <input type="search" id="tmQ" placeholder="بحث بالاسم أو التخصص" value="${esc(tf.q)}"><span class="app-count" id="tmCount"></span>
      <button type="button" class="btn-secondary" id="tmBulk" style="display:none;"></button></div><div class="app-tiles" id="tmTiles"></div>`;
    const draw = () => {
      const q = tf.q.trim().toLowerCase();
      const list = data.filter(sp => (tf.f === 'all' || flags(sp)[tf.f]) && (!q || (sp.full_name + ' ' + (sp.full_name_en || '') + ' ' + sp.specialty).toLowerCase().includes(q)));
      $('tmCount').textContent = list.length + ' أخصائي';
      $('tmTiles').innerHTML = list.map(sp => {
        const f = flags(sp), p = portal[sp.id], s = sess[sp.id] || { paid: 0, done: 0 };
        const c = sp.is_published ? '#3C8C5A' : '#9a90a6', bg = sp.is_published ? '#F3FAF5' : '#F5F3F7', bd = sp.is_published ? '#CFE6D6' : '#DDD7E2';
        const portalTxt = !p ? 'غير مربوط بالبوابة' : f.nologin ? 'لم يفعّل حسابه' : 'حسابه مفعّل ✓';
        return `<div class="app-tile" style="--c:${c}; --bg:${bg}; --bd:${bd};" tabindex="0" role="button" data-sp="${esc(sp.id)}">
          <div class="ph"><img class="pic" loading="lazy" src="${esc(sp.photo_url || SP_PLACEHOLDER)}" alt=""><span class="st">${sp.is_published ? 'منشور' : 'مخفي'}</span></div>
          <div class="tb"><div class="nm">${esc(sp.full_name)}</div><div class="sp">${esc(sp.specialty)}</div>
          <div class="mt" style="${f.nologin ? 'color:#C0562E; font-weight:700;' : ''}">${portalTxt}</div>
          <div class="mt">${slotN[sp.id] ? slotN[sp.id] + ' موعد متاح' : '<span style="color:#C0562E;">بدون مواعيد</span>'} · ${s.paid} جلسة مدفوعة</div></div></div>`;
      }).join('') || '<p style="color:var(--text-muted-light);">لا نتائج.</p>';
      $('tmTiles').querySelectorAll('[data-sp]').forEach(t => { const open = () => startEditSpecialist(data.find(s => s.id === t.dataset.sp)); t.addEventListener('click', open); t.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); }); });
    };
    $('tmChips').querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { tf.f = b.dataset.f; $('tmChips').querySelectorAll('.app-chip').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
    $('tmQ').addEventListener('input', (e) => { tf.q = e.target.value; draw(); });
    const pending = data.filter(sp => portal[sp.id] && !portal[sp.id].registered);
    const bulk = $('tmBulk');
    if (pending.length) { bulk.style.display = ''; bulk.textContent = `إرسال دعوة لكل من لم يفعّل حسابه (${pending.length})`;
      bulk.addEventListener('click', async () => {
        if (!confirm('سيصل كل واحد من الـ ' + pending.length + ' أخصائي إيميل دعوة. متابعة؟')) return;
        bulk.disabled = true; let ok = 0;
        for (let i = 0; i < pending.length; i++) { bulk.textContent = 'جارٍ الإرسال ' + (i + 1) + ' / ' + pending.length; if (await inviteSpecialist(pending[i].id)) ok++; await new Promise(r => setTimeout(r, 700)); }
        bulk.textContent = 'تم إرسال ' + ok + ' من ' + pending.length;
      }); }
    const old = $('teamBulkBox'); if (old) old.innerHTML = '';
    draw();
  };

  /* =====================================================================
     6) المستخدمون: عملاء + حسابات مع نشاطهم
     ===================================================================== */
  const usersCss = document.createElement('style');
  usersCss.textContent = `
  .kx-ugrid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px; margin-bottom:30px; }
  .kx-ucard{ background:#fff; border:1px solid var(--fog-dim); border-radius:16px; padding:16px; cursor:pointer; display:flex; flex-direction:column; gap:10px; transition:transform .15s, box-shadow .15s; text-align:start; font-family:inherit; }
  .kx-ucard:hover, .kx-ucard:focus-visible{ transform:translateY(-2px); box-shadow:0 16px 30px -22px rgba(36,29,46,.45); outline:none; border-color:var(--clarity); }
  .kx-ucard .top{ display:flex; gap:12px; align-items:center; }
  .kx-av{ width:46px; height:46px; border-radius:50%; background:var(--fog-dim); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--ink); object-fit:cover; flex:none; font-size:17px; }
  .kx-ucard .nm{ font-family:'Noto Kufi Arabic',sans-serif; font-weight:700; font-size:14.5px; line-height:1.5; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .kx-ucard .em{ font-size:12px; color:var(--text-muted-light); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; direction:ltr; text-align:start; }
  .kx-ucard .tags{ display:flex; gap:6px; flex-wrap:wrap; min-height:22px; }
  .kx-tag{ font-size:11px; font-weight:700; padding:2px 9px; border-radius:100px; background:var(--bg,#ECE8EE); color:var(--c,#6B6072); }
  .kx-ucard .st{ display:grid; grid-template-columns:repeat(3,1fr); gap:6px; border-top:1px solid var(--fog-dim); padding-top:10px; text-align:center; }
  .kx-ucard .st b{ display:block; font-size:15px; font-family:'Noto Kufi Arabic',sans-serif; } .kx-ucard .st span{ font-size:11px; color:var(--text-muted-light); }
  .kx-ucard .ls{ font-size:11.5px; color:var(--text-muted-light); }
  .kx-uact{ display:flex; gap:8px; flex-wrap:wrap; margin:12px 0 4px; }
  .kx-uact a, .kx-uact button{ border:1px solid var(--fog-dim); background:var(--fog); color:var(--ink); border-radius:100px; padding:7px 14px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; text-decoration:none; }
  .kx-uact a:hover, .kx-uact button:hover{ border-color:var(--clarity); }
  `;
  document.head.appendChild(usersCss);

  const uf = { f: 'all', q: '', sort: 'new', view: 'tiles' };
  try { const v = localStorage.getItem('kx_uview'); if (v) uf.view = v; } catch (_) {}
  const TAG = { admin: ['أدمن', '#8a6a2e', '#FBF1DC'], spec: ['أخصائي', '#5B4A86', '#E8E2F4'], guest: ['بدون حساب', '#6B6072', '#ECE8EE'], buyer: ['عميل دفع', '#2E6B45', '#DCEFE3'], repeat: ['عميل متكرر', '#fff', '#2E6B45'], fresh: ['جديد', '#7D5F27', '#FBF1DC'], idle: ['بلا حجز', '#6B6072', '#ECE8EE'] };
  const tagHtml = (k) => `<span class="kx-tag" style="--c:${TAG[k][1]}; --bg:${TAG[k][2]};">${TAG[k][0]}</span>`;
  const ago = (iso) => { if (!iso) return '—'; const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400e3); return d <= 0 ? 'اليوم' : d === 1 ? 'أمس' : d < 30 ? 'قبل ' + d + ' يوم' : fmtD(iso); };

  window.loadUsers = async function () {
    const panel = $('tab-users');
    const table = panel.querySelector('table'); if (table) { const w = table.closest('.kx-scroll') || table; w.style.display = 'none'; }
    let host = $('kxUsers'); if (!host) { host = document.createElement('div'); host.id = 'kxUsers'; panel.appendChild(host); }
    host.innerHTML = '<p style="color:var(--text-muted-light);">جارٍ التحميل...</p>';
    const [ov, sr, core] = await Promise.all([sb().rpc('admin_users_overview'), sb().rpc('admin_signup_series', { p_days: 30 }), loadCore(false).catch(() => ({ bookings: [], spec: {}, amount: () => 0 }))]);
    if (ov.error) { host.textContent = 'تعذّر تحميل البيانات.'; console.error(ov.error); return; }
    const all = ov.data || [];
    const now = Date.now(), D = 86400e3, t = (iso) => (iso ? new Date(iso).getTime() : 0);
    const isNew = (u) => u.has_account && now - t(u.created_at) < 7 * D;
    const FLT = {
      all: () => true, acct: u => u.has_account, guest: u => !u.has_account, fresh: isNew, active: u => u.has_account && now - t(u.last_sign_in_at) < 30 * D,
      buyers: u => u.paid_bookings > 0, repeat: u => u.paid_bookings > 1, never: u => u.has_account && !u.bookings, spec: u => u.is_specialist, adm: u => u.is_admin,
    };
    const chips = [['all', 'الكل'], ['fresh', 'جدد (٧ أيام)'], ['active', 'نشطون (٣٠ يوم)'], ['buyers', 'دفعوا مرة+'], ['repeat', 'عملاء متكررون'], ['never', 'مسجّلون لم يحجزوا'], ['guest', 'بدون حساب'], ['spec', 'أخصائيون'], ['adm', 'أدمن']];
    const sorts = { new: ['الأحدث تسجيلاً', (a, b) => (t(b.created_at) || t(b.last_booking)) - (t(a.created_at) || t(a.last_booking))], login: ['آخر دخول', (a, b) => t(b.last_sign_in_at) - t(a.last_sign_in_at)], spent: ['الأكثر دفعاً', (a, b) => Number(b.spent_usd) - Number(a.spent_usd)], bookings: ['الأكثر حجوزات', (a, b) => b.bookings - a.bookings], name: ['الاسم', (a, b) => String(a.full_name || a.email).localeCompare(String(b.full_name || b.email), 'ar')] };
    const accts = all.filter(FLT.acct), buyers = all.filter(FLT.buyers), spent = all.reduce((s, u) => s + Number(u.spent_usd || 0), 0);
    const kpi = (v, l, sub) => `<div class="kx-kpi"><b>${v}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
    const series = (sr.data || []).map(s => ({ l: fmtD(s.day), sl: new Date(s.day).toLocaleDateString(AR, { day: 'numeric', month: 'numeric' }), v: s.signups }));
    host.innerHTML = `
      <div class="kx-kpis">
        ${kpi(accts.length, 'حسابات مسجّلة', all.length - accts.length ? '+ ' + (all.length - accts.length) + ' عميل بلا حساب' : '')}${kpi(accts.filter(isNew).length, 'جدد آخر ٧ أيام', 'آخر ٣٠ يوم: ' + accts.filter(u => now - t(u.created_at) < 30 * D).length)}
        ${kpi(accts.filter(FLT.active).length, 'نشطون آخر ٣٠ يوم', 'سجّلوا دخولاً')}${kpi(buyers.length, 'عملاء دفعوا', all.filter(FLT.repeat).length + ' متكرر')}${kpi(usd(spent), 'إجمالي مدفوعاتهم', buyers.length ? 'متوسط ' + usd(spent / buyers.length) + ' للعميل' : '')}
      </div>
      <div class="kx-card"><h3>التسجيلات الجديدة، آخر ٣٠ يوم</h3>${svgBars(series, { color: '#5B4A86', h: 110 })}</div>
      <div class="app-filters"><div class="app-chips" id="usChips">${chips.map(([k, l]) => `<button type="button" class="app-chip${uf.f === k ? ' on' : ''}" data-f="${k}">${l}<span class="n">${all.filter(FLT[k]).length}</span></button>`).join('')}</div></div>
      <div class="kx-bar"><input type="search" id="usQ" placeholder="بحث بالاسم أو البريد" value="${esc(uf.q)}" style="min-width:230px;">
        <select id="usSort">${Object.entries(sorts).map(([k, v]) => `<option value="${k}"${uf.sort === k ? ' selected' : ''}>ترتيب: ${v[0]}</option>`).join('')}</select>
        <button type="button" class="kx-chip${uf.view === 'tiles' ? ' on' : ''}" data-view="tiles">بطاقات</button><button type="button" class="kx-chip${uf.view === 'table' ? ' on' : ''}" data-view="table">جدول</button>
        <span class="app-count" id="usCount"></span><button type="button" class="btn-secondary" id="usCsv" style="padding:8px 16px; margin-inline-start:auto;">تصدير CSV</button></div>
      <div id="usOut"></div>`;
    let shown = [];
    const avatar = (u, big) => u.photo_url ? `<img class="kx-av" src="${esc(u.photo_url)}" alt="" loading="lazy" style="${big ? 'width:64px;height:64px;' : ''}">` : `<div class="kx-av" style="${big ? 'width:64px;height:64px;font-size:24px;' : ''}">${esc((u.full_name || u.email || '؟').trim().charAt(0).toUpperCase())}</div>`;
    const tagsOf = (u) => [u.is_admin && 'admin', u.is_specialist && 'spec', !u.has_account && 'guest', u.paid_bookings > 1 ? 'repeat' : u.paid_bookings > 0 ? 'buyer' : (u.has_account && !u.bookings ? 'idle' : null), isNew(u) && 'fresh'].filter(Boolean);
    function openUser(u) {
      const mine = core.bookings.filter(b => String(b.email).toLowerCase() === String(u.email || '').toLowerCase()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const phone = (mine.find(b => b.phone) || {}).phone || '', tz = (mine.find(b => b.client_tz) || {}).client_tz || '';
      const wa = phone ? 'https://wa.me/' + phone.replace(/[^\d]/g, '').replace(/^00/, '') : '';
      const mm = modal(`<div class="hd"><div style="display:flex; gap:14px; align-items:center;">${avatar(u, true)}<div><h3>${esc(u.full_name || u.email)}</h3><div style="font-size:12.5px; color:var(--text-muted-light);" dir="ltr">${esc(u.email || '')}</div></div></div><button type="button" class="kx-x" aria-label="إغلاق">&times;</button></div>
        <div class="tags" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">${tagsOf(u).map(tagHtml).join('')}</div>
        <div class="kx-uact">${u.email ? `<a href="mailto:${esc(u.email)}">✉ إيميل</a><button type="button" id="uCopy">نسخ البريد</button>` : ''}${wa ? `<a href="${esc(wa)}" target="_blank" rel="noopener">واتساب</a>` : ''}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 18px; font-size:13.5px; margin:12px 0;">
          <div>التسجيل: <b>${u.created_at ? fmtD(u.created_at) : 'بلا حساب'}</b></div><div>آخر دخول: <b>${u.last_sign_in_at ? ago(u.last_sign_in_at) : '—'}</b></div>
          <div>الحجوزات: <b>${u.bookings}</b> (مدفوعة ${u.paid_bookings})</div><div>إجمالي الدفع: <b>${usd(u.spent_usd)}</b></div>
          ${phone ? `<div>الهاتف: <b dir="ltr">${esc(phone)}</b></div>` : ''}${tz ? `<div>منطقته الزمنية: <b>${esc(tz.split('/').pop().replace(/_/g, ' '))}</b></div>` : ''}</div>
        <h3 style="font-size:14.5px; margin:14px 0 10px;">حجوزاته (${mine.length})</h3>
        ${mine.length ? `<ul class="kx-tl">${mine.map(b => `<li>${esc(b.package_name)} · ${usd(core.amount(b))} — ${stChip(sessState(b))}<time>${fmtDT(b.preferred_datetime)} · ${esc((core.spec[b.specialist_id] || {}).full_name || b.specialist_name || 'بدون أخصائي')} · <a href="#" data-tl="${esc(b.id)}" style="color:var(--clarity); font-weight:700; text-decoration:underline;">المسار</a></time></li>`).join('')}</ul>` : '<p style="color:var(--text-muted-light);">لا حجوزات.</p>'}`);
      const cp = mm.el.querySelector('#uCopy'); if (cp) cp.addEventListener('click', async () => { try { await navigator.clipboard.writeText(u.email); cp.textContent = 'تم النسخ ✓'; } catch (_) { prompt('انسخ البريد:', u.email); } });
      mm.el.querySelectorAll('[data-tl]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); openTimeline(mine.find(b => b.id === a.dataset.tl), core); }));
    }
    const draw = () => {
      const q = uf.q.trim().toLowerCase();
      shown = all.filter(FLT[uf.f]).filter(u => !q || ((u.full_name || '') + ' ' + (u.email || '')).toLowerCase().includes(q)).sort(sorts[uf.sort][1]);
      $('usCount').textContent = shown.length + ' من ' + all.length;
      const list = shown.slice(0, 300);
      if (uf.view === 'tiles') {
        $('usOut').innerHTML = list.length ? `<div class="kx-ugrid">${list.map((u, i) => `<button type="button" class="kx-ucard" data-i="${i}"><div class="top">${avatar(u)}<div style="min-width:0;"><div class="nm">${esc(u.full_name || '—')}</div><div class="em">${esc(u.email || '')}</div></div></div>
          <div class="tags">${tagsOf(u).map(tagHtml).join('')}</div>
          <div class="st"><div><b>${u.bookings}</b><span>حجوزات</span></div><div><b>${u.paid_bookings}</b><span>مدفوعة</span></div><div><b>${Number(u.spent_usd) ? usd(u.spent_usd) : '—'}</b><span>المدفوع</span></div></div>
          <div class="ls">${u.has_account ? 'آخر دخول: ' + ago(u.last_sign_in_at) : 'آخر حجز: ' + ago(u.last_booking)}</div></button>`).join('')}</div>` : '<p style="color:var(--text-muted-light);">لا نتائج.</p>';
        $('usOut').querySelectorAll('[data-i]').forEach(c => c.addEventListener('click', () => openUser(list[+c.dataset.i])));
      } else {
        $('usOut').innerHTML = `<div class="kx-scroll"><table><thead><tr><th></th><th>الاسم / البريد</th><th>التسجيل</th><th>آخر دخول</th><th>الحجوزات</th><th>المدفوع</th><th>آخر حجز</th></tr></thead><tbody>${list.map((u, i) => `<tr data-i="${i}" style="cursor:pointer;"><td>${avatar(u)}</td><td><b>${esc(u.full_name || '—')}</b> ${tagsOf(u).map(tagHtml).join(' ')}<div style="font-size:12px; color:var(--text-muted-light);" dir="ltr">${esc(u.email || '')}</div></td><td>${u.created_at ? fmtD(u.created_at) : '—'}</td><td>${ago(u.last_sign_in_at)}</td><td>${u.bookings} <span style="color:var(--text-muted-light); font-size:12px;">(${u.paid_bookings})</span></td><td>${Number(u.spent_usd) ? usd(u.spent_usd) : '—'}</td><td>${ago(u.last_booking)}</td></tr>`).join('') || '<tr><td colspan="7">لا نتائج.</td></tr>'}</tbody></table></div>`;
        $('usOut').querySelectorAll('tr[data-i]').forEach(tr => tr.addEventListener('click', () => openUser(list[+tr.dataset.i])));
      }
      if (shown.length > 300) $('usOut').insertAdjacentHTML('beforeend', '<p style="font-size:12.5px; color:var(--text-muted-light);">يُعرض أول ٣٠٠ نتيجة. استخدم البحث أو الفلاتر لتضييق القائمة.</p>');
    };
    $('usChips').querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { uf.f = b.dataset.f; $('usChips').querySelectorAll('.app-chip').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
    $('usQ').addEventListener('input', (e) => { uf.q = e.target.value; draw(); });
    $('usSort').addEventListener('change', (e) => { uf.sort = e.target.value; draw(); });
    host.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { uf.view = b.dataset.view; try { localStorage.setItem('kx_uview', uf.view); } catch (_) {} host.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
    $('usCsv').addEventListener('click', () => downloadCsv('users.csv', [['name', 'email', 'has_account', 'registered', 'last_sign_in', 'bookings', 'paid_bookings', 'spent_usd', 'last_booking']].concat(shown.map(u => [u.full_name, u.email, u.has_account, u.created_at || '', u.last_sign_in_at || '', u.bookings, u.paid_bookings, u.spent_usd, u.last_booking || '']))));
    draw();
  };

  /* =====================================================================
     7) هيكل لوحة التحكم: قائمة جانبية مجمّعة + شارات تنبيه + إشعارات + فلاتر الحجوزات
     ===================================================================== */
  const shellCss = document.createElement('style');
  shellCss.textContent = `
  main > .wrap, header > .wrap{ max-width:1260px; }
  .kx-shell{ display:grid; grid-template-columns:232px minmax(0,1fr); gap:26px; align-items:start; }
  .kx-side{ position:sticky; top:14px; max-height:calc(100vh - 28px); overflow-y:auto; background:#fff; border:1px solid var(--fog-dim); border-radius:16px; padding:10px; box-shadow:0 12px 30px -24px rgba(36,29,46,.3); }
  .kx-gh{ font-size:11.5px; font-weight:700; color:var(--text-muted-light); padding:12px 12px 4px; letter-spacing:.02em; }
  .kx-side .admin-tab{ display:flex; width:100%; align-items:center; justify-content:space-between; gap:8px; margin:1px 0; padding:9px 12px; border:none; border-radius:10px; text-align:start; font-size:14px; color:var(--text-on-light); background:none; }
  .kx-side .admin-tab:hover{ background:var(--fog); }
  .kx-side .admin-tab.active{ background:var(--ink); color:var(--fog); }
  .kx-badge{ background:#C0562E; color:#fff; font-family:'IBM Plex Sans Arabic',sans-serif; font-size:11px; font-weight:700; min-width:20px; height:20px; padding:0 6px; border-radius:100px; display:none; align-items:center; justify-content:center; }
  .kx-badge.on{ display:inline-flex; }
  .kx-content{ min-width:0; }
  .kx-mbar, .kx-ovl{ display:none; }
  .kx-who{ font-size:12px; color:var(--text-muted-dark); margin-inline-end:14px; }
  .kx-who b{ color:var(--clarity-soft); font-weight:600; }
  header .wrap > div{ display:flex; align-items:center; }
  .kx-scroll{ overflow-x:auto; border-radius:16px; margin-bottom:36px; }
  .kx-scroll > table{ margin-bottom:0; min-width:640px; }
  .kx-toasts{ position:fixed; bottom:20px; inset-inline:0; z-index:2000; display:flex; flex-direction:column; align-items:center; gap:8px; pointer-events:none; padding:0 14px; }
  .kx-toast{ background:var(--ink); color:var(--fog); font-size:14px; padding:11px 18px; border-radius:12px; box-shadow:0 14px 34px -12px rgba(0,0,0,.5); max-width:520px; pointer-events:auto; animation:kxin .2s ease; }
  .kx-toast.ok{ background:#2E6B45; } .kx-toast.err{ background:#9C3F47; }
  @keyframes kxin{ from{ opacity:0; transform:translateY(8px); } }
  #kxBkBar{ margin-bottom:14px; }
  @media (max-width:900px){
    main{ padding-top:0; }
    .kx-shell{ display:block; }
    .kx-mbar{ display:flex; align-items:center; gap:12px; position:sticky; top:0; z-index:60; background:var(--fog); padding:12px 0; border-bottom:1px solid var(--fog-dim); margin-bottom:18px; }
    .kx-mbar button{ background:var(--ink); color:var(--fog); border:none; border-radius:10px; padding:9px 14px; font-family:inherit; font-weight:700; font-size:14px; cursor:pointer; }
    .kx-mbar span{ font-family:'Noto Kufi Arabic',sans-serif; font-weight:700; font-size:15px; }
    .kx-side{ position:fixed; top:0; bottom:0; right:0; width:min(300px,86vw); max-height:none; border-radius:0; z-index:90; transform:translateX(100%); transition:transform .22s ease; padding-top:18px; }
    .kx-shell.open .kx-side{ transform:none; }
    .kx-shell.open + .kx-ovl, .kx-ovl.on{ display:block; position:fixed; inset:0; background:rgba(36,29,46,.5); z-index:80; }
    .kx-who{ display:none; }
  }
  `;
  document.head.appendChild(shellCss);

  function toast(msg, type) {
    let host = document.querySelector('.kx-toasts'); if (!host) { host = document.createElement('div'); host.className = 'kx-toasts'; host.setAttribute('role', 'status'); document.body.appendChild(host); }
    const el = document.createElement('div'); el.className = 'kx-toast' + (type ? ' ' + type : ''); el.textContent = String(msg);
    host.appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 350); }, type === 'ok' ? 3500 : 6000);
  }
  window.kxToast = toast;
  window.alert = (m) => toast(m, /تعذّر|فشل|خطأ|غير صالح/.test(String(m)) ? 'err' : '');

  const readyCss = document.createElement('style');
  readyCss.textContent = 'html:not(.kx-ready) #loginSection{ visibility:hidden; } html:not(.kx-ready) main::before{ content:"جارٍ التحميل..."; display:block; text-align:center; padding:90px 0; color:#6B6072; font-size:14px; }';
  document.head.appendChild(readyCss);
  // نُظهر نموذج الدخول فقط بعد أن يقرّر السكربت الرئيسي فعلاً (دخول أو عدمه)، فلا يومض النموذج أثناء فحص الجلسة المحفوظة
  const markReady = () => document.documentElement.classList.add('kx-ready');
  const ls = $('loginSection');
  // عند ظهور نموذج الدخول نشرح السبب بدل الصمت، ليسهل معرفة هل المشكلة من المتصفح أم من الجلسة
  const diag = () => {
    const card = document.querySelector('.login-card'); if (!card || card.querySelector('.kx-diag')) return;
    let msg;
    try { const key = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k)); msg = key ? 'جلستك المحفوظة انتهت أو رفضها الخادم، سجّل الدخول من جديد.' : 'لا توجد جلسة محفوظة بهذا المتصفح. إن تكرر هذا بعد كل تحديث للصفحة فالمتصفح يمسح بيانات الموقع (التصفح الخاص، أو منع التخزين، أو إضافة تنظّف الملفات).'; }
    catch (_) { msg = 'المتصفح يمنع حفظ الجلسة (التخزين محظور)، لذلك يُطلب الدخول بعد كل تحديث. اسمح بالتخزين لهذا الموقع.'; }
    const p = document.createElement('p'); p.className = 'kx-diag'; p.style.cssText = 'font-size:12.5px; color:#6B6072; margin-top:14px; line-height:1.8;'; p.textContent = msg; card.appendChild(p);
  };
  const watch = () => { if ($('dashboard').style.display === 'block' || (ls && ls.style.display === 'block')) markReady(); if (ls && ls.style.display === 'block' && $('dashboard').style.display !== 'block') diag(); };
  new MutationObserver(watch).observe($('dashboard'), { attributes: true, attributeFilter: ['style'] });
  if (ls) new MutationObserver(watch).observe(ls, { attributes: true, attributeFilter: ['style'] });
  setTimeout(markReady, 8000);

  const GROUPS = [
    ['نظرة عامة', ['analytics']],
    ['العمليات اليومية', ['bookings', 'sessions', 'payouts', 'slots']],
    ['الأخصائيون', ['team', 'applications']],
    ['العملاء', ['users']],
    ['العروض والمحتوى', ['packages', 'promos', 'banner', 'articles', 'static-pages', 'exercises']],
    ['النظام', ['points', 'admins']],
  ];
  const dash = $('dashboard'), oldTabs = dash.querySelector('.admin-tabs');
  const shell = document.createElement('div'); shell.className = 'kx-shell';
  const side = document.createElement('nav'); side.className = 'kx-side'; side.setAttribute('aria-label', 'أقسام لوحة التحكم');
  const content = document.createElement('div'); content.className = 'kx-content';
  const mbar = document.createElement('div'); mbar.className = 'kx-mbar';
  mbar.innerHTML = '<button type="button" id="kxMenu" aria-label="القائمة">☰ القائمة</button><span id="kxTitle"></span>';
  const ovl = document.createElement('div'); ovl.className = 'kx-ovl';
  [...dash.children].forEach(ch => { if (ch !== oldTabs) content.appendChild(ch); });
  shell.append(side, content); dash.insertBefore(mbar, oldTabs); dash.insertBefore(shell, oldTabs); shell.insertAdjacentElement('afterend', ovl);
  const placed = new Set(), heads = [];
  GROUPS.forEach(([label, ids]) => {
    const h = document.createElement('div'); h.className = 'kx-gh'; h.textContent = label; side.appendChild(h);
    const btns = ids.map(id => oldTabs.querySelector('[data-tab="' + id + '"]')).filter(Boolean);
    btns.forEach(b => { side.appendChild(b); placed.add(b); }); heads.push([h, btns]);
  });
  const rest = [...oldTabs.querySelectorAll('.admin-tab')].filter(b => !placed.has(b));
  if (rest.length) { const h = document.createElement('div'); h.className = 'kx-gh'; h.textContent = 'أخرى'; side.appendChild(h); rest.forEach(b => side.appendChild(b)); heads.push([h, rest]); }
  oldTabs.parentNode.removeChild(oldTabs);
  const allBtns = () => [...side.querySelectorAll('.admin-tab')];
  allBtns().forEach(b => { const sp = document.createElement('span'); sp.className = 'kx-badge'; sp.dataset.badge = b.dataset.tab; b.appendChild(sp); });
  const closeMenu = () => { shell.classList.remove('open'); ovl.classList.remove('on'); };
  $('kxMenu').addEventListener('click', () => { shell.classList.add('open'); ovl.classList.add('on'); });
  ovl.addEventListener('click', closeMenu);
  const refreshHeads = () => heads.forEach(([h, btns]) => { h.style.display = btns.some(b => b.style.display !== 'none') ? '' : 'none'; });
  let badgeTimer = null;
  allBtns().forEach(b => b.addEventListener('click', (ev) => {
    // نحفظ القسم فقط عند نقرة المستخدم الفعلية (النقرات البرمجية عند التحميل ما تُحتسب) ليبقى مكانك بعد التحديث
    if (ev.isTrusted) { try { localStorage.setItem('kx_tab', b.dataset.tab); history.replaceState(null, '', '#' + b.dataset.tab); } catch (_) {} }
    $('kxTitle').textContent = b.firstChild.textContent; closeMenu(); refreshHeads();
    clearTimeout(badgeTimer); badgeTimer = setTimeout(loadBadges, 1200);
  }));

  // شارات الأعمال المعلّقة على القائمة
  async function loadBadges() {
    const set = (id, n) => { const e = side.querySelector('[data-badge="' + id + '"]'); if (!e) return; e.textContent = n > 99 ? '99+' : String(n); e.classList.toggle('on', n > 0); e.title = n > 0 ? 'يحتاج متابعة' : ''; };
    try {
      if (canAccess('applications')) { const r = await sb().from('specialist_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'); if (!r.error) set('applications', r.count || 0); }
      if (canAccess('bookings')) {
        const r = await sb().from('bookings').select('id', { count: 'exact', head: true }).eq('payment_method', 'cliq').eq('paid', false).not('cliq_reported_at', 'is', null).neq('status', 'ملغى'); if (!r.error) set('bookings', r.count || 0);
        const core = await loadCore(false); const bkB = Object.fromEntries(core.bookings.map(b => [b.id, b])); set('sessions', core.sessions.filter(x => overdueS(x, 12) && bkB[x.booking_id] && isActiveB(bkB[x.booking_id])).length);
      }
    } catch (e) { console.warn('badges:', e); }
  }

  // ما بعد تسجيل الدخول: إخفاء مجموعات فارغة، اسم المشرف، لفّ الجداول، استعادة آخر قسم
  let booted = false;
  async function afterLogin() {
    refreshHeads();
    if (!booted) {
      booted = true;
      document.querySelectorAll('#dashboard table').forEach(t => {
        const p = t.parentElement; if (!p || p.classList.contains('kx-scroll') || getComputedStyle(p).overflowX === 'auto') return;
        const w = document.createElement('div'); w.className = 'kx-scroll'; p.insertBefore(w, t); w.appendChild(t);
      });
      try {
        const last = location.hash.slice(1) || localStorage.getItem('kx_tab'); const b = last && side.querySelector('[data-tab="' + last + '"]');
        if (b && b.style.display !== 'none' && canAccess(last)) b.click();
      } catch (_) {}
      const act = side.querySelector('.admin-tab.active'); if (act) $('kxTitle').textContent = act.firstChild.textContent;
      try {
        const { data } = await sb().auth.getUser();
        const who = document.createElement('span'); who.className = 'kx-who';
        who.innerHTML = '<b>' + esc(data && data.user ? data.user.email : '') + '</b> · ' + (ADMIN_ACCESS.is_super ? 'مشرف عام' : 'مشرف');
        const lo = $('logoutBtn'); lo.parentNode.insertBefore(who, lo);
      } catch (_) {}
      setInterval(loadBadges, 120000);
    }
    loadBadges();
  }
  new MutationObserver(() => { if (dash.style.display === 'block') afterLogin();  }).observe(dash, { attributes: true, attributeFilter: ['style'] });
  if (dash.style.display === 'block') afterLogin();

  // الحجوزات: بحث وفلاتر سريعة فوق الجدول القديم
  const bkState = { f: 'all', q: '' };
  const _loadBookings = window.loadBookings;
  window.loadBookings = async function () {
    await _loadBookings.apply(this, arguments);
    const panel = $('tab-bookings'), body = $('bookingsTableBody'); if (!panel || !body) return;
    const rows = [...body.querySelectorAll('tr')].filter(r => r.children.length >= 6);
    const kind = (r) => { const t = r.children[4].innerText; return /العميل أبلغ/.test(t) ? 'cliq' : /ملغى/.test(t) ? 'cancelled' : /^\s*مدفوع/.test(t) ? 'paid' : 'unpaid'; };
    rows.forEach(r => { r.dataset.k = kind(r); });
    const cnt = (k) => rows.filter(r => k === 'all' || r.dataset.k === k).length;
    let bar = $('kxBkBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'kxBkBar'; bar.className = 'kx-bar'; const tbl = panel.querySelector('table'); (tbl.closest('.kx-scroll') || tbl).insertAdjacentElement('beforebegin', bar); }
    const CH = [['all', 'الكل'], ['cliq', 'حوالة كليك تحتاج تأكيد'], ['unpaid', 'غير مدفوعة'], ['paid', 'مدفوعة'], ['cancelled', 'ملغاة']];
    bar.innerHTML = CH.map(([k, l]) => `<button type="button" class="kx-chip${bkState.f === k ? ' on' : ''}" data-k="${k}">${l}<span class="n">${cnt(k)}</span></button>`).join('') + `<input type="search" id="kxBkQ" placeholder="بحث بالاسم أو البريد أو الهاتف" value="${esc(bkState.q)}" style="min-width:220px;"><span id="kxBkN" style="font-size:12.5px; color:var(--text-muted-light);"></span>`;
    const apply = () => {
      const q = bkState.q.trim().toLowerCase(); let n = 0;
      rows.forEach(r => { const ok = (bkState.f === 'all' || r.dataset.k === bkState.f) && (!q || r.innerText.toLowerCase().includes(q)); r.style.display = ok ? '' : 'none'; if (ok) n++; });
      $('kxBkN').textContent = n + ' حجز';
    };
    bar.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { bkState.f = b.dataset.k; bar.querySelectorAll('.kx-chip').forEach(x => x.classList.toggle('on', x === b)); apply(); }));
    $('kxBkQ').addEventListener('input', (e) => { bkState.q = e.target.value; apply(); });
    apply();
  };

  const LOADERS = { analytics: loadAnalytics, sessions: loadSessions, payouts: loadPayouts, banner: loadBanner };
})();
