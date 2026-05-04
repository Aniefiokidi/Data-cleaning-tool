import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1F3864',
        secondary: '#2E75B6',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        critical: '#991b1b',
        backgroundLight: '#f8fafc',
        backgroundDark: '#0f172a',
        cardDark: '#1e293b',
        sidebarDark: '#1a2234',
      },
      borderRadius: {
        xl: '0.85rem',
      },
      boxShadow: {
        soft: '0 6px 24px rgba(15, 23, 42, 0.08)',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 350ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
