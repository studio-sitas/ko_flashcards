/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#F7F2E7', deep: '#EFE7D4' },
        ink: { DEFAULT: '#221E17', soft: '#171410' },
        gold: {
          50: '#FBF4E3',
          100: '#F5E4BC',
          200: '#EDCE87',
          300: '#E2B458',
          400: '#D49E3C',
          500: '#C0872C',
          600: '#A16E22',
          700: '#7D551B',
          800: '#5D3F15',
          900: '#412C0F',
        },
        moss: {
          50: '#F0F3E7',
          100: '#DDE6C7',
          200: '#C0D194',
          300: '#9EB767',
          400: '#7C9A46',
          500: '#5F7C31',
          600: '#4A6326',
          700: '#3A4E1F',
          800: '#2C3B18',
          900: '#202C12',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
