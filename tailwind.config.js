/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#1F6F5F',
          DEFAULT: '#2FA084',
          light: '#6FCF97',
        },
      },
    },
  },
  plugins: [],
}
