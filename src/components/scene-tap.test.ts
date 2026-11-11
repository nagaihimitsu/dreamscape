import { describe, expect, it } from "vitest";
import { DIALOGUE_LINE_ATTRIBUTE, DIALOGUE_TOOLS_ATTRIBUTE, DOUBLE_TAP_SLOP_PX, PAGE_MARGIN_ATTRIBUTE, ignoresWindowToolTap, pressesControl, shouldAdvanceOnTap, windowToolAt, type SceneTapState, type TapNode } from "./scene-tap";

/** A stand-in for a DOM element: a tag, attributes and a parent. */
function node(tagName: string, parentElement: TapNode | null = null, attributes: Record<string, string> = {}): TapNode {
  return { tagName, parentElement, getAttribute: (name) => attributes[name] ?? null };
}

const reading: SceneTapState = { lineShown: true, choicesShown: false, windowHidden: false, obstructed: false, settling: false };

// One scene as the story screens build it: background, portrait, dialogue window with its head (the
// speaker's plate and the tool row) and the line. Its page: the header above, and main, whose own margin
// beside a narrow scene is part of the screen.
const page = node("DIV");
const header = node("DIV", page);
const main = node("MAIN", page, { [PAGE_MARGIN_ATTRIBUTE]: "" });
const scene = node("DIV", main);
const background = node("DIV", scene);
const picture = node("img", background);
const portrait = node("path", node("svg", node("DIV", scene), { role: "presentation" }));
const dialogueWindow = node("SECTION", scene);
const windowHead = node("DIV", dialogueWindow);
const speaker = node("DIV", windowHead);
const tools = node("DIV", windowHead, { "data-no-advance": "", [DIALOGUE_TOOLS_ATTRIBUTE]: "" });
const line = node("P", dialogueWindow, { role: "button", tabindex: "0", [DIALOGUE_LINE_ATTRIBUTE]: "" });
const lineText = node("SPAN", line);

describe("tap anywhere in a story scene", () => {
  it("reads on from the background, the portrait, the window's empty space and its name plate", () => {
    for (const target of [scene, background, picture, portrait, dialogueWindow, speaker])
      expect(shouldAdvanceOnTap(target, scene, reading)).toBe(true);
  });

  it("reads on from the window's head beside its controls (the plate's row is part of the window)", () => {
    expect(shouldAdvanceOnTap(windowHead, scene, reading)).toBe(true);
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

describe("a double tap that moves the window's head under the finger", () => {
  const hide = node("BUTTON", tools);
  const hideIcon = node("svg", hide);
  const log = node("BUTTON", tools);
  const reply = node("BUTTON", dialogueWindow);
  const modalClose = node("BUTTON", node("DIALOG", page, { open: "" }));
  // The log's dialog lies inside the tool row, beside its 「ログ」 button.
  const logClose = node("BUTTON", node("DIALOG", tools, { open: "" }));

  it("finds the window's tool a tap lands on, and nothing else", () => {
    expect(windowToolAt(hideIcon, scene)).toBe(hide);
    expect(windowToolAt(log, scene)).toBe(log);
    for (const target of [tools, speaker, reply, line, modalClose, logClose, picture]) expect(windowToolAt(target, scene)).toBeNull();
  });

  it("presses no tool with the second tap after a reply or the log's 「閉じる」, at the same point", () => {
    expect(ignoresWindowToolTap(hide, reply, 120, 0)).toBe(true);
    expect(ignoresWindowToolTap(log, modalClose, 0, DOUBLE_TAP_SLOP_PX)).toBe(true);
  });

  it("presses the tool as usual after the double-tap window, elsewhere, as a second tap on the same tool, or without an earlier press", () => {
    expect(ignoresWindowToolTap(hide, reply, 350, 0)).toBe(false);
    expect(ignoresWindowToolTap(hide, reply, 120, DOUBLE_TAP_SLOP_PX + 1)).toBe(false);
    expect(ignoresWindowToolTap(hide, hide, 120, 0)).toBe(false);
    expect(ignoresWindowToolTap(hide, null, null, 0)).toBe(false);
    expect(ignoresWindowToolTap(null, reply, 120, 0)).toBe(false);
  });
});
