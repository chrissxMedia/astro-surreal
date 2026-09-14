import type { Me, Any, SurrealElement, SurrealArray } from "astro-surreal";
declare const me: Me;
declare const any: Any;
const root: SurrealElement<HTMLElement> = me();
const roots: SurrealArray<HTMLElement> = any();
root.classAdd("ready").attr("role", "group");
const attributes: NamedNodeMap = root.attributes;
const button: SurrealElement<HTMLButtonElement> | null = me("button");
// @ts-expect-error Selector results can be null.
me("button").click();
button?.on("click", (event) => {
  const target: EventTarget | null = event.currentTarget;
  const selected = me(event);
  selected?.fadeOut();
  const typed: SurrealElement<HTMLButtonElement> | null = selected;
  void typed;
  // @ts-expect-error An event can lose currentTarget.
  any(event).classAdd("active");
  if (target) me(target)?.classAdd("target");
});
const buttons: SurrealArray<HTMLButtonElement> = any("button");
buttons
  .on("click", (event) => event.clientX)
  .run((button) => {
    button.disabled = true;
  });
const getter: [] = buttons.attr("id");
const value: string | null = root.attr("id");
const collection: SurrealElement<HTMLButtonElement> | null = me(
  document.querySelectorAll("button"),
);
void [roots, attributes, getter, value, collection];
