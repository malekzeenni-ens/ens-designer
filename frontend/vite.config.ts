import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  cacheDir: "C:/Users/malek/AppData/Local/Temp/vite-cache/ens-designer",
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://127.0.0.1:8010"
    }
  }
});
