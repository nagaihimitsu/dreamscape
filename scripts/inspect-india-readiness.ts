import { inspectIndiaReadiness, loadIndiaReadiness } from "./india-readiness";
import { buildContent } from "./content-pipeline";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--json" && arg !== "--require-ready")) {
  throw new Error("Usage: npx tsx scripts/inspect-india-readiness.ts [--json] [--require-ready]");
}
const root = process.cwd();
const report = inspectIndiaReadiness(loadIndiaReadiness(root));
if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`インド編: ${report.ready ? "参照の準備完了" : "準備中"}`);
  for (const issue of report.issues) console.log(`  - ${issue.detail}`);
  for (const city of report.cities) {
    console.log(`\n${city.cityId}: ${city.events.length} 候補`);
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
    await buildContent(root, false);
    console.log("India release gate: full content validation passed.");
  }
}
