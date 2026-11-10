import { existsSync, globSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOG_RULES, SAMPLE_JOURNEY_DIRECTORY } from "./content-layout";
import {
  CATALOG_SCHEMAS, EDITOR_SETTINGS_FILE, MANIFEST_KEY_ORDER, SCHEMA_DIRECTORY, SCHEMA_TARGETS, generatedSchemaFiles, journeyManifestSchema,
  manifestKeyOrderProblems, matchingTargets, readEditorSettings,
} from "./json-schemas";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");
/** The JSON files authors write: every layer's catalogs, cities, travel, ledgers, quizzes and manifests (served files aside). */
const authoredJson = [...globSync("content/**/*.json", { cwd: root }), ...globSync(`${SAMPLE_JOURNEY_DIRECTORY}/**/*.json`, { cwd: root })]
  .map((file) => file.split(path.sep).join("/")).filter((file) => !file.split("/").includes("public")).sort();
const manifests = authoredJson.filter((file) => file.endsWith("/manifest.json"));

type Schema = { [keyword: string]: unknown };
/** Keywords that only describe (the editor shows them) and never refuse a value. */
const DESCRIPTIVE = new Set(["$schema", "title", "$comment", "description", "default", "language"]);
/**
 * The problems of `value` under a generated JSON Schema, as an editor reports them: the keywords zod's
 * toJSONSchema writes (an unknown keyword fails the test, so a new one is not passed unseen).
 */
function schemaProblems(schema: Schema, value: unknown, at = ""): string[] {
  const problems: string[] = [];
  const fail = (message: string) => problems.push(`${at || "/"}: ${message}`);
  const isObject = (item: unknown): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item);
  for (const [keyword, rule] of Object.entries(schema)) {
    if (DESCRIPTIVE.has(keyword)) continue;
    switch (keyword) {
      case "type": {
        const types = Array.isArray(rule) ? rule : [rule];
        const actual = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
        if (!types.some((type) => type === actual || (type === "integer" && Number.isInteger(value)) || (type === "number" && actual === "number")))
          fail(`type ${types.join("|")}`);
        break;
      }
      case "const": if (JSON.stringify(value) !== JSON.stringify(rule)) fail(`const ${JSON.stringify(rule)}`); break;
      case "enum": if (!(rule as unknown[]).some((item) => JSON.stringify(item) === JSON.stringify(value))) fail("enum"); break;
      case "pattern": if (typeof value === "string" && !new RegExp(rule as string, "u").test(value)) fail(`pattern ${rule}`); break;
      case "minLength": if (typeof value === "string" && [...value].length < (rule as number)) fail("minLength"); break;
      case "maxLength": if (typeof value === "string" && [...value].length > (rule as number)) fail("maxLength"); break;
      case "minimum": if (typeof value === "number" && value < (rule as number)) fail("minimum"); break;
      case "maximum": if (typeof value === "number" && value > (rule as number)) fail("maximum"); break;
      case "exclusiveMinimum": if (typeof value === "number" && value <= (rule as number)) fail("exclusiveMinimum"); break;
      case "format":
        if (typeof value === "string" && rule === "date" && !/^\d{4}-\d{2}-\d{2}$/u.test(value)) fail("format date");
        if (typeof value === "string" && rule === "uri" && !URL.canParse(value)) fail("format uri");
        break;
      case "minItems": if (Array.isArray(value) && value.length < (rule as number)) fail("minItems"); break;
      case "maxItems": if (Array.isArray(value) && value.length > (rule as number)) fail("maxItems"); break;
      case "items": if (Array.isArray(value)) value.forEach((item, index) => problems.push(...schemaProblems(rule as Schema, item, `${at}/${index}`))); break;
      case "prefixItems":
        if (Array.isArray(value)) (rule as Schema[]).forEach((item, index) => index < value.length && problems.push(...schemaProblems(item, value[index], `${at}/${index}`)));
        break;
      case "required": if (isObject(value)) for (const key of rule as string[]) if (!Object.hasOwn(value, key)) fail(`required ${key}`); break;
      case "properties":
        if (isObject(value)) for (const [key, property] of Object.entries(rule as Record<string, Schema>))
          if (Object.hasOwn(value, key)) problems.push(...schemaProblems(property, value[key], `${at}/${key}`));
        break;
      case "additionalProperties":
        if (isObject(value)) for (const key of Object.keys(value).filter((key) => !Object.hasOwn((schema.properties as object | undefined) ?? {}, key))) {
          if (rule === false) fail(`additional property ${key}`);
          else if (isObject(rule)) problems.push(...schemaProblems(rule, value[key], `${at}/${key}`));
        }
        break;
      case "propertyNames": if (isObject(value)) for (const key of Object.keys(value)) problems.push(...schemaProblems(rule as Schema, key, `${at}/${key} (name)`)); break;
      case "anyOf": if (!(rule as Schema[]).some((item) => !schemaProblems(item, value, at).length)) fail("anyOf"); break;
      case "oneOf": if ((rule as Schema[]).filter((item) => !schemaProblems(item, value, at).length).length !== 1) fail("oneOf"); break;
      default: throw new Error(`The test does not know the JSON Schema keyword ${keyword} (${at || "/"})`);
    }
  }
  return problems;
}

describe("editor help for the JSON files (JSON Schema)", () => {
  it("has the checked-in schema files and editor mapping of npm run schemas:build", () => {
    const settings = readEditorSettings(read(EDITOR_SETTINGS_FILE));
    const generated = generatedSchemaFiles(settings);
    for (const [file, text] of generated) expect(existsSync(path.join(root, file)) && read(file), `${file}: npm run schemas:build`).toBe(text);
    const checkedIn = readdirSync(path.join(root, SCHEMA_DIRECTORY)).map((name) => `${SCHEMA_DIRECTORY}/${name}`);
    expect(checkedIn.filter((file) => !generated.has(file)), "files schemas:build no longer makes").toEqual([]);
  });

  it("has a schema for every merged catalog and gives every authored JSON file exactly one", () => {
    expect(Object.keys(CATALOG_SCHEMAS).sort()).toEqual(CATALOG_RULES.map((rule) => rule.kind).sort());
    expect(authoredJson.length).toBeGreaterThan(100);
    for (const file of authoredJson) expect(matchingTargets(file).map((target) => target.file), file).toHaveLength(1);
    // The travel, settings and ledger files share a folder: each gets its own schema.
    expect(matchingTargets("content/journeys/kyoto/travel/gion.json").map((target) => target.file)).toEqual(["travel"]);
    expect(matchingTargets("content/journeys/kyoto/travel/gion-settings.json").map((target) => target.file)).toEqual(["travel-settings"]);
    expect(matchingTargets("content/journeys/kyoto/travel/gion-transit.json").map((target) => target.file)).toEqual(["transit-ledger"]);
    expect(matchingTargets("content/journeys/kyoto/quizzes/gion.example.json").map((target) => target.file)).toEqual(["quiz-example"]);
    // A quiz in a folder below quizzes/ (content:build accepts it) gets the same schemas.
    expect(matchingTargets("content/journeys/kyoto/quizzes/main/gion.json").map((target) => target.file)).toEqual(["quiz"]);
    expect(matchingTargets("content/journeys/kyoto/quizzes/a/b/gion.example.json").map((target) => target.file)).toEqual(["quiz-example"]);
    expect(matchingTargets("content/journeys/kyoto/cities/extra/gion.json")).toHaveLength(0);
    // A core-layer catalog (the shared base system) is also mapped in content/; a journey-only one is not.
    expect(matchingTargets("content/romance/balance.json")).toHaveLength(1);
    expect(matchingTargets("content/battles/catalog.json")).toHaveLength(0);
  });

  it("accepts every current file, a layer's catalog files included, under the generated JSON Schema the editor uses", () => {
    const schemaOf = (name: string) => JSON.parse(read(`${SCHEMA_DIRECTORY}/${name}.schema.json`)) as Schema;
    for (const file of authoredJson) {
      const [target] = matchingTargets(file);
      expect(target, file).toBeDefined();
      expect(schemaProblems(schemaOf(target.file), JSON.parse(read(file))), file).toEqual([]);
    }
    // A layer's catalog file leaves out the merged keys, also nested ones (a journey's wardrobe writes only `cities`);
    // a whole file keeps its required keys, and the walker reports what an editor would.
    expect(SCHEMA_TARGETS.find((target) => target.file === "presentation-characters")?.fragment).toBeDefined();
    expect(schemaProblems(schemaOf("presentation-characters"), { schemaVersion: 1, wardrobe: { cities: {} } })).toEqual([]);
    expect(schemaProblems(schemaOf("city"), { schemaVersion: 1 })).toContain("/: required id");
    expect(schemaProblems(schemaOf("tourism-catalog"), { schemaVersion: 1, landmark: [] })).toEqual(["/: additional property landmark"]);
  });

  it("names the editor settings file when it cannot be read (a comment there)", () => {
    expect(() => readEditorSettings('{\n  // my comment\n  "a": 1\n}\n')).toThrow(/^\.vscode\/settings\.json を JSON として読めません（コメントや末尾のカンマは書けません/u);
    expect(() => readEditorSettings("[]")).toThrow(".vscode/settings.json を JSON として読めません");
    expect(readEditorSettings('{"editor.tabSize": 2}')).toEqual({ "editor.tabSize": 2 });
  });

  it("keeps every manifest's keys in the one order (the schema's), including the sample journey journey:new copies", () => {
    expect(MANIFEST_KEY_ORDER.slice(0, 4)).toEqual(["schemaVersion", "order", "id", "nameJa"]);
    expect(MANIFEST_KEY_ORDER.at(-1)).toBe("authoring");
    expect(manifests).toContain(`${SAMPLE_JOURNEY_DIRECTORY}/manifest.json`);
    for (const file of manifests) {
      const manifest = JSON.parse(read(file)) as Record<string, unknown>;
      expect(journeyManifestSchema.safeParse(manifest).success, file).toBe(true);
      expect(manifestKeyOrderProblems(manifest), file).toEqual([]);
    }
    expect(manifestKeyOrderProblems({ schemaVersion: 1, id: "a", order: 1, unknownKey: 1 })).toEqual(["order", "unknownKey"]);
  });
});
