import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          card: 'rgb(var(--surface-card) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          border: 'rgb(var(--surface-border) / <alpha-value>)',
        },
        baize: {
          DEFAULT: 'rgb(var(--baize) / <alpha-value>)',
          light: 'rgb(var(--baize-light) / <alpha-value>)',
          dark: 'rgb(var(--baize-dark) / <alpha-value>)',
          muted: 'rgb(var(--baize-muted) / <alpha-value>)',
        },
        win: {
          DEFAULT: 'rgb(var(--win) / <alpha-value>)',
          muted: 'rgb(var(--win-muted) / <alpha-value>)',
        },
        loss: {
          DEFAULT: 'rgb(var(--loss) / <alpha-value>)',
          muted: 'rgb(var(--loss-muted) / <alpha-value>)',
        },
        draw: {
          DEFAULT: 'rgb(var(--draw) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          light: 'rgb(var(--accent-light) / <alpha-value>)',
          muted: 'rgb(var(--accent-muted) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          light: 'rgb(var(--info-light) / <alpha-value>)',
          muted: 'rgb(var(--info-muted) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--gold) / <alpha-value>)',
        },
        white: 'rgb(var(--tw-white) / <alpha-value>)',
        gray: {
          50: 'rgb(var(--tw-gray-50) / <alpha-value>)',
          100: 'rgb(var(--tw-gray-100) / <alpha-value>)',
          200: 'rgb(var(--tw-gray-200) / <alpha-value>)',
          300: 'rgb(var(--tw-gray-300) / <alpha-value>)',
          400: 'rgb(var(--tw-gray-400) / <alpha-value>)',
          500: 'rgb(var(--tw-gray-500) / <alpha-value>)',
          600: 'rgb(var(--tw-gray-600) / <alpha-value>)',
          700: 'rgb(var(--tw-gray-700) / <alpha-value>)',
          800: 'rgb(var(--tw-gray-800) / <alpha-value>)',
          900: 'rgb(var(--tw-gray-900) / <alpha-value>)',
          950: 'rgb(var(--tw-gray-950) / <alpha-value>)',
        },
        'fixed-white': '#ffffff',
        'fixed-black': '#000000',
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)', 'Inter', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        elevated: 'var(--shadow-elevated)',
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
