import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f7f8e6",
          100: "#eef1c6",
          200: "#dee58f",
          300: "#ced857",
          400: "#c4c62b",
          500: "#bcb407",
          600: "#9d9506",
          700: "#7d7705",
          800: "#5f5a04",
          900: "#434003"
        }
      }
    }
  },
  plugins: []
};

export default config;
