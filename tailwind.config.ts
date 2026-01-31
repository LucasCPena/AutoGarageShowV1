import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f8ff",
          100: "#e9efff",
          200: "#d4deff",
          300: "#a9bdff",
          400: "#7694ff",
          500: "#3f66ff",
          600: "#2c49ff",
          700: "#2238db",
          800: "#202fae",
          900: "#1f2c89"
        }
      }
    }
  },
  plugins: []
};

export default config;
