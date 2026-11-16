/* رادار التقنية من ai.nxt — app.js (الجزء 1: الأساس، الرئيسية، الأخبار، التقرير، الإعدادات)
   بلا مكتبات. كل نص بيانات يدخل الصفحة عبر textContent فقط. لا مفاتيح API هنا. */
(function () {
'use strict';
var $ = function (i) { return document.getElementById(i); };
var LV = { 4: 'عاجل', 3: 'مهم جداً', 2: 'مهم', 1: 'عادي' };
var CATS = ['الكل', 'الذكاء الاصطناعي', 'الهواتف والأجهزة', 'الأمن السيبراني', 'البرمجيات والتطبيقات', 'الشركات الناشئة', 'الألعاب', 'الفضاء والعلوم', 'السيارات الكهربائية'];
var REGIONS = { gulf: 'الخليج', asia: 'آسيا', europe: 'أوروبا', america: 'أمريكا', africa: 'أفريقيا', other: 'أخرى' };
var DEV = ['model', 'repo', 'release', 'paper', 'tool'];
var KEY = { saved: 'radar-saved-v2', theme: 'radar-theme', set: 'radar-settings-v1' };
var mem = {};
var S = { items: [], tab: 'home', cat: 'الكل', q: '', lv: 0, rg: '', sr: '', pd: '', so: 'new', lim: 12,
  loading: false, err: '', seed: false, updated: '', sources: [], report: null, saved: [], open: {},
  set: { interval: 30, off: {} }, aiTab: 'model', ghTab: 'rising', ghLang: '', co: '' };
var timer = 0;

/* ---------- أدوات ---------- */
function store(k, v) { try { if (v === undefined) { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } localStorage.setItem(k, JSON.stringify(v)); } catch (e) { if (v === undefined) return mem[k] || null; mem[k] = v; } }
function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
function safeUrl(u) { try { var p = new URL(u); return /^https?:$/.test(p.protocol) ? p.href : ''; } catch (e) { return ''; } }
function num(v) { return v == null ? '—' : Number(v).toLocaleString('ar'); }
function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return s; } }
function fmtTime(s) { try { return new Date(s).toLocaleString('ar', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { return s; } }
function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2400); }
function copyText(text, msg) {
  function fb() { var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove(); toast(ok ? (msg || 'تم النسخ') : 'تعذّر النسخ، حدّد النص يدوياً'); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(msg || 'تم النسخ'); }, fb); else fb();
}
function share(it) { var t = it.title + '\n' + it.url; if (navigator.share) navigator.share({ title: it.title, url: it.url }).catch(function () { copyText(t, 'نُسخ الخبر ورابطه'); }); else copyText(t, 'نُسخ الخبر ورابطه'); }
function btn(label, cls, fn, aria) { var b = el('button', 'btn sm ' + (cls || ''), label); b.type = 'button'; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', fn); return b; }
var EU = ['FR', 'DE', 'GB', 'NL', 'SE', 'ES', 'IT', 'CH', 'FI', 'NO'], AR = ['OM', 'SA', 'AE', 'QA', 'KW', 'BH', 'EG', 'JO'];
function origin(c) { c = String(c || '').toUpperCase(); return c === 'CN' ? 'صيني' : c === 'US' ? 'أمريكي' : EU.indexOf(c) > -1 ? 'أوروبي' : AR.indexOf(c) > -1 ? 'عربي' : ''; }
function tm(i) { var t = Date.parse(i.ts || i.fs); return isNaN(t) ? 0 : t; }
function ref() { var t = Date.parse(S.updated); return isNaN(t) ? Date.now() : t; }
function isNew(i) { var t = Date.parse(i.fs); return !isNaN(t) && ref() - t < 36 * 36e5; }
function hay(i) { return (i.title + ' ' + i.summary + ' ' + i.source + ' ' + i.cat + ' ' + i.company).toLowerCase(); }
function key(i) { return i.url.replace(/[#?].*$/, '').replace(/\/$/, '').toLowerCase(); }

/* ---------- توحيد البيانات: بنية news.json ---------- */
function nu(x) { return x == null || x === '' || isNaN(+x) ? null : +x; }
function norm(r) {
  if (!r) return null;
  var u = safeUrl(r.url), t = String(r.title || '').trim(); if (!u || !t) return null;
  var c = String(r.cat || ''); if (CATS.indexOf(c) < 1) c = 'الذكاء الاصطناعي';
  var k = ['model', 'repo', 'release', 'paper', 'tool'].indexOf(r.kind) > -1 ? r.kind : 'news';
  return { id: String(r.id || u), title: t, summary: String(r.summary || '').trim(), url: u, source: String(r.source || '').trim() || new URL(u).hostname,
    country: String(r.country || ''), region: REGIONS[r.region] ? r.region : 'other', cat: c, level: Math.min(4, Math.max(1, +r.level || 1)), n: Math.max(1, +r.n || 1),
    also: (Array.isArray(r.also) ? r.also : []).map(function (a) { return { source: String((a && a.source) || ''), url: safeUrl(a && a.url) }; }).filter(function (a) { return a.source; }).slice(0, 4),
    kind: k, company: String(r.company || ''), ts: String(r.ts || ''), fs: String(r.fs || ''), off: !!r.off, sub: String(r.sub || ''),
    lg: String(r.lg || ''), st: nu(r.st), fk: nu(r.fk), gr: nu(r.gr), dl: nu(r.dl), prev: String(r.prev || ''), ver: String(r.ver || ''),
    sp: (Array.isArray(r.sp) ? r.sp : []).map(Number).filter(isFinite).slice(0, 30) };
}
function allowed(i) { var o = S.set.off; if (i.off && o.official) return false; if (DEV.indexOf(i.kind) > -1) return !o.dev; return !o[i.region]; }
function ofKind(k) { return S.items.filter(function (i) { return i.kind === k && allowed(i); }); }
function isSaved(it) { var k = key(it); return S.saved.some(function (s) { return key(s) === k; }); }
function toggleSave(it) {
  var k = key(it);
  if (isSaved(it)) { S.saved = S.saved.filter(function (s) { return key(s) !== k; }); toast('أُزيل من المحفوظات'); } else { S.saved.unshift(it); toast('تم الحفظ'); }
  store(KEY.saved, S.saved); render();
}

/* ---------- المكونات ---------- */
function spark(sp) {
  var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 90 28'); s.setAttribute('aria-hidden', 'true');
  var p = document.createElementNS(ns, 'polyline');
  if (sp.length > 1) { var mn = Math.min.apply(null, sp), mx = Math.max.apply(null, sp), d = mx - mn || 1;
    p.setAttribute('points', sp.map(function (v, i) { return (i * 90 / (sp.length - 1)).toFixed(1) + ',' + (26 - (v - mn) / d * 24).toFixed(1); }).join(' ')); s.setAttribute('class', 'spark'); }
  else { p.setAttribute('points', '0,14 90,14'); s.setAttribute('class', 'spark flat'); }
  s.appendChild(p); return s;
}
function extractive(it) { var t = (it.summary || it.title).split(/(?<=[.!؟?])\s+/).filter(function (x) { return x.length > 20; }).slice(0, 4); return t.length ? t : [it.summary || it.title]; }
function card(it, inSaved, img) {
  var c = el('article', 'card'), m = el('div', 'meta');
  if (img) c.appendChild(thumb(it.cat));
  m.appendChild(el('span', 'tag', it.cat));
  if (it.kind === 'model') { var o = origin(it.country); if (o) m.appendChild(el('span', 'tag org', o)); }
  if (isNew(it)) m.appendChild(el('span', 'badge new', 'جديد'));
  if (it.level >= 3) m.appendChild(el('span', 'badge' + (it.level === 4 ? ' hot' : ''), LV[it.level]));
  if (it.kind === 'news') { if (it.n > 1) m.appendChild(el('span', 'badge conf', 'مؤكد بـ ' + num(it.n) + ' مصادر')); else if (it.level >= 3 && !it.off) m.appendChild(el('span', 'badge unc', 'غير مؤكد')); }
  var d = fmtDate(it.ts || it.fs); if (d) m.appendChild(el('span', 'dt', d));
  c.appendChild(m); c.appendChild(el('h2', null, it.title)); if (it.summary) c.appendChild(el('p', 'sum', it.summary));
  if (it.kind === 'release' && it.ver) { var v = el('div', 'ver'); if (it.prev) { v.appendChild(el('span', null, it.prev)); v.appendChild(el('i', null, '←')); } v.appendChild(el('span', null, it.ver)); c.appendChild(v); }
  if (it.kind === 'repo' || it.kind === 'model') {
    var nm = el('div', 'nums');
    function nn(l, x) { var sp = el('span'); sp.appendChild(el('b', null, num(x))); sp.appendChild(document.createTextNode(' ' + l)); nm.appendChild(sp); }
    nn(it.kind === 'repo' ? 'نجمة' : 'إعجاب', it.st); if (it.fk != null) nn('Fork', it.fk); if (it.dl != null) nn('تنزيل', it.dl); if (it.gr > 0) nn('نمو', it.gr); if (it.lg) nm.appendChild(el('span', null, it.lg));
    if (it.kind === 'repo') nm.appendChild(spark(it.sp)); c.appendChild(nm);
  }
  var s = el('div', 'src', 'المصدر: ' + it.source); if (it.also.length) { s.appendChild(document.createTextNode(' · وأيضاً: ')); it.also.forEach(function (a, i) { if (i) s.appendChild(document.createTextNode('، ')); if (a.url) { var l = el('a', null, a.source); l.href = a.url; l.target = '_blank'; l.rel = 'noopener noreferrer'; s.appendChild(l); } else s.appendChild(document.createTextNode(a.source)); }); }
  c.appendChild(s);
  if (S.open[it.id]) { var bx = el('div', 'sumbox'); bx.appendChild(el('p', 'src', 'ملخص آلي مبسّط من نص الخبر')); var ul = el('ul'); S.open[it.id].forEach(function (p) { ul.appendChild(el('li', null, p)); }); bx.appendChild(ul); c.appendChild(bx); }
  var a = el('div', 'acts');
  a.appendChild(btn('لخّص', '', function () { S.open[it.id] = extractive(it); render(); }, 'لخّص الخبر'));
  if (inSaved) a.appendChild(btn('حذف', '', function () { toggleSave(it); }, 'حذف من المحفوظات'));
  else { var sv = isSaved(it), b = btn(sv ? 'محفوظ' : 'حفظ', sv ? 'on' : '', function () { toggleSave(it); }, sv ? 'إزالة من المحفوظات' : 'حفظ'); b.setAttribute('aria-pressed', String(sv)); a.appendChild(b); }
  a.appendChild(btn('مشاركة', '', function () { share(it); }, 'مشاركة'));
  var l = el('a', 'btn sm', 'فتح المصدر'); l.href = it.url; l.target = '_blank'; l.rel = 'noopener noreferrer'; l.setAttribute('aria-label', 'فتح المصدر في تبويب جديد'); a.appendChild(l);
  c.appendChild(a); return c;
}
function grid(list, inSaved, img) { var g = el('div', 'grid'); list.forEach(function (i) { g.appendChild(card(i, inSaved, img)); }); return g; }
function stateBox(title, text, action) { var s = el('div', 'state'); s.appendChild(el('h3', null, title)); s.appendChild(el('p', null, text)); if (action) s.appendChild(action); return s; }
function section(title, desc, list, go) {
  var s = el('section', 'sec'), h = el('div', 'sec-h'); h.appendChild(el('h2', null, title));
  if (go) h.appendChild(btn('عرض الكل', '', function () { location.hash = '#/' + go; }, 'عرض كل ' + title)); s.appendChild(h);
  if (desc) s.appendChild(el('p', 'sec-d', desc));
  if (!list.length) s.appendChild(el('div', 'notice', 'لا شيء جديد في هذا القسم بعد آخر مزامنة.')); else s.appendChild(grid(list, false, true)); return s;
}
function sel(label, val, opts, fn) {
  var w = el('label', 'sel'); w.appendChild(el('span', null, label)); var s = el('select');
  opts.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; if (String(o[0]) === String(val)) op.selected = true; s.appendChild(op); });
  s.addEventListener('change', function () { fn(s.value); }); w.appendChild(s); return w;
}
function chipsRow(list, cur, fn) {
  var r = el('div', 'chips'); r.setAttribute('role', 'group');
  list.forEach(function (c) { var b = el('button', 'chip', c[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(cur === c[0])); b.addEventListener('click', function () { fn(c[0]); }); r.appendChild(b); }); return r;
}

/* ---------- الصفحات: الرئيسية ---------- */
var P = {};
/* أيقونات الأقسام والإحصاء (مسارات ثابتة من الكود فقط، لا نصوص بيانات) */
var CI = { 'الذكاء الاصطناعي': '<path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  'الهواتف والأجهزة': '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  'الأمن السيبراني': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  'البرمجيات والتطبيقات': '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>',
  'الشركات الناشئة': '<path d="M12 3c3 2 5 5 5 9l-3 3h-4l-3-3c0-4 2-7 5-9zM9 15l-3 5 4-1M15 15l3 5-4-1"/><circle cx="12" cy="10" r="1.5"/>',
  'الألعاب': '<path d="M6 9h12a3 3 0 0 1 3 3v3a2 2 0 0 1-3.4 1.4L16 15H8l-1.6 1.4A2 2 0 0 1 3 15v-3a3 3 0 0 1 3-3zM8 11v3M6.5 12.5h3"/>',
  'الفضاء والعلوم': '<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="9.5" ry="3.5" transform="rotate(-25 12 12)"/>',
  'السيارات الكهربائية': '<path d="M5 16l1.5-5h11L19 16M4 16h16v3H4zM7 19v1.5M17 19v1.5"/>' };
var SI = { news: '<path d="M4 5h16v14H4zM8 9h8M8 13h8"/>', disc: CI['الذكاء الاصطناعي'], repo: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
  model: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5"/>', rel: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>' };
function ico(d) { var p = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + d + '</svg>', 'image/svg+xml').documentElement; var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); Array.prototype.forEach.call(p.childNodes, function (n) { s.appendChild(document.importNode(n, true)); }); return s; }
function thumb(cat) { var d = el('div', 'thumb t' + (Math.max(0, CATS.indexOf(cat)) % 3)); d.setAttribute('aria-hidden', 'true'); d.appendChild(ico(CI[cat] || CI['الذكاء الاصطناعي'])); return d; }
function ticker(list) {
  var t = el('div', 'ticker'); t.setAttribute('role', 'region'); t.setAttribute('aria-label', 'أخبار عاجلة'); t.appendChild(el('span', 'badge hot', 'عاجل'));
  var vw = el('div', 'tk-view'), tr = el('div', 'tk-track');
  [0, 1].forEach(function (k) { var g = el('div', 'tk-set'); if (k) g.setAttribute('aria-hidden', 'true');
    list.forEach(function (i) { var a = el('a', null, i.title); a.href = i.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; if (k) a.tabIndex = -1; g.appendChild(a); }); tr.appendChild(g); });
  vw.appendChild(tr); t.appendChild(vw); return t;
}
function sidePanel(title, list, meta, go) {
  var p = el('div', 'panel'); p.appendChild(el('h3', null, title));
  if (!list.length) p.appendChild(el('p', 'sum', 'لا شيء بعد.'));
  else { var ul = el('ul', 'sl'); list.forEach(function (i) { var li = el('li'), a = el('a', null, i.title); a.href = i.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; li.appendChild(a); var m = meta(i); if (m) li.appendChild(el('small', null, m)); ul.appendChild(li); }); p.appendChild(ul); }
  p.appendChild(btn('عرض الكل', '', function () { location.hash = '#/' + go; }, 'عرض كل ' + title)); return p;
}
function side() {
  var s = el('aside', 'side'); s.setAttribute('aria-label', 'لوحة جانبية');
  s.appendChild(sidePanel('نماذج صاعدة', ofKind('model').sort(function (a, b) { return (b.st || 0) - (a.st || 0) || tm(b) - tm(a); }).slice(0, 4), function (i) { return origin(i.country) || i.source; }, 'ai'));
  s.appendChild(sidePanel('GitHub الأكثر نمواً', ofKind('repo').sort(function (a, b) { return (b.gr || 0) - (a.gr || 0) || (b.st || 0) - (a.st || 0); }).slice(0, 4), function (i) { return i.gr > 0 ? '+' + num(i.gr) + ' نجمة' : i.st != null ? num(i.st) + ' نجمة' : i.lg; }, 'github'));
  s.appendChild(sidePanel('إصدارات جديدة', ofKind('release').sort(function (a, b) { return tm(b) - tm(a); }).slice(0, 4), function (i) { return i.ver ? (i.prev ? i.prev + ' ← ' : '') + i.ver : fmtDate(i.ts || i.fs); }, 'releases'));
  return s;
}
P.home = function (v) {
  var items = S.items.filter(allowed), day = ref() - 864e5, w = el('div', 'home');
  var hero = el('section', 'brand-hero');
  var heroCopy = el('div', 'brand-hero-copy');
  heroCopy.appendChild(el('span', 'brand-kicker', 'TECH RADAR  ·  من ai.nxt'));
  var heroTitle = el('h1', 'brand-title'); heroTitle.appendChild(document.createTextNode('ai')); heroTitle.appendChild(el('span', 'brand-dot', '.')); heroTitle.appendChild(document.createTextNode('nxt')); heroCopy.appendChild(heroTitle);
  heroCopy.appendChild(el('h2', 'brand-tagline', 'مساعدك الذكي للمستقبل'));
  heroCopy.appendChild(el('p', 'brand-intro', 'نرصد لك نبض التقنية والذكاء الاصطناعي حول العالم؛ أخبار موثوقة، نماذج صاعدة، مشاريع مفتوحة، وإصدارات تستحق المتابعة.'));
  var heroActions = el('div', 'brand-actions');
  var explore = el('a', 'btn primary', 'استكشف الرادار'); explore.href = '#/news'; heroActions.appendChild(explore);
  var aiLink = el('a', 'btn brand-outline', 'اكتشف الذكاء الاصطناعي'); aiLink.href = '#/ai'; heroActions.appendChild(aiLink);
  heroCopy.appendChild(heroActions);
  var heroMarks = el('div', 'brand-marks');
  [['شبكة عصبية','نلتقط الإشارات'],['مسارات طاقة','نربط التطورات'],['مدار مستمر','نراقب المستقبل']].forEach(function (x) { var m = el('div','brand-mark'); m.appendChild(el('b',null,x[0])); m.appendChild(el('small',null,x[1])); heroMarks.appendChild(m); });
  heroCopy.appendChild(heroMarks);
  var heroVisual = el('div', 'brand-hero-visual');
  var heroLogo = document.createElement('img'); heroLogo.src = 'assets/ai-nxt-logo.webp'; heroLogo.alt = 'شعار ai.nxt ومسارات الشبكة العصبية'; heroLogo.className = 'hero-emblem'; heroVisual.appendChild(heroLogo);
  var mascot = document.createElement('img'); mascot.src = 'assets/ai-nxt-mascot.webp'; mascot.alt = 'شخصية ai.nxt الروبوتية'; mascot.className = 'hero-mascot'; mascot.loading = 'eager'; heroVisual.appendChild(mascot);
  hero.appendChild(heroCopy); hero.appendChild(heroVisual); w.appendChild(hero);
  var hot = ofKind('news').filter(function (i) { return i.level === 4; }).sort(function (a, b) { return tm(b) - tm(a); }).slice(0, 8);
  if (hot.length) w.appendChild(ticker(hot));
  var disc = items.filter(isNew).sort(function (a, b) { return b.level - a.level || tm(b) - tm(a); });
  var st = el('div', 'stats');
  [['أخبار 24 ساعة', ofKind('news').filter(function (i) { return tm(i) >= day; }).length, 'news'], ['اكتشافات', disc.length, 'disc'], ['مستودعات', ofKind('repo').length, 'repo'], ['نماذج', ofKind('model').length, 'model'], ['إصدارات', ofKind('release').length, 'rel', 'dk']]
    .forEach(function (x) { var d = el('div', 'stat' + (x[3] ? ' ' + x[3] : '')), ic = el('div', 'si'), tx = el('div'); ic.appendChild(ico(SI[x[2]])); d.appendChild(ic); tx.appendChild(el('b', null, num(x[1]))); tx.appendChild(el('span', null, x[0])); d.appendChild(tx); st.appendChild(d); });
  w.appendChild(st);
  var gr = el('div', 'home-grid'), main = el('div', 'hmain');
  var cc = {}; items.forEach(function (i) { if (i.company) cc[i.company] = (cc[i.company] || 0) + 1; });
  var top = Object.keys(cc).sort(function (a, b) { return cc[b] - cc[a]; }).slice(0, 8);
  if (top.length) { var s = el('section', 'sec'); s.appendChild(el('h2', null, 'الشركات الأكثر حضوراً')); var r = el('div', 'cos'); top.forEach(function (c) { var x = el('span', 'co', c); x.appendChild(el('b', null, num(cc[c]))); r.appendChild(x); }); s.appendChild(r); main.appendChild(s); }
  main.appendChild(section('اكتشافات اليوم', 'عناصر ظهرت لأول مرة في قاعدة الرادار خلال 36 ساعة', disc.slice(0, 6), null));
  main.appendChild(section('أهم الأخبار', 'مرتبة بدرجة الأهمية ثم الأحدث', ofKind('news').sort(function (a, b) { return b.level - a.level || tm(b) - tm(a); }).slice(0, 6), 'news'));
  gr.appendChild(main); gr.appendChild(side()); w.appendChild(gr); v.appendChild(w);
};

/* ---------- الأخبار ---------- */
function newsList() {
  var q = S.q.trim().toLowerCase(), r = ref(), per = { '24': 864e5, '3': 3 * 864e5, '7': 7 * 864e5 }[S.pd];
  var a = ofKind('news').filter(function (i) {
    if (S.cat !== 'الكل' && i.cat !== S.cat) return false; if (S.lv && i.level < S.lv) return false; if (S.rg && i.region !== S.rg) return false;
    if (S.sr && i.source !== S.sr) return false; if (per && r - tm(i) > per) return false; return !q || hay(i).indexOf(q) > -1; });
  var f = { 'new': function (x, y) { return tm(y) - tm(x); }, imp: function (x, y) { return y.level - x.level || tm(y) - tm(x); }, conf: function (x, y) { return y.n - x.n || tm(y) - tm(x); } }[S.so];
  return a.sort(f);
}
function newsFilters(box) {
  box.appendChild(chipsRow(CATS.map(function (c) { return [c, c]; }), S.cat, function (c) { S.cat = c; S.lim = 12; render(); }));
  var srcs = {}; ofKind('news').forEach(function (i) { srcs[i.source] = 1; });
  var r = el('div', 'sels');
  r.appendChild(sel('الأهمية', S.lv, [[0, 'الكل'], [2, 'مهم فأعلى'], [3, 'مهم جداً فأعلى'], [4, 'عاجل فقط']], function (x) { S.lv = +x; S.lim = 12; render(); }));
  r.appendChild(sel('المنطقة', S.rg, [['', 'الكل']].concat(Object.keys(REGIONS).map(function (k) { return [k, REGIONS[k]]; })), function (x) { S.rg = x; S.lim = 12; render(); }));
  r.appendChild(sel('المصدر', S.sr, [['', 'الكل']].concat(Object.keys(srcs).sort().map(function (k) { return [k, k]; })), function (x) { S.sr = x; S.lim = 12; render(); }));
  r.appendChild(sel('الفترة', S.pd, [['', 'الكل'], ['24', 'آخر 24 ساعة'], ['3', 'آخر 3 أيام'], ['7', 'آخر أسبوع']], function (x) { S.pd = x; S.lim = 12; render(); }));
  r.appendChild(sel('الترتيب', S.so, [['new', 'الأحدث'], ['imp', 'الأهم'], ['conf', 'الأكثر تأكيداً']], function (x) { S.so = x; render(); }));
  box.appendChild(r);
}
P.news = function (v) {
  var all = newsList();
  if (!all.length) { v.appendChild(stateBox('لا نتائج مطابقة', 'جرّب كلمات أخرى أو غيّر الفلاتر.', btn('مسح الفلاتر', 'primary', function () { S.cat = 'الكل'; S.lv = 0; S.rg = ''; S.sr = ''; S.pd = ''; S.q = ''; $('q').value = ''; render(); }))); return; }
  v.appendChild(grid(all.slice(0, S.lim), false));
  if (all.length > S.lim) { var m = el('button', 'btn more', 'تحميل المزيد (' + num(all.length - S.lim) + ')'); m.type = 'button'; m.addEventListener('click', function () { S.lim += 12; render(); }); v.appendChild(m); }
};

/* ---------- التقرير اليومي ---------- */
function reportData() {
  var news = ofKind('news'), rp = S.report || {}, byId = {}; S.items.forEach(function (i) { byId[i.id] = i; });
  var top = (Array.isArray(rp.top) ? rp.top.map(function (id) { return byId[id]; }).filter(Boolean) : []);
  if (!top.length) top = news.slice().sort(function (a, b) { return b.level - a.level || b.n - a.n || tm(b) - tm(a); }).slice(0, 5);
  var mods = ofKind('model').sort(function (a, b) { return (b.st || 0) - (a.st || 0); }), repos = ofKind('repo').sort(function (a, b) { return (b.gr || 0) - (a.gr || 0) || (b.st || 0) - (a.st || 0); });
  return { rp: rp, top: top.slice(0, 5), model: mods[0], repo: repos[0] };
}
P.report = function (v) {
  var d = reportData(), a = el('article', 'art'); a.appendChild(el('span', 'tag', 'التقرير اليومي · ' + fmtDate(S.updated || Date.now())));
  a.appendChild(el('h1', null, d.rp.title || 'ملخص اليوم: ما يهمّك في التقنية'));
  if (d.rp.text) String(d.rp.text).split('\n').forEach(function (p) { if (p.trim()) a.appendChild(el('p', null, p)); });
  a.appendChild(el('h2', null, 'أهم 5 أخبار'));
  if (!d.top.length) a.appendChild(el('p', null, 'لا أخبار كافية لبناء التقرير بعد.')); else { var ol = el('ol'); d.top.forEach(function (i) { var li = el('li'), l = el('a', null, i.title); l.href = i.url; l.target = '_blank'; l.rel = 'noopener noreferrer'; li.appendChild(l); li.appendChild(el('small', null, ' · ' + i.source)); ol.appendChild(li); }); a.appendChild(ol); }
  var g = el('div', 'grid');
  [['أبرز نموذج', d.model], ['أبرز مستودع', d.repo]].forEach(function (x) { var p = el('div', 'panel'); p.appendChild(el('span', 'tag', x[0])); if (x[1]) { var l = el('a', null, x[1].title); l.href = x[1].url; l.target = '_blank'; l.rel = 'noopener noreferrer'; var h = el('h3'); h.appendChild(l); p.appendChild(h); if (x[1].summary) p.appendChild(el('p', null, x[1].summary)); } else p.appendChild(el('p', null, 'لا بيانات بعد.')); g.appendChild(p); });
  a.appendChild(g); a.appendChild(el('h2', null, 'ما يجب متابعته غداً'));
  if (Array.isArray(d.rp.watch) && d.rp.watch.length) { var ul = el('ol'); d.rp.watch.forEach(function (w) { ul.appendChild(el('li', null, String(w))); }); a.appendChild(ul); } else a.appendChild(el('p', null, 'تظهر نقاط المتابعة عندما يولّدها سكربت التحديث.'));
  var ac = el('div', 'acts');
  ac.appendChild(btn('نسخ التقرير', 'primary', function () { copyText([d.rp.title || 'التقرير اليومي'].concat(d.top.map(function (i, n) { return (n + 1) + '. ' + i.title + ' (' + i.source + ')'; })).join('\n'), 'نُسخ التقرير'); }));
  ac.appendChild(btn('نص منشور إنستجرام', '', function () {
    var t = d.top; if (!t.length) { toast('لا أخبار كافية'); return; }
    var out = [t[0].title, ''].concat(t.slice(1, 4).map(function (i) { return '• ' + i.title; }));
    if (d.rp.why) out.push('', 'لماذا يهمك؟ ' + d.rp.why); out.push('', 'المصدر: ' + t[0].source, '#ai_nxt'); copyText(out.join('\n'), 'نُسخ نص المنشور'); }));
  a.appendChild(ac); v.appendChild(a);
};

/* ---------- الإعدادات والمصادر ---------- */
var GROUPS = [['gulf', 'الخليج'], ['asia', 'آسيا'], ['europe', 'أوروبا'], ['america', 'أمريكا'], ['africa', 'أفريقيا'], ['official', 'المصادر الرسمية للشركات'], ['dev', 'GitHub وHugging Face']];
function saveSet() { store(KEY.set, S.set); }
P.settings = function (v) {
  var a = el('div', 'art'); a.appendChild(el('h1', null, 'الإعدادات والمصادر'));
  var p = el('div', 'panel'); p.appendChild(el('h3', null, 'مجموعات المصادر'));
  GROUPS.forEach(function (g) { var r = el('label', 'row'); r.appendChild(el('span', null, g[1])); var c = el('input'); c.type = 'checkbox'; c.checked = !S.set.off[g[0]]; c.addEventListener('change', function () { if (c.checked) delete S.set.off[g[0]]; else S.set.off[g[0]] = 1; saveSet(); toast('حُفظ الإعداد'); }); r.appendChild(c); p.appendChild(r); });
  a.appendChild(p);
  var q = el('div', 'panel'); q.appendChild(el('h3', null, 'فترة التحديث التلقائي'));
  q.appendChild(chipsRow([[15, '15 دقيقة'], [30, '30 دقيقة'], [60, 'ساعة'], [180, '3 ساعات']], S.set.interval, function (x) { S.set.interval = x; saveSet(); schedule(); render(); })); a.appendChild(q);
  var th = el('div', 'panel'); th.appendChild(el('h3', null, 'المظهر'));
  th.appendChild(chipsRow([['dark', 'داكن'], ['light', 'فاتح']], document.documentElement.getAttribute('data-theme'), function (x) { applyTheme(x); store(KEY.theme, x); render(); })); a.appendChild(th);
  var sv = el('div', 'panel'); sv.appendChild(el('h3', null, 'المحفوظات')); sv.appendChild(el('p', 'sum', 'تُحفظ في متصفحك فقط. صدّرها لنقلها إلى جهاز آخر.'));
  var ac = el('div', 'acts');
  ac.appendChild(btn('تصدير', '', function () { var u = URL.createObjectURL(new Blob([JSON.stringify(S.saved, null, 1)], { type: 'application/json' })), l = document.createElement('a'); l.href = u; l.download = 'radar-saved.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); }));
  var f = el('input'); f.type = 'file'; f.accept = 'application/json'; f.className = 'hide'; f.setAttribute('aria-label', 'استيراد المحفوظات');
  f.addEventListener('change', function () { var file = f.files[0]; if (!file) return; var rd = new FileReader(); rd.onload = function () { try { var arr = JSON.parse(rd.result).map(function (x) { return norm(x); }).filter(Boolean), n = 0; arr.forEach(function (i) { if (!isSaved(i)) { S.saved.push(i); n++; } }); store(KEY.saved, S.saved); toast('استُوردت ' + num(n) + ' عناصر'); render(); } catch (e) { toast('الملف غير صالح'); } }; rd.readAsText(file); });
  ac.appendChild(btn('استيراد', '', function () { f.click(); })); ac.appendChild(f); sv.appendChild(ac); a.appendChild(sv);
  var h = el('div', 'panel'); h.appendChild(el('h3', null, 'حالة المصادر'));
  if (!S.sources.length) h.appendChild(el('p', 'sum', 'لا قائمة مصادر في news.json بعد. يكتبها سكربت التحديث في المرحلة 3.'));
  S.sources.forEach(function (s) { var r = el('div', 'row'); r.appendChild(el('span', null, s.name)); r.appendChild(el('span', s.ok === true ? 'ok' : s.ok === false ? 'fail' : 'src', s.ok === true ? 'يعمل' : s.ok === false ? 'فشل' + (s.err ? ': ' + s.err : '') : 'لم يُختبر')); h.appendChild(r); });
  a.appendChild(h); v.appendChild(a);
};

/* ---------- بقية الصفحات: الذكاء الاصطناعي ---------- */
function searchFilter(list) { var q = S.q.trim().toLowerCase(); return q ? list.filter(function (i) { return hay(i).indexOf(q) > -1; }) : list; }
function newest(a, b) { return (isNew(b) - isNew(a)) || tm(b) - tm(a); }
var AI_TABS = [['model', 'نماذج'], ['agent', 'وكلاء'], ['tool', 'أدوات'], ['paper', 'أوراق بحثية'], ['skill', 'مهارات']];
P.ai = function (v) {
  var tabs = chipsRow(AI_TABS, S.aiTab, function (x) { S.aiTab = x; render(); }); v.appendChild(tabs);
  var all = S.items.filter(allowed).filter(function (i) {
    var t = S.aiTab; if (t === 'model') return i.kind === 'model'; if (t === 'paper') return i.kind === 'paper';
    if (t === 'agent') return i.kind === 'tool' && i.sub === 'agent'; if (t === 'skill') return i.kind === 'tool' && i.sub === 'skill';
    return i.kind === 'tool' && i.sub !== 'agent' && i.sub !== 'skill'; });
  var list = searchFilter(all).sort(newest);
  if (!list.length) { v.appendChild(stateBox('لا عناصر في هذا التبويب بعد', 'تظهر هنا بعد أول تشغيل ناجح لسكربت التحديث.')); return; }
  v.appendChild(grid(list, false));
};

/* ---------- GitHub ---------- */
P.github = function (v) {
  var base = ofKind('repo'), langs = {}; base.forEach(function (i) { if (i.lg) langs[i.lg] = 1; });
  var bar = el('div', 'sels');
  bar.appendChild(chipsRow([['rising', 'صاعدة'], ['new', 'جديدة']], S.ghTab, function (x) { S.ghTab = x; render(); }));
  bar.appendChild(sel('اللغة', S.ghLang, [['', 'الكل']].concat(Object.keys(langs).sort().map(function (k) { return [k, k]; })), function (x) { S.ghLang = x; render(); }));
  v.appendChild(bar);
  var list = searchFilter(base.filter(function (i) { return !S.ghLang || i.lg === S.ghLang; }));
  list.sort(S.ghTab === 'rising' ? function (a, b) { return (b.gr || 0) - (a.gr || 0) || (b.st || 0) - (a.st || 0); } : newest);
  if (!list.length) { v.appendChild(stateBox('لا مستودعات مطابقة', 'جرّب لغة أخرى أو امسح البحث.')); return; }
  v.appendChild(grid(list, false));
};

/* ---------- الإصدارات ---------- */
P.releases = function (v) {
  var list = searchFilter(ofKind('release')).sort(function (a, b) { return tm(b) - tm(a); });
  if (!list.length) { v.appendChild(stateBox('لا إصدارات بعد', 'تظهر هنا آخر إصدارات المشاريع المراقبة بعد أول تشغيل ناجح.')); return; }
  v.appendChild(grid(list, false));
};

/* ---------- الشركات ---------- */
var COMPANIES = ['Google', 'NVIDIA', 'OpenAI', 'Anthropic', 'Meta', 'Microsoft', 'Alibaba', 'Tencent', 'Baidu', 'DeepSeek', 'Samsung'];
P.companies = function (v) {
  var items = S.items.filter(allowed), cnt = {}; items.forEach(function (i) { if (i.company) cnt[i.company.toLowerCase()] = (cnt[i.company.toLowerCase()] || 0) + 1; });
  var tiles = el('div', 'tiles');
  COMPANIES.forEach(function (c) { var b = el('button', 'tile'); b.type = 'button'; b.setAttribute('aria-pressed', String(S.co === c)); b.appendChild(el('span', 'mk', c.slice(0, 2))); b.appendChild(el('b', null, c)); b.appendChild(el('small', null, num(cnt[c.toLowerCase()] || 0) + ' عناصر')); b.addEventListener('click', function () { S.co = S.co === c ? '' : c; render(); }); tiles.appendChild(b); });
  v.appendChild(tiles);
  if (!S.co) { v.appendChild(el('p', 'sec-d', 'اضغط على شركة لعرض آخر أخبارها.')); return; }
  var list = items.filter(function (i) { return i.company.toLowerCase() === S.co.toLowerCase(); }).sort(function (a, b) { return tm(b) - tm(a); });
  var h = el('h2', null, 'آخر أخبار ' + S.co); v.appendChild(h);
  if (!list.length) v.appendChild(stateBox('لا أخبار لهذه الشركة بعد', 'تُنسب الأخبار للشركة عند ذكرها في العنوان أو الملخص.')); else v.appendChild(grid(list, false));
};

/* ---------- المحفوظات ---------- */
P.saved = function (v) {
  var list = searchFilter(S.saved);
  if (!S.saved.length) { v.appendChild(stateBox('لا توجد عناصر محفوظة', 'اضغط «حفظ» على أي بطاقة لتظهر هنا.', (function () { var a = el('a', 'btn primary', 'تصفّح الأخبار'); a.href = '#/news'; return a; })())); return; }
  if (!list.length) { v.appendChild(stateBox('لا نتائج مطابقة', 'جرّب كلمات أخرى.')); return; }
  v.appendChild(grid(list, true));
};

/* ---------- العرض والتوجيه ---------- */
var ROUTES = ['home', 'news', 'ai', 'github', 'releases', 'companies', 'report', 'saved', 'settings'];
var SEARCH_ON = { home: 1, news: 1, ai: 1, github: 1, releases: 1, saved: 1 };
var PH = { home: 'ابحث في الأخبار: شركة، منتج، مشروع…', news: 'ابحث في الأخبار…', ai: 'ابحث في الذكاء الاصطناعي…', github: 'ابحث في المستودعات…', releases: 'ابحث في الإصدارات…', saved: 'ابحث في المحفوظات…' };
function route() { var m = (location.hash || '').match(/^#\/([a-z]+)/); S.tab = m && ROUTES.indexOf(m[1]) > -1 ? m[1] : 'home'; }
function banner() {
  var b = $('banner'); b.textContent = '';
  if (S.seed) b.appendChild(el('div', 'notice seed', 'لم تُجرَ مزامنة حية بعد. ستظهر الأخبار بعد أول تشغيل ناجح لـ GitHub Actions.'));
  if (S.err) { var n = el('div', 'notice'); n.setAttribute('role', 'alert'); n.appendChild(el('span', null, 'تعذّر تحميل news.json. تُعرض آخر بيانات محمّلة، ويمكنك إعادة المحاولة.')); n.appendChild(btn('إعادة المحاولة', '', function () { refresh(); })); b.appendChild(n); }
}
function render() {
  var t = S.tab;
  [].forEach.call(document.querySelectorAll('[data-r]'), function (a) { if (a.getAttribute('data-r') === t) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('searchRow').classList.toggle('hide', !SEARCH_ON[t]); $('q').placeholder = PH[t] || '';
  var f = $('filters'); f.textContent = ''; if (t === 'news') newsFilters(f);
  $('stamp').textContent = S.updated ? 'آخر تحديث: ' + fmtTime(S.updated) : '';
  var rb = $('refresh'); rb.disabled = S.loading; rb.firstChild.textContent = S.loading ? 'جارٍ التحديث…' : 'تحديث';
  var v = $('view'); v.textContent = '';
  if (location.protocol === 'file:') { $('banner').textContent = ''; v.appendChild(stateBox('لا يمكن فتح الرادار من ملف محلي', 'المتصفح يمنع قراءة news.json عند الفتح من file://. شغّل الأمر python -m http.server داخل مجلد المشروع ثم افتح http://localhost:8000')); return; }
  banner();
  if (S.loading && !S.items.length) { var g = el('div', 'grid'); for (var i = 0; i < 6; i++) g.appendChild(el('div', 'skel')); v.appendChild(g); return; }
  if (!S.items.length) { v.appendChild(stateBox('بانتظار أول مزامنة', 'لم تُحمّل أخبار بعد. شغّل «تحديث الرادار التقني» من تبويب Actions في مستودع GitHub، ثم أعد تحميل الصفحة.', btn('إعادة المحاولة', 'primary', function () { refresh(); }))); return; }
  P[t](v);
}
function loadFeed() {
  return fetch('news.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(function (d) {
    var items = (d.items || []).map(norm).filter(Boolean), seen = {}, out = [];
    items.forEach(function (i) { var k = key(i); if (!seen[k]) { seen[k] = 1; out.push(i); } });
    return { d: d, items: out }; });
}
function refresh(silent) {
  if (S.loading) return; S.loading = true; S.err = ''; render();
  loadFeed().then(function (r) { S.items = r.items; S.updated = r.d.updated || ''; S.seed = !!r.d.seed; S.sources = Array.isArray(r.d.sources) ? r.d.sources : []; S.report = r.d.report || null; if (silent !== true) toast('حُدّثت الأخبار'); })
    .catch(function () { S.err = 'fail'; }).then(function () { S.loading = false; render(); });
}
function schedule() { clearInterval(timer); if (S.set.interval > 0 && location.protocol !== 'file:') timer = setInterval(function () { refresh(true); }, S.set.interval * 6e4); }
function applyTheme(t) { if (t === 'dark' || t === 'light') { document.documentElement.setAttribute('data-theme', t); var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === 'dark' ? '#0A0A10' : '#F2EFE9'; } }

/* ---------- الأحداث ---------- */
function doSearch() { S.q = $('q').value; S.lim = 12; if (S.tab === 'home' && S.q.trim()) { location.hash = '#/news'; return; } render(); }
$('go').addEventListener('click', doSearch);
$('q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
$('q').addEventListener('input', function () { if (!this.value && S.q) { S.q = ''; render(); } });
$('refresh').addEventListener('click', function () { refresh(); });
$('theme').addEventListener('click', function () { var n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; applyTheme(n); store(KEY.theme, n); });
var more = $('more'), moreBtn = $('moreBtn');
function closeMore() { more.hidden = true; moreBtn.setAttribute('aria-expanded', 'false'); }
moreBtn.addEventListener('click', function () { var o = more.hidden; more.hidden = !o; moreBtn.setAttribute('aria-expanded', String(o)); });
more.addEventListener('click', function (e) { if (e.target.closest('a')) closeMore(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMore(); });
window.addEventListener('hashchange', function () { closeMore(); route(); S.lim = 12; render(); window.scrollTo(0, 0); $('view').focus({ preventScroll: true }); });

/* إضاءة تتبع المؤشر: للماوس فقط وتتوقف مع تقليل الحركة */
var fine = matchMedia('(hover:hover) and (pointer:fine)'), calm = matchMedia('(prefers-reduced-motion:reduce)'), spot = null, raf = 0;
function tick() { if (!spot) { raf = 0; return; } spot.x += (spot.tx - spot.x) * .2; spot.y += (spot.ty - spot.y) * .2; spot.el.style.setProperty('--mx', spot.x.toFixed(1) + 'px'); spot.el.style.setProperty('--my', spot.y.toFixed(1) + 'px'); raf = (Math.abs(spot.tx - spot.x) > .4 || Math.abs(spot.ty - spot.y) > .4) ? requestAnimationFrame(tick) : 0; }
$('view').addEventListener('pointermove', function (e) {
  if (e.pointerType !== 'mouse' || !fine.matches || calm.matches) return;
  var c = e.target.closest && e.target.closest('.card'); if (!c) return; var r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  if (!spot || spot.el !== c) spot = { el: c, x: x, y: y, tx: x, ty: y }; else { spot.tx = x; spot.ty = y; } if (!raf) raf = requestAnimationFrame(tick);
});
document.addEventListener('pointermove', function (e) {
  if (e.pointerType !== 'mouse' || !fine.matches || calm.matches) return; var b = document.querySelector('.brand'); if (!b) return;
  b.style.setProperty('--hx', ((e.clientX / innerWidth - .5) * 28).toFixed(1) + 'px'); b.style.setProperty('--hy', ((e.clientY / innerHeight - .5) * 18).toFixed(1) + 'px');
});

/* ---------- البدء ---------- */
applyTheme(store(KEY.theme));
var ss = store(KEY.set); if (ss && typeof ss === 'object') { S.set.interval = +ss.interval || 30; S.set.off = ss.off && typeof ss.off === 'object' ? ss.off : {}; }
S.saved = (store(KEY.saved) || []).map(norm).filter(Boolean);
route(); render(); schedule();
if (location.protocol !== 'file:') refresh(true);
})();
