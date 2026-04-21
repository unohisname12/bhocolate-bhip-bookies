/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          50:  '#fbf4e8',
          100: '#f3e7cf',
          200: '#e6d0a6',
          300: '#c9a877',
          400: '#9e7a4c',
          500: '#6e4f2e',
          600: '#4e361f',
          700: '#362416',
          800: '#241510',
          900: '#140a08',
        },
        ember: {
          DEFAULT: '#f59e0b',
          hover:   '#fbbf24',
          shadow:  '#b45309',
        },
        brass:    '#d4a94d',
        copper:   '#c2410c',
        teal:     '#0ea5a5',
        plum:     '#9d174d',
        sage:     '#65a30d',
        ok:       '#84cc16',
        bad:      '#dc2626',
        badLight: '#f87171',
        token:    '#fbbf24',
        coin:     '#fde68a',
        mp:       '#f59e0b',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['Cinzel', 'Inter', 'serif'],
      },
      boxShadow: {
        btnPrimary:   '0 4px 0 0 #b45309',
        btnSecondary: '0 4px 0 0 #241510',
        btnDanger:    '0 4px 0 0 #7f1d1d',
        card:         '0 10px 20px -5px rgba(0,0,0,0.6), 0 4px 8px -4px rgba(120,60,20,0.3)',
        panel:        '0 4px 24px rgba(0,0,0,0.6)',
        hotbarBtn:    '0 2px 8px rgba(0,0,0,0.5)',
        modal:        '0 25px 50px -12px rgba(0,0,0,0.6)',
        glowEmber:    '0 0 18px rgba(245,158,11,0.5)',
        glowCandle:   '0 0 30px rgba(252,211,77,0.35)',
        glowOk:       '0 0 24px rgba(132,204,22,0.35)',
      },
      borderRadius: {
        chamber: '2rem',
      },
      letterSpacing: {
        widest2: '0.1em',
      },
    },
  },
  plugins: [],
}
