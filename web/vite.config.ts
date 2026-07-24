import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^noor-ui\/providers$/, replacement: fileURLToPath(new URL("../raw/sources/noor-ui/src/providers/index.ts", import.meta.url)) },
      { find: /^noor-ui\/tokens$/, replacement: fileURLToPath(new URL("../raw/sources/noor-ui/src/tokens/index.ts", import.meta.url)) },
      { find: /^noor-ui$/, replacement: fileURLToPath(new URL("../raw/sources/noor-ui/src/index.ts", import.meta.url)) },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) }
    ]
  },
  server: {
    fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] },
    proxy: { "/api": process.env.KDX_API_ORIGIN ?? "http://127.0.0.1:8600" }
  }
});
