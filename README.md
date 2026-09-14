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

Give the component one native HTML root and one script that imports `me` or `any`. Script and style blocks do not count as roots. Ordinary scripts keep Astro's normal behavior.

```astro
<div>
  <button>Hide me</button>
</div>

<script>
  import { me } from "astro-surreal";
  me("button")?.on("click", (event) => me(event)?.fadeOut());
</script>
```

`fadeOut()` removes the selected element after its animation. This example removes the button.

Each root gets its own local variables. The helper imports become root-bound. Their entire import declarations are removed, including any types imported alongside them. Other static imports stay at module scope and run once per loaded module. TypeScript, npm imports, and top-level `await` pass through Astro's script bundler. Each instance starts independently, so an awaiting instance does not hold up another.

`me()` returns the decorated root. `any()` returns a decorated array containing that root. String selectors search descendants with normal DOM queries, including descendants rendered by nested components. A missing selector returns `null` from `me()` or an empty decorated array from `any()`. Use optional chaining when a match is not guaranteed.

Explicit elements, arrays, NodeLists, and events use Surreal's selection and decoration. `me(event)` selects `event.currentTarget`, not the component root. Save that element before an `await`, because the browser clears `currentTarget` after dispatch. Surreal warns and returns `null` for an event whose `currentTarget` is gone, including for `any(event)`. Empty collections return `null` from `me()`.

All strings are ordinary descendant selectors, including `'-'`, `'prev'`, and `'previous'`. Invalid selectors follow the DOM's error behavior. Use `me()` or `any()` to select the root. Authored `me` and `any` bindings shadow the imported helpers normally.

The integration adds a deterministic attribute per component. It does not require scoped CSS or expose absolute filesystem paths in HTML. Multiple instances, including nested instances of the same component, share the attribute and initialize separately. Authored spreads cannot overwrite the generated marker.

The root must be statically identifiable. Multiple roots, component roots, fragments, and roots behind expressions need an HTML wrapper. Participating scripts must have no attributes. Module exports and TypeScript import assignments are not supported in their bodies.

On initial load and `astro:page-load`, the runtime initializes each new root once. Late component modules also scan existing roots after DOM readiness. Persisted DOM elements keep their state and listeners. Roots are marked before initialization starts, including while an `await` is pending. A failure logs the component identity and original error, does not stop other instances, and is not retried on navigation.

> Lifecycle limitation: there is no unmount or cleanup hook. Manage timers, observers, and global listeners yourself. Pending async work can outlive its root. Arbitrary HTML inserted by application code has no automatic initialization guarantee; there is no mutation observer.

> Selector limitation: component ownership filtering and `:global(...)` are future work. Descendant selectors currently include nested components. `:global(...)` is not a supported selector.

Named value imports of `me` or `any` from `"astro-surreal"` opt a script into the transform. Aliases such as `import { me as self } from "astro-surreal"` work. Type-only imports, namespace imports, side-effect imports, and the default integration import do not opt in. Import only the helpers you use. Only imported helpers are bound to the component root.

Helper imports must be directly inside the component's script. A separate `.ts` module cannot identify the active component root. Pass the helpers into shared behavior functions instead. Calling an unbound helper throws an explanatory error.

```ts
// behavior.ts
import type { Me, Any } from "astro-surreal";

export function setup(me: Me, any: Any) {
  me("button")?.on("click", (event) => me(event)?.fadeOut());
  any("button").classAdd("ready");
}
```

```astro
<div><button>Hide me</button></div>
<script>
  import { me, any } from "astro-surreal";
  import { setup } from "./behavior";
  setup(me, any);
</script>
```

`Me`, `Any`, `SurrealElement`, and `SurrealArray` are also available from `astro-surreal/types`.

> CSP limitation: the production fixture passes in Chromium with Astro's built-in `security.csp: true`. It has no `ClientRouter`. Astro documents `ClientRouter` as unsupported with built-in CSP. Client navigation without built-in CSP is tested separately. Arbitrary manual CSP headers are not covered. Test your own policy with `astro build` and `astro preview`; Astro does not apply this feature in development. See [Astro's CSP configuration](https://docs.astro.build/en/reference/configuration-reference/#securitycsp).

The integration emits bundled modules and function calls, with no `eval`, `new Function`, inline event attributes, or policy changes. It bundles the vendored, modified Surreal 1.3.4-d in `src/surreal.mjs`, based on [upstream commit cd8f18d](https://github.com/gnat/surreal/tree/cd8f18d34067e073d0aa25675cc0649e304292a3). The vendor exports an ES module and uses an explicit selection root. It executes only in the browser. Use `attr()` or `attribute()` for attributes; native element `.attributes` remains unchanged. The upstream `attributes()`, `off_all()`, and `trigger()` aliases are absent. Use `offAll()` and `send()` instead. Event and animation methods run from the vendored implementation.

The transform emits source maps for authored markup, imports, and executable statements. Later Astro and Vite transforms can limit runtime stack locations. In particular, Astro's transition plugin currently emits a sourcemap warning in the navigation fixture.

Prettier formats the source, Astro fixtures, and documentation. Run `npm run format` to write formatting changes or `npm run format:check` to check them. Generated output, dependencies, and npm lockfiles are excluded.

For development and verification:

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

For the production browser checks, run `npm run build --prefix test/fixture`, start `npm run preview --prefix test/fixture -- --port 4330`, then run `npm run test:browser`. Install Chromium first with `npx playwright install chromium`. Repeat the build and browser check with `CSP=1` for the separate CSP fixture. `npm pack` packages the TypeScript source directly; it does not publish it.

Requires Astro `^7.3.1`. Production browser checks pass on 7.3.1. The packed consumer builds on 7.0.0, but that version emits the fixture's dynamic `transition:persist` expression as a literal ID and fails navigation. The peer range excludes it.
