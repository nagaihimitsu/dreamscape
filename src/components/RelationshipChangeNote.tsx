import { describeRelationshipChange, type RelationshipChange } from "../domain/relationship-change";
import { useMeasuredHeight } from "./useMeasuredHeight";
import "./relationship-change.css";

/** A scene's `cond("…")` text and whether it holds now (src/domain/scene-conditions.ts). */
export type SceneConditionTruth = { text: string; met: boolean };

/**
 * Debug mode's display of a choice's relationship changes (user decision 2026-11-08):
 * shown above the scene, never in the dialogue window, the message log or the save.
 * Marked 「Debug」 so nobody reads it as story text; outside the scene, so a tap on it
 * neither reads on nor counts as a control press (scene-tap.ts).
 * GameApp keeps the status region mounted (empty while `change` is null) for as long as
 * Debug mode is on, so it is on the page before a change is put into it: screen readers
 * often do not announce a live region that is added together with its text.
 * Under it, while the scene on screen uses `cond("…")`, each text with whether it holds
 * now (unified event design 4.8, stage 2a): for the author only, like the values; not a
 * live region, so it is not announced at every line.
 * Where the header lies over the scene, the region lies right under it and its
 * height (`--change-h`, 0 while empty) is part of the scene's reserve below the
 * header (`--scene-top`, styles.css), so the header never covers it and it never
 * covers what the scene shows.
 */
export function RelationshipChangeNote({ change, conditions = [] }: { change: RelationshipChange | null; conditions?: readonly SceneConditionTruth[] }) {
  const measured = useMeasuredHeight("--change-h");
  return (
    <div className="relationship-change-region" ref={measured}>
      <div role="status" aria-label="Debug：関係の変化">
        {change && (
          <section className="relationship-change" data-testid="relationship-change">
            <span className="relationship-change-label" aria-hidden="true">Debug</span>
            <div className="relationship-change-lines">
              {describeRelationshipChange(change).map((line) => <p key={line}>{line}</p>)}
            </div>
          </section>
        )}
      </div>
      {conditions.length > 0 && (
        <section className="relationship-change" data-testid="scene-conditions" aria-label="Debug：場面の条件">
          <span className="relationship-change-label" aria-hidden="true">Debug</span>
          <div className="relationship-change-lines">
            {conditions.map(({ text, met }) => <p key={text}>{`条件「${text}」：${met ? "真（満たす）" : "偽（満たさない）"}`}</p>)}
          </div>
        </section>
      )}
    </div>
  );
}
