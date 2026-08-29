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

const STYLE_FIX = `
  site-nav{ display:block; position:sticky; top:0; z-index:50; background:rgba(36,29,46,.92); backdrop-filter:blur(8px); border-bottom:1px solid rgba(255,255,255,.06); }
  site-nav .wrap{ display:flex; align-items:center; justify-content:space-between; padding:16px 24px; max-width:1080px; }
  site-footer{ display:block; background:var(--ink); color:var(--text-muted-dark); padding:44px 0 28px; text-align:center; font-size:12.5px; }
  site-footer .brand{ display:block; margin-bottom:10px; font-size:18px; }
  site-footer[variant="rich"]{ padding:56px 0 32px; text-align:initial; }
`;
const styleTag = document.createElement('style');
styleTag.textContent = STYLE_FIX;
document.head.appendChild(styleTag);

class SiteNav extends HTMLElement {
  connectedCallback() {
    const active = this.getAttribute('active') || '';
    const links = [
      { href: '/#pillars', label: 'المواضيع', key: '' },
      { href: '/blog/', label: 'المدونة', key: 'blog' },
      { href: '/quizzes/', label: 'الاختبارات', key: 'quizzes' },
      { href: '/ai/', label: 'بوضوح AI', key: 'ai' },
      { href: '/about/', label: 'من نحن', key: 'about' },
    ];

    const linksHtml = links.map(l => {
      const cls = l.key && l.key === active ? ' class="active"' : '';
      return `<a href="${appHref(l.href)}"${cls}>${l.label}</a>`;
    }).join('\n      ');

    this.innerHTML = `
    <div class="wrap">
      <a href="${appHref('/')}" class="brand">بوضوح<span>.</span></a>
      <div class="nav-links">
        ${linksHtml}
        <a href="${appHref('/sales-page/')}" class="nav-cta">احجز استشارة</a>
      </div>
    </div>`;
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback() {
    const variant = this.getAttribute('variant') || 'simple';
    const h = appHref; // اختصار محلي

    if (variant === 'rich') {
      this.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div class="footer-brand">
          <span class="brand kufi" style="font-size:20px;">بوضوح<span style="color:var(--clarity);">.</span></span>
          <p>محتوى توعوي حول العلاقات وأنماط الشخصية، باللغة العربية، لكل من يريد أن يرى علاقته بوضوح أكبر.</p>
        </div>
        <div class="footer-col">
          <h4>الموقع</h4>
          <a href="${h('/#pillars')}">المواضيع</a>
          <a href="${h('/blog/')}">المدونة</a>
          <a href="${h('/ai/')}">بوضوح AI</a>
          <a href="${h('/quizzes/')}">الاختبارات</a>
          <a href="${h('/about/')}">من نحن</a>
          <a href="${h('/sales-page/')}">احجز استشارة</a>
        </div>
        <div class="footer-col">
          <h4>تواصل</h4>
          <a href="https://instagram.com" target="_blank" rel="noopener">إنستغرام</a>
          <a href="https://tiktok.com" target="_blank" rel="noopener">تيك توك</a>
          <a href="${h('/contact/')}">راسلنا</a>
        </div>
        <div class="footer-col">
          <h4>قانوني</h4>
          <a href="${h('/terms/')}">شروط الاستخدام</a>
          <a href="${h('/privacy/')}">سياسة الخصوصية</a>
        </div>
      </div>
      <p class="footer-bottom">©Bewodouh 2026 بوضوح — كل المحتوى توعوي وليس بديلاً عن استشارة أو علاج نفسي مختص.</p>
    </div>`;
      return;
    }

    this.innerHTML = `
    <div class="wrap">
      <span class="brand kufi">بوضوح<span style="color:var(--clarity);">.</span></span>
      محتوى توعوي حول العلاقات وأنماط الشخصية، باللغة العربية، لكل من يريد أن يرى علاقته بوضوح أكبر.
      <div style="margin-top:18px; display:flex; gap:20px; justify-content:center; flex-wrap:wrap; font-size:12.5px;">
        <a href="${h('/')}" style="color:var(--text-muted-dark);">الرئيسية</a>
        <a href="${h('/blog/')}" style="color:var(--text-muted-dark);">المدونة</a>
        <a href="${h('/quizzes/')}" style="color:var(--text-muted-dark);">الاختبارات</a>
        <a href="${h('/ai/')}" style="color:var(--text-muted-dark);">بوضوح AI</a>
        <a href="${h('/about/')}" style="color:var(--text-muted-dark);">من نحن</a>
        <a href="${h('/sales-page/')}" style="color:var(--text-muted-dark);">احجز استشارة</a>
        <a href="${h('/terms/')}" style="color:var(--text-muted-dark);">شروط الاستخدام</a>
        <a href="${h('/privacy/')}" style="color:var(--text-muted-dark);">سياسة الخصوصية</a>
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
class PricingCards extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = '<p style="text-align:center; color:var(--text-muted-light); grid-column:1/-1;">جارٍ تحميل الباقات...</p>';

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

    this.innerHTML = data.map(pkg => `
      <div class="pkg-card${pkg.is_recommended ? ' recommended' : ''}" data-pkg-id="${pkg.id}">
        ${pkg.is_recommended ? '<span class="pkg-badge">الأكثر طلباً</span>' : ''}
        <h3>${pkg.name}</h3>
        <p class="pkg-desc">${pkg.description || ''}</p>
        <div class="pkg-price">${pkg.price} د.أ <span>${pkg.price_unit}</span></div>
        <button class="pkg-select-btn" data-pkg-name="${pkg.name}">اختر هذه الباقة</button>
      </div>
    `).join('');

    this.querySelectorAll('.pkg-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.markChosen(btn.dataset.pkgName);
        window.dispatchEvent(new CustomEvent('package-selected', { detail: { name: btn.dataset.pkgName } }));
      });
    });

    window.addEventListener('recommend-package', (e) => this.markChosen(e.detail.name));
  }

  markChosen(name) {
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
      { key: 'home', href: '/', label: 'الرئيسية',
        icon: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>' },
      { key: 'blog', href: '/blog/', label: 'المدونة',
        icon: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h4"/>' },
      { key: 'quizzes', href: '/quizzes/', label: 'الاختبارات',
        icon: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>' },
      { key: 'ai', href: '/ai/', label: 'بوضوح AI',
        icon: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8 15c1 1.2 2.4 2 4 2s3-.8 4-2"/>' },
      { key: 'account', href: '/account/', label: 'حسابي',
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
