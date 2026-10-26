import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { lightPalette } from '../../packages/design-tokens/src/index.ts';
import { cssTokens } from '../../packages/design-tokens/src/css.ts';
import { legalPages, notOfficialNotice } from '../../packages/study-core/src/legal.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function storeLinks(config, bundleIdentifier) {
  const validate = (value, store) => {
    if (value === null) return null;
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${store}: bağlantı veya null gerekli`);
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error(`${store}: geçersiz bağlantı`);
    if (store === 'appStore' && (url.hostname !== 'apps.apple.com' || !/\/id[1-9]\d*(?:\/|$)/.test(url.pathname))) throw new Error('App Store uygulama bağlantısı gerekli');
    if (store === 'googlePlay' && (url.hostname !== 'play.google.com' || url.pathname !== '/store/apps/details' || url.searchParams.get('id') !== bundleIdentifier)) throw new Error('Google Play uygulama kimliği eşleşmiyor');
    return url.href;
  };
  return { appStore: validate(config.appStoreUrl, 'appStore'), googlePlay: validate(config.googlePlayUrl, 'googlePlay') };
}

function storeCard(store, url) {
  const apple = store === 'appStore';const name = apple ? 'App Store' : 'Google Play';const platform = apple ? 'iPhone ve iPad' : 'Android';
  const content = `<span class="store-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/></svg></span><span class="store-copy"><strong>${name}</strong><span>${platform}</span></span><span class="store-state">${url ? 'İndir ↗' : 'Yakında'}</span>`;
  return url ? `<a class="store-card available" data-store="${store}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${name} üzerinden indir">${content}</a>` : `<div class="store-card pending" data-store="${store}" role="group" aria-label="${name}: yakında">${content}</div>`;
}

export async function buildSite({ output = path.join(root, 'apps/site/dist'), links: suppliedLinks } = {}) {
  const brand = JSON.parse(await readFile(path.join(root, 'config/brand.json'), 'utf8'));
  const legal = JSON.parse(await readFile(path.join(root, 'docs/legal-values.json'), 'utf8'));
  const links = storeLinks(suppliedLinks ?? JSON.parse(await readFile(path.join(root, 'config/store-links.json'), 'utf8')), brand.bundleIdentifier);
  const css = cssTokens()+'\n'+await readFile(path.join(root, 'apps/site/styles.css'), 'utf8');
  const cssName = `site-${createHash('sha256').update(css).digest('hex').slice(0, 12)}.css`;
  const values = {
    name: brand.name, subtitle: brand.subtitle, title: brand.displayName, themeColor: lightPalette.navy,
    website: brand.websiteUrl, support: brand.supportEmail, publisher: legal.degerler['yayinci-adi'],
    css: `/site-assets/${cssName}`, notice: notOfficialNotice,
    homeScreen: `/screens/mobile-home.jpg?v=${createHash('sha256').update(await readFile(path.join(root, 'apps/site/public/screens/mobile-home.jpg'))).digest('hex').slice(0, 12)}`,
    stores: storeCard('appStore', links.appStore)+storeCard('googlePlay', links.googlePlay),
    storeNotice: links.appStore || links.googlePlay ? '' : '<p class="store-notice">Mağaza yayını hazırlanıyor. Bağlantılar burada yer alacak.</p>',
    legal: legalPages.map(page => `<a href="${page.file}">${escapeHtml(page.title)}</a>`).join(''),
  };
  const template = await readFile(path.join(root, 'apps/site/index.html'), 'utf8');
  const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Bilinmeyen şablon alanı: ${key}`);
    return ['stores', 'storeNotice', 'legal'].includes(key) ? values[key] : escapeHtml(values[key]);
  });
  await rm(output, { recursive: true, force: true });await mkdir(path.join(output, 'site-assets'), { recursive: true });
  await writeFile(path.join(output, 'index.html'), html);await writeFile(path.join(output, 'site-assets', cssName), css);
  for (const name of ['brand-logo.png', 'favicon.png', 'fonts', 'legal']) await cp(path.join(root, 'apps/web/public', name), path.join(output, name), { recursive: true });
  await cp(path.join(root, 'apps/site/public/screens'), path.join(output, 'screens'), { recursive: true });
  return { output, links, files: ['index.html', `site-assets/${cssName}`] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildSite();console.log(`Tanıtım sitesi hazır: ${result.output}`);
}
