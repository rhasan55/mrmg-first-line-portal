import { defineConfig } from "vite";

export default defineConfig({
  root: "static",
  publicDir: false,
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
