/// <reference types="vitest/config" />
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
  // The tests reuse everything above. The `@/` alias and the JSX transform are
  // the whole reason this runner and not another one: Vitest *is* Vite, so
  // there is no second config to keep in agreement.
  test: {
    // A DOM, only in tests. The app still builds for a real browser.
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    // `test`, `expect` and `vi` without importing them in every file.
    globals: true,
  },
});
