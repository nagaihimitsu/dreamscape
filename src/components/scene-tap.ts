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
}

/** Elements that do something of their own when pressed (or hold such content). */
const controlTags = new Set(["a", "button", "input", "select", "option", "textarea", "label", "summary", "dialog"]);
const controlRoles = new Set(["button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "option", "slider", "textbox", "combobox"]);

function isControl(node: TapNode): boolean {
  if (controlTags.has(node.tagName.toLowerCase())) return true;
  if (node.getAttribute("role")?.split(/\s+/u).some((role) => controlRoles.has(role))) return true;
  const editable = node.getAttribute("contenteditable");
  if (editable !== null && editable !== "false") return true;
  // A non-control area the scene keeps out of reading taps (e.g. the tool row around its buttons).
  return node.getAttribute("data-no-advance") !== null;
}

/**
 * Whether a click that reached the scene's root reads on. Never on a control or
 * inside one (the dialogue line itself is a button and handles its own tap, so
 * one tap is one step), never for an element outside the scene's own elements
 * (a portal; the header, the HUD and the clue book are outside the scene), and
 * never while something is open over it or the window is hidden. With choices on
 * screen a tap can only complete the line still being written.
 */
export function shouldAdvanceOnTap(target: TapNode | null, scene: TapNode, state: SceneTapState): boolean {
  if (state.obstructed || state.windowHidden) return false;
  if (state.choicesShown && state.lineShown) return false;
  for (let node = target; node; node = node.parentElement) {
    if (node === scene) return true;
    if (isControl(node)) return false;
  }
  return false;
}
