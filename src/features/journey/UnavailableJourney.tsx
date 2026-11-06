import type { Journey } from "../../content/journey-catalog";
import { JourneySelection, type SelectorFocus } from "./JourneySelection";

/** Unfinished journeys without a preparation save remain read-only. */
export function UnavailableJourney({ journey, onSwitchJourney, selectorFocus }: { journey: Journey; onSwitchJourney: (id: string) => void; selectorFocus?: SelectorFocus }) {
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
        <p className="lead">{journey.cities.map((city) => city.nameJa).join(" → ")}</p>
        <p role="status">この旅行編は制作中です。<br />公開をお待ちください。</p>
      </section>
    </main>
  </div>;
}
