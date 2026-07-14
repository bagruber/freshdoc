import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: für GitHub Pages unter https://<user>.github.io/freshdoc/.
// Lokal (dev/preview) bleibt es "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/freshdoc/" : "/",
  plugins: [react()],
}));
