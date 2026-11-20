import type { FormEvent, ReactNode, Ref } from "react";
import { CanalScene } from "../components/CanalScene";
import type { TitleArt } from "../content/journey-catalog";
import type { Difficulty } from "../domain/difficulty";
import { DifficultyFields } from "../features/journey/DifficultyFields";
import { TitleNameFields } from "../features/journey/TitleNameFields";
import type { LoadResult } from "../persistence";
import type { TitleAction } from "./save-recovery";

/**
 * The title screen, shown while there is no game (GameApp's): the journey's title art in the colour of the device's time
 * of day, the lead, a save that cannot be opened (`problem`: what it is, what can be done, its 保存データを消去する and,
 * when the list has something, 古い保存データの整理), the journey's choice and its offline lines (`journeyChoice`), the
 * journey's slots (`saveSlots`), the start (names and difficulty) and 出典・権利の一覧. Display only: GameApp keeps the
 * state and decides what each press does.
 */
export function TitleScreen({ art, problem, journeyChoice, saveSlots, start, autoSave, onCredits }: {
  art: { artwork?: TitleArt; tint: { period: string; color: string | null } };
  /** The save of this journey's slot that cannot be opened (its message), or null. */
  problem: {
    loaded: LoadResult; message: string;
    deletion: TitleAction; onDelete: () => void;
    /** 古い保存データの整理's way in: only while its list has something. */
    onOldData?: () => void;
  } | null;
  journeyChoice?: ReactNode;
  saveSlots?: ReactNode;
  start: {
    action: TitleAction;
    player: string; heroine: string; onPlayer: (name: string) => void; onHeroine: (name: string) => void;
    playerRef?: Ref<HTMLInputElement>;
    difficulty: Difficulty; onDifficulty: (difficulty: Difficulty) => void; journeyId: string;
    onBegin: (event: FormEvent) => void;
  };
  /** 「ゲームの進行を自動保存する」 (the start's words and the problem's advice follow it). */
  autoSave: boolean;
  onCredits: () => void;
}) {
  const loaded = problem?.loaded;
  return <>
    <div className="intro-art" data-testid="title-art" data-time-of-day={art.tint.period}>
      <CanalScene compact artwork={art.artwork} tint={art.tint.color ?? undefined} />
    </div>
    <section className="paper intro">
      <p className="eyebrow">旅のはじまり</p>
      <h1>
        予定のない午後を、
        <br />
        きみと。
      </h1>
      <p className="lead">
        街の風景に立ち止まり、奇妙な人々と出会う。
        <br />
        そのあとは、ふたりで街歩き。
      </p>
      {problem && (
        <div className="notice warning" role="alert">
          <strong>{loaded?.status === "invalid" && loaded.kind === "newer"
            ? "新しいバージョンの保存データです"
            : "保存データを読み込めませんでした"}</strong>
          <p>{problem.message}</p>
          {loaded?.status === "invalid" && loaded.kind === "journey" ? <p>
            旅行編を切り替え、元の編のデータを確認してください。
          </p> : loaded?.status === "invalid" && loaded.raw !== null && <p>
            {autoSave
              ? "元のデータは残っています。バックアップを保存してから新しく始めるか、保存データの消去を選べます。"
              : "元のデータは残っています。新しく始めた場合、手動セーブ時に元のデータをバックアップします。"}
          </p>}
          {problem.deletion !== "hidden" && <button
            className="secondary"
            type="button"
            onClick={problem.onDelete}
            disabled={problem.deletion === "disabled"}
          >
            保存データを消去する
          </button>}
          {problem.onOldData && <button type="button" className="text-button old-data-entry"
            onClick={problem.onOldData}>古い保存データの整理</button>}
        </div>
      )}
      {journeyChoice}
      {saveSlots}
      {start.action !== "hidden" && <form onSubmit={start.onBegin} className="name-form">
        <TitleNameFields player={start.player} heroine={start.heroine} onPlayer={start.onPlayer} onHeroine={start.onHeroine}
          playerRef={start.playerRef} />
        <DifficultyFields value={start.difficulty} onChange={start.onDifficulty} journeyId={start.journeyId} />
        <button
          className="primary"
          data-testid="title-start"
          disabled={start.action === "disabled"}
        >
          {problem
            ? autoSave ? "元のデータを退避して新しく始める" : "元のデータを残して新しく始める"
            : "旅をはじめる"}
          <span aria-hidden="true"> →</span>
        </button>
      </form>}
      <p className="fine-print">
        {autoSave ? "このブラウザに進行を自動保存します。" : "進行は手動でセーブできます。"}
        <br />
        名前はあとから「メニュー」の「ゲームの設定」で変更できます。
      </p>
      <button type="button" className="text-button credits-entry" onClick={onCredits}>出典・権利の一覧</button>
    </section>
  </>;
}
