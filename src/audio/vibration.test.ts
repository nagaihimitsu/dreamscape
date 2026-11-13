import { describe, expect, it } from "vitest";
import { canVibrate, vibrationPattern } from "./vibration";

describe("the vibration", () => {
  it("is a short tap for each kind", () => {
    expect(vibrationPattern("item")).toBe(15);
    expect(vibrationPattern("clue")).toBe(10);
    expect(vibrationPattern("shake")).toBe(40);
  });

  it("is offered only where the browser has the Vibration API", () => {
    expect(canVibrate({ vibrate: () => true })).toBe(true);
    expect(canVibrate({})).toBe(false);
    expect(canVibrate({ vibrate: "yes" })).toBe(false);
    expect(canVibrate(undefined)).toBe(false);
  });
});
