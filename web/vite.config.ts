import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `@/…` so imports never walk ../../.. and shadcn's own files resolve.
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  // Port 5173 is not a default we drift off: it is the exact string in the
  // API's ALLOWED_ORIGINS. A different port is a different origin, and CORS
  // will refuse the reply. strictPort so it fails loudly instead of picking
  // 5174 and looking like a CORS bug.
  server: { port: 5173, strictPort: true },
});
