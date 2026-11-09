import { describe, expect, it } from "vitest";
import { DIALOGUE_LINE_ATTRIBUTE, PAGE_MARGIN_ATTRIBUTE, pressesControl, shouldAdvanceOnTap, type SceneTapState, type TapNode } from "./scene-tap";

/** A stand-in for a DOM element: a tag, attributes and a parent. */
function node(tagName: string, parentElement: TapNode | null = null, attributes: Record<string, string> = {}): TapNode {
  return { tagName, parentElement, getAttribute: (name) => attributes[name] ?? null };
}

const reading: SceneTapState = { lineShown: true, choicesShown: false, windowHidden: false, obstructed: false, settling: false };

// One scene as the story screens build it: background, portrait, the scene label line under the header (UI
// redesign §3.2: the scene's heading pill and its 出典・手がかり帳), dialogue window with a tool row and the
// line. Its page: the header above, and main, whose own margin
// beside a narrow scene is part of the screen.
// Recorded change (UI step 1.3, docs/02 「UX/スマホ」): the battle's place and the date's destination used to
// be chips inside the scene that read on when tapped, and the sightseeing guide's heading read on too; as
// pills of the label line, which is a `data-no-advance` area like the tool row, none of them reads on now.
const page = node("DIV");
const header = node("DIV", page);
const main = node("MAIN", page, { [PAGE_MARGIN_ATTRIBUTE]: "" });
const scene = node("DIV", main);
const background = node("DIV", scene);
const picture = node("img", background);
const portrait = node("path", node("svg", node("DIV", scene), { role: "presentation" }));
const labelLine = node("DIV", scene, { "data-no-advance": "" });
const labelPill = node("H1", labelLine, { "data-testid": "battle-location" });
const datePill = node("H1", labelLine, { "data-testid": "date-destination" });
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

  it("never reads on from the scene label line: its heading pill (a battle's place, a date's destination) or its gaps", () => {
    for (const target of [labelLine, labelPill, datePill])
      expect(shouldAdvanceOnTap(target, scene, reading)).toBe(false);
    expect(pressesControl(labelPill, scene), "a near miss, not a press").toBe(false);
  });

  it("leaves the line's own tap to the line, so one tap is one step", () => {
    expect(shouldAdvanceOnTap(line, scene, reading)).toBe(false);
    expect(shouldAdvanceOnTap(lineText, scene, reading)).toBe(false);
  });

  it("never reads on from a control or anything inside one", () => {
    const controls: [string, Record<string, string>][] = [
      ["BUTTON", {}], ["A", { href: "https://example.com/" }], ["INPUT", {}], ["SELECT", {}], ["OPTION", {}], ["TEXTAREA", {}],
      ["LABEL", {}], ["SUMMARY", {}], ["DIALOG", { open: "" }], ["SPAN", { role: "button" }], ["SPAN", { role: "link" }],
      ["DIV", { role: "checkbox" }], ["DIV", { role: "tab" }], ["LI", { role: "menuitem" }], ["DIV", { role: "presentation button" }], ["DIV", { role: "dialog" }],
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
    expect(shouldAdvanceOnTap(node("SPAN", node("HEADER", node("DIV"))), scene, reading)).toBe(false);
    expect(shouldAdvanceOnTap(node("SPAN", header), scene, reading)).toBe(false);
    expect(shouldAdvanceOnTap(header, scene, reading)).toBe(false);
    // A notice shown in main above the scene is not main's margin.
    expect(shouldAdvanceOnTap(node("DIV", main), scene, reading)).toBe(false);
    expect(shouldAdvanceOnTap(node("SPAN", node("DIV", main)), scene, reading)).toBe(false);
    expect(shouldAdvanceOnTap(null, scene, reading)).toBe(false);
  });

  it("reads on from the page's own margin beside the scene, like a tap on its picture", () => {
    expect(shouldAdvanceOnTap(main, scene, reading)).toBe(true);
    expect(shouldAdvanceOnTap(main, scene, { ...reading, lineShown: false })).toBe(true);
    for (const state of [{ obstructed: true }, { windowHidden: true }, { settling: true }, { choicesShown: true }])
      expect(shouldAdvanceOnTap(main, scene, { ...reading, ...state }), JSON.stringify(state)).toBe(false);
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
// reaction line, the restore control to the window, a modal's 「閉じる」 to the scene. The
// scene then ignores reading taps for the double-tap window (useSceneTap, double-tap.ts).
describe("presses on the page's controls", () => {
  const replies = node("DIV", dialogueWindow, { role: "group" });
  const reply = node("BUTTON", replies);
  const restore = node("BUTTON", scene);
  const reference = node("ASIDE", scene, { "data-no-advance": "" });
  const modal = node("DIALOG", page, { open: "" });

  it("counts a reply, a tool, the restore control and a link, and taps on their contents", () => {
    for (const target of [reply, node("SPAN", reply), node("BUTTON", tools), node("SPAN", restore), node("A", reference, { href: "https://example.com/" }), node("P", node("DIALOG", tools))])
      expect(pressesControl(target, scene)).toBe(true);
  });

  it("counts controls outside the scene: the header's buttons, a modal's 「閉じる」, the modal and its text", () => {
    for (const target of [node("BUTTON", header), node("SPAN", node("BUTTON", header)), node("BUTTON", modal), modal, node("P", modal), node("BUTTON", node("DIV", header, { role: "dialog" })), node("P", node("DIV", header, { role: "dialog" }))])
      expect(pressesControl(target, scene)).toBe(true);
  });

  it("does not count reading taps (the line, the picture, the window, the margin), near misses or plain page text", () => {
    for (const target of [line, lineText, scene, background, picture, portrait, dialogueWindow, speaker, tools, reference, node("SPAN", reference), main, header, node("SPAN", header), page])
      expect(pressesControl(target, scene)).toBe(false);
  });

  it("does not count a click without an element", () => {
    expect(pressesControl(null, scene)).toBe(false);
    expect(pressesControl(null, null)).toBe(false);
  });
});
