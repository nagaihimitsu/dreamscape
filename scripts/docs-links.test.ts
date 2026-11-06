import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Every relative link of the Markdown files in Git points to an existing file
// or folder, so moving folders cannot silently break the documentation.
// External links and anchors (#…) are not checked. No content build needed.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Targets of inline links and images, outside fenced code blocks and code spans. */
function linkTargets(markdown: string): string[] {
  const text = markdown
    .replace(/^ *(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ *\1[^\n]*$/gmu, "")
    .replace(/`[^`\n]*`/gu, "");
  return [...text.matchAll(/\[(?:[^\]\\\n]|\\.)*\]\(\s*(<[^>\n]*>|[^\s)]+)/gu)]
    .map((match) => match[1].replace(/^<(.*)>$/u, "$1"));
}

/** The file a relative link target names, or undefined for external links and anchors. */
function linkedFile(markdownFile: string, target: string): string | undefined {
  if (/^[a-z][a-z\d+.-]*:/iu.test(target) || target.startsWith("//") || target.startsWith("#")) return undefined;
  const relative = decodeURIComponent(target.replace(/[#?].*$/u, ""));
  return relative.startsWith("/") ? path.join(root, relative) : path.resolve(root, path.dirname(markdownFile), relative);
}

describe("documentation links", () => {
  it("reads link targets outside code", () => {
    const markdown = [
      "[guide](../GUIDE.md#steps) ![art](<art work.png>) [site](https://example.com) [here](#top)",
      "`[not a link](code.md)`",
      "```",
      "[not a link](block.md)",
      "```",
    ].join("\n");
    expect(linkTargets(markdown)).toEqual(["../GUIDE.md#steps", "art work.png", "https://example.com", "#top"]);
    expect(linkTargets(markdown).map((target) => linkedFile("docs/a.md", target)))
      .toEqual([path.join(root, "GUIDE.md"), path.join(root, "docs/art work.png"), undefined, undefined]);
  });

  it("resolves every relative link of the Markdown files in Git", () => {
    const files = execFileSync("git", ["ls-files", "-z", "--", "*.md"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
    expect(files.length).toBeGreaterThan(0);
    const broken = files.flatMap((file) => linkTargets(readFileSync(path.join(root, file), "utf8"))
      .filter((target) => {
        const linked = linkedFile(file, target);
        return linked !== undefined && !existsSync(linked);
      })
      .map((target) => `${file}: ${target}`));
    expect(broken).toEqual([]);
  });
});
