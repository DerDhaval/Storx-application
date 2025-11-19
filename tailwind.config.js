/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        storx: {
          red: '#E04124',
          'red-dark': '#C7361A',
          'red-light': '#F05A3D',
          'red-lighter': '#FFE5E0',
          dark: '#040A18',
        },
      },
    },
  },
  plugins: [],
}

