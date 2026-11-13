import { describe, expect, it } from "vitest";
import { addedIds, englishNoteKeys, markSeen, seenAll, unseenIds } from "./seen-marks";

describe("the marks of what the player has not looked at yet", () => {
  const start = seenAll({ items: ["charm"], clues: ["altar"], english: ["word:namaste"] });

  it("count everything there is as seen after a new game, a load or Debug's return", () => {
    expect(unseenIds(start.items, ["charm"])).toEqual([]);
    expect(unseenIds(start.clues, ["altar"])).toEqual([]);
    expect(unseenIds(start.english, ["word:namaste"])).toEqual([]);
  });

  it("show what came after, in its order, and nothing while the memory waits for its start", () => {
    expect(unseenIds(start.items, ["note", "charm", "map"])).toEqual(["note", "map"]);
    expect(unseenIds(undefined, ["note"])).toEqual([]);
  });

  it("go once the thing is looked at, of its own kind only", () => {
    const seen = markSeen(start, "items", ["charm", "note"]);
    expect(unseenIds(seen.items, ["charm", "note"])).toEqual([]);
    expect(unseenIds(seen.clues, ["altar", "door"])).toEqual(["door"]);
    expect(start.items.has("note")).toBe(false);
  });

  it("keep the same memory when nothing is new", () => {
    expect(markSeen(start, "clues", ["altar"])).toBe(start);
    expect(markSeen(start, "clues", [])).toBe(start);
  });
});

describe("the clues just recorded", () => {
  it("are the ones the notebook did not have", () => {
    expect(addedIds(["altar"], ["altar", "door"])).toEqual(["door"]);
    expect(addedIds(["altar"], ["altar"])).toEqual([]);
    expect(addedIds([], [])).toEqual([]);
  });
});

describe("the entries of 英語ノート", () => {
  it("are the questions answered, by battle, and the words of the country learned", () => {
    const questions = [{ battle: { id: "duomo" }, question: { id: "q1" } }, { battle: { id: "duomo" }, question: { id: "q2" } }];
    expect(englishNoteKeys(questions, ["namaste"])).toEqual(["question:duomo:q1", "question:duomo:q2", "word:namaste"]);
    expect(englishNoteKeys([], [])).toEqual([]);
  });
});
