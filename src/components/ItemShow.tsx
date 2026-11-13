import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { DEFAULT_ITEM_ICON } from "../content/code-images";
import { encounters } from "../content/encounters";
import { playCue } from "../audio/sound-effects";
import { isVectorIcon, itemFlight, type Box } from "./item-show";
import "./item-show.css";

// A line's `# item_show: <item ID>` (2026-11-13 user decision): the item's card in the five story screens
// (ItemShowLayer), and its way into the header's bag as the line goes (ItemShowFlight, drawn by JourneyHud).
// Presentation only, on every reading of the line: the card gives nothing (the scene's own `# give:`, `# on_done:` do),
// takes no presses and no focus, and is aria-hidden (the line itself tells it; 「…を手に入れました」 says the gain).

type ItemCard = { id: string; name: string; iconPath: string };

function itemCard(itemId: string | undefined): ItemCard | undefined {
  const item = itemId ? encounters.items.find((entry) => entry.id === itemId) : undefined;
  return item && { id: item.id, name: item.nameJa, iconPath: item.iconPath ?? DEFAULT_ITEM_ICON };
}

/** Where the card on screen is (its box in the window, without its coming-in scale): its flight starts there. */
let shownCard: { itemId: string; box: Box } | null = null;

/** A card's picture and name: a vector picture as large as the card allows, any other at its own size at most (sharp). */
function CardBody({ card }: { card: ItemCard }) {
  return <>
    <span className="item-show-picture">
      <img src={`${import.meta.env.BASE_URL}${card.iconPath}`} alt="" decoding="async" data-vector={isVectorIcon(card.iconPath) || undefined} />
    </span>
    <span className="item-show-name">{card.name}</span>
  </>;
}

/**
 * The line's item (`itemId`, the frame's `itemShow`) on a card in the middle of the scene, over the portraits and under
 * the window (like a large photo, line-stage.css), with a soft gold gleam, while the line is on screen. item_get rings
 * as it appears (not on a quiet line, nor for a scene a load brought back, nor during 高速送り: playCue); a line after it
 * with the same item keeps the card as it is. An item the catalog does not have shows nothing.
 */
export function ItemShowLayer({ itemId, quiet = false }: { itemId?: string; quiet?: boolean }) {
  const card = itemCard(itemId);
  if (!card) return null;
  return <ItemShowCard key={card.id} card={card} quiet={quiet} />;
}

function ItemShowCard({ card, quiet }: { card: ItemCard; quiet: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!quiet) playCue("item_get");
  // Once, as the card appears: the line's quiet is read then.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      // It grows in about its middle: its own size, about the middle it shows.
      const rect = element.getBoundingClientRect();
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      shownCard = { itemId: card.id, box: { left: rect.left + rect.width / 2 - width / 2, top: rect.top + rect.height / 2 - height / 2, width, height } };
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [card.id]);
  return <div className="item-show-layer" aria-hidden="true" data-testid="item-show">
    <div className="item-show-card" ref={ref}>
      <span className="item-show-gleam" />
      <CardBody card={card} />
    </div>
  </div>;
}

/**
 * The card of a line that has just gone (GameApp: useItemShowLeave), in the header's own layer over the screen: from
 * where it was, it shrinks and flies into the held items' button (`toBag`: the item is held and the header shows its
 * held items), or else it fades where it was. Fading only under reduced motion (item-show.css).
 */
export function ItemShowFlight({ itemId, toBag }: { itemId: string; toBag: boolean }) {
  const card = itemCard(itemId);
  const layer = useRef<HTMLSpanElement>(null);
  const [flight, setFlight] = useState<{ mode: "fly" | "fade"; style: CSSProperties } | null>(null);
  // Measured once as it starts: where the layer is, where the card was and where the bag is.
  useLayoutEffect(() => {
    const origin = layer.current?.getBoundingClientRect();
    if (!origin) return;
    const box: Box = shownCard?.itemId === itemId ? shownCard.box
      : { left: window.innerWidth / 2 - 80, top: window.innerHeight * 0.3, width: 160, height: 200 };
    const bag = toBag ? document.querySelector<HTMLElement>(".journey-hud .held-item-button")?.getBoundingClientRect() : undefined;
    const fly = bag && bag.width > 0 && bag.height > 0 ? itemFlight(box, bag) : undefined;
    setFlight({
      mode: fly ? "fly" : "fade",
      style: { left: box.left - origin.left, top: box.top - origin.top, width: box.width, height: box.height,
        ...(fly ? { "--dx": `${fly.dx}px`, "--dy": `${fly.dy}px`, "--to-scale": fly.scale } : {}) } as CSSProperties,
    });
  // Once, as it starts (each leaving is its own flight: JourneyHud keys it): a header changing meanwhile does not restart it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!card) return null;
  return <span ref={layer} className="item-show-flight" aria-hidden="true">
    {flight && <span className="item-show-card item-show-leaving" data-mode={flight.mode} style={flight.style}><CardBody card={card} /></span>}
  </span>;
}
