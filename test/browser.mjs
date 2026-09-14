import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const reports = [];
page.on("console", (message) => {
  if (message.type() === "error") reports.push(message.text());
});
await page.addInitScript(() => {
  window.violations = [];
  document.addEventListener("securitypolicyviolation", (e) =>
    window.violations.push(e.violatedDirective),
  );
});
try {
  await page.goto(process.env.URL || "http://localhost:4330");
  await page.waitForSelector('[data-test="one"][data-ready="yes"]');
  assert.equal(await page.locator('[data-ready="yes"]').count(), 3);
  await page.waitForSelector('[data-async="other"][data-starts="1"]', {
    state: "attached",
  });
  await page.evaluate(() => {
    document.dispatchEvent(new Event("astro:page-load"));
    document.dispatchEvent(new Event("astro:page-load"));
  });
  assert.deepEqual(
    await page
      .locator("[data-async]")
      .evaluateAll((roots) => roots.map((r) => r.dataset.starts)),
    ["1", "1"],
  );
  assert.equal(await page.locator("[data-async][data-done]").count(), 0);
  await page.evaluate(() =>
    document.dispatchEvent(new Event("fixture:resume")),
  );
  assert.deepEqual(
    await page
      .locator("[data-test]")
      .evaluateAll((roots) => roots.map((r) => r.dataset.shared)),
    ["1", "2", "3"],
  );
  assert.equal(
    await page.locator('[data-test="two"]').getAttribute("data-descendants"),
    "4",
  );
  assert.equal(
    await page.locator('[data-test="nested"]').getAttribute("data-descendants"),
    "2",
  );
  assert.ok(
    await page
      .locator("[data-test]")
      .evaluateAll((roots) => roots.every((r) => r.dataset.version === "npm")),
  );
  await page.locator('[data-test="one"] > .count').click();
  await page.locator('[data-test="one"] > .count').click();
  assert.equal(
    await page.locator('[data-test="one"] > .count').textContent(),
    "2",
  );
  assert.equal(
    await page.locator('[data-test="two"] > .count').textContent(),
    "0",
  );
  await page.evaluate(() => {
    document.dispatchEvent(new Event("astro:page-load"));
    document.dispatchEvent(new Event("astro:page-load"));
  });
  await page.waitForSelector('[data-async="other"][data-done="yes"]', {
    state: "attached",
  });
  assert.deepEqual(
    await page
      .locator("[data-async]")
      .evaluateAll((roots) => roots.map((r) => r.dataset.starts)),
    ["1", "1"],
  );
  assert.equal(
    reports.filter((r) => r.includes("fixture rejection")).length,
    1,
  );
  await page.locator('[data-test="one"] > .hide').click();
  await page.waitForSelector('[data-test="one"] > .hide', {
    state: "detached",
  });
  await page.waitForSelector('#selectors[data-checked="yes"]');
  await page.waitForSelector('[data-register-late][data-late="yes"]', {
    state: "attached",
  });
  assert.equal(
    reports.filter((r) => r.includes("fixture synchronous failure")).length,
    1,
  );
  assert.equal(await page.locator("html").getAttribute("data-ordinary"), "yes");
  if (process.env.CSP !== "1") {
    await page.evaluate(() => {
      window.savedRoot = document.querySelector('[data-test="one"]');
    });
    await page.getByText("Next", { exact: true }).click();
    await page.waitForSelector('#late:text("initialized")');
    assert.ok(
      await page.evaluate(
        () => window.savedRoot === document.querySelector('[data-test="one"]'),
      ),
    );
    assert.equal(
      await page.locator('[data-test="one"] > .count').textContent(),
      "2",
    );
    await page.locator('[data-test="one"] > .count').click();
    assert.equal(
      await page.locator('[data-test="one"] > .count').textContent(),
      "3",
    );
    assert.equal(
      await page.locator('[data-test="new"] > .count').textContent(),
      "0",
    );
    await page.getByText("Back", { exact: true }).click();
    await page.waitForSelector('[data-test="two"][data-ready="yes"]');
    assert.equal(
      await page.locator('[data-test="one"] > .count').textContent(),
      "3",
    );
  } else {
    assert.ok(
      await page
        .locator('meta[http-equiv="content-security-policy" i]')
        .count(),
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(await page.evaluate(() => window.violations), []);
  assert.ok(
    reports.every(
      (r) =>
        r.includes("fixture rejection") ||
        r.includes("fixture synchronous failure"),
    ),
    reports.join("\n"),
  );
  console.log(
    process.env.CSP === "1"
      ? "CSP browser checks passed"
      : "Navigation browser checks passed",
  );
} finally {
  await browser.close();
}
