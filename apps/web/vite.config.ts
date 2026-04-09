import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("maplibre-gl")) {
            return "map";
          }
          if (id.includes("react-router-dom")) {
            return "router";
          }
          if (id.includes("lucide-react")) {
            return "icons";
          }
          if (id.includes("react-dom") || id.includes("/react/")) {
            return "react-vendor";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@alabiblio/contracts": fileURLToPath(
        new URL("../../packages/contracts/src", import.meta.url),
      ),
      "@alabiblio/domain": fileURLToPath(
        new URL("../../packages/domain/src", import.meta.url),
      ),
      "@alabiblio/geo": fileURLToPath(
        new URL("../../packages/geo/src", import.meta.url),
      ),
      "@alabiblio/ingestion": fileURLToPath(
        new URL("../../packages/ingestion/src", import.meta.url),
      ),
      "@alabiblio/mobility": fileURLToPath(
        new URL("../../packages/mobility/src", import.meta.url),
      ),
      "@alabiblio/schedule-engine": fileURLToPath(
        new URL("../../packages/schedule-engine/src", import.meta.url),
      ),
      "@alabiblio/ui": fileURLToPath(
        new URL("../../packages/ui/src", import.meta.url),
      ),
    },
  },
});
