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
        background: '#f8fafc', // Clean slate-50 light background
        foreground: '#0f172a', // Dark slate-900 for high-contrast readable text
        card: {
          DEFAULT: '#ffffff', // Clean white cards
          border: '#e2e8f0', // Slate-200 elegant borders
          hover: '#f1f5f9'  // Slate-100 hover effect
        },
        solar: {
          yellow: '#f59e0b',
          blue: '#0284c7', // Slate blue
          emerald: '#10b981', // Flat emerald green
          steel: '#0284c7', // Slate blue primary
          slate: '#64748b'  // Slate-500 text
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
