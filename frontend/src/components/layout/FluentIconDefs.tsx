import React from 'react';

/** Gradient tones for Windows 11-style colourful icons (`.fi-<tone>` in theme-fluent.css). */
export type IconTone = 'blue' | 'teal' | 'green' | 'orange' | 'red' | 'purple' | 'pink' | 'gold' | 'slate' | 'accent';

const TONES: IconTone[] = ['blue', 'teal', 'green', 'orange', 'red', 'purple', 'pink', 'gold', 'slate'];

/**
 * Hidden SVG holding the icon gradients, mounted once in the layout.
 * userSpaceOnUse over the 24×24 icon grid: with the default bounding-box units,
 * perfectly straight strokes (e.g. a minus sign) have a zero-height box and vanish.
 * Colours are CSS variables so dark mode can brighten the deep end.
 */
export const FluentIconDefs: React.FC = () => (
  <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
    <defs>
      {TONES.map((t) => (
        <linearGradient key={t} id={`fl-g-${t}`} gradientUnits="userSpaceOnUse" x1="3" y1="3" x2="21" y2="21">
          <stop offset="0" style={{ stopColor: `var(--fl-${t}-a)` }} />
          <stop offset="1" style={{ stopColor: `var(--fl-${t}-b)` }} />
        </linearGradient>
      ))}
      {/* Follows the business accent colour */}
      <linearGradient id="fl-g-accent" gradientUnits="userSpaceOnUse" x1="3" y1="3" x2="21" y2="21">
        <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--color-primary) 55%, #ffffff)' }} />
        <stop offset="1" style={{ stopColor: 'var(--color-primary)' }} />
      </linearGradient>
    </defs>
  </svg>
);

export default FluentIconDefs;
