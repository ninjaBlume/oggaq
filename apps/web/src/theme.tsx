import { useSyncExternalStore } from 'react';
import { themePreferenceLabels, themePreferences } from '@oggaq/design-tokens';
import type { ThemePreference } from '@oggaq/design-tokens';

// The choice is a per-device convenience (never sent to the server). It is written only when the user changes it;
// `system` removes the key so the device setting decides. index.html applies it before the first paint.
export const themeStorageKey = 'oggaq-theme';

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(themeStorageKey);
    return themePreferences.find((item) => item === stored) ?? 'system';
  } catch {
    return 'system';
  }
}

let current = readPreference();
const listeners = new Set<() => void>();

function applyTheme(preference: ThemePreference) {
  if (preference === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', preference);
}

export function setThemePreference(next: ThemePreference) {
  current = next;
  try {
    if (next === 'system') localStorage.removeItem(themeStorageKey);
    else localStorage.setItem(themeStorageKey, next);
  } catch {
    // Storage may be blocked; the choice then lasts until the page is closed.
  }
  applyTheme(next);
  listeners.forEach((listener) => listener());
}

export function useThemePreference() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => current, () => 'system' as const);
}

const icons: Record<ThemePreference, string> = {
  system: 'M4 5h16v11H4zM9 20h6M12 16v4',
  light: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4',
  dark: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
};

// Three icon buttons in one radio group; the accessible name of each is its label.
export function ThemeSwitch() {
  const preference = useThemePreference();
  return <div className="theme-switch" role="radiogroup" aria-label="Görünüm">
    {themePreferences.map((item) => <button key={item} type="button" role="radio" aria-checked={preference === item} aria-label={themePreferenceLabels[item]} title={themePreferenceLabels[item]} onClick={() => setThemePreference(item)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[item]} /></svg>
    </button>)}
  </div>;
}
