import { parse } from "@astrojs/compiler-rs";
import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";
import MagicString from "magic-string";
import ts from "typescript";

const htmlRoots = new Set(
  (
    "a abbr address area article aside audio b base bdi bdo blockquote " +
    "body br button canvas caption cite code col colgroup data datalist " +
    "dd del details dfn dialog div dl dt em embed fieldset figcaption " +
    "figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i " +
    "iframe img input ins kbd label legend li link main map mark menu " +
    "meta meter nav noscript object ol optgroup option output p picture " +
    "pre progress q rp rt ruby s samp search section select small source " +
    "span strong sub summary sup table tbody td textarea tfoot th thead " +
    "time title tr track u ul var video wbr"
  ).split(" "),
);

type AstroNode = ReturnType<typeof parse>["ast"];
type Fail = (message: string, offset: number) => never;

export function transformComponent(source: string, id: string, root: string) {
  const fail = createFail(source, id, root);
  const component = findComponent(source, fail);
  if (!component) return;
  const { start } = component;
  const behavior = analyzeScript(component.file, start, fail);
  const identity = relative(resolve(root), resolve(id)).replaceAll("\\", "/");
  return emitComponent(source, id, identity, component, behavior, fail);
}

function createFail(source: string, id: string, root: string): Fail {
  return (message, offset) => {
    const lines = source.slice(0, offset).split("\n");
    const line = lines.length;
    const column = lines.at(-1)!.length;
    throw Object.assign(
      new Error(`${message} (${relative(root, id)}:${line}:${column + 1})`),
      { id, loc: { file: id, line, column } },
    );
  };
}

interface MarkedScript {
  node: AstroNode;
  file: ts.SourceFile;
  helpers: Map<ts.ImportSpecifier, string>;
}

function helperImports(file: ts.SourceFile) {
  const helpers = new Map<ts.ImportSpecifier, string>();
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== "astro-surreal"
    )
      continue;
    const clause = statement.importClause;
    if (
      !clause ||
      clause.isTypeOnly ||
      !clause.namedBindings ||
      !ts.isNamedImports(clause.namedBindings)
    )
      continue;
    for (const item of clause.namedBindings.elements) {
      const name = (item.propertyName ?? item.name).text;
      if (!item.isTypeOnly && ["me", "any"].includes(name)) {
        helpers.set(item, name);
      }
    }
  }
  return helpers;
}

function findMarkedScripts(
  source: string,
  node: AstroNode,
  scripts: MarkedScript[] = [],
) {
  if (
    node.type === "JSXElement" &&
    node.openingElement.name.name === "script" &&
    node.closingElement
  ) {
    const body = source.slice(
      node.openingElement.end,
      node.closingElement.start,
    );
    const file = ts.createSourceFile(
      "behavior.ts",
      body,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const helpers = helperImports(file);
    if (helpers.size) scripts.push({ node, file, helpers });
    return scripts;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === "object") {
          findMarkedScripts(source, child, scripts);
        }
      }
    } else if (value && typeof value === "object") {
      findMarkedScripts(source, value, scripts);
    }
  }
  return scripts;
}

function findComponent(source: string, fail: Fail) {
  const { ast, diagnostics } = parse(source);
  const scripts = findMarkedScripts(source, ast);
  if (!scripts.length) return;
  for (const error of diagnostics)
    if (error.severity === "error")
      fail(error.text, error.labels?.[0]?.start ?? scripts[0]!.node.start);
  if (scripts.length !== 1)
    fail(
      "Use exactly one Surreal script per component.",
      scripts[1]!.node.start,
    );
  const { node: script, file, helpers } = scripts[0]!;
  const roots = ast.body.filter(
    (n: AstroNode) =>
      !(n.type === "JSXText" && !n.value.trim()) &&
      n.type !== "AstroComment" &&
      !(
        n.type === "JSXElement" &&
        ["script", "style"].includes(n.openingElement.name.name)
      ),
  );
  const element = roots[0];
  const opening = element?.openingElement;
  if (
    roots.length !== 1 ||
    element?.type !== "JSXElement" ||
    opening?.name.type !== "JSXIdentifier" ||
    !htmlRoots.has(opening.name.name)
  )
    fail(
      "Wrap the component markup in exactly one native HTML element.",
      roots[1]?.start ?? element?.start ?? script.start,
    );
  if (
    opening.attributes.some((a: AstroNode) =>
      ["set:html", "set:text"].includes(a.name?.name),
    ) &&
    script.start < element.end
  )
    fail(
      "The marked script must not be replaced by set:html or set:text.",
      script.start,
    );
  if (script.openingElement.attributes.length) {
    fail(
      "Surreal imports require a plain <script> without attributes.",
      script.start,
    );
  }
  const start = script.openingElement.end;
  const end = script.closingElement.start;
  return { opening, script, start, end, file, helpers };
}

function inspectIdentifiers(file: ts.SourceFile) {
  const names = new Set<string>();
  function inspect(node: ts.Node) {
    if (ts.isIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, inspect);
  }
  inspect(file);
  return names;
}

function analyzeScript(file: ts.SourceFile, start: number, fail: Fail) {
  const options = { noLib: true, noResolve: true };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name) => (name === file.fileName ? file : undefined);
  const program = ts.createProgram([file.fileName], options, host);
  for (const error of program.getSyntacticDiagnostics(file))
    fail(
      ts.flattenDiagnosticMessageText(error.messageText, "\n"),
      start + (error.start ?? 0),
    );
  const names = inspectIdentifiers(file);
  let register = "__surrealRegister";
  while (names.has(register)) register += "_";
  return { imports: collectImports(file, start, fail), register };
}

function collectImports(file: ts.SourceFile, offset: number, fail: Fail) {
  const imports: ts.ImportDeclaration[] = [];
  for (const statement of file.statements) {
    const exported =
      ts.canHaveModifiers(statement) &&
      ts
        .getModifiers(statement)
        ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (
      exported ||
      ts.isExportDeclaration(statement) ||
      ts.isExportAssignment(statement) ||
      ts.isImportEqualsDeclaration(statement)
    ) {
      fail(
        "Module exports and import assignments " +
          "are not supported in Surreal scripts.",
        offset + statement.getStart(file),
      );
    }
    if (!ts.isImportDeclaration(statement)) continue;
    imports.push(statement);
  }
  return imports;
}

function componentMarker(identity: string) {
  const hash = createHash("sha256")
    .update(identity)
    .digest("base64url")
    .toLowerCase()
    .replace(/[-_]/g, "")
    .slice(0, 8);
  return `data-surreal-${hash}`;
}

function emitComponent(
  source: string,
  id: string,
  identity: string,
  component: NonNullable<ReturnType<typeof findComponent>>,
  behavior: ReturnType<typeof analyzeScript>,
  fail: Fail,
) {
  const { opening, script, start, end, file, helpers } = component;
  const { imports, register } = behavior;
  const marker = componentMarker(identity);
  const output = new MagicString(source);
  if (opening.attributes.some((a: AstroNode) => a.name?.name === marker))
    fail("The generated Surreal marker is reserved.", opening.start);
  output.appendLeft(
    opening.end - (opening.selfClosing ? 2 : 1),
    ` ${marker}=""`,
  );
  output.overwrite(script.start, start, "<script>");
  const firstStatement = file.statements.find(
    (statement) => !ts.isImportDeclaration(statement),
  );
  const bodyStart = firstStatement
    ? start + firstStatement.getFullStart()
    : end;
  for (const statement of imports) {
    const importStart = start + statement.getFullStart();
    const clause = statement.importClause;
    const named = clause?.namedBindings;
    if (
      named &&
      ts.isNamedImports(named) &&
      named.elements.some((item) => helpers.has(item))
    ) {
      if (
        clause.name ||
        named.elements.some(
          (item) =>
            !item.isTypeOnly &&
            (item.propertyName ?? item.name).text === "default",
        )
      )
        fail(
          "Import the default integration separately from me and any.",
          start + statement.getStart(file),
        );
      output.remove(importStart, start + statement.end);
      continue;
    }
    if (importStart > bodyStart) {
      output.appendRight(importStart, "\n");
      output.move(importStart, start + statement.end, bodyStart);
    }
  }
  const bindings = [...helpers]
    .map(([item, name]) => `${name}: ${item.name.text}`)
    .join(",");
  output.appendRight(
    bodyStart,
    `\nimport { register as ${register} } ` +
      `from "astro-surreal/runtime";\n` +
      `${register}(${JSON.stringify(marker)}, ${JSON.stringify(identity)}, ` +
      `async ({${bindings}}) => {\n`,
  );
  output.appendRight(end, "\n});\n");
  return {
    code: output.toString(),
    map: output.generateMap({ source: id, includeContent: true, hires: true }),
  };
}
