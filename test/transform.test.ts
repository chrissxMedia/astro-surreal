import { test } from "node:test";
import { SourceMap } from "node:module";
import assert from "node:assert/strict";
import { transformComponent } from "../src/transform.ts";
import { transform } from "@astrojs/compiler-rs";
const run = (source: string) =>
  transformComponent(source, "/app/src/Test.astro", "/app");
const script = (body = "me()") =>
  `<script>import { me, any } from "astro-surreal";${body}</script>`;

test("only named helper value imports mark scripts", () => {
  for (const body of [
    "me()",
    'import type { Me } from "astro-surreal";',
    'import { type me } from "astro-surreal";',
    'import surreal from "astro-surreal";',
    'import * as surreal from "astro-surreal";',
    'import "astro-surreal";',
    'import { me } from "other";',
    "const text = 'import { me } from \"astro-surreal\"';",
  ])
    assert.equal(run(`<div/><script>${body}</script>`), undefined);
});

test("import aliases bind to roots and other imports stay shared", () => {
  const source = `<div {...props}/><script>
import { me as self, any, type Me } from "astro-surreal";
const __surrealRegister = 1;
import { x } from "x";
await x(); self("prev"); any('-');
</script>`;
  const result = run(source)!;
  assert.match(result.code, /register as __surrealRegister_/);
  assert.match(result.code, /me: self,any: any/);
  assert.ok(
    result.code.indexOf("import { x }") < result.code.indexOf("async ({"),
  );
  assert.doesNotMatch(result.code, /from "astro-surreal"/);
  assert.equal(
    transform(result.code, { filename: "Test.astro" }).diagnostics.filter(
      (d) => d.severity === "error",
    ).length,
    0,
  );
});

test("invalid roots, multiple behaviors, exports and script attributes", () => {
  for (const root of [
    "",
    "<div/><div/>",
    "<Component/>",
    "{true && <div/>}",
    "<><div/></>",
    "<slot/>",
    "<svg/>",
  ]) {
    assert.throws(
      () => run(root + script()),
      (e) => Boolean((e as any).loc),
    );
  }
  assert.throws(() => run("<div/>" + script() + script()), /exactly one/);
  assert.throws(() => run("<div/>" + script("export const x = 1;")), /exports/);
  assert.throws(
    () => run(("<div/>" + script()).replace("<script>", "<script is:inline>")),
    /without attributes/,
  );
  assert.throws(() => run("<div/>" + script("let =")), /Unexpected token/);
});

test("markers normalize paths and follow spreads", () => {
  const source = "<div {...props}/>" + script();
  const a = run(source)!;
  const b = transformComponent(
    source,
    "/elsewhere/src/Test.astro",
    "/elsewhere",
  )!;
  assert.equal(a.code, b.code);
  assert.match(a.code, /\.\.\.props\} data-surreal-[a-z0-9]{8}=""/);
});

test("nested scripts, Unicode, multiple helper imports and ordinary scripts", () => {
  const result = run(
    "<!-- 💖 --><div>" +
      script() +
      '</div><script>console.log("ordinary")</script>',
  )!;
  assert.match(result.code, /<script>console.log\("ordinary"\)<\/script>/);
  assert.throws(
    () => run("{true && <div>" + script() + "</div>}"),
    /exactly one native HTML element/,
  );
  const aliases = run(
    '<div/><script>import { me as a, me as b } from "astro-surreal"; a(); b();</script>',
  )!;
  assert.match(aliases.code, /me: a,me: b/);
});

test("helper imports are removed together with their types and comments", () => {
  const declaration =
    'import { type Me, /* removed */ me, any /* tail */, } from "astro-surreal";';
  for (const body of [
    declaration,
    `${declaration}\nme();`,
    `me();${declaration}`,
  ]) {
    const result = run(`<div/><script>${body}</script>`)!;
    const compiled = transform(result.code, { filename: "Test.astro" });
    assert.deepEqual(
      compiled.diagnostics.filter((d) => d.severity === "error"),
      [],
      result.code,
    );
    assert.doesNotMatch(result.code, /from "astro-surreal"/);
  }
});

test("moved imports remain separate without authored semicolons or whitespace", () => {
  const source = `<div/><script>import { me } from "astro-surreal";
import a from "a"
me();import b from "b";import c from "c";
</script>`;
  const result = run(source)!;
  assert.deepEqual(
    transform(result.code, { filename: "Test.astro" }).diagnostics.filter(
      (d) => d.severity === "error",
    ),
    [],
  );
  assert.ok(result.code.indexOf("import a") < result.code.indexOf("import b"));
  assert.ok(result.code.indexOf("import b") < result.code.indexOf("import c"));
  assert.ok(result.code.indexOf("import c") < result.code.indexOf("async ({"));
});

test("retained import names and executable statements keep original mappings", () => {
  const source = `<!-- 💖 --><div/><script>
import { me, /* keep */ type Me, any } from "astro-surreal";
const root = me();
import { something } from "other";
root.textContent = something;
</script>`;
  const result = run(source)!;
  const map = new SourceMap(JSON.parse(result.map.toString()));
  for (const text of ["something }", "const root", "root.textContent"]) {
    const generated = result.code
      .slice(0, result.code.indexOf(text))
      .split("\n");
    const original = source.slice(0, source.indexOf(text)).split("\n");
    const entry = map.findEntry(generated.length - 1, generated.at(-1)!.length);
    assert.ok("originalLine" in entry);
    assert.equal(entry.originalLine, original.length - 1, text);
    assert.equal(entry.originalColumn, original.at(-1)!.length, text);
  }
});

test("generated registration imports the runtime module", () => {
  const result = run("<div/>" + script())!;
  assert.match(result.code, /from "astro-surreal\/runtime"/);
  assert.doesNotMatch(result.code, /virtual:astro-surreal/);
});

test("default integration imports must be separate from helpers", () => {
  for (const bindings of ["surreal, { me }", "{ default as surreal, any }"]) {
    assert.throws(
      () =>
        run(`<div/><script>import ${bindings} from "astro-surreal";</script>`),
      (error: any) => {
        assert.match(error.message, /default integration separately/);
        assert.equal(error.loc.line, 1);
        assert.equal(error.loc.column, 14);
        return true;
      },
    );
  }
  const result = run(
    "<div/>" + script('import surreal from "astro-surreal"; me();'),
  )!;
  assert.match(result.code, /import surreal from "astro-surreal"/);
});
