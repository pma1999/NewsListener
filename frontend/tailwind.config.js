/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors'; // Import the colors module

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Ensure this covers all component files
    "./src/**/**/*.{js,ts,jsx,tsx}", // A bit more depth just in case
  ],
  theme: {
    extend: {
      colors: {
        gray: colors.gray, // Explicitly add the gray palette
        purple: colors.purple, // Explicitly add the purple palette
      },
    },
  },
  plugins: [],
} 