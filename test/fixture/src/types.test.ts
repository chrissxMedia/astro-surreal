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
for (const method of ["on", "onPrevent"] as const) {
  buttons[method]("click", function (event, element) {
    const x: number = event.clientX;
    const self: SurrealElement<HTMLButtonElement> = this;
    const target: HTMLButtonElement | null = event.currentTarget;
    element.disabled = true;
    void [x, self, target];
  });
  root[method]("custom", (event: CustomEvent<number>, element) => {
    const detail: number = event.detail;
    element.disable();
    void detail;
  });
}
me(".unknown")?.onPrevent("click", async (event, element) => {
  const x: number = event.clientX;
  await Promise.resolve();
  element.disable();
  void x;
});
const template = document.createElement("template");
root.each([1, 2] as const, template, (clone, item, index) => {
  clone.styles({ opacity: String(item + index) });
});
// @ts-expect-error Async iteration is unsupported.
root.each([], template, async () => {});
const props: Record<string, unknown> = root.props();
const typedProps: { title: string } = root.props<{ title: string }>();
for (const target of [buttons, me(document)]) {
  // @ts-expect-error Only elements have props().
  target.props();
  // @ts-expect-error Only elements have each().
  target.each([], template, () => {});
}
me(document.createElementNS("http://www.w3.org/2000/svg", "svg")).props();
void [props, typedProps];
