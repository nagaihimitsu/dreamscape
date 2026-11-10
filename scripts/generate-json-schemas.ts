import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EDITOR_SETTINGS_FILE, SCHEMA_DIRECTORY, generatedSchemaFiles, readEditorSettings } from "./json-schemas";

// npm run schemas:build: write the editor's JSON Schema files (authoring/schemas/) and their mapping in
// .vscode/settings.json (`json.schemas`; the file's other settings stay). Unchanged files are not rewritten,
// and a schema file no longer generated is removed. scripts/json-schemas.test.ts checks they are current.
try {
  const root = process.cwd();
  const settingsFile = path.join(root, EDITOR_SETTINGS_FILE);
  const settings = existsSync(settingsFile) ? readEditorSettings(readFileSync(settingsFile, "utf8")) : {};
  const files = generatedSchemaFiles(settings);
  const written: string[] = [];
  for (const [relative, text] of files) {
    const file = path.join(root, relative);
    if (existsSync(file) && readFileSync(file, "utf8") === text) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
    written.push(relative);
  }
  const removed = readdirSync(path.join(root, SCHEMA_DIRECTORY)).map((name) => `${SCHEMA_DIRECTORY}/${name}`)
    .filter((relative) => relative.endsWith(".schema.json") && !files.has(relative));
  for (const relative of removed) rmSync(path.join(root, relative));
  console.log(`入力補助のスキーマ ${files.size - 1} 件と ${EDITOR_SETTINGS_FILE} を確かめました。書き換え: ${written.length} 件、削除: ${removed.length} 件`);
  for (const relative of [...written, ...removed]) console.log(`  ${relative}`);
} catch (error) {
  // The message only: a stack trace would bury it.
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
