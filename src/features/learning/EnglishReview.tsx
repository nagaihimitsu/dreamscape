import { useState } from "react";
import {
  battles,
  battleQuizzes,
  learningDetails,
  learningTranslations,
} from "../../content";
import { battleFingerprint } from "../../domain/battle";
import type { GameState } from "../../domain/game";
import { beginStory, continueStory, type StoryStep } from "../../story/runtime";
import { Modal } from "../../components/Modal";
import type { Learning } from "./useLearning";
import { InteractiveEnglish } from "./InteractiveEnglish";
import { toggleTranslation, type Part } from "./Translations";
import "./learning.css";

export function answeredQuestions(game: GameState, learning: Learning) {
  const records = game.activeBattle
    ? { [game.activeBattle.battleId]: game.activeBattle }
    : learning.data.records;
  return Object.entries(records).flatMap(([id, record]) => {
    if (
      !game.activeBattle &&
      !game.battleRecords.some((item) => item.battleId === id)
    )
      return [];
    const battle = battles.find((b) => b.id === id);
    if (!battle || record.contentHash !== battleFingerprint(id)) return [];
    const quiz = battleQuizzes[battle.quizId];
    return record.answers.flatMap((a) => {
      const question = quiz.questions.find((q) => q.id === a.questionId);
      return question &&
        question.options.some((option) => option.id === a.optionId) &&
        a.correct === (a.optionId === question.correctOptionId)
        ? [{ battle, question, answer: a }]
        : [];
    });
  });
}
export function EnglishReview({
  game,
  learning,
  onClose,
}: {
  game: GameState;
  learning: Learning;
  onClose: () => void;
}) {
  const [markedOnly, setMarkedOnly] = useState(false);
  const allEntries = answeredQuestions(game, learning);
  const entries = markedOnly
    ? allEntries.filter((item) => learning.isMarked(item.question.id))
    : allEntries;
  const selected = entries.find(
    (e) => e.question.id === learning.data.openQuestion,
  );
  const selectedIndex = entries.findIndex(
    (entry) => entry.question.id === selected?.question.id,
  );
  const [story, setStory] = useState<StoryStep | null>(() => {
    if (!selected || !learning.data.openTopic) return null;
    const detail =
      learningDetails.questions[
        selected.question.id as keyof typeof learningDetails.questions
      ];
    if (!detail?.topics.some((item) => item.id === learning.data.openTopic))
      return null;
    return beginStory(
      learningDetails.storyId,
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
  function topic(id: string) {
    const first = beginStory(
      learningDetails.storyId,
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
      <div className="english-review-header">
        <h2 id="english-review-title">英語ノート</h2>
        <button type="button" className="text-button" onClick={onClose}>
          閉じる
        </button>
      </div>
      {!selected && <p>回答済みの問題を振り返れます。復習しても得点やAPは変わりません。</p>}
      {!allEntries.length && <p>まだ回答済みの問題はありません。</p>}
      {!game.activeBattle &&
        game.battleRecords.some((r) => !recorded.has(r.battleId)) && (
          <p>
            以前の回答内容は未記録です。新たに回答した問題から振り返れます。
          </p>
        )}
      {allEntries.length > 0 && (
        <label>
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
            {entries.map(({ battle, question }) => (
              <option key={`${battle.id}-${question.id}`} value={question.id}>
                第{battleQuizzes[battle.quizId].questions.findIndex((q) => q.id === question.id) + 1}問 · {battle.enemyNameJa} · {question.questionEn}
              </option>
            ))}
          </select>
          <div className="review-navigation">
            <button
              type="button"
              className="secondary"
              aria-label="前の問題"
              disabled={selectedIndex <= 0}
              onClick={() => select(entries[selectedIndex - 1].question.id)}
            >
              前へ
            </button>
            <button
              type="button"
              className="secondary"
              aria-label={selectedIndex < 0 ? "最初の問題" : "次の問題"}
              disabled={selectedIndex === entries.length - 1}
              onClick={() => select(entries[selectedIndex + 1].question.id)}
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
              <p className="english-instructions">
                単語を押すと意味、同じ単語をもう一度押すと文の訳。
              </p>
              <h3>
                <InteractiveEnglish
                  text={question.questionEn}
                  vocabulary={question.vocabularyJa}
                  label="問題文"
                  onDoubleTap={() => reveal("question")}
                />
              </h3>
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
                        onClick={() => topic(item.id)}
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
                                    learningDetails.storyId,
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
    </Modal>
  );
}
