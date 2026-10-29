import { BrandWordmark } from './ui';
import { legalPages, notOfficialNotice, privacyNoticeFile } from '@oggaq/study-core';
import { brand } from './config';

// Links to the public static pages (apps/web/public/legal). Plain anchors that open a new tab: the pages are not part
// of the single-page app and a half-filled form must not be lost.
export function LegalLinks() {
  return <nav className="legal-links" aria-label="Yasal sayfalar">{legalPages.map((page) => <a key={page.id} href={page.file} target="_blank" rel="noopener">{page.title}</a>)}</nav>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <LegalLinks />
    <p><BrandWordmark /> · {brand.subtitle}</p>
    <p className="legal-official">{notOfficialNotice}</p>
    {brand.supportEmail && <p><a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a></p>}
  </footer>;
}

// A versioned disclosure, separate from terms acceptance; never a blanket consent.
export function RegisterNotice() {
  const [terms, privacy] = [legalPages[1], legalPages[0]];
  return <p className="legal-consent">Kayıt olarak <a href={terms.file} target="_blank" rel="noopener">{terms.title}</a>’nı kabul edersin. Verilerinin işlenmesini <a href={privacyNoticeFile} target="_blank" rel="noopener">{privacy.title}</a>’nda açıklıyoruz. Bu, açık rıza talebi değildir.</p>;
}

export function PrivacyNoticeLink() {
  return <p className="muted">Codentum’un veri işleme amaçları, alıcıları, saklama süreleri ve hakların için <a href={privacyNoticeFile} target="_blank" rel="noopener" style={{ textDecorationLine: 'underline' }}>KVKK aydınlatma metni</a>.</p>;
}
