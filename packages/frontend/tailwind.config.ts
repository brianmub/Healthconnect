import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9', // sky-500
          600: '#0284c7',
          700: '#0369a1',
        },
        success: {
          500: '#10b981', // emerald-500
          600: '#059669',
        },
        warning: {
          500: '#f59e0b', // amber-500
          600: '#d97706',
        },
        danger: {
          500: '#ef4444', // red-500
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
