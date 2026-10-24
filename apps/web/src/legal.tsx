import { legalPages, notOfficialNotice } from '@oggaq/study-core';
import { brand } from './config';

// Links to the public static pages (apps/web/public/legal). Plain anchors that open a new tab: the pages are not part
// of the single-page app and a half-filled form must not be lost.
export function LegalLinks() {
  return <nav className="legal-links" aria-label="Yasal sayfalar">{legalPages.map((page) => <a key={page.id} href={page.file} target="_blank" rel="noopener">{page.title}</a>)}</nav>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <LegalLinks />
    <p>{brand.name} · {brand.subtitle}</p>
    <p className="legal-official">{notOfficialNotice}</p>
    {brand.supportEmail && <p><a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a></p>}
  </footer>;
}

// Shown under the registration form. A notice, not a stored consent: the API records no consent.
export function RegisterNotice() {
  const [terms, privacy] = [legalPages[1], legalPages[0]];
  return <p className="legal-consent">Kayıt olarak <a href={terms.file} target="_blank" rel="noopener">{terms.title}</a>’nı ve <a href={privacy.file} target="_blank" rel="noopener">{privacy.title}</a>’nı okuduğunu kabul edersin.</p>;
}
