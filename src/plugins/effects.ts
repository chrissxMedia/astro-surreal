import surreal from "../surreal.mjs";

// 🔌 Plugin: Effects
export function pluginEffects(e: any) {
  // Fade out and remove element.
  // Equivalent to jQuery fadeOut(), but actually removes the element!
  function fadeOut(e: any, f: any = undefined, ms = 1000, remove = true) {
    let thing = e;
    if (surreal.isNodeList(e))
      e.forEach((_: any) => {
        fadeOut(_, f, ms);
      });
    if (surreal.isNode(e)) {
      (async () => {
        surreal.styles(e, {
          transform: "scale(1)",
          transition: `all ${ms}ms ease-out`,
          overflow: "hidden",
        });
        await tick();
        surreal.styles(e, { transform: "scale(0.9)", opacity: "0" });
        await sleep(ms, e);
        if (typeof f === "function") f(thing); // Run custom callback?
        if (remove) surreal.remove(thing); // Remove element after animation is completed?
      })();
    }
  }
  // Fade in an element that has opacity under 1
  function fadeIn(e: any, f: any = undefined, ms = 1000) {
    let thing = e;
    if (surreal.isNodeList(e))
      e.forEach((_: any) => {
        fadeIn(_, f, ms);
      });
    if (surreal.isNode(e)) {
      (async () => {
        let save = e.style; // Store original style.
        surreal.styles(e, {
          transition: `all ${ms}ms ease-in`,
          overflow: "hidden",
        });
        await tick();
        surreal.styles(e, { opacity: "1" });
        await sleep(ms, e);
        e.style = save; // Revert back to original style.
        surreal.styles(e, { opacity: "1" }); // Ensure we're visible after reverting to original style.
        if (typeof f === "function") f(thing); // Run custom callback?
      })();
    }
  }
  // Add sugar
  e.fadeOut = (f: any, ms: any, remove: any) => {
    return fadeOut(e, f, ms, remove);
  };
  e.fade_out = e.fadeOut;
  e.fadeIn = (f: any, ms: any) => {
    return fadeIn(e, f, ms);
  };
  e.fade_in = e.fadeIn;
}

// Animation: Wait for next animation frame, non-blocking.
async function tick() {
  return await new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}
// Animation: Sleep, non-blocking.
async function sleep(ms: number, e: any) {
  return await new Promise((resolve) =>
    setTimeout(() => {
      resolve(e);
    }, ms),
  );
}
