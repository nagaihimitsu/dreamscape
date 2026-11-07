/**
 * Tap anywhere to read on (user idea, 2026-11-07): in a story scene a tap or
 * click on the scene acts like a tap on the dialogue line (the first tap
 * completes a line still being written, the next one goes on), except on a
 * control. The scene passes the element it received the click from, its own
 * root element and what is open; the rule needs nothing else, so it is tested
 * without a browser.
 */

/** The members of a DOM element the rule reads (an `Element` has them). */
export interface TapNode {
  readonly tagName: string;
  readonly parentElement: TapNode | null;
  getAttribute(name: string): string | null;
}

export interface SceneTapState {
  /** The whole current line is displayed. */
  lineShown: boolean;
  /** Choices or answer options are on screen: only they pick the next step. */
  choicesShown: boolean;
  /** The dialogue window is hidden: its full-scene restore control takes the tap. */
  windowHidden: boolean;
  /** A log, menu or modal is open over the scene, or the page is hidden. */
  obstructed: boolean;
  /**
   * A control of the scene was pressed a moment ago (double-tap.ts): this tap is
   * that press's second tap, landing on whatever the press put under the finger.
   */
  settling: boolean;
}

/** Marks the dialogue line (DialogueText): a tap on it reads on, it is not a control press. */
export const DIALOGUE_LINE_ATTRIBUTE = "data-dialogue-line";

/** Elements that do something of their own when pressed (or hold such content). */
const controlTags = new Set(["a", "button", "input", "select", "option", "textarea", "label", "summary", "dialog"]);
const controlRoles = new Set(["button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "option", "slider", "textbox", "combobox"]);

function isInteractive(node: TapNode): boolean {
  if (controlTags.has(node.tagName.toLowerCase())) return true;
  if (node.getAttribute("role")?.split(/\s+/u).some((role) => controlRoles.has(role))) return true;
  const editable = node.getAttribute("contenteditable");
  return editable !== null && editable !== "false";
}

/** A near miss: a non-control area the scene keeps out of reading taps (e.g. the tool row around its buttons). */
function isNearMiss(node: TapNode): boolean {
  return node.getAttribute("data-no-advance") !== null;
}

/**
 * Whether a click that reached the scene's root reads on. Never on a control or
 * inside one (the dialogue line itself is a button and handles its own tap, so
 * one tap is one step), never for an element outside the scene's own elements
 * (a portal; the header, the HUD and the clue book are outside the scene), never
 * while something is open over it or the window is hidden, and never as the
 * second tap of a press on one of its controls. With choices on screen a tap can
 * only complete the line still being written.
 */
export function shouldAdvanceOnTap(target: TapNode | null, scene: TapNode, state: SceneTapState): boolean {
  if (state.obstructed || state.windowHidden || state.settling) return false;
  if (state.choicesShown && state.lineShown) return false;
  for (let node = target; node; node = node.parentElement) {
    if (node === scene) return true;
    if (isInteractive(node) || isNearMiss(node)) return false;
  }
  return false;
}

/**
 * Whether a click inside the scene pressed one of its controls (a reply, a
 * choice, a tool, the restore control of a hidden window, a link) rather than
 * reading on (the line, the picture) or missing one (a `data-no-advance` area).
 * For a moment after such a press the scene takes no reading tap (`settling`),
 * so the second tap of a double tap on a reply cannot skip the reaction line.
 */
export function pressesSceneControl(target: TapNode | null, scene: TapNode): boolean {
  for (let node = target; node && node !== scene; node = node.parentElement) {
    if (node.getAttribute(DIALOGUE_LINE_ATTRIBUTE) !== null) return false;
    if (isInteractive(node)) return true;
    if (isNearMiss(node)) return false;
  }
  return false;
}
