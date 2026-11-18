/* fx/nav — مؤشر نشط متحرك تحت رابط الصفحة الحالية (transform فقط).
   الاتجاه RTL: القياس يعتمد على offsetLeft/offsetWidth الفيزيائيين داخل الحاوية نفسها.
   التحويم والتركيز بالكيبورد بخطوط سفلية عبر CSS (انظر fx.css). */
import { listeners, noop } from './core.js';

export function create() {
  var nav = document.getElementById('nav');
  if (!nav) return noop;
  var L = listeners(), ind = nav.querySelector('.fx-ind'), ready = false, ro = null;
  if (!ind) { ind = document.createElement('span'); ind.className = 'fx-ind'; ind.setAttribute('aria-hidden', 'true'); nav.appendChild(ind); }
  nav.classList.add('fx-nav-on');

  function update() {
    var a = nav.querySelector('a[aria-current="page"]');
    if (!a || !nav.offsetWidth) { ind.style.opacity = '0'; return; }     /* مخفي على الجوال */
    var x = a.offsetLeft, w = a.offsetWidth;
    ind.style.opacity = '1';
    ind.style.transform = 'translateX(' + x + 'px) scaleX(' + (w / 100).toFixed(4) + ')';
    /* أبقِ الرابط النشط ظاهراً داخل الشريط القابل للتمرير (بدون تمرير الصفحة) */
    var l = a.offsetLeft - nav.scrollLeft, r = l + w;
    if (l < 0) nav.scrollLeft += l - 12; else if (r > nav.clientWidth) nav.scrollLeft += r - nav.clientWidth + 12;
    if (!ready) { ready = true; requestAnimationFrame(function () { nav.classList.add('fx-nav-ready'); }); }
  }
  if ('ResizeObserver' in window) { ro = new ResizeObserver(update); ro.observe(nav); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
  L.on(window, 'resize', update);

  return {
    scan: update,
    destroy: function () { L.off(); if (ro) ro.disconnect(); nav.classList.remove('fx-nav-on', 'fx-nav-ready'); ind.remove(); }
  };
}
