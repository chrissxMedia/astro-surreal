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
type CoreMethods<T extends SurrealNode> = ReturnType<typeof methods<T, T>>;
// Preserve chaining on the enriched node or collection, including generic overloads.
type BoundMethods<T extends SurrealNode, Collection extends boolean> = {
  [K in keyof CoreMethods<T>]: K extends "on" | "onPrevent"
    ? EventMethod<
        T,
        Collection extends true ? SurrealArray<T> : SurrealElement<T>
      >
    : K extends "attr" | "attribute"
      ? AttributeMethod<
          Collection extends true ? SurrealArray<T> : SurrealElement<T>,
          Collection extends true ? [] : string | null
        >
      : CoreMethods<T>[K] extends (...args: infer A) => T
        ? (
            ...args: A
          ) => Collection extends true ? SurrealArray<T> : SurrealElement<T>
        : CoreMethods<T>[K];
};
export interface SurrealMethods<
  T extends SurrealNode,
  Collection extends boolean = false,
>
  extends BoundMethods<T, Collection>, EffectMethods<T> {}

interface EffectMethods<T extends SurrealNode> {
  fadeOut(
    callback?: (element: SurrealElement<T>) => void,
    ms?: number,
    remove?: boolean,
  ): void;
  fade_out: EffectMethods<T>["fadeOut"];
  fadeIn(callback?: (element: SurrealElement<T>) => void, ms?: number): void;
  fade_in: EffectMethods<T>["fadeIn"];
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

type Nodes = SurrealNode | SurrealNode[] | NodeListOf<SurrealNode>;
type Item<E> = E extends ArrayLike<infer T> ? T : E;

function methods<T extends SurrealNode, E extends Nodes>(e: E) {
  const classAdd = (name: string): E => surreal.classAdd(e, name);
  const classRemove = (name: string): E => surreal.classRemove(e, name);
  const classToggle = (name: string, force?: boolean): E =>
    surreal.classToggle(e, name, force);
  const attribute = ((
    name: string | Record<string, AttributeValue>,
    value?: AttributeValue,
  ) => surreal.attribute(e, name, value)) as AttributeMethod<
    E,
    E extends ArrayLike<SurrealNode> ? [] : string | null
  >;
  return {
    run: (f: (element: SurrealElement<T>) => void): E =>
      surreal.run(e, f as (element: Item<E>) => void),
    remove: (): void => surreal.remove(e),
    classAdd,
    class_add: classAdd,
    add_class: classAdd,
    addClass: classAdd,
    classRemove,
    class_remove: classRemove,
    remove_class: classRemove,
    removeClass: classRemove,
    classToggle,
    class_toggle: classToggle,
    toggle_class: classToggle,
    toggleClass: classToggle,
    styles: (value: string | Partial<CSSStyleDeclaration>): E =>
      surreal.styles(e, value),
    on: ((name, f) => surreal.on(e, name, f as EventListener)) as EventMethod<
      T,
      E
    >,
    onPrevent: ((name, f) =>
      surreal.on(e, name, f as EventListener, true)) as EventMethod<T, E>,
    offAll: (_name?: string): E => surreal.offAll(e),
    disable: (): E => surreal.disable(e),
    enable: (): E => surreal.enable(e),
    send: (name: string, detail?: unknown): E => surreal.send(e, name, detail),
    halt: <Ev extends Event>(
      ev: Ev,
      keepBubbling?: boolean,
      keepDefault?: boolean,
    ): Ev => surreal.halt(ev, keepBubbling, keepDefault),
    attribute,
    attr: attribute,
  };
}

// Vendored & Modified Surreal 1.3.4-d
// License: https://github.com/gnat/surreal/blob/cd8f18d34067e073d0aa25675cc0649e304292a3/LICENSE
// Documentation: https://github.com/gnat/surreal
// Locality of Behavior (LoB): https://htmx.org/essays/locality-of-behaviour/
let surreal = (function (this: void) {
let $ = { // Convenience for internals.
	$: this, // Convenience for internals.
	plugins: [] as ((node: unknown) => void)[],

	// Table of contents and convenient call chaining sugar. For a familiar "jQuery like" syntax. 🙂
	// Check before adding new: https://youmightnotneedjquery.com/
	sugar(e: unknown): unknown {
		if (!$.isNode(e) && !$.isNodeList(e)) { console.warn(`Surreal: Not a supported element / node / node list "${e}"`); return e }
		if ($.isNodeList(e)) e.forEach(_ => { $.sugar(_) }) // Add Surreal to all nodes from any()
		if (e.hasOwnProperty('hasSurreal')) return e // Surreal already added.

		Object.assign(e, methods(e))

		// Add all plugins.
		$.plugins.forEach(function(func) { func(e) })

		Object.assign(e, { hasSurreal: 1 })
		return e
	},
	// me() will return a single element or null. Selector not needed if used with inline <script>
	// If you select many elements, me() will return the first.
	// Example
	//	<div>
	//		Hello World!
	//		<script>me().style.color = 'red'</script>
	//	</div>
	me(selector: unknown, start: HTMLElement): SurrealElement | null {
		if (selector == null) return $.sugar(start) as SurrealElement // Just local me() in <script>
		if (selector instanceof Event) return selector.currentTarget ? $.me(selector.currentTarget, start) : (console.warn(`Surreal: Event currentTarget is null. Please save your element because async will lose it`), null) // Events try currentTarget
		if ($.isSelector(selector, start)) return $.sugar(start.querySelector(selector)) as SurrealElement | null // String selector.
		if ($.isNodeList(selector) && selector.length) return $.me(selector[0], start) // If we got a list, return the first element.
		if ($.isNode(selector)) return $.sugar(selector) as SurrealElement // Valid element.
		return null // Invalid.
	},
	// any() is me() but will return an array of elements or empty [] if nothing is found.
	// You may optionally use forEach/map/filter/reduce.
	// Example: any('button')
	any(selector: unknown, start: HTMLElement): SurrealArray | null {
		if (selector == null) return $.sugar([start]) as SurrealArray // Similar to me()
		if (selector instanceof Event) return selector.currentTarget ? $.any(selector.currentTarget, start) : (console.warn(`Surreal: Event currentTarget is null. Please save your element because async will lose it`), null) // Events try currentTarget
		if ($.isSelector(selector, start)) return $.sugar(Array.from(start.querySelectorAll(selector))) as SurrealArray // String selector.
		if ($.isNode(selector)) return $.sugar([selector]) as SurrealArray // Single element. Convert to Array.
		if ($.isNodeList(selector)) return $.sugar(Array.from(selector)) as SurrealArray // Valid NodeList or Array.
		return $.sugar([]) as SurrealArray // Invalid.
	},
	// Run any function on element(s)
	run<E extends Nodes>(e: E, f: (element: Item<E>) => void): E {
		if (typeof f !== 'function') { console.warn(`Surreal: run(f) f must be a function`); return e }
		if ($.isNodeList(e)) e.forEach(_ => { $.run(_, f as (element: SurrealNode) => void) })
		if ($.isNode(e)) { f(e as Item<E>); }
		return e
	},
	// Remove element(s)
	remove(e: Nodes): void {
		if ($.isNodeList(e)) e.forEach(_ => { $.remove(_) })
		if ($.isNode(e)) e.parentNode!.removeChild(e)
		return // Special, end of chain.
	},
	// Add class to element(s).
	classAdd<E extends Nodes>(e: E, name: string): E {
		if (typeof name !== 'string') return e
		if (name.charAt(0) === '.') name = name.substring(1)
		if ($.isNodeList(e)) e.forEach(_ => { $.classAdd(_, name) })
		if ($.isNode(e)) e.classList.add(name)
		return e
	},
	// Remove class from element(s).
	classRemove<E extends Nodes>(e: E, name: string): E {
		if (typeof name !== 'string') return e
		if (name.charAt(0) === '.') name = name.substring(1)
		if ($.isNodeList(e)) e.forEach(_ => { $.classRemove(_, name) })
		if ($.isNode(e)) e.classList.remove(name)
		return e
	},
	// Toggle class in element(s).
	classToggle<E extends Nodes>(e: E, name: string, force?: boolean): E {
		if (typeof name !== 'string') return e
		if (name.charAt(0) === '.') name = name.substring(1)
		if ($.isNodeList(e)) e.forEach(_ => { $.classToggle(_, name, force) })
		if ($.isNode(e)) e.classList.toggle(name, force)
		return e
	},
	// Add inline style to element(s).
	// Can use string or object formats.
	// 	String format: "font-family: 'sans-serif'"
	// 	Object format; { fontFamily: 'sans-serif', backgroundColor: '#000' }
	styles<E extends Nodes>(e: E, value: string | Partial<CSSStyleDeclaration>): E {
		if (typeof value === 'string') { // Format: "font-family: 'sans-serif'"
			if ($.isNodeList(e)) e.forEach(_ => { $.styles(_, value) })
			if ($.isNode(e)) { $.attribute(e, 'style', ($.attribute(e, 'style') == null ? '' : $.attribute(e, 'style') + '; ') + value)  }
			return e
		}
		if (typeof value === 'object') { // Format: { fontFamily: 'sans-serif', backgroundColor: '#000' }
			if ($.isNodeList(e)) e.forEach(_ => { $.styles(_, value) })
			if ($.isNode(e)) { Object.assign(e.style, value)  }
			return e
		}
		return e
	},
	// Add event listener to element(s).
	// Match a sender: if (!event.target.matches(".selector")) return;
	//	📚️ https://developer.mozilla.org/en-US/docs/Web/API/Event
	//	✂️ Vanilla: document.querySelector(".thing").addEventListener("click", (e) => { alert("clicked") }
	on<E extends Nodes>(e: E, name: string, f: (this: SurrealNode, event: Event, element: SurrealElement) => void, prevent=false): E {
		if ($.isNodeList(e)) e.forEach(_ => { $.on(_, name, f, prevent) })
		if ($.isNode(e)) e.addEventListener(name, function(this: SurrealNode, event) {
			if (prevent) event.preventDefault()
			return f.call(this, event, $.sugar(e) as SurrealElement)
		})
		return e
	},
	offAll<E extends Nodes>(e: E): E {
		if ($.isNodeList(e)) e.forEach(_ => { $.offAll(_) })
		if ($.isNode(e)) e.parentNode!.replaceChild(e.cloneNode(true), e)
		return e
	},
	// Disable element(s).
	disable<E extends Nodes>(e: E): E {
		if ($.isNodeList(e)) e.forEach(_ => { $.disable(_) })
		if ($.isNode(e)) (e as HTMLButtonElement).disabled = true
		return e
	},
	// For reversing disable()
	enable<E extends Nodes>(e: E): E {
		if ($.isNodeList(e)) e.forEach(_ => { $.enable(_) })
		if ($.isNode(e)) (e as HTMLButtonElement).disabled = false
		return e
	},
	// Send / trigger event.
	// ✂️ Vanilla: Events Dispatch: document.querySelector(".thing").dispatchEvent(new Event('click'))
	send<E extends Nodes>(e: E, name: string, detail: unknown=null): E {
		if ($.isNodeList(e)) e.forEach(_ => { $.send(_, name, detail) })
		if ($.isNode(e)) {
			const event = new CustomEvent(name, { detail: detail, bubbles: true })
			e.dispatchEvent(event)
		}
		return e
	},
	// Halt event. Default: Stops normal event actions and event propagation.
	halt<E extends Event>(ev: E, keepBubbling=false, keepDefault=false): E {
		if (ev instanceof Event) {
			if (!keepDefault) ev.preventDefault()
			if (!keepBubbling) ev.stopPropagation()
		}
		return ev
	},
	// Add or remove attributes from element(s)
	attribute<E extends Nodes>(e: E, name: string | Record<string, AttributeValue>, value: AttributeValue | undefined=undefined): E | [] | string | null {
		// Get. (Format: "name", "value") Special: Ends call chain.
		if (typeof name === 'string' && value === undefined) {
			if ($.isNodeList(e)) return [] // Not supported for Get. For many elements, wrap attribute() in any(...).run(...) or any(...).forEach(...)
			if ($.isNode(e)) return e.getAttribute(name)
			return null // No value. Ends call chain.
		}
		// Remove.
		if (typeof name === 'string' && value === null) {
			if ($.isNodeList(e)) e.forEach(_ => { $.attribute(_, name, value) })
			if ($.isNode(e)) e.removeAttribute(name)
			return e
		}
		// Add / Set.
		if (typeof name === 'string') {
			if ($.isNodeList(e)) e.forEach(_ => { $.attribute(_, name, value) })
			if ($.isNode(e)) e.setAttribute(name, value as string)
			return e
		}
		// Format: { "name": "value", "blah": true }
		if (typeof name === 'object') {
			if ($.isNodeList(e)) e.forEach(_ => { Object.entries(name).forEach(([key, val]) => { $.attribute(_, key, val) }) })
			if ($.isNode(e)) Object.entries(name).forEach(([key, val]) => { $.attribute(e, key, val) })
			return e
		}
		return e
	},
	// ⚙️ Used internally. Is this an element / node?
	isNode(e: unknown): e is SurrealNode {
		return (e instanceof HTMLElement || e instanceof SVGElement) ? true : false
	},
	// ⚙️ Used internally by DOM functions. Is this a list of elements / nodes?
	isNodeList(e: unknown): e is SurrealNode[] | NodeListOf<SurrealNode> {
		return (e instanceof NodeList || Array.isArray(e)) ? true : false
	},
	// ⚙️ Used internally by DOM functions. Warning when selector is invalid. Likely missing a "#" or "."
	isSelector(selector: unknown, start: ParentNode): selector is string {
		if (typeof selector !== 'string') return false
		if (start.querySelector(selector) == null) {
			console.log(`Surreal: "${selector}" not found, ignoring.`)
			return false
		}
		return true // Valid.
	},
}
return $
})() // End of Surreal 👏

// DOM.
const createElement = document.createElement.bind(document); const create_element = createElement
// Animation.
const rAF = typeof requestAnimationFrame !== 'undefined' && requestAnimationFrame
const rIC = typeof requestIdleCallback !== 'undefined' && requestIdleCallback
// Loading: Why? So you don't clobber window.onload (predictable sequential loading)
// Example: <script>onloadAdd(() => { console.log("Page was loaded!") })</script>
// Example: <script>onloadAdd(() => { console.log("Lets do another thing without clobbering window.onload!") })</script>
const addOnload = (f: () => void) => {
	if (typeof window.onload === 'function') { // window.onload already is set, queue functions together (creates a call chain).
		let onload_old = window.onload as () => void
		window.onload = () => {
			onload_old()
			f()
		}
		return
	}
	window.onload = f // window.onload was not set yet.
}

export default surreal;
