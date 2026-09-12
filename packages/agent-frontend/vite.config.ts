import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    // Emit .gz companion files for JS, CSS, HTML, JSON, SVG assets >= 1 KB.
    // @fastify/static serves them automatically when client sends Accept-Encoding: gzip.
    compression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
      filter: /\.(js|css|html|json|svg)$/i,
    }),
  ],
  root: fileURLToPath(new URL(".", import.meta.url)),
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/ws": { target: "ws://localhost:3000", ws: true },
    },
  },
});
