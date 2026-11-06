import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listTestFiles, runtimeImports, splitTestFiles } from "./test-sets";

const repository = path.resolve(".");
let root: string | undefined;
afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

function write(relative: string, text: string) {
  const file = path.join(root!, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

describe("unit test sets", () => {
  it("reads the modules a file loads when it runs, not its type-only imports", () => {
    expect(runtimeImports([
      'import { a } from "./a";',
      'import type { B } from "./b";',
      "import {\n  c,\n  type C,\n} from '../c';",
      'import "./side-effect";',
      'export { d } from "./d";',
      'export type { E } from "./e";',
      'const f = await import("./f");',
      'import { describe } from "vitest";',
      '// import { old } from "./commented";',
      "/**\n * import { doc } from \"./in-doc\";\n */",
      'const pattern = "src/**/*.test.ts";',
      "write(\"a.test.ts\", 'import { buildContent } from \"./in-string\";');",
    ].join("\n"))).toEqual(["./a", "../c", "./side-effect", "./d", "vitest", "./f"]);
  });

  it("puts a test in the content set when its imports reach the content build at any depth", () => {
    root = mkdtempSync(path.join(tmpdir(), "dreamscape-test-sets-"));
    write("scripts/content-pipeline.ts", "export const buildContent = () => {};\n");
    write("src/content/test-fixtures.ts", 'import { cp } from "node:fs/promises";\nexport const prepareContentFixture = cp;\n');
    write("scripts/tool.ts", 'import { buildContent } from "./content-pipeline";\nexport const tool = buildContent;\n');
    write("scripts/types.ts", 'import type { buildContent } from "./content-pipeline";\nexport type Build = typeof buildContent;\n');
    write("src/rules/a.ts", 'import { b } from "./b";\nexport const a = b;\n');
    write("src/rules/b.ts", 'import { a } from "./a";\nexport const b = 1;\n');
    write("scripts/direct.test.ts", 'import { buildContent } from "./content-pipeline";\n');
    write("scripts/indirect.test.ts", 'import { tool } from "./tool";\n');
    write("src/content/fixture.test.ts", 'import { prepareContentFixture } from "./test-fixtures";\n');
    write("src/content/dynamic.test.ts", 'it("builds", async () => { await import("../../scripts/tool"); });\n');
    write("src/rules/cycle.test.ts", 'import { a } from "./a";\n');
    write("src/rules/types.test.ts", 'import type { Build } from "../../scripts/types";\nimport { a } from "./a";\n');
    const files = listTestFiles(root);
    expect(splitTestFiles(root, files)).toEqual({
      quick: ["src/rules/cycle.test.ts", "src/rules/types.test.ts"],
      content: ["scripts/direct.test.ts", "scripts/indirect.test.ts", "src/content/dynamic.test.ts", "src/content/fixture.test.ts"],
    });
  });

  it("finds the content build through an import cycle whatever the order of the files", () => {
    root = mkdtempSync(path.join(tmpdir(), "dreamscape-test-sets-"));
    write("scripts/content-pipeline.ts", "export const buildContent = () => {};\n");
    // a and b import each other; only a reaches the build (through c).
    write("src/x/a.ts", 'import { b } from "./b";\nimport { c } from "./c";\nexport const a = [b, c];\n');
    write("src/x/b.ts", 'import { a } from "./a";\nexport const b = () => a;\n');
    write("src/x/c.ts", 'import { buildContent } from "../../scripts/content-pipeline";\nexport const c = buildContent;\n');
    write("src/x/a.test.ts", 'import { a } from "./a";\n');
    write("src/x/b.test.ts", 'import { b } from "./b";\n');
    const files = ["src/x/a.test.ts", "src/x/b.test.ts"];
    expect(splitTestFiles(root, files)).toEqual({ quick: [], content: files });
    expect(splitTestFiles(root, [...files].reverse())).toEqual({ quick: [], content: [...files].reverse() });
  });

  it("splits every repository test into exactly one set, with the content builds in the content set", () => {
    const files = listTestFiles(repository);
    const { quick, content } = splitTestFiles(repository, files);
    expect([...quick, ...content].sort()).toEqual(files);
    expect(quick.filter((file) => content.includes(file))).toEqual([]);
    // Direct users of buildContent and prepareContentFixture, and a tool test that reaches buildContent through the tool.
    expect(content).toEqual(expect.arrayContaining(["src/content/content.test.ts", "src/content/tourism-content.test.ts", "scripts/city-bundle.test.ts"]));
    // Tests of light helpers (Ink checks, one quiz, city links) do not run the build and stay in the quick set.
    expect(quick).toEqual(expect.arrayContaining([
      "scripts/test-sets.test.ts",
      "src/domain/game.test.ts",
      "src/story/memory.test.ts",
      "src/content/response-profiles.test.ts",
      "scripts/encounter-validation.test.ts",
      "scripts/city-links.test.ts",
    ]));
  });
});
