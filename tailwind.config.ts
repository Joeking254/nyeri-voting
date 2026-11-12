import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        forest: "#155a45",
        ink: "#17231f",
      },
    },
  },
  plugins: [],
};

export default config;
