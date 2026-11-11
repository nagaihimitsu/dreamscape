import { useId } from "react";
import type { GameState } from "../../domain/game";
import { declaresPeople, metPeopleGroups } from "./met-people";
import "./city.css";

/**
 * 旅の記録's 「出会った人」 (2026-11-11 user decision; the list: met-people.ts): by city in journey order, each person met
 * with the writer's few words under the name. Display only, never a relationship value. None in a journey that
 * declares no one; before the first meeting, one line says what will be written here.
 */
export function MetPeople({ game }: { game: GameState }) {
  const id = useId();
  if (!declaresPeople(game)) return null;
  const groups = metPeopleGroups(game);
  return <section className="met-people" aria-labelledby={`${id}-title`} data-testid="met-people">
    <h3 id={`${id}-title`}>出会った人</h3>
    {groups.length === 0
      ? <p className="fine-print">まだ誰とも出会っていません。旅先で出会った人を、ここに書き留めます。</p>
      : groups.map((group) => <div key={group.cityId} className="met-people-city">
        <h4>{group.cityNameJa}</h4>
        <dl>{group.people.map((person) => <div key={person.id} data-testid={`met-person-${person.id}`}>
          <dt>{person.nameJa}</dt>
          {person.descriptionJa && <dd>{person.descriptionJa}</dd>}
        </div>)}</dl>
      </div>)}
  </section>;
}
