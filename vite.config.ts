import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      "@client": fileURLToPath(new URL("./client", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    include: ["@babylonjs/core"],
  },
});
