/* نسيت كلمة السر: نافذة صغيرة تُستخدم في صفحة تسجيل الدخول وبوابة الأخصائيين.
   openPasswordReset({ lang: 'ar' | 'en', email: '...', onDone: (email) => {} })
   تتصل بدالة password-reset (رمز من ٦ أرقام يصل بالبريد ثم كلمة سر جديدة). تعتمد على supabaseClient. */
(function () {
  function texts(en) {
    return en ? {
      title: 'Reset your password', email: 'Email', send: 'Send me a code', sending: 'Sending...',
      sentTo: 'If this email has an account, we sent a 6-digit code to it. It is valid for 15 minutes.',
      code: '6-digit code', pw: 'New password', pw2: 'Confirm new password', hint: 'At least 8 characters, with a letter and a number.',
      change: 'Change password', changing: 'Saving...', resend: 'Send a new code', close: 'Close',
      done: 'Your password was changed. You can sign in now.',
      badCode: 'The code is wrong or expired. Check it, or ask for a new code.', weak: 'The password must be at least 8 characters with a letter and a number.',
      mismatch: 'The two passwords do not match.', badEmail: 'Enter a valid email address.', fail: 'Something went wrong. Please try again.',
    } : {
      title: 'استعادة كلمة السر', email: 'البريد الإلكتروني', send: 'أرسل لي رمزاً', sending: 'جارٍ الإرسال...',
      sentTo: 'إن كان لهذا البريد حساب عندنا فقد أرسلنا إليه رمزاً من ٦ أرقام، وهو صالح لمدة ١٥ دقيقة.',
      code: 'الرمز (٦ أرقام)', pw: 'كلمة سر جديدة', pw2: 'تأكيد كلمة السر الجديدة', hint: '٨ أحرف على الأقل، وتضم حرفاً ورقماً.',
      change: 'تغيير كلمة السر', changing: 'جارٍ الحفظ...', resend: 'أرسل رمزاً جديداً', close: 'إغلاق',
      done: 'تم تغيير كلمة السر. يمكنك تسجيل الدخول الآن.',
      badCode: 'الرمز غير صحيح أو منتهي. تأكد منه أو اطلب رمزاً جديداً.', weak: 'كلمة السر لازم تكون ٨ أحرف على الأقل وتضم حرفاً ورقماً.',
      mismatch: 'كلمتا السر غير متطابقتين.', badEmail: 'اكتب بريداً إلكترونياً صحيحاً.', fail: 'حدث خطأ. حاول مرة أخرى.',
    };
  }

  window.openPasswordReset = function (opts) {
    opts = opts || {};
    const en = opts.lang === 'en', T = texts(en), sb = (typeof supabaseClient !== 'undefined') ? supabaseClient : null;
    const el = (tag, css, txt) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (txt) e.textContent = txt; return e; };
    const inputCss = 'width:100%;border:1.5px solid #E6DFDA;border-radius:12px;padding:11px 14px;font-family:inherit;font-size:15px;background:#F3EEEA;color:#2A2130;margin-top:6px;';
    const btnCss = 'background:#241D2E;color:#F3EEEA;font-weight:700;font-size:14.5px;padding:12px 24px;border:none;border-radius:100px;cursor:pointer;font-family:inherit;width:100%;margin-top:14px;';
    const linkBtnCss = 'background:none;border:none;color:#7D5F27;text-decoration:underline;font-weight:600;cursor:pointer;font-family:inherit;font-size:13px;margin-top:12px;';

    const overlay = el('div', 'position:fixed;inset:0;background:rgba(36,29,46,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;');
    const card = el('div', 'background:#fff;border-radius:18px;max-width:420px;width:100%;padding:26px 24px;max-height:92vh;overflow:auto;font-family:inherit;color:#2A2130;line-height:1.7;');
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.dir = en ? 'ltr' : 'rtl';
    overlay.appendChild(card);
    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const head = (txt) => { card.replaceChildren(el('h2', 'font-size:20px;margin:0 0 14px;', txt || T.title)); };
    const msg = el('div', 'font-size:13px;min-height:18px;margin-top:10px;');
    const say = (text, ok) => { msg.textContent = text || ''; msg.style.color = ok ? '#2E6B45' : '#B5555B'; };
    const field = (label, type, extra) => {
      const wrap = el('div', 'margin-bottom:12px;'); const l = el('label', 'font-weight:700;font-size:13.5px;', label);
      const i = el('input', inputCss); i.type = type; if (extra) Object.assign(i, extra); l.appendChild(i); wrap.appendChild(l); return { wrap, input: i };
    };

    let email = (opts.email || '').trim();

    function stepEmail() {
      head();
      const f = field(T.email, 'email', { autocomplete: 'email', value: email }); f.input.style.direction = 'ltr'; f.input.style.textAlign = 'left';
      const go = el('button', btnCss, T.send); go.type = 'button';
      go.addEventListener('click', async () => {
        const v = f.input.value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { say(T.badEmail); return; }
        go.disabled = true; go.textContent = T.sending; say('');
        const { error } = await sb.functions.invoke('password-reset', { body: { action: 'request', email: v, lang: en ? 'en' : 'ar' } });
        go.disabled = false; go.textContent = T.send;
        if (error) { say(T.fail); return; }
        email = v; stepCode();
      });
      card.append(f.wrap, go, msg);
      f.input.focus();
    }

    function stepCode() {
      head();
      card.appendChild(el('p', 'font-size:13.5px;color:#6B6072;margin:0 0 14px;', T.sentTo));
      const c = field(T.code, 'text', { inputMode: 'numeric', maxLength: 6, autocomplete: 'one-time-code' }); c.input.style.direction = 'ltr'; c.input.style.letterSpacing = '6px'; c.input.style.fontSize = '20px'; c.input.style.textAlign = 'center';
      const p1 = field(T.pw, 'password', { autocomplete: 'new-password' }); p1.input.style.direction = 'ltr'; p1.input.style.textAlign = 'left';
      const p2 = field(T.pw2, 'password', { autocomplete: 'new-password' }); p2.input.style.direction = 'ltr'; p2.input.style.textAlign = 'left';
      const hint = el('div', 'font-size:12px;color:#6B6072;margin:-4px 0 4px;', T.hint);
      const go = el('button', btnCss, T.change); go.type = 'button';
      const again = el('button', linkBtnCss, T.resend); again.type = 'button';
      again.addEventListener('click', async () => {
        again.disabled = true;
        await sb.functions.invoke('password-reset', { body: { action: 'request', email, lang: en ? 'en' : 'ar' } });
        say(T.sentTo, true); setTimeout(() => { again.disabled = false; }, 4000);
      });
      go.addEventListener('click', async () => {
        const code = c.input.value.trim(), a = p1.input.value, b = p2.input.value;
        if (!/^\d{6}$/.test(code)) { say(T.badCode); return; }
        if (a.length < 8 || !/[A-Za-z؀-ۿ]/.test(a) || !/\d/.test(a)) { say(T.weak); return; }
        if (a !== b) { say(T.mismatch); return; }
        go.disabled = true; go.textContent = T.changing; say('');
        const { data, error } = await sb.functions.invoke('password-reset', { body: { action: 'confirm', email, code, password: a } });
        go.disabled = false; go.textContent = T.change;
        if (error || !data || !data.ok) {
          let kind = ''; try { const j = await error.context.json(); kind = j.error; } catch (_) {}
          say(kind === 'weak_password' ? T.weak : (kind === 'invalid_code' ? T.badCode : T.fail)); return;
        }
        stepDone();
      });
      card.append(c.wrap, p1.wrap, p2.wrap, hint, go, again, msg);
      c.input.focus();
    }

    function stepDone() {
      head();
      card.appendChild(el('p', 'color:#2E6B45;font-weight:700;margin:0 0 4px;', T.done));
      const ok = el('button', btnCss, T.close); ok.type = 'button';
      ok.addEventListener('click', () => { close(); if (typeof opts.onDone === 'function') opts.onDone(email); });
      card.appendChild(ok);
    }

    const esc = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
    document.body.appendChild(overlay);
    stepEmail();
  };
})();
