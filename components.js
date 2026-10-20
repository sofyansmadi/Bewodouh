/* ============================================================
   بوضوح — Web Components مشتركة (nav + footer).
   ------------------------------------------------------------
   هذا الملف يُعرّف عنصرين مخصّصين (Custom Elements) أصليين في
   المتصفح، بدون أي مكتبة أو أداة بناء (build tool):

     <site-nav active="blog"></site-nav>
     <site-footer></site-footer>
     <site-footer variant="rich"></site-footer>   (تستخدم في index.html فقط)

   لماذا Web Components وليس مجرد تضمين HTML (fetch)؟
   - المحتوى يُبنى مباشرة داخل الصفحة نفسها (Light DOM)، فما في
     تأخير تحميل أو "ومضة" قبل ظهور الهيدر/الفوتر.
   - كل صفحة تستخدم وسم HTML واحد بسيط بدل عشرات الأسطر المكررة.
   - لاحقاً، لما نربط قاعدة بيانات حقيقية (Supabase مثلاً)، هذا
     بالضبط المكان اللي بيسهل فيه ربط بيانات حيّة.

   ملاحظة مهمة: بما إنه <site-nav> و<site-footer> وسمان جديدان
   (مش <nav> و<footer> الحقيقيان)، أي قاعدة CSS بكل صفحة كانت
   مكتوبة كـ nav{...} أو footer{...} أو nav .wrap{...} ما عادت
   تنطبق تلقائياً (لأنها تطلب وسم <nav>/<footer> فعلي). لهذا،
   الأسطر بالأسفل (STYLE_FIX) تُدرج مرة واحدة نفس هذه القواعد
   لكن موجّهة للوسمين الجديدين، حتى تبقى الخلفية الغامقة وتموضع
   الروابط أفقياً كما كانت بالضبط قبل التحويل لمكوّنات.
   ============================================================ */

/* ============================================================
   isRunningInApp() و appHref() — بما إنه Capacitor ما بيفهم
   تلقائياً إنه رابط زي "/blog/" لازم يفتح "index.html" اللي جواه
   (عكس متصفح الويب العادي وGitHub Pages اللي يعرفان هذا تلقائياً)،
   بيرجع افتراضياً للصفحة الرئيسية كحل احتياطي. الحل: أي رابط
   داخلي نولّده بمكوّناتنا يمرّ عبر appHref() أولاً، فيصير:
   - على الموقع بالمتصفح: يبقى "/blog/" كما هو (روابط نظيفة).
   - جوا التطبيق: يتحول تلقائياً لـ "/blog/index.html" صراحة.
   ============================================================ */
const isRunningInApp = () => typeof window.Capacitor !== 'undefined';
function appHref(path){
  if (!isRunningInApp()) return path;
  const [base, fragment] = path.split('#');
  const frag = fragment ? '#' + fragment : '';
  if (base === '/' || base === '') return '/index.html' + frag;
  if (base.endsWith('/')) return base + 'index.html' + frag;
  return base + frag;
}

/* لغة الصفحة: الصفحات الإنجليزية (<html lang="en">) تستخدم نفس المكوّنات لكن
   بنصوص إنجليزية وروابط تبدأ بـ /en، حتى لا تظهر القائمة العلوية والفوتر بالعربي. */
const IS_EN = (document.documentElement.lang || '').toLowerCase().startsWith('en');
const t = (ar, en) => (IS_EN ? en : ar);
const lp = (path) => (IS_EN ? '/en' + path : path);

const STYLE_FIX = `
  site-nav{ display:block; position:sticky; top:0; z-index:50; background:rgba(36,29,46,.92); backdrop-filter:blur(8px); border-bottom:1px solid rgba(255,255,255,.06); }
  site-nav .wrap{ display:flex; align-items:center; justify-content:space-between; padding:16px 24px; max-width:1080px; }
  site-footer{ display:block; background:var(--ink); color:var(--text-muted-dark); padding:44px 0 28px; text-align:center; font-size:12.5px; }
  site-footer .brand{ display:block; margin-bottom:10px; font-size:18px; }
  site-footer[variant="rich"]{ padding:56px 0 32px; text-align:initial; }
  .nav-account-icon{ width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1.5px solid rgba(255,255,255,.15); color:#B7ACC4; transition:.2s; flex-shrink:0; }
  .nav-account-icon svg{ width:16px; height:16px; }
  .nav-account-icon:hover{ border-color:#C9A15F; color:#F3EEEA; }
  site-nav .nav-actions{ display:flex; align-items:center; gap:16px; }
  site-nav .brand{ font-family:'Noto Kufi Arabic','IBM Plex Sans',sans-serif; font-weight:900; font-size:22px; color:#F3EEEA; text-decoration:none; }
  site-nav .brand span{ color:#C9A15F; }
  site-nav .nav-links{ display:flex; align-items:center; gap:28px; }
  site-nav .nav-links a{ color:#B7ACC4; font-size:14px; font-weight:500; text-decoration:none; transition:color .2s; }
  site-nav .nav-links a:hover, site-nav .nav-links a.active{ color:#F3EEEA; }
  site-nav .nav-links a.nav-cta{ background:#C9A15F; color:#241D2E; font-weight:700; padding:9px 20px; border-radius:100px; transition:.2s; }
  site-nav .nav-links a.nav-cta:hover{ background:#E4C98A; color:#241D2E; }
  site-nav .lang-switch{ border:1.5px solid rgba(255,255,255,.18); color:#B7ACC4; border-radius:100px; padding:5px 13px; font-size:12.5px; font-weight:700; text-decoration:none; transition:.2s; line-height:1.6; flex-shrink:0; }
  site-nav .lang-switch:hover{ border-color:#C9A15F; color:#F3EEEA; }
  @media (max-width:780px){ site-nav .nav-links{ display:none; } }
`;
const styleTag = document.createElement('style');
styleTag.textContent = STYLE_FIX;
document.head.appendChild(styleTag);

class SiteNav extends HTMLElement {
  connectedCallback() {
    if (isRunningInApp()) {
      this.style.paddingTop = 'max(20px, env(safe-area-inset-top))';
    }
    const active = this.getAttribute('active') || '';
    const links = [
      { href: '/#pillars', label: t('المواضيع', 'Topics'), key: '' },
      { href: '/blog/', label: t('المدونة', 'Blog'), key: 'blog' },
      { href: '/quizzes/', label: t('الاختبارات', 'Quizzes'), key: 'quizzes' },
      { href: '/about/', label: t('من نحن', 'About'), key: 'about' },
    ];
    if (!IS_EN) links.push({ href: '/join/', label: 'انضم إلينا', key: 'join' });

    const linksHtml = links.map(l => {
      const cls = l.key && l.key === active ? ' class="active"' : '';
      return `<a href="${appHref(lp(l.href))}"${cls}>${l.label}</a>`;
    }).join('\n      ');

    const accountIconHtml = isRunningInApp() ? '' : `
        <a href="${appHref(lp('/signup/'))}" class="nav-account-icon" id="navAccountIcon" aria-label="${t('حسابي', 'My account')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
        </a>`;

    // زر تبديل اللغة: يفتح نفس الصفحة بالنسخة الأخرى (وإذا لم تكن موجودة يرجع للرئيسية)
    const counterpart = (() => {
      const { pathname, search, hash } = window.location;
      const p = IS_EN ? pathname.replace(/^\/en(\/|$)/, '/') : '/en' + pathname;
      return p + search + hash;
    })();
    const langSwitchHtml = isRunningInApp() ? '' : `
        <a href="${counterpart}" class="lang-switch" id="langSwitch" lang="${IS_EN ? 'ar' : 'en'}" hreflang="${IS_EN ? 'ar' : 'en'}" aria-label="${IS_EN ? 'التبديل إلى العربية' : 'Switch to English'}">${IS_EN ? 'عربي' : 'EN'}</a>`;

    this.innerHTML = `
    <div class="wrap">
      <a href="${appHref(lp('/'))}" class="brand">${t('بوضوح', 'Bewoduh')}<span>.</span></a>
      <div class="nav-actions">
        <div class="nav-links">
          ${linksHtml}
          <a href="${appHref(lp('/sales-page/'))}" class="nav-cta">${t('احجز استشارة', 'Book a Consultation')}</a>
        </div>
        ${langSwitchHtml}
        ${accountIconHtml}
      </div>
    </div>`;

    const langLink = document.getElementById('langSwitch');
    if (langLink) {
      fetch(counterpart, { method: 'HEAD' }).then(r => { if (!r.ok) langLink.href = IS_EN ? '/' : '/en/'; }).catch(() => {});
    }

    // لو الزائر مسجّل دخول أصلاً، وجّهي الأيقونة لصفحة حسابه بدل صفحة التسجيل
    if (!isRunningInApp() && typeof supabaseClient !== 'undefined' && supabaseClient) {
      supabaseClient.auth.getSession().then(({ data }) => {
        if (data.session) {
          const icon = document.getElementById('navAccountIcon');
          if (icon) icon.href = appHref(lp('/account/'));
        }
      });
    }
  }
}

class SiteFooter extends HTMLElement {
  // سطر بيانات الشركة المالكة (بلغة الصفحة)
  companyLine() {
    const text = IS_EN
      ? 'Bewoduh is operated by LAMSA LTD, a company registered in England and Wales (Company No. 17517932). Registered office: 128 City Road, London, EC1V 2NX, United Kingdom.'
      : 'بوضوح منصة تابعة لشركة لمسة المحدودة، المسجلة في إنجلترا وويلز برقم 17517932. العنوان المسجل: 128 سيتي رود، لندن، <bdi dir="ltr">EC1V 2NX</bdi>، المملكة المتحدة.';
    return `<p class="footer-company" style="margin-top:10px; font-size:11.5px; opacity:.8;">${text}</p>`;
  }

  connectedCallback() {
    const variant = this.getAttribute('variant') || 'simple';
    const h = (path) => appHref(lp(path)); // اختصار محلي: يضيف /en للصفحات الإنجليزية
    const brand = t('بوضوح', 'Bewoduh');
    const blurb = t(
      'محتوى توعوي حول العلاقات وأنماط الشخصية، باللغة العربية، لكل من يريد أن يرى علاقته بوضوح أكبر.',
      'Educational content about relationships and personality patterns, for anyone who wants to see their relationships more clearly.'
    );

    if (variant === 'rich') {
      this.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div class="footer-brand">
          <span class="brand kufi" style="font-size:20px;">${brand}<span style="color:var(--clarity);">.</span></span>
          <p>${blurb}</p>
        </div>
        <div class="footer-col">
          <h4>${t('الموقع', 'Site')}</h4>
          <a href="${h('/#pillars')}">${t('المواضيع', 'Topics')}</a>
          <a href="${h('/blog/')}">${t('المدونة', 'Blog')}</a>
          <a href="${h('/quizzes/')}">${t('الاختبارات', 'Quizzes')}</a>
          <a href="${h('/about/')}">${t('من نحن', 'About')}</a>
          <a href="${h('/team/')}">${t('فريق بوضوح', 'Our Team')}</a>
          ${IS_EN ? '' : `<a href="${h('/join/')}">انضم إلينا</a>`}
          <a href="${h('/faq/')}">${t('الأسئلة الأكثر شيوعاً', 'FAQ')}</a>
          ${IS_EN ? '' : `<a href="${h('/daily-exercises/')}">تمارين يومية</a>`}
          <a href="${h('/sales-page/')}">${t('احجز استشارة', 'Book a Consultation')}</a>
        </div>
        <div class="footer-col">
          <h4>${t('تواصل', 'Connect')}</h4>
          <a href="https://instagram.com" target="_blank" rel="noopener">${t('إنستغرام', 'Instagram')}</a>
          <a href="https://tiktok.com" target="_blank" rel="noopener">${t('تيك توك', 'TikTok')}</a>
          <a href="${h('/contact/')}">${t('راسلنا', 'Contact us')}</a>
        </div>
        <div class="footer-col">
          <h4>${t('قانوني', 'Legal')}</h4>
          <a href="${h('/terms/')}">${t('شروط الاستخدام', 'Terms of Use')}</a>
          <a href="${h('/privacy/')}">${t('سياسة الخصوصية', 'Privacy Policy')}</a>
        </div>
      </div>
      <p class="footer-bottom">${t(
        '©Bewodouh 2026 بوضوح — كل المحتوى توعوي وليس بديلاً عن استشارة أو علاج نفسي مختص.',
        '©Bewoduh 2026 — All content is educational and is not a substitute for consultation or treatment by a mental health professional.'
      )}</p>
      ${this.companyLine()}
    </div>`;
      return;
    }

    const linkStyle = 'style="color:var(--text-muted-dark);"';
    this.innerHTML = `
    <div class="wrap">
      <span class="brand kufi">${brand}<span style="color:var(--clarity);">.</span></span>
      ${blurb}
      <div style="margin-top:18px; display:flex; gap:20px; justify-content:center; flex-wrap:wrap; font-size:12.5px;">
        <a href="${h('/')}" ${linkStyle}>${t('الرئيسية', 'Home')}</a>
        <a href="${h('/blog/')}" ${linkStyle}>${t('المدونة', 'Blog')}</a>
        <a href="${h('/quizzes/')}" ${linkStyle}>${t('الاختبارات', 'Quizzes')}</a>
        <a href="${h('/about/')}" ${linkStyle}>${t('من نحن', 'About')}</a>
        <a href="${h('/team/')}" ${linkStyle}>${t('فريق بوضوح', 'Our Team')}</a>
        ${IS_EN ? '' : `<a href="${h('/join/')}" ${linkStyle}>انضم إلينا</a>`}
        <a href="${h('/faq/')}" ${linkStyle}>${t('الأسئلة الأكثر شيوعاً', 'FAQ')}</a>
        ${IS_EN ? '' : `<a href="${h('/daily-exercises/')}" ${linkStyle}>تمارين يومية</a>`}
        <a href="${h('/sales-page/')}" ${linkStyle}>${t('احجز استشارة', 'Book a Consultation')}</a>
        <a href="${h('/terms/')}" ${linkStyle}>${t('شروط الاستخدام', 'Terms of Use')}</a>
        <a href="${h('/privacy/')}" ${linkStyle}>${t('سياسة الخصوصية', 'Privacy Policy')}</a>
      </div>
      ${this.companyLine()}
    </div>`;
  }
}

customElements.define('site-nav', SiteNav);
customElements.define('site-footer', SiteFooter);

/* ============================================================
   <pricing-cards> — يجلب الباقات مباشرة من جدول packages على
   Supabase ويعرضها. يتطلب أن يكون supabase-config.js قد حمّل
   قبل هذا الملف (يوفّر متغيّر supabaseClient).

   يُطلق حدث 'package-selected' على window عند الضغط على "اختر
   هذه الباقة"، وتفاصيله { name } — أي كود بالصفحة يقدر يستمع له
   بدل ما يحتاج يعرف تفاصيل هذا المكوّن الداخلية.

   ويستمع لحدث 'recommend-package' على window (تفاصيله { name })
   عشان يعلّم بصرياً الباقة الموصى فيها من تدفّق الأسئلة.

   ويستمع أيضاً لحدث 'currency-changed' (تفاصيله { code }) اللي
   يُطلقه مبدّل العملة بصفحة الحجز، ويحوّل الأسعار المعروضة فعلياً
   من الدولار (المخزّن بقاعدة البيانات) للعملة المختارة.

   أسعار الصرف: الدينار الأردني، الريال السعودي، والدرهم الإماراتي
   مربوطة رسمياً بسعر ثابت مقابل الدولار (تقريباً لا يتغيّر)، لذا
   قيمها هنا دقيقة وموثوقة. الجنيه المصري عملة عائمة وسعرها يتغيّر
   فعلياً بمرور الوقت — القيمة هنا تقريبية ويجب تحديثها يدوياً بين
   فترة وأخرى لتبقى واقعية.
   ============================================================ */
const CURRENCY_CONFIG = {
  USD: { rate: 1,       decimals: 0, format: v => `$${v}` },
  JOD: { rate: 0.709,   decimals: 2, format: v => `${v} د.أ` },
  SAR: { rate: 3.75,    decimals: 0, format: v => `${v} ر.س` },
  AED: { rate: 3.6725,  decimals: 0, format: v => `${v} د.إ` },
  EGP: { rate: 49,      decimals: 0, format: v => `${v} ج.م` }, // تقريبي — عملة عائمة، يحتاج تحديث دوري
};

// الباقات مخزّنة بالعربي بقاعدة البيانات، فنعرض ترجمة إنجليزية للصفحات الإنجليزية فقط
// (القيمة الفعلية data-pkg-name تبقى بالعربي لتتطابق مع قاعدة البيانات والحجوزات)
const PKG_EN = {
  'استشارة سريعة': { name: 'Quick Consultation', desc: 'A single session, suitable if you want to try before committing.', unit: 'Single session (45 min)' },
  'باقة الانطلاقة': { name: 'Launch Package', desc: 'Four sessions a month, a good start for real follow-up.', unit: 'Monthly — 4 sessions' },
  'باقة المرافقة': { name: 'Companion Package', desc: 'Eight sessions a month, for deeper follow-up and real impact.', unit: 'Monthly — 8 sessions' },
  'دعم فوري': { name: 'Immediate Support', desc: 'An urgent session within 24 hours, if the situation needs faster action.', unit: 'Urgent session' },
  'ادعم بوضوح': { name: 'Support Bewoduh', desc: 'Support the company to keep providing content.', unit: '$1 to support Bewoduh' },
};
const CURRENCY_CODE_EN = { JOD: 'JOD', SAR: 'SAR', AED: 'AED', EGP: 'EGP' };

class PricingCards extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = `<p style="text-align:center; color:var(--text-muted-light); grid-column:1/-1;">${t('جارٍ تحميل الباقات...', 'Loading packages...')}</p>`;
    this._currency = this._currency || 'USD';

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
      this.innerHTML = `<p style="text-align:center; color:var(--alert); grid-column:1/-1;">${t('تعذّر تحميل الباقات — لم يتم إعداد الاتصال بقاعدة البيانات بعد.', 'Could not load packages.')}</p>`;
      return;
    }

    const { data, error } = await supabaseClient
      .from('packages')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data || !data.length) {
      this.innerHTML = `<p style="text-align:center; color:var(--alert); grid-column:1/-1;">${t('تعذّر تحميل الباقات حالياً. حاول تحديث الصفحة.', 'Could not load packages right now. Please refresh the page.')}</p>`;
      console.error('pricing-cards:', error);
      return;
    }

    this._data = data;
    this.renderCards();

    window.addEventListener('recommend-package', (e) => this.markChosen(e.detail.name));
    window.addEventListener('currency-changed', (e) => {
      this._currency = e.detail.code;
      this.renderCards();
    });
  }

  renderCards() {
    const cfg = CURRENCY_CONFIG[this._currency] || CURRENCY_CONFIG.USD;

    this.innerHTML = this._data.map(pkg => {
      const converted = (Number(pkg.price) * cfg.rate).toFixed(cfg.decimals);
      const en = IS_EN ? PKG_EN[pkg.name] : null;
      const priceText = IS_EN && CURRENCY_CODE_EN[this._currency] ? `${converted} ${CURRENCY_CODE_EN[this._currency]}` : cfg.format(converted);
      return `
      <div class="pkg-card${pkg.is_recommended ? ' recommended' : ''}" data-pkg-id="${pkg.id}">
        ${pkg.is_recommended ? `<span class="pkg-badge">${t('الأكثر طلباً', 'Most requested')}</span>` : ''}
        <h3>${en ? en.name : pkg.name}</h3>
        <p class="pkg-desc">${en ? en.desc : (pkg.description || '')}</p>
        <div class="pkg-price">${priceText} <span>${en ? en.unit : pkg.price_unit}</span></div>
        <button class="pkg-select-btn${pkg.name === this._chosenName ? ' chosen' : ''}" data-pkg-name="${pkg.name}">${t('اختر هذه الباقة', 'Choose this package')}</button>
      </div>
    `;
    }).join('');

    this.querySelectorAll('.pkg-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.markChosen(btn.dataset.pkgName);
        window.dispatchEvent(new CustomEvent('package-selected', { detail: { name: btn.dataset.pkgName } }));
      });
    });
  }

  markChosen(name) {
    this._chosenName = name;
    this.querySelectorAll('.pkg-select-btn').forEach(b => {
      b.classList.toggle('chosen', b.dataset.pkgName === name);
    });
  }
}
customElements.define('pricing-cards', PricingCards);

/* ============================================================
   <dynamic-articles> — يُضاف داخل شبكة المقالات بصفحة المدونة
   (#blogGrid). يجلب أي مقالات أُضيفت من لوحة التحكم (admin.html)
   عبر جدول articles على Supabase، ويضيفها كبطاقات إضافية بنفس
   شكل البطاقات الثابتة الموجودة أصلاً — دون المساس بالمقالات
   العشرين الأصلية (تلك تبقى ملفات ثابتة منفصلة، تُدار بواسطة
   الروبوت الآلي GitHub Action، لا بهذا المكوّن).

   يحتاج display:contents حتى تصبح البطاقات التي يولّدها أبناءً
   مباشرين فعلياً لصندوق الشبكة (CSS Grid) رغم وجود هذا الوسم
   بينها وبين .blog-grid.
   ============================================================ */
const dynStyle = document.createElement('style');
dynStyle.textContent = `dynamic-articles{ display:contents; }`;
document.head.appendChild(dynStyle);

class DynamicArticles extends HTMLElement {
  async connectedCallback() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

    const { data, error } = await supabaseClient
      .from('articles')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error || !data || !data.length) return;

    this.innerHTML = data.map(art => `
      <a href="${appHref('/' + art.slug + '/')}" class="article-card" data-cat="${art.filter_key}">
        <div class="card-visual"><img src="${art.hero_image_url}" alt="${art.hero_image_alt}" loading="lazy"></div>
        <div class="card-body">
          <span class="card-tag">${art.tag_label}</span>
          <h3>${art.title}</h3>
          <p>${art.meta_description}</p>
          <span class="card-meta">قراءة ${art.read_time}</span>
        </div>
      </a>
    `).join('');

    // Add a filter button for any category not already present on the page
    // (e.g. blog.html's static filter-bar), so new categories added purely
    // via the admin panel become filterable without editing blog.html by hand.
    const filterRow = document.getElementById('filterRow');
    if (filterRow) {
      const existingKeys = new Set(
        Array.from(filterRow.querySelectorAll('.filter-btn')).map(b => b.dataset.filter)
      );
      const seenNew = new Set();
      data.forEach(art => {
        if (!existingKeys.has(art.filter_key) && !seenNew.has(art.filter_key)) {
          seenNew.add(art.filter_key);
          const btn = document.createElement('button');
          btn.className = 'filter-btn';
          btn.dataset.filter = art.filter_key;
          btn.textContent = art.tag_label;
          filterRow.appendChild(btn);
        }
      });
    }

    window.dispatchEvent(new CustomEvent('dynamic-articles-loaded'));
  }
}
customElements.define('dynamic-articles', DynamicArticles);

/* ============================================================
   <app-bottom-nav> — شريط تنقل سفلي بأيقونات، يظهر فقط لما
   الموقع يشتغل جوا التطبيق (Capacitor)، لا بالمتصفح العادي.

   الاكتشاف: Capacitor يضيف تلقائياً window.Capacitor لما يشتغل
   جوا تطبيق حقيقي. لو مش موجود، معناها إحنا بمتصفح عادي، وهاد
   الشريط ما بيظهر إطلاقاً — الموقع يبقى بشكله المعتاد بالويب.

   يُضاف بكل صفحة زي: <app-bottom-nav active="home"></app-bottom-nav>
   ============================================================ */

class AppBottomNav extends HTMLElement {
  connectedCallback() {
    if (!isRunningInApp()) {
      this.style.display = 'none';
      return;
    }

    const active = this.getAttribute('active') || '';
    const items = [
      { key: 'home', href: lp('/'), label: t('الرئيسية', 'Home'),
        icon: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>' },
      { key: 'blog', href: lp('/blog/'), label: t('المدونة', 'Blog'),
        icon: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h4"/>' },
      { key: 'quizzes', href: lp('/quizzes/'), label: t('الاختبارات', 'Quizzes'),
        icon: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>' },
      { key: 'account', href: lp('/account/'), label: t('حسابي', 'Account'),
        icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' },
    ];

    const itemsHtml = items.map(item => `
      <a href="${appHref(item.href)}" class="app-nav-item${item.key === active ? ' active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
        <span>${item.label}</span>
      </a>`).join('');

    this.innerHTML = itemsHtml;

    // Add bottom padding to the page so content isn't hidden behind the fixed bar
    document.body.style.paddingBottom = '76px';
  }
}

const APP_NAV_STYLE = `
  app-bottom-nav{
    position:fixed; bottom:0; right:0; left:0; z-index:100;
    display:flex; justify-content:space-around; align-items:center;
    background:#fff; border-top:1px solid #E6DFDA;
    padding:10px 6px calc(10px + env(safe-area-inset-bottom));
  }
  .app-nav-item{
    display:flex; flex-direction:column; align-items:center; gap:4px;
    color:#6B6072; text-decoration:none; font-size:10.5px; font-family:'IBM Plex Sans Arabic', sans-serif;
    flex:1; padding:4px 0;
  }
  .app-nav-item svg{ width:22px; height:22px; }
  .app-nav-item.active{ color:#241D2E; }
  .app-nav-item.active svg{ color:#C9A15F; }
`;
const appNavStyleTag = document.createElement('style');
appNavStyleTag.textContent = APP_NAV_STYLE;
document.head.appendChild(appNavStyleTag);

customElements.define('app-bottom-nav', AppBottomNav);

/* ============================================================
   إصلاح شامل لكل الروابط الثابتة بالصفحة (مكتوبة يدوياً بملفات
   HTML، مش مولّدة من هذا الملف) — زي بطاقات المقالات، بطاقات
   الاختبارات، أزرار "احجز استشارة" جوا المقالات، إلخ. appHref()
   بالأعلى بتغطي بس الروابط اللي هذا الملف نفسه يولّدها، لكن
   معظم روابط الموقع مكتوبة مباشرة داخل كل صفحة HTML. هذا الكود
   يفحص كل وسم <a> بالصفحة أول ما تحمّل جوا التطبيق فقط، ويضيف
   index.html تلقائياً لأي رابط داخلي بالشكل "/شيء/" أو "/".
   ============================================================ */
if (isRunningInApp()) {
  document.querySelectorAll('a[href^="/"]').forEach(a => {
    const original = a.getAttribute('href');
    if (!original || original.startsWith('//')) return; // تجاهل روابط خارجية بروتوكول نسبي
    if (original.includes('index.html')) return; // مصلّح أصلاً
    const [base, fragment] = original.split('#');
    const frag = fragment ? '#' + fragment : '';
    if (base === '/' || base.endsWith('/')) {
      const fixed = (base === '/' ? '/index.html' : base + 'index.html') + frag;
      a.setAttribute('href', fixed);
    }
  });
}
