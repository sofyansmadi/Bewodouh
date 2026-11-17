/* بوضوح — تجربة حجز مركّزة لصفحة الحجز (sales-page):
   - عند القدوم من صفحة أخصائي (أو داخل النافذة المنبثقة embed=1) نخفي الصفحة التسويقية ونُبقي نموذج الحجز فقط.
   - بطاقات اختيار الباقة مع السعر بعملة الزائر (تقريبي) وخصم أول جلسة.
   - اختيار عملة العرض، وإظهار كليك للأردن فقط.
   يعتمد على supabaseClient و BWCUR، ولا يغيّر منطق الدفع. */
(function () {
  const root = document.documentElement;
  const EN = root.lang === 'en';
  const t = (ar, en) => (EN ? en : ar);
  const form = document.getElementById('bookingForm');
  if (!form || typeof supabaseClient === 'undefined' || !supabaseClient) return;
  const Q = new URLSearchParams(location.search);
  const focus = root.classList.contains('focus');
  const sel = document.getElementById('bkPackage');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- أنماط ---------- */
  const css = document.createElement('style');
  css.textContent = `
  html.focus header.hero, html.focus body > section:not(#booking-form), html.focus main > section:not(#booking-form){ display:none !important; }
  html.embed site-nav, html.embed site-footer, html.embed .topbar, html.embed nav{ display:none !important; }
  html.embed body{ background:#fff; }
  html.embed #booking-form{ padding:18px 0 28px; background:#fff; }
  html.embed .booking-card{ border:none; box-shadow:none; padding:6px 4px 0; }
  html.embed #booking-form .eyebrow, html.embed #booking-form .section-lede{ display:none; }
  html.focus #booking-form{ padding-top:36px; }
  html.focus #booking-form .section-title{ font-size:clamp(22px,3.2vw,30px); }
  html.focus #bkPackageField{ display:none; }
  .pk-cards{ display:grid; gap:10px; }
  .pk-card{ text-align:start; border:1.5px solid var(--fog-dim); background:var(--fog); border-radius:14px; padding:13px 15px; cursor:pointer; font-family:inherit; display:grid; gap:4px; transition:.15s; color:var(--text-on-light); }
  .pk-card:hover{ border-color:var(--clarity); background:#fff; }
  .pk-card[aria-pressed="true"]{ border-color:var(--clarity); background:#FBF6EC; box-shadow:0 0 0 3px rgba(201,161,95,.25); }
  .pk-card .nm{ font-family:'Noto Kufi Arabic',sans-serif; font-weight:700; font-size:15px; color:var(--ink); display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .pk-card .rec{ background:var(--clarity); color:var(--ink); font-size:11px; padding:2px 9px; border-radius:100px; }
  .pk-card .ds{ font-size:12.5px; color:var(--text-muted-light); line-height:1.7; }
  .pk-card .pr{ font-weight:700; font-size:14.5px; display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; }
  .pk-card .pr s{ color:var(--text-muted-light); font-weight:500; font-size:13px; }
  .pk-card .pr .cv{ font-weight:500; font-size:12.5px; color:var(--text-muted-light); }
  .pk-card .off{ color:#2E6B45; font-size:12px; font-weight:700; }
  .pk-err{ border-color:var(--alert) !important; }
  .cur-row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-size:13px; margin:-6px 0 18px; color:var(--text-muted-light); }
  .cur-row select{ border:1.5px solid var(--fog-dim); border-radius:10px; padding:7px 10px; font-family:inherit; font-size:13px; background:var(--fog); color:var(--text-on-light); }
  #priceSummary .cvline{ display:block; font-weight:500; font-size:13px; color:var(--text-muted-light); margin-top:4px; }
  .focus-more{ text-align:center; font-size:13px; margin-top:16px; }
  .focus-more a{ color:var(--clarity); font-weight:700; text-decoration:underline; }
  `;
  document.head.appendChild(css);

  const cur = () => (window.BWCUR ? BWCUR.get() : 'USD');
  const cvTxt = (usd) => (window.BWCUR && cur() !== 'USD' ? '≈ ' + BWCUR.fmt(usd) : '');

  /* ---------- شريط اختيار العملة ---------- */
  if (window.BWCUR) {
    const field = sel.closest('.field');
    if (field) field.id = 'bkPackageField';
    const row = document.createElement('div'); row.className = 'cur-row'; row.id = 'curRow';
    row.innerHTML = `<span>💱 ${t('اعرض الأسعار بعملة:', 'Show prices in:')}</span><select id="curSel" aria-label="${t('العملة', 'Currency')}">${BWCUR.optionsHtml()}</select><span id="curNote" style="flex-basis:100%; font-size:12px;"></span>`;
    if (field) field.insertAdjacentElement('beforebegin', row);
    const sync = () => { document.getElementById('curSel').value = cur(); document.getElementById('curNote').textContent = cur() === 'USD' ? '' : BWCUR.note(); };
    document.getElementById('curSel').addEventListener('change', (e) => { BWCUR.set(e.target.value); });
    window.addEventListener('bw-currency', () => { sync(); paintCards(); paintSummary(); });
    BWCUR.ready.then(() => { sync(); paintCards(); paintSummary(); });
    sync();
  }

  /* ---------- سطر التحويل تحت ملخص السعر ---------- */
  const sumEl = document.getElementById('priceSummary');
  function paintSummary() {
    if (!sumEl) return;
    const old = sumEl.querySelector('.cvline'); if (old) old.remove();
    const usd = Number(sumEl.dataset.usd);
    if (!usd || cur() === 'USD') return;
    const d = document.createElement('span'); d.className = 'cvline'; d.textContent = t('بعملتك ≈ ', 'In your currency ≈ ') + BWCUR.fmt(usd) + t(' (تقريبي، الدفع بالدولار)', ' (approx., you pay in USD)');
    sumEl.appendChild(d);
  }
  if (sumEl) new MutationObserver(() => { if (!sumEl.querySelector('.cvline')) paintSummary(); }).observe(sumEl, { childList: true });

  /* ---------- وضع التركيز: عنوان مختصر + رابط لعرض كل التفاصيل ---------- */
  if (focus) {
    const h = document.querySelector('#booking-form .section-title'); if (h) h.textContent = t('احجز جلستك', 'Book your session');
    const more = document.createElement('p'); more.className = 'focus-more';
    const u = new URL(location.href); u.searchParams.delete('embed'); u.searchParams.set('all', '1');
    more.innerHTML = `<a href="${esc(u.pathname + u.search)}" target="_top">${t('عرض كل الباقات وتفاصيل الجلسات', 'See all packages and session details')}</a>`;
    document.querySelector('#booking-form .booking-card').insertAdjacentElement('afterend', more);
  }

  /* ---------- بطاقات الباقات ---------- */
  let pkgs = [], promo = {};
  const cardsHost = document.createElement('div'); cardsHost.className = 'field'; cardsHost.id = 'pkCardsField';
  cardsHost.innerHTML = `<label>${t('اختر الباقة', 'Choose your package')}</label><div class="pk-cards" id="pkCards" role="radiogroup"></div>`;
  function paintCards() {
    const host = document.getElementById('pkCards'); if (!host || !pkgs.length) return;
    host.innerHTML = pkgs.map(p => {
      const pr = promo[p.name], pct = pr && Number(pr.percent) > 0 ? Number(pr.percent) : 0, fin = pr && pr.final_usd != null ? Number(pr.final_usd) : Number(p.price);
      const u0 = EN ? (UNIT_EN[p.price_unit] || (/[؀-ۿ]/.test(p.price_unit || '') ? '' : p.price_unit)) : p.price_unit;
      const unit = u0 ? ' · ' + esc(u0) : '';
      return `<button type="button" class="pk-card" role="radio" data-name="${esc(p.name)}" aria-pressed="${sel.value === p.name}" aria-checked="${sel.value === p.name}">
        <span class="nm">${esc(EN ? (PKG_EN[p.name] || p.name) : p.name)}${p.is_recommended ? `<span class="rec">${t('الأكثر طلباً', 'Popular')}</span>` : ''}</span>
        ${p.description && !EN ? `<span class="ds">${esc(p.description)}</span>` : ''}
        <span class="pr">${pct ? `<s>$${Number(p.price)}</s><span>$${fin}</span><span class="off">${t('خصم ' + pct + '% لأول جلسة', pct + '% off your first session')}</span>` : `<span>$${Number(p.price)}${unit}</span>`}${cvTxt(fin) ? `<span class="cv">${esc(cvTxt(fin))}</span>` : ''}</span></button>`;
    }).join('');
    host.querySelectorAll('.pk-card').forEach(b => b.addEventListener('click', () => {
      if (![...sel.options].some(o => o.value === b.dataset.name)) { const o = document.createElement('option'); o.value = b.dataset.name; o.textContent = b.dataset.name; sel.appendChild(o); }
      sel.value = b.dataset.name; sel.dispatchEvent(new Event('change', { bubbles: true }));
      host.querySelectorAll('.pk-card').forEach(x => { const on = x === b; x.setAttribute('aria-pressed', on); x.setAttribute('aria-checked', on); x.classList.remove('pk-err'); });
    }));
  }
  const UNIT_EN = { 'جلسة واحدة (٤٥ دقيقة)': 'one 45-min session', 'شهرياً — ٤ جلسات': 'per month — 4 sessions', 'شهرياً — ٨ جلسات': 'per month — 8 sessions', 'جلسة عاجلة': 'urgent session' };
  const PKG_EN = { 'استشارة سريعة': 'Quick Consultation', 'باقة الانطلاقة': 'Launch Package', 'باقة المرافقة': 'Companion Package', 'دعم فوري': 'Immediate Support' };
  if (focus) {
    sel.closest('.field').insertAdjacentElement('beforebegin', cardsHost);
    sel.required = false;
    (async () => {
      const r = await supabaseClient.from('packages').select('name, description, price, price_unit, is_recommended, sort_order').order('sort_order', { ascending: true });
      pkgs = (r.data || []).filter(p => p.name !== 'ادعم بوضوح');
      await Promise.all(pkgs.map(async p => { try { const x = await supabaseClient.rpc('check_promo', { p_email: '', p_package: p.name, p_code: '' }); if (x.data) promo[p.name] = x.data; } catch (_) {} }));
      paintCards();
      setInterval(() => { document.querySelectorAll('#pkCards .pk-card').forEach(c => { const on = c.dataset.name === sel.value; if (c.getAttribute('aria-pressed') !== String(on)) { c.setAttribute('aria-pressed', on); c.setAttribute('aria-checked', on); } }); }, 700);
    })();
    // لا نعتمد على required للقائمة المخفية: نتحقق بأنفسنا
    form.addEventListener('submit', (e) => {
      if (!sel.value) { e.preventDefault(); e.stopImmediatePropagation(); const h = document.getElementById('pkCards'); h.classList.add('pk-err'); h.querySelectorAll('.pk-card').forEach(c => c.classList.add('pk-err')); h.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }, true);
  }

  /* ---------- ترتيب أسهل: الباقة ← الموعد ← بياناتك ← الدفع ---------- */
  if (focus) {
    const msgField = document.getElementById('bkMessage').closest('.field');
    ['bkName', 'bkEmail', 'bkPhone'].forEach(id => { const f = document.getElementById(id).closest('.field'); if (f && msgField) msgField.insertAdjacentElement('beforebegin', f); });
  }

  /* ---------- كليك للأردن فقط ---------- */
  const cliqOpt = [...document.querySelectorAll('.pm-opt')].find(l => l.querySelector('input[value="cliq"]'));
  const phone = document.getElementById('bkPhone');
  function jordan() {
    if (window.__clientTz === 'Asia/Amman') return true;
    const p = (phone && phone.value || '').replace(/[\s\-()]/g, '');
    return /^(\+|00)?962/.test(p) || /^07[789]\d{7}$/.test(p);
  }
  function gateCliq() {
    if (!cliqOpt) return;
    const ok = jordan(); cliqOpt.style.display = ok ? '' : 'none';
    if (!ok) { const c = cliqOpt.querySelector('input'); if (c.checked) { const card = document.querySelector('input[name="bkPayMethod"][value="card"]'); if (card) card.checked = true; } }
  }
  gateCliq(); setInterval(gateCliq, 700);
})();
