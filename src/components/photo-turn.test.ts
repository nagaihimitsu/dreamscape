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

  it("a turn held under a later one (a photo under 旅の図鑑's card) is on again once the later one is released", () => {
    const photo = { end: () => {} };
    const releasePhoto = holdPhotoTurn(photo);
    const card = { end: () => {} };
    const releaseCard = holdPhotoTurn(card);
    expect(photoTurn()).toBe(card);
    releaseCard();
    expect(photoTurn()).toBe(photo);
    releasePhoto();
    expect(photoTurn()).toBeNull();
  });
});
