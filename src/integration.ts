import type { AstroIntegration } from "astro";
import type { Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { transformComponent } from "./transform.ts";

export default function surreal(): AstroIntegration {
  return {
    name: "astro-surreal",
    hooks: {
      "astro:config:setup": ({ config, updateConfig }) => {
        updateConfig({ vite: { plugins: [surrealPlugin(config.root)] } });
      },
    },
  };
}

function surrealPlugin(root: URL): Plugin {
  return {
    name: "astro-surreal",
    enforce: "pre",
    transform: {
      order: "pre",
      handler(code, id) {
        if (id.endsWith(".astro")) {
          return transformComponent(code, id, fileURLToPath(root));
        }
      },
    },
  };
}
