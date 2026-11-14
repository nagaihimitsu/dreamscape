import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchFieldProps, SearchSkin, SearchView } from "../engines/search/EnginePlay";
import { useMiniGameKit } from "../host/kit";
import { seededRandom } from "../host/seed";
import {
  HIDE_SEEK_DOORS, HIDE_SEEK_TUNING, hideSeekGameFor, hideSeekRulesFor, type HideSeekOutcome, type HideSeekParams, type HideSeekTuning,
} from "./rules";
import "./skin.css";

// The hide-and-seek's field (a search skin): a stretch of the palace corridor, a row of identical arched doors on one wall
// that runs on past the screen's edge (it scrolls), under the ceiling's beams and the wall lamps' light. An opened door
// shows an empty room with something small going on in it (looks only, from the seed), or her. 「名前を呼ぶ」 sends her name
// back from every door, and from hers a giggle after it (a clue for the ear: the third call ends the play). Once the player
// has opened a door or called, doing nothing brings a hint: a giggle, her door's handles move, and her face in the
// band (react). Doing nothing at all from the start ends with her peeking from the corner. Finding her is the one moment
// of impact: a short stop, her door's leaves swing past open and back, a ring and stars at her face (the host's juice).
// No names on the doors. With the use's art (`art.bay`, `art.room`, `art.peek`), those pictures in place of the drawn
// wall and doorway (the photos as the back layer, `mg-photo`; its leaves still drawn over it and opened, `mg-play-object`),
// room and her standing picture.

/** How long a call's echo shows over the doors. */
const ECHO_MS = 1400;
/** Her door's echo comes this much after the others, with her giggle (the clue). */
const HER_ECHO_DELAY_MS = 120;
/** How long a hint's giggle shows. */
const GIGGLE_MS = 1400;
/** A call's sound until an echo sound exists: three soft taps this far apart, fading like an echo (a share of the volume). */
const CALL_TAP_MS = [0, 120, 240];
const CALL_TAP_VOLUME = [0.6, 0.35, 0.2];
/** An empty room's creak, lower and longer than her door's (its playback rate). */
const EMPTY_CREAK_RATE = 0.85;
/** The stop as her door opens (ms). */
const FOUND_STOP_MS = 90;
const SOUNDS = { creak: "door_creak", call: "ui_tap", pigeon: "pigeon_flutter" } as const;

/** What goes on in an empty room as its door opens (looks only; the seed deals them out to the empty doors). */
export type HideSeekRoomEvent = "dust" | "pigeon" | "curtain" | "light" | "portrait";
export const HIDE_SEEK_ROOM_EVENTS: readonly HideSeekRoomEvent[] = ["dust", "pigeon", "curtain", "light", "portrait"];

/** Each door's room event (none behind hers): every kind before any comes again, in the seed's order. */
export function hideSeekRoomEvents(seed: number, target: number): (HideSeekRoomEvent | null)[] {
  const random = seededRandom(seed);
  const deal: HideSeekRoomEvent[] = [];
  while (deal.length < HIDE_SEEK_DOORS) {
    const kinds = [...HIDE_SEEK_ROOM_EVENTS];
    for (let index = kinds.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [kinds[index], kinds[swap]] = [kinds[swap], kinds[index]];
    }
    // The same kind never twice in a row across a deal's seam.
    if (deal.length && kinds[0] === deal[deal.length - 1]) kinds.push(kinds.shift()!);
    deal.push(...kinds);
  }
  let next = 0;
  return Array.from({ length: HIDE_SEEK_DOORS }, (_, door) => (door === target ? null : deal[next++]));
}

/** The top band: what the player has done (nothing yet: empty). */
function status(view: SearchView): string {
  const opened = view.searched.length;
  const calls = view.presses.call ?? 0;
  return [opened ? `開けた扉 ${opened}` : "", calls ? `呼んだ ${calls}回` : ""].filter(Boolean).join("・");
}

/** What happens in an empty room (drawn over the room's picture, inside the doorway). */
function RoomEvent({ kind }: { kind: HideSeekRoomEvent }) {
  switch (kind) {
    case "dust":
      // Dust lifts in the window's light, where the door's draught stirred it.
      return <span className="mg-nahargarh-hide-seek-event" data-event="dust">{[0, 1, 2].map((mote) => <i key={mote} />)}</span>;
    case "pigeon":
      // A pigeon startled off the floor, out through the window's light.
      return (
        <span className="mg-nahargarh-hide-seek-event" data-event="pigeon">
          <svg viewBox="0 0 32 20" aria-hidden="true" focusable="false">
            <path d="M2 12 Q 9 2, 16 9 Q 22 1, 30 6 Q 23 9, 20 13 Q 15 18, 8 15 Z" fill="#6f7680" stroke="#2a211c" strokeWidth="1" />
            <circle cx="24" cy="7" r="1.1" fill="#2a211c" />
          </svg>
        </span>
      );
    case "curtain":
      // A thin cloth hung in the inner doorway, stirred by the door's draught.
      return <span className="mg-nahargarh-hide-seek-event" data-event="curtain"><i /></span>;
    case "light":
      // The window's light falls longer across the floor as the room opens.
      return <span className="mg-nahargarh-hide-seek-event" data-event="light"><i /></span>;
    case "portrait":
      // A painted lady in a niche on the far wall; her eyes seem to follow the door.
      return (
        <span className="mg-nahargarh-hide-seek-event" data-event="portrait">
          <svg viewBox="0 0 24 30" aria-hidden="true" focusable="false">
            <ellipse cx="12" cy="15" rx="10.5" ry="13.5" fill="#7b4a2c" stroke="#c49a5a" strokeWidth="1.5" />
            <ellipse cx="12" cy="16" rx="6" ry="7.5" fill="#c99b72" />
            <path d="M5 14 Q 12 2, 19 14 L 19 26 Q 12 22, 5 26 Z" fill="#8a2f2a" opacity="0.85" />
            <ellipse cx="12" cy="16" rx="5" ry="6.2" fill="#d8ab80" />
            <g className="mg-nahargarh-hide-seek-eyes">
              <ellipse cx="9.6" cy="15.4" rx="1.3" ry="0.8" fill="#f4ead8" />
              <ellipse cx="14.4" cy="15.4" rx="1.3" ry="0.8" fill="#f4ead8" />
              <circle className="mg-nahargarh-hide-seek-pupil" cx="9.6" cy="15.4" r="0.6" fill="#2a211c" />
              <circle className="mg-nahargarh-hide-seek-pupil" cx="14.4" cy="15.4" r="0.6" fill="#2a211c" />
            </g>
            <path d="M10.6 19.4 Q 12 20.2, 13.4 19.4" fill="none" stroke="#8a3a2a" strokeWidth="0.7" />
          </svg>
        </span>
      );
  }
}

function HideSeekField({ setup, view, live, search, active, frames, cast, names, art, seed, still, sound, vibrate }: SearchFieldProps<HideSeekParams, HideSeekOutcome>) {
  const kit = useMiniGameKit();
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const face = useRef<HTMLSpanElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const doors = useRef<(HTMLButtonElement | null)[]>([]);
  const [more, setMore] = useState({ left: false, right: true });
  const [echo, setEcho] = useState<number | null>(null);
  const [giggle, setGiggle] = useState<{ at: number; where: "door" | "left" | "right" } | null>(null);
  const play = useRef({ sound, vibrate });
  play.current = { sound, vibrate };
  const target = setup.rounds[0].targets[0];
  const events = useMemo(() => hideSeekRoomEvents(seed, target), [seed, target]);
  const peeking = view.ending?.kind === "idle" || view.ending?.kind === "timeout";

  // A door opened: its creak (an empty room's lower, and the room's own sound), the corridor brought to it (おまかせ opens
  // doors out of view); hers, the find: a short stop on her door, then a ring and stars at her face.
  const opened = view.searched.length;
  useEffect(() => {
    if (!opened) return;
    const door = view.searched[opened - 1];
    if (door === target) {
      play.current.sound(SOUNDS.creak);
      play.current.vibrate("hit");
      kitRef.current.juice.hitStop(FOUND_STOP_MS, doors.current[door]);
      kitRef.current.juice.burst(face.current, "ring", 1.2);
      kitRef.current.juice.burst(face.current, "star");
    } else {
      play.current.sound(SOUNDS.creak, { rate: EMPTY_CREAK_RATE });
      if (events[door] === "pigeon") play.current.sound(SOUNDS.pigeon);
    }
    // The corridor only (scrollIntoView would scroll the scene under the play too).
    const box = scroller.current;
    const bay = doors.current[door];
    if (box && bay && (bay.offsetLeft < box.scrollLeft || bay.offsetLeft + bay.offsetWidth > box.scrollLeft + box.clientWidth))
      box.scrollTo({ left: bay.offsetLeft + bay.offsetWidth / 2 - box.clientWidth / 2, behavior: still ? "auto" : "smooth" });
  }, [opened]); // each newly opened door once
  // A call: its echo from every door for a moment, and three soft taps for its sound (timed on the play's clock, so a
  // paused play holds them).
  useEffect(() => {
    const last = view.last;
    const call = last && "button" in last.action ? last.at : null;
    let taps = 0;
    return frames((ms) => {
      const showing = call !== null && ms - call < ECHO_MS ? call : null;
      setEcho((current) => (current === showing ? current : showing));
      while (call !== null && taps < CALL_TAP_MS.length && ms - call >= CALL_TAP_MS[taps]) {
        play.current.sound(SOUNDS.call, { volume: CALL_TAP_VOLUME[taps] });
        taps += 1;
      }
    });
  }, [frames, view.last]);
  // A hint: the giggle at her door, or at the corridor's edge on her side when her door is out of view; her teasing face
  // in the band (no words: the giggle is hers).
  useEffect(() => {
    const at = view.nudge;
    if (at === null) return undefined;
    kitRef.current.react("tease");
    const box = scroller.current?.getBoundingClientRect();
    const door = doors.current[target]?.getBoundingClientRect();
    const where = !box || !door || (door.right > box.left + 8 && door.left < box.right - 8) ? "door" : door.left >= box.right - 8 ? "right" : "left";
    setGiggle({ at, where });
    return frames((ms) => { if (ms - at >= GIGGLE_MS) setGiggle((current) => (current?.at === at ? null : current)); });
  }, [frames, view.nudge, target]);
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
      data-more-right={more.right || undefined}>
      <div className="mg-nahargarh-hide-seek-corridor" ref={scroller} onScroll={onScroll} onPointerDown={active}>
        <div className="mg-nahargarh-hide-seek-row">
          {Array.from({ length: HIDE_SEEK_DOORS }, (_, door) => {
            const open = view.searched.includes(door);
            const hers = door === target;
            const event = events[door];
            return (
              <button key={door} type="button" ref={(element) => { doors.current[door] = element; }} className="mg-nahargarh-hide-seek-bay"
                data-testid={`minigame-spot-${door}`} data-open={open || undefined}
                data-hers={(open && hers) || undefined} aria-disabled={!live || open || undefined}
                aria-label={`扉${door + 1}${open && hers ? "：見つけた" : open ? "：空っぽの部屋" : ""}`}
                onClick={(event) => {
                  if (live && !open) search(door);
                  // An open door has nothing more behind it: a small refusal, never a dead tap.
                  else if (live) kit.juice.denied(event.currentTarget);
                }}>
                {art.bay && <span className="mg-nahargarh-hide-seek-bay-photo" aria-hidden="true"><img className="mg-photo" src={art.bay} alt="" draggable={false} /></span>}
                <span className="mg-nahargarh-hide-seek-door mg-play-object" aria-hidden="true">
                  <span className="mg-nahargarh-hide-seek-room">
                    {art.room && <img className="mg-nahargarh-hide-seek-room-photo mg-photo" src={art.room} alt="" draggable={false} />}
                    {open && hers && <span className="mg-nahargarh-hide-seek-her">{cast.heroine}<span className="mg-nahargarh-hide-seek-face" ref={face} /></span>}
                    {open && !hers && event && <RoomEvent kind={event} />}
                  </span>
                  <span className="mg-nahargarh-hide-seek-leaf mg-nahargarh-hide-seek-leaf-left">
                    <span className="mg-nahargarh-hide-seek-handle" key={hers ? giggle?.at : undefined} data-nudge={(hers && giggle) || undefined} />
                  </span>
                  <span className="mg-nahargarh-hide-seek-leaf mg-nahargarh-hide-seek-leaf-right">
                    <span className="mg-nahargarh-hide-seek-handle" key={hers ? giggle?.at : undefined} data-nudge={(hers && giggle) || undefined} />
                  </span>
                </span>
                {echo !== null && (
                  <span key={echo} className="mg-nahargarh-hide-seek-echo" data-hers={hers || undefined} aria-hidden="true"
                    style={{ animationDelay: `${(door % 5) * 70 + (hers ? HER_ECHO_DELAY_MS : 0)}ms` }}>
                    <span>{names.heroine}……</span>
                    {/* Her own voice, under the echo of her name: the ear can tell which door. */}
                    {hers && <span className="mg-nahargarh-hide-seek-giggle-line">ふふっ</span>}
                  </span>
                )}
                {hers && giggle?.where === "door" && <span key={giggle.at} className="mg-nahargarh-hide-seek-giggle" aria-hidden="true">くすっ</span>}
              </button>
            );
          })}
        </div>
      </div>
      <span className="mg-nahargarh-hide-seek-fade mg-nahargarh-hide-seek-fade-left" aria-hidden="true">
        {giggle?.where === "left" && <span key={giggle.at} className="mg-nahargarh-hide-seek-giggle">くすっ</span>}
      </span>
      <span className="mg-nahargarh-hide-seek-fade mg-nahargarh-hide-seek-fade-right" aria-hidden="true">
        {giggle?.where === "right" && <span key={giggle.at} className="mg-nahargarh-hide-seek-giggle">くすっ</span>}
        <span className="mg-nahargarh-hide-seek-chevron">›</span>
      </span>
      {peeking && (
        <span className="mg-nahargarh-hide-seek-peek" aria-hidden="true">
          <span className="mg-nahargarh-hide-seek-peek-her">{art.peek ? <img src={art.peek} alt="" draggable={false} /> : cast.heroine}</span>
          <span className="mg-nahargarh-hide-seek-peek-corner" />
        </span>
      )}
    </div>
  );
}

/** The hide-and-seek as a search skin for a tuning (Debug's room retunes it): its game, rules, words and field. */
export const hideSeekSkinFor = (tuning: HideSeekTuning): SearchSkin<HideSeekParams, HideSeekOutcome> => ({
  game: hideSeekGameFor(tuning),
  rules: hideSeekRulesFor(tuning),
  hintJa: "扉を押して開ける。廊下は横に続いている",
  buttons: [{ id: "call", labelJa: "名前を呼ぶ", hintJa: "廊下に向かって、彼女の名前を呼びます。こだまの中に、返事がまじるかもしれません。", tone: "secondary" }],
  autoJa: "おまかせで探しています",
  // Her in the open door, the last echo, or her peeking from the corner, before the outcome shows.
  endDelayMs: (ending, still) => (still ? 700 : ending.kind === "found" ? 1400 : ending.kind === "button" ? 1300 : 1500),
  statusJa: (view) => status(view),
  nudgeMs: tuning.hintMs,
  Field: HideSeekField,
});
export const hideSeekSkin = hideSeekSkinFor(HIDE_SEEK_TUNING);
