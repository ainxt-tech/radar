/* fx/core — أساس مشترك: بيئة الجهاز، حلقة rAF واحدة، أدوات رياضية.
   الحلقة تنام تلقائياً عندما لا توجد مهام (صفر تكلفة أثناء السكون). */

export const mqFine = matchMedia('(hover:hover) and (pointer:fine)');
export const mqReduce = matchMedia('(prefers-reduced-motion:reduce)');

export const env = {
  get reduced() { return mqReduce.matches; },
  get fine() { return mqFine.matches; },
  /* تأثيرات تعتمد على المؤشر: ماوس دقيق + حركة مسموحة */
  get hoverFx() { return mqFine.matches && !mqReduce.matches; }
};

export function onEnvChange(fn) {
  [mqFine, mqReduce].forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener('change', fn); else mq.addListener(fn);
  });
}

/* ---------- حلقة rAF مشتركة ---------- */
var tasks = new Set(), raf = 0, last = 0;
function frame(t) {
  raf = 0;
  var dt = Math.min(48, last ? t - last : 16.7); last = t;
  tasks.forEach(function (fn) { if (fn(dt, t) === false) tasks.delete(fn); });
  if (tasks.size) raf = requestAnimationFrame(frame); else last = 0;
}
export var loop = {
  /* fn(dt) تُعيد false عندما تستقر فتُزال */
  add: function (fn) { tasks.add(fn); if (!raf) { last = 0; raf = requestAnimationFrame(frame); } },
  remove: function (fn) { tasks.delete(fn); }
};

/* تنعيم مستقل عن معدل الإطارات */
export function damp(k, dt) { return 1 - Math.pow(1 - k, dt / 16.667); }
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

/* مستمعون قابلون للإزالة دفعة واحدة */
export function listeners() {
  var list = [];
  return {
    on: function (t, type, fn, opt) { t.addEventListener(type, fn, opt || { passive: true }); list.push([t, type, fn, opt || { passive: true }]); },
    off: function () { list.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); list = []; }
  };
}

export var noop = { scan: function () {}, destroy: function () {} };
