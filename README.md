# astro-surreal

Run a bundled Surreal script once for each rendered instance of an Astro component.

```sh
npm install astro-surreal
```

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import surreal from "astro-surreal";

export default defineConfig({
  integrations: [surreal()],
});
```

Give the component one native HTML root and one attribute-free script that imports `me` or `any`:

```astro
<div>
  <button>Hide me</button>
</div>

<script>
  import { me } from "astro-surreal";
  me("button")?.on("click", (event, element) => element.fadeOut());
</script>
```

Each instance gets its own local variables. Other imports stay at module scope. TypeScript, npm imports, and top-level `await` use Astro's bundler. Instances initialize independently, once per root, on initial load or `astro:page-load`. Persisted roots keep their state. Failed initializers log an error and are not retried.

## Selection

- `me()` returns the decorated root; `any()` returns a decorated array containing it.
- Strings are ordinary descendant selectors, including nested components. Missing matches return `null` or an empty array. Invalid selectors throw.
- Elements, arrays, and NodeLists can be passed directly. `me()` takes the first element of a collection, or returns `null` if empty.
- `me(event)` and `any(event)` read `currentTarget`. After dispatch it is `null`; use the handler's element argument across `await`.

Only explicit imports of `me` and `any` opt a script into the integration. Aliases work. Import helpers directly inside the Astro script; pass them as arguments to shared functions in `.ts` files. `Me`, `Any`, `SurrealElement`, and `SurrealArray` types are exported from `astro-surreal` and `astro-surreal/types`.

## Events

```ts
button.onPrevent("click", async (event, element) => {
  await save();
  element.disable();
});
```

`on()` and `onPrevent()` pass the event and decorated listening element, preserve native callback `this`, and chain. Collections invoke the callback for each listening element. `onPrevent()` calls `.preventDefault()` before calling the handler.

Each `on()` or `onPrevent()` call adds a new wrapper, so repeated registrations run multiple times, including when mixing methods. Native `removeEventListener()` cannot remove these wrappers using the original callback. Use native `addEventListener()` and `removeEventListener()` when you need to remove an individual listener.

## Templates and props

Both methods below exist only on decorated HTML/SVG elements, excluding collections.

`Document` is unsupported. Use native document event listeners instead.

```ts
container.each(items, template, (clone, item, index) => {
  clone.styles({ backgroundColor: item.color });
});
```

`each()` takes a readonly array, an `HTMLTemplateElement`, and a synchronous callback with the decorated deep clone, item, and zero-based index. The template must contain exactly one HTML or SVG root.

All clones are prepared before replacing the container's children. Validation or callback errors preserve existing children; an empty array clears them. The method returns the container. Replacement discards previous child state and listeners. Keep templates outside the replaced container.

Pass props as an attribute spread:

```astro
---
import { passProps } from "astro-surreal/plugins/props";
const { title, options } = Astro.props;
---

<div {...passProps({ title, options })}></div>
```

`passProps(value)` returns `{ "data-props": string }` using the bundled devalue serializer. No separate dependency is needed. Read them with `element.props<Props>()`. Missing attributes return a fresh empty object. Malformed payloads, `null`, arrays, and other non-object top-level values throw. The default type is `Record<string, unknown>`; a generic cannot validate fields.

## Limits

Roots must be statically identifiable HTML elements. Wrap fragments, components, conditional roots, or multiple roots. Script/style blocks do not count as roots. Participating scripts cannot export bindings or use TypeScript import assignments. Ordinary scripts keep Astro's behavior.

Updates are explicit. There is no reactivity, keyed reuse, async template rendering, HTML-string interpolation, or automatic initialization of inserted components. There are no cleanup hooks; manage timers, observers, and global listeners yourself. Selectors have no component ownership filtering or `:global(...)` support yet.

The browser runtime vendors modified [Surreal 1.3.4-d](https://github.com/gnat/surreal/tree/cd8f18d34067e073d0aa25675cc0649e304292a3). Use `attr()`/`attribute()`, `offAll()`, and `send()`. Upstream `off()` is omitted, as are the `attributes()`, `off_all()`, and `trigger()` aliases. Native `.attributes` is unchanged.

Production Chromium checks cover navigation and a separate [Astro CSP](https://docs.astro.build/en/reference/configuration-reference/#securitycsp) fixture without `ClientRouter`. Test your own CSP policy in production. Astro's transition plugin currently warns about incomplete source maps.

## Development

```sh
npm install
npm test
npm run check
npm run format:check
cd test/fixture
npm install
npx astro check
npm run dev -- --host --background
```

Use `npm run format` to apply formatting.

For browser checks, install Chromium with `npx playwright install chromium`, build with `npm run build --prefix test/fixture`, and start `npm run preview --prefix test/fixture -- --port 4330`. Run `npm run test:browser`, using `URL` if preview selects another port. Repeat the build and browser check with `CSP=1` for the separate CSP fixture.
