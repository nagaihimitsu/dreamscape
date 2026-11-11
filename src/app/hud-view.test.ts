import { describe, expect, it } from "vitest";
import { hudView, type HudState } from "./hud-view";

const none: HudState = { activeEncounter: null, activeEpilogue: null, activeTourism: null, activeBattle: null, activeDate: null };
const line = { choices: [] };
const choices = { choices: [{ index: 0, text: "Let's go." }, { index: 1, text: "Wait here." }] };
const quizCall = { choices: [{ index: 0, text: "quiz", call: "quiz" as const }] };

// User decision 2026-11-11 (after playing on an iPhone): over a conversation the header shows the place and
// time and ⚙設定; the budget and AP, the held items and 手がかり帳 only while a choice waits.
describe("what the header shows", () => {
  it("shows every part outside a story scene: free time, the observation, before the journey", () => {
    expect(hudView(null)).toBe("all");
    expect(hudView(none)).toBe("all");
    expect(hudView({ ...none, activeTourism: { phase: "exploring", frame: null } })).toBe("all");
  });

  it("leaves the budget, the items and 手がかり帳 out while a scene reads its lines", () => {
    expect(hudView({ ...none, activeDate: { frame: line } })).toBe("talk");
    expect(hudView({ ...none, activeEpilogue: { frame: line } })).toBe("talk");
    expect(hudView({ ...none, activeTourism: { phase: "guide", frame: line } })).toBe("talk");
    expect(hudView({ ...none, activeEncounter: { phase: "story", frame: line } })).toBe("talk");
    expect(hudView({ ...none, activeBattle: { phase: "dialogue", frame: line } })).toBe("talk");
  });

  it("shows them while a scene waits for one of its choices", () => {
    expect(hudView({ ...none, activeDate: { frame: choices } })).toBe("all");
    expect(hudView({ ...none, activeEpilogue: { frame: choices } })).toBe("all");
    expect(hudView({ ...none, activeTourism: { phase: "guide", frame: choices } })).toBe("all");
    expect(hudView({ ...none, activeEncounter: { phase: "story", frame: choices } })).toBe("all");
    expect(hudView({ ...none, activeBattle: { phase: "dialogue", frame: choices } })).toBe("all");
  });

  it("shows them for a quiz's answers and the reasoning's evidence, not for the feedback or the result", () => {
    expect(hudView({ ...none, activeEncounter: { phase: "quiz", frame: line } })).toBe("all");
    expect(hudView({ ...none, activeEncounter: { phase: "feedback", frame: choices } })).toBe("talk");
    expect(hudView({ ...none, activeBattle: { phase: "question", frame: null } })).toBe("all");
    expect(hudView({ ...none, activeBattle: { phase: "reasoning", frame: null } })).toBe("all");
    expect(hudView({ ...none, activeBattle: { phase: "feedback", frame: null } })).toBe("talk");
    expect(hudView({ ...none, activeBattle: { phase: "result", frame: null } })).toBe("talk");
    // A battle's call to its quiz is the game's own step (「問題へ進む」), no choice.
    expect(hudView({ ...none, activeBattle: { phase: "dialogue", frame: quizCall } })).toBe("talk");
  });

  it("follows the screen order: an encounter over the observation, the guide over its battle", () => {
    const observing = { ...none, activeTourism: { phase: "exploring", frame: null } };
    expect(hudView({ ...observing, activeEncounter: { phase: "story", frame: line } })).toBe("talk");
    expect(hudView({ ...none, activeTourism: { phase: "guide", frame: line }, activeBattle: { phase: "question", frame: null } })).toBe("talk");
  });

  // The scene tag # quiet: (2026-11-11): the header steps aside while a quiet line reads, and comes back at a choice.
  it("steps aside for a quiet line of a scene that waits for no choice, and shows everything at a choice", () => {
    for (const quiet of ["line", "scene"] as const) {
      const hushed = { ...line, quiet };
      expect(hudView({ ...none, activeDate: { frame: hushed } })).toBe("quiet");
      expect(hudView({ ...none, activeEpilogue: { frame: hushed } })).toBe("quiet");
      expect(hudView({ ...none, activeTourism: { phase: "guide", frame: hushed } })).toBe("quiet");
      expect(hudView({ ...none, activeEncounter: { phase: "story", frame: hushed } })).toBe("quiet");
      expect(hudView({ ...none, activeBattle: { phase: "dialogue", frame: hushed } })).toBe("quiet");
      expect(hudView({ ...none, activeDate: { frame: { ...choices, quiet } } })).toBe("all");
    }
    // An encounter's quiz feedback and a battle's feedback show no line: the header is as it is there.
    expect(hudView({ ...none, activeEncounter: { phase: "feedback", frame: { ...line, quiet: "scene" } } })).toBe("talk");
    expect(hudView({ ...none, activeBattle: { phase: "feedback", frame: { ...line, quiet: "scene" } } })).toBe("talk");
  });
});
