import { namedJa } from "./journey-cli";
import { inspectJourneyReadiness, loadJourneyReadiness } from "./journey-readiness";
import { buildContent } from "./content-pipeline";
import { errorText } from "./cli-error";

const args = process.argv.slice(2);
const journeyFlag = args.indexOf("--journey");
const journeyId = args[journeyFlag + 1];
if (journeyFlag < 0 || !journeyId || journeyId.startsWith("--")) fail("--journey で旅行編IDを指定してください。使い方: npm run journey:readiness -- --journey 旅行編ID [--json] [--require-ready]");
args.splice(journeyFlag, 2);
if (args.some((arg) => arg !== "--json" && arg !== "--require-ready")) {
  fail("使い方: npm run journey:readiness -- --journey 旅行編ID [--json] [--require-ready]");
}
const root = process.cwd();
const input = attempt(() => loadJourneyReadiness(root, journeyId));
const report = attempt(() => inspectJourneyReadiness(input));
if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`${namedJa(input.trip)}: ${report.ready ? "参照の準備完了" : "準備中"}`);
  for (const issue of report.issues) console.log(`  - ${issue.detail}`);
  for (const city of report.cities) {
    console.log(`\n${namedJa(input.trip.cities.find((entry) => entry.id === city.cityId) ?? { id: city.cityId })}: ${city.events.length} 候補`);
    for (const issue of city.issues) console.log(`  - ${issue.detail}`);
    for (const event of city.events) {
      console.log(`  ${event.id} (${event.category}): ${event.issues.length ? event.issues.map((issue) => issue.code).join(", ") : "参照あり"}`);
    }
  }
}
if (args.includes("--require-ready")) {
  if (!report.ready) process.exitCode = 1;
  else {
    // Reference presence is not enough: apply the same complete Ink, image,
    // route and cross-catalog validation as a normal production build.
    try {
      await buildContent(root, false);
      console.log("公開前の確認: 全体の内容の検証に合格しました。");
    } catch (error) {
      console.error(errorText(error));
      process.exitCode = 1;
    }
  }
}

/** Print a failure before any report output without its stack trace, and stop with exit code 1. */
function fail(error: unknown): never {
  console.error(errorText(error));
  process.exit(1);
}

function attempt<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    return fail(error);
  }
}
