import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0C1222',
          card: '#161E2E',
          elevated: '#283548',
          border: '#3A4A5C',
        },
        baize: {
          DEFAULT: '#0EA572',
          light: '#34D399',
          dark: '#0A7B54',
          muted: '#0A3D2E',
        },
        win: {
          DEFAULT: '#22c55e',
          muted: '#166534',
        },
        loss: {
          DEFAULT: '#ef4444',
          muted: '#7f1d1d',
        },
        draw: {
          DEFAULT: '#94a3b8',
        },
        accent: {
          DEFAULT: '#D4A855',
          light: '#E4C47A',
          muted: '#3D2E0F',
        },
        info: {
          DEFAULT: '#4AADE8',
          light: '#7dd3fc',
          muted: '#0c4a6e',
        },
        gold: {
          DEFAULT: '#D4A855',
        },
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)', 'Inter', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'card-hover': '0 4px 16px rgba(212, 168, 85, 0.08)',
        elevated: '0 4px 12px rgba(0,0,0,0.4)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
