import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_ITEM_ICON } from "../content/code-images";
import { DismissLayer } from "./DismissLayer";
import { NewDot, Sparkle, SPARKLE_MS, useCuePlaying } from "./fx";
import { Icon } from "./icons";
import { playSe } from "../audio/sound-effects";
import "./held-items.css";

/** `iconPath`: the item's own icon from its catalog entry; a generic icon otherwise. */
/** `origin`: for an item carried from an earlier city, where it came from (「デリーから持ってきた」; the item design §2.6). */
/** `lines`: what is written on the item (a note's lines, the catalog's `linesJa`), shown in order under the description. */
export type HeldItem = { id: string; name: string; description: string; lines?: string[]; iconPath?: string; origin?: string };

/** How long an item given away or used plays (milliseconds; held-items.css): the picture's shrink and its icon's float. */
const SPENT_MS = 800;

const iconPath = (path: string | undefined) => `${import.meta.env.BASE_URL}${path ?? DEFAULT_ITEM_ICON}`;
const iconSource = (item: HeldItem) => iconPath(item.iconPath);
const ItemLines = ({ item }: { item: HeldItem }) => item.lines
  ? <ol className="held-item-lines" aria-label={`${item.name}に書かれていること`}>{item.lines.map((line, index) => <li key={index}>{line}</li>)}</ol>
  : null;
/** 「NEW」 beside an item the player had not looked at when the detail opened (read as 「新しい品物」). */
const NewTag = () => <span className="held-item-new"><span aria-hidden="true">NEW</span><span className="sr-only">新しい品物</span></span>;

/**
 * The items held in this city, in the header (UI redesign U20): one item is its
 * own picture's button, two or more share one 「所持品」 button with their count.
 * Either opens a detail under the header (the item, or every held item), closed
 * by its ×, by Esc (the focus goes back to the button), by a tap anywhere else,
 * which does nothing else (DismissLayer), or by the focus leaving the group (Tab
 * past the detail, Shift+Tab before the button), as ⚙設定's panel does: the
 * detail pauses the scene while it is open, so it never stays open behind the
 * focus. `onOpen` runs as it opens (the header closes its other popovers). Items
 * are read-only here: using them remains part of their events. `gained`: how many
 * times the header has shown a new item; each new count pops the button's picture
 * once (journey-hud.css; the button itself stays where it is), then キラリ crosses
 * the button (fx.tsx). `spent`: how many times the header has shown an item given
 * away or used, with that item's icon; each new count shrinks the picture for a
 * moment while a faint copy of the icon floats up from the button and fades (from
 * where the button was, when it was the last item). `newIds`: the items the player
 * has not looked at in the open detail (GameApp's memory): a dot on the button,
 * said in its name (「新しい品物あり」), and 「NEW」 beside them in the detail for
 * that opening; `onSeen` runs as the detail opens with some (2026-11-13 user decision).
 */
export function HeldItems({ items, gained, spent, newIds = [], onOpen, onSeen }: {
  items: HeldItem[]; gained?: number; spent?: { count: number; iconPath?: string }; newIds?: readonly string[];
  onOpen?: () => void; onSeen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  // The items new as the detail opened: their 「NEW」 stays while it is open (the next opening has none).
  const [openedNew, setOpenedNew] = useState<readonly string[]>([]);
  const gainedPlaying = useCuePlaying(gained, SPARKLE_MS);
  const spentPlaying = useCuePlaying(spent?.count, SPENT_MS);
  const groupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const single = items.length === 1 ? items[0] : undefined;
  const shown = open && items.length > 0;
  const fresh = newIds.length > 0;

  useEffect(() => {
    if (!shown) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
      playSe("ui_close");
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

  // The detail ends above the screen's bottom edge wherever the header is (free time
  // can show the site's masthead above it) and scrolls inside when it is longer.
  useLayoutEffect(() => {
    const detail = detailRef.current;
    if (!shown || !detail) return;
    const fit = () => { detail.style.maxHeight = `${Math.max(120, window.innerHeight - detail.getBoundingClientRect().top - 12)}px`; };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, { passive: true });
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit);
    };
  }, [shown]);

  const ghost = spentPlaying && spent
    ? <span key={spent.count} className="held-item-ghost" aria-hidden="true"><img src={iconPath(spent.iconPath)} alt="" /></span>
    : null;
  // The last item given away: its icon still floats up from where the button was.
  if (!items.length) return ghost && <span className="held-items-gone" aria-hidden="true">{ghost}</span>;
  const isNew = (item: HeldItem) => openedNew.includes(item.id);
  const close = (focusWasInside: boolean) => {
    playSe("ui_close");
    setOpen(false);
    if (focusWasInside) buttonRef.current?.focus({ preventScroll: true });
  };
  return (
    <div
      className="held-items"
      ref={groupRef}
      role="group"
      aria-label="所持アイテム"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (shown && next instanceof Node && !groupRef.current?.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`held-item-button fx-host${single ? "" : " held-items-bag"}`}
        aria-label={`${single ? `${single.name}の詳細` : `所持品（${items.length}個）`}${fresh ? "、新しい品物あり" : ""}`}
        aria-expanded={shown}
        aria-controls={shown ? `${id}-detail` : undefined}
        onClick={() => {
          if (!shown) {
            onOpen?.();
            setOpenedNew(newIds);
            if (fresh) onSeen?.();
          }
          playSe(shown ? "ui_close" : "ui_open");
          setOpen(!shown);
        }}
      >
        {/* A new key per new or spent item plays its cue once; one item to more (or back) keeps it. */}
        <span key={`picture-${gained ?? 0}-${spent?.count ?? 0}`} className="held-item-picture"
          data-gained={gainedPlaying ? "" : undefined} data-spent={spentPlaying && !gainedPlaying ? "" : undefined}>
          {single
            ? <img src={iconSource(single)} alt="" />
            : <><span className="held-items-bag-icon"><Icon name="bag" /><span className="held-items-count">{items.length}</span></span><span className="held-items-word">所持品</span></>}
        </span>
        <Sparkle playing={gainedPlaying} cue={gained} />
        {ghost}
        {fresh && <NewDot />}
      </button>
      {shown && <>
        <DismissLayer owner={groupRef.current} onClose={close} />
        <div ref={detailRef} id={`${id}-detail`} className="held-item-detail" role="dialog" aria-labelledby={`${id}-name`}>
          <div className="held-item-detail-heading">
            <strong id={`${id}-name`}>{single ? single.name : `所持品（${items.length}個）`}</strong>
            {single && isNew(single) && <NewTag />}
            <button type="button" className="held-item-close" aria-label={single ? "アイテムの詳細を閉じる" : "所持品を閉じる"} onClick={() => {
              playSe("ui_close");
              setOpen(false);
              buttonRef.current?.focus();
            }}>×</button>
          </div>
          {single
            ? <><p>{single.description}</p><ItemLines item={single} />{single.origin && <p className="held-item-origin">{single.origin}</p>}</>
            : <ul className="held-item-list">{items.map((item) => <li key={item.id}>
              <img src={iconSource(item)} alt="" />
              <div><strong>{item.name}</strong>{isNew(item) && <NewTag />}<p>{item.description}</p><ItemLines item={item} />{item.origin && <p className="held-item-origin">{item.origin}</p>}</div>
            </li>)}</ul>}
        </div>
      </>}
    </div>
  );
}
