/* بوضوح — تتبّع الحملات الإعلانية.
   ------------------------------------------------------------------
   ما يفعله:
   1) بانر موافقة (قبول / رفض). ما يُحمَّل أي بكسل ولا يُخزَّن أي شيء قبل القبول.
   2) يحمّل البكسلات المُعرَّفة في CFG أدناه: Meta (Facebook/Instagram) · TikTok · Snapchat · Google (GA4 + Ads).
   3) يرسل أحداث الحجز: ViewContent → AddToCart (اختيار موعد) → InitiateCheckout → AddPaymentInfo → Purchase
      + CTA_Click (كل زر حجز/تواصل) + PromoApplied.
      حدث Purchase لا يُرسَل إلا بعد أن تؤكد قاعدة البيانات أن الحجز مدفوع فعلاً (لا يكفي ?paid=1 في الرابط).
   4) يسجّل نسخة مجهولة من الأحداث عندنا (ad_events) ويخزّن مصدر الحجز (utm) داخل صف الحجز نفسه، لتقرير الحملات في لوحة التحكم.

   الخصوصية (مهم — الموقع في مجال الصحة النفسية):
   - يعمل فقط على صفحات الحجز والتسويق (قائمة ALLOW). لا يعمل على المقالات، الاختبارات، الحساب، الجلسات، التقييم، المحادثات، لوحة الأدمن، بوابة الأخصائيين، وتطبيق الموبايل.
   - لا يُرسل أي اسم/بريد/هاتف/نص حرّ ولا نتائج اختبارات لأي منصة إعلانية. فقط: اسم الباقة، السعر، العملة، رقم الحجز كمعرّف إزالة التكرار.
   ------------------------------------------------------------------
   لتفعيل أي منصة: ضع الـ ID في CFG ثم انشر الملف. الفارغ = غير مفعّل. */
(function () {
  'use strict';
  if (window.BWTrack) return;

  var CFG = {
    meta_pixel_id: '',            // مثال: 1234567890123456
    tiktok_pixel_id: '',          // مثال: CABCDEF1234567890
    snap_pixel_id: '',            // مثال: 1a2b3c4d-....
    ga4_id: '',                   // مثال: G-ABCDE12345
    gads_id: '',                  // مثال: AW-1234567890
    gads_purchase_label: '',      // Conversion label لحدث الشراء من Google Ads
    gads_checkout_label: '',      // (اختياري) لحدث بدء الدفع
    currency: 'USD'
  };

  var SUPA = 'https://vhsdhskynuwfloonjfec.supabase.co';
  var KEY = 'sb_publishable_x9K72kDpiGOXcCG2uNqXJg_I80x7-Mb'; // مفتاح publishable العام (نفس supabase-config.js)
  var LANG = (document.documentElement.lang || 'ar').toLowerCase().indexOf('en') === 0 ? 'en' : 'ar';

  // الصفحات المسموح فيها التتبع (بعد حذف /en/ و index.html)
  var ALLOW = ['/', '/b50/', '/sales-page/', '/team/', '/specialist/', '/about/', '/faq/', '/contact/'];
  function normPath() {
    var p = location.pathname.replace(/index\.html$/, '').replace(/^\/en(\/|$)/, '/');
    if (p.charAt(p.length - 1) !== '/') p += '/';
    return p;
  }
  var PATH = normPath();
  var ENABLED = ALLOW.indexOf(PATH) !== -1 && typeof window.Capacitor === 'undefined';

  /* ---------- تخزين آمن ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function jget(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }

  /* ---------- الموافقة ---------- */
  var CONSENT_KEY = 'bw_consent_v1';
  function consent() { var v = lsGet(CONSENT_KEY); return v === 'granted' || v === 'denied' ? v : null; }
  var granted = consent() === 'granted';

  /* ---------- المصدر (UTM) ---------- */
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var CLICK_IDS = ['fbclid', 'ttclid', 'gclid', 'ScCid', 'msclkid'];
  function fromUrl() {
    var q = new URLSearchParams(location.search), o = {}, i, v;
    for (i = 0; i < UTM.length; i++) { v = q.get(UTM[i]); if (v) o[UTM[i]] = v.slice(0, 120); }
    for (i = 0; i < CLICK_IDS.length; i++) { if (q.get(CLICK_IDS[i])) { o.click_id_type = CLICK_IDS[i]; break; } }
    return o;
  }
  function hasAny(o) { for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) return true; } return false; }
  function visitorId() {
    var id = lsGet('bw_vid');
    if (!id || id.length < 8) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      lsSet('bw_vid', id);
    }
    return id;
  }
  function rememberAttribution() {
    var cur = fromUrl(); if (!hasAny(cur)) return;
    var st = jget('bw_attr') || {};
    st.last = cur; if (!st.first) st.first = cur; st.t = Date.now();
    lsSet('bw_attr', JSON.stringify(st));
  }
  // الحالي من الرابط، وإن لم يوجد فآخر مصدر محفوظ (٣٠ يوماً)
  function attribution() {
    var cur = fromUrl(), st = jget('bw_attr');
    if (st && st.t && Date.now() - st.t > 30 * 864e5) { st = null; lsDel('bw_attr'); }
    var a = hasAny(cur) ? cur : ((st && st.last) || {});
    var out = {}, k;
    for (k in a) out[k] = a[k];
    if (st && st.first) { out.first_utm_source = st.first.utm_source; out.first_utm_campaign = st.first.utm_campaign; out.first_utm_content = st.first.utm_content; }
    out.landing_path = location.pathname.slice(0, 200);
    try { if (document.referrer) out.referrer_host = new URL(document.referrer).hostname; } catch (e) {}
    if (granted) out.visitor_id = visitorId();
    return out;
  }

  /* ---------- نسخة مجهولة عندنا ---------- */
  function rpc(fn, body, keepalive) {
    return fetch(SUPA + '/rest/v1/rpc/' + fn, {
      method: 'POST', keepalive: !!keepalive,
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }
  var FIRST_PARTY = { ViewContent: 'view_booking', AddToCart: 'select_slot', InitiateCheckout: 'begin_checkout', AddPaymentInfo: 'add_payment', Purchase: 'purchase', CTA_Click: 'cta_click', PromoApplied: 'promo_applied', Landing: 'landing' };
  function log(name, props) {
    var ev = FIRST_PARTY[name]; if (!granted || !ev) return;
    try { rpc('log_ad_event', { p_visitor: visitorId(), p_event: ev, p_attr: attribution(), p_path: location.pathname.slice(0, 200), p_lang: LANG, p_props: props || null }, true).catch(function () {}); } catch (e) {}
  }

  /* ---------- تحميل البكسلات ---------- */
  var loaded = false;
  function loadPixels() {
    if (loaded) return; loaded = true;
    if (CFG.meta_pixel_id) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', CFG.meta_pixel_id); fbq('track', 'PageView');
    }
    if (CFG.tiktok_pixel_id) {
      !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']; ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; }; for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; }; ttq.load = function (e, n) { var r = 'https://analytics.tiktok.com/i18n/pixel/events.js'; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {}; var s = document.createElement('script'); s.type = 'text/javascript'; s.async = !0; s.src = r + '?sdkid=' + e + '&lib=' + t; var x = document.getElementsByTagName('script')[0]; x.parentNode.insertBefore(s, x); }; ttq.load(CFG.tiktok_pixel_id); ttq.page(); }(window, document, 'ttq');
    }
    if (CFG.snap_pixel_id) {
      (function (e, t, n) { if (e.snaptr) return; var a = e.snaptr = function () { a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments); }; a.queue = []; var s = 'script', r = t.createElement(s); r.async = !0; r.src = n; var u = t.getElementsByTagName(s)[0]; u.parentNode.insertBefore(r, u); })(window, document, 'https://sc-static.net/scevent.min.js');
      snaptr('init', CFG.snap_pixel_id, {}); snaptr('track', 'PAGE_VIEW');
    }
    if (CFG.ga4_id || CFG.gads_id) {
      var first = CFG.ga4_id || CFG.gads_id;
      var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(first); document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
      gtag('js', new Date());
      if (CFG.ga4_id) gtag('config', CFG.ga4_id);
      if (CFG.gads_id) gtag('config', CFG.gads_id);
    }
  }

  /* ---------- إرسال حدث ---------- */
  var META_STD = { ViewContent: 1, AddToCart: 1, InitiateCheckout: 1, AddPaymentInfo: 1, Purchase: 1, Lead: 1, Contact: 1 };
  var TT = { ViewContent: 'ViewContent', AddToCart: 'AddToCart', InitiateCheckout: 'InitiateCheckout', AddPaymentInfo: 'AddPaymentInfo', Purchase: 'CompletePayment', CTA_Click: 'ClickButton', Lead: 'SubmitForm', Contact: 'Contact' };
  var SNAP = { ViewContent: 'VIEW_CONTENT', AddToCart: 'ADD_CART', InitiateCheckout: 'START_CHECKOUT', AddPaymentInfo: 'ADD_BILLING', Purchase: 'PURCHASE', CTA_Click: 'CUSTOM_EVENT_1', Lead: 'SIGN_UP', Contact: 'CUSTOM_EVENT_2' };
  var GA = { ViewContent: 'view_item', AddToCart: 'add_to_cart', InitiateCheckout: 'begin_checkout', AddPaymentInfo: 'add_payment_info', Purchase: 'purchase', CTA_Click: 'cta_click', PromoApplied: 'promo_applied', Lead: 'generate_lead' };
  var ITEM_ID = 'quick-consultation';

  function clean(o) { var r = {}; for (var k in o) { if (o[k] !== undefined && o[k] !== null && o[k] !== '') r[k] = o[k]; } return r; }

  function dispatch(name, d) {
    var val = d.value, cur = d.currency || CFG.currency, eid = d.event_id, nm = d.content_name || 'consultation';
    var hasVal = val !== undefined && val !== null && !isNaN(Number(val));
    // Meta
    if (CFG.meta_pixel_id && window.fbq) {
      var m = clean({ content_name: nm, content_category: 'consultation', content_ids: [ITEM_ID], content_type: 'product', value: hasVal ? Number(val) : undefined, currency: hasVal ? cur : undefined, payment_method: d.payment_method, label: d.label, location: d.location, promo_code: d.promo_code });
      var opt = eid ? { eventID: String(eid) } : undefined;
      if (META_STD[name]) fbq('track', name, m, opt); else fbq('trackCustom', name, m, opt);
    }
    // TikTok
    if (CFG.tiktok_pixel_id && window.ttq) {
      var tp = clean({ content_type: 'product', content_id: ITEM_ID, content_name: nm, value: hasVal ? Number(val) : undefined, currency: hasVal ? cur : undefined, description: d.label });
      var tn = TT[name] || name;
      if (TT[name]) ttq.track(tn, tp, eid ? { event_id: String(eid) } : undefined); else ttq.track(tn, tp);
    }
    // Snapchat
    if (CFG.snap_pixel_id && window.snaptr && SNAP[name]) {
      snaptr('track', SNAP[name], clean({ price: hasVal ? Number(val) : undefined, currency: hasVal ? cur : undefined, item_ids: [ITEM_ID], transaction_id: name === 'Purchase' ? eid : undefined, description: d.label }));
    }
    // Google (GA4 + Ads)
    if (window.gtag && (CFG.ga4_id || CFG.gads_id)) {
      var gp = clean({ currency: hasVal ? cur : undefined, value: hasVal ? Number(val) : undefined, transaction_id: name === 'Purchase' ? eid : undefined, items: [{ item_id: ITEM_ID, item_name: nm, quantity: 1, price: hasVal ? Number(val) : undefined }], label: d.label, location: d.location });
      gtag('event', GA[name] || name, gp);
      if (CFG.gads_id && name === 'Purchase' && CFG.gads_purchase_label) gtag('event', 'conversion', clean({ send_to: CFG.gads_id + '/' + CFG.gads_purchase_label, value: hasVal ? Number(val) : undefined, currency: cur, transaction_id: eid }));
      if (CFG.gads_id && name === 'InitiateCheckout' && CFG.gads_checkout_label) gtag('event', 'conversion', clean({ send_to: CFG.gads_id + '/' + CFG.gads_checkout_label, value: hasVal ? Number(val) : undefined, currency: cur }));
    }
    log(name, clean({ value: hasVal ? Number(val) : undefined, package: d.content_name, label: d.label, location: d.location, method: d.payment_method }));
  }

  var queue = [];
  function track(name, data) {
    if (!ENABLED) return;
    data = data || {};
    if (!granted) { if (consent() === null && queue.length < 40) queue.push([name, data]); return; }
    dispatch(name, data);
  }
  function flush() { var q = queue; queue = []; for (var i = 0; i < q.length; i++) dispatch(q[i][0], q[i][1]); }

  /* ---------- بدء التتبع بعد الموافقة ---------- */
  var started = false;
  function start() {
    if (started || !ENABLED || !granted) return; started = true;
    rememberAttribution();
    loadPixels();
    // زيارة الصفحة (مرة بالجلسة لكل مسار) — للتقرير الداخلي
    var k = 'bw_land_' + PATH;
    if (!ssGet(k)) { ssSet(k, '1'); log('Landing', { path: PATH }); }
    flush();
    paidReturn();
  }

  /* ---------- أزرار الحجز والتواصل ---------- */
  function sameOrigin(a) { try { return a.origin === location.origin; } catch (e) { return false; } }
  function isCta(el) {
    if (el.hasAttribute('data-track')) return true;
    var h = el.getAttribute('href') || '';
    return /\/sales-page\/|\/b50\/|wa\.me\/|api\.whatsapp\.com|^tel:|^mailto:/.test(h);
  }
  function locOf(el) {
    var s = el.closest('[data-track-loc],header,nav,footer,section,[id]');
    return (s && (s.getAttribute('data-track-loc') || s.id || s.tagName.toLowerCase())) || 'page';
  }
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest('a,button') : null;
    if (!el) return;
    // مرّر مصدر الحملة إلى الروابط الداخلية (بدون تخزين) حتى لو لم توافق على الكوكيز
    if (el.tagName === 'A' && el.href && sameOrigin(el)) {
      var cur = fromUrl(), has = hasAny(cur);
      if (has) {
        try {
          var u = new URL(el.href), changed = false;
          for (var k in cur) { if (k !== 'click_id_type' && !u.searchParams.has(k)) { u.searchParams.set(k, cur[k]); changed = true; } }
          if (changed) el.href = u.toString();
        } catch (e) {}
      }
    }
    if (!ENABLED || !isCta(el)) return;
    var label = (el.getAttribute('data-track') || (el.textContent || '').replace(/\s+/g, ' ').trim()).slice(0, 60);
    track('CTA_Click', { label: label, location: locOf(el) });
  }, true);

  /* ---------- مسار الحجز ---------- */
  function setBookingAttribution(bookingId) {
    if (!granted || !bookingId) return;
    try { rpc('set_booking_attribution', { p_booking: bookingId, p_attr: attribution() }, true).catch(function () {}); } catch (e) {}
  }
  // يُستدعى بعد إنشاء الحجز مباشرة (قبل الذهاب للدفع)
  function beginCheckout(info) {
    info = info || {};
    setBookingAttribution(info.id);
    if (granted && info.id && info.method !== 'cliq') lsSet('bw_pending', JSON.stringify({ id: info.id, t: Date.now() }));
    track('InitiateCheckout', { value: info.value, content_name: info.name, event_id: info.id, promo_code: info.promo });
  }
  // بعد العودة من Stripe: لا نرسل Purchase إلا لو قاعدة البيانات تقول إن الحجز مدفوع
  var polling = false;
  function paidReturn() {
    if (polling || PATH !== '/sales-page/') return;
    if (new URLSearchParams(location.search).get('paid') !== '1') return;
    var p = jget('bw_pending'); if (!p || !p.id || lsGet('bw_done_' + p.id) || Date.now() - p.t > 3 * 864e5) return;
    polling = true; var tries = 0;
    (function poll() {
      tries++;
      rpc('booking_paid_status', { p_booking: p.id }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (d && d.paid === true) {
          lsSet('bw_done_' + p.id, '1'); lsDel('bw_pending');
          dispatch('Purchase', { value: Number(d.final_usd), currency: 'USD', content_name: d.package, event_id: p.id, promo_code: d.promo_code, payment_method: d.payment_method || 'card' });
        } else if (tries < 24) setTimeout(poll, 2500);
      }).catch(function () { if (tries < 24) setTimeout(poll, 3000); });
    })();
  }

  /* ---------- بانر الموافقة ---------- */
  var T = LANG === 'en'
    ? { msg: 'We use cookies and similar tools to measure our ads and improve the site. Nothing is sent to advertising platforms unless you accept.', ok: 'Accept', no: 'Decline', more: 'Privacy Policy', link: '/en/privacy/' }
    : { msg: 'نستخدم ملفات تعريف الارتباط وأدوات مشابهة لقياس إعلاناتنا وتحسين الموقع. لا يُرسل أي شيء لمنصات الإعلان إلا بموافقتك.', ok: 'موافق', no: 'رفض', more: 'سياسة الخصوصية', link: '/privacy/' };
  var banner = null;
  function closeBanner() { if (banner && banner.parentNode) banner.parentNode.removeChild(banner); banner = null; }
  function decide(v) {
    lsSet(CONSENT_KEY, v); granted = v === 'granted'; closeBanner();
    if (granted) start(); else { queue = []; if (CFG.meta_pixel_id && window.fbq) { try { fbq('consent', 'revoke'); } catch (e) {} } }
  }
  function openConsent() {
    if (banner) return;
    var css = document.createElement('style');
    css.textContent = '#bwConsent{position:fixed;z-index:2147483000;inset-inline:12px;bottom:12px;max-width:560px;margin-inline:auto;background:#241D2E;color:#F3EEEA;border:1px solid rgba(228,201,138,.35);border-radius:16px;padding:16px 18px;box-shadow:0 18px 50px -12px rgba(0,0,0,.55);font:14px/1.7 "IBM Plex Sans Arabic",system-ui,sans-serif}#bwConsent p{margin:0 0 12px}#bwConsent a{color:#E4C98A;text-decoration:underline}#bwConsent .r{display:flex;gap:10px;flex-wrap:wrap}#bwConsent button{flex:1;min-width:110px;border-radius:100px;padding:10px 18px;font:700 14px "Noto Kufi Arabic","IBM Plex Sans Arabic",system-ui,sans-serif;cursor:pointer;border:1.5px solid #C9A15F}#bwConsent .y{background:#C9A15F;color:#241D2E}#bwConsent .n{background:transparent;color:#F3EEEA}';
    banner = document.createElement('div'); banner.id = 'bwConsent'; banner.setAttribute('role', 'dialog'); banner.setAttribute('aria-label', LANG === 'en' ? 'Cookies' : 'ملفات تعريف الارتباط');
    banner.dir = LANG === 'en' ? 'ltr' : 'rtl';
    var p = document.createElement('p'); p.appendChild(document.createTextNode(T.msg + ' '));
    var a = document.createElement('a'); a.href = T.link; a.textContent = T.more; p.appendChild(a);
    var row = document.createElement('div'); row.className = 'r';
    var y = document.createElement('button'); y.type = 'button'; y.className = 'y'; y.textContent = T.ok; y.addEventListener('click', function () { decide('granted'); });
    var n = document.createElement('button'); n.type = 'button'; n.className = 'n'; n.textContent = T.no; n.addEventListener('click', function () { decide('denied'); });
    row.appendChild(y); row.appendChild(n); banner.appendChild(css); banner.appendChild(p); banner.appendChild(row);
    document.body.appendChild(banner);
  }
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-bw-consent]') : null;
    if (el) { e.preventDefault(); openConsent(); }
  });

  window.BWTrack = {
    config: CFG, enabled: ENABLED, consent: consent,
    track: track, beginCheckout: beginCheckout, setBookingAttribution: setBookingAttribution,
    attribution: attribution, openConsent: openConsent
  };

  function init() {
    if (!ENABLED) return;
    if (granted) start(); else if (consent() === null) openConsent();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
