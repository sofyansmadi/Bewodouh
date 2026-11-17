/* بوضوح — بانر الصفحة الرئيسية المتقلّب (عربي/إنجليزي).
   الشرائح تُدار من لوحة التحكم (جدول hero_slides). إن لم توجد شرائح نشطة تُعرض الشرائح الافتراضية أدناه. */
(function () {
  const host = document.getElementById('heroBanner');
  if (!host) return;
  const EN = document.documentElement.lang === 'en';
  const t = (ar, en) => (EN ? en : ar);
  const BASE = 'https://vhsdhskynuwfloonjfec.supabase.co/rest/v1/';
  const KEY = 'sb_publishable_x9K72kDpiGOXcCG2uNqXJg_I80x7-Mb';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u, dflt) => (u && /^(\/(?!\/)|https:\/\/)/.test(u)) ? u : dflt;

  const DEFAULTS = [
    { image: '/images/hero-session.jpg', eyebrow: t('علاقات · دعم · وعي · علاج', 'Relationships · Support · Awareness · Therapy'),
      title: t('نفهم أنفسنا بوضوح.', 'Understanding ourselves, clearly.'), text: t('جلسات عن بُعد مع أخصائيين، بسرية تامة وبلغتك.', 'Remote sessions with specialists, fully confidential and in your language.'),
      cta: t('احجز استشارتك الأولى', 'Book your first consultation'), url: '#booking' },
    { image: '', eyebrow: t('اكتشف نفسك', 'Know yourself'), title: t('اختبارات نفسية مجانية', 'Free psychological quizzes'),
      text: t('اختبارات علمية قصيرة تساعدك تفهم نمط تعلّقك ومشاعرك وعلاقاتك.', 'Short, science-based quizzes to understand your attachment style, feelings and relationships.'),
      cta: t('جرّب اختباراً', 'Try a quiz'), url: EN ? '/en/quizzes/' : '/quizzes/' },
  ];

  const css = document.createElement('style');
  css.textContent = `
  .sr-only{ position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  .hb{ position:relative; background:var(--ink); color:var(--fog); height:clamp(270px, 33vw, 400px); overflow:hidden; isolation:isolate; }
  .hb-slide{ position:absolute; inset:0; display:flex; align-items:center; opacity:0; visibility:hidden; transition:opacity .7s ease, visibility .7s; }
  .hb-slide.on{ opacity:1; visibility:visible; z-index:1; }
  .hb-bg{ position:absolute; inset:0; background:#241D2E center/cover no-repeat; z-index:-2; }
  .hb-bg.plain{ background:linear-gradient(120deg, #241D2E 0%, #372C46 55%, #5B4A86 100%); }
  .hb-veil{ position:absolute; inset:0; z-index:-1; background:linear-gradient(to left, rgba(26,21,34,.9) 0%, rgba(36,29,46,.7) 45%, rgba(36,29,46,.2) 100%); }
  [dir=ltr] .hb-veil{ background:linear-gradient(to right, rgba(26,21,34,.9) 0%, rgba(36,29,46,.7) 45%, rgba(36,29,46,.2) 100%); }
  .hb-inner{ width:100%; max-width:var(--max, 1080px); margin:0 auto; padding:0 64px; }
  .hb-inner > div{ max-width:560px; }
  .hb-badge{ display:inline-block; background:rgba(201,161,95,.18); color:var(--clarity-soft); border:1px solid rgba(201,161,95,.45); font-size:12.5px; font-weight:700; padding:4px 14px; border-radius:100px; margin-bottom:12px; }
  .hb-title{ font-family:'Noto Kufi Arabic','Inter',sans-serif; font-weight:900; font-size:clamp(24px, 4.2vw, 44px); line-height:1.35; margin:0; color:var(--fog); }
  .hb-text{ margin:10px 0 0; font-size:clamp(14px, 1.7vw, 17px); line-height:1.8; color:rgba(237,231,227,.88); max-width:46ch; }
  .hb-actions{ margin-top:18px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  .hb-code{ display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,.1); border:1.5px dashed var(--clarity-soft); color:var(--fog); border-radius:12px; padding:8px 14px; font:700 14px/1.2 inherit; font-family:inherit; cursor:pointer; }
  .hb-code b{ letter-spacing:.12em; font-size:16px; color:var(--clarity-soft); direction:ltr; }
  .hb-code:hover{ background:rgba(255,255,255,.18); }
  .hb .btn-primary{ padding:11px 26px; font-size:15px; }
  .hb-nav{ position:absolute; top:50%; transform:translateY(-50%); z-index:3; width:40px; height:40px; border-radius:50%; border:1px solid rgba(237,231,227,.35); background:rgba(36,29,46,.45); color:var(--fog); font-size:22px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .hb-nav:hover{ background:rgba(36,29,46,.75); border-color:var(--clarity); }
  .hb-nav.prev{ inset-inline-start:14px; } .hb-nav.next{ inset-inline-end:14px; }
  .hb-dots{ position:absolute; bottom:12px; inset-inline:0; z-index:3; display:flex; gap:8px; justify-content:center; }
  .hb-dots button{ width:9px; height:9px; border-radius:50%; border:none; padding:0; background:rgba(237,231,227,.45); cursor:pointer; }
  .hb-dots button[aria-current="true"]{ background:var(--clarity); width:24px; border-radius:6px; }
  @media (max-width:700px){ .hb{ height:300px; } .hb-inner{ padding:0 20px 18px; } .hb-nav{ display:none; } .hb-veil{ background:linear-gradient(to top, rgba(26,21,34,.92) 0%, rgba(36,29,46,.7) 60%, rgba(36,29,46,.35) 100%) !important; } .hb-text{ -webkit-line-clamp:2; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden; } }
  .intro-strip .wrap{ display:flex; gap:20px 40px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
  .intro-strip p{ max-width:62ch; margin:0; line-height:1.9; color:rgba(237,231,227,.86); font-size:15.5px; }
  .intro-strip .row{ display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
  @media (prefers-reduced-motion: reduce){ .hb-slide{ transition:none; } }
  `;
  document.head.appendChild(css);

  let slides = DEFAULTS, idx = 0, timer = null, started = false;
  const render = () => {
    host.innerHTML = '<h1 class="sr-only">' + t('بوضوح — نفهم أنفسنا بوضوح', 'Bewoduh — Understanding ourselves, clearly') + '</h1>' +
      slides.map((s, i) => `<div class="hb-slide${i === 0 ? ' on' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${slides.length}">
        <div class="hb-bg${s.image ? '' : ' plain'}"${s.image ? ` style="background-image:url('${esc(s.image)}')"` : ''}></div><div class="hb-veil"></div>
        <div class="hb-inner"><div>
          ${s.eyebrow ? `<span class="hb-badge">${esc(s.eyebrow)}</span>` : ''}
          <h2 class="hb-title">${esc(s.title)}</h2>
          ${s.text ? `<p class="hb-text">${esc(s.text)}</p>` : ''}
          <div class="hb-actions">${s.code ? `<button type="button" class="hb-code" data-code="${esc(s.code)}" aria-label="${t('انسخ الكود ', 'Copy code ')}${esc(s.code)}">${t('الكود', 'Code')}: <b>${esc(s.code)}</b> <span class="hb-copy">${t('نسخ', 'Copy')}</span></button>` : ''}
            ${s.cta ? `<a class="btn-primary" href="${esc(s.url)}">${esc(s.cta)}</a>` : ''}</div>
        </div></div></div>`).join('') +
      (slides.length > 1 ? `<button type="button" class="hb-nav prev" aria-label="${t('السابق', 'Previous')}">${EN ? '‹' : '›'}</button><button type="button" class="hb-nav next" aria-label="${t('التالي', 'Next')}">${EN ? '›' : '‹'}</button>
        <div class="hb-dots">${slides.map((_, i) => `<button type="button" aria-label="${t('شريحة ', 'Slide ')}${i + 1}" aria-current="${i === 0}"></button>`).join('')}</div>` : '');
    idx = 0; wire();
  };
  const go = (n) => {
    const els = host.querySelectorAll('.hb-slide'); if (!els.length) return;
    idx = (n + els.length) % els.length;
    els.forEach((e, i) => e.classList.toggle('on', i === idx));
    host.querySelectorAll('.hb-dots button').forEach((b, i) => b.setAttribute('aria-current', String(i === idx)));
  };
  const play = () => { stop(); if (slides.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go(idx + 1), 6500); };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  function wire() {
    const prev = host.querySelector('.prev'), next = host.querySelector('.next');
    if (prev) prev.addEventListener('click', () => { go(idx - 1); play(); });
    if (next) next.addEventListener('click', () => { go(idx + 1); play(); });
    host.querySelectorAll('.hb-dots button').forEach((b, i) => b.addEventListener('click', () => { go(i); play(); }));
    host.querySelectorAll('.hb-code').forEach(b => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.dataset.code); const l = b.querySelector('.hb-copy'); l.textContent = t('تم النسخ ✓', 'Copied ✓'); setTimeout(() => { l.textContent = t('نسخ', 'Copy'); }, 1800); } catch (_) { /* لا شيء */ }
    }));
    host.onmouseenter = stop; host.onmouseleave = play; host.onfocusin = stop; host.onfocusout = play;
    let x0 = null;
    host.ontouchstart = (e) => { x0 = e.touches[0].clientX; stop(); };
    host.ontouchend = (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(idx + ((dx < 0) !== (document.dir === 'rtl' || document.documentElement.dir === 'rtl') ? 1 : -1)); play(); };
    play();
  }
  function start(list) { if (started) return; started = true; slides = list; render(); }

  // ننتظر الشرائح من لوحة التحكم (حتى ٨٠٠ مللي ثانية) ثم نعرض الافتراضية إن لم تصل أو كانت فارغة
  const fallback = setTimeout(() => start(DEFAULTS), 800);
  fetch(BASE + 'hero_slides?select=*&active=eq.true&order=sort_order.asc&limit=8', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then(rows => {
      clearTimeout(fallback);
      const list = (rows || []).map(r => ({
        image: safeUrl(r.image_url, ''), eyebrow: (EN ? r.eyebrow_en || r.eyebrow_ar : r.eyebrow_ar || r.eyebrow_en) || '',
        title: (EN ? r.title_en || r.title_ar : r.title_ar || r.title_en) || '', text: (EN ? r.text_en || r.text_ar : r.text_ar || r.text_en) || '',
        code: r.code || '', cta: (EN ? r.cta_en || r.cta_ar : r.cta_ar || r.cta_en) || '', url: safeUrl(r.cta_url, '#booking'),
      })).filter(s => s.title);
      if (started) { if (list.length) { started = false; start(list); } } else start(list.length ? list : DEFAULTS);
    })
    .catch(() => { clearTimeout(fallback); start(DEFAULTS); });
})();
