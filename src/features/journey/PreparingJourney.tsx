import { useState, type FormEvent } from "react";
import { balance } from "../../content";
import type { Journey } from "../../content/journeys";
import { loadJourneyDraft, saveJourneyDraft } from "../../persistence/journey-preparation";
import type { StorageLike } from "../../persistence";
import { JourneySelection, type SelectorFocus } from "./JourneySelection";

/** A saved preparation is not a playable city: no fictional hotel or budget is introduced. */
export function PreparingJourney({ journey, storage, onSwitchJourney, selectorFocus }: { journey: Journey; storage: StorageLike; onSwitchJourney: (id: string) => void; selectorFocus?: SelectorFocus }) {
  const [loaded, setLoaded] = useState(() => loadJourneyDraft(storage));
  const [player, setPlayer] = useState(balance.defaultPlayerName);
  const [heroine, setHeroine] = useState(balance.defaultHeroineName);
  const [error, setError] = useState("");
  function prepare(event: FormEvent) {
    event.preventDefault();
    const result = saveJourneyDraft(storage, player.trim(), heroine.trim());
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setLoaded(loadJourneyDraft(storage));
    setError("");
  }
  return <div className="app-shell">
    <header className="masthead">
      <a href="#main" className="brand">Dreamscape<span>旅の余白</span></a>
      <span className="edition">旅の準備</span>
    </header>
    <main id="main">
      <section className="paper intro journey-preparation">
        <p className="eyebrow">旅のはじまり</p>
        <JourneySelection value={journey.id} onChange={onSwitchJourney} {...selectorFocus} />
        <h1>{journey.nameJa}</h1>
        <p className="lead">{journey.cities.map((city, index) => <span key={city.id} className="journey-route-stop">{index ? " → " : ""}{city.nameJa}</span>)}</p>
        <p>この旅行編は制作中です。観光やイベントはまだ遊べません。</p>
        <p>名前を保存して、旅の準備をしておくことができます。他の旅行編の記録は引き継がれず、それぞれ別に保存されます。</p>
        {loaded.status === "invalid" && <div className="notice warning" role="alert">{loaded.message}</div>}
        {loaded.status === "loaded" ? <div className="journey-preparation-saved" role="status">
          <strong>旅の準備を保存しています</strong>
          <p>{loaded.draft.playerName} と {loaded.draft.heroineName}</p>
          <p>物語と観光の公開までお待ちください。</p>
        </div> : loaded.status === "empty" && <form onSubmit={prepare} className="name-form">
          <label>主人公の名前<input name="playerName" value={player} maxLength={balance.maxNameLength} required autoComplete="off" onChange={(event) => setPlayer(event.target.value)} /></label>
          <label>ヒロインの名前<input name="heroineName" value={heroine} maxLength={balance.maxNameLength} required autoComplete="off" onChange={(event) => setHeroine(event.target.value)} /></label>
          {error && <p role="alert">{error}</p>}
          <button className="primary" disabled={!player.trim() || !heroine.trim()}>旅の準備を保存する <span aria-hidden="true">→</span></button>
        </form>}
      </section>
    </main>
  </div>;
}
