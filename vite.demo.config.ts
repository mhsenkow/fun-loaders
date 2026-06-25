import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Demo gallery — deployed to GitHub Pages at /fun-loaders/ */
export default defineConfig({
  plugins: [react()],
  root: ".",
  base: "/fun-loaders/",
  build: {
    outDir: "demo-dist",
    emptyOutDir: true,
  },
});
