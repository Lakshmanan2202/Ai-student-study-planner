export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['"Space Grotesk"', '"IBM Plex Sans"', "system-ui", "sans-serif"] },
      colors: {
        ink: "#edf2ff", muted: "#8e9bb8", line: "rgba(157, 177, 219, 0.13)", page: "#0b1020",
        accent: "#8069f0", "accent-dark": "#6854db",
      },
    },
  },
  plugins: [],
};
