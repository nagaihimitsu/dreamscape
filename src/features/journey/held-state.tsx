import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState, type ReactNode } from "react";

/**
 * State of the chosen card's own (an open sheet, a confirmation, a line it shows) held by free time itself, so that it
 * survives the card being drawn again in another place: free time's row and list put the chosen card in different parts
 * of the page, and turning the phone (or a page too short for the row) moves it between them, which mounts it anew. The
 * held state is dropped when another card is chosen, as the card's own state would be. Outside free time (the night
 * screen, the previous travel menu) there is no holder and a card keeps its state itself, as before.
 */
type Holder = { values: Map<string, unknown> };

const HeldState = createContext<Holder | null>(null);

/** Holds the state of the card chosen as `chosenId` for its subtree; a new choice starts it empty. */
export function HeldStateProvider({ chosenId, children }: { chosenId: string; children: ReactNode }) {
  // A new Map for each chosen card: what the previous card held is gone with it.
  const holder = useMemo<Holder>(() => ({ values: new Map() }), [chosenId]);
  return <HeldState.Provider value={holder}>{children}</HeldState.Provider>;
}

/**
 * `useState` whose value free time holds under `key` (unique within the chosen card) while a HeldStateProvider is above;
 * without one, an ordinary `useState`.
 */
export function useHeldState<T>(key: string, initial: T): [T, (value: T) => void] {
  const holder = useContext(HeldState);
  const [own, setOwn] = useState(initial);
  const [, redraw] = useReducer((count: number) => count + 1, 0);
  const holderRef = useRef(holder);
  holderRef.current = holder;
  const setHeld = useCallback((value: T) => {
    holderRef.current?.values.set(key, value);
    redraw();
  }, [key]);
  if (!holder) return [own, setOwn];
  return [holder.values.has(key) ? holder.values.get(key) as T : initial, setHeld];
}
