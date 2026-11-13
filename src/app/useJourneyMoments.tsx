import { useEffect, useMemo, useRef, useState } from "react";
import { focusSceneHeading } from "../components/scene-focus";
import type { GameState } from "../domain/game";
import { ChapterStamp, EndRollDialog, EpisodeTitle, PackingScene, ResumeRecapCard } from "../features/journey/JourneyMoments";
import {
  chapterStampOf, completedEpisodeId, endRollOf, episodeTitleCard, journeyEnded, openingEpisodeId, packingOf, resumeRecap, type Packing,
} from "../features/journey/journey-moments";

/** The screens a resumed game shows its recap on: free time and the night screen (GameApp's screen keys). */
const RECAP_SCREENS = /^(free|night):/u;
/** The screen a completed episode's stamp waits behind: its battle's result (GameApp's screen key), whatever comes after it is where it lands. */
const STAMP_WAITS_ON = /^battle:/u;

/**
 * The journey's moments on screen (2026-11-11 user decision; rules in journey-moments.ts): what each saved change starts
 * (GameApp's commit listener calls `committed`) and the recap of a resumed game. In this tab's memory only, so a reload
 * never brings one back (no save format change for them):
 * - the title card of an episode whose first part began, after any ride's or night's art (`effectPlaying`) and the packing;
 *   while it waits a hidden mark keeps the scene from reading on (`data-obstructs-dialogue`);
 * - the stamp 「完」 of an episode completed (2026-11-13), once its battle's result has given way to the next screen and no
 *   ride's or night's art, packing or title card covers it; it takes nothing, and one covered after it began is not replayed;
 * - the packing of a departure, which GameApp shows in place of the screen (the next city's arrival waits for it);
 * - the credit roll when the journey ended (and again from 旅の記録: `openEndRoll`);
 * - the recap card, armed when the game opens on a save (`resumed`: not a new game, not Debug) or by `restart(true)` after
 *   「ロード」, shown when that screen is free time or the night screen (`screen`, GameApp's screen key) until 「閉じる」 or
 *   another screen.
 */
export function useJourneyMoments({ game, screen, resumed, reduceMotion, effectPlaying }: {
  game: GameState | null;
  screen: string;
  resumed: boolean;
  reduceMotion: boolean;
  effectPlaying: boolean;
}) {
  const [titleId, setTitleId] = useState<string | null>(null);
  const [packing, setPacking] = useState<Packing | null>(null);
  const [endRoll, setEndRoll] = useState(false);
  const [recapScreen, setRecapScreen] = useState<string | null>(null);
  const recapArmed = useRef(resumed);
  const [stampId, setStampId] = useState<string | null>(null);
  // The stamp on screen has begun (ChapterStamp's onStart): covered from then on, it is put away, not played again.
  const stampStarted = useRef(false);
  // After each render: an armed recap takes the screen now on show when it is free time or the night screen (a story scene,
  // a battle or the observation a save brings back is its own reminder, and the card would lie over its picture); a recap
  // whose screen has gone is put away.
  useEffect(() => {
    if (recapArmed.current) {
      if (!game) return;
      recapArmed.current = false;
      if (RECAP_SCREENS.test(screen)) setRecapScreen(screen);
    } else if (recapScreen !== null && recapScreen !== screen) setRecapScreen(null);
  });
  const recap = useMemo(() => (game && recapScreen !== null && recapScreen === screen ? resumeRecap(game) : null), [game, recapScreen, screen]);
  const roll = useMemo(() => (endRoll && game ? endRollOf(game) : null), [endRoll, game]);

  /** A saved change (previous → next): the moments it starts. */
  function committed(previous: GameState, next: GameState) {
    const opening = openingEpisodeId(previous, next);
    if (opening) setTitleId(opening);
    const packed = packingOf(previous, next);
    if (packed) setPacking(packed);
    if (journeyEnded(previous, next)) setEndRoll(true);
    const completed = completedEpisodeId(previous, next);
    if (completed) {
      stampStarted.current = false;
      setStampId(completed);
    }
  }
  /** A load, a new game or Debug's return: what waited belonged to the play before. `resume`: a load, whose recap follows. */
  function restart(resume: boolean) {
    setTitleId(null);
    setPacking(null);
    setEndRoll(false);
    setRecapScreen(null);
    recapArmed.current = resume;
    setStampId(null);
    stampStarted.current = false;
  }
  function endStamp() {
    stampStarted.current = false;
    setStampId(null);
  }
  function closeEndRoll() {
    setEndRoll(false);
    // The dialog's opener (the epilogue's last line) is gone: a lost focus goes to the screen's heading.
    window.requestAnimationFrame(() => focusSceneHeading(document.getElementById("main")));
  }
  const titleCard = titleId && game ? episodeTitleCard(game, titleId) : null;
  const titleWaits = !!titleCard && (effectPlaying || !!packing);
  const endRollShown = !!roll && !effectPlaying && !packing;
  const stamp = stampId && game ? chapterStampOf(game, stampId) : null;
  const stampShown = !!stamp && !STAMP_WAITS_ON.test(screen) && !effectPlaying && !packing && !titleCard && !endRollShown;
  // A stamp that has begun and is then covered (a ride the player started through it, the next episode's title card) is put away.
  useEffect(() => {
    if (stampId !== null && !stampShown && stampStarted.current) endStamp();
  });
  return {
    committed,
    restart,
    openEndRoll: () => setEndRoll(true),
    /** The credit roll is on screen (its music plays: src/audio/scene-music.ts). */
    endRollShown,
    /** The title card waits or shows: a battle's name plate (`# cutin: name`) waits for it (BattleScreen's introHeld). */
    titleHolding: !!titleCard,
    /** The packing, shown in place of the screen (null when none). */
    packingScene: packing && <PackingScene packing={packing} reduceMotion={reduceMotion} onEnd={() => setPacking(null)} />,
    /** The recap card, at the top of <main> (null when none). */
    recapCard: recap && <ResumeRecapCard recap={recap} onClose={() => setRecapScreen(null)} />,
    /** The title card (or its waiting mark), the stamp and the credit roll, after the screens. */
    overlays: <>
      {titleCard && (titleWaits ? <span hidden data-obstructs-dialogue="" />
        : <EpisodeTitle key={titleCard.episodeId} card={titleCard} reduceMotion={reduceMotion} onEnd={() => setTitleId(null)} />)}
      {stamp && stampShown && <ChapterStamp key={stamp.episodeId} stamp={stamp} reduceMotion={reduceMotion}
        onStart={() => { stampStarted.current = true; }} onEnd={endStamp} />}
      {roll && endRollShown && <EndRollDialog roll={roll} reduceMotion={reduceMotion} onClose={closeEndRoll} />}
    </>,
  };
}
