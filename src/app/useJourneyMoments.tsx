import { useEffect, useMemo, useRef, useState } from "react";
import { focusSceneHeading } from "../components/scene-focus";
import type { GameState } from "../domain/game";
import { EndRollDialog, EpisodeTitle, PackingScene, ResumeRecapCard } from "../features/journey/JourneyMoments";
import {
  endRollOf, episodeTitleCard, journeyEnded, openingEpisodeId, packingOf, resumeRecap, type Packing,
} from "../features/journey/journey-moments";

/** The screens a resumed game shows its recap on: free time and the night screen (GameApp's screen keys). */
const RECAP_SCREENS = /^(free|night):/u;

/**
 * The journey's moments on screen (2026-11-11 user decision; rules in journey-moments.ts): what each saved change starts
 * (GameApp's commit listener calls `committed`) and the recap of a resumed game. In this tab's memory only, so a reload
 * never brings one back (no save format change for them):
 * - the title card of an episode whose first part began, after any ride's or night's art (`effectPlaying`) and the packing;
 *   while it waits a hidden mark keeps the scene from reading on (`data-obstructs-dialogue`);
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
  }
  /** A load, a new game or Debug's return: what waited belonged to the play before. `resume`: a load, whose recap follows. */
  function restart(resume: boolean) {
    setTitleId(null);
    setPacking(null);
    setEndRoll(false);
    setRecapScreen(null);
    recapArmed.current = resume;
  }
  function closeEndRoll() {
    setEndRoll(false);
    // The dialog's opener (the epilogue's last line) is gone: a lost focus goes to the screen's heading.
    window.requestAnimationFrame(() => focusSceneHeading(document.getElementById("main")));
  }
  const titleCard = titleId && game ? episodeTitleCard(game, titleId) : null;
  const titleWaits = !!titleCard && (effectPlaying || !!packing);
  return {
    committed,
    restart,
    openEndRoll: () => setEndRoll(true),
    /** The title card waits or shows: a battle's opening name plate waits for it (BattleScreen's introHeld). */
    titleHolding: !!titleCard,
    /** The packing, shown in place of the screen (null when none). */
    packingScene: packing && <PackingScene packing={packing} reduceMotion={reduceMotion} onEnd={() => setPacking(null)} />,
    /** The recap card, at the top of <main> (null when none). */
    recapCard: recap && <ResumeRecapCard recap={recap} onClose={() => setRecapScreen(null)} />,
    /** The title card (or its waiting mark) and the credit roll, after the screens. */
    overlays: <>
      {titleCard && (titleWaits ? <span hidden data-obstructs-dialogue="" />
        : <EpisodeTitle key={titleCard.episodeId} card={titleCard} reduceMotion={reduceMotion} onEnd={() => setTitleId(null)} />)}
      {roll && !effectPlaying && !packing && <EndRollDialog roll={roll} reduceMotion={reduceMotion} onClose={closeEndRoll} />}
    </>,
  };
}
