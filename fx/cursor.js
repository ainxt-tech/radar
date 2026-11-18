/* fx/cursor — حلقة صغيرة تتبع المؤشر بتخفيف طبيعي.
   لا تُخفي مؤشر النظام أبداً (pointer-events:none ولا نلمس cursor).
   تختفي فوق النصوص والحقول والروابط والأزرار، وأثناء الضغط/السحب (تحديد النص)، وعند خروج المؤشر من النافذة.
   تحديث الحالة عند pointerover فقط (لا closest() على كل حركة). */
import { env, loop, damp, listeners, noop } from './core.js';

var BLOCK = 'a,button,input,select,textarea,label,option,summary,[contenteditable],p,h1,h2,h3,h4,li,small,span,b,i,.sum,.sumbox,.nums,.ft,.toast';

export function create() {
  if (!env.hoverFx) return noop;
  var L = listeners(), el = document.createElement('div'), ring = document.createElement('i');
  el.className = 'fx-cursor'; el.setAttribute('aria-hidden', 'true'); el.appendChild(ring); document.body.appendChild(el);
  var x = 0, y = 0, tx = 0, ty = 0, first = true, inside = true, ok = false, down = false;

  function state() { el.classList.toggle('on', inside && ok && !down); }
  function onOver(e) {
    if (e.pointerType !== 'mouse') return;
    var t = e.target;
    ok = !(t.closest && t.closest(BLOCK));
    el.classList.toggle('big', !!(ok && t.closest && t.closest('.card,.tile,.stat')));
    state();
  }
  function onMove(e) {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (first) { x = tx; y = ty; first = false; }
    loop.add(tick);
  }
  function tick(dt) {
    var k = damp(0.2, dt);
    x += (tx - x) * k; y += (ty - y) * k;
    el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    return Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1;
  }

  L.on(document, 'pointerover', onOver);
  L.on(document, 'pointermove', onMove);
  L.on(document, 'pointerdown', function () { down = true; state(); });
  L.on(document, 'pointerup', function () { down = false; state(); });
  L.on(document, 'pointercancel', function () { down = false; state(); });
  L.on(document.documentElement, 'pointerleave', function () { inside = false; state(); });
  L.on(document.documentElement, 'pointerenter', function () { inside = true; state(); });
  L.on(window, 'blur', function () { inside = false; state(); });

  return { scan: function () {}, destroy: function () { L.off(); loop.remove(tick); el.remove(); } };
}
