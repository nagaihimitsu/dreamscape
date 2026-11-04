import { inspectJourneyTransit } from "./journey-transit-review";

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--journey") throw new Error("Usage: --journey uzbekistan");
const report = inspectJourneyTransit(process.cwd(), args[1]);
console.log(JSON.stringify(report, null, 2));
if (report.some((city) => !city.ready)) process.exitCode = 1;
