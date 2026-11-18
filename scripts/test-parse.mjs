// اختبار محلّل الخلاصات: الوظيفة + مقاومة المدخلات الخبيثة (ReDoS). يخرج برمز 1 عند أي فشل.
// تشغيل: node scripts/test-parse.mjs
import { parseFeed, _t } from './update.mjs';

const LIMIT_MS = 1500;   // أي حالة خبيثة يجب أن تنتهي خلال هذا الحد (فعلياً أقل بكثير)
let failed = 0;
const fail = m => { failed++; console.error('✗ ' + m); };
const ok = m => console.log('✓ ' + m);
const eq = (name, got, want) => (JSON.stringify(got) === JSON.stringify(want) ? ok(name) : fail(`${name}\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي:  ${JSON.stringify(got)}`));
const timed = (name, fn) => {
  const t = Date.now(); let err = '';
  try { fn(); } catch (e) { err = ' (رمى ' + e.name + ')'; }
  const ms = Date.now() - t;
  if (err) fail(name + err); else if (ms > LIMIT_MS) fail(`${name}: ${ms}ms > ${LIMIT_MS}ms`); else ok(`${name}: ${ms}ms`);
};
const D = 'Mon, 01 Jan 2024 00:00:00 GMT';
const rss = inner => `<?xml version="1.0"?><rss><channel>${inner}</channel></rss>`;

/* ---------- الوظيفة ---------- */
{
  const r = parseFeed(rss(`<item><title><![CDATA[خبر & عنوان]]></title><link>https://a.com/1?x=1&amp;y=2</link><pubDate>${D}</pubDate>
    <description><![CDATA[<p>نص <b>غامق</b> &amp; كيان &#1575;&#x62A;</p>]]></description></item>`));
  eq('RSS: CDATA وكيانات', r.map(x => [x.t, x.u, x.s]), [['خبر & عنوان', 'https://a.com/1?x=1&y=2', 'نص غامق & كيان ات']]);
}
{
  const r = parseFeed(`<feed><entry><title>Atom</title><link rel="enclosure" href="https://a.com/file.mp3"/><link rel="alternate" href="https://a.com/post"/><updated>2024-01-01T00:00:00Z</updated><summary>s</summary></entry></feed>`);
  eq('Atom: يفضّل rel=alternate', r.map(x => x.u), ['https://a.com/post']);
}
{
  const r = parseFeed(`<feed><entry><title>Atom2</title><link href="https://a.com/only"/><published>2024-01-01T00:00:00Z</published></entry></feed>`);
  eq('Atom: رابط وحيد بلا rel', r.map(x => x.u), ['https://a.com/only']);
}
{
  const r = parseFeed(`<RSS><CHANNEL><ITEM><TITLE>Upper</TITLE><LINK>https://a.com/u</LINK><PUBDATE>${D}</PUBDATE><DESCRIPTION>d</DESCRIPTION></ITEM></CHANNEL></RSS>`);
  eq('أسماء وسوم بأحرف كبيرة', r.map(x => [x.t, x.u, x.s]), [['Upper', 'https://a.com/u', 'd']]);
}
{
  let r; try { r = parseFeed(rss(`<item><title>t &#99999999; &#x110000; &#xD800; u</title><link>https://a.com/n</link><pubDate>${D}</pubDate></item>`)); } catch (e) { fail('رمز رقمي خارج النطاق رمى ' + e.name); }
  if (r) eq('رمز رقمي خارج النطاق لا يرمي', r.length, 1);
}
{
  const r = parseFeed(rss(`<item><title>غير مغلق</title><link>https://a.com/x</link><pubDate>${D}</pubDate></item><item><title>بلا إغلاق</title>`));
  eq('عنصر أخير بلا إغلاق يُهمَل والباقي يعمل', r.length, 1);
}
{
  const r = parseFeed(`<rss><item><title>مختلط</title></item><feed><entry><title>E</title><link href="https://a.com/e"/><updated>2024-01-01T00:00:00Z</updated></entry></feed></rss>`);
  eq('item بلا إغلاق لا يُسقط entry لاحقة', r.map(x => x.t), ['E']);
}
eq('toLowerCase غير آمن لا يفسد الفهارس (İ)', parseFeed(rss(`<item><title>İİİİ</title><link>https://a.com/i</link><pubDate>${D}</pubDate><description>İstanbul</description></item>`)).map(x => [x.t, x.s]), [['İİİİ', 'İstanbul']]);
eq('الحقل الطويل يُقصّ (لا ينهار)', _t.strip('<p>' + 'x'.repeat(50000) + '</p>').length <= 20000, true);
eq('CDATA طويل غير مغلق لا يترك <![CDATA[', _t.strip('<![CDATA[' + 'ab '.repeat(10000)).startsWith('ab'), true);

/* ---------- زمن خطّي على مدخلات خبيثة ---------- */
const wrap = x => rss(`<item><title>t</title><link>https://a.com/x</link><pubDate>${D}</pubDate>${x}</item>`);
timed('مليون "<" في الوصف (parseFeed)', () => parseFeed(wrap('<description>' + '<'.repeat(1e6) + '</description>')));
timed('90 ألف "<" في الوصف داخل حد الكتلة', () => parseFeed(wrap('<description>' + '<'.repeat(90000) + '</description>')));
timed('300 ألف "&lt;" في الوصف', () => parseFeed(wrap('<description>' + '&lt;'.repeat(3e5) + '</description>')));
timed('<![CDATA[ متكرر بلا إغلاق (parseFeed)', () => parseFeed(wrap('<description>' + '<![CDATA['.repeat(1e5) + '</description>')));
timed('<![CDATA[ متكرر بلا إغلاق (strip مباشرة)', () => _t.strip('<![CDATA['.repeat(1e5)));
timed('200 ألف <item> بلا إغلاق', () => parseFeed('<rss>' + '<item>'.repeat(2e5) + '</rss>'));
timed('200 ألف <entry> بلا إغلاق', () => parseFeed('<feed>' + '<entry>'.repeat(2e5) + '</feed>'));
timed('300 ألف "<link " بلا ">" داخل entry (parseFeed)', () => parseFeed('<feed><entry><title>t</title>' + '<link '.repeat(3e5) + '</entry></feed>'));
timed('300 ألف "<link " بلا ">" (tagsOf مباشرة)', () => { for (const _ of _t.tagsOf('<link '.repeat(3e5), 'link')); });
timed('آلاف <link/> داخل entry واحد (tagsOf)', () => { for (const _ of _t.tagsOf('<link href="x"/>'.repeat(5e4), 'link')); });
timed('200 ألف "<title " داخل item (parseFeed)', () => parseFeed('<rss><item>' + '<title '.repeat(2e5) + '</item></rss>'));
timed('200 ألف "<title " (tag مباشرة)', () => _t.tag('<title '.repeat(2e5), 'title'));
timed('200 ألف "<title>" بلا إغلاق (tag مباشرة)', () => _t.tag('<title>'.repeat(2e5), 'title'));
timed('كتل كثيرة صالحة (حد MAX_BLOCKS)', () => { const r = parseFeed(rss(`<item><title>t</title><link>https://a.com/x</link><pubDate>${D}</pubDate></item>`.repeat(5e4))); if (r.length > 500) throw new Error('تجاوز MAX_BLOCKS'); });
timed('discoverFeeds: HTML به 300 ألف "<link " بلا ">"', () => { for (const _ of _t.tagsOf(('<link ' .repeat(3e5)).slice(0, 500000), 'link')); });

if (failed) { console.error(`\nفشل ${failed} اختبار`); process.exit(1); }
console.log('\nنجحت كل الاختبارات');
