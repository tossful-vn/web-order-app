import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tossful kale-green palette
        kale: {
          50: "#f3f7f1",
          100: "#e4ede0",
          200: "#c9dac2",
          300: "#a4c098",
          400: "#7ba26c",
          500: "#5c8650",
          600: "#476b3e",
          700: "#3a5634",
          800: "#30462c",
          900: "#293a26",
        },
        cream: "#faf7f0",
        ink: "#1f2a1d",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-questrial)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
