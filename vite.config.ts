import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
// Removed lovable-tagger for QR-based restaurant branding

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/QRMENU/",
  server: {
    host: true,
    port: 5174,
    https: fs.existsSync('./certs/cert.pem') ? {
      key: fs.readFileSync('./certs/key.pem'),
      cert: fs.readFileSync('./certs/cert.pem'),
    } : undefined,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
