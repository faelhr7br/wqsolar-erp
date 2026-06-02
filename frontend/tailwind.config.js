/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // default dark mode configuration
  theme: {
    extend: {
      colors: {
        background: '#09090b', // coal black background
        foreground: '#f4f4f5', // off-white text
        card: {
          DEFAULT: '#121214', // matte grey card
          border: '#27272a', // zinc-800 borders
          hover: '#1e1e24'
        },
        solar: {
          yellow: '#f59e0b',
          blue: '#0284c7', // Slate blue
          emerald: '#10b981', // Flat emerald green
          steel: '#38bdf8', // Cool steel accent
          slate: '#475569'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
