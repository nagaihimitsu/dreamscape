import { useEffect, useId, useState, type ReactNode } from "react";
import { reducedMotionNow } from "./NightRest";
import { COUNT_UP_MS, countUpValue, type JourneyNumbers } from "./journey-numbers";
import "./journey-numbers.css";

/**
 * A number counting up as the card shows (COUNT_UP_MS), the number itself for readers (the counting is aria-hidden).
 * Reduced motion (「演出を短縮する」 or the system's): the number at once.
 */
function CountUp({ value, format = String, reduceMotion }: { value: number; format?: (value: number) => string; reduceMotion: boolean }) {
  const [still] = useState(() => reducedMotionNow(reduceMotion));
  const [shown, setShown] = useState(still ? value : 0);
  useEffect(() => {
    if (still) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const next = countUpValue(value, now - start);
      setShown(next);
      if (next !== value) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [value, still]);
  return <>
    <span aria-hidden="true">{format(shown)}</span>
    <span className="sr-only">{format(value)}</span>
  </>;
}

/**
 * 旅の数字 (2026-11-13 user decision; journey-numbers.ts): the journey in a few numbers, at the end roll and in 旅の記録.
 * A line without a whole-journey number to tell (the days not known for the journey, no money record) is left out.
 * Read-only; nothing in it is a relationship value or an English score.
 */
export function JourneyNumbersCard({ numbers, reduceMotion }: { numbers: JourneyNumbers; reduceMotion: boolean }) {
  const id = useId();
  const count = (value: number, unit: string) => <CountUp value={value} reduceMotion={reduceMotion} format={(shown) => `${shown}${unit}`} />;
  const rows: { label: string; value: ReactNode }[] = [
    ...(numbers.days !== null ? [{ label: "旅の日数", value: count(numbers.days, "日") }] : []),
    { label: "訪ねた場所", value: count(numbers.places, "か所") },
    { label: "出会った人", value: count(numbers.people, "人") },
    { label: "覚えたその国の言葉", value: count(numbers.localWords, "語") },
    { label: "アルバムの写真", value: count(numbers.photos, "枚") },
    ...(numbers.spent ? [{ label: "使ったお金", value: numbers.spent.textJa }] : []),
  ];
  return <section className="journey-numbers" aria-labelledby={`${id}-title`} data-testid="journey-numbers">
    <h3 id={`${id}-title`}>旅の数字</h3>
    <dl>
      {rows.map((row) => <div key={row.label}>
        <dt>{row.label}</dt>
        <dd>{row.value}</dd>
      </div>)}
    </dl>
  </section>;
}
