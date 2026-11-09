import { existsSync, globSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOG_RULES, SAMPLE_JOURNEY_DIRECTORY } from "./content-layout";
import {
  CATALOG_SCHEMAS, EDITOR_SETTINGS_FILE, MANIFEST_KEY_ORDER, SCHEMA_DIRECTORY, SCHEMA_TARGETS, generatedSchemaFiles, journeyManifestSchema,
  manifestKeyOrderProblems, matchingTargets,
} from "./json-schemas";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");
/** The JSON files authors write: every layer's catalogs, cities, travel, ledgers, quizzes and manifests (served files aside). */
const authoredJson = [...globSync("content/**/*.json", { cwd: root }), ...globSync(`${SAMPLE_JOURNEY_DIRECTORY}/**/*.json`, { cwd: root })]
  .map((file) => file.split(path.sep).join("/")).filter((file) => !file.split("/").includes("public")).sort();
const manifests = authoredJson.filter((file) => file.endsWith("/manifest.json"));

describe("editor help for the JSON files (JSON Schema)", () => {
  it("has the checked-in schema files and editor mapping of npm run schemas:build", () => {
    const settings = JSON.parse(read(EDITOR_SETTINGS_FILE)) as Record<string, unknown>;
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
    // A core-layer catalog (the shared base system) is also mapped in content/; a journey-only one is not.
    expect(matchingTargets("content/romance/balance.json")).toHaveLength(1);
    expect(matchingTargets("content/battles/catalog.json")).toHaveLength(0);
  });

  it("accepts the current whole files with their schemas (the catalogs of a layer may leave keys out)", () => {
    for (const file of authoredJson) {
      const [target] = matchingTargets(file);
      if (target.fragment) continue;
      const result = target.schema.safeParse(JSON.parse(read(file)));
      expect(result.success, `${file}: ${result.error?.message}`).toBe(true);
    }
    // A catalog schema leaves out the top-level required keys; a whole file's keeps them.
    const schemaOf = (name: string) => JSON.parse(read(`${SCHEMA_DIRECTORY}/${name}.schema.json`)) as { required?: string[] };
    expect(schemaOf("tourism-catalog").required).toBeUndefined();
    expect(schemaOf("city").required).toContain("id");
    expect(SCHEMA_TARGETS.find((target) => target.file === "tourism-catalog")?.fragment).toBe(true);
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
