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

  /* هاي القواعد كانت مكرّرة يدوياً جوا <style> كل صفحة عربية قبل التحويل
     لمكوّنات، ونسيت تُنقل لصفحات /en/ الجديدة — نقلتها هون مرة وحدة نهائية
     حتى تنطبق تلقائياً على أي صفحة (عربي أو إنجليزي، حالية أو مستقبلية)
     بدون ما تحتاج كل صفحة تكرّرها بنفسها. */
  site-nav .brand{ font-family:'Noto Kufi Arabic',sans-serif; font-weight:900; font-size:22px; color:var(--fog); }
  site-nav .brand span{ color:var(--clarity); }
  site-nav .nav-links{ display:flex; align-items:center; gap:30px; }
  site-nav .nav-links a{ color:var(--text-muted-dark); font-size:14px; font-weight:500; transition:color .2s; }
  site-nav .nav-links a:hover{ color:var(--fog); }
  site-nav .nav-links a.active{ color:var(--clarity-soft); }
  site-nav a.nav-cta{
    background:var(--clarity); color:var(--ink); font-weight:700; font-size:14px;
    padding:9px 20px; border-radius:100px; transition:transform .15s ease, background .2s ease;
  }
  site-nav a.nav-cta:hover{ background:var(--clarity-soft); transform:translateY(-1px); }
  /* لازم هاي القاعدة تجي بعد كل قواعد site-nav .nav-links فوق مباشرة —
     نفس الـ selector ونفس الأولوية (specificity)، فالقاعدة الأخيرة بترتيب
     الملف هي يلي بتربح، ولو ضلّت فوق كانت الشاشات الصغيرة بتبين النافبار
     كامل بدل ما تختفي. */
  @media (max-width:780px){ site-nav .nav-links{ display:none; } }

  site-footer[variant="rich"] .footer-grid{ display:grid; grid-template-columns:1.2fr 1fr 1fr 1fr; gap:32px; padding-bottom:36px; border-bottom:1px solid rgba(255,255,255,.08); }
  site-footer[variant="rich"] .footer-brand p{ font-size:14px; margin-top:14px; max-width:32ch; }
  site-footer[variant="rich"] .footer-col h4{ font-size:13px; color:var(--fog); margin-bottom:16px; font-weight:700; }
  site-footer[variant="rich"] .footer-col a{ display:block; font-size:14px; margin-bottom:10px; color:var(--text-muted-dark); transition:.2s; }
  site-footer[variant="rich"] .footer-col a:hover{ color:var(--clarity-soft); }
  site-footer[variant="rich"] .footer-bottom{ padding-top:24px; font-size:12.5px; text-align:center; }
  @media (max-width:780px){ site-footer[variant="rich"] .footer-grid{ grid-template-columns:1fr; gap:28px; } }
`;
const styleTag = document.createElement('style');
styleTag.textContent = STYLE_FIX;
document.head.appendChild(styleTag);

/* أيقونة الشاشة الرئيسية + اسم "Bewoduh" الثابت عند إضافة أي صفحة
   (عربي أو إنجليزي) للشاشة الرئيسية من المتصفح — تُضاف هون مرة
   وحدة بدل تكرارها بكل صفحة */
(function injectHomeScreenTags(){
  const head = document.head;
  const addLink = (rel, href, extra) => {
    const l = document.createElement('link');
    l.rel = rel; l.href = href;
    if (extra) Object.assign(l, extra);
    head.appendChild(l);
  };
  const addMeta = (name, content) => {
    const m = document.createElement('meta');
    m.name = name; m.content = content;
    head.appendChild(m);
  };
  addLink('manifest', '/manifest.json');
  addLink('icon', '/favicon-32.png', { type: 'image/png', sizes: '32x32' });
  addLink('icon', '/favicon-16.png', { type: 'image/png', sizes: '16x16' });
  addLink('icon', '/icon-192.png', { type: 'image/png', sizes: '192x192' });
  addLink('apple-touch-icon', '/apple-touch-icon.png');
  addMeta('theme-color', '#241D2E');
  addMeta('apple-mobile-web-app-title', 'Bewoduh');
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
})();

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
          <a href="https://www.instagram.com/Bewoduh" target="_blank" rel="noopener">${en ? 'Instagram' : 'إنستغرام'}</a>
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

/* ============================================================
   ترجمة عرض الباقات للصفحة الإنجليزية فقط — راجع الملاحظة داخل
   PricingCards.renderCards() لسبب وجود هذا الجدول بدل تخزين
   ترجمة بقاعدة البيانات مباشرة.
   ============================================================ */
const PACKAGE_TRANSLATIONS_EN = {
  'استشارة سريعة': { name: 'Quick Consultation', description: 'One session, ideal if you want to try it out before committing.', price_unit: 'One session (45 minutes)' },
  'باقة الانطلاقة': { name: 'Launch Package', description: 'Four sessions a month, a good start for real follow-up.', price_unit: 'Monthly — 4 sessions' },
  'باقة المرافقة': { name: 'Companion Package', description: 'Eight sessions every 3 months, for deeper follow-up and real impact.', price_unit: 'Every 3 months — 8 sessions' },
  'دعم فوري': { name: 'Immediate Support', description: 'An urgent session within 24 hours, if your situation needs faster action.', price_unit: 'Urgent session' },
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
    const en = isEnglish();
    this.innerHTML = this._packages.map(pkg => {
      const { amount, symbol } = convertPackagePrice(pkg.price, this._currentCurrency);
      // الباقات مخزّنة بالعربي فقط بقاعدة البيانات (name/description/price_unit).
      // على الصفحة الإنجليزية، نعرض ترجمة جاهزة لهذه النصوص فقط للعرض —
      // القيمة الفعلية المُرسَلة مع الحجز (data-pkg-name) تضل بالعربي دائماً،
      // حتى تتطابق مع PACKAGE_PRICES_USD وسجلات لوحة التحكم.
      const t = en ? (PACKAGE_TRANSLATIONS_EN[pkg.name] || {}) : {};
      const displayName = t.name || pkg.name;
      const displayDesc = t.description || pkg.description || '';
      const displayUnit = t.price_unit || pkg.price_unit;
      return `
      <div class="pkg-card${pkg.is_recommended ? ' recommended' : ''}" data-pkg-id="${pkg.id}">
        ${pkg.is_recommended ? `<span class="pkg-badge">${en ? 'Most Popular' : 'الأكثر طلباً'}</span>` : ''}
        <h3>${displayName}</h3>
        <p class="pkg-desc">${displayDesc}</p>
        <div class="pkg-price">${amount} ${symbol} <span>${displayUnit}</span></div>
        <button class="pkg-select-btn" data-pkg-name="${pkg.name}">${en ? 'Choose This Package' : 'اختر هذه الباقة'}</button>
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

/* ============================================================
   زر بوضوح AI العائم — بوب أب محادثة سريع بدون مغادرة الصفحة.
   ------------------------------------------------------------
   يظهر بكل صفحات الموقع (تطبيق + ويب لابتوب + ويب موبايل) ما عدا
   صفحة /ai/ نفسها (لأنها أصلاً المحادثة الكاملة). يفتح نافذة
   محادثة صغيرة فوق الصفحة الحالية، بنفس منطق الاتصال بـEdge
   Function المستخدم بصفحة /ai/ — بدون أي تنقّل لصفحة جديدة، تماماً
   متل نافذة محادثة ماسنجر.
   ============================================================ */
(function initAIWidget(){
  if (window.location.pathname.includes('/ai/')) return;

  const en = isEnglish();
  const WIDGET_ANON_KEY = 'sb_publishable_x9K72kDpiGOXcCG2uNqXJg_I80x7-Mb';
  const AI_ENDPOINT = 'https://vhsdhskynuwfloonjfec.supabase.co/functions/v1/ai-chat';

  const style = document.createElement('style');
  style.textContent = `
    #bwd-ai-btn{
      position:fixed; bottom:24px; inset-inline-end:24px; z-index:300;
      width:58px; height:58px; border-radius:50%; border:none; cursor:pointer;
      background:conic-gradient(from 0deg, #E4C98A, #C9A15F, #8B6F7E, #E4C98A);
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 14px 30px -10px rgba(36,29,46,.5);
      transition:transform .2s ease;
    }
    #bwd-ai-btn:hover{ transform:scale(1.06); }
    #bwd-ai-btn::before{ content:""; position:absolute; inset:2.5px; border-radius:50%; background:#241D2E; }
    #bwd-ai-btn svg{ position:relative; z-index:1; width:24px; height:24px; }
    body.bwd-app-mode #bwd-ai-btn{ bottom:88px; }

    #bwd-ai-panel{
      position:fixed; bottom:92px; inset-inline-end:24px; z-index:300;
      width:min(370px, 92vw); height:min(560px, 74vh);
      background:#F3EEEA; border-radius:20px; overflow:hidden;
      box-shadow:0 30px 70px -20px rgba(36,29,46,.5);
      display:none; flex-direction:column;
      border:1px solid #E6DFDA;
    }
    body.bwd-app-mode #bwd-ai-panel{ bottom:156px; }
    #bwd-ai-panel.open{ display:flex; animation:bwdPanelIn .25s ease; }
    @keyframes bwdPanelIn{ from{ opacity:0; transform:translateY(12px); } to{ opacity:1; transform:translateY(0); } }

    #bwd-ai-head{ background:#241D2E; padding:14px 16px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
    #bwd-ai-head .bwd-brand{ display:flex; align-items:center; gap:10px; }
    #bwd-ai-head .bwd-orb{ width:30px; height:30px; border-radius:50%; position:relative; background:conic-gradient(from 0deg, #E4C98A, #C9A15F, #8B6F7E, #E4C98A); flex-shrink:0; }
    #bwd-ai-head .bwd-orb::before{ content:""; position:absolute; inset:2px; border-radius:50%; background:#241D2E; }
    #bwd-ai-head .bwd-orb svg{ position:relative; z-index:1; width:14px; height:14px; }
    #bwd-ai-head .bwd-title{ color:#F3EEEA; font-family:'Noto Kufi Arabic',sans-serif; font-weight:900; font-size:14.5px; }
    #bwd-ai-head .bwd-sub{ color:#B7ACC4; font-size:10.5px; margin-top:1px; }
    #bwd-ai-close{ background:none; border:none; color:#B7ACC4; cursor:pointer; padding:4px; }
    #bwd-ai-close:hover{ color:#F3EEEA; }
    #bwd-ai-close svg{ width:18px; height:18px; }

    #bwd-ai-msgs{ flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; font-family:'IBM Plex Sans Arabic', sans-serif; }
    .bwd-msg{ display:flex; gap:8px; max-width:88%; }
    .bwd-msg.bot{ align-self:flex-start; }
    .bwd-msg.user{ align-self:flex-end; flex-direction:row-reverse; }
    .bwd-bubble{ padding:10px 13px; border-radius:14px; font-size:13.5px; line-height:1.7; }
    .bwd-msg.bot .bwd-bubble{ background:#fff; border:1px solid #E6DFDA; color:#2A2130; }
    .bwd-msg.user .bwd-bubble{ background:#241D2E; color:#EDE7E3; }
    .bwd-bubble p{ margin:0 0 8px; } .bwd-bubble p:last-child{ margin-bottom:0; }
    .bwd-bubble ul,.bwd-bubble ol{ margin:0 0 8px; padding-inline-start:18px; } .bwd-bubble li{ margin-bottom:4px; }
    .bwd-bubble strong{ color:#241D2E; }
    .bwd-msg.user .bwd-bubble strong{ color:#F3EEEA; }
    .bwd-typing{ display:inline-flex; gap:4px; padding:12px 13px; }
    .bwd-dot{ width:6px; height:6px; border-radius:50%; background:#8B6F7E; opacity:.5; animation:bwdBlink 1.2s infinite; }
    .bwd-dot:nth-child(2){ animation-delay:.2s; } .bwd-dot:nth-child(3){ animation-delay:.4s; }
    @keyframes bwdBlink{ 0%,80%,100%{ opacity:.3; } 40%{ opacity:1; } }

    #bwd-ai-composer{ flex-shrink:0; border-top:1px solid #E6DFDA; background:#F3EEEA; padding:10px 10px 6px; display:flex; gap:8px; align-items:flex-end; }
    #bwd-ai-input{
      flex:1; border:1px solid #E6DFDA; outline:none; resize:none; font-family:inherit; font-size:13.5px;
      background:#fff; border-radius:14px; padding:9px 12px; max-height:80px; line-height:1.5; color:#2A2130;
    }
    #bwd-ai-input:focus{ border-color:#C9A15F; }
    #bwd-ai-send{
      width:36px; height:36px; border-radius:50%; background:#241D2E; border:none; cursor:pointer; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
    }
    #bwd-ai-send:disabled{ opacity:.35; cursor:not-allowed; }
    #bwd-ai-send svg{ width:15px; height:15px; }
    #bwd-ai-disclaimer{ font-size:10px; color:#6B6072; text-align:center; padding:0 12px 10px; background:#F3EEEA; flex-shrink:0; }

    @media (max-width:480px){
      #bwd-ai-panel{ width:94vw; inset-inline-end:3vw; height:min(560px, 78vh); }
      #bwd-ai-btn{ inset-inline-end:18px; bottom:18px; }
      body.bwd-app-mode #bwd-ai-btn{ bottom:84px; }
    }
  `;
  document.head.appendChild(style);

  if (isRunningInApp()) document.body.classList.add('bwd-app-mode');

  const sparkSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#E4C98A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L13.8 9.2 L20 11 L13.8 12.8 L12 19 L10.2 12.8 L4 11 L10.2 9.2 Z"/></svg>';
  const closeSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const sendSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="6 11 12 5 18 11"></polyline></svg>';

  const btn = document.createElement('button');
  btn.id = 'bwd-ai-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', en ? 'Chat with Bewoduh AI' : 'تحدث مع بوضوح AI');
  btn.innerHTML = sparkSVG;
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'bwd-ai-panel';
  panel.innerHTML = `
    <div id="bwd-ai-head">
      <div class="bwd-brand">
        <div class="bwd-orb">${sparkSVG}</div>
        <div>
          <div class="bwd-title">${en ? 'Bewoduh AI' : 'بوضوح AI'}</div>
          <div class="bwd-sub">${en ? 'Relationships & emotions only' : 'متخصص بالعلاقات والمشاعر فقط'}</div>
        </div>
      </div>
      <button id="bwd-ai-close" type="button" aria-label="${en ? 'Close' : 'إغلاق'}">${closeSVG}</button>
    </div>
    <div id="bwd-ai-msgs"></div>
    <div id="bwd-ai-composer">
      <textarea id="bwd-ai-input" rows="1" placeholder="${en ? "Write what you're feeling..." : 'اكتب ما تشعر به...'}"></textarea>
      <button id="bwd-ai-send" type="button" aria-label="${en ? 'Send' : 'إرسال'}">${sendSVG}</button>
    </div>
    <div id="bwd-ai-disclaimer">${en ? 'General support — not a substitute for a licensed professional.' : 'دعم عام، وليس بديلاً عن استشارة مختص مرخّص.'}</div>
  `;
  document.body.appendChild(panel);

  const msgsEl = panel.querySelector('#bwd-ai-msgs');
  const inputEl = panel.querySelector('#bwd-ai-input');
  const sendBtn = panel.querySelector('#bwd-ai-send');
  const closeBtn = panel.querySelector('#bwd-ai-close');

  let history = [];
  let isThinking = false;
  let opened = false;

  function ensureMarked(){
    return new Promise((resolve) => {
      if (typeof window.marked !== 'undefined') { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }

  function renderMarkdown(text){
    return (typeof window.marked !== 'undefined') ? window.marked.parse(text) : text.replace(/\n/g, '<br>');
  }

  function scrollToBottom(){ msgsEl.scrollTop = msgsEl.scrollHeight; }

  function appendMessage(role, text){
    const msg = document.createElement('div');
    msg.className = 'bwd-msg ' + role;
    const bubble = document.createElement('div');
    bubble.className = 'bwd-bubble';
    if (role === 'bot') bubble.innerHTML = renderMarkdown(text);
    else bubble.textContent = text;
    msg.appendChild(bubble);
    msgsEl.appendChild(msg);
    scrollToBottom();
    return bubble;
  }

  function appendTyping(){
    const msg = document.createElement('div');
    msg.className = 'bwd-msg bot';
    msg.id = 'bwdTyping';
    msg.innerHTML = '<div class="bwd-bubble bwd-typing"><span class="bwd-dot"></span><span class="bwd-dot"></span><span class="bwd-dot"></span></div>';
    msgsEl.appendChild(msg);
    scrollToBottom();
  }
  function removeTyping(){ const t = document.getElementById('bwdTyping'); if (t) t.remove(); }

  async function streamAIResponse(userText, historyList, onFirstChunk, onUpdate){
    const body = { message: userText, history: historyList.map(h => ({ role: h.role, text: h.text })) };
    if (en) body.lang = 'en';
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + WIDGET_ANON_KEY },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) throw new Error('bad response');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', fullText = '', startedReply = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop();
      for (const part of parts) {
        const line = part.trim();
        if (!line || !line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const deltaText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!deltaText) continue;
          if (!startedReply) { startedReply = true; onFirstChunk(); }
          fullText += deltaText;
          onUpdate(fullText);
        } catch (e) {}
      }
    }
    if (!fullText) {
      fullText = en ? "Sorry, I couldn't reply right now. Please try again shortly." : 'عذراً، لم أستطع الردّ الآن. حاول مرة أخرى بعد قليل.';
      if (!startedReply) onFirstChunk();
      onUpdate(fullText);
    }
    return fullText;
  }

  function autoResize(){
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
  }

  async function sendMessage(text){
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;
    await ensureMarked();
    appendMessage('user', trimmed);
    inputEl.value = '';
    autoResize();
    isThinking = true;
    sendBtn.disabled = true;
    appendTyping();

    let bubble = null;
    try {
      const fullText = await streamAIResponse(
        trimmed, history,
        () => { removeTyping(); bubble = appendMessage('bot', ''); },
        (accumulated) => { if (bubble) { bubble.innerHTML = renderMarkdown(accumulated); scrollToBottom(); } }
      );
      history.push({ role: 'user', text: trimmed });
      history.push({ role: 'bot', text: fullText });
    } catch (err) {
      removeTyping();
      const errText = en ? 'A connection error occurred. Please check your internet and try again.' : 'حدث خطأ في الاتصال. تأكد من الإنترنت وحاول مرة أخرى.';
      if (bubble) bubble.innerHTML = renderMarkdown(errText);
      else appendMessage('bot', errText);
    }
    isThinking = false;
    sendBtn.disabled = false;
  }

  inputEl.addEventListener('input', autoResize);
  sendBtn.addEventListener('click', () => sendMessage(inputEl.value));
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputEl.value); }
  });

  function openPanel(){
    panel.classList.add('open');
    btn.innerHTML = closeSVG;
    if (!opened) {
      opened = true;
      appendMessage('bot', en
        ? "Hi! I'm Bewoduh AI — ask me anything about your relationships or feelings."
        : 'أهلاً! أنا بوضوح AI — اسألني عن أي شيء يخص علاقاتك أو مشاعرك.');
    }
    inputEl.focus();
  }
  function closePanel(){
    panel.classList.remove('open');
    btn.innerHTML = sparkSVG;
  }
  btn.addEventListener('click', () => {
    if (panel.classList.contains('open')) closePanel(); else openPanel();
  });
  closeBtn.addEventListener('click', closePanel);
})();
