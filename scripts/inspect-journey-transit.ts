import { transportLabel } from "../src/content/transport";
import { journeyCatalogOf, loadContentSources } from "./content-sources";
import { inspectJourneyTransit } from "./journey-transit";
import { formatTransitCounts } from "./transit-ledger";

// npm run journey:transit -- --journey <journeyId> [--json]: every city's transit ledger against its routes.
// Also lists the directions without a walking route and the routes of declared modes that lack their
// sources (content:build warns about both). Exits 1 while a decision is inconclusive.
const args = process.argv.slice(2);
const json = args.includes("--json");
const rest = args.filter((arg) => arg !== "--json");
if (rest.length !== 2 || rest[0] !== "--journey") throw new Error("Usage: npm run journey:transit -- --journey <journeyId> [--json]");
const root = process.cwd();
const sources = loadContentSources(root);
const report = inspectJourneyTransit(root, rest[1], sources);
if (json) console.log(JSON.stringify(report, null, 2));
else if (!report.cities.length) {
  console.log(`${report.journeyId}: 徒歩だけの旅行編です（transportModes が空なので、交通判断台帳は要りません）`);
} else {
  const firstCity = journeyCatalogOf(sources).journeys.find((journey) => journey.id === report.journeyId)!.cities[0].id;
  for (const city of report.cities) {
    console.log(`${city.cityId}（${city.file}）: ${city.directions}方向、判断 ${city.decisions}件${city.ready ? "" : "、特定できずの判断が残っています"}`);
    for (const line of formatTransitCounts(city.counts, (mode) => transportLabel(firstCity, mode))) console.log(`  ${line}`);
    if (city.missingWalks.length)
      console.log(`  徒歩の経路がない方向 ${city.missingWalks.length}: ${city.missingWalks.slice(0, 3).join("、")}${city.missingWalks.length > 3 ? " ほか" : ""}（注意）`);
    if (city.unsupportedRoutes.length)
      console.log(`  事実の出典かゲーム用の推定の印（estimation: "game_model"）がない経路 ${city.unsupportedRoutes.length}本: ${city.unsupportedRoutes.slice(0, 3).join("、")}${city.unsupportedRoutes.length > 3 ? " ほか" : ""}（注意）`);
  }
}
if (report.cities.some((city) => !city.ready)) process.exitCode = 1;
