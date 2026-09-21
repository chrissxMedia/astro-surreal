# Changelog

## 0.0.3, unreleased

- Convert the vendored Surreal implementation to TypeScript and infer core method types from it. Remove the separate `types.ts` file.
- Remove the `astro-surreal/types` export. Import types from `astro-surreal` instead.
- Remove `Document` support. Only HTML and SVG elements can be decorated. `me(document)` now returns `null`; `any(document)` returns an empty collection. Use native document event listeners instead.
- Move `fadeIn()` and `fadeOut()` into the bundled effects plugin without changing their behavior.

## 0.0.2, 2026-09-15

- Add `onPrevent()`, which calls `preventDefault()` before invoking the handler.
- Pass the decorated listening element as the second argument to `on()` and `onPrevent()` handlers, so it remains available across `await`. Preserve callback `this` and infer event and element types.
- Remove `off()`. Each `on()` or `onPrevent()` call now registers a separate wrapper, including repeated calls with the same handler. Use native `addEventListener()` and `removeEventListener()` when individual listener removal is needed.
- Ship the props plugin with `passProps()` from `astro-surreal/plugins/props` and `element.props()` to serialize and read props through a `data-props` attribute using devalue.
- Ship the each plugin with `element.each(items, template, callback)` to clone a single-root HTML template for each item and replace the container's children. Callbacks must be synchronous; validation or callback errors preserve existing children.

## 0.0.1, 2026-09-14

- Initial npm release of the Astro integration with bundled, modified Surreal 1.3.4-d.
- Transform component scripts that import `me` or `any` into per-instance initializers with root-bound selectors and local state. Support TypeScript, npm imports, import aliases, and top-level `await` through Astro's bundler.
- Initialize roots once on initial load and `astro:page-load`, preserving state on persisted roots. Report initializer failures without blocking other instances or retrying failed roots.
- Export typed selection helpers and decorated element and collection types.
- Keep native `.attributes` intact; expose `attr()` and `attribute()` instead. Omit the upstream `off_all()` and `trigger()` aliases in favor of `offAll()` and `send()`.
- Require Node.js 22.12.0 or newer and Astro `^7.3.1`.
