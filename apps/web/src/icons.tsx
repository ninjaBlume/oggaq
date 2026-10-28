import { createElement, type CSSProperties } from 'react';
import { iconNodes, type IconName } from '@oggaq/design-tokens';

export function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className} style={style}>{iconNodes[name].map(([tag, attributes], index) => createElement(tag, { ...attributes, key: index }))}</svg>;
}
