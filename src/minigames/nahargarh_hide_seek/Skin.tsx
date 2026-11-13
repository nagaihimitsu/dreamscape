import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { SearchFieldProps, SearchSkin, SearchView } from "../engines/search/EnginePlay";
import { HIDE_SEEK_DOORS, hideSeekGame, hideSeekRules, type HideSeekOutcome, type HideSeekParams } from "./rules";
import "./skin.css";

// The hide-and-seek's field (a search skin): a stretch of the palace corridor, a row of identical arched doors on one wall
// that runs on past the screen's edge (it scrolls). An opened door shows an empty room, or her; 「名前を呼ぶ」 sends her name
// back from every door; doing nothing ends with her peeking from the corner. No names on the doors. With the use's art
// (`art.bay`, `art.room`, `art.peek`), those pictures in place of the drawn wall and door, room and her standing picture.

/** How long a call's echo shows over the doors. */
const ECHO_MS = 1400;
const SOUNDS = { creak: "door_creak" } as const;

/** The top band: what the player has done (nothing yet: empty). */
function status(view: SearchView): string {
  const opened = view.searched.length;
  const calls = view.presses.call ?? 0;
  return [opened ? `開けた扉 ${opened}` : "", calls ? `呼んだ ${calls}回` : ""].filter(Boolean).join("・");
}

function HideSeekField({ setup, view, live, search, active, frames, cast, names, art, still, sound, vibrate }: SearchFieldProps<HideSeekParams, HideSeekOutcome>) {
  const scroller = useRef<HTMLDivElement>(null);
  const doors = useRef<(HTMLButtonElement | null)[]>([]);
  const [more, setMore] = useState({ left: false, right: true });
  const [echo, setEcho] = useState<number | null>(null);
  const play = useRef({ sound, vibrate });
  play.current = { sound, vibrate };
  const target = setup.targets[0];
  const peeking = view.ending?.kind === "idle" || view.ending?.kind === "timeout";

  // A door opened: its creak, the corridor brought to it (おまかせ opens doors out of view), a tap when it is hers.
  const opened = view.searched.length;
  useEffect(() => {
    if (!opened) return;
    const door = view.searched[opened - 1];
    play.current.sound(SOUNDS.creak);
    if (door === target) play.current.vibrate("clue");
    doors.current[door]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: still ? "auto" : "smooth" });
  }, [opened]); // each newly opened door once
  // A call's echo, from every door for a moment (timed on the play's clock, so a paused play holds it).
  useEffect(() => frames((ms) => {
    const last = view.last;
    const showing = last && "button" in last.action && ms - last.at < ECHO_MS ? last.at : null;
    setEcho((current) => (current === showing ? current : showing));
  }), [frames, view.last]);
  const onScroll = () => {
    active();
    const box = scroller.current;
    if (!box) return;
    const left = box.scrollLeft > 4;
    const right = box.scrollLeft + box.clientWidth < box.scrollWidth - 4;
    setMore((current) => (current.left === left && current.right === right ? current : { left, right }));
  };

  return (
    <div className="mg-nahargarh-hide-seek" data-art-bay={art.bay ? true : undefined} data-more-left={more.left || undefined}
      data-more-right={more.right || undefined} style={{ "--hide-seek-bay": art.bay ? `url("${art.bay}")` : undefined, "--hide-seek-room": art.room ? `url("${art.room}")` : undefined } as CSSProperties}>
      <div className="mg-nahargarh-hide-seek-corridor" ref={scroller} onScroll={onScroll} onPointerDown={active}>
        <div className="mg-nahargarh-hide-seek-row">
          {Array.from({ length: HIDE_SEEK_DOORS }, (_, door) => {
            const open = view.searched.includes(door);
            const hers = open && door === target;
            return (
              <button key={door} type="button" ref={(element) => { doors.current[door] = element; }} className="mg-nahargarh-hide-seek-bay"
                data-testid={`minigame-spot-${door}`} data-minigame-primary={door === 0 || undefined} data-open={open || undefined}
                data-hers={hers || undefined} aria-disabled={!live || open || undefined}
                aria-label={`扉${door + 1}${hers ? "：見つけた" : open ? "：空っぽの部屋" : ""}`}
                onClick={() => { if (live && !open) search(door); }}>
                <span className="mg-nahargarh-hide-seek-door" aria-hidden="true">
                  <span className="mg-nahargarh-hide-seek-room">
                    {hers && <span className="mg-nahargarh-hide-seek-her">{cast.heroine}</span>}
                  </span>
                  <span className="mg-nahargarh-hide-seek-leaf mg-nahargarh-hide-seek-leaf-left" />
                  <span className="mg-nahargarh-hide-seek-leaf mg-nahargarh-hide-seek-leaf-right" />
                </span>
                {echo !== null && (
                  <span key={echo} className="mg-nahargarh-hide-seek-echo" aria-hidden="true" style={{ animationDelay: `${(door % 5) * 70}ms` }}>
                    {names.heroine}……
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <span className="mg-nahargarh-hide-seek-fade mg-nahargarh-hide-seek-fade-left" aria-hidden="true" />
      <span className="mg-nahargarh-hide-seek-fade mg-nahargarh-hide-seek-fade-right" aria-hidden="true"><span>›</span></span>
      {peeking && (
        <span className="mg-nahargarh-hide-seek-peek" aria-hidden="true">
          {art.peek ? <img src={art.peek} alt="" draggable={false} /> : cast.heroine}
        </span>
      )}
    </div>
  );
}

/** The hide-and-seek as a search skin: its game, rules, words and field. */
export const hideSeekSkin: SearchSkin<HideSeekParams, HideSeekOutcome> = {
  game: hideSeekGame,
  rules: hideSeekRules,
  hintJa: "扉を押して開ける。廊下は横に続いている",
  buttons: [{ id: "call", labelJa: "名前を呼ぶ", hintJa: "廊下に向かって、彼女の名前を呼びます。", tone: "secondary" }],
  autoJa: "おまかせで探しています",
  // Her in the open door, the last echo, or her peeking from the corner, before the outcome shows.
  endDelayMs: (ending, still) => (still ? 700 : ending.kind === "found" ? 1400 : ending.kind === "button" ? 1300 : 1500),
  statusJa: (view) => status(view),
  Field: HideSeekField,
};
