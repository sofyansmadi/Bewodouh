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
     بالضبط المكان الذي يسهل فيه ربط بيانات حيّة.

   ملاحظة مهمة: بما أنّ <site-nav> و<site-footer> وسمان جديدان
   (لا <nav> و<footer> الحقيقيان)، أي قاعدة CSS بكل صفحة كانت
   مكتوبة كـ nav{...} أو footer{...} أو nav .wrap{...} ما عادت
   تنطبق تلقائياً (لأنها تطلب وسم <nav>/<footer> فعلي). لهذا،
   الأسطر بالأسفل (STYLE_FIX) تُدرج مرة واحدة نفس هذه القواعد
   لكن موجّهة للوسمين الجديدين، حتى تبقى الخلفية الغامقة وتموضع
   الروابط أفقياً كما كانت بالضبط قبل التحويل لمكوّنات.
   ============================================================ */

/* ============================================================
   isRunningInApp() و appHref() — بما أنّ Capacitor لا يفهم
   تلقائياً أنّ رابطاً مثل "/blog/" يجب أن يفتح "index.html"
   الموجود بداخله (عكس متصفح الويب العادي وGitHub Pages اللذين
   يعرفان هذا تلقائياً)، يرجع افتراضياً إلى الصفحة الرئيسية كحل
   احتياطي. الحل: أي رابط داخلي نولّده بمكوّناتنا يمرّ عبر
   appHref() أولاً، فيصير:
   - على الموقع بالمتصفح: يبقى "/blog/" كما هو (روابط نظيفة).
   - داخل التطبيق: يتحول تلقائياً إلى "/blog/index.html" صراحة.
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

/* ============================================================
   دعم اللغتين — بما إنه هذا الملف مشترك بين النسخة العربية
   والإنجليزية (بدل ما يتكرر لكل لغة)، isEnglish() بتكتشف اللغة
   من <html lang="..">، و localizedHref() بتحوّل أي رابط عربي
   داخلي (زي "/blog/") لمكافئه الإنجليزي ("/en/blog/") تلقائياً.

   langToggleHref() خاصة بزر التبديل نفسه: من صفحة إنجليزية بترجع
   لنفس الصفحة بالعربي، ومن صفحة عربية بترجع لمكافئها الإنجليزي —
   إلا إذا الصفحة الحالية لسا ما تُرجمت (TRANSLATED_ROUTES)، وقتها
   بترجع للصفحة الرئيسية الإنجليزية بدل رابط مكسور.
   ============================================================ */
const isEnglish = () => document.documentElement.lang === 'en';
const TRANSLATED_ROUTES = ['/', '/quizzes/', '/blog/', '/about/', '/contact/', '/faq/', '/terms/', '/privacy/', '/signup/', '/account/', '/sales-page/', '/team/', '/ai/'];

function localizedHref(arPath){
  return isEnglish() ? '/en' + arPath : arPath;
}
function langToggleHref(){
  const path = window.location.pathname;
  if (isEnglish()) return path.replace(/^\/en/, '') || '/';
  const target = TRANSLATED_ROUTES.includes(path) ? path : '/';
  return '/en' + target;
}

const STYLE_FIX = `
  site-nav{ display:block; position:sticky; top:0; z-index:50; background:rgba(36,29,46,.92); backdrop-filter:blur(8px); border-bottom:1px solid rgba(255,255,255,.06); }
  site-nav .wrap{ display:flex; align-items:center; justify-content:space-between; padding:16px 24px; max-width:1080px; }
  site-footer{ display:block; background:var(--ink); color:var(--text-muted-dark); padding:44px 0 28px; text-align:center; font-size:12.5px; }
  site-footer .brand{ display:block; margin-bottom:10px; font-size:18px; }
  site-footer[variant="rich"]{ padding:56px 0 32px; text-align:initial; }
  .nav-account-icon{ width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1.5px solid rgba(255,255,255,.15); color:#B7ACC4; transition:.2s; flex-shrink:0; }
  .nav-account-icon svg{ width:16px; height:16px; }
  .nav-account-icon:hover{ border-color:#C9A15F; color:#F3EEEA; }
  .nav-lang-toggle{ font-size:12px; font-weight:700; color:#B7ACC4; border:1.5px solid rgba(255,255,255,.15); border-radius:100px; padding:6px 12px; transition:.2s; flex-shrink:0; }
  .nav-lang-toggle:hover{ border-color:#C9A15F; color:#F3EEEA; }
  site-nav .nav-actions{ display:flex; align-items:center; gap:16px; }
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
    const en = isEnglish();
    const h = (p) => appHref(localizedHref(p));

    const links = en ? [
      { href: '/#pillars', label: 'Topics', key: '' },
      { href: '/blog/', label: 'Blog', key: 'blog' },
      { href: '/quizzes/', label: 'Quizzes', key: 'quizzes' },
      { href: '/ai/', label: 'Bewoduh AI', key: 'ai' },
      { href: '/about/', label: 'About', key: 'about' },
    ] : [
      { href: '/#pillars', label: 'المواضيع', key: '' },
      { href: '/blog/', label: 'المدونة', key: 'blog' },
      { href: '/quizzes/', label: 'الاختبارات', key: 'quizzes' },
      { href: '/ai/', label: 'بوضوح AI', key: 'ai' },
      { href: '/about/', label: 'من نحن', key: 'about' },
    ];

    const linksHtml = links.map(l => {
      const cls = l.key && l.key === active ? ' class="active"' : '';
      return `<a href="${h(l.href)}"${cls}>${l.label}</a>`;
    }).join('\n      ');

    const accountIconHtml = isRunningInApp() ? '' : `
        <a href="${h('/signup/')}" class="nav-account-icon" id="navAccountIcon" aria-label="${en ? 'My Account' : 'حسابي'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
        </a>`;

    const langToggleHtml = `<a href="${appHref(langToggleHref())}" class="nav-lang-toggle" aria-label="${en ? 'Switch to Arabic' : 'Switch to English'}">${en ? 'AR' : 'EN'}</a>`;

    this.innerHTML = `
    <div class="wrap">
      <a href="${h('/')}" class="brand">${en ? 'Bewoduh' : 'بوضوح'}<span>.</span></a>
      <div class="nav-actions">
        <div class="nav-links">
          ${linksHtml}
          <a href="${h('/sales-page/')}" class="nav-cta">${en ? 'Book a Consultation' : 'احجز استشارة'}</a>
        </div>
        ${langToggleHtml}
        ${accountIconHtml}
      </div>
    </div>`;

    // لو الزائر مسجّل دخول أصلاً، وجّهي الأيقونة لصفحة حسابه بدل صفحة التسجيل
    if (!isRunningInApp() && typeof supabaseClient !== 'undefined' && supabaseClient) {
      supabaseClient.auth.getSession().then(({ data }) => {
        if (data.session) {
          const icon = document.getElementById('navAccountIcon');
          if (icon) icon.href = h('/account/');
        }
      });
    }
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback() {
    const variant = this.getAttribute('variant') || 'simple';
    const en = isEnglish();
    const h = (p) => appHref(localizedHref(p));
    const brandName = en ? 'Bewoduh' : 'بوضوح';
    const tagline = en
      ? 'Educational content about relationships and personality patterns, for anyone who wants to see their relationship more clearly.'
      : 'محتوى توعوي حول العلاقات وأنماط الشخصية، باللغة العربية، لكل من يريد أن يرى علاقته بوضوح أكبر.';

    if (variant === 'rich') {
      this.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div class="footer-brand">
          <span class="brand kufi" style="font-size:20px;">${brandName}<span style="color:var(--clarity);">.</span></span>
          <p>${tagline}</p>
        </div>
        <div class="footer-col">
          <h4>${en ? 'Site' : 'الموقع'}</h4>
          <a href="${h('/#pillars')}">${en ? 'Topics' : 'المواضيع'}</a>
          <a href="${h('/blog/')}">${en ? 'Blog' : 'المدونة'}</a>
          <a href="${h('/ai/')}">${en ? 'Bewoduh AI' : 'بوضوح AI'}</a>
          <a href="${h('/quizzes/')}">${en ? 'Quizzes' : 'الاختبارات'}</a>
          <a href="${h('/about/')}">${en ? 'About' : 'من نحن'}</a>
          <a href="${h('/team/')}">${en ? 'Our Team' : 'فريق بوضوح'}</a>
          <a href="${h('/faq/')}">${en ? 'FAQ' : 'الأسئلة الأكثر شيوعاً'}</a>
          <a href="${h('/sales-page/')}">${en ? 'Book a Consultation' : 'احجز استشارة'}</a>
        </div>
        <div class="footer-col">
          <h4>${en ? 'Contact' : 'تواصل'}</h4>
          <a href="https://instagram.com" target="_blank" rel="noopener">${en ? 'Instagram' : 'إنستغرام'}</a>
          <a href="https://tiktok.com" target="_blank" rel="noopener">${en ? 'TikTok' : 'تيك توك'}</a>
          <a href="${h('/contact/')}">${en ? 'Contact Us' : 'راسلنا'}</a>
        </div>
        <div class="footer-col">
          <h4>${en ? 'Legal' : 'قانوني'}</h4>
          <a href="${h('/terms/')}">${en ? 'Terms of Use' : 'شروط الاستخدام'}</a>
          <a href="${h('/privacy/')}">${en ? 'Privacy Policy' : 'سياسة الخصوصية'}</a>
        </div>
      </div>
      <p class="footer-bottom">${en ? '©Bewoduh 2026 — All content is educational and is not a substitute for professional psychological consultation or treatment.' : '©Bewodouh 2026 بوضوح — كل المحتوى توعوي وليس بديلاً عن استشارة أو علاج نفسي مختص.'}</p>
    </div>`;
      return;
    }

    this.innerHTML = `
    <div class="wrap">
      <span class="brand kufi">${brandName}<span style="color:var(--clarity);">.</span></span>
      ${tagline}
      <div style="margin-top:18px; display:flex; gap:20px; justify-content:center; flex-wrap:wrap; font-size:12.5px;">
        <a href="${h('/')}" style="color:var(--text-muted-dark);">${en ? 'Home' : 'الرئيسية'}</a>
        <a href="${h('/blog/')}" style="color:var(--text-muted-dark);">${en ? 'Blog' : 'المدونة'}</a>
        <a href="${h('/quizzes/')}" style="color:var(--text-muted-dark);">${en ? 'Quizzes' : 'الاختبارات'}</a>
        <a href="${h('/ai/')}" style="color:var(--text-muted-dark);">${en ? 'Bewoduh AI' : 'بوضوح AI'}</a>
        <a href="${h('/about/')}" style="color:var(--text-muted-dark);">${en ? 'About' : 'من نحن'}</a>
        <a href="${h('/team/')}" style="color:var(--text-muted-dark);">${en ? 'Our Team' : 'فريق بوضوح'}</a>
        <a href="${h('/faq/')}" style="color:var(--text-muted-dark);">${en ? 'FAQ' : 'الأسئلة الأكثر شيوعاً'}</a>
        <a href="${h('/sales-page/')}" style="color:var(--text-muted-dark);">${en ? 'Book a Consultation' : 'احجز استشارة'}</a>
        <a href="${h('/terms/')}" style="color:var(--text-muted-dark);">${en ? 'Terms of Use' : 'شروط الاستخدام'}</a>
        <a href="${h('/privacy/')}" style="color:var(--text-muted-dark);">${en ? 'Privacy Policy' : 'سياسة الخصوصية'}</a>
      </div>
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
   ============================================================ */
/* ============================================================
   أسعار صرف تقريبية أمام الدولار (العملة الأساسية بقاعدة البيانات).
   تحويل تقديري لعرض الأسعار فقط، وليس سعر صرف حي — يحتاج تحديث
   يدوي بين فترة وأخرى إذا تغيّر سعر الصرف الحقيقي بشكل ملحوظ.
   ============================================================ */
const CURRENCY_RATES = {
  USD: { rate: 1, symbol: '$' },
  JOD: { rate: 0.71, symbol: 'د.أ' },
  SAR: { rate: 3.75, symbol: 'ر.س' },
  AED: { rate: 3.67, symbol: 'د.إ' },
  EGP: { rate: 49, symbol: 'ج.م' },
};

function convertPackagePrice(usdPrice, currencyCode) {
  const currency = CURRENCY_RATES[currencyCode] || CURRENCY_RATES.USD;
  const converted = Number(usdPrice) * currency.rate;
  const amount = currencyCode === 'USD' ? converted : Math.round(converted);
  return { amount, symbol: currency.symbol };
}

class PricingCards extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = '<p style="text-align:center; color:var(--text-muted-light); grid-column:1/-1;">جارٍ تحميل الباقات...</p>';

    this._currentCurrency = 'USD';
    this._chosenName = null;
    window.addEventListener('currency-changed', (e) => {
      this._currentCurrency = e.detail.code;
      if (this._packages) this.renderCards();
    });

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
      this.innerHTML = '<p style="text-align:center; color:var(--alert); grid-column:1/-1;">تعذّر تحميل الباقات — لم يتم إعداد الاتصال بقاعدة البيانات بعد.</p>';
      return;
    }

    const { data, error } = await supabaseClient
      .from('packages')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data || !data.length) {
      this.innerHTML = '<p style="text-align:center; color:var(--alert); grid-column:1/-1;">تعذّر تحميل الباقات حالياً. حاول تحديث الصفحة.</p>';
      console.error('pricing-cards:', error);
      return;
    }

    this._packages = data;
    this.renderCards();
    window.addEventListener('recommend-package', (e) => this.markChosen(e.detail.name));
  }

  renderCards() {
    this.innerHTML = this._packages.map(pkg => {
      const { amount, symbol } = convertPackagePrice(pkg.price, this._currentCurrency);
      return `
      <div class="pkg-card${pkg.is_recommended ? ' recommended' : ''}" data-pkg-id="${pkg.id}">
        ${pkg.is_recommended ? '<span class="pkg-badge">الأكثر طلباً</span>' : ''}
        <h3>${pkg.name}</h3>
        <p class="pkg-desc">${pkg.description || ''}</p>
        <div class="pkg-price">${amount} ${symbol} <span>${pkg.price_unit}</span></div>
        <button class="pkg-select-btn" data-pkg-name="${pkg.name}">اختر هذه الباقة</button>
      </div>
    `;
    }).join('');

    this.querySelectorAll('.pkg-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.markChosen(btn.dataset.pkgName);
        window.dispatchEvent(new CustomEvent('package-selected', { detail: { name: btn.dataset.pkgName } }));
      });
    });

    if (this._chosenName) this.markChosen(this._chosenName);
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
   <app-bottom-nav> — شريط تنقل سفلي بأيقونات، يظهر فقط عندما
   يعمل الموقع داخل التطبيق (Capacitor)، لا في المتصفح العادي.

   الاكتشاف: يضيف Capacitor تلقائياً window.Capacitor عندما يعمل
   داخل تطبيق حقيقي. إذا لم يكن موجوداً، فهذا يعني أننا في متصفح
   عادي، وهذا الشريط لا يظهر إطلاقاً — يبقى الموقع بشكله المعتاد
   على الويب.

   يُضاف بكل صفحة زي: <app-bottom-nav active="home"></app-bottom-nav>
   ============================================================ */

class AppBottomNav extends HTMLElement {
  connectedCallback() {
    if (!isRunningInApp()) {
      this.style.display = 'none';
      return;
    }

    const active = this.getAttribute('active') || '';
    const en = isEnglish();
    const items = [
      { key: 'home', href: '/', label: en ? 'Home' : 'الرئيسية',
        icon: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>' },
      { key: 'blog', href: '/blog/', label: en ? 'Blog' : 'المدونة',
        icon: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h4"/>' },
      { key: 'quizzes', href: '/quizzes/', label: en ? 'Quizzes' : 'الاختبارات',
        icon: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>' },
      { key: 'ai', href: '/ai/', label: en ? 'Bewoduh AI' : 'بوضوح AI',
        icon: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8 15c1 1.2 2.4 2 4 2s3-.8 4-2"/>' },
      { key: 'account', href: '/account/', label: en ? 'Account' : 'حسابي',
        icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' },
    ];

    const itemsHtml = items.map(item => `
      <a href="${appHref(localizedHref(item.href))}" class="app-nav-item${item.key === active ? ' active' : ''}">
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
   إصلاح شامل لكل الروابط الثابتة في الصفحة (مكتوبة يدوياً في
   ملفات HTML، لا مولَّدة من هذا الملف) — مثل بطاقات المقالات،
   بطاقات الاختبارات، أزرار "احجز استشارة" داخل المقالات، إلخ.
   appHref() أعلاه تغطي فقط الروابط التي يولّدها هذا الملف نفسه،
   لكن معظم روابط الموقع مكتوبة مباشرة داخل كل صفحة HTML. هذا
   الكود يفحص كل وسم <a> في الصفحة فور تحميلها داخل التطبيق فقط،
   ويضيف index.html تلقائياً لأي رابط داخلي بالشكل "/شيء/" أو "/".
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
