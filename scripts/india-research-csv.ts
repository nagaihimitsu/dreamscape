import { readFileSync } from "node:fs";
import path from "node:path";

/** Read research CSV without changing its BOM, quoted fields or newlines. */
export function readResearchCsv(base: string, file: string): Record<string, string>[] {
  const input = readFileSync(path.join(base, file), "utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error(`Unterminated CSV field: ${file}`);
  if (row.length || field) { row.push(field); rows.push(row); }
  const header = rows.shift();
  if (!header || new Set(header).size !== header.length) throw new Error(`Invalid CSV header: ${file}`);
  return rows.map((values) => {
    if (values.length !== header.length) throw new Error(`Invalid CSV row in ${file}`);
    return Object.fromEntries(header.map((name, index) => [name, values[index]]));
  });
}
