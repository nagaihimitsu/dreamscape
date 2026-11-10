import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classifyContentFile } from "./content-layout";
import { writeContentOutputs } from "./content-outputs";
import { contentSourcesFromTree, contentTreeFromFiles } from "./content-sources";
import { parseTourFiles } from "./tour-validation";

// Tours in the content pipeline (tour design stage 2a): a journey folder's tours/<tourId>.json is read
// with the quizzes, parsed by its schema and written to src/content/generated/tours.json, which the game
// imports, so the file is written even when no journey has a tour.

const root = path.join(path.sep, "virtual", "dreamscape");
const json = (value: unknown) => JSON.stringify(value);
const manifest = json({ schemaVersion: 1, order: 10, id: "trip_a", nameJa: "テスト編", status: "available", cities: [{ id: "a_city", nameJa: "テスト市" }],
  currency: { code: "EUR", symbol: "€", unitJa: "ユーロ", unit: "whole" }, initialBudget: 100, intercityModes: [], transportModes: [] });
const source = { publisher: "Example", title: "Trip", url: "https://example.org/trip", checkedAt: "2026-11-10", claimType: "hypothesis", claimJa: "ゲーム用の推定。" };
const tour = (id: string) => ({ schemaVersion: 1, id, cityId: "a_city", titleJa: "日帰りツアー", summaryJa: "車で行きます。",
  steps: [{ id: "visit", kind: "event", eventId: "a_episode" }],
  offers: [{ id: "web", channel: "web", sellerJa: "予約サイト", price: 10, sources: [source] }] });
const tree = (extra: Record<string, string | null> = {}) => contentSourcesFromTree(contentTreeFromFiles(root, {
  "content/romance/presentation.json": json({ schemaVersion: 1, backgrounds: { default_scene: {} }, memories: {} }),
  "content/journeys/trip_a/manifest.json": manifest,
  ...extra,
}));

describe("tours in the content pipeline", () => {
  it("classifies tours/<id>.json of a journey folder, and nothing of the core layer, as a tour", () => {
    expect(classifyContentFile("tours/a_tour.json", "journey")).toEqual({ type: "tour", id: "a_tour" });
    expect(classifyContentFile("tours/a_tour.json", "core")).toEqual({ type: "unknown" });
    expect(classifyContentFile("tours/notes.md", "journey")).toEqual({ type: "other" });
  });

  it("reads each tour file of the journey folders with its layer and refuses one in the core layer", () => {
    const sources = tree({ "content/journeys/trip_a/tours/trip_a_tour_fort.json": json(tour("trip_a_tour_fort")) });
    expect(sources.tourFiles).toEqual([{ file: path.join(root, "content/journeys/trip_a/tours/trip_a_tour_fort.json"), layer: "trip_a",
      id: "trip_a_tour_fort", data: tour("trip_a_tour_fort") }]);
    expect(parseTourFiles(sources).map((item) => item.tour)).toEqual([tour("trip_a_tour_fort")]);
    expect(() => tree({ "content/tours/core_tour.json": json(tour("core_tour")) })).toThrow("Unknown content file");
  });

  it("refuses a tour file named after another ID, a tour that breaks its schema and an ID used twice", () => {
    expect(() => parseTourFiles(tree({ "content/journeys/trip_a/tours/other.json": json(tour("trip_a_tour_fort")) })))
      .toThrow("ツアーのファイル名がツアーIDと違います（Tour file name differs from its id）: content/journeys/trip_a/tours/other.json");
    expect(() => parseTourFiles(tree({ "content/journeys/trip_a/tours/trip_a_tour_fort.json": json({ ...tour("trip_a_tour_fort"), steps: [] }) })))
      .toThrow("Invalid tour content/journeys/trip_a/tours/trip_a_tour_fort.json");
    expect(() => parseTourFiles({ root, tourFiles: [
      { file: path.join(root, "a/x.json"), layer: "trip_a", id: "x", data: tour("x") },
      { file: path.join(root, "b/x.json"), layer: "trip_b", id: "x", data: tour("x") },
    ] })).toThrow("Duplicate tour ID x: a/x.json and b/x.json");
  });

  it("writes generated/tours.json, an empty list when no journey has a tour", () => {
    const output = mkdtempSync(path.join(tmpdir(), "dreamscape-tours-"));
    try {
      const sources = tree();
      writeContentOutputs(output, sources, { stories: {}, quizzes: {} });
      expect(JSON.parse(readFileSync(path.join(output, "src/content/generated/tours.json"), "utf8"))).toEqual([]);
      writeContentOutputs(output, sources, { stories: {}, quizzes: {}, tours: [tour("trip_a_tour_fort")] });
      expect(JSON.parse(readFileSync(path.join(output, "src/content/generated/tours.json"), "utf8"))).toEqual([tour("trip_a_tour_fort")]);
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  });
});
