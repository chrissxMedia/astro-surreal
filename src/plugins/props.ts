import { parse, stringify } from "devalue";
import type { SurrealElement } from "../surreal.ts";

export function passProps(value: unknown) {
  return { "data-props": stringify(value) };
}

export function pluginProps(node: unknown) {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
  const element = node as SurrealElement;
  Object.assign(element, {
    props<P = Record<string, unknown>>(): P {
      const payload = element.getAttribute("data-props");
      const value: unknown = payload === null ? {} : parse(payload);
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("data-props must contain a non-null object");
      }
      return value as P;
    },
  });
}
