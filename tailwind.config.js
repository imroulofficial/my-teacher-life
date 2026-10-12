/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        game: ['"Fredoka"', 'system-ui', 'sans-serif'],
        hand: ['"Patrick Hand"', 'cursive'],
      },
      colors: {
        redpen: '#ef3b4d',
        chalk: '#24453a',
        paper: '#fffaf0',
      },
    },
  },
  plugins: [],
};
