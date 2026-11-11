import { describe, expect, it } from "vitest";
import { portraitFocus } from "./speaker-focus";

describe("the portraits while a line is read", () => {
  it("brings the speaker forward and dims the listeners, and leaves both as they are for narration", () => {
    expect(portraitFocus("heroine", "heroine")).toBe("speaking");
    expect(portraitFocus("heroine", "enemy")).toBe("listening");
    expect(portraitFocus("enemy", "enemy")).toBe("speaking");
    expect(portraitFocus("enemy", "heroine")).toBe("listening");
    expect(portraitFocus("player", "heroine")).toBe("listening");
    expect(portraitFocus("player", "enemy")).toBe("listening");
    expect(portraitFocus("narrator", "heroine")).toBeUndefined();
    expect(portraitFocus("narrator", "enemy")).toBeUndefined();
    expect(portraitFocus(undefined, "enemy")).toBeUndefined();
  });
});
