import { useState } from "react";
import {
  learningDetails,
  learningTranslations,
} from "../../content";
import { getBattleContentByHash } from "../../domain/battle";
import type { GameState } from "../../domain/game";
import { beginStory, continueStory, type StoryStep } from "../../story/runtime";
import { Modal, ModalTitle } from "../../components/Modal";
import { playSe } from "../../audio/sound-effects";
import type { Learning } from "./useLearning";
import type { LearningState } from "./learning-storage";
import { InteractiveEnglish } from "./InteractiveEnglish";
import { ReadAloudButton, useReadAloud } from "./ReadAloud";
import { toggleTranslation, type Part } from "./Translations";
import { WordBook } from "./WordBook";
import { LocalWords } from "./LocalWords";
import { localWordGroups } from "./local-words";
import "./learning.css";

/** A battle's answers as the notes keep them (learning-storage.ts) and as a battle on screen has them (its run). */
type AnswerRecord = Pick<LearningState["records"][string], "contentHash" | "answers">;

/** The questions answered in these records, by battle; a record of other content than today's (its hash) is left out. */
function recordedQuestions(records: Record<string, AnswerRecord>) {
  return Object.entries(records).flatMap(([id, record]) => {
    const content = getBattleContentByHash(id, record.contentHash);
    if (!content) return [];
    const { battle, quiz } = content;
    return record.answers.flatMap((a) => {
      const question = quiz.questions.find((q) => q.id === a.questionId);
      return question &&
        question.options.some((option) => option.id === a.optionId) &&
        a.correct === (a.optionId === question.correctOptionId)
        ? [{ battle, question, answer: a, questionNumber: quiz.questions.findIndex((item) => item.id === question.id) + 1 }]
        : [];
    });
  });
}
/** The notes' records of the battles this save has fought (its battleRecords). */
function savedRecords(game: GameState, learning: Pick<Learning, "data">): Record<string, AnswerRecord> {
  return Object.fromEntries(Object.entries(learning.data.records).filter(([id]) => game.battleRecords.some((item) => item.battleId === id)));
}
/** The questions the notes list: during a battle, its run's; else those of the battles this save has fought. */
export function answeredQuestions(game: GameState, learning: Pick<Learning, "data">) {
  return recordedQuestions(game.activeBattle ? { [game.activeBattle.battleId]: game.activeBattle } : savedRecords(game, learning));
}
/**
 * The questions whose words the word book holds for this save (前に出た単語, met-words.ts): those of the battles it has
 * fought, the run on screen standing for its own battle.
 */
export function metQuestions(game: GameState, learning: Pick<Learning, "data">) {
  return recordedQuestions({
    ...savedRecords(game, learning),
    ...(game.activeBattle ? { [game.activeBattle.battleId]: game.activeBattle } : {}),
  });
}
export function EnglishReview({
  game,
  learning,
  learnedWords = [],
  readAloud = false,
  onClose,
}: {
  game: GameState;
  learning: Learning;
  /** The words of the country learned on this device in this journey (useLocalWords), in the order learned. */
  learnedWords?: readonly string[];
  /** 「英語を読み上げるボタンを出す」 is on and this browser can read aloud (ReadAloud.tsx). */
  readAloud?: boolean;
  onClose: () => void;
}) {
  const [markedOnly, setMarkedOnly] = useState(false);
  // 「問題」 (the answered questions), 「単語帳」 (their words by place) or 「その国の言葉」 (the words of the country
  // learned, by city; 2026-11-11 user decisions). In this view only; a view with nothing to show has no button.
  const [view, setView] = useState<"questions" | "words" | "local">("questions");
  const allEntries = answeredQuestions(game, learning);
  const localGroups = localWordGroups(learnedWords);
  const shown = view === "words" && allEntries.length > 0 ? "words" : view === "local" && localGroups.length > 0 ? "local" : "questions";
  const entries = markedOnly
    ? allEntries.filter((item) => learning.isMarked(item.question.id))
    : allEntries;
  const selected = entries.find(
    (e) => e.question.id === learning.data.openQuestion,
  );
  const selectedIndex = entries.findIndex(
    (entry) => entry.question.id === selected?.question.id,
  );
  // The speaker buttons of the question shown: what one reads stops on another question, another view or closing.
  const reader = useReadAloud(readAloud, `${shown}:${selected?.question.id ?? ""}`);
  const [story, setStory] = useState<StoryStep | null>(() => {
    if (!selected || !learning.data.openTopic) return null;
    const detail =
      learningDetails.questions[
        selected.question.id as keyof typeof learningDetails.questions
      ];
    if (!detail?.topics.some((item) => item.id === learning.data.openTopic))
      return null;
    return beginStory(
      detail.storyId,
      game.playerName,
      game.heroineName,
      { topic: learning.data.openTopic },
    );
  });
  const details = selected
    ? learningDetails.questions[
        selected.question.id as keyof typeof learningDetails.questions
      ]
    : undefined;
  function select(id: string) {
    setStory(null);
    learning.update((s) => ({ ...s, openQuestion: id, openTopic: null }));
  }
  // Each question names the story its topics open (learningDetailsSchema).
  function topic(storyId: string, id: string) {
    const first = beginStory(
      storyId,
      game.playerName,
      game.heroineName,
      { topic: id },
    );
    learning.update((s) => ({ ...s, openTopic: id }));
    setStory(first);
  }
  const recorded = new Set(allEntries.map((e) => e.battle.id));
  return (
    <Modal
      labelledBy="english-review-title"
      onClose={onClose}
      className="english-review"
    >
      <ModalTitle id="english-review-title" className="english-review-header" onClose={onClose}>英語ノート</ModalTitle>
      {(allEntries.length > 0 || localGroups.length > 0) && (
        <div className="review-views" role="group" aria-label="ノートの見方">
          <button type="button" className="secondary" aria-pressed={shown === "questions"} onClick={() => setView("questions")}>問題</button>
          {allEntries.length > 0 && <button type="button" className="secondary" aria-pressed={shown === "words"} onClick={() => setView("words")}>単語帳</button>}
          {localGroups.length > 0 && <button type="button" className="secondary" aria-pressed={shown === "local"} onClick={() => setView("local")}>その国の言葉</button>}
        </div>
      )}
      {shown === "words" ? <WordBook answered={allEntries} /> : shown === "local" ? <LocalWords groups={localGroups} /> : <>
      {!selected && <p>回答済みの問題を振り返れます。復習しても得点やAPは変わりません。</p>}
      {!allEntries.length && <p>まだ回答済みの問題はありません。</p>}
      {!game.activeBattle &&
        game.battleRecords.some((r) => !recorded.has(r.battleId)) && (
          <p>
            以前の回答内容は未記録です。新たに回答した問題から振り返れます。
          </p>
        )}
      {allEntries.length > 0 && (
        <label className="review-filter">
          <input
            type="checkbox"
            checked={markedOnly}
            onChange={(event) => setMarkedOnly(event.target.checked)}
          />{" "}
          復習に登録した問題だけ見る
        </label>
      )}
      {markedOnly && entries.length === 0 && (
        <p>復習に登録した問題はありません。</p>
      )}
      {entries.length > 0 && (
        <div className="review-list">
          <label htmlFor="review-question-picker">回答した問題を選ぶ</label>
          <select
            id="review-question-picker"
            value={selectedIndex >= 0 ? entries[selectedIndex].question.id : ""}
            onChange={(event) => {
              if (event.target.value) select(event.target.value);
            }}
          >
            <option value="">問題を選んでください</option>
            {entries.map(({ battle, question, questionNumber }) => (
              <option key={`${battle.id}-${question.id}`} value={question.id}>
                第{questionNumber}問 · {battle.enemyNameJa} · {question.questionEn}
              </option>
            ))}
          </select>
          <div className="review-navigation">
            <button
              type="button"
              className="secondary"
              aria-label="前の問題"
              disabled={selectedIndex <= 0}
              onClick={() => {
                playSe("ui_page");
                select(entries[selectedIndex - 1].question.id);
              }}
            >
              前へ
            </button>
            <button
              type="button"
              className="secondary"
              aria-label={selectedIndex < 0 ? "最初の問題" : "次の問題"}
              disabled={selectedIndex === entries.length - 1}
              onClick={() => {
                playSe("ui_page");
                select(entries[selectedIndex + 1].question.id);
              }}
            >
              {selectedIndex < 0 ? "最初" : "次へ"}
            </button>
          </div>
        </div>
      )}
      {selected &&
        (() => {
          const { question, answer } = selected;
          const tr = learningTranslations[question.id];
          if (!tr) return null;
          const marked = learning.isMarked(question.id);
          const reviewKey = `review:${question.id}`;
          const showTranslation = (part: Part) =>
            !(learning.data.revealed[reviewKey] ?? []).includes(part);
          const toggle = (part: Part) =>
            toggleTranslation(learning, reviewKey, part);
          const reveal = (part: Part) => learning.update((state) => {
            const entries = state.revealed[reviewKey] ?? [];
            if (!entries.includes(part)) return state;
            return {
              ...state,
              revealed: {
                ...state.revealed,
                [reviewKey]: entries.filter((entry) => entry !== part),
              },
            };
          });
          return (
            <article
              key={question.id}
              className="review-question"
              data-testid="review-question"
            >
              {/* No 「単語を押すと意味…」 line (2026-11-11, the user's decision): the words' dotted underline shows they can be pressed. */}
              <h3>
                <InteractiveEnglish
                  text={question.questionEn}
                  vocabulary={question.vocabularyJa}
                  label="問題文"
                  onDoubleTap={() => reveal("question")}
                />
              </h3>
              <div className="review-question-tools">
                <button
                  type="button"
                  className="secondary review-mark"
                  aria-pressed={marked}
                  onClick={() =>
                    learning.update((s) => {
                      const marks = { ...s.marks };
                      if (marked) delete marks[question.id];
                      else marks[question.id] = JSON.stringify(tr.source);
                      return { ...s, marks };
                    })
                  }
                >
                  {marked ? "復習の登録を解除" : "あとで復習する"}
                </button>
                <ReadAloudButton reader={reader} part="question" text={question.questionEn} />
                <button
                  className="text-button review-translation-toggle"
                  type="button"
                  aria-expanded={showTranslation("question")}
                  onClick={() => toggle("question")}
                >
                  {showTranslation("question")
                    ? "問題文の訳を閉じる"
                    : "問題文の訳を見る"}
                </button>
              </div>
              {showTranslation("question") && <p>{tr.questionJa}</p>}
              <ul className="review-options">
                {question.options.map((o) => (
                  <li key={o.id}>
                    <span>
                      {o.id}.{" "}
                      <InteractiveEnglish
                        text={o.textEn}
                        vocabulary={question.vocabularyJa}
                        label={`選択肢${o.id}`}
                        onDoubleTap={() => reveal(o.id)}
                      />
                    </span>
                    <br />
                    <ReadAloudButton reader={reader} part={o.id} text={o.textEn} />
                    <button
                      className="text-button review-translation-toggle"
                      type="button"
                      aria-expanded={showTranslation(o.id)}
                      aria-label={`選択肢${o.id}の訳を${showTranslation(o.id) ? "閉じる" : "見る"}`}
                      onClick={() => toggle(o.id)}
                    >
                      {showTranslation(o.id) ? "訳を閉じる" : "訳を見る"}
                    </button>
                    {showTranslation(o.id) && <span>{tr.optionsJa[o.id]}</span>}{" "}
                    {answer.optionId === o.id && (
                      <strong>（選んだ答え）</strong>
                    )}{" "}
                    {question.correctOptionId === o.id && (
                      <strong>（正解）</strong>
                    )}
                  </li>
                ))}
              </ul>
              {details && (
                <p className="learning-summary">{details.summaryJa}</p>
              )}
              <p>
                {answer.correct
                  ? question.correctExplanationJa
                  : question.incorrectExplanationJa}
              </p>
              {details && (
                <section>
                  <h3>英文を確認する</h3>
                  <details>
                    <summary>文の組み立て</summary>
                    <dl>
                      {details.segments.map((segment) => (
                        <div key={segment.textEn}>
                          <dt lang="en">{segment.textEn}</dt>
                          <dd>{segment.meaningJa}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                  {details.topics.map((item) => (
                    <details
                      key={item.id}
                      open={learning.data.openTopic === item.id || undefined}
                    >
                      <summary>
                        {item.category === "grammar"
                          ? "この文法が気になる："
                          : "この表現の意味："}
                        {item.titleJa}
                      </summary>
                      <p>{item.explanationJa}</p>
                      <details>
                        <summary>自分でも使ってみる</summary>
                        <p lang="en">{item.exampleEn}</p>
                        <details>
                          <summary>訳を見る</summary>
                          <p>{item.exampleJa}</p>
                        </details>
                      </details>
                      <p>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          英文法の参考資料
                        </a>
                      </p>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => topic(details.storyId, item.id)}
                      >
                        {game.heroineName}と確認する
                      </button>
                      {learning.data.openTopic === item.id && story && (
                        <div className="learning-story" aria-live="polite">
                          <strong>{game.heroineName}</strong>
                          <p>{story.frame.text}</p>
                          {!story.frame.ended && (
                            <button
                              className="text-button"
                              onClick={() =>
                                setStory(
                                  continueStory(
                                    details.storyId,
                                    story.storyState,
                                    story.frame,
                                  ),
                                )
                              }
                            >
                              続きを読む
                            </button>
                          )}
                        </div>
                      )}
                    </details>
                  ))}
                </section>
              )}
            </article>
          );
        })()}
      </>}
    </Modal>
  );
}
