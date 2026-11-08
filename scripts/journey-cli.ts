import type { JourneyReleaseResult } from "./promote-journey";

// Argument parsing and printed text of the journey authoring commands
// (journey:readiness, journey:scaffold, journey:release), kept apart from the
// command files so that tests can check them without running a command.

/** A heading with the Japanese name and the ID, e.g. 「ミラノ（milano）」; the ID alone without a name. */
export function namedJa(item: { id: string; nameJa?: string }): string {
  return item.nameJa ? `${item.nameJa}（${item.id}）` : item.id;
}

export interface JourneyScaffoldArgs {
  mode: "requirements" | "fragments";
  /** The narrative file of `--fragments`. */
  narrativePath?: string;
  journeyId: string;
  selectedCities?: string[];
}

const scaffoldUsage = "Usage: [--requirements] --journey ID [--city ID] | --fragments NARRATIVE.json --journey ID [--city ID]";

/**
 * The options of journey:scaffold. The mode may follow other options (e.g.
 * `npm run india:scaffold -- --fragments narrative.json`); without one it is
 * `--requirements` (the read-only overview). `--fragments` takes the next
 * argument as its narrative file, which must not be another option.
 */
export function parseJourneyScaffoldArgs(argv: readonly string[]): JourneyScaffoldArgs {
  const args = [...argv];
  const modeIndex = args.findIndex((arg) => arg === "--requirements" || arg === "--fragments");
  const mode = modeIndex < 0 || args.splice(modeIndex, 1)[0] === "--requirements" ? "requirements" : "fragments";
  let narrativePath: string | undefined;
  if (mode === "fragments") {
    narrativePath = args[modeIndex];
    if (!narrativePath || narrativePath.startsWith("--")) throw new Error(scaffoldUsage);
    args.splice(modeIndex, 1);
  }
  let selectedCities: string[] | undefined;
  let journeyId: string | undefined;
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!value || seen.has(flag)) throw new Error("Expected unique --journey ID and optional --city ID");
    seen.add(flag);
    if (flag === "--journey") journeyId = value;
    else if (flag === "--city") selectedCities = [value];
    else throw new Error(`Unknown option: ${flag}`);
  }
  if (!journeyId) throw new Error("--journey ID is required");
  return { mode, narrativePath, journeyId, selectedCities };
}

/** What journey:release prints after a check (`apply` false) or an apply: a summary line, then each file. */
export function journeyReleaseSummary({ journey, lastCity, files }: JourneyReleaseResult, apply: boolean): string[] {
  const target = `${namedJa(journey)}の${namedJa(lastCity)}まで`;
  const summary = apply
    ? files.length
      ? `${target}を公開しました（全体の内容の検証に合格）。書き込んだファイル: ${files.length} 件`
      : `${target}は公開済みで、内容が変わらないため、書き込んだファイルはありません（全体の内容の検証に合格）。`
    : `${target}の公開の確認に合格しました（全体の内容の検証）。ファイルは変更していません。` +
      (files.length ? `--apply で書き込むファイル: ${files.length} 件` : "--apply しても、内容が変わらないため書き込むファイルはありません。");
  return [summary, ...files.map((file) => `  ${file}`)];
}
