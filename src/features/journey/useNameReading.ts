import { useCallback, useRef, type RefCallback } from "react";
import AutoKana from "vanilla-autokana/src/AutoKana.js";
import { nameFieldEdit, readingToSave, startReading, type FieldSelection, type ReadingStart } from "../../domain/name-romaji";

/** A field bound to the capture: the reading to save with the name it holds, and the unbinding. */
type Capture = { read: (name: string) => string | undefined; unbind: () => void };

/**
 * The reading of the player's name, captured while it is typed (2026-11-17, the user's decision: 「入力欄は隠す」 and
 * 「jquery.autoKana.jsで取得する」): vanilla-autokana (a port of jquery.autoKana.js without jQuery) watches the kana the
 * IME composes in the field and keeps it as the field's furigana, in an input element that is never added to the page
 * (nothing to see, focus or hear). Nothing on the screen says it is captured: it would give the Jaipur mehndi away.
 * `ref` goes on the player's name input (a React controlled input: the library only reads its value); `read(name)` at
 * submit gives the reading to save with that name (readingToSave: none for a kana or Latin name, or one it does not fit).
 * `reading` is the saved reading of the name the field is filled with when it appears (ゲームの設定), so a kanji added to
 * the name reads on from it. The field's edits are followed (nameFieldEdit): emptied or its whole name typed over, the
 * capture starts again from nothing; a converted character deleted (or a change before one), it gives no reading until
 * then.
 */
export function useNameReading(reading?: string): { ref: RefCallback<HTMLInputElement>; read: (name: string) => string | undefined } {
  const capture = useRef<Capture | null>(null);
  // Bound once per element: StrictMode's second attach finds the first unbound, and the reading it starts from only
  // changes when the names are saved (the settings' form closes).
  const ref = useCallback((input: HTMLInputElement | null) => {
    if (!input) return;
    const bound = captureReading(input, reading);
    capture.current = bound;
    return () => {
      bound.unbind();
      if (capture.current === bound) capture.current = null;
    };
  }, [reading]);
  return { ref, read: (name) => capture.current?.read(name) };
}

/** An input event of an IME composition (Safari marks its commit by the type only, after compositionend). */
const ofComposition = (event: Event) => (event as InputEvent).isComposing || /Composition/u.test((event as InputEvent).inputType ?? "");

/** vanilla-autokana bound to `input`, from the name it holds now and that name's saved reading. */
function captureReading(input: HTMLInputElement, reading: string | undefined): Capture {
  let start: ReadingStart = { name: input.value.trim(), ...(reading === undefined ? {} : { reading }) };
  // The furigana the library writes: the reading it starts from (it reads it again at each focus), then the kana typed.
  const furigana = document.createElement("input");
  furigana.value = startReading(start);
  // The library has no way to unbind: the listeners it adds to the field (blur, focus, keydown) get this signal.
  const listeners = new AbortController();
  const signal = listeners.signal;
  input.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) =>
    HTMLInputElement.prototype.addEventListener.call(input, type, listener,
      { ...(typeof options === "boolean" ? { capture: options } : options), signal })) as typeof input.addEventListener;
  let autokana: InstanceType<typeof AutoKana>;
  try {
    autokana = new AutoKana(input, furigana);
  } finally {
    Reflect.deleteProperty(input, "addEventListener");
  }
  // The field's edits (nameFieldEdit). `value`: the field's value at its last input; `before`: the value and the
  // selection as the next edit began (its beforeinput, or its composition's start); `composing`: the composition under
  // way has had its first change (the rest replace its own text: its kana, then the kanji it commits).
  let value = input.value;
  let before: { value: string; selection?: FieldSelection } | undefined;
  let composing = false;
  // A converted character deleted (or a change before one): no reading until the field is emptied or wholly replaced.
  let lost = false;
  const began = () => {
    const { selectionStart, selectionEnd } = input;
    before = { value: input.value, ...(selectionStart === null || selectionEnd === null ? {} : { selection: { start: selectionStart, end: selectionEnd } }) };
  };
  input.addEventListener("compositionstart", () => {
    composing = false;
    began();
  }, { signal });
  input.addEventListener("beforeinput", (event) => {
    if (!ofComposition(event)) began();
  }, { signal });
  input.addEventListener("input", (event) => {
    const now = input.value;
    const inComposition = ofComposition(event);
    if (!(inComposition && composing)) {
      const edit = nameFieldEdit(before?.value ?? value, now, before?.selection);
      if (edit === "restart") {
        // From nothing: the start forgotten, and the library's own state as a field emptied leaves it (it reads the
        // field afresh at its next check, so only the kana typed from now on count).
        start = { name: "" };
        lost = false;
        furigana.value = "";
        autokana.initializeValues();
      } else if (edit === "lost") lost = true;
    }
    composing = inComposition;
    value = now;
    before = undefined;
  }, { signal });
  input.addEventListener("compositionend", () => {
    before = undefined;
  }, { signal });
  // Bound again while it has the focus: watch from now, as the library does from a focus.
  if (input.ownerDocument.activeElement === input) input.dispatchEvent(new FocusEvent("focus"));
  return {
    // The furigana field rather than getFurigana(): the library writes both at once, but getFurigana() stays "" until its
    // first write (a pre-filled name left as it is), while the field holds the reading it started from.
    read: (name) => (lost ? undefined : readingToSave(name, furigana.value, start)),
    unbind: () => {
      autokana.stop();
      // Its blur listener stops the timer that watches the field while it has the focus.
      input.dispatchEvent(new FocusEvent("blur"));
      listeners.abort();
    },
  };
}
