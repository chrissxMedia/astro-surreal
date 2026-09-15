// Vendored & Modified Surreal 1.3.4-d
// License: https://github.com/gnat/surreal/blob/cd8f18d34067e073d0aa25675cc0649e304292a3/LICENSE
// Documentation: https://github.com/gnat/surreal
// Locality of Behavior (LoB): https://htmx.org/essays/locality-of-behaviour/
let surreal = (function () {
let $ = { // Convenience for internals.
	$: this, // Convenience for internals.
	plugins: [],

	// Table of contents and convenient call chaining sugar. For a familiar "jQuery like" syntax. 🙂
	// Check before adding new: https://youmightnotneedjquery.com/
	sugar(e) {
		if (!$.isNode(e) && !$.isNodeList(e)) { console.warn(`Surreal: Not a supported element / node / node list "${e}"`); return e }
		if ($.isNodeList(e)) e.forEach(_ => { $.sugar(_) }) // Add Surreal to all nodes from any()
		if (e.hasOwnProperty('hasSurreal')) return e // Surreal already added.

		// General
		e.run           = (f) => { return $.run(e, f) }
		e.remove        = () => { return $.remove(e) }

		// Classes and CSS.
		e.classAdd      = (name) => { return $.classAdd(e, name) }
		e.class_add     = e.add_class = e.addClass = e.classAdd // Alias
		e.classRemove   = (name) => { return $.classRemove(e, name) }
		e.class_remove  = e.remove_class = e.removeClass = e.classRemove // Alias
		e.classToggle   = (name, force) => { return $.classToggle(e, name, force) }
		e.class_toggle  = e.toggle_class = e.toggleClass = e.classToggle // Alias
		e.styles        = (value) => { return $.styles(e, value) }

		// Events.
		e.on            = (name, f) => { return $.on(e, name, f) }
		e.onPrevent     = (name, f) => { return $.on(e, name, f, true) }
		e.offAll        = (name) => { return $.offAll(e, name) }
		e.disable       = () => { return $.disable(e) }
		e.enable        = () => { return $.enable(e) }
		e.send          = (name, detail) => { return $.send(e, name, detail) }
		e.halt          = (ev, keepBubbling, keepDefault) => { return $.halt(ev, keepBubbling, keepDefault) }

		// Attributes.
		e.attribute 	= (name, value) => { return $.attribute(e, name, value) }
		e.attr = e.attribute;

		// Add all plugins.
		$.plugins.forEach(function(func) { func(e) })

		e.hasSurreal = 1
		return e
	},
	// me() will return a single element or null. Selector not needed if used with inline <script>
	// If you select many elements, me() will return the first.
	// Example
	//	<div>
	//		Hello World!
	//		<script>me().style.color = 'red'</script>
	//	</div>
	me(selector, start) {
		if (selector == null) return $.sugar(start) // Just local me() in <script>
		if (selector instanceof Event) return selector.currentTarget ? $.me(selector.currentTarget, start) : (console.warn(`Surreal: Event currentTarget is null. Please save your element because async will lose it`), null) // Events try currentTarget
		if ($.isSelector(selector, start)) return $.sugar(start.querySelector(selector)) // String selector.
		if ($.isNodeList(selector) && selector.length) return $.me(selector[0], start) // If we got a list, return the first element.
		if ($.isNode(selector)) return $.sugar(selector) // Valid element.
		return null // Invalid.
	},
	// any() is me() but will return an array of elements or empty [] if nothing is found.
	// You may optionally use forEach/map/filter/reduce.
	// Example: any('button')
	any(selector, start) {
		if (selector == null) return $.sugar([start]) // Similar to me()
		if (selector instanceof Event) return selector.currentTarget ? $.any(selector.currentTarget, start) : (console.warn(`Surreal: Event currentTarget is null. Please save your element because async will lose it`), null) // Events try currentTarget
		if ($.isSelector(selector, start)) return $.sugar(Array.from(start.querySelectorAll(selector))) // String selector.
		if ($.isNode(selector)) return $.sugar([selector]) // Single element. Convert to Array.
		if ($.isNodeList(selector)) return $.sugar(Array.from(selector)) // Valid NodeList or Array.
		return $.sugar([]) // Invalid.
	},
	// Run any function on element(s)
	run(e, f) {
		if (typeof f !== 'function') { console.warn(`Surreal: run(f) f must be a function`); return e }
		if ($.isNodeList(e)) e.forEach(_ => { $.run(_, f) })
		if ($.isNode(e)) { f(e); }
		return e
	},
	// Remove element(s)
	remove(e) {
		if ($.isNodeList(e)) e.forEach(_ => { $.remove(_) })
		if ($.isNode(e)) e.parentNode.removeChild(e)
		return // Special, end of chain.
	},
	// Add class to element(s).
	classAdd(e, name) {
		if (typeof name !== 'string') return e
		if (name.charAt(0) === '.') name = name.substring(1)
		if ($.isNodeList(e)) e.forEach(_ => { $.classAdd(_, name) })
		if ($.isNode(e)) e.classList.add(name)
		return e
	},
	// Remove class from element(s).
	classRemove(e, name) {
		if (typeof name !== 'string') return e
		if (name.charAt(0) === '.') name = name.substring(1)
		if ($.isNodeList(e)) e.forEach(_ => { $.classRemove(_, name) })
		if ($.isNode(e)) e.classList.remove(name)
		return e
	},
	// Toggle class in element(s).
	classToggle(e, name, force) {
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
	styles(e, value) {
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
	on(e, name, f, prevent=false) {
		if ($.isNodeList(e)) e.forEach(_ => { $.on(_, name, f, prevent) })
		if ($.isNode(e)) e.addEventListener(name, function(event) {
			if (prevent) event.preventDefault()
			return f.call(this, event, $.sugar(e))
		})
		return e
	},
	offAll(e) {
		if ($.isNodeList(e)) e.forEach(_ => { $.offAll(_) })
		if ($.isNode(e)) e.parentNode.replaceChild(e.cloneNode(true), e)
		return e
	},
	// Disable element(s).
	disable(e) {
		if ($.isNodeList(e)) e.forEach(_ => { $.disable(_) })
		if ($.isNode(e)) e.disabled = true
		return e
	},
	// For reversing disable()
	enable(e) {
		if ($.isNodeList(e)) e.forEach(_ => { $.enable(_) })
		if ($.isNode(e)) e.disabled = false
		return e
	},
	// Send / trigger event.
	// ✂️ Vanilla: Events Dispatch: document.querySelector(".thing").dispatchEvent(new Event('click'))
	send(e, name, detail=null) {
		if ($.isNodeList(e)) e.forEach(_ => { $.send(_, name, detail) })
		if ($.isNode(e)) {
			const event = new CustomEvent(name, { detail: detail, bubbles: true })
			e.dispatchEvent(event)
		}
		return e
	},
	// Halt event. Default: Stops normal event actions and event propagation.
	halt(ev, keepBubbling=false, keepDefault=false) {
		if (ev instanceof Event) {
			if (!keepDefault) ev.preventDefault()
			if (!keepBubbling) ev.stopPropagation()
		}
		return ev
	},
	// Add or remove attributes from element(s)
	attribute(e, name, value=undefined) {
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
			if ($.isNode(e)) e.setAttribute(name, value)
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
	isNode(e) {
		return (e instanceof HTMLElement || e instanceof SVGElement || e instanceof Document) ? true : false
	},
	// ⚙️ Used internally by DOM functions. Is this a list of elements / nodes?
	isNodeList(e) {
		return (e instanceof NodeList || Array.isArray(e)) ? true : false
	},
	// ⚙️ Used internally by DOM functions. Warning when selector is invalid. Likely missing a "#" or "."
	isSelector(selector, start) {
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
const addOnload = (f) => {
	if (typeof window.onload === 'function') { // window.onload already is set, queue functions together (creates a call chain).
		let onload_old = window.onload
		window.onload = () => {
			onload_old()
			f()
		}
		return
	}
	window.onload = f // window.onload was not set yet.
}

export default surreal;
