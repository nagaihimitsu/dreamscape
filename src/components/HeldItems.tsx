import { useEffect, useId, useRef, useState } from "react";
import { DEFAULT_ITEM_ICON } from "../content/code-images";
import { DismissLayer } from "./DismissLayer";
import { Icon } from "./icons";
import "./held-items.css";

/** `iconPath`: the item's own icon from its catalog entry; a generic icon otherwise. */
export type HeldItem = { id: string; name: string; description: string; iconPath?: string };

const iconSource = (item: HeldItem) => `${import.meta.env.BASE_URL}${item.iconPath ?? DEFAULT_ITEM_ICON}`;

/**
 * The items held in this city, in the header (UI redesign U20): one item is its
 * own picture's button, two or more share one 「所持品」 button with their count.
 * Either opens a detail under the header (the item, or every held item), closed
 * by its ×, by Esc (the focus goes back to the button) or by a tap anywhere else,
 * which does nothing else (DismissLayer). Items are read-only here: using them
 * remains part of their events.
 */
export function HeldItems({ items }: { items: HeldItem[] }) {
  const [open, setOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const single = items.length === 1 ? items[0] : undefined;
  const shown = open && items.length > 0;

  useEffect(() => {
    if (!shown) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    // A press on another of the header's buttons (above the layer) closes the detail too, and works as usual.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target && !groupRef.current?.contains(target) && !target.closest(".dismiss-layer")) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [shown]);

  if (!items.length) return null;
  const close = (focusWasInside: boolean) => {
    setOpen(false);
    if (focusWasInside) buttonRef.current?.focus({ preventScroll: true });
  };
  return (
    <div className="held-items" ref={groupRef} role="group" aria-label="所持アイテム">
      <button
        ref={buttonRef}
        type="button"
        className={`held-item-button${single ? "" : " held-items-bag"}`}
        aria-label={single ? `${single.name}の詳細` : `所持品（${items.length}個）`}
        aria-expanded={shown}
        aria-controls={shown ? `${id}-detail` : undefined}
        onClick={() => setOpen((previous) => !previous)}
      >
        {single
          ? <img src={iconSource(single)} alt="" />
          : <><span className="held-items-bag-icon"><Icon name="bag" /><span className="held-items-count">{items.length}</span></span><span className="held-items-word">所持品</span></>}
      </button>
      {shown && <>
        <DismissLayer owner={groupRef.current} onClose={close} />
        <div id={`${id}-detail`} className="held-item-detail" role="dialog" aria-labelledby={`${id}-name`}>
          <div className="held-item-detail-heading">
            <strong id={`${id}-name`}>{single ? single.name : `所持品（${items.length}個）`}</strong>
            <button type="button" className="held-item-close" aria-label={single ? "アイテムの詳細を閉じる" : "所持品を閉じる"} onClick={() => {
              setOpen(false);
              buttonRef.current?.focus();
            }}>×</button>
          </div>
          {single
            ? <p>{single.description}</p>
            : <ul className="held-item-list">{items.map((item) => <li key={item.id}>
              <img src={iconSource(item)} alt="" />
              <div><strong>{item.name}</strong><p>{item.description}</p></div>
            </li>)}</ul>}
        </div>
      </>}
    </div>
  );
}
