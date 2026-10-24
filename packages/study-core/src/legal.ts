// Public legal and support pages: static HTML in apps/web/public/legal, served by the web origin. Web and mobile link
// to the same files so a store listing, the web footer and the apps never disagree about where a page lives.
export const legalPages = [
  { id: 'gizlilik', title: 'Gizlilik Politikası', file: '/legal/gizlilik.html' },
  { id: 'kosullar', title: 'Kullanım Koşulları', file: '/legal/kosullar.html' },
  { id: 'destek', title: 'Destek', file: '/legal/destek.html' },
  { id: 'hesap-silme', title: 'Hesap silme', file: '/legal/hesap-silme.html' },
] as const;
export type LegalPageId = (typeof legalPages)[number]['id'];

// Same wording as the Kullanım Koşulları page; keep both in step.
export const notOfficialNotice = 'Bu uygulama resmî bir kurum uygulaması değildir; Emniyet Genel Müdürlüğü veya başka bir resmî kurumla bağlantılı değildir.';
export const scoreEstimateNotice = 'Hesaplama bir tahmindir ve resmî sınav sonucu değildir.';

// Absolute address of a legal page under the web origin `base` (no trailing slash needed).
export function legalUrl(base: string, id: LegalPageId): string {
  const page = legalPages.find((item) => item.id === id);
  if (!page) throw new Error(`Bilinmeyen yasal sayfa: ${id}`);
  return `${base.replace(/\/+$/, '')}${page.file}`;
}
