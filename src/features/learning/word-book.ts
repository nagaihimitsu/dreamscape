import { episodes, getCityContent, landmarks, presentation, type BattleDefinition, type QuizQuestion } from "../../content";
import { getPlacePhoto } from "../../content/place-photo";
import type { TourismAsset } from "../../content/tourism-schemas";
import { normalizeWord } from "../../content/word-meanings";
import { battleCityId } from "../../domain/chapter";
import { englishTokens } from "./InteractiveEnglish";

/** One word of a question the player has answered: the word, its meaning there and the English sentence it came from. */
export type WordCard = { key: string; word: string; meaningJa: string; sentenceEn: string };

/**
 * The words met at one place (2026-11-11 user decision, 英語ノートの「単語帳」): the place of the battles whose questions
 * gave them, its name (with its city) and the photo free time shows for it (its reduced `card` copy; null for a plain
 * tile in `tileColor`). No score, no mastery: only the words, their meanings and their sentences.
 */
export type WordBookGroup = {
  key: string;
  cityNameJa: string;
  placeNameJa: string;
  photo: TourismAsset | null;
  tileColor?: string;
  cards: WordCard[];
};

/** An answered question as the notes list it (answeredQuestions). */
export type AnsweredWordSource = { battle: Pick<BattleDefinition, "id" | "landmarkId">; question: Pick<QuizQuestion, "id" | "questionEn" | "options" | "vocabularyJa"> };

/** Where a battle was fought: its landmark's place (a city finale: its map event's place), else the city alone. */
function battlePlace(battle: AnsweredWordSource["battle"]) {
  const cityId = battleCityId(battle.id);
  if (!cityId) return null;
  const { city, travel } = getCityContent(cityId);
  const landmark = landmarks.find((item) => item.id === battle.landmarkId);
  const eventIds = [battle.id, ...episodes.filter((episode) => episode.battleId === battle.id).map((episode) => episode.id)];
  const place = (landmark && travel.places.find((item) => item.landmarkIds?.includes(landmark.id))) ??
    travel.places.find((item) => travel.events.some((event) => event.placeId === item.id && eventIds.includes(event.id)));
  return { cityId, cityNameJa: city.nameJa, place, placeNameJa: landmark?.nameJa ?? place?.nameJa ?? city.nameJa };
}

/** The sentence of a question (its question, then its options) where a vocabulary item stands, as the notes underline it. */
function sentenceOf(question: AnsweredWordSource["question"], item: { word: string; meaning: string }): string {
  const sentences = [question.questionEn, ...question.options.map((option) => option.textEn)];
  return sentences.find((sentence) => englishTokens(sentence, [item]).some((token) => token.contextual)) ?? question.questionEn;
}

/**
 * The word book: a card for each word of the `vocabularyJa` of the questions answered, grouped by the place where they
 * were met, places in the order first met (the order of `answered`), words in their questions' order. A word met twice
 * at one place with the same meaning has one card.
 */
export function wordBookGroups(answered: readonly AnsweredWordSource[]): WordBookGroup[] {
  const groups = new Map<string, WordBookGroup & { seen: Set<string> }>();
  for (const { battle, question } of answered) {
    const where = battlePlace(battle);
    if (!where || !question.vocabularyJa.length) continue;
    const key = `${where.cityId}:${where.place?.id ?? ""}`;
    const tileColor = where.place ? presentation.backgrounds[where.place.backgroundId]?.color : undefined;
    const group: WordBookGroup & { seen: Set<string> } = groups.get(key) ?? { key, cityNameJa: where.cityNameJa, placeNameJa: where.placeNameJa,
      photo: where.place ? getPlacePhoto(where.cityId, where.place.id) : null, ...(tileColor ? { tileColor } : {}), cards: [], seen: new Set<string>() };
    groups.set(key, group);
    question.vocabularyJa.forEach((item, index) => {
      const identity = `${normalizeWord(item.word)}\u0000${item.meaning}`;
      if (group.seen.has(identity)) return;
      group.seen.add(identity);
      group.cards.push({ key: `${question.id}:${index}`, word: item.word, meaningJa: item.meaning, sentenceEn: sentenceOf(question, item) });
    });
  }
  return [...groups.values()].map(({ seen: _seen, ...group }) => group);
}

/** The photos the word book shows, once each, with the place each belongs to (its 「写真の出典」). */
export function wordBookPhotos(groups: readonly WordBookGroup[]): { asset: TourismAsset; placeNameJa: string }[] {
  const photos = new Map<string, { asset: TourismAsset; placeNameJa: string }>();
  for (const group of groups) if (group.photo && !photos.has(group.photo.id)) photos.set(group.photo.id, { asset: group.photo, placeNameJa: group.placeNameJa });
  return [...photos.values()];
}
