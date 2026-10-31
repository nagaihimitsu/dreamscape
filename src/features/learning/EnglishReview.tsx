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
  const selected = allEntries.find(
    (e) => e.question.id === learning.data.openQuestion,
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
      <p>回答済みの問題を振り返れます。復習しても得点やAPは変わりません。</p>
      {!entries.length && <p>まだ回答済みの問題はありません。</p>}
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
      <details open={!selected}>
        <summary>回答した問題を選ぶ</summary>
        <div className="review-list">
          {entries.map(({ battle, question }) => (
            <button
              type="button"
              key={`${battle.id}-${question.id}`}
              className="secondary"
              aria-pressed={selected?.question.id === question.id}
              onClick={() => select(question.id)}
            >
              {battle.enemyNameJa} · {question.questionEn}
            </button>
          ))}
        </div>
      </details>
      {selected &&
        (() => {
          const { question, answer } = selected;
          const tr = learningTranslations[question.id];
          if (!tr) return null;
          const marked = learning.isMarked(question.id);
          return (
            <article className="review-question" data-testid="review-question">
              <h3 lang="en">{question.questionEn}</h3>
              <p>{tr.questionJa}</p>
              {details && (
                <p className="learning-summary">{details.summaryJa}</p>
              )}
              <ul className="review-options">
                {question.options.map((o) => (
                  <li key={o.id}>
                    <span lang="en">
                      {o.id}. {o.textEn}
                    </span>
                    <br />
                    {tr.optionsJa[o.id]}{" "}
                    {answer.optionId === o.id && (
                      <strong>（選んだ答え）</strong>
                    )}{" "}
                    {question.correctOptionId === o.id && (
                      <strong>（正解）</strong>
                    )}
                  </li>
                ))}
              </ul>
              <p>
                {answer.correct
                  ? question.correctExplanationJa
                  : question.incorrectExplanationJa}
              </p>
              <button
                type="button"
                className="secondary"
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
