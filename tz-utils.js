/* بوضوح — أدوات المناطق الزمنية المشتركة (حجز، بوابة الأخصائيين، الأدمن).
   كل المواعيد تُخزَّن كلحظة مطلقة (UTC) في قاعدة البيانات؛ هذه الأدوات فقط لعرضها وإدخالها بمنطقة زمنية صريحة
   بدل الاعتماد الضمني على ساعة الجهاز. window.BWTZ */
(function () {
  // [IANA، عربي، إنجليزي]
  const ZONES = [
    ['Asia/Amman', 'الأردن — عمّان', 'Jordan — Amman'],
    ['Asia/Gaza', 'فلسطين — القدس وغزة', 'Palestine — Jerusalem & Gaza'],
    ['Asia/Beirut', 'لبنان — بيروت', 'Lebanon — Beirut'],
    ['Asia/Damascus', 'سوريا — دمشق', 'Syria — Damascus'],
    ['Asia/Baghdad', 'العراق — بغداد', 'Iraq — Baghdad'],
    ['Asia/Riyadh', 'السعودية — الرياض', 'Saudi Arabia — Riyadh'],
    ['Asia/Kuwait', 'الكويت', 'Kuwait'],
    ['Asia/Qatar', 'قطر — الدوحة', 'Qatar — Doha'],
    ['Asia/Bahrain', 'البحرين — المنامة', 'Bahrain — Manama'],
    ['Asia/Dubai', 'الإمارات — دبي', 'UAE — Dubai'],
    ['Asia/Muscat', 'عُمان — مسقط', 'Oman — Muscat'],
    ['Asia/Aden', 'اليمن — عدن', 'Yemen — Aden'],
    ['Africa/Cairo', 'مصر — القاهرة', 'Egypt — Cairo'],
    ['Africa/Khartoum', 'السودان — الخرطوم', 'Sudan — Khartoum'],
    ['Africa/Tripoli', 'ليبيا — طرابلس', 'Libya — Tripoli'],
    ['Africa/Tunis', 'تونس', 'Tunisia — Tunis'],
    ['Africa/Algiers', 'الجزائر', 'Algeria — Algiers'],
    ['Africa/Casablanca', 'المغرب — الدار البيضاء', 'Morocco — Casablanca'],
    ['Europe/Istanbul', 'تركيا — إسطنبول', 'Türkiye — Istanbul'],
    ['Europe/Athens', 'أثينا / شرق أوروبا', 'Athens / Eastern Europe'],
    ['Europe/Paris', 'باريس / برلين / وسط أوروبا', 'Paris / Berlin / Central Europe'],
    ['Europe/London', 'بريطانيا — لندن', 'UK — London'],
    ['America/New_York', 'أمريكا — نيويورك (الشرق)', 'USA — New York (Eastern)'],
    ['America/Chicago', 'أمريكا — شيكاغو (الوسط)', 'USA — Chicago (Central)'],
    ['America/Los_Angeles', 'أمريكا — لوس أنجلوس', 'USA — Los Angeles'],
    ['America/Toronto', 'كندا — تورونتو', 'Canada — Toronto'],
    ['Australia/Sydney', 'أستراليا — سيدني', 'Australia — Sydney'],
    ['Asia/Kolkata', 'الهند', 'India'],
  ];
  const byId = Object.fromEntries(ZONES.map(z => [z[0], z]));
  const isValid = (tz) => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (_) { return false; } };
  const detect = () => { try { const z = Intl.DateTimeFormat().resolvedOptions().timeZone; return z && isValid(z) ? z : 'Asia/Amman'; } catch (_) { return 'Asia/Amman'; } };

  // فرق التوقيت (محلي − UTC) بالميلي ثانية للحظة معيّنة
  function offsetMs(ts, tz) {
    const p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(ts)).forEach(x => { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ts / 1000) * 1000;
  }
  // وقت جداري (سنة/شهر/يوم + دقائق من منتصف الليل) في منطقة زمنية → لحظة مطلقة Date
  function wallToUtc(y, mo, d, minutes, tz) {
    const guess = Date.UTC(y, mo - 1, d, 0, minutes);
    let ts = guess - offsetMs(guess, tz);
    ts = guess - offsetMs(ts, tz); // تصحيح عند عبور تغيير التوقيت الصيفي
    return new Date(ts);
  }
  // «GMT+3» أو «GMT+5:30»
  function offsetLabel(tz, date) {
    const m = Math.round(offsetMs((date || new Date()).getTime(), tz) / 60000);
    const s = m < 0 ? '-' : '+', a = Math.abs(m), h = Math.floor(a / 60), mm = a % 60;
    return 'GMT' + s + h + (mm ? ':' + String(mm).padStart(2, '0') : '');
  }
  function name(tz, en) {
    const z = byId[tz];
    if (z) return en ? z[2] : z[1];
    return String(tz || '').split('/').slice(1).join(' / ').replace(/_/g, ' ') || tz;
  }
  const dayKey = (iso, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  const fmtTime = (iso, tz, loc) => new Date(iso).toLocaleTimeString(loc || 'en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: /^en/.test(loc || 'en') ? true : undefined });
  const fmtDay = (iso, tz, loc, opts) => new Date(iso).toLocaleDateString(loc || 'en-GB', Object.assign({ timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }, opts || {}));
  const fmtDateTime = (iso, tz, loc) => new Date(iso).toLocaleString(loc || 'en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: /^en/.test(loc || 'en') ? true : undefined });
  function optionsHtml(selected, en, extra) {
    const list = ZONES.slice();
    [selected, extra].forEach(x => { if (x && !byId[x] && isValid(x) && !list.some(z => z[0] === x)) list.unshift([x, name(x, false), name(x, true)]); });
    const now = new Date();
    return list.map(z => `<option value="${z[0]}"${z[0] === selected ? ' selected' : ''}>${(en ? z[2] : z[1])} (${offsetLabel(z[0], now)})</option>`).join('');
  }
  window.BWTZ = { ZONES, isValid, detect, offsetMs, wallToUtc, offsetLabel, name, dayKey, fmtTime, fmtDay, fmtDateTime, optionsHtml };
})();
