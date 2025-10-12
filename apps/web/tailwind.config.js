/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        glass: 'rgb(var(--glass) / <alpha-value>)',
        q1: 'rgb(var(--q1) / <alpha-value>)',
        q2: 'rgb(var(--q2) / <alpha-value>)',
        q3: 'rgb(var(--q3) / <alpha-value>)',
        q4: 'rgb(var(--q4) / <alpha-value>)',
      },
      borderRadius: {
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        glass: 'var(--shadow-glass)',
      },
      backdropBlur: {
        glass: 'var(--blur-glass)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
}
