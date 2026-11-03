import { journeys } from "../../content/journeys";

export function JourneySelection({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return <label className="journey-selection">
    旅行編
    <select aria-label="旅行編" value={value} onChange={(event) => onChange(event.target.value)}>
      {journeys.map((journey) => <option key={journey.id} value={journey.id}>
        {journey.nameJa}{journey.status === "preparing" ? "（準備中）" : ""}
      </option>)}
    </select>
  </label>;
}
