import surreal from "../surreal.ts";
import type { SurrealElement } from "../surreal.ts";

export function pluginEach(node: unknown) {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
  const element = node as SurrealElement;
  Object.assign(element, {
    each<Item>(
      items: readonly Item[],
      template: HTMLTemplateElement,
      callback: (clone: SurrealElement, item: Item, index: number) => undefined,
    ) {
      if (!Array.isArray(items) || !(template instanceof HTMLTemplateElement)) {
        throw new TypeError("each() requires an array and an HTML template");
      }
      const roots = Array.from(template.content.childNodes).filter(
        (node) =>
          node.nodeType !== Node.COMMENT_NODE &&
          !(node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()),
      );
      const root = roots[0];
      // Template contents belong to an inert document, so use namespaces, not instanceof.
      if (
        roots.length !== 1 ||
        root?.nodeType !== Node.ELEMENT_NODE ||
        ![
          "http://www.w3.org/1999/xhtml",
          "http://www.w3.org/2000/svg",
        ].includes((root as Element).namespaceURI ?? "")
      ) {
        throw new TypeError("each() requires exactly one HTML or SVG root");
      }
      const fragment = element.ownerDocument.createDocumentFragment();
      for (const [index, item] of items.entries()) {
        const clone = surreal.sugar(
          element.ownerDocument.importNode(root, true),
        ) as SurrealElement;
        const result: unknown = callback(clone, item, index);
        if (
          result &&
          typeof (result as PromiseLike<unknown>).then === "function"
        ) {
          throw new TypeError("each() requires a synchronous callback");
        }
        fragment.append(clone);
      }
      element.replaceChildren(fragment);
      return element;
    },
  });
}
