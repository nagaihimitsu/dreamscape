import { describe, expect, it } from "vitest";
import { holdPhotoTurn, photoTurn } from "./photo-turn";

describe("photo turn", () => {
  it("holds the line while a print is up and lets it go when released", () => {
    const turn = { end: () => {} };
    const release = holdPhotoTurn(turn);
    expect(photoTurn()).toBe(turn);
    release();
    expect(photoTurn()).toBeNull();
  });

  it("an older print's release does not end the next print's turn", () => {
    const releaseFirst = holdPhotoTurn({ end: () => {} });
    const second = { end: () => {} };
    const releaseSecond = holdPhotoTurn(second);
    releaseFirst();
    expect(photoTurn()).toBe(second);
    releaseSecond();
    expect(photoTurn()).toBeNull();
  });
});
