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
  /** A log, menu or modal is open over the scene, or the page is hidden (dialogueObstructed). */
  obstructed: boolean;
  /**
   * A control of the page was pressed a moment ago, or a tap landed over something
   * on the scene (closing the held-item detail, or on the travel transition's card;
   * tapsObstructed, double-tap.ts), this tap included: it is that press or its
   * second tap, landing on whatever the press put under the finger.
   */
  settling: boolean;
}

/** Marks the dialogue line (DialogueText): a tap on it reads on, it is not a control press. */
export const DIALOGUE_LINE_ATTRIBUTE = "data-dialogue-line";

/**
 * Marks the page's own empty margin around a scene narrower than the screen (GameApp's
 * `<main>` beside the guide on a desktop): a tap on the margin itself, not on anything
 * in it, is a tap on the screen and reads on like a tap on the scene's picture.
 */
export const PAGE_MARGIN_ATTRIBUTE = "data-page-margin";

/** Elements that do something of their own when pressed (or hold such content). */
const controlTags = new Set(["a", "button", "input", "select", "option", "textarea", "label", "summary", "dialog"]);
const controlRoles = new Set(["button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "option", "slider", "textbox", "combobox", "dialog", "alertdialog"]);

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
 * Whether a click reads on: a click inside the scene, or on the page's own margin
 * (PAGE_MARGIN_ATTRIBUTE). Never on a control or inside one (the dialogue line
 * itself is a button and handles its own tap, so one tap is one step), never for
 * any other element outside the scene's own elements (a portal; the header, the
 * HUD and the clue book are outside the scene), never while something is open
 * over it or the window is hidden, and never as the second tap of a press
 * (`settling`). With choices on screen a tap can only complete the line still
 * being written.
 */
export function shouldAdvanceOnTap(target: TapNode | null, scene: TapNode, state: SceneTapState): boolean {
  if (state.obstructed || state.windowHidden || state.settling) return false;
  if (state.choicesShown && state.lineShown) return false;
  if (target && target.getAttribute(PAGE_MARGIN_ATTRIBUTE) !== null) return true;
  for (let node = target; node; node = node.parentElement) {
    if (node === scene) return true;
    if (isInteractive(node) || isNearMiss(node)) return false;
  }
  return false;
}

/**
 * Whether a click anywhere on the page pressed a control: in the scene a reply, a
 * choice, a tool, the restore control of a hidden window or a link; outside it the
 * header's buttons, or a modal's 「閉じる」 and the modal itself — rather than
 * reading on (the line, the picture) or missing one (a `data-no-advance` area, the
 * page's plain text). For a moment after such a press the scene takes no reading
 * tap (`settling`), so the second tap of a double tap on a reply cannot skip the
 * reaction line, nor the second tap on a modal's 「閉じる」 read on in the scene
 * the modal leaves behind.
 */
export function pressesControl(target: TapNode | null, scene: TapNode | null): boolean {
  for (let node = target; node && node !== scene; node = node.parentElement) {
    if (node.getAttribute(DIALOGUE_LINE_ATTRIBUTE) !== null) return false;
    if (isInteractive(node)) return true;
    if (isNearMiss(node)) return false;
  }
  return false;
}
