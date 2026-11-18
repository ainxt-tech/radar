/* fx/hero — تأثيرات الهيرو فقط:
   (7) إضاءة شعاعية تتبع الماوس (lerp)
   (8) برالاكس متعدد الطبقات منخفض الشدة (3 طبقات)
   (9) جسم ثلاثي الأبعاد بـ CSS (جيروسكوب من ثلاث حلقات) يدور بلطف مع حركة الماوس
   كل الكتابة على transform. الطبقات تُحقن مرة لكل بناء للهيرو، والطبقات الثابتة تعمل أيضاً على اللمس وreduced-motion. */
import { env, loop, damp, clamp, listeners } from './core.js';

function div(cls) { var d = document.createElement('div'); d.className = cls; return d; }

export function create(ctx) {
  var view = ctx.view, L = listeners(), hero = null, ref = null, io = null,
      rect = null, dirty = true, hov = false,
      t = { x: 0.5, y: 0.5 }, c = { x: 0.5, y: 0.5 }, mouse = env.hoverFx;

  function build() {
    if (hero.querySelector('.fx-deco')) { grab(); return; }
    var w = div('fx-deco'); w.setAttribute('aria-hidden', 'true');
    var parts = { spot: mouse ? div('fx-spot') : null, dots: div('fx-dots'), a: div('fx-ring a'), b: div('fx-ring b'), obj: div('fx-obj') };
    var rot = div('fx-obj-rot'); rot.appendChild(div('fx-ring3 r1')); rot.appendChild(div('fx-ring3 r2')); rot.appendChild(div('fx-ring3 r3')); rot.appendChild(div('fx-core'));
    parts.obj.appendChild(rot);
    ['spot', 'dots', 'a', 'b', 'obj'].forEach(function (k) { if (parts[k]) w.appendChild(parts[k]); });
    hero.classList.add('fx-hero'); hero.appendChild(w); grab();
  }
  function grab() {
    ref = { spot: hero.querySelector('.fx-spot'), dots: hero.querySelector('.fx-dots'), a: hero.querySelector('.fx-ring.a'), b: hero.querySelector('.fx-ring.b'), obj: hero.querySelector('.fx-obj'), rot: hero.querySelector('.fx-obj-rot') };
  }

  function visibility() {                       /* أوقف الحركة الخلفية خارج الشاشة */
    if (io) { io.disconnect(); io = null; }
    if (!hero || !('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(function (es) { hero && hero.classList.toggle('fx-paused', !es[0].isIntersecting); }, { threshold: 0 });
    io.observe(hero);
  }

  function onMove(e) {
    if (!hero || e.pointerType !== 'mouse') return;
    if (hero.contains(e.target)) {
      if (dirty || !rect) { rect = hero.getBoundingClientRect(); dirty = false; }
      t.x = clamp((e.clientX - rect.left) / rect.width, 0, 1); t.y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      if (!hov) { hov = true; hero.classList.add('fx-hov'); }
      loop.add(tick);
    } else if (hov) leave();
  }
  function leave() {
    if (!hero) return;
    hov = false; hero.classList.remove('fx-hov'); t.x = 0.5; t.y = 0.5; loop.add(tick);
  }
  function tick(dt) {
    if (!hero || !ref) return false;
    var k = damp(0.1, dt), w = rect ? rect.width : 0, h = rect ? rect.height : 0;
    c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k;
    var dx = c.x - 0.5, dy = c.y - 0.5;
    if (ref.spot) ref.spot.style.transform = 'translate3d(' + (c.x * w).toFixed(1) + 'px,' + (c.y * h).toFixed(1) + 'px,0)';
    if (ref.a) ref.a.style.transform = 'translate3d(' + (dx * -16).toFixed(2) + 'px,' + (dy * -10).toFixed(2) + 'px,0) rotate(-22deg)';
    if (ref.b) ref.b.style.transform = 'translate3d(' + (dx * 10).toFixed(2) + 'px,' + (dy * 7).toFixed(2) + 'px,0) rotate(-22deg)';
    if (ref.dots) ref.dots.style.transform = 'translate3d(' + (dx * 26).toFixed(2) + 'px,' + (dy * 18).toFixed(2) + 'px,0)';
    if (ref.rot) ref.rot.style.transform = 'rotateX(' + (-dy * 38).toFixed(2) + 'deg) rotateY(' + (dx * 52).toFixed(2) + 'deg)';
    return hov || Math.abs(t.x - c.x) > 0.0008 || Math.abs(t.y - c.y) > 0.0008;
  }

  if (mouse) {
    L.on(view, 'pointermove', onMove);
    L.on(view, 'pointerleave', leave);
    L.on(window, 'scroll', function () { dirty = true; });
    L.on(window, 'resize', function () { dirty = true; });
  }

  return {
    scan: function () {
      loop.remove(tick); hov = false; rect = null; dirty = true; t.x = t.y = c.x = c.y = 0.5;
      hero = view.querySelector('.brand-hero');
      if (hero) { build(); visibility(); } else { ref = null; if (io) { io.disconnect(); io = null; } }
    },
    destroy: function () { L.off(); loop.remove(tick); if (io) io.disconnect(); }
  };
}
