import { useState, type ReactNode, type RefCallback } from "react";
import { balance } from "../content";
import { Modal, ModalTitle } from "../components/Modal";
import { SettingCheck, VolumeSetting } from "../components/SettingCheck";
import type { usePresentationSettings } from "../components/usePresentationSettings";
import { difficultyOf, economyLevelLabel, isJapaneseOnly, type EnglishChoice } from "../domain/difficulty";
import type { GameState } from "../domain/game";
import { EnglishLevelField } from "../features/journey/DifficultyFields";
import type { Learning } from "../features/learning/useLearning";

/** Said once under the reading settings, below the first one turned on. */
const NO_ENGLISH_VOICE_JA = "英語の声がない端末では、読まないか、ほかの言葉の声で読みます。";

/**
 * ゲームの設定's 「制作者向け」 (2026-11-14 user decision): Debug mode and its tools, folded away for players; open as
 * ゲームの設定 opens while Debug mode is on. It stays as the player leaves it while ゲームの設定 is open (turning Debug
 * mode off inside it does not fold it under the finger).
 */
function CreatorSettings({ initiallyOpen, children }: { initiallyOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <details className="settings-creator" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>制作者向け</summary>
    {children}
  </details>;
}

/**
 * ゲームの設定 (2026-11-14 user decision; regrouped 2026-11-19 and 2026-11-20): only the player's preferences, in groups under
 * their headings, the most used first — 文字と演出, 英語, 音と振動, 旅 — then the creator's tools, folded away (open while
 * Debug mode is on). The saved data (自動保存, 保存データの消去, 古い保存データの整理, オフラインで遊ぶ) and the switch of
 * journeys are セーブ・ロード's; the credits are 「画面の出典」's (≡メニュー) and the title's (2026-11-20 user decision).
 * Under 「日本語のみ」 the quiz shows no English (its level's own words say so), so 英語 has no reading or translation settings,
 * only a line that says where they are.
 * A note or a volume under a checkbox is indented under its label (setting-note, setting-sub). The first focus is the title
 * bar's 「× 閉じる」 (the first control). A form is in it: a tap beside it does not close it.
 */
export function SettingsDialog({ game, display, learning, readAloudAvailable, vibrationAvailable, names, onEnglishLevel, creator, onClose }: {
  game: GameState;
  /** The display settings of this device (usePresentationSettings). */
  display: ReturnType<typeof usePresentationSettings>;
  learning: Learning;
  /** Whether the browser can read aloud (the reading settings only where it can) and vibrate. */
  readAloudAvailable: boolean;
  vibrationAvailable: boolean;
  /** The names' form, or null while a conversation, a quiz or a sightseeing is open (the names cannot change then). */
  names: {
    player: string; heroine: string;
    onPlayer: (name: string) => void; onHeroine: (name: string) => void;
    /** The player's field, whose typing gives the name's reading (useNameReading). */
    playerRef: RefCallback<HTMLInputElement>;
    /** Saves the names (both filled in) and closes ゲームの設定. */
    onSave: () => void;
  } | null;
  onEnglishLevel: (level: EnglishChoice) => void;
  /** 「制作者向け」: absent where it has nothing to show (a Debug session with Debug mode off). */
  creator?: { open: boolean; children: ReactNode };
  onClose: () => void;
}) {
  const { value, error, update } = display;
  const locked = !!error;
  const japaneseOnly = isJapaneseOnly(game);
  const autoReadAloud = readAloudAvailable && value.autoReadAloud;
  const readAloud = readAloudAvailable && value.readAloud;
  return <Modal labelledBy="settings-title" onClose={onClose} settlePresses>
    <ModalTitle id="settings-title" onClose={onClose}>ゲームの設定</ModalTitle>
    {/* Why the display settings cannot change (another tab changed them, or the browser refuses): above every group they belong to. */}
    {error && <p role="status">{error}</p>}
    <h3>文字と演出</h3>
    <label className="translation-setting">
      文字送り {" "}
      <select aria-label="文字送り" value={value.dialogueSpeed} disabled={locked}
        onChange={(event) => update({ dialogueSpeed: Number(event.target.value) })}>
        <option value={45}>ゆっくり</option>
        <option value={25}>ふつう</option>
        <option value={0}>一括表示</option>
      </select>
    </label>
    <SettingCheck checked={value.autoAdvance} disabled={locked} onChange={(on) => update({ autoAdvance: on })}>自動送りする</SettingCheck>
    <SettingCheck checked={value.skipUnread} disabled={locked} onChange={(on) => update({ skipUnread: on })}
      note={value.skipUnread ? undefined : "オフの間、高速送りはまだ読んでいない台詞で止まります。"}>未読の台詞も高速送りする</SettingCheck>
    <SettingCheck checked={value.reduceMotion} disabled={locked} onChange={(on) => update({ reduceMotion: on })}>演出を短縮する</SettingCheck>
    {/* 英語 (2026-11-19): the quiz's English level (from the next quiz; one already started keeps its own), and while the
        quiz shows English, the reading aloud and the translation. */}
    <h3>英語</h3>
    <div className="name-form difficulty-settings">
      <EnglishLevelField value={difficultyOf(game).english}
        note={game.activeBattle ? "解いている途中のクイズは、始めたときの英語のまま進みます。" : "次のクイズから変わります。"}
        onChange={onEnglishLevel} />
    </div>
    {japaneseOnly ? <p className="fine-print setting-english-off">英語のレベルを選ぶと、読み上げと日本語訳の設定が出ます。</p> : <>
      {readAloudAvailable && <SettingCheck checked={value.autoReadAloud} disabled={locked} onChange={(on) => update({ autoReadAloud: on })}
        note={autoReadAloud && `クイズの問題文を、出たときに一度読みます。答えると止まります。${NO_ENGLISH_VOICE_JA}`}>問題が出たら英語を自動で読み上げる</SettingCheck>}
      {readAloudAvailable && <SettingCheck checked={value.readAloud} disabled={locked} onChange={(on) => update({ readAloud: on })}
        note={readAloud && `クイズの英文の横に出ます。${autoReadAloud ? "" : NO_ENGLISH_VOICE_JA}`}>英語を読み上げるボタンを出す</SettingCheck>}
      <SettingCheck checked={learning.data.alwaysTranslate} disabled={!!learning.error}
        onChange={(on) => learning.update((state) => ({ ...state, alwaysTranslate: on, revealed: {} }))}>常に日本語訳を表示する</SettingCheck>
    </>}
    {learning.error && <p role="status">{learning.error}</p>}
    {/* The voices, the sound effects and the music together, each with its own volume (shown while it is on), and the
        vibration where the browser can vibrate. */}
    <h3>{vibrationAvailable ? "音と振動" : "音"}</h3>
    <SettingCheck checked={value.voice} disabled={locked} onChange={(on) => update({ voice: on })}>台詞の声を出す</SettingCheck>
    {value.voice && <VolumeSetting label="声の大きさ" value={value.voiceVolume} disabled={locked} onChange={(volume) => update({ voiceVolume: volume })} />}
    <SettingCheck checked={value.se} disabled={locked} onChange={(on) => update({ se: on })}>効果音を出す</SettingCheck>
    {value.se && <VolumeSetting label="効果音の大きさ" value={value.seVolume} disabled={locked} onChange={(volume) => update({ seVolume: volume })} />}
    <SettingCheck checked={value.bgm} disabled={locked} onChange={(on) => update({ bgm: on })}>BGMを流す</SettingCheck>
    {value.bgm && <VolumeSetting label="BGMの大きさ" value={value.bgmVolume} disabled={locked} onChange={(volume) => update({ bgmVolume: volume })} />}
    <SettingCheck checked={value.ambience} disabled={locked} onChange={(on) => update({ ambience: on })}
      note={value.ambience && "場所の音（雨・市場・鳥の声など）を、BGMの半分の大きさで流します。"}>環境音を流す</SettingCheck>
    {vibrationAvailable && <SettingCheck checked={value.vibration} disabled={locked} onChange={(on) => update({ vibration: on })}
      note={value.vibration && "品物や手がかりを手に入れたときに、端末が短く震えます。"}>振動する</SettingCheck>}
    {/* 旅: the names, and how the journey plays — how tight money and AP are (chosen at the title, kept for the journey)
        and the mini-games played for the player (2026-11-20: from 文字と演出). */}
    <h3>旅</h3>
    {names ? <form className="name-form" onSubmit={(event) => {
      event.preventDefault();
      if (names.player.trim() && names.heroine.trim()) names.onSave();
    }}>
      <label>
        主人公の名前
        <input ref={names.playerRef} name="playerName" value={names.player} maxLength={balance.maxNameLength} required
          onChange={(event) => names.onPlayer(event.target.value)} autoComplete="off" />
      </label>
      <label>
        ヒロインの名前
        <input name="heroineName" value={names.heroine} maxLength={balance.maxNameLength} required
          onChange={(event) => names.onHeroine(event.target.value)} autoComplete="off" />
      </label>
      <button className="secondary" disabled={!names.player.trim() || !names.heroine.trim()}>名前を保存</button>
    </form> : <p>進行中の会話やクイズ・観光を閉じると、名前を変更できます。</p>}
    <p className="fine-print">お金とAPのきびしさ：{economyLevelLabel(difficultyOf(game).economy).labelJa}（旅の始めに決めたもので、変えられません）</p>
    <SettingCheck checked={value.miniGameAuto} disabled={locked} onChange={(on) => update({ miniGameAuto: on })}
      note={value.miniGameAuto && "ミニゲームは押さずに自動で進み、場面ごとに決まった結果になります。"}>ミニゲームをおまかせにする</SettingCheck>
    {creator && <CreatorSettings initiallyOpen={creator.open}>{creator.children}</CreatorSettings>}
  </Modal>;
}
