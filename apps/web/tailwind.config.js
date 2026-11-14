/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B1F3A',
          700: '#1E3A5F',
        },
        blue: {
          600: '#1D4ED8',
        },
        bg: '#F7F8FA',
        surface: '#FFFFFF',
        border: '#D9DEE7',
        text: '#111827',
        'text-muted': '#5B6472',
        valid: {
          fg: '#15803D',
          bg: '#ECFDF3',
        },
        revoked: {
          fg: '#B91C1C',
          bg: '#FEF2F2',
        },
        mismatch: {
          fg: '#B91C1C',
          bg: '#FEF2F2',
        },
        siginvalid: {
          fg: '#B91C1C',
          bg: '#FEF2F2',
        },
        untrusted: {
          fg: '#C2410C',
          bg: '#FFF4ED',
        },
        expired: {
          fg: '#B45309',
          bg: '#FFFBEB',
        },
        notfound: {
          fg: '#475569',
          bg: '#F1F5F9',
        },
        unavailable: {
          fg: '#475569',
          bg: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        serif: ['Source Serif 4', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}