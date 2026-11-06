import { buildJourneyTransitDecisionReview, journeyTransitDecisionModes, readJourneyTransitDecisions } from "../../journey-transit-decisions";

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--json")) throw new Error("Usage: inspect-india-transit.ts [--json]");
const report = buildJourneyTransitDecisionReview(readJourneyTransitDecisions(process.cwd(), "golden_triangle"));
if (args[0] === "--json") console.log(JSON.stringify(report, null, 2));
else {
  for (const [city, counts] of Object.entries(report.counts)) {
    console.log(`${city}: ゲームに登録 ${counts.available}、確認済み不採用 ${counts.not_suitable}、調査したが特定できず ${counts.inconclusive}、未調査 ${counts.unresearched}（片道・交通手段別）`);
    for (const mode of journeyTransitDecisionModes) {
      const rows = report.rows.filter((row) => row.cityId === city && row.mode === mode);
      const count = (status: (typeof rows)[number]["status"]) => rows.filter((row) => row.status === status).length;
      console.log(`  ${mode}: 登録 ${count("available")}、不採用 ${count("not_suitable")}、特定できず ${count("inconclusive")}、未調査 ${count("unresearched")}`);
    }
  }
  console.log("詳細は --json を指定。未調査・特定できずは運行がないという意味ではありません。");
}
