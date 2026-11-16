import { readFile } from 'node:fs/promises';

const cfg = JSON.parse(await readFile('sources.json', 'utf8'));
const allowedRegions = new Set(['gulf', 'asia', 'europe', 'america', 'africa', 'official', 'dev']);
const allowedTypes = new Set(['rss', 'youtube', 'reddit', 'hn', 'github-releases', 'hf-models', 'hf-papers', 'arxiv', 'github-repos', 'bluesky', 'mastodon', 'github-skills', 'site']);
const ids = new Set();
let total = 0;
const errors = [];

for (const group of cfg.groups || []) {
  if (!allowedRegions.has(group.region)) errors.push(`منطقة غير صالحة: ${group.region}`);
  for (const s of group.sources || []) {
    total++;
    if (!s.id || ids.has(s.id)) errors.push(`معرّف مفقود أو مكرر: ${s.id || '(فارغ)'}`);
    ids.add(s.id);
    if (!s.name) errors.push(`${s.id}: الاسم مفقود`);
    if (!allowedTypes.has(s.type)) errors.push(`${s.id}: نوع غير مدعوم ${s.type}`);
    if (!s.cat) errors.push(`${s.id}: التصنيف الافتراضي مفقود`);
    if (s.type === 'rss' && !/^https?:\/\//.test(s.url || '')) errors.push(`${s.id}: رابط RSS غير صالح`);
    if (s.type === 'youtube' && !s.channel_id) errors.push(`${s.id}: channel_id مطلوب`);
    if (s.type === 'reddit' && !s.url && !s.sub) errors.push(`${s.id}: url أو sub مطلوب`);
    if (s.type === 'github-releases' && !/^[^/]+\/[^/]+$/.test(s.repo || '')) errors.push(`${s.id}: repo يجب أن يكون owner/name`);
    if (s.type === 'arxiv' && !s.query) errors.push(`${s.id}: query مطلوب`);
    if (s.type === 'github-skills' && !(Array.isArray(s.repos) && s.repos.length && s.repos.every(r => /^[^/]+\/[^/]+$/.test(r)))) errors.push(`${s.id}: repos يجب أن تكون قائمة owner/name`);
    if (s.type === 'site' && !/^https?:\/\//.test(s.url || '')) errors.push(`${s.id}: رابط الموقع غير صالح`);
    if (s.type === 'bluesky' && !s.actor) errors.push(`${s.id}: actor مطلوب`);
    if (s.type === 'mastodon' && (!s.instance || !s.account)) errors.push(`${s.id}: instance وaccount مطلوبان`);
  }
}
if (!total) errors.push('لا توجد مصادر مهيأة');
if (errors.length) {
  console.error('فشل فحص sources.json:');
  for (const e of errors) console.error(' - ' + e);
  process.exitCode = 1;
} else {
  console.log(`فحص الإعدادات ناجح: ${total} مصدراً، ${ids.size} معرّفاً فريداً.`);
}
