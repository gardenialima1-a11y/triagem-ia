import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff",
          100: "#dbe6ff",
          500: "#3358e0",
          600: "#2745c2",
          700: "#1e379e",
          900: "#101d4d",
        },
      },
    },
  },
  plugins: [],
};
export default config;
