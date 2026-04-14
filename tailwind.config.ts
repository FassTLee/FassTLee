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
        origin: "#E24B4A",
        insertion: "#378ADD",
        success: "#639922",
        surface: "#F5F5F3",
        "text-secondary": "#6B6B6B",
        "text-tertiary": "#ADADAD",
        "border-custom": "#E5E5E5",
        "border-strong": "#CCCCCC",
        highlight: "#FFE066",
      },
      fontFamily: {
        sans: ["Pretendard", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [],
};
export default config;
