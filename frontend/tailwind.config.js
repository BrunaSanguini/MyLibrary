/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Pergaminho
        'bg-primary': '#FAF6EE',
        'bg-surface': '#F0E8D4',
        'bg-surface-2': '#E8DCC0',
        'bg-surface-3': '#DDD0AA',
        'ink': '#1C1810',
        'ink-2': '#3A3020',
        'muted': '#9C8B6A',
        'dim': '#C4B49A',
        // Cores de destaque
        'primary': '#7F77DD',
        'primary-light': '#AFA9EC',
        'amber': '#EF9F27',
        'amber-light': '#FAC775',
        'teal': '#5DCAA5',
        'coral': '#F0997B',
      },
      fontFamily: {
        'serif': ['Playfair Display', 'serif'],
        'sans': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}