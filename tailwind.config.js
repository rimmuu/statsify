/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#080808',
        elevated: '#111113',
        surface: '#18181B',
        ink: '#F5F5F5',
        muted: '#999999',
        spotify: '#1DB954',
        accent: '#FA334F',
        'accent-soft': '#FF5C72',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        editorial: ['var(--font-editorial)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        editorial: '14px',
        panel: '16px',
      },
    },
  },
  plugins: [],
}
