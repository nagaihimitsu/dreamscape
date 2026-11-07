import { describe, expect, it } from "vitest";
import { DIALOGUE_LINE_ATTRIBUTE, pressesSceneControl, shouldAdvanceOnTap, type SceneTapState, type TapNode } from "./scene-tap";

/** A stand-in for a DOM element: a tag, attributes and a parent. */
function node(tagName: string, parentElement: TapNode | null = null, attributes: Record<string, string> = {}): TapNode {
  return { tagName, parentElement, getAttribute: (name) => attributes[name] ?? null };
}

const reading: SceneTapState = { lineShown: true, choicesShown: false, windowHidden: false, obstructed: false, settling: false };

// One scene as the story screens build it: background, portrait, dialogue window with a tool row and the line.
const scene = node("DIV", node("MAIN"));
const background = node("DIV", scene);
const picture = node("img", background);
const portrait = node("path", node("svg", node("DIV", scene), { role: "presentation" }));
const dialogueWindow = node("SECTION", scene);
const speaker = node("DIV", dialogueWindow);
const tools = node("DIV", dialogueWindow, { "data-no-advance": "" });
const line = node("P", dialogueWindow, { role: "button", tabindex: "0", [DIALOGUE_LINE_ATTRIBUTE]: "" });
const lineText = node("SPAN", line);

describe("tap anywhere in a story scene", () => {
  it("reads on from the background, the portrait, the window's empty space and its name plate", () => {
    for (const target of [scene, background, picture, portrait, dialogueWindow, speaker])
      expect(shouldAdvanceOnTap(target, scene, reading)).toBe(true);
  });

  it("leaves the line's own tap to the line, so one tap is one step", () => {
    expect(shouldAdvanceOnTap(line, scene, reading)).toBe(false);
    expect(shouldAdvanceOnTap(lineText, scene, reading)).toBe(false);
  });

  it("never reads on from a control or anything inside one", () => {
    const controls: [string, Record<string, string>][] = [
      ["BUTTON", {}], ["A", { href: "https://example.com/" }], ["INPUT", {}], ["SELECT", {}], ["OPTION", {}], ["TEXTAREA", {}],
      ["LABEL", {}], ["SUMMARY", {}], ["DIALOG", { open: "" }], ["SPAN", { role: "button" }], ["SPAN", { role: "link" }],
      ["DIV", { role: "checkbox" }], ["DIV", { role: "tab" }], ["LI", { role: "menuitem" }], ["DIV", { role: "presentation button" }],
      ["DIV", { contenteditable: "" }], ["DIV", { contenteditable: "true" }], ["DIV", { "data-no-advance": "" }],
    ];
    for (const [tag, attributes] of controls) {
      const control = node(tag, dialogueWindow, attributes);
      expect(shouldAdvanceOnTap(control, scene, reading), `${tag} ${JSON.stringify(attributes)}`).toBe(false);
      expect(shouldAdvanceOnTap(node("SPAN", node("B", control)), scene, reading), `inside ${tag}`).toBe(false);
    }
    // The gaps of the tool row and a modal opened from it (a log) belong to the controls.
    expect(shouldAdvanceOnTap(tools, scene, reading)).toBe(false);
    expect(shouldAdvanceOnTap(node("P", node("DIALOG", tools)), scene, reading)).toBe(false);
  });

  it("treats ordinary elements as part of the picture", () => {
    for (const [tag, attributes] of [["DIV", { contenteditable: "false" }], ["SPAN", { role: "presentation" }], ["H1", {}], ["DIV", { role: "status", "aria-label": "到着" }]] as const)
      expect(shouldAdvanceOnTap(node(tag, background, attributes), scene, reading)).toBe(true);
  });

  it("ignores a click from outside the scene's own elements (a portal, the header, another screen)", () => {
    const header = node("HEADER", node("DIV"));
    expect(shouldAdvanceOnTap(node("SPAN", header), scene, reading)).toBe(false);
    expect(shouldAdvanceOnTap(node("DIV", scene.parentElement), scene, reading)).toBe(false);
    expect(shouldAdvanceOnTap(null, scene, reading)).toBe(false);
  });

  it("does nothing while something is open over the scene or the window is hidden", () => {
    expect(shouldAdvanceOnTap(background, scene, { ...reading, obstructed: true })).toBe(false);
    expect(shouldAdvanceOnTap(background, scene, { ...reading, windowHidden: true })).toBe(false);
    expect(shouldAdvanceOnTap(background, scene, { ...reading, lineShown: false, obstructed: true })).toBe(false);
    expect(shouldAdvanceOnTap(background, scene, { ...reading, lineShown: false, windowHidden: true })).toBe(false);
  });

  it("ignores a reading tap right after a press on one of the scene's controls (the press's second tap)", () => {
    for (const target of [background, picture, speaker, dialogueWindow])
      expect(shouldAdvanceOnTap(target, scene, { ...reading, settling: true })).toBe(false);
    expect(shouldAdvanceOnTap(background, scene, { ...reading, lineShown: false, settling: true })).toBe(false);
  });

  it("with choices on screen, only completes a line still being written and never moves on", () => {
    expect(shouldAdvanceOnTap(background, scene, { ...reading, choicesShown: true })).toBe(false);
    expect(shouldAdvanceOnTap(background, scene, { ...reading, choicesShown: true, lineShown: false })).toBe(true);
    // Without choices, the first tap completes the line and the next one goes on: both read on.
    expect(shouldAdvanceOnTap(background, scene, { ...reading, lineShown: false })).toBe(true);
  });
});

// A press on a control changes the screen under the finger: a reply gives way to the
// reaction line, the restore control to the window. The scene then ignores reading taps
// for the double-tap window (useSceneTap, double-tap.ts).
describe("presses on a story scene's controls", () => {
  const replies = node("DIV", dialogueWindow, { role: "group" });
  const reply = node("BUTTON", replies);
  const restore = node("BUTTON", scene);
  const reference = node("ASIDE", scene, { "data-no-advance": "" });

  it("counts a reply, a tool, the restore control and a link, and taps on their contents", () => {
    for (const target of [reply, node("SPAN", reply), node("BUTTON", tools), node("SPAN", restore), node("A", reference, { href: "https://example.com/" }), node("P", node("DIALOG", tools))])
      expect(pressesSceneControl(target, scene)).toBe(true);
  });

  it("does not count reading taps (the line, the picture, the window) or near misses", () => {
    for (const target of [line, lineText, scene, background, picture, portrait, dialogueWindow, speaker, tools, reference, node("SPAN", reference)])
      expect(pressesSceneControl(target, scene)).toBe(false);
  });

  it("does not count a click without an element", () => {
    expect(pressesSceneControl(null, scene)).toBe(false);
  });
});
