/* fx/magnetic — جذب مغناطيسي خفيف لزرين رئيسيين فقط: زر الهيرو «استكشف الآفاق» وزر «تحديث».
   يستخدم الخاصية translate (مستقلة عن transform) فلا يتعارض مع تكبير الضغط/التحويم.
   نابض (spring) فيعود بمرونة. نصف قطر التأثير صغير (36px خارج حدود الزر). */
import { env, loop, listeners, clamp, noop } from './core.js';

var SEL = '.brand-actions .btn.primary,#refresh', RADIUS = 36, PULL = 0.3, MAXD = 9, K = 0.16, DAMP = 0.74;

export function create(ctx) {
  if (!env.hoverFx) return noop;
  var L = listeners(), items = new Map(), dirty = true;     /* el -> {x,y,vx,vy,tx,ty,r} */

  function collect() {
    var found = new Set(document.querySelectorAll(SEL));
    items.forEach(function (s, el) { if (!found.has(el)) items.delete(el); });
    found.forEach(function (el) { if (!items.has(el)) items.set(el, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, r: null }); });
    dirty = true;
  }
  function onMove(e) {
    if (e.pointerType !== 'mouse') return;
    var hit = false;
    items.forEach(function (s, el) {
      if (dirty || !s.r) s.r = el.getBoundingClientRect();
      var r = s.r;
      /* الزر مُعطّل أو داخل عنصر مخفي: لا جذب */
      var near = r.width && e.clientX > r.left - RADIUS && e.clientX < r.right + RADIUS && e.clientY > r.top - RADIUS && e.clientY < r.bottom + RADIUS;
      if (near && !el.disabled) {
        s.tx = clamp((e.clientX - (r.left + r.width / 2)) * PULL, -MAXD, MAXD);
        s.ty = clamp((e.clientY - (r.top + r.height / 2)) * PULL, -MAXD, MAXD);
        hit = true;
      } else { s.tx = 0; s.ty = 0; }
    });
    dirty = false;
    loop.add(tick);
  }
  function tick() {
    var busy = false;
    items.forEach(function (s, el) {
      /* نابض: تسارع نحو الهدف مع تخميد → ارتداد مرن عند العودة */
      s.vx = (s.vx + (s.tx - s.x) * K) * DAMP; s.vy = (s.vy + (s.ty - s.y) * K) * DAMP;
      s.x += s.vx; s.y += s.vy;
      var rest = Math.abs(s.x - s.tx) < 0.05 && Math.abs(s.y - s.ty) < 0.05 && Math.abs(s.vx) < 0.05 && Math.abs(s.vy) < 0.05;
      if (rest) { s.x = s.tx; s.y = s.ty; s.vx = s.vy = 0; el.style.translate = s.tx || s.ty ? s.tx.toFixed(2) + 'px ' + s.ty.toFixed(2) + 'px' : ''; if (s.tx || s.ty) busy = true; }
      else { el.style.translate = s.x.toFixed(2) + 'px ' + s.y.toFixed(2) + 'px'; busy = true; }
    });
    return busy;
  }
  function reset() { items.forEach(function (s) { s.tx = s.ty = 0; }); loop.add(tick); }

  L.on(document, 'pointermove', onMove);
  L.on(document.documentElement, 'pointerleave', reset);
  L.on(window, 'scroll', function () { dirty = true; });
  L.on(window, 'resize', function () { dirty = true; });
  L.on(window, 'blur', reset);

  return {
    scan: collect,
    destroy: function () { L.off(); loop.remove(tick); items.forEach(function (s, el) { el.style.translate = ''; }); items.clear(); }
  };
}
