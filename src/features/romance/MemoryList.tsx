import { presentation } from "../../content";
export function MemoryList({ ids }: { ids: string[] }) {
  return (
    <ul className="memory-list">
      {ids.map((id) => (
        <li key={id}>
          <span aria-hidden="true">✧</span>
          <div>
            <h3>{presentation.memories[id]?.titleJa ?? id}</h3>
            <p>{presentation.memories[id]?.descriptionJa}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
