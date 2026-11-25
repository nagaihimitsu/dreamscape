import { describe, expect, it } from "vitest";
import {
  compareWarningSnapshots, DEFAULT_WARNINGS_FILE, parseContentWarningsArgs, readWarningSnapshot, savedSummary, STALE_DIALOGUE_LINE,
  warningSnapshot,
} from "./content-warnings";

const info = { savedAt: "2026-11-16T07:00:00.000Z", head: "996c3f7abcdef0123456789", withSample: false };
const date = (id: string) => ({ kind: "date-condition-trip", message: `Date condition read before the trip only: date ${id} (when)` });
const before = warningSnapshot([date("a"), date("b"), { kind: "music", message: "Unused track x" }], [], info);

describe("content:warnings arguments", () => {
  it("takes --save or --compare, an optional file and --with-sample", () => {
    expect(parseContentWarningsArgs(["--save"])).toEqual({ mode: "save", file: DEFAULT_WARNINGS_FILE, withSample: false });
    expect(parseContentWarningsArgs(["--compare", "artifacts/old.json", "--with-sample"]))
      .toEqual({ mode: "compare", file: "artifacts/old.json", withSample: true });
    expect(parseContentWarningsArgs(["--with-sample", "--save"])).toEqual({ mode: "save", file: DEFAULT_WARNINGS_FILE, withSample: true });
  });

  it("refuses no mode, both modes and unknown arguments, in Japanese", () => {
    expect(() => parseContentWarningsArgs([])).toThrow(/^使い方: npm run content:warnings/u);
    expect(() => parseContentWarningsArgs(["--save", "--compare"])).toThrow("--save と --compare は、どちらか1つだけ指定します。");
    expect(() => parseContentWarningsArgs(["--verbose"])).toThrow("知らない指定です: --verbose。");
  });
});

describe("content:warnings records", () => {
  it("counts by kind, keeps every message and the stale dialogue annotations under their own kind", () => {
    const stale = "Stale dialogue reaction (line no longer exists): s/heroine/hi";
    expect(STALE_DIALOGUE_LINE.test(stale)).toBe(true);
    const snapshot = warningSnapshot([date("a"), { kind: "ambience", message: "m" }], [stale], info);
    expect(snapshot.total).toBe(3);
    expect(snapshot.counts).toEqual({ ambience: 1, "date-condition-trip": 1, "stale-dialogue": 1 });
    expect(Object.keys(snapshot.counts)).toEqual(["ambience", "date-condition-trip", "stale-dialogue"]);
    expect(snapshot.warnings.at(-1)).toEqual({ kind: "stale-dialogue", message: stale });
    expect(savedSummary(snapshot, "artifacts/w.json")).toEqual([
      "content:warnings: content:build の注意を artifacts/w.json に保存しました。",
      "注意 3 件（見本なし、HEAD 996c3f7）",
      "  ambience：1",
      "  date-condition-trip：1",
      "  stale-dialogue：1",
      "（stale-dialogue は Ink を直した後に残った表情・反応の注記で、content:build では別の行に数えます。）",
      "あとで比べるときは npm run content:warnings -- --compare を実行します。",
    ]);
  });

  it("reads back what it saved and refuses another file with what to do", () => {
    expect(readWarningSnapshot(JSON.stringify(before), "a.json")).toEqual(before);
    expect(() => readWarningSnapshot("{", "a.json")).toThrow(/^a\.json は JSON として読めません.*--save で保存し直してください。$/u);
    expect(() => readWarningSnapshot("{\"counts\":1}", "a.json")).toThrow("a.json は content:warnings の記録の形ではありません。");
  });
});

describe("content:warnings comparison", () => {
  it("gives each kind before → after and the messages removed and added", () => {
    const after = warningSnapshot([date("b"), date("c"), date("d"), { kind: "glossary", message: "Term x" }], [],
      { ...info, head: "aaaaaaa1111" });
    expect(compareWarningSnapshots(before, after, DEFAULT_WARNINGS_FILE)).toEqual([
      `content:warnings: ${DEFAULT_WARNINGS_FILE}（2026-11-16 に保存、見本なし、HEAD 996c3f7）と、今の注意（見本なし、HEAD aaaaaaa）を比べます。`,
      "種類ごとの件数（前 → 今）：",
      "  date-condition-trip：2 → 3（+1）",
      "  glossary：0 → 1（+1）",
      "  music：1 → 0（-1）",
      "  合計：3 → 4（+1）",
      "消えた注意（2 件）：",
      `  - [date-condition-trip] ${date("a").message}`,
      "  - [music] Unused track x",
      "増えた注意（3 件）：",
      `  - [date-condition-trip] ${date("c").message}`,
      `  - [date-condition-trip] ${date("d").message}`,
      "  - [glossary] Term x",
    ]);
  });

  it("counts a repeated message as often as it comes, and says when nothing changed", () => {
    const twice = warningSnapshot([date("a"), date("a")], [], info);
    const once = warningSnapshot([date("a")], [], info);
    expect(compareWarningSnapshots(twice, once, "f")).toContain(`  - [date-condition-trip] ${date("a").message}`);
    const same = compareWarningSnapshots(once, once, "f");
    expect(same.slice(-3)).toEqual(["消えた注意：なし", "増えた注意：なし", "注意の数と中身は、保存したときと同じです。"]);
  });

  it("notes when the sample setting differs from the saved one", () => {
    const lines = compareWarningSnapshots(before, { ...before, withSample: true }, "f");
    expect(lines[1]).toBe("見本の設定が違います：保存した記録は見本なし、今回は見本ありで数えました。"
      + "見本の編の注意の分も違って見えます。そろえるには --with-sample を外して比べ直します。");
  });
});
