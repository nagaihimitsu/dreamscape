import { describe, expect, it } from "vitest";
import { presentationSchema } from "./schemas";

describe("background image paths", () => {
  const presentation = (imagePath: string) => ({
    schemaVersion: 1, ending: { titleJa: "旅の終わり", descriptionJa: "旅が終わる。", buttonJa: "戻る" }, emotions: {},
    backgrounds: { cafe: { nameJa: "カフェ", captionJa: "カフェ ／ 午後", color: "#e6d8bb", imagePath } }, memories: {},
  });

  it("stay inside assets/", () => {
    expect(presentationSchema.safeParse(presentation("assets/backgrounds/cafe.webp")).success).toBe(true);
    expect(presentationSchema.safeParse(presentation("assets/../x.png")).success).toBe(false);
    expect(presentationSchema.safeParse(presentation("assets/a/../../x.png")).success).toBe(false);
  });
});
