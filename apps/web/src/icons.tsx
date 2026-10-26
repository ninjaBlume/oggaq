import type { CSSProperties } from 'react';

const paths = {
  calendar: 'M8 2v4m8-4v4M3 10h18M3 5h18v16H3zM7 14h2m3 0h2m3 0h1M7 17h2m3 0h2',
  check: 'M22 11a10 10 0 1 1-6-9M8 11l4 4L22 4',
  external: 'M15 3h6v6m0-6L10 14M11 3H3v18h18v-8',
  arrowLeft: 'm12 5-7 7 7 7M5 12h16',
  briefcase: 'M3 7h18v14H3zM8 7V3h8v4M3 12c6 3 12 3 18 0M12 12v4',
  shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  lock: 'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4M12 14v3',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  eyeOff: 'm3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3 3.8M6.5 6.5A21 21 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.5-1.5M10 10a3 3 0 0 0 4 4',
  book: 'M12 6v15M3 3c4 0 6 1 9 3 3-2 5-3 9-3v15c-4 0-6 1-9 3-3-2-5-3-9-3V3Z',
  chart: 'M4 3v18h17M9 16v-5m5 5V7m5 9v-3',
  cap: 'm2 9 10-6 10 6-10 6L2 9Zm4 3v6c4 3 8 3 12 0v-6M22 9v8',
} as const;

export function Icon({ name, size = 20, className, style }: { name: keyof typeof paths; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}><path d={paths[name]} /></svg>;
}
