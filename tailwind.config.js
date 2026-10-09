export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#561269', 50: '#FBF5FD', 100: '#F4E6F8', 200: '#E2AEF0', 300: '#CF86E3', 600: '#561269', 700: '#440E54', 800: '#330A3F' },
        ink: { DEFAULT: '#241C29', soft: '#5F5667', faint: '#8D8495' },
        paper: '#F7F5F8', line: '#ECE8EF',
        pos: '#1B7F55', neg: '#B83A49', warn: '#A86412',
      },
      fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(36,28,41,.04), 0 6px 18px rgba(36,28,41,.05)' },
    },
  },
}
