/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
    './src/pages/**/*.{ts,tsx}',
    './src/utils/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'sl-primary': '#38e07b',
        'sl-background': '#111827'
      }
    }
  },
  plugins: []
};
