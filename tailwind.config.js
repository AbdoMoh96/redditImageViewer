/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  theme: {
    extend: {
      boxShadow: {
        halo: "0 0 60px rgba(16, 185, 129, 0.25)",
      },
    },
  },
  plugins: [],
};
