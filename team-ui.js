/* بوضوح — أدوات مشتركة لعرض الفريق والمواعيد المتاحة (بدون مكتبات؛ تقرأ من Supabase عبر REST).
   تُستخدم في: الرئيسية (شريط الفريق)، صفحة الفريق (فلاتر + أقرب موعد)، صفحة الأخصائي (بطاقة الحجز السريع).
   كل البيانات عامة أصلاً (أخصائيون منشورون + مواعيد غير محجوزة) والحماية على مستوى RLS. */
(function () {
  const BASE = 'https://vhsdhskynuwfloonjfec.supabase.co/rest/v1/';
  const KEY = 'sb_publishable_x9K72kDpiGOXcCG2uNqXJg_I80x7-Mb';
  const EN = document.documentElement.lang === 'en';
  const t = (ar, en) => (EN ? en : ar);
  const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' fill='%23E6DFDA'/><circle cx='60' cy='46' r='20' fill='%23B8AEC0'/><path d='M20 120c0-26 18-42 40-42s40 16 40 42z' fill='%23B8AEC0'/></svg>";
  const get = (q) => fetch(BASE + q, { headers: H }).then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))));

  const COLS = 'id,slug,full_name,full_name_en,specialty,specialty_en,short_bio,short_bio_en,bio,bio_en,photo_url,sort_order,years_experience';
  const loadTeam = () => get('specialists?select=' + COLS + '&is_published=eq.true&order=sort_order.asc');

  // أقرب المواعيد غير المحجوزة (بعد ٢٤ ساعة، كما تفرض صفحة الحجز) مجمّعة حسب الأخصائي
  async function loadAvailability() {
    try {
      const min = new Date(Date.now() + 24 * 3600e3).toISOString();
      const rows = await get('availability_slots?select=specialist_id,starts_at&booking_id=is.null&specialist_id=not.is.null&starts_at=gte.' + encodeURIComponent(min) + '&order=starts_at.asc&limit=1000');
      const by = {};
      rows.forEach(r => { (by[r.specialist_id] = by[r.specialist_id] || []).push(r.starts_at); });
      return by;
    } catch (e) { console.warn('availability:', e); return {}; }
  }

  // النص الإنجليزي إن وُجد، وإلا الأصلي
  const loc = (sp) => EN
    ? { name: sp.full_name_en || sp.full_name, specialty: sp.specialty_en || sp.specialty, short: sp.short_bio_en || (sp.bio_en ? '' : (sp.short_bio || '')), bio: sp.bio_en || sp.bio || '' }
    : { name: sp.full_name, specialty: sp.specialty, short: sp.short_bio || '', bio: sp.bio || '' };
  const snippet = (l) => l.short || (l.bio.length > 90 ? l.bio.slice(0, 90) + '…' : l.bio);
  const fmtSlot = (iso) => new Date(iso).toLocaleString(EN ? 'en-GB' : 'ar-EG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const profileHref = (sp) => (EN ? '/en/specialist/?slug=' : '/specialist/?slug=') + encodeURIComponent(sp.slug);

  function availTag(slots) {
    return (slots && slots.length)
      ? `<div class="avail"><span class="dot"></span><span>${t('أقرب موعد: ', 'Next: ')}${esc(fmtSlot(slots[0]))}</span></div>`
      : `<div class="avail none"><span>${t('لا مواعيد محددة حالياً', 'No set times right now')}</span></div>`;
  }
  // المتاحون أولاً (الأقرب موعداً)، ثم الباقون بترتيبهم
  function sortByAvailability(team, avail) {
    return team.slice().sort((a, b) => {
      const sa = avail[a.id], sb = avail[b.id];
      if (sa && !sb) return -1;
      if (!sa && sb) return 1;
      if (sa && sb) return new Date(sa[0]) - new Date(sb[0]);
      return a.sort_order - b.sort_order;
    });
  }

  // ---------- مواضيع للفلترة (تُستنتج من التخصص والنبذة) ----------
  const norm = (s) => String(s || '').toLowerCase().replace(/[ً-ٰٟ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  const TOPICS = [
    ['anxiety', t('القلق والاكتئاب', 'Anxiety & depression'), /قلق|اكتئاب|توتر|وسواس|anxiety|depress|stress|obsessive|\bocd\b/],
    ['relations', t('العلاقات والأسرة', 'Relationships & family'), /علاق|زواج|زوجي|اسري|اسره|الاسر|marital|relationship|family|couple/],
    ['trauma', t('الصدمات', 'Trauma'), /صدم|trauma|ptsd/],
    ['addiction', t('الإدمان', 'Addiction'), /ادمان|addict|substance/],
    ['kids', t('الأطفال والمراهقون', 'Children & teens'), /طفل|اطفال|مراهق|child|adolescen|teen/],
    ['coaching', t('كوتشينج وتطوير الذات', 'Coaching & growth'), /كوتش|تدريب|تطوير الذات|ذكاء عاطفي|coach|emotional intelligence|self-awareness|leadership/],
  ];
  const searchText = (sp) => norm([sp.specialty, sp.specialty_en, sp.short_bio, sp.short_bio_en, sp.bio, sp.bio_en].join(' '));
  const hasTopic = (sp, key) => { const tp = TOPICS.find(x => x[0] === key); return !!tp && tp[2].test(searchText(sp)); };

  // ---------- صفحة الفريق: فلاتر + بطاقات ----------
  function teamCard(sp, slots) {
    const l = loc(sp);
    return `<a href="${profileHref(sp)}" class="specialist-card">
      <img class="specialist-photo" src="${esc(sp.photo_url || PLACEHOLDER)}" alt="${esc(l.name)}" loading="lazy">
      <div class="specialist-body">
        <div class="specialist-name">${esc(l.name)}</div>
        <div class="specialist-role">${esc(l.specialty)}</div>
        <p class="specialist-bio">${esc(snippet(l))}</p>
        ${availTag(slots)}
      </div></a>`;
  }
  async function teamPage(gridEl, filtersEl) {
    let team, avail;
    try { [team, avail] = await Promise.all([loadTeam(), loadAvailability()]); }
    catch (e) { console.error(e); gridEl.innerHTML = `<p class="empty-state">${t('تعذّر تحميل الفريق حالياً.', 'Unable to load the team right now.')}</p>`; return; }
    if (!team.length) { gridEl.innerHTML = `<p class="empty-state">${t('لا يوجد أخصائيون معروضون حالياً.', 'No specialists are listed right now.')}</p>`; return; }
    const sorted = sortByAvailability(team, avail);
    const st = { topic: 'all', onlyAvail: false };
    const nAvail = sorted.filter(sp => avail[sp.id]).length;
    const topicCounts = Object.fromEntries(TOPICS.map(tp => [tp[0], sorted.filter(sp => hasTopic(sp, tp[0])).length]));
    const chips = [['all', t('الكل', 'All') + ' (' + sorted.length + ')', '']]
      .concat(nAvail ? [['avail', t('متاح للحجز', 'Available to book') + ' (' + nAvail + ')', 'bw-chip-green']] : [])
      .concat(TOPICS.filter(tp => topicCounts[tp[0]] > 0).map(tp => [tp[0], tp[1] + ' (' + topicCounts[tp[0]] + ')', '']));
    filtersEl.innerHTML = `
      <p class="bw-hint">${t('الأخصائيون المتاحون للحجز يظهرون أولاً. اختر موضوعاً لتضييق الاختيار، أو افتح أي ملف لتتعرّف على صاحبه.', 'Specialists with open times appear first. Pick a topic to narrow your choice, or open any profile to get to know them.')}</p>
      <div class="bw-chips" id="bwChips">${chips.map(c => `<button type="button" class="bw-chip ${c[2]}${c[0] === 'all' ? ' on' : ''}" data-k="${c[0]}">${esc(c[1])}</button>`).join('')}</div>`;
    const render = () => {
      const rows = sorted.filter(sp => {
        if (st.onlyAvail && !avail[sp.id]) return false;
        if (st.topic !== 'all' && !hasTopic(sp, st.topic)) return false;
        return true;
      });
      gridEl.innerHTML = rows.length ? rows.map(sp => teamCard(sp, avail[sp.id])).join('')
        : `<p class="empty-state">${t('ما في أخصائيين يطابقون هذا الاختيار.', 'No specialists match this choice.')} <button type="button" class="bw-chip" id="bwReset">${t('عرض الكل', 'Show all')}</button></p>`;
      const rs = document.getElementById('bwReset');
      if (rs) rs.addEventListener('click', () => pick('all'));
    };
    const pick = (k) => {
      st.onlyAvail = k === 'avail'; st.topic = (k === 'all' || k === 'avail') ? 'all' : k;
      filtersEl.querySelectorAll('.bw-chip').forEach(b => b.classList.toggle('on', b.dataset.k === k));
      render();
    };
    filtersEl.querySelectorAll('.bw-chip').forEach(b => b.addEventListener('click', () => pick(b.dataset.k)));
    render();
  }

  // ---------- الرئيسية: شريط الفريق ----------
  async function homeStrip(el) {
    let team, avail;
    try { [team, avail] = await Promise.all([loadTeam(), loadAvailability()]); } catch (e) { el.closest('section').style.display = 'none'; return; }
    const pool = sortByAvailability(team.filter(sp => sp.photo_url), avail).slice(0, 12);
    if (!pool.length) { el.closest('section').style.display = 'none'; return; }
    el.innerHTML = pool.map(sp => {
      const l = loc(sp);
      return `<a href="${profileHref(sp)}" class="bw-mini">
        <img src="${esc(sp.photo_url)}" alt="${esc(l.name)}" loading="lazy">
        <div class="bw-mini-b"><div class="bw-mini-n">${esc(l.name)}</div><div class="bw-mini-r">${esc(l.specialty)}</div>${availTag(avail[sp.id])}</div></a>`;
    }).join('');
  }

  // ---------- صفحة الأخصائي: بطاقة الحجز السريع ----------
  function quickBook(slots, href) {
    const chips = (slots || []).slice(0, 4).map(s => `<a class="qb-chip" href="${href}">${esc(fmtSlot(s))}</a>`).join('');
    return `<div class="qb">
      <div class="qb-t">${(slots && slots.length) ? t('أقرب المواعيد المتاحة', 'Next available times') : t('المواعيد', 'Availability')}</div>
      ${(slots && slots.length)
        ? `<div class="qb-chips">${chips}</div>`
        : `<p class="qb-none">${t('لا توجد مواعيد محددة حالياً — يمكنك اختيار موعدك المفضّل في صفحة الحجز.', 'No set times right now — you can choose your preferred time on the booking page.')}</p>`}
      <a class="qb-btn" href="${href}">${t('احجز موعدك', 'Book your session')}</a>
      <ul class="qb-ul">
        <li>${t('جلسة عن بُعد بالصوت أو الفيديو', 'Online session by audio or video')}</li>
        <li>${t('سرية تامة بينك وبين المختص', 'Fully confidential')}</li>
        <li>${t('إعادة جدولة مجانية حتى ٢٤ ساعة قبل الموعد', 'Free rescheduling up to 24 hours before')}</li>
        <li>${t('لا يناسبك؟ يمكنك طلب تغيير المختص في أي وقت', 'Not a fit? You can ask to change specialist at any time')}</li>
      </ul></div>`;
  }

  // ---------- أنماط مشتركة ----------
  const css = document.createElement('style');
  css.textContent = `
  .avail{ display:flex; align-items:center; gap:7px; font-size:12px; font-weight:700; color:#2E6B45; margin-top:10px; line-height:1.5; }
  .avail .dot{ width:8px; height:8px; border-radius:50%; background:#3C8C5A; box-shadow:0 0 0 3px rgba(60,140,90,.18); flex:none; }
  .avail.none{ color:#8b8197; font-weight:600; }
  @media (max-width:600px){ .avail{ font-size:11px; margin-top:8px; } }
  .bw-hint{ font-size:14px; color:var(--text-muted-light,#6B6072); max-width:62ch; margin:0 0 14px; }
  .bw-chips{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:22px; }
  .bw-chip{ border:1.5px solid var(--fog-dim,#E6DFDA); background:#fff; border-radius:100px; padding:8px 15px; font-family:inherit; font-size:13px; font-weight:700; color:var(--ink,#241D2E); cursor:pointer; transition:.15s; }
  .bw-chip:hover{ border-color:var(--clarity,#C9A15F); }
  .bw-chip.on{ background:var(--ink,#241D2E); color:var(--fog,#F3EEEA); border-color:var(--ink,#241D2E); }
  .bw-chip-green:not(.on){ border-color:#BFDCC8; background:#F1F8F3; color:#2E6B45; }
  @media (max-width:600px){ .bw-chips{ flex-wrap:nowrap; overflow-x:auto; margin-inline:-24px; padding-inline:24px; scrollbar-width:none; } .bw-chips::-webkit-scrollbar{ display:none; } .bw-chip{ white-space:nowrap; flex:none; } }
  .bw-strip{ display:flex; gap:16px; overflow-x:auto; scroll-snap-type:x mandatory; padding:8px 2px 18px; margin-top:26px; scrollbar-width:thin; }
  .bw-mini{ flex:0 0 168px; scroll-snap-align:start; background:#fff; border:1px solid var(--fog-dim,#E6DFDA); border-radius:18px; overflow:hidden; text-decoration:none; color:inherit; box-shadow:0 18px 36px -28px rgba(36,29,46,.35); transition:transform .15s; display:block; }
  .bw-mini:hover{ transform:translateY(-3px); }
  .bw-mini img{ width:100%; aspect-ratio:4/5; object-fit:cover; object-position:center 22%; display:block; background:var(--fog-dim,#E6DFDA); }
  .bw-mini-b{ padding:10px 12px 13px; }
  .bw-mini-n{ font-family:'Noto Kufi Arabic',sans-serif; font-weight:700; font-size:13.5px; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .bw-mini-r{ font-size:11.5px; color:var(--text-muted-light,#6B6072); line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .bw-link{ display:inline-flex; align-items:center; gap:6px; font-weight:700; font-size:14.5px; color:var(--clarity-dark,#7D5F27); text-decoration:underline; margin-top:6px; }
  .bw-reassure{ list-style:none; padding:0; margin:0 0 20px; display:flex; flex-direction:column; gap:6px; font-size:13.5px; color:var(--text-muted-light,#6B6072); }
  .bw-reassure li::before{ content:'✓'; color:#3C8C5A; font-weight:900; margin-inline-end:8px; }
  .qb{ background:#F7F2EA; border:1.5px solid #EBD9B5; border-radius:18px; padding:20px 20px 18px; margin:0 0 26px; }
  .qb-t{ font-family:'Noto Kufi Arabic',sans-serif; font-weight:700; font-size:15px; margin-bottom:10px; }
  .qb-chips{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
  .qb-chip{ background:#fff; border:1.5px solid #BFDCC8; color:#2E6B45; border-radius:100px; padding:6px 13px; font-size:12.5px; font-weight:700; text-decoration:none; }
  .qb-none{ font-size:13.5px; color:var(--text-muted-light,#6B6072); margin:0 0 14px; }
  .qb-btn{ display:block; text-align:center; background:var(--ink,#241D2E); color:var(--fog,#F3EEEA); font-weight:700; font-size:15px; padding:13px 20px; border-radius:100px; text-decoration:none; }
  .qb-ul{ list-style:none; padding:0; margin:14px 0 0; display:grid; gap:5px; font-size:13px; color:var(--text-muted-light,#6B6072); }
  .qb-ul li::before{ content:'✓'; color:#3C8C5A; font-weight:900; margin-inline-end:8px; }
  `;
  document.head.appendChild(css);

  window.BW = { loadTeam, loadAvailability, loc, fmtSlot, availTag, teamPage, homeStrip, quickBook, esc, PLACEHOLDER };
})();
