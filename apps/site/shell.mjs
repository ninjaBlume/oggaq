import { legalPages, notOfficialNotice } from '../../packages/study-core/src/legal.ts';

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// The landing template owns the shared header/footer; legal pages are generated from it.
export function legalShell(template, brand, activePage) {
  const links = legalPages.map(page => `<a href="${page.file}"${page.id === activePage ? ' aria-current="page"' : ''}>${escapeHtml(page.title)}</a>`).join('');
  const values = { name: brand.name, subtitle: brand.subtitle, notice: notOfficialNotice, legal: links };
  const render = source => source.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Bilinmeyen ortak sayfa alanı: ${key}`);
    return key === 'legal' ? values[key] : escapeHtml(values[key]);
  }).replaceAll('href="#', 'href="/#');
  const header = template.match(/<header\b[\s\S]*?<\/header>/)?.[0];
  const footer = template.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
  if (!header || !footer) throw new Error('Ana sayfada ortak header/footer bulunamadı.');
  return { header: render(header), footer: render(footer), navigation: `<nav class="legal-nav wrap" aria-label="Bilgi ve destek">${links}</nav>` };
}
