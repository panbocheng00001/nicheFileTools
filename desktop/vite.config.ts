import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed dev server port and a relative frontendDist.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2021",
  },
  // Tauri injects TAURI_* env vars; keep them available to the bundle.
  envPrefix: ["VITE_", "TAURI_"],
});
