/* fx/tilt — إمالة ثلاثية الأبعاد خفيفة للبطاقات (حد أقصى 6°) بتفويض حدث واحد على #view.
   الإحداثيات فيزيائية (clientX/Y) فلا يتأثر الاتجاه باللغة RTL. الكتابة على transform فقط. */
import { env, loop, damp, clamp, listeners, noop } from './core.js';

var MAX = 6, PERSP = 900;

export function create(ctx) {
  if (!env.hoverFx) return noop;
  var view = ctx.view, L = listeners(), states = new Map(), active = null, rect = null, dirty = true;

  function release() {
    if (active) { var s = states.get(active); if (s) { s.tx = 0; s.ty = 0; s.ta = 0; } active = null; rect = null; loop.add(tick); }
  }
  function onMove(e) {
    if (e.pointerType !== 'mouse') return;
    if (e.buttons) { release(); return; }                       /* أثناء السحب/تحديد النص: لا إمالة */
    var c = e.target.closest ? e.target.closest('.card') : null;
    if (c && c.classList.contains('fx-r')) c = null;             /* ما زالت تدخل */
    if (c !== active) {
      release();
      if (!c) return;
      active = c; dirty = true;
      var s = states.get(c);
      if (!s) { s = { rx: 0, ry: 0, a: 0, tx: 0, ty: 0, ta: 0 }; states.set(c, s); }
      c.classList.add('fx-tilt');
    }
    if (!active) return;
    if (dirty || !rect) { rect = active.getBoundingClientRect(); dirty = false; }
    var px = clamp((e.clientX - rect.left) / rect.width, 0, 1), py = clamp((e.clientY - rect.top) / rect.height, 0, 1), s2 = states.get(active);
    s2.ty = (px - 0.5) * 2 * MAX;          /* الطرف المضغوط يبتعد */
    s2.tx = (0.5 - py) * 2 * MAX;
    s2.ta = 1;
    loop.add(tick);
  }
  function tick(dt) {
    var k = damp(0.14, dt), busy = false;
    states.forEach(function (s, el) {
      s.rx += (s.tx - s.rx) * k; s.ry += (s.ty - s.ry) * k; s.a += (s.ta - s.a) * k;
      var rest = el !== active && Math.abs(s.rx) < 0.02 && Math.abs(s.ry) < 0.02 && s.a < 0.002;
      if (rest) { el.style.transform = ''; el.classList.remove('fx-tilt'); states.delete(el); return; }
      el.style.transform = 'perspective(' + PERSP + 'px) rotateX(' + s.rx.toFixed(2) + 'deg) rotateY(' + s.ry.toFixed(2) + 'deg) scale(' + (1 + 0.012 * s.a).toFixed(4) + ')';
      busy = true;
    });
    return busy;
  }

  L.on(view, 'pointermove', onMove);
  L.on(view, 'pointerleave', release);
  L.on(window, 'blur', release);
  L.on(window, 'scroll', function () { dirty = true; });
  L.on(window, 'resize', function () { dirty = true; });

  return {
    scan: function () {                       /* أُعيد بناء المحتوى: أسقط الحالات القديمة */
      states.clear(); active = null; rect = null; loop.remove(tick);
    },
    destroy: function () {
      L.off(); loop.remove(tick);
      states.forEach(function (s, el) { el.style.transform = ''; el.classList.remove('fx-tilt'); });
      states.clear();
    }
  };
}
