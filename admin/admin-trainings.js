/* بوضوح — لوحة التحكم: إدارة التدريبات والورش (إضافة/تعديل، الباقات، التسجيلات، تصدير Excel، إرسال رابط الورشة).
   تُحمَّل بعد السكربت الرئيسي وadmin-extra.js. الصلاحيات كلها مفروضة من قاعدة البيانات (RLS + has_permission('trainings')). */
(function () {
  const sb = () => supabaseClient;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n2 = (n) => (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const AR = 'ar-EG-u-nu-latn';
  const fmtDT = (iso) => (iso ? new Date(iso).toLocaleString(AR, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Amman' }) : '—');
  const toAmman = (iso) => (iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Amman' }).replace(' ', 'T').slice(0, 16) : '');
  const fromAmman = (v) => (v ? new Date(v + ':00+03:00').toISOString() : null); // الأردن UTC+3 ثابت
  const toast = (m, t) => (window.kxToast ? window.kxToast(m, t) : alert(m));
  const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const LV = { master: 'ماجستير', phd: 'دكتوراه', graduate: 'خريج/باحث مستقل' };
  const SP = { clinical: 'علم نفس (إكلينيكي/عام/تربوي)', counselling: 'إرشاد نفسي وأسري', social: 'علوم اجتماعية', other: 'تخصص آخر' };
  const ST = { not_started: 'لم يبدأ / اختيار العنوان', proposal: 'إعداد الخطة', framework: 'الإطار النظري والدراسات السابقة', fieldwork: 'التطبيق والتحليل والنتائج', final: 'المراجعة النهائية والتدقيق' };
  const STAT = {
    pending: { l: 'بانتظار الدفع', c: '#7D5F27', bg: '#FBF1DC' }, paid: { l: 'مدفوع', c: '#2E6B45', bg: '#DCEFE3' },
    cancelled: { l: 'ملغى', c: '#6B6072', bg: '#ECE8EE' }, refunded: { l: 'مُسترد', c: '#5B4A86', bg: '#E8E2F4' },
  };
  const chip = (s) => `<span class="trx-chip" style="color:${STAT[s].c};background:${STAT[s].bg}">${STAT[s].l}</span>`;

  /* ---------- أنماط ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .trx-top{ display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:6px; }
  .trx-list{ display:grid; gap:14px; margin-top:16px; }
  .trx-card{ background:#fff; border:1px solid var(--fog-dim); border-radius:16px; padding:16px; display:grid; grid-template-columns:96px 1fr; gap:16px; }
  .trx-card .ph{ width:96px; height:96px; border-radius:12px; background:var(--ink) center/cover; }
  .trx-card h3{ font-size:16.5px; margin:0 0 4px; }
  .trx-meta{ font-size:13px; color:var(--text-muted-light); display:flex; gap:6px 16px; flex-wrap:wrap; }
  .trx-chip{ display:inline-block; font-size:12px; font-weight:700; padding:2px 10px; border-radius:100px; }
  .trx-acts{ display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
  .trx-acts button, .trx-acts a{ font-family:inherit; font-size:13px; font-weight:700; padding:7px 14px; border-radius:100px; border:1.5px solid var(--fog-dim); background:#fff; color:var(--ink); cursor:pointer; text-decoration:none; }
  .trx-acts .pri{ background:var(--clarity); border-color:var(--clarity); }
  .trx-kp{ display:flex; gap:10px; flex-wrap:wrap; margin:8px 0; }
  .trx-kp span{ background:var(--fog); border-radius:10px; padding:4px 12px; font-size:13px; }
  .trx-kp b{ font-family:'Noto Kufi Arabic',sans-serif; }
  .trx-modal{ position:fixed; inset:0; background:rgba(36,29,46,.6); z-index:1150; display:flex; align-items:flex-start; justify-content:center; padding:24px 14px; overflow-y:auto; }
  .trx-box{ background:#fff; border-radius:20px; width:100%; max-width:860px; padding:22px 24px; }
  .trx-box.wide{ max-width:1180px; }
  .trx-hd{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
  .trx-hd h3{ font-size:18px; margin:0; }
  .trx-x{ background:var(--fog); border:1px solid var(--fog-dim); border-radius:50%; width:36px; height:36px; font-size:22px; line-height:1; cursor:pointer; color:var(--ink); }
  .trx-g2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; } .trx-g3{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
  @media (max-width:640px){ .trx-g2,.trx-g3{ grid-template-columns:1fr; } .trx-card{ grid-template-columns:1fr; } .trx-box{ padding:16px; border-radius:14px; } .trx-modal{ padding:0; } }
  .trx-f{ margin-top:12px; } .trx-f label{ display:block; font-size:13px; font-weight:700; margin-bottom:4px; }
  .trx-f input[type=text],.trx-f input[type=number],.trx-f input[type=url],.trx-f input[type=datetime-local],.trx-f textarea,.trx-f select{ width:100%; font-family:inherit; font-size:14px; padding:9px 11px; border:1.5px solid var(--fog-dim); border-radius:10px; background:#fff; }
  .trx-f textarea{ min-height:76px; resize:vertical; line-height:1.7; } .trx-f small{ display:block; color:var(--text-muted-light); font-size:12px; margin-top:3px; }
  .trx-sec{ font-size:14.5px; font-weight:900; margin:22px 0 4px; padding-top:14px; border-top:1px solid var(--fog-dim); }
  .trx-pk{ border:1.5px solid var(--fog-dim); border-radius:14px; padding:12px; margin-top:10px; background:var(--fog); }
  .trx-pk .row{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:8px; font-size:13px; }
  .trx-tbl{ width:100%; border-collapse:collapse; font-size:13px; } .trx-tbl th{ text-align:start; color:var(--ink); font-weight:700; background:var(--fog); padding:8px 10px; white-space:nowrap; position:sticky; top:0; }
  .trx-tbl td{ padding:8px 10px; border-top:1px solid var(--fog-dim); vertical-align:top; } .trx-wrap{ overflow:auto; max-height:62vh; border:1px solid var(--fog-dim); border-radius:12px; }
  .trx-btn{ font-family:inherit; font-size:12.5px; font-weight:700; padding:5px 12px; border-radius:100px; border:1.5px solid var(--fog-dim); background:#fff; cursor:pointer; color:var(--ink); }
  .trx-btn.ok{ background:#DCEFE3; border-color:#b8dcc5; color:#2E6B45; } .trx-btn.bad{ background:#F6E5E7; border-color:#e8c4c8; color:#9C3F47; }
  .trx-filters{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:10px 0; }
  .trx-filters input, .trx-filters select{ font-family:inherit; font-size:13.5px; padding:7px 12px; border:1.5px solid var(--fog-dim); border-radius:100px; }
  .trx-dl{ display:grid; grid-template-columns:auto 1fr; gap:6px 16px; font-size:14px; } .trx-dl dt{ color:var(--text-muted-light); } .trx-dl dd{ margin:0; font-weight:600; word-break:break-word; }
  `;
  document.head.appendChild(css);

  /* ---------- تسجيل التبويب ---------- */
  const bar = document.querySelector('.admin-tabs');
  const host = $('tab-packages').parentNode;
  TAB_PERMISSION.trainings = 'trainings';
  const btn = document.createElement('button'); btn.className = 'admin-tab'; btn.dataset.tab = 'trainings'; btn.textContent = 'التدريبات والورش';
  const after = bar.querySelector('[data-tab="bookings"]');
  bar.insertBefore(btn, after ? after.nextElementSibling : null);
  const panel = document.createElement('div'); panel.id = 'tab-trainings'; panel.className = 'admin-tab-panel'; panel.style.display = 'none'; host.appendChild(panel);
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach((x) => x.classList.remove('active')); btn.classList.add('active');
    document.querySelectorAll('.admin-tab-panel').forEach((p) => (p.style.display = 'none')); panel.style.display = 'block';
    loadTrainings();
  });

  function modal(html, wide) {
    const m = document.createElement('div'); m.className = 'trx-modal';
    m.innerHTML = `<div class="trx-box${wide ? ' wide' : ''}">${html}</div>`;
    const close = () => { m.remove(); document.body.style.overflow = ''; };
    m.addEventListener('mousedown', (e) => { if (e.target === m) close(); });
    document.body.appendChild(m); document.body.style.overflow = 'hidden';
    m.querySelector('.trx-x').addEventListener('click', close);
    return { el: m, close, q: (s) => m.querySelector(s) };
  }
  const pageUrl = (t) => location.origin + '/trainings/?t=' + t.slug;

  /* ---------- القائمة ---------- */
  let DATA = { trainings: [], regs: [] };
  async function loadTrainings() {
    panel.innerHTML = '<div class="trx-top"><h2 class="section-title">التدريبات والورش</h2></div><p class="section-sub">جارٍ التحميل...</p>';
    const [t, r] = await Promise.all([
      sb().from('trainings').select('*, training_packages(*)').order('starts_at', { ascending: false }),
      sb().from('training_registrations').select('*').order('created_at', { ascending: false }).limit(5000),
    ]);
    if (t.error || r.error) { panel.innerHTML = '<h2 class="section-title">التدريبات والورش</h2><p class="section-sub">تعذّر التحميل. تأكد أن لديك صلاحية «التدريبات والورش».</p>'; console.error(t.error || r.error); return; }
    DATA = { trainings: (t.data || []).map((x) => ({ ...x, pk: (x.training_packages || []).sort((a, b) => a.sort_order - b.sort_order) })), regs: r.data || [] };
    paintList();
  }
  const regsOf = (id) => DATA.regs.filter((x) => x.training_id === id);
  const held = (x) => x.status === 'paid' || (x.status === 'pending' && Date.now() - new Date(x.created_at).getTime() < (x.payment_method === 'other' ? 12 * 3600e3 : 90 * 60e3));

  function paintList() {
    const items = DATA.trainings.map((t) => {
      const rs = regsOf(t.id), paid = rs.filter((x) => x.status === 'paid'), pend = rs.filter((x) => x.status === 'pending' && held(x)), rev = paid.reduce((s, x) => s + Number(x.final_jod), 0);
      const past = new Date(t.starts_at).getTime() < Date.now();
      return `<div class="trx-card"><div class="ph" style="background-image:url('${esc(t.image_url || '')}')"></div><div>
        <h3>${esc(t.title)}</h3>
        <div class="trx-meta"><span>📅 ${fmtDT(t.starts_at)} (عمّان)</span><span>⏱ ${t.duration_min} دقيقة</span><span>🔗 <code>/trainings/?t=${esc(t.slug)}</code></span></div>
        <div style="margin:8px 0;">${t.is_published ? '<span class="trx-chip" style="color:#2E6B45;background:#DCEFE3">منشور</span>' : '<span class="trx-chip" style="color:#6B6072;background:#ECE8EE">مخفي (مسودة)</span>'}
          ${past ? '<span class="trx-chip" style="color:#6B6072;background:#ECE8EE">انتهى الموعد</span>' : (t.registration_open ? '<span class="trx-chip" style="color:#2E6B45;background:#DCEFE3">التسجيل مفتوح</span>' : '<span class="trx-chip" style="color:#9C3F47;background:#F6E5E7">التسجيل مغلق</span>')}</div>
        <div class="trx-kp"><span>المقاعد <b>${paid.length + pend.length}/${t.seats}</b></span><span>مدفوع <b>${paid.length}</b></span><span>بانتظار الدفع <b>${pend.length}</b></span><span>الإيراد <b>${n2(rev)}</b> د.أ</span></div>
        <div class="trx-acts"><button class="pri" data-regs="${t.id}">التسجيلات (${rs.length})</button><button data-edit="${t.id}">تعديل</button>
          <a href="/trainings/?t=${esc(t.slug)}" target="_blank" rel="noopener">فتح الصفحة</a><button data-copy="${t.id}">نسخ الرابط</button></div></div></div>`;
    }).join('');
    panel.innerHTML = `<div class="trx-top"><h2 class="section-title">التدريبات والورش</h2><button class="btn-primary" id="trNew" style="width:auto;">+ تدريب جديد</button></div>
      <p class="section-sub">أضف تدريباً أو ورشة، حدّد باقاتها وأسعارها بالدينار، وتابع التسجيلات والمدفوعات. الدفع بالبطاقة يؤكّد المقعد تلقائياً؛ وللدفع بطريقة أخرى (كليك/تحويل) استخدم «تأكيد الدفع» في صفحة التسجيلات.</p>
      <div class="trx-list">${items || '<p class="section-sub">لا توجد تدريبات بعد.</p>'}</div>`;
    $('trNew').addEventListener('click', () => openEdit(null));
    panel.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEdit(DATA.trainings.find((t) => t.id === b.dataset.edit))));
    panel.querySelectorAll('[data-regs]').forEach((b) => b.addEventListener('click', () => openRegs(DATA.trainings.find((t) => t.id === b.dataset.regs))));
    panel.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => { const t = DATA.trainings.find((x) => x.id === b.dataset.copy); try { await navigator.clipboard.writeText(pageUrl(t)); toast('تم نسخ الرابط', 'ok'); } catch (e) { prompt('انسخ الرابط:', pageUrl(t)); } }));
  }

  /* ---------- تعديل / إضافة ---------- */
  async function resizeImg(file) {
    const bmp = await createImageBitmap(file); const s = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/jpeg', 0.85));
  }
  const inp = (id, label, val, type, ph, hint) => `<div class="trx-f"><label for="${id}">${label}</label><input type="${type || 'text'}" id="${id}" value="${esc(val == null ? '' : val)}" placeholder="${esc(ph || '')}">${hint ? `<small>${hint}</small>` : ''}</div>`;
  const ta = (id, label, val, hint, rows) => `<div class="trx-f"><label for="${id}">${label}</label><textarea id="${id}"${rows ? ` style="min-height:${rows * 26}px"` : ''}>${esc(val == null ? '' : val)}</textarea>${hint ? `<small>${hint}</small>` : ''}</div>`;

  async function openEdit(t) {
    const isNew = !t;
    const tomorrow = new Date(Date.now() + 7 * 86400e3); const dflt = tomorrow.toISOString().slice(0, 10) + 'T18:30';
    const v = t || { slug: '', title: '', title_en: '', kicker: 'ورشة عمل تفاعلية (أونلاين)', kicker_en: 'Interactive online workshop', summary: '', summary_en: '', audience: '', audience_en: '', topics: [], topics_en: [], supervisor: '', supervisor_en: '', format_note: 'الورشة مباشرة وغير مسجّلة.', format_note_en: 'The workshop is live and not recorded.', terms: 'أقرّ بعلمي أن حجز المقعد يُعتمد نهائياً فور إتمام الدفع.', terms_en: 'I understand that my seat is confirmed only once payment is complete.', starts_at: null, duration_min: 180, location: 'أونلاين عبر Google Meet', location_en: 'Online via Google Meet', seats: 10, image_url: '', early_until: null, early_pct: 10, group_pct: 10, jod_per_usd: 0.709, is_published: false, registration_open: true, sort_order: 0, pk: [{ name: '', name_en: '', price_jod: 50, features: [], features_en: [], is_featured: false, is_active: true, sort_order: 1 }] };
    let secret = '';
    if (!isNew) { const r = await sb().from('training_secrets').select('meeting_url').eq('training_id', t.id).maybeSingle(); secret = (r.data && r.data.meeting_url) || ''; }
    let img = v.image_url || '';
    const m = modal(`<div class="trx-hd"><h3>${isNew ? 'تدريب جديد' : 'تعديل: ' + esc(t.title)}</h3><button type="button" class="trx-x" aria-label="إغلاق">&times;</button></div>
      <div class="trx-g2">${inp('tTitle', 'العنوان (عربي) *', v.title)}${inp('tTitleEn', 'Title (English)', v.title_en)}</div>
      <div class="trx-g2">${inp('tKick', 'سطر صغير فوق العنوان (عربي)', v.kicker)}${inp('tKickEn', 'Kicker (English)', v.kicker_en)}</div>
      ${inp('tSlug', 'الرابط المختصر *', v.slug, 'text', 'research-roadmap', 'حروف إنجليزية صغيرة وأرقام وشرطة فقط. يظهر في العنوان: /trainings/?t=…')}
      <div class="trx-g2">${ta('tSum', 'ملخص قصير (عربي)', v.summary, '', 3)}${ta('tSumEn', 'Short summary (English)', v.summary_en, '', 3)}</div>
      <div class="trx-g2">${ta('tAud', 'لمن التدريب؟ (عربي)', v.audience, '', 3)}${ta('tAudEn', 'Who is it for? (English)', v.audience_en, '', 3)}</div>
      <div class="trx-g2">${ta('tTop', 'المحاور (كل محور بسطر) — عربي', (v.topics || []).join('\n'), '', 5)}${ta('tTopEn', 'Topics (one per line) — English', (v.topics_en || []).join('\n'), '', 5)}</div>
      <div class="trx-g2">${ta('tSup', 'المشرف/المقدّمون (عربي)', v.supervisor, '', 2)}${ta('tSupEn', 'Supervisor / presenters (English)', v.supervisor_en, '', 2)}</div>
      <div class="trx-g2">${ta('tFmt', 'ملاحظة عن التنظيم (عربي)', v.format_note, '', 2)}${ta('tFmtEn', 'Format note (English)', v.format_note_en, '', 2)}</div>
      <div class="trx-g2">${ta('tTerms', 'نص الإقرار عند التسجيل (عربي)', v.terms, '', 2)}${ta('tTermsEn', 'Consent text (English)', v.terms_en, '', 2)}</div>
      <div class="trx-sec">الموعد والمكان</div>
      <div class="trx-g3">${inp('tStart', 'الموعد (بتوقيت الأردن) *', toAmman(v.starts_at) || dflt, 'datetime-local')}${inp('tDur', 'المدة (دقيقة)', v.duration_min, 'number')}${inp('tSeats', 'عدد المقاعد', v.seats, 'number')}</div>
      <div class="trx-g2">${inp('tLoc', 'المكان (عربي)', v.location)}${inp('tLocEn', 'Location (English)', v.location_en)}</div>
      ${inp('tMeet', 'رابط الاجتماع (Google Meet) — سرّي', secret, 'url', 'https://meet.google.com/...', 'لا يظهر للزوار أبداً. يصل المسجَّلين المدفوعين بالبريد عند إرساله من هنا (زر «إرسال الرابط» في صفحة التسجيلات) أو تلقائياً مع تأكيد الدفع إن كان موجوداً.')}
      <div class="trx-sec">الصورة</div>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div id="tPrev" style="width:120px;height:120px;border-radius:12px;background:var(--ink) center/cover"></div>
        <div><label class="trx-btn" for="tFile" style="display:inline-block">رفع / تغيير الصورة</label><input type="file" id="tFile" accept="image/jpeg,image/png,image/webp" style="display:none"> <button type="button" class="trx-btn" id="tNoImg">إزالة</button><br><small id="tImgMsg" style="color:var(--text-muted-light)">يُفضّل صورة مربعة (بوستر).</small></div></div>
      <div class="trx-sec">الخصومات والتسعير</div>
      <div class="trx-g3">${inp('tEarlyU', 'آخر موعد لخصم التسجيل المبكر (بتوقيت الأردن)', toAmman(v.early_until), 'datetime-local', '', 'اتركه فارغاً لإلغاء خصم التسجيل المبكر.')}${inp('tEarlyP', 'نسبة خصم التسجيل المبكر %', v.early_pct, 'number')}${inp('tGroupP', 'نسبة خصم المجموعات/الزملاء %', v.group_pct, 'number', '', 'اكتب 0 لإلغائه.')}</div>
      ${inp('tRate', 'سعر الدينار مقابل الدولار (للدفع بالبطاقة)', v.jod_per_usd, 'number', '', 'الدفع بالبطاقة يتم بالدولار: المبلغ بالدولار = المبلغ بالدينار ÷ هذا الرقم. الافتراضي 0.709.')}
      <div class="trx-sec">الباقات (الأسعار بالدينار الأردني)</div><div id="tPks"></div>
      <button type="button" class="trx-btn" id="tAddPk" style="margin-top:10px">+ إضافة باقة</button>
      <div class="trx-sec">النشر</div>
      <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-top:8px"><input type="checkbox" id="tPub"${v.is_published ? ' checked' : ''} style="width:auto"> منشور (ظاهر لزوّار الموقع)</label>
      <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-top:8px"><input type="checkbox" id="tOpen"${v.registration_open ? ' checked' : ''} style="width:auto"> التسجيل مفتوح</label>
      ${inp('tSort', 'الترتيب (الأصغر أولاً)', v.sort_order, 'number')}
      <div style="margin-top:20px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button type="button" class="btn-primary" id="tSave" style="width:auto">حفظ</button>${isNew ? '' : '<button type="button" class="trx-btn bad" id="tDel">حذف التدريب</button>'}<span id="tMsg" style="font-size:13px;color:var(--alert)"></span></div>`);
    const q = m.q;
    const paint = () => { q('#tPrev').style.backgroundImage = img ? `url('${img}')` : 'none'; };
    paint();
    q('#tNoImg').addEventListener('click', () => { img = ''; paint(); });
    q('#tFile').addEventListener('change', async () => {
      const file = q('#tFile').files[0]; if (!file) return; q('#tImgMsg').textContent = 'جارٍ الرفع...';
      try {
        const blob = await resizeImg(file); const path = 'training-' + Date.now() + '.jpg';
        const { error } = await sb().storage.from('training-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false }); if (error) throw error;
        img = sb().storage.from('training-images').getPublicUrl(path).data.publicUrl; paint(); q('#tImgMsg').textContent = 'تم الرفع. اضغط حفظ.';
      } catch (e) { console.error(e); q('#tImgMsg').textContent = 'تعذّر رفع الصورة.'; }
    });
    // الباقات
    const pks = (v.pk || []).map((p) => ({ ...p }));
    const pkHtml = (p, i) => `<div class="trx-pk" data-i="${i}"><div class="trx-g3">${inp('pkN' + i, 'اسم الباقة (عربي) *', p.name)}${inp('pkNe' + i, 'Package name (English)', p.name_en)}${inp('pkP' + i, 'السعر بالدينار *', p.price_jod, 'number')}</div>
      <div class="trx-g2">${ta('pkF' + i, 'المزايا (كل ميزة بسطر) — عربي', (p.features || []).join('\n'), '', 4)}${ta('pkFe' + i, 'Features (one per line) — English', (p.features_en || []).join('\n'), '', 4)}</div>
      <div class="row"><label><input type="checkbox" id="pkFt${i}"${p.is_featured ? ' checked' : ''}> «الأكثر طلباً»</label><label><input type="checkbox" id="pkA${i}"${p.is_active !== false ? ' checked' : ''}> مفعّلة</label><label>الترتيب <input type="number" id="pkO${i}" value="${p.sort_order == null ? i + 1 : p.sort_order}" style="width:70px"></label><button type="button" class="trx-btn bad" data-rm="${i}">حذف الباقة</button></div></div>`;
    const readPks = () => pks.forEach((p, i) => { if (!$('pkN' + i)) return; Object.assign(p, { name: $('pkN' + i).value.trim(), name_en: $('pkNe' + i).value.trim() || null, price_jod: Number($('pkP' + i).value), features: lines($('pkF' + i).value), features_en: lines($('pkFe' + i).value), is_featured: $('pkFt' + i).checked, is_active: $('pkA' + i).checked, sort_order: Number($('pkO' + i).value) || i + 1 }); });
    const removed = [];
    const drawPks = () => {
      q('#tPks').innerHTML = pks.map(pkHtml).join('');
      q('#tPks').querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { readPks(); const i = +b.dataset.rm; if (pks[i].id) removed.push(pks[i].id); pks.splice(i, 1); drawPks(); }));
    };
    drawPks();
    q('#tAddPk').addEventListener('click', () => { readPks(); pks.push({ name: '', name_en: '', price_jod: 50, features: [], features_en: [], is_featured: false, is_active: true, sort_order: pks.length + 1 }); drawPks(); });
    if (!isNew) q('#tDel').addEventListener('click', async () => {
      const n = regsOf(t.id).length;
      if (n) { toast('عليه ' + n + ' تسجيل، لا يمكن حذفه. اخفِه (غير منشور) بدل ذلك.', 'err'); return; }
      if (!confirm('حذف هذا التدريب نهائياً؟ لا يمكن التراجع.')) return;
      const { error } = await sb().from('trainings').delete().eq('id', t.id); if (error) { toast('تعذّر الحذف', 'err'); return; }
      m.close(); loadTrainings();
    });
    q('#tSave').addEventListener('click', async () => {
      readPks(); const msg = q('#tMsg'); msg.textContent = '';
      const g = (id) => q('#' + id).value.trim();
      const slug = g('tSlug').toLowerCase();
      if (!g('tTitle')) { msg.textContent = 'العنوان مطلوب.'; return; }
      if (!/^[a-z0-9-]{3,60}$/.test(slug)) { msg.textContent = 'الرابط المختصر: حروف إنجليزية صغيرة وأرقام وشرطة (3 إلى 60).'; return; }
      if (!g('tStart')) { msg.textContent = 'حدّد الموعد.'; return; }
      const act = pks.filter((p) => p.is_active);
      if (!pks.length || pks.some((p) => !p.name || !(p.price_jod >= 1))) { msg.textContent = 'كل باقة تحتاج اسماً وسعراً (1 د.أ فأكثر).'; return; }
      if (!act.length) { msg.textContent = 'فعّل باقة واحدة على الأقل.'; return; }
      const row = {
        slug, title: g('tTitle'), title_en: g('tTitleEn') || null, kicker: g('tKick') || null, kicker_en: g('tKickEn') || null,
        summary: g('tSum') || null, summary_en: g('tSumEn') || null, audience: g('tAud') || null, audience_en: g('tAudEn') || null,
        topics: lines(q('#tTop').value), topics_en: lines(q('#tTopEn').value), supervisor: g('tSup') || null, supervisor_en: g('tSupEn') || null,
        format_note: g('tFmt') || null, format_note_en: g('tFmtEn') || null, terms: g('tTerms') || null, terms_en: g('tTermsEn') || null,
        starts_at: fromAmman(g('tStart')), duration_min: Number(g('tDur')) || 180, seats: Math.max(0, Number(g('tSeats')) || 0), location: g('tLoc') || null, location_en: g('tLocEn') || null,
        image_url: img || null, early_until: fromAmman(g('tEarlyU')), early_pct: Math.min(90, Math.max(0, Number(g('tEarlyP')) || 0)), group_pct: Math.min(90, Math.max(0, Number(g('tGroupP')) || 0)),
        jod_per_usd: Number(g('tRate')) || 0.709, is_published: q('#tPub').checked, registration_open: q('#tOpen').checked, sort_order: Number(g('tSort')) || 0,
      };
      const b = q('#tSave'); b.disabled = true; msg.style.color = 'var(--text-muted-light)'; msg.textContent = 'جارٍ الحفظ...';
      try {
        let id = t && t.id;
        if (isNew) { const r = await sb().from('trainings').insert(row).select('id').single(); if (r.error) throw r.error; id = r.data.id; }
        else { const r = await sb().from('trainings').update(row).eq('id', id); if (r.error) throw r.error; }
        let pkWarn = '';
        if (removed.length) { const r = await sb().from('training_packages').delete().in('id', removed); if (r.error) pkWarn = 'تعذّر حذف باقة عليها تسجيلات: عطّلها بدل الحذف. '; }
        for (const p of pks) {
          const pr = { training_id: id, name: p.name, name_en: p.name_en, price_jod: p.price_jod, features: p.features, features_en: p.features_en, is_featured: p.is_featured, is_active: p.is_active, sort_order: p.sort_order };
          const r = p.id ? await sb().from('training_packages').update(pr).eq('id', p.id) : await sb().from('training_packages').insert(pr);
          if (r.error) throw r.error;
        }
        const r2 = await sb().from('training_secrets').upsert({ training_id: id, meeting_url: g('tMeet') || null }, { onConflict: 'training_id' }); if (r2.error) throw r2.error;
        toast('تم الحفظ. ' + pkWarn, pkWarn ? '' : 'ok'); m.close(); loadTrainings();
      } catch (e) {
        console.error(e); b.disabled = false; msg.style.color = 'var(--alert)';
        msg.textContent = /duplicate key|unique/i.test(String(e.message)) ? 'هذا الرابط المختصر مستخدم لتدريب آخر.' : 'تعذّر الحفظ: ' + (e.message || '');
      }
    });
  }

  /* ---------- التسجيلات ---------- */
  function openRegs(t) {
    let f = { q: '', st: 'all' };
    const m = modal(`<div class="trx-hd"><h3>تسجيلات: ${esc(t.title)}</h3><button type="button" class="trx-x" aria-label="إغلاق">&times;</button></div>
      <div id="rSum"></div>
      <div class="trx-filters"><input type="search" id="rQ" placeholder="بحث بالاسم أو الهاتف أو البريد"><select id="rSt"><option value="all">كل الحالات</option><option value="paid">مدفوع</option><option value="pending">بانتظار الدفع</option><option value="cancelled">ملغى</option><option value="refunded">مُسترد</option></select>
        <button class="trx-btn" id="rCsv" type="button">تصدير Excel (CSV)</button><button class="trx-btn" id="rLink" type="button">إرسال رابط الورشة للمدفوعين</button></div>
      <div class="trx-wrap"><table class="trx-tbl"><thead><tr><th>الاسم</th><th>التواصل</th><th>الباقة</th><th>المبلغ</th><th>الدفع</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead><tbody id="rBody"></tbody></table></div>
      <p style="font-size:12.5px;color:var(--text-muted-light);margin-top:10px">«تأكيد الدفع» لمن دفع كليك/تحويلاً: يُعلَّم مدفوعاً ويصله إيميل تأكيد المقعد. الاسترداد الفعلي لدفعات البطاقة يتم من لوحة Stripe، وهنا نسجّل الحالة فقط.</p>`, true);
    const q = m.q;
    const pkName = (id) => ((t.pk.find((p) => p.id === id) || {}).name) || '—';
    const rows = () => {
      const s = f.q.trim().toLowerCase();
      return regsOf(t.id).filter((x) => (f.st === 'all' || x.status === f.st) && (!s || [x.full_name, x.whatsapp, x.email, x.country_univ].join(' ').toLowerCase().includes(s)));
    };
    const draw = () => {
      const all = regsOf(t.id), paid = all.filter((x) => x.status === 'paid'), pend = all.filter((x) => x.status === 'pending' && held(x)), rev = paid.reduce((s, x) => s + Number(x.final_jod), 0);
      q('#rSum').innerHTML = `<div class="trx-kp"><span>مدفوع <b>${paid.length}</b></span><span>محجوز بانتظار الدفع <b>${pend.length}</b></span><span>المقاعد المتبقية <b>${Math.max(0, t.seats - paid.length - pend.length)}</b> من ${t.seats}</span><span>الإيراد <b>${n2(rev)}</b> د.أ</span></div>`;
      q('#rBody').innerHTML = rows().map((x) => `<tr><td><b>${esc(x.full_name)}</b><br><small>${esc(x.country_univ)}</small></td>
        <td dir="ltr" style="text-align:right"><a href="https://wa.me/${esc(String(x.whatsapp).replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener">${esc(x.whatsapp)}</a><br><small>${esc(x.email)}</small></td>
        <td>${esc(pkName(x.package_id))}${x.discount_pct ? `<br><small>خصم ${x.discount_pct}%${x.discount_kind === 'early' ? ' (مبكر)' : ' (مجموعة)'}</small>` : ''}</td>
        <td>${n2(x.final_jod)} د.أ<br><small>≈ $${n2(x.final_usd)}</small></td><td>${x.payment_method === 'card' ? 'بطاقة' : 'أخرى (كليك/تحويل)'}</td>
        <td>${chip(x.status)}${x.link_sent_at ? '<br><small>أُرسل الرابط ✓</small>' : ''}</td><td><small>${fmtDT(x.created_at)}</small></td>
        <td style="white-space:nowrap"><button class="trx-btn" data-d="${x.id}">تفاصيل</button> ${x.status !== 'paid' ? `<button class="trx-btn ok" data-paid="${x.id}">تأكيد الدفع</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted-light)">لا توجد تسجيلات.</td></tr>';
      q('#rBody').querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => openReg(DATA.regs.find((r) => r.id === b.dataset.d), t, () => draw())));
      q('#rBody').querySelectorAll('[data-paid]').forEach((b) => b.addEventListener('click', async () => {
        const x = DATA.regs.find((r) => r.id === b.dataset.paid);
        if (!confirm('تأكيد استلام دفعة ' + x.full_name + ' (' + n2(x.final_jod) + ' د.أ)؟ سيصله إيميل تأكيد المقعد.')) return;
        const { error } = await sb().from('training_registrations').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', x.id);
        if (error) { toast('تعذّر التأكيد', 'err'); return; } x.status = 'paid'; x.paid_at = new Date().toISOString(); toast('تم تأكيد الدفع وإرسال الإيميل', 'ok'); draw(); paintList();
      }));
    };
    q('#rQ').addEventListener('input', (e) => { f.q = e.target.value; draw(); });
    q('#rSt').addEventListener('change', (e) => { f.st = e.target.value; draw(); });
    q('#rCsv').addEventListener('click', () => {
      const head = ['التاريخ', 'الاسم', 'واتساب', 'البريد', 'البلد والجامعة', 'المرحلة', 'التخصص', 'مرحلة البحث', 'التحدي', 'الباقة', 'السعر الأصلي (د.أ)', 'الخصم %', 'نوع الخصم', 'أسماء الزملاء', 'المبلغ المدفوع (د.أ)', 'المبلغ ($)', 'طريقة الدفع', 'الحالة', 'تاريخ الدفع', 'ملاحظة'];
      const esc2 = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const data = rows().map((x) => [fmtDT(x.created_at), x.full_name, "'" + x.whatsapp, x.email, x.country_univ, LV[x.level], SP[x.specialization], ST[x.stage], x.challenge, pkName(x.package_id), x.price_jod, x.discount_pct, x.discount_kind, x.group_names || '', x.final_jod, x.final_usd, x.payment_method === 'card' ? 'بطاقة' : 'أخرى', STAT[x.status].l, x.paid_at ? fmtDT(x.paid_at) : '', x.admin_note || '']);
      const blob = new Blob(['﻿' + [head].concat(data).map((r) => r.map(esc2).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'registrations-' + t.slug + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
    q('#rLink').addEventListener('click', async () => {
      const n = regsOf(t.id).filter((x) => x.status === 'paid').length;
      if (!n) { toast('لا يوجد مسجَّلون مدفوعون بعد.', 'err'); return; }
      const hasLink = await sb().from('training_secrets').select('meeting_url').eq('training_id', t.id).maybeSingle();
      if (!hasLink.data || !hasLink.data.meeting_url) { toast('أضف رابط الاجتماع أولاً من «تعديل».', 'err'); return; }
      if (!confirm('إرسال رابط الورشة بالإيميل إلى ' + n + ' مسجَّل مدفوع؟')) return;
      const { error } = await sb().rpc('admin_training_notify', { p_type: 'link', p_training: t.id });
      if (error) { toast('تعذّر الإرسال', 'err'); return; } toast('جارٍ إرسال الرابط للمدفوعين.', 'ok'); setTimeout(loadTrainings, 6000);
    });
    draw();
  }

  function openReg(x, t, done) {
    const p = (t.pk.find((k) => k.id === x.package_id) || {}).name || '—';
    const m = modal(`<div class="trx-hd"><h3>${esc(x.full_name)}</h3><button type="button" class="trx-x" aria-label="إغلاق">&times;</button></div>
      <dl class="trx-dl"><dt>الحالة</dt><dd>${chip(x.status)}</dd><dt>الباقة</dt><dd>${esc(p)}</dd><dt>المبلغ</dt><dd>${n2(x.final_jod)} د.أ (≈ $${n2(x.final_usd)})${x.discount_pct ? ' — خصم ' + x.discount_pct + '%' : ''}</dd>
      <dt>طريقة الدفع</dt><dd>${x.payment_method === 'card' ? 'بطاقة (Stripe)' : 'أخرى (كليك/تحويل)'}</dd><dt>واتساب</dt><dd dir="ltr" style="text-align:right"><a href="https://wa.me/${esc(String(x.whatsapp).replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener">${esc(x.whatsapp)}</a></dd>
      <dt>البريد</dt><dd dir="ltr" style="text-align:right">${esc(x.email)}</dd><dt>البلد والجامعة</dt><dd>${esc(x.country_univ)}</dd><dt>المرحلة</dt><dd>${esc(LV[x.level])}</dd><dt>التخصص</dt><dd>${esc(SP[x.specialization])}</dd>
      <dt>مرحلة البحث</dt><dd>${esc(ST[x.stage])}</dd><dt>التحدي</dt><dd style="white-space:pre-wrap">${esc(x.challenge)}</dd>${x.group_names ? `<dt>أسماء الزملاء</dt><dd style="white-space:pre-wrap">${esc(x.group_names)}</dd>` : ''}
      <dt>سُجّل في</dt><dd>${fmtDT(x.created_at)}</dd>${x.paid_at ? `<dt>دُفع في</dt><dd>${fmtDT(x.paid_at)}</dd>` : ''}${x.stripe_session_id ? `<dt>مرجع Stripe</dt><dd dir="ltr" style="text-align:right;font-size:12px">${esc(x.stripe_session_id)}</dd>` : ''}</dl>
      <div class="trx-f"><label for="xNote">ملاحظة داخلية</label><textarea id="xNote">${esc(x.admin_note || '')}</textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="trx-btn ok" id="xSave" type="button">حفظ الملاحظة</button>
        ${x.status === 'paid' ? '<button class="trx-btn" id="xResend" type="button">إعادة إرسال إيميل التأكيد</button><button class="trx-btn" id="xRefund" type="button">تعليم كمُسترد</button>' : ''}
        ${x.status === 'pending' ? '<button class="trx-btn bad" id="xCancel" type="button">إلغاء الطلب</button>' : ''}
        ${x.status === 'cancelled' || x.status === 'refunded' ? '<button class="trx-btn bad" id="xDel" type="button">حذف نهائي</button>' : ''}
      </div>`);
    const upd = async (patch, okMsg) => { const { error } = await sb().from('training_registrations').update(patch).eq('id', x.id); if (error) { toast('تعذّر الحفظ', 'err'); return false; } Object.assign(x, patch); toast(okMsg, 'ok'); done(); paintList(); return true; };
    m.q('#xSave').addEventListener('click', () => upd({ admin_note: m.q('#xNote').value.trim() || null }, 'تم الحفظ'));
    const rs = m.q('#xResend'); if (rs) rs.addEventListener('click', async () => { const { error } = await sb().rpc('admin_training_notify', { p_type: 'paid', p_reg: x.id }); toast(error ? 'تعذّر الإرسال' : 'أُرسل إيميل التأكيد', error ? 'err' : 'ok'); });
    const rf = m.q('#xRefund'); if (rf) rf.addEventListener('click', async () => { if (confirm('تعليم هذا التسجيل كمُسترد؟ (الاسترداد الفعلي يتم من Stripe) وسيتحرر المقعد.') && await upd({ status: 'refunded' }, 'تم')) m.close(); });
    const cn = m.q('#xCancel'); if (cn) cn.addEventListener('click', async () => { if (confirm('إلغاء هذا الطلب وتحرير المقعد؟') && await upd({ status: 'cancelled' }, 'تم الإلغاء')) m.close(); });
    const dl = m.q('#xDel'); if (dl) dl.addEventListener('click', async () => {
      if (!confirm('حذف هذا التسجيل نهائياً؟')) return;
      const { error } = await sb().from('training_registrations').delete().eq('id', x.id); if (error) { toast('تعذّر الحذف', 'err'); return; }
      DATA.regs = DATA.regs.filter((r) => r.id !== x.id); m.close(); done(); paintList();
    });
  }
})();
