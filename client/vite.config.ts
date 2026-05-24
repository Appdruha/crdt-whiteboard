import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@crdt-demo/shared": path.resolve(__dirname, "../shared/src/index.ts"),
      "@crdt-demo/engine": path.resolve(__dirname, "../engine/src/index.ts")
    }
  },
  server: {
    port: 5173
  }
});

