import { describe, expect, it } from "vitest";
import { unique } from "./content-validation-utils";

describe("duplicate IDs", () => {
  it("name the repeated ID and, when known, the files that hold it", () => {
    expect(() => unique(["a", "b"], "tourism landmark ID")).not.toThrow();
    expect(() => unique(["a", "b", "a"], "tourism landmark ID")).toThrow('Duplicate tourism landmark ID: "a"');
    expect(() => unique(["a", "b", "a"], "tourism landmark ID", ["core.json", "x.json", "trip.json"]))
      .toThrow('Duplicate tourism landmark ID: "a" (core.json and trip.json)');
    expect(() => unique(["a", "a"], "dateId", ["trip.json", "trip.json"])).toThrow('Duplicate dateId: "a" (twice in trip.json)');
  });
});
