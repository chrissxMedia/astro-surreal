import { passProps } from "astro-surreal/plugins/props";
import type { Me, Any } from "astro-surreal";

export async function checkHelpers(me: Me, any: Any) {
  function equal(actual: unknown, expected: unknown) {
    if (actual !== expected)
      throw new Error(`Expected ${expected}, got ${actual}`);
  }
  function throws(callback: () => unknown) {
    try {
      callback();
    } catch {
      return;
    }
    throw new Error("Expected failure");
  }

  const props = me().props<any>();
  equal(props.date.toISOString(), "2026-01-01T00:00:00.000Z");
  equal(props.map.get("color"), props.shared);
  equal(props.colors[0], props.shared);
  equal(props.cyclic.self, props.cyclic);
  equal("missing" in props && props.missing === undefined, true);
  props.shared.color = "changed";
  equal(me().props<any>().shared.color, "red");
  const element = me(document.createElement("div"));
  equal(Object.keys(element.props()).length, 0);
  equal(element.props() === element.props(), false);
  for (const payload of [
    "",
    "broken",
    "{}",
    ...[null, [], 1, "s", true, undefined].map(
      (value) => passProps(value)["data-props"],
    ),
  ]) {
    element.dataset.props = payload;
    throws(() => element.props());
  }
  for (const value of [1, 2]) {
    element.dataset.props = passProps({ value })["data-props"];
    equal(element.props().value, value);
  }

  const template = document.createElement("template");
  template.innerHTML =
    " <!-- before --><div><span>deep</span></div><!-- after --> ";
  const original = template.innerHTML;
  equal(
    element.each(["a", "b"], template, (clone, item, index) => {
      equal(clone.querySelector("span")?.textContent, "deep");
      clone.attr("id", item + index);
    }),
    element,
  );
  equal(Array.from(element.children, (child) => child.id).join(), "a0,b1");
  const previous = element.firstChild;
  throws(() =>
    element.each([1, 2], template, (_clone, item) => {
      if (item === 2) throw new Error("callback");
    }),
  );
  equal(element.firstChild, previous);
  equal(element.children.length, 2);
  for (const html of [
    "",
    "text",
    "<div></div><div></div>",
    "text<div></div>",
    "<div></div>text",
    "<math></math>",
  ]) {
    const invalid = document.createElement("template");
    invalid.innerHTML = html;
    throws(() => element.each([], invalid, () => {}));
    equal(element.firstChild, previous);
  }
  element.each([1], template, () => {});
  equal(element.children.length, 1);
  equal(element.firstChild === previous, false);
  element.each([], template, () => {});
  equal(element.firstChild, null);
  equal(template.innerHTML, original);
  template.innerHTML = "<svg><circle /></svg>";
  element.each([1], template, (clone) => {
    equal(clone instanceof SVGElement, true);
    equal(typeof clone.props, "function");
  });
  equal(element.firstChild instanceof SVGElement, true);

  const buttons = any([
    document.createElement("button"),
    document.createElement("button"),
  ]);
  const parent = document.createElement("div");
  parent.append(...buttons);
  let bubbled = 0;
  let completed = 0;
  const seen: Element[] = [];
  parent.addEventListener("click", () => bubbled++);
  async function handler(
    this: (typeof buttons)[number],
    event: Event,
    element: (typeof buttons)[number],
  ) {
    equal(this, element);
    seen.push(element);
    await Promise.resolve();
    equal(event.currentTarget, null);
    element.disable();
    equal(element.disabled, true);
    completed++;
  }
  equal(buttons.on("click", handler), buttons);
  buttons.send("click");
  equal(seen.length, 2);
  equal(seen[0], buttons[0]);
  equal(seen[1], buttons[1]);
  buttons.onPrevent("click", handler);
  const event = new Event("click", { bubbles: true, cancelable: true });
  buttons[0]!.dispatchEvent(event);
  equal(event.defaultPrevented, true);
  equal(bubbled, 3);
  equal(seen.length, 4);
  await Promise.resolve();
  equal(completed, 4);
  buttons[0]!.onPrevent("submit", (event) =>
    equal(event.defaultPrevented, true),
  );
  buttons[0]!.dispatchEvent(new Event("submit", { cancelable: true }));
  let calls = 0;
  const callback = () => {
    calls++;
  };
  for (const method of ["on", "onPrevent"] as const) {
    buttons[0]![method]("repeat", callback)[method]("repeat", callback);
  }
  buttons[0]!.send("repeat");
  equal(calls, 4);
  buttons[0]!.addEventListener("repeat", callback);
  buttons[0]!.removeEventListener("repeat", callback);
  buttons[0]!.send("repeat");
  equal(calls, 8);
  for (const target of [buttons, me(document)]) {
    equal("props" in target || "each" in target, false);
  }
}
