/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        dark: {
          50:  '#f0f4ff',
          100: '#e0e8ff',
          200: '#c4d0f5',
          300: '#9aaae8',
          400: '#6b7fd6',
          500: '#4a5fc4',
          600: '#3649b0',
          700: '#2a3a9e',
          800: '#1e2d82',
          900: '#0f1a5e',
        },
        surface: {
          DEFAULT: '#0d1117',
          100: '#161b22',
          200: '#21262d',
          300: '#30363d',
          400: '#484f58',
          500: '#6e7681',
        },
        accent: {
          green:  '#3fb950',
          red:    '#f85149',
          yellow: '#d29922',
          blue:   '#388bfd',
          purple: '#8b5cf6',
          cyan:   '#39d353',
        }
      },
      boxShadow: {
        'glow-green':  '0 0 20px rgba(63,185,80,0.3)',
        'glow-red':    '0 0 20px rgba(248,81,73,0.3)',
        'glow-blue':   '0 0 20px rgba(56,139,253,0.3)',
        'glow-purple': '0 0 20px rgba(139,92,246,0.3)',
      }
    },
  },
  plugins: [],
}
