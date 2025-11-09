/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      zIndex: {
        10: '10',
        60: '60',
        70: '70',
        100: '100',
      },
    },
  },
  plugins: [],
}