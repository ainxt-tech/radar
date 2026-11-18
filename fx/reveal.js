/* fx/reveal — دخول متتابع (fade + translate) للبطاقات والأقسام.
   - يعمل على المحتوى الديناميكي: يُستدعى scan() بعد كل إعادة رسم لـ #view.
   - العناصر التي ظهرت سابقاً في نفس المسار (مثل إعادة الرسم بعد «حفظ») لا تُعاد حركتها.
   - محتوى القراءة (.art: التقرير والإعدادات) بلا حركة. */
import { env, noop } from './core.js';

var SEL = '.card,.stat,.tile,.ticker,.state,.panel,.sec-h,.sec>h2,.sec-d,.sec>.cos,.brand-hero-copy>*,.brand-mark';

function keyOf(el) {
  if (el.classList.contains('card')) {
    var a = el.querySelector('.acts a[href]'), h = el.querySelector('h2');
    return 'c|' + (a ? a.href : h ? h.textContent : '');
  }
  var t = (el.querySelector('h2,h3,span,b') || el).textContent || '';
  return el.className + '|' + t.trim().slice(0, 60);
}

export function create(ctx) {
  if (env.reduced || !('IntersectionObserver' in window)) return noop;
  var view = ctx.view, seen = new Set(), route = null;

  var io = new IntersectionObserver(function (entries) {
    var vis = entries.filter(function (e) { return e.isIntersecting; })
      .sort(function (a, b) { return a.target.__fi - b.target.__fi; });
    vis.forEach(function (e, n) {
      var el = e.target, d = Math.min(n, 8) * 55;
      io.unobserve(el);
      el.style.setProperty('--fx-d', d + 'ms');
      el.classList.add('fx-in');
      /* بعد انتهاء الحركة تعود العناصر لحالتها الطبيعية كي لا يتعارض transform مع الإمالة */
      setTimeout(function () { el.classList.remove('fx-r', 'fx-in'); el.style.removeProperty('--fx-d'); }, d + 800);
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -4% 0px' });

  function scan() {
    var r = location.hash.split('?')[0] || '#/home';
    if (r !== route) { seen.clear(); route = r; }      /* تغيّر المسار: أعد الحركة للجميع */
    io.disconnect();                                    /* العناصر القديمة أُزيلت من الصفحة */
    var keys = new Set(), i = 0;
    view.querySelectorAll(SEL).forEach(function (el) {
      if (el.closest('.art')) return;
      var k = keyOf(el); keys.add(k);
      if (seen.has(k)) return;
      el.__fi = i++; el.classList.add('fx-r'); io.observe(el);
    });
    keys.forEach(function (k) { seen.add(k); });
  }

  return {
    scan: scan,
    destroy: function () {
      io.disconnect();
      view.querySelectorAll('.fx-r').forEach(function (el) { el.classList.remove('fx-r', 'fx-in'); });
    }
  };
}
