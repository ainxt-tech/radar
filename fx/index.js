/* fx/index — نقطة الدخول. تُحمَّل بعد app.js ولا تغيّر منطقه.
   - مراقب واحد (MutationObserver) على #view يستدعي scan() لكل وحدة بعد كل إعادة رسم (محتوى ديناميكي).
   - عند تغيّر تفضيل الحركة أو نوع المؤشر تُهدم الوحدات وتُبنى من جديد (لا تسريب مستمعين).
   - فشل وحدة واحدة لا يوقف البقية. */
import { env, onEnvChange } from './core.js';
import * as reveal from './reveal.js';
import * as tilt from './tilt.js';
import * as hero from './hero.js';
import * as magnetic from './magnetic.js';
import * as cursor from './cursor.js';
import * as nav from './nav.js';

var view = document.getElementById('view'), root = document.documentElement, mods = [];

function safe(fn, label) { try { return fn(); } catch (e) { console.warn('[fx:' + label + ']', e); } }

function boot() {
  root.classList.toggle('fx-on', !env.reduced);
  root.classList.toggle('fx-fine', env.hoverFx);
  mods = [['reveal', reveal], ['tilt', tilt], ['hero', hero], ['magnetic', magnetic], ['cursor', cursor], ['nav', nav]]
    .map(function (m) { return { n: m[0], i: safe(function () { return m[1].create({ view: view }); }, m[0]) }; })
    .filter(function (m) { return m.i; });
  scan();
}
function scan() { mods.forEach(function (m) { if (m.i.scan) safe(m.i.scan, m.n); }); }
function teardown() { mods.forEach(function (m) { safe(m.i.destroy, m.n); }); mods = []; }

if (view) {
  new MutationObserver(scan).observe(view, { childList: true });
  boot();
  onEnvChange(function () { teardown(); boot(); });
}
