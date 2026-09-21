export type SurrealNode = HTMLElement | SVGElement;
export type SurrealElement<T extends SurrealNode = HTMLElement | SVGElement> =
  T & SurrealMethods<T> & ElementMethods;
export type SurrealArray<T extends SurrealNode = HTMLElement | SVGElement> =
  SurrealElement<T>[] & SurrealMethods<T, true>;

interface ElementMethods {
  props<P = Record<string, unknown>>(): P;
  each<Item>(
    items: readonly Item[],
    template: HTMLTemplateElement,
    callback: (clone: SurrealElement, item: Item, index: number) => undefined,
  ): this;
}

type AttributeValue = string | number | boolean | null;
interface AttributeMethod<T, Result> {
  (name: string): Result;
  (name: string, value: AttributeValue): T;
  (values: Record<string, AttributeValue>): T;
}
interface EventMethod<T extends SurrealNode, Result> {
  <
    K extends string,
    E extends Event = K extends keyof HTMLElementEventMap
      ? HTMLElementEventMap[K]
      : Event,
  >(
    name: K,
    callback: (
      this: SurrealElement<T>,
      event: E & { readonly currentTarget: T | null },
      element: SurrealElement<T>,
    ) => void,
  ): Result;
}
export interface SurrealMethods<
  T extends SurrealNode,
  Collection extends boolean = false,
> {
  run(callback: (element: SurrealElement<T>) => void): this;
  remove(): void;
  classAdd(name: string): this;
  class_add(name: string): this;
  add_class(name: string): this;
  addClass(name: string): this;
  classRemove(name: string): this;
  class_remove(name: string): this;
  remove_class(name: string): this;
  removeClass(name: string): this;
  classToggle(name: string, force?: boolean): this;
  class_toggle(name: string, force?: boolean): this;
  toggle_class(name: string, force?: boolean): this;
  toggleClass(name: string, force?: boolean): this;
  styles(value: string | Partial<CSSStyleDeclaration>): this;
  on: EventMethod<T, this>;
  onPrevent: EventMethod<T, this>;
  offAll(name?: string): this;
  disable(): this;
  enable(): this;
  send(name: string, detail?: unknown): this;
  halt<E extends Event>(
    event: E,
    keepBubbling?: boolean,
    keepDefault?: boolean,
  ): E;
  attribute: AttributeMethod<
    this,
    Collection extends true ? [] : string | null
  >;
  attr: AttributeMethod<this, Collection extends true ? [] : string | null>;
  fadeOut(
    callback?: (element: SurrealElement<T>) => void,
    ms?: number,
    remove?: boolean,
  ): void;
  fade_out(
    callback?: (element: SurrealElement<T>) => void,
    ms?: number,
    remove?: boolean,
  ): void;
  fadeIn(callback?: (element: SurrealElement<T>) => void, ms?: number): void;
  fade_in(callback?: (element: SurrealElement<T>) => void, ms?: number): void;
}

export interface Me {
  (selector?: null): SurrealElement<HTMLElement>;
  <K extends keyof HTMLElementTagNameMap>(
    selector: K,
  ): SurrealElement<HTMLElementTagNameMap[K]> | null;
  (selector: string): SurrealElement | null;
  <T extends SurrealNode>(selector: T): SurrealElement<T>;
  <T extends SurrealNode>(
    selector: T[] | NodeListOf<T & Node>,
  ): SurrealElement<T> | null;
  <T extends SurrealNode>(
    selector: Event & { readonly currentTarget: T | null },
  ): SurrealElement<T> | null;
  (selector: Event | EventTarget | null): SurrealElement<SurrealNode> | null;
}
export interface Any {
  (selector?: null): SurrealArray<HTMLElement>;
  <K extends keyof HTMLElementTagNameMap>(
    selector: K,
  ): SurrealArray<HTMLElementTagNameMap[K]>;
  (selector: string): SurrealArray;
  <T extends SurrealNode>(
    selector: T | T[] | NodeListOf<T & Node>,
  ): SurrealArray<T>;
  <T extends SurrealNode>(
    selector: Event & { readonly currentTarget: T | null },
  ): SurrealArray<T> | null;
  (selector: Event | EventTarget): SurrealArray<SurrealNode> | null;
}
