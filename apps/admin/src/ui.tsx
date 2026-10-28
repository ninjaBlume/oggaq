import { brand } from './config';
import brandLogo from '../../mobile/assets/brand-logo.png';
import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '@oggaq/api-client';

export { Icon } from './icons';
import { Icon } from './icons';

export function Loading({ text = 'Yükleniyor…' }: { text?: string }) {
  return <div className="loading" role="status"><span className="spinner" />{text}</div>;
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'İşlem tamamlanamadı. Lütfen yeniden deneyin.';
}

export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="notice error" role="alert"><div><strong>İşlem tamamlanamadı</strong><p>{errorMessage(error)}</p></div>{retry && <button className="button secondary small" onClick={retry}>Yeniden dene</button>}</div>;
}

export function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: (attributes: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode }) {
  const prefix = useId();
  const id = `${prefix}-${name}`;
  return <div className="field"><label htmlFor={id}>{label}</label>{children({ id, 'aria-invalid': !!error, 'aria-describedby': error || hint ? `${id}-help` : undefined })}{(error || hint) && <span id={`${id}-help`} className={error ? 'field-error' : 'field-hint'}>{error || hint}</span>}</div>;
}

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!previousFocus.current && document.activeElement instanceof HTMLElement) previousFocus.current = document.activeElement;
    element?.showModal();
    return () => { element?.close(); previousFocus.current?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className={`modal ${wide ? 'wide' : ''}`} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="modal-heading"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Pencereyi kapat" onClick={onClose}><Icon name="close" /></button></header>
    {children}
  </dialog>;
}

const NotificationContext = createContext<(message: string) => void>(() => {});
export function useNotify() { return useContext(NotificationContext); }
export function Notifications({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  return <NotificationContext.Provider value={setMessage}>{children}{message && <div className="toast" role="status"><Icon name="check" /><span>{message}</span><button className="icon-button" aria-label="Bildirimi kapat" onClick={() => setMessage('')}><Icon name="close" size={16} /></button></div>}</NotificationContext.Provider>;
}

export function Status({ published, pending }: { published: boolean; pending?: boolean }) {
  return <span className={`badge ${published && !pending ? 'green' : 'amber'}`}><span />{pending && published ? 'Değişiklik bekliyor' : published ? 'Yayında' : 'Taslak'}</span>;
}

export function dateLabel(value: string | null | undefined): string {
  return value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Henüz yayımlanmadı';
}

// The adjacent wordmark provides the accessible brand name.
export function BrandLogo() {
  return <img className="brand-logo" src={brandLogo} width={48} height={48} alt="" decoding="async" />;
}

export function BrandWordmark() {
  return <span className="brand-wordmark">{brand.name}</span>;
}
