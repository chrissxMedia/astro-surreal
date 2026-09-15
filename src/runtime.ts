import surreal from "./surreal.mjs";
import { pluginProps } from "./plugins/props.ts";
import { pluginEach } from "./plugins/each.ts";
import { pluginEffects } from "./plugins/effects.ts";
import type { Me, Any } from "./types.ts";

(surreal.plugins as ((node: unknown) => void)[]).push(
  pluginEffects,
  pluginProps,
  pluginEach,
);

type Initializer = (helpers: { me: Me; any: Any }) => unknown;
const registry = new Map<
  string,
  { identity: string; initialize: Initializer; roots: WeakSet<Element> }
>();

function scan() {
  for (const [marker, behavior] of registry) {
    for (const root of document.querySelectorAll<HTMLElement>(`[${marker}]`)) {
      if (behavior.roots.has(root)) continue;
      behavior.roots.add(root);
      const report = (error: unknown) =>
        console.error(`[astro-surreal] ${behavior.identity}`, error);
      try {
        const result = behavior.initialize({
          me: ((selector: unknown) => surreal.me(selector, root)) as Me,
          any: ((selector: unknown) => surreal.any(selector, root)) as Any,
        });
        Promise.resolve(result).catch(report);
      } catch (error) {
        report(error);
      }
    }
  }
}

document.addEventListener("astro:page-load", scan);
document.addEventListener("DOMContentLoaded", scan, { once: true });

export function register(
  marker: string,
  identity: string,
  initialize: Initializer,
) {
  if (!registry.has(marker))
    registry.set(marker, { identity, initialize, roots: new WeakSet() });
  if (document.readyState !== "loading") scan();
}
