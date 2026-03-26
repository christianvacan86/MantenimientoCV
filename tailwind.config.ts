import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Zaimella Corporate Colors
        primary: {
          50: "#e6edf7",
          100: "#ccdaee",
          200: "#99b5dd",
          300: "#6691cc",
          400: "#336cbb",
          500: "#003087", // Main brand color
          600: "#002670",
          700: "#001d59",
          800: "#001342",
          900: "#000a2b",
        },
        secondary: {
          50: "#e6f2ff",
          100: "#cce5ff",
          200: "#99cbff",
          300: "#66b1ff",
          400: "#3397ff",
          500: "#0071CE", // Bright blue
          600: "#005ba5",
          700: "#00447c",
          800: "#002e52",
          900: "#001729",
        },
        brand: {
          green: "#00A651",
          lightGreen: "#4CC38A",
          blue: "#003087",
          lightBlue: "#0071CE",
          white: "#FFFFFF",
          lightGray: "#F0F4F8",
          gray: "#E2E8F0",
          darkGray: "#64748B",
          dark: "#1A202C",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
