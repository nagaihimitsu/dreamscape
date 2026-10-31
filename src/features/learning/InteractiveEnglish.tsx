import { useEffect, useRef, useState } from "react";
import { wordMeanings } from "../../content";
import { normalizeWord, wordPattern } from "../../content/word-meanings";

type Vocabulary = { word: string; meaning: string };
type Token = { text: string; meaning?: string; contextual?: boolean };

/** Prefer the author's contextual phrases, then fall back to the local general glossary. */
export function englishTokens(text: string, vocabulary: Vocabulary[]): Token[] {
  const phrases = vocabulary
    .filter((item) => item.word.trim().includes(" "))
    .sort((a, b) => b.word.length - a.word.length);
  const tokens: Token[] = [];
  let cursor = 0;
  for (const match of text.matchAll(wordPattern)) {
    const start = match.index;
    if (start < cursor) continue;
    if (start > cursor) tokens.push({ text: text.slice(cursor, start) });
    const phrase = phrases.find((item) => {
      const candidate = text.slice(start, start + item.word.length);
      const next = text[start + item.word.length];
      return (
        candidate.toLowerCase() === item.word.toLowerCase() &&
        (!next || !/[\p{L}]/u.test(next))
      );
    });
    const word = phrase
      ? text.slice(start, start + phrase.word.length)
      : match[0];
    const contextual =
      phrase ??
      vocabulary.find(
        (item) => normalizeWord(item.word) === normalizeWord(word),
      );
    tokens.push({
      text: word,
      meaning: contextual?.meaning ?? wordMeanings[normalizeWord(word)],
      contextual: !!contextual,
    });
    cursor = start + word.length;
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor) });
  return tokens;
}

export function InteractiveEnglish({
  text,
  vocabulary,
  onDoubleTap,
  label,
}: {
  text: string;
  vocabulary: Vocabulary[];
  onDoubleTap: () => void;
  label: string;
}) {
  const [word, setWord] = useState<Token | null>(null);
  const pending = useRef<{
    timer: ReturnType<typeof setTimeout>;
    index: number;
  } | null>(null);
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current.timer);
    },
    [],
  );
  function tap(token: Token, index: number, keyboard: boolean) {
    if (keyboard) {
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = null;
      setWord(token);
      return;
    }
    if (pending.current?.index === index) {
      clearTimeout(pending.current.timer);
      pending.current = null;
      setWord(null);
      onDoubleTap();
      return;
    }
    if (pending.current) clearTimeout(pending.current.timer);
    setWord(token);
    pending.current = {
      index,
      timer: setTimeout(() => {
        pending.current = null;
      }, 350),
    };
  }
  return (
    <span className="interactive-english" lang="en" aria-label={label}>
      <span>
        {englishTokens(text, vocabulary).map((token, index) =>
          token.meaning ? (
            <button
              type="button"
              key={`${index}-${token.text}`}
              className="english-word"
              aria-label={`${token.text}の意味`}
              onClick={(event) => tap(token, index, event.detail === 0)}
            >
              {token.text}
            </button>
          ) : (
            token.text
          ),
        )}
      </span>
      {word && (
        <span className="word-meaning" role="status" lang="ja">
          <strong lang="en">{word.text}</strong>：{word.meaning}
          {!word.contextual && <small>（一般的な意味）</small>}{" "}
          <button
            type="button"
            className="word-close"
            aria-label="単語の意味を閉じる"
            onClick={() => {
              if (pending.current) clearTimeout(pending.current.timer);
              pending.current = null;
              setWord(null);
            }}
          >
            ×
          </button>
        </span>
      )}
    </span>
  );
}
