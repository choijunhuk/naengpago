/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { light: '#16A34A', dark: '#4ADE80' },
        app: { light: '#FAFAF9', dark: '#111311' },
        surface: { light: '#FFFFFF', dark: '#1C1F1C' },
        ink: { light: '#1C1917', dark: '#F5F5F4' },
        muted: { light: '#78716C', dark: '#A8A29E' },
        line: { light: '#E7E5E4', dark: '#2E332E' },
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      borderRadius: {
        card: '16px',
        button: '12px',
      },
      fontFamily: {
        sans: ['Pretendard', 'System'],
      },
    },
  },
  plugins: [],
};

