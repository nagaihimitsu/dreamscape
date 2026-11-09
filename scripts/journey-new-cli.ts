import { CHECKLIST_FILE, createJourney, parseNewJourneyArgs } from "./journey-new";

// npm run journey:new -- <journeyId> --name <日本語名> --city <cityId> --city-name <日本語名> [--prefix <p>] [--with-optional]
try {
  const created = createJourney(process.cwd(), parseNewJourneyArgs(process.argv.slice(2)));
  const id = created.journeyId;
  console.log(`旅行編「${id}」を見本の編から作りました: ${created.folder}/（${created.files.length} ファイル、準備中、並び順 ${created.order}）`);
  console.log(`  都市ID ${created.cityId}、IDの接頭辞 ${created.prefix}_（manifest.json の authoring.eventPrefix）`);
  console.log(`  文章・出典・画像は見本の架空の内容のままです。置き換えるものは ${created.folder}/${CHECKLIST_FILE} にあります。`);
  for (const note of created.notes) console.log(`  注意: ${note}`);
  console.log("\n次の手順:");
  console.log("  1. npm run content:build");
  console.log(`  2. npm run journey:readiness -- --journey ${id}   （残っている見本の内容と未完成の項目）`);
  console.log(`  3. ${CHECKLIST_FILE} に沿って実在の観光地・出典・画像・文章に置き換える`);
  console.log(`  4. npm run journey:release -- --check --journey ${id}   （公開の確認。見本の内容が残っていると止まる）`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
