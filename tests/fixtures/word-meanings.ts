import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Add `words` to journey `journeyId`'s own word meanings in a content fixture (prepareContentFixture): its
 * learning/word-meanings.json, created when the journey has none. A journey's quizzes and encounters may use only the
 * meanings of the core dictionary and of their own journey (content-ownership.ts), so English that a test adds to a
 * journey brings the meanings only another journey defines. A word another dictionary also defines keeps its meaning.
 */
export async function addJourneyWordMeanings(fixtureRoot: string, journeyId: string, words: Record<string, string>): Promise<void> {
  const file = path.join(fixtureRoot, "content/journeys", journeyId, "learning/word-meanings.json");
  let dictionary: { schemaVersion: number; words: Record<string, string> } = { schemaVersion: 1, words: {} };
  try {
    dictionary = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(path.dirname(file), { recursive: true });
  }
  dictionary.words = { ...dictionary.words, ...words };
  await writeFile(file, JSON.stringify(dictionary, null, 2));
}
