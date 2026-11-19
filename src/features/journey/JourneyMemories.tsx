import type { ReactNode } from "react";
import { JourneyNumbersCard } from "./JourneyNumbers";
import type { JourneyNumbers } from "./journey-numbers";
import "./journey-memories.css";

/** What a finished journey can be looked at again with (each opens over the screen and closes back to it). */
export type MemoryViews = {
  onEndRoll: () => void;
  onAlbum: () => void;
  onMusicRoom: () => void;
  /** 旅の記録 (the finished journey's own screen only: a kept memory shows its numbers here). */
  onRecords?: () => void;
};

/** The names and 旅の数字 of a finished journey, then the ways to look at it again. Never a relationship value. */
function MemoryContents({ playerName, heroineName, numbers, reduceMotion, views }: {
  playerName: string; heroineName: string; numbers: JourneyNumbers; reduceMotion: boolean; views: MemoryViews;
}) {
  return <>
    <p className="memories-names" data-testid="memories-names">{playerName}<span className="amp"> と </span>{heroineName}</p>
    <JourneyNumbersCard numbers={numbers} reduceMotion={reduceMotion} />
    <div className="memories-views">
      <button type="button" className="secondary" data-testid="memories-end-roll" onClick={views.onEndRoll}>エンドロール</button>
      <button type="button" className="secondary" data-testid="memories-album" onClick={views.onAlbum}>アルバム</button>
      <button type="button" className="secondary" data-testid="memories-music-room" onClick={views.onMusicRoom}>旅の音楽室</button>
      {views.onRecords && <button type="button" className="secondary" data-testid="memories-records" onClick={views.onRecords}>旅の記録</button>}
    </div>
  </>;
}

/**
 * 旅の思い出 (2026-11-19 user decision; docs/01 「クリア後・難易度・複数のセーブ」): the screen of a journey whose last city's
 * epilogue and end roll are over, in place of free time. It looks back (the end roll, the album, 旅の音楽室, 旅の記録) and
 * goes on: 「もう一度この旅を」 (the same names, from the start) or another journey (`selector`, the journey selector).
 */
export function JourneyMemoriesScreen({ journeyJa, playerName, heroineName, numbers, reduceMotion, views, onAgain, selector }: {
  journeyJa: string; playerName: string; heroineName: string; numbers: JourneyNumbers; reduceMotion: boolean;
  views: MemoryViews; onAgain: () => void; selector?: ReactNode;
}) {
  return <section className="paper journey-memories" data-testid="journey-memories" aria-labelledby="journey-memories-title">
    <p className="eyebrow">旅の思い出</p>
    <h1 id="journey-memories-title" tabIndex={-1}>{journeyJa || "旅の記録"}</h1>
    <MemoryContents playerName={playerName} heroineName={heroineName} numbers={numbers} reduceMotion={reduceMotion} views={views} />
    <h2 className="memories-next">次の旅</h2>
    <button type="button" className="primary" data-testid="memories-again" onClick={onAgain}>
      もう一度この旅を <span aria-hidden="true">→</span>
    </button>
    <p className="fine-print">同じ名前で、最初から始めます。アルバムの写真・旅の図鑑・英語ノートは引き継ぎます。今の旅は「旅の思い出」として残り、新しい旅の「旅の記録」から見返せます。</p>
    {selector && <div className="memories-other">
      {selector}
      <p className="fine-print">別の旅行編へ切り替えても、この旅はこのまま残ります。</p>
    </div>}
  </section>;
}

/** A kept 旅の思い出 (the journey finished before this one), seen from 旅の記録 of the journey being played. */
export function KeptMemoryContents(props: { playerName: string; heroineName: string; numbers: JourneyNumbers; reduceMotion: boolean; views: MemoryViews }) {
  return <div className="kept-memory" data-testid="kept-memory"><MemoryContents {...props} /></div>;
}
