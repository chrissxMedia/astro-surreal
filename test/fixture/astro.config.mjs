import { defineConfig } from "astro/config";
import surreal from "astro-surreal";
export default defineConfig({
  integrations: [surreal()],
  srcDir: process.env.CSP === "1" ? "./csp" : "./src",
  security: { csp: process.env.CSP === "1" },
  vite: { build: { sourcemap: true } },
});
