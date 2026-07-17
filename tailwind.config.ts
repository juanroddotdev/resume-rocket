import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          500: '#e6b35c',
          600: '#df9e2f',
        },
        brand: {
          50: '#f4f3f8',
          100: '#e8e6f0',
          200: '#ccc8dc',
          600: '#363062',
          700: '#1f1a40',
          800: '#191534',
          900: '#120f29',
        },
        canvas: '#f8f9fc',
        ink: '#2d3142',
      },
    },
  },
  plugins: [],
} satisfies Config
