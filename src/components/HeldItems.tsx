import { useEffect, useId, useRef, useState } from "react";
import "./held-items.css";

export type HeldItem = { id: string; name: string; description: string };

const itemImages: Record<string, string> = {
  galleria_souvenir: "assets/items/galleria-bookmark.svg",
  galleria_ticket: "assets/items/galleria-ticket.svg",
};

/** Items are read-only here: using them remains part of their events. */
export function HeldItems({ items }: { items: HeldItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const selectedButton = useRef<HTMLButtonElement | null>(null);
  const id = useId();
  const selected = items.find((item) => item.id === selectedId);

  useEffect(() => {
    if (!selected) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!groupRef.current?.contains(event.target as Node)) setSelectedId(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        selectedButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  if (!items.length) return null;
  return (
    <div className="held-items" ref={groupRef} role="group" aria-label="所持アイテム">
      <div className="held-items-icons">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="held-item-button"
            aria-label={`${item.name}の詳細`}
            aria-expanded={selectedId === item.id}
            aria-controls={selectedId === item.id ? `${id}-detail` : undefined}
            onClick={(event) => {
              selectedButton.current = event.currentTarget;
              setSelectedId((previous) => previous === item.id ? null : item.id);
            }}
          >
            <img src={`${import.meta.env.BASE_URL}${itemImages[item.id] ?? "assets/items/item.svg"}`} alt="" />
          </button>
        ))}
      </div>
      {selected && (
        <div id={`${id}-detail`} className="held-item-detail" role="dialog" aria-labelledby={`${id}-name`}>
          <div className="held-item-detail-heading">
            <strong id={`${id}-name`}>{selected.name}</strong>
            <button type="button" className="held-item-close" aria-label="アイテムの詳細を閉じる" onClick={() => {
              setSelectedId(null);
              selectedButton.current?.focus();
            }}>×</button>
          </div>
          <p>{selected.description}</p>
        </div>
      )}
    </div>
  );
}
