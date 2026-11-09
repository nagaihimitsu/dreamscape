import { describeRelationshipChange, type RelationshipChange } from "../domain/relationship-change";
import "./relationship-change.css";

/**
 * Debug mode's display of a choice's relationship changes (user decision 2026-11-08):
 * shown above the scene, never in the dialogue window, the message log or the save.
 * Marked 「Debug」 so nobody reads it as story text; outside the scene, so a tap on it
 * neither reads on nor counts as a control press (scene-tap.ts).
 * GameApp keeps the status region mounted (empty while `change` is null) for as long as
 * Debug mode is on, so it is on the page before a change is put into it: screen readers
 * often do not announce a live region that is added together with its text.
 */
export function RelationshipChangeNote({ change }: { change: RelationshipChange | null }) {
  return (
    <div className="relationship-change-region" role="status" aria-label="Debug：関係の変化">
      {change && (
        <section className="relationship-change" data-testid="relationship-change">
          <span className="relationship-change-label" aria-hidden="true">Debug</span>
          <div className="relationship-change-lines">
            {describeRelationshipChange(change).map((line) => <p key={line}>{line}</p>)}
          </div>
        </section>
      )}
    </div>
  );
}
