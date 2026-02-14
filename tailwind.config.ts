import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff5f3",
          100: "#ffe7e0",
          200: "#ffcfc0",
          300: "#ffac93",
          400: "#ff7e58",
          500: "#f4592f",
          600: "#dd3b12",
          700: "#b62f12",
          800: "#8f2610",
          900: "#631b0c"
        }
      }
    }
  },
  plugins: []
};

export default config;
