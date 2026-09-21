import type { Me, Any } from "./surreal.ts";

function unbound(): never {
  throw new Error(
    "Import me and any directly in an Astro <script> with the " +
      "astro-surreal integration enabled. Pass them as arguments to " +
      "external functions instead of importing them in a .ts module.",
  );
}

export const me: Me = unbound;
export const any: Any = unbound;
