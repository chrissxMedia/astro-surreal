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
// @ts-expect-error Collections do not have props().
buttons.props();
// @ts-expect-error Collections do not have each().
buttons.each([], template, () => {});
// @ts-expect-error Documents cannot be decorated elements.
export type DocumentElement = SurrealElement<Document>;
// @ts-expect-error Collections cannot contain documents.
export type DocumentArray = SurrealArray<Document>;
me(document.createElementNS("http://www.w3.org/2000/svg", "svg")).props();
void [props, typedProps];

const chainedButton: SurrealElement<HTMLButtonElement> = me(
  document.createElement("button"),
)
  .add_class("ready")
  .toggleClass("active", true)
  .styles({ opacity: "1" })
  .on("click", (event) => event.clientX)
  .attr({ title: "ready" })
  .enable();
const chainedButtons: SurrealArray<HTMLButtonElement> = buttons
  .remove_class("ready")
  .class_toggle("active")
  .attribute("title", "ready")
  .onPrevent("click", (event) => event.clientX)
  .run((element) => element.click());
const halted: MouseEvent = root.halt(new MouseEvent("click"));
const removed: void = buttons.remove();
// @ts-expect-error Class names must be strings.
root.addClass(1);
// @ts-expect-error Collection chaining must preserve the element type.
buttons.enable().run((element) => element.href);
void [chainedButton, chainedButtons, halted, removed];
