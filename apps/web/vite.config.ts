import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      "@alabiblio/contracts": fileURLToPath(
        new URL("../../packages/contracts/src", import.meta.url),
      ),
      "@alabiblio/domain": fileURLToPath(
        new URL("../../packages/domain/src", import.meta.url),
      ),
      "@alabiblio/ingestion": fileURLToPath(
        new URL("../../packages/ingestion/src", import.meta.url),
      ),
    },
  },
});
