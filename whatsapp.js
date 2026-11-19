/* بوضوح — زر واتساب العائم (يُحمَّل من components.js ومن صفحات الحملات). رقم واتساب الرسمي في مكان واحد: غيّره هنا فقط. */
(function () {
  if (window.__bwWa) return; window.__bwWa = 1;
  var NUM = '447832339216', DISPLAY = '+44 7832 339216';
  window.BW_WHATSAPP = { number: NUM, display: DISPLAY };
  try { if (window.top !== window.self) return; } catch (e) { return; }        // لا يظهر داخل الإطارات (نافذة الحجز المضمّنة)
  if (/[?&]embed=1/.test(location.search)) return;
  if (/^\/(admin|specialist-portal|en\/specialist-portal)(\/|$)/.test(location.pathname)) return;
  var EN = /^\/en(\/|$)/.test(location.pathname) || document.documentElement.lang === 'en';
  var text = EN ? 'Hello Bewoduh, I would like to ask about ' : 'مرحباً بوضوح، أودّ الاستفسار عن ';
  var href = 'https://wa.me/' + NUM + '?text=' + encodeURIComponent(text);
  var label = EN ? 'Chat with us on WhatsApp' : 'تواصل معنا عبر واتساب';
  var css = document.createElement('style');
  css.textContent = '.bw-wa{position:fixed;z-index:1500;inset-inline-end:18px;bottom:calc(18px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px;height:56px;min-width:56px;padding:0 17px;border-radius:100px;background:#25D366;color:#fff;text-decoration:none;box-shadow:0 10px 28px -8px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.18);font:700 14px "IBM Plex Sans Arabic","Noto Kufi Arabic",system-ui,sans-serif;transition:transform .18s ease,box-shadow .18s ease;-webkit-tap-highlight-color:transparent}.bw-wa:hover{transform:translateY(-2px);box-shadow:0 14px 32px -8px rgba(0,0,0,.5),0 2px 6px rgba(0,0,0,.2)}.bw-wa:focus-visible{outline:3px solid #fff;outline-offset:2px}.bw-wa svg{width:28px;height:28px;flex:none;fill:#fff}.bw-wa span{max-width:0;overflow:hidden;white-space:nowrap;transition:max-width .25s ease}@media (hover:hover) and (min-width:700px){.bw-wa:hover span,.bw-wa:focus-visible span{max-width:220px}}@media print{.bw-wa{display:none}}@media (prefers-reduced-motion:reduce){.bw-wa,.bw-wa span{transition:none}}';
  document.head.appendChild(css);
  function add() {
    if (document.querySelector('.bw-wa')) return;
    var a = document.createElement('a');
    a.className = 'bw-wa'; a.href = href; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', label); a.setAttribute('data-track', 'whatsapp_float'); a.setAttribute('data-track-loc', 'whatsapp-float');
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg><span>' + (EN ? 'WhatsApp' : 'واتساب') + '</span>';
    document.body.appendChild(a);
  }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
