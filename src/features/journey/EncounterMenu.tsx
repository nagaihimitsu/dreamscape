import "./encounter.css";

export type EncounterMenuEntry = {
  id: string;
  landmarkId: string;
  title: string;
  description?: string;
  unavailableReason?: string;
};

/** Small, optional detours alongside the existing free-time destinations. */
export function EncounterMenu({ entries, place, onStart }: {
  entries: EncounterMenuEntry[];
  place: string;
  onStart: (id: string) => void;
}) {
  return (
    <section className="encounter-place-menu" aria-label={`${place}で過ごす`}>
      <h3>{place}で過ごす</h3>
      {entries.length === 0 && <p className="encounter-inventory">今行ける寄り道はありません。</p>}
      {entries.map((entry) => (
        <div className="encounter-menu-row" key={entry.id}>
          <div>
            <strong>{entry.title}</strong>
            {entry.description && <p>{entry.description}</p>}
            {entry.unavailableReason && <p>{entry.unavailableReason}</p>}
          </div>
          <button
            type="button"
            className="secondary"
            disabled={!!entry.unavailableReason}
            onClick={() => onStart(entry.id)}
          >
            行く
            <span className="sr-only">：{entry.title}</span>
          </button>
        </div>
      ))}
    </section>
  );
}
