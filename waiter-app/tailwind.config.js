/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Business accent colour (set in the POS). Shades are CSS variables filled at runtime
        // from the accent (src/lib/theme.ts); global.css holds the POS-blue defaults.
        brand: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((k) => [k, `rgb(var(--brand-${k}) / <alpha-value>)`])),
        ink: {
          DEFAULT: '#14161C',
          soft: '#3A3F4B',
          muted: '#6B7280',
          faint: '#9CA3AF',
        },
        canvas: '#F6F4F1',
        surface: '#FFFFFF',
        line: '#ECE8E3',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
