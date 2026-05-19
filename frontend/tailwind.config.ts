import type { Config } from 'tailwindcss'

export default {
  theme: {
    extend: {
      colors: {
        primary: '#2B2D9E',
        'bg-base': '#FFFFFF',
        'bg-surface': '#F5F5F5',
        'text-main': '#1A1A1A',
        'accent-red': '#C0392B',
      },
      fontFamily: {
        sans: ['Golos Text', 'sans-serif'],
        display: ['Pangolin', 'cursive'],
      },
    },
  },
} satisfies Config
