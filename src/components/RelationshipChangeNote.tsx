import { describeRelationshipChange, type RelationshipChange } from "../domain/relationship-change";
import "./relationship-change.css";

/**
 * Debug mode's display of a choice's relationship changes (user decision 2026-11-08):
 * shown above the scene, never in the dialogue window, the message log or the save.
 * Marked 「Debug」 so nobody reads it as story text; outside the scene, so a tap on it
 * neither reads on nor counts as a control press (scene-tap.ts).
 */
export function RelationshipChangeNote({ change }: { change: RelationshipChange }) {
  return (
    <section className="relationship-change" role="status" aria-label="Debug：関係の変化" data-testid="relationship-change">
      <span className="relationship-change-label" aria-hidden="true">Debug</span>
      <div className="relationship-change-lines">
        {describeRelationshipChange(change).map((line) => <p key={line}>{line}</p>)}
      </div>
    </section>
  );
}
