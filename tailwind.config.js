/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        coral: {
          400: '#ff8787',
          500: '#ff6b6b',
        },
        amber: {
          400: '#ffb733',
          500: '#ffa500',
        },
      },
    },
  },
  plugins: [],
};
