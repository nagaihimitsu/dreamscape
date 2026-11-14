import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { SearchFieldProps, SearchSkin, SearchView } from "../engines/search/EnginePlay";
import { useMiniGameKit } from "../host/kit";
import { seededRandom } from "../host/seed";
import {
  HIDE_SEEK_DOORS, HIDE_SEEK_TUNING, hideSeekGameFor, hideSeekPeek, hideSeekRulesFor, type HideSeekOutcome, type HideSeekParams, type HideSeekTuning,
} from "./rules";
import "./skin.css";

// The hide-and-seek's field (a search skin): a stretch of the palace corridor, a row of identical arched doors on one wall
// that runs on past the screen's edge (it scrolls), under the ceiling's beams and the wall lamps' light. She plays too
// (round 3, 2026-11-14; the character bible: playful, and 「見つけてもらうのが楽しい」):
// - She peeks out of her door now and then (fingers round its edge), ducks back and leaves it ajar a while (a line of
//   light); with her door out of view, 「ちらっ」 at the corridor's edge on her side and its chevron pulses; a small squeak.
// - An opened empty room has something small going on in it (the painted lady's eyes, the curtain, the pigeon, the dust,
//   footprints in the dust: from the seed which, never where): near her door (warm) it leans toward her, farther (cold) it
//   is quiet and leans nowhere; the room next to hers, a muffled 「っ！」 through the wall and her door's handles jump. The
//   door's name says it too (for a screen reader).
// - 「名前を呼ぶ」 sends her name back from every door, and from hers her giggle, louder the second time (her handles shake);
//   with her door out of view, the giggle comes from the corridor's edge on her side. The third call ends the play: before
//   it, the button says 「最後に呼ぶ」 and the band 「次で出てくる」.
// - Before any door or call, a muffled 「……まだかな」 from her side; doing nothing at all ends with her peeking from the
//   corner. After a door or a call, doing nothing brings a hint: a giggle, her door's handles move, her face in the band.
// Finding her is the play's climax: a short stop, the creak and a success chime after it, a buzz, her door's leaves swing
// past open and back, her surprised face (react: in the band and at the door), a large ring and stars at her face. No
// names on the doors. With the use's art (`art.bay`, `art.room`, `art.peek`), those pictures in place of the drawn wall
// and doorway (the photos as the back layer, `mg-photo`; its leaves still drawn over it and opened, `mg-play-object`),
// room and her standing picture.

/** How long a call's echo shows over the doors. */
const ECHO_MS = 1400;
/** Her door's echo comes this much after the others, with her giggle (the clue). */
const HER_ECHO_DELAY_MS = 120;
/** How long a hint's giggle (and her 「まだかな」, a peek's 「ちらっ」, a gasp next door) shows. */
const GIGGLE_MS = 1400;
/** A call's sound until an echo sound exists: three soft taps this far apart, fading like an echo (a share of the volume). */
const CALL_TAP_MS = [0, 120, 240];
const CALL_TAP_VOLUME = [0.6, 0.35, 0.2];
/** An empty room's creak, lower and longer than her door's (its playback rate). */
const EMPTY_CREAK_RATE = 0.85;
/** Her door opening a crack as she peeks: a small, high squeak. */
const PEEK_CREAK = { volume: 0.3, rate: 1.45 } as const;
/** The stop as her door opens (ms). */
const FOUND_STOP_MS = 90;
/** The success chime about 140 ms after her door's creak (on the play's clock, which the stop holds first). */
const FOUND_CHIME_AFTER_MS = 140 - FOUND_STOP_MS;
const FOUND_CHIME_VOLUME = 0.7;
/** The find's ring and stars, larger than a hit's (over the room's photo). */
const FOUND_BURST_SIZE = 1.5;
const SOUNDS = { creak: "door_creak", call: "ui_tap", pigeon: "pigeon_flutter", chime: "quiz_correct" } as const;
/** Her giggle in a call's echo, louder the second time (the third call brings her out). */
const CALL_GIGGLE_JA = ["ふふっ", "くすくす"] as const;
const ASK_JA = "……まだかな";
const PEEK_JA = "ちらっ";
const GASP_JA = "っ！";

/** Where her door is against the corridor's view: in it (its middle shows), or out of it on the left or the right. */
type Side = "door" | "left" | "right";

/** What goes on in an empty room as its door opens (looks only; the seed deals them out to the empty doors). */
export type HideSeekRoomEvent = "dust" | "pigeon" | "curtain" | "steps" | "portrait";
export const HIDE_SEEK_ROOM_EVENTS: readonly HideSeekRoomEvent[] = ["dust", "pigeon", "curtain", "steps", "portrait"];

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

/**
 * Which way an empty room leans: toward her door (the doors count up to the right) when it is within `warm` doors of hers,
 * nowhere (null) farther; and whether it is next to hers.
 */
export function hideSeekLean(door: number, target: number, warm = HIDE_SEEK_TUNING.warmDoors): { toward: "left" | "right" | null; next: boolean } {
  const away = Math.abs(target - door);
  return { toward: away > warm ? null : target > door ? "right" : "left", next: away === 1 };
}

/** What an opened empty room says, for its door's name (the same lean the picture shows; a cold room is quiet). */
export function hideSeekRoomJa(event: HideSeekRoomEvent, door: number, target: number, warm = HIDE_SEEK_TUNING.warmDoors): string {
  const { toward, next } = hideSeekLean(door, target, warm);
  if (!toward) return "しんとしている";
  const side = toward === "right" ? "右" : "左";
  if (next) return `${side}の壁の向こうで、小さな声がした`;
  switch (event) {
    case "dust": return `ほこりが${side}へ流れた`;
    case "pigeon": return `鳩が${side}へ飛んでいった`;
    case "curtain": return `布が${side}へなびいた`;
    case "steps": return `足あとが${side}へ続いている`;
    case "portrait": return `絵の目が${side}を見ている`;
  }
}

/** Whether the next call is the one that brings her out (the play's end). */
const lastCallNext = (view: SearchView, calls: number) => (view.presses.call ?? 0) === calls - 1;

/** The top band: what the player has done (nothing yet: empty), and a warning before the call that brings her out. */
function status(view: SearchView, calls: number): string {
  const opened = view.searched.length;
  const called = view.presses.call ?? 0;
  const callsJa = called ? `呼んだ ${called}回${lastCallNext(view, calls) ? "（次で出てくる）" : ""}` : "";
  return [opened ? `開けた扉 ${opened}` : "", callsJa].filter(Boolean).join("・");
}

/** What happens in an empty room (drawn over the room's picture, inside the doorway), leaning toward her door or nowhere. */
function RoomEvent({ kind, toward: leaning }: { kind: HideSeekRoomEvent; toward: "left" | "right" | null }) {
  const toward = leaning ?? "none";
  const lean = { "--toward": leaning === "right" ? 1 : leaning === "left" ? -1 : 0 } as CSSProperties;
  switch (kind) {
    case "dust":
      // Dust lifts in the window's light, drifting toward her door (the draught from it).
      return <span className="mg-nahargarh-hide-seek-event" data-event="dust" data-toward={toward} style={lean}>{[0, 1, 2].map((mote) => <i key={mote} />)}</span>;
    case "pigeon":
      // A pigeon startled off the floor, away toward her side.
      return (
        <span className="mg-nahargarh-hide-seek-event" data-event="pigeon" data-toward={toward} style={lean}>
          <svg viewBox="0 0 32 20" aria-hidden="true" focusable="false">
            <path d="M2 12 Q 9 2, 16 9 Q 22 1, 30 6 Q 23 9, 20 13 Q 15 18, 8 15 Z" fill="#6f7680" stroke="#2a211c" strokeWidth="1" />
            <circle cx="24" cy="7" r="1.1" fill="#2a211c" />
          </svg>
        </span>
      );
    case "curtain":
      // A thin cloth hung in the inner doorway, blown toward her side.
      return <span className="mg-nahargarh-hide-seek-event" data-event="curtain" data-toward={toward} style={lean}><i /></span>;
    case "steps":
      // Small footprints in the dust, going toward her side.
      return (
        <span className="mg-nahargarh-hide-seek-event" data-event="steps" data-toward={toward} style={lean}>
          <svg viewBox="0 0 40 20" aria-hidden="true" focusable="false">
            {/* Going toward her side; in a cold room, across to the window and back (nowhere). */}
            <g transform={toward === "left" ? "translate(40 0) scale(-1 1)" : undefined} fill="rgba(60, 42, 26, 0.75)">
              {(toward === "none" ? [[14, 15], [18, 9], [22, 4], [26, 9], [30, 15]] : [[4, 13], [12, 7], [20, 13], [28, 7], [36, 13]])
                .map(([x, y]) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="3" ry="1.7" />)}
            </g>
          </svg>
        </span>
      );
    case "portrait":
      // A painted lady in a niche on the far wall; her eyes turn toward the wall on her side.
      return (
        <span className="mg-nahargarh-hide-seek-event" data-event="portrait" data-toward={toward} style={lean}>
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

const hideSeekFieldFor = (tuning: HideSeekTuning) => function HideSeekField({ setup, view, live, search, active, frames, cast, names, art, seed, still, sound, vibrate }: SearchFieldProps<HideSeekParams, HideSeekOutcome>) {
  const kit = useMiniGameKit();
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const face = useRef<HTMLSpanElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const doors = useRef<(HTMLButtonElement | null)[]>([]);
  const [more, setMore] = useState({ left: false, right: true });
  const [echo, setEcho] = useState<{ at: number; where: Side; call: number } | null>(null);
  /** A moment of hers by her door, or at the corridor's edge on her side: a giggle, her 「まだかな」, a peek. */
  const [voice, setVoice] = useState<{ at: number; where: Side; textJa: string; kind: "giggle" | "ask" | "peek" } | null>(null);
  /** Her gasp through the wall of the room next to hers, just opened (its own moment: it may come with a peek). */
  const [gasp, setGasp] = useState<number | null>(null);
  const play = useRef({ sound, vibrate });
  play.current = { sound, vibrate };
  const latestView = useRef(view);
  latestView.current = view;
  const target = setup.rounds[0].targets[0];
  const events = useMemo(() => hideSeekRoomEvents(seed, target), [seed, target]);
  const peeking = view.ending?.kind === "idle" || view.ending?.kind === "timeout";
  /** Her door against the corridor's view now (its middle in view, or out on a side). */
  const sideOfHer = (): Side => {
    const box = scroller.current?.getBoundingClientRect();
    const door = doors.current[target]?.getBoundingClientRect();
    if (!box || !door) return "door";
    const middle = (door.left + door.right) / 2;
    return middle < box.left + 16 ? "left" : middle > box.right - 16 ? "right" : "door";
  };
  const sideRef = useRef(sideOfHer);
  sideRef.current = sideOfHer;
  const say = (kind: "giggle" | "ask" | "peek", textJa: string, at: number) => setVoice({ at, where: sideRef.current(), textJa, kind });
  // The find's moment on the play's clock (her door the latest action), for its chime.
  const foundAt = view.last && "spot" in view.last.action && view.last.action.spot === target ? view.last.at : null;

  // A door opened: its creak (an empty room's lower, and the room's own sound), the corridor brought to it (おまかせ opens
  // doors out of view); hers, the find: a short stop on her door, then a ring and stars at her face; the room next to
  // hers, her gasp through the wall and her handles.
  const opened = view.searched.length;
  useEffect(() => {
    if (!opened) return;
    const door = view.searched[opened - 1];
    if (door === target) {
      play.current.sound(SOUNDS.creak);
      play.current.vibrate("success");
      kitRef.current.juice.hitStop(FOUND_STOP_MS, doors.current[door]);
      kitRef.current.juice.burst(face.current, "ring", FOUND_BURST_SIZE);
      kitRef.current.juice.burst(face.current, "star", FOUND_BURST_SIZE);
      kitRef.current.react("surprise");
    } else {
      play.current.sound(SOUNDS.creak, { rate: EMPTY_CREAK_RATE });
      if (events[door] === "pigeon") play.current.sound(SOUNDS.pigeon);
      if (hideSeekLean(door, target, tuning.warmDoors).next && view.last) setGasp(view.last.at);
    }
    // The corridor only (scrollIntoView would scroll the scene under the play too).
    const box = scroller.current;
    const bay = doors.current[door];
    if (box && bay && (bay.offsetLeft < box.scrollLeft || bay.offsetLeft + bay.offsetWidth > box.scrollLeft + box.clientWidth))
      box.scrollTo({ left: bay.offsetLeft + bay.offsetWidth / 2 - box.clientWidth / 2, behavior: still ? "auto" : "smooth" });
  }, [opened]); // each newly opened door once
  // The find's chime, just after her door's creak.
  useEffect(() => {
    if (foundAt === null) return undefined;
    let rung = false;
    return frames((ms) => {
      if (rung || ms - foundAt < FOUND_CHIME_AFTER_MS) return;
      rung = true;
      play.current.sound(SOUNDS.chime, { volume: FOUND_CHIME_VOLUME });
    });
  }, [frames, foundAt]);
  // A call: its echo from every door for a moment (her giggle at the corridor's edge when her door is out of view), and
  // three soft taps for its sound (timed on the play's clock, so a paused play holds them).
  useEffect(() => {
    const last = view.last;
    const call = last && "button" in last.action ? last.at : null;
    const where = call === null ? "door" : sideOfHer();
    const count = view.presses.call ?? 0;
    let taps = 0;
    return frames((ms) => {
      const showing = call !== null && ms - call < ECHO_MS ? { at: call, where, call: count } : null;
      setEcho((current) => (current?.at === showing?.at ? current : showing));
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
    say("giggle", "くすっ", at);
    return undefined;
  }, [view.nudge, target]);
  // Her moments on the play's clock: she peeks out of her door and ducks back (the door ajar a while), until she is found
  // or the play is over; before any door or call, her 「まだかな」. Her door's state is written on it (data-peek), not
  // drawn by React (it changes on the clock).
  useEffect(() => {
    let shown: string | null = null;
    let asked = false;
    return frames((ms) => {
      const now = latestView.current;
      const door = doors.current[target];
      const open = now.searched.includes(target);
      const state = now.ending || open ? null : hideSeekPeek(ms, tuning);
      if (door && state !== shown) {
        if (state) door.setAttribute("data-peek", state);
        else door.removeAttribute("data-peek");
        if (state === "peek") {
          play.current.sound(SOUNDS.creak, PEEK_CREAK);
          say("peek", PEEK_JA, ms);
        }
        shown = state;
      }
      const acted = now.searched.length > 0 || (now.presses.call ?? 0) > 0;
      if (!asked && !acted && !now.ending && ms >= tuning.askMs) {
        asked = true;
        say("ask", ASK_JA, ms);
      }
      setVoice((current) => (current && ms - current.at >= GIGGLE_MS ? null : current));
      setGasp((current) => (current !== null && ms - current >= GIGGLE_MS ? null : current));
    });
  }, [frames, target]);
  const onScroll = () => {
    active();
    const box = scroller.current;
    if (!box) return;
    const left = box.scrollLeft > 4;
    const right = box.scrollLeft + box.clientWidth < box.scrollWidth - 4;
    setMore((current) => (current.left === left && current.right === right ? current : { left, right }));
  };
  // Her door's handles jump at a gasp next door, a giggle and her second call's giggle.
  const handlesAt = gasp ?? (voice?.kind === "giggle" ? voice.at : echo && echo.call >= 2 ? echo.at : undefined);
  /** Her moment at the edge on her side (her door out of view), or by her door. */
  const edgeVoice = (side: "left" | "right") => voice?.where === side && (
    <span key={voice.at} className="mg-nahargarh-hide-seek-giggle" data-kind={voice.kind}>{voice.textJa}</span>
  );

  return (
    <div className="mg-nahargarh-hide-seek" data-art-bay={art.bay ? true : undefined} data-more-left={more.left || undefined}
      data-more-right={more.right || undefined}
      data-echo-side={(echo && echo.where !== "door" ? echo.where : undefined) ?? (voice && voice.kind === "peek" && voice.where !== "door" ? voice.where : undefined)}>
      <div className="mg-nahargarh-hide-seek-corridor" ref={scroller} onScroll={onScroll} onPointerDown={active}>
        <div className="mg-nahargarh-hide-seek-row">
          {Array.from({ length: HIDE_SEEK_DOORS }, (_, door) => {
            const open = view.searched.includes(door);
            const hers = door === target;
            const event = events[door];
            const lean = hideSeekLean(door, target, tuning.warmDoors);
            const label = `扉${door + 1}${open && hers ? "：見つけた" : open && event ? `：空っぽの部屋。${hideSeekRoomJa(event, door, target, tuning.warmDoors)}` : ""}`;
            return (
              <button key={door} type="button" ref={(element) => { doors.current[door] = element; }} className="mg-nahargarh-hide-seek-bay"
                data-testid={`minigame-spot-${door}`} data-open={open || undefined}
                data-hers={(open && hers) || undefined} aria-disabled={!live || open || undefined} aria-label={label}
                onClick={(click) => {
                  if (live && !open) search(door);
                  // An open door has nothing more behind it: a small refusal, never a dead tap.
                  else if (live) kit.juice.denied(click.currentTarget);
                }}>
                {art.bay && <span className="mg-nahargarh-hide-seek-bay-photo" aria-hidden="true"><img className="mg-photo" src={art.bay} alt="" draggable={false} /></span>}
                <span className="mg-nahargarh-hide-seek-door mg-play-object" aria-hidden="true">
                  <span className="mg-nahargarh-hide-seek-room">
                    {art.room && <img className="mg-nahargarh-hide-seek-room-photo mg-photo" src={art.room} alt="" draggable={false} />}
                    {open && hers && <span className="mg-nahargarh-hide-seek-her">{cast.heroine}<span className="mg-nahargarh-hide-seek-face" ref={face} /></span>}
                    {open && !hers && event && <RoomEvent kind={event} toward={lean.toward} />}
                  </span>
                  <span className="mg-nahargarh-hide-seek-leaf mg-nahargarh-hide-seek-leaf-left">
                    <span className="mg-nahargarh-hide-seek-handle" key={hers ? handlesAt : undefined} data-nudge={(hers && handlesAt !== undefined) || undefined} />
                  </span>
                  <span className="mg-nahargarh-hide-seek-leaf mg-nahargarh-hide-seek-leaf-right">
                    <span className="mg-nahargarh-hide-seek-handle" key={hers ? handlesAt : undefined} data-nudge={(hers && handlesAt !== undefined) || undefined} />
                  </span>
                  {/* Her fingers round the right leaf's edge as she peeks (shown by the door's data-peek). */}
                  {hers && !open && <span className="mg-nahargarh-hide-seek-fingers">{[0, 1, 2, 3].map((finger) => <i key={finger} />)}</span>}
                </span>
                {/* The room next to hers: her gasp through the wall on her side. */}
                {open && !hers && lean.next && gasp !== null && view.searched[view.searched.length - 1] === door && (
                  <span key={gasp} className="mg-nahargarh-hide-seek-gasp" data-toward={lean.toward ?? undefined} aria-hidden="true">{GASP_JA}</span>
                )}
                {echo !== null && (
                  <span key={echo.at} className="mg-nahargarh-hide-seek-echo" data-hers={hers || undefined} aria-hidden="true"
                    style={{ animationDelay: `${(door % 5) * 70 + (hers ? HER_ECHO_DELAY_MS : 0)}ms` }}>
                    <span>{names.heroine}……</span>
                    {/* Her own voice, under the echo of her name: the ear can tell which door (louder the second time). */}
                    {hers && <span className="mg-nahargarh-hide-seek-giggle-line" data-call={echo.call}>{CALL_GIGGLE_JA[Math.min(echo.call, 2) - 1] ?? CALL_GIGGLE_JA[0]}</span>}
                  </span>
                )}
                {hers && voice?.where === "door" && (
                  <span key={voice.at} className="mg-nahargarh-hide-seek-giggle" data-kind={voice.kind} aria-hidden="true">{voice.textJa}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {/* The corridor's edges: her moment (a giggle, 「まだかな」, a peek's 「ちらっ」, a gasp) or a call's giggle on her side
          when her door is out of view (her side's chevron pulses with a call's and a peek's). */}
      <span className="mg-nahargarh-hide-seek-fade mg-nahargarh-hide-seek-fade-left" aria-hidden="true">
        {edgeVoice("left")}
        {echo?.where === "left" && <span key={`echo-${echo.at}`} className="mg-nahargarh-hide-seek-giggle" data-echo>……{CALL_GIGGLE_JA[Math.min(echo.call, 2) - 1] ?? CALL_GIGGLE_JA[0]}</span>}
        <span className="mg-nahargarh-hide-seek-chevron" key={`chevron-${echo?.where === "left" ? echo.at : voice?.where === "left" ? voice.at : ""}`}>‹</span>
      </span>
      <span className="mg-nahargarh-hide-seek-fade mg-nahargarh-hide-seek-fade-right" aria-hidden="true">
        {edgeVoice("right")}
        {echo?.where === "right" && <span key={`echo-${echo.at}`} className="mg-nahargarh-hide-seek-giggle" data-echo>……{CALL_GIGGLE_JA[Math.min(echo.call, 2) - 1] ?? CALL_GIGGLE_JA[0]}</span>}
        <span className="mg-nahargarh-hide-seek-chevron" key={`chevron-${echo?.where === "right" ? echo.at : voice?.where === "right" ? voice.at : ""}`}>›</span>
      </span>
      {peeking && (
        <span className="mg-nahargarh-hide-seek-peek" aria-hidden="true">
          <span className="mg-nahargarh-hide-seek-peek-her">{art.peek ? <img src={art.peek} alt="" draggable={false} /> : cast.heroine}</span>
          <span className="mg-nahargarh-hide-seek-peek-corner" />
        </span>
      )}
    </div>
  );
};

/** The hide-and-seek as a search skin for a tuning (Debug's room retunes it): its game, rules, words and field. */
export const hideSeekSkinFor = (tuning: HideSeekTuning): SearchSkin<HideSeekParams, HideSeekOutcome> => ({
  game: hideSeekGameFor(tuning),
  rules: hideSeekRulesFor(tuning),
  hintJa: "扉を押して開ける。廊下は横に続いている",
  buttons: [{
    id: "call", labelJa: (view) => (lastCallNext(view, tuning.calls) ? "最後に呼ぶ" : "名前を呼ぶ"), tone: "secondary",
    hintJa: `廊下に向かって、彼女の名前を呼びます。こだまの中に、返事がまじるかもしれません。${tuning.calls}回目で、彼女が出てきます。`,
  }],
  autoJa: "おまかせで探しています",
  // Her in the open door, the last echo, or her peeking from the corner, before the outcome shows.
  endDelayMs: (ending, still) => (still ? 700 : ending.kind === "found" ? 1400 : ending.kind === "button" ? 1300 : 1500),
  statusJa: (view) => status(view, tuning.calls),
  nudgeMs: tuning.hintMs,
  Field: hideSeekFieldFor(tuning),
});
export const hideSeekSkin = hideSeekSkinFor(HIDE_SEEK_TUNING);
