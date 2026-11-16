import { describe, expect, it } from "vitest";
import { jsonStrings, jsonValueLines, nearestId } from "./json-lines";

describe("jsonValueLines", () => {
  it("gives the line where each value starts, by the path the messages print", () => {
    const text = '{\n  "id": "a",\n  "places": [\n    { "id": "p1",\n      "sources": [ { "title": "T", "url": "https://x" } ] }\n  ],\n  "n": 1\n}\n';
    const lines = jsonValueLines(text);
    expect(lines.get("")).toBe(1);
    expect(lines.get("id")).toBe(2);
    expect(lines.get("places[0]")).toBe(4);
    expect(lines.get("places[0].sources[0].url")).toBe(5);
    expect(lines.get("n")).toBe(7);
  });

  it("reads escaped quotes and newlines inside strings, and refuses text that is not JSON", () => {
    expect(jsonValueLines('{"a": "x\\"\\n{", "b": [true, null, -1.5e3]}').get("b[2]")).toBe(1);
    expect(() => jsonValueLines('{"a": }')).toThrow("JSON として読めません");
    expect(() => jsonValueLines('{"a": 1} x')).toThrow("余分な文字");
  });
});

describe("jsonStrings and nearestId", () => {
  it("lists every string with the key it is under (an array's items keep the array's key)", () => {
    const value = { nameJa: "名", lines: ["一", { textJa: "二" }] };
    expect(jsonStrings(value)).toEqual([
      { path: "nameJa", field: "nameJa", value: "名" },
      { path: "lines[0]", field: "lines", value: "一" },
      { path: "lines[1].textJa", field: "textJa", value: "二" },
    ]);
  });

  it("names the nearest id at or above a path", () => {
    const value = { id: "root", places: [{ id: "p1", sources: [{ title: "T" }] }, { sources: [{}] }] };
    expect(nearestId(value, "places[0].sources[0]")).toBe("p1");
    expect(nearestId(value, "places[1].sources[0]")).toBe("root");
    expect(nearestId({ sourceRefs: { s1: {} } }, "sourceRefs.s1")).toBeUndefined();
  });
});
