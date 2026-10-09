import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          graph: ["cytoscape"],
          charts: ["recharts"],
          framework: [
            "react",
            "react-dom",
            "react-router-dom",
            "@tanstack/react-query",
          ],
        },
      },
    },
  },
  test: { env: {VITE_DATA_SOURCE:"mock"}, environment: "jsdom", setupFiles: "./tests/setup.ts", css: false },
});
