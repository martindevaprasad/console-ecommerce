/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Warm saffron brand that reads well under bright restaurant lighting.
        brand: {
          50: '#FFF5ED',
          100: '#FFE8D4',
          200: '#FFCDA8',
          300: '#FFAA70',
          400: '#FF7B37',
          500: '#F95A10',
          600: '#EA4006',
          700: '#C22E07',
          800: '#9A260E',
          900: '#7C230F',
        },
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
