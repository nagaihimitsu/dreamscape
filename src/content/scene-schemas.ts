import { z } from "zod";
import { conditionSchema, RELATIONSHIP_AXES } from "./condition-schemas";
import { rewardRuleSchema } from "./journey-schemas";
import { quizQuestionSchema } from "./schemas";
import { STORY_FILE_PATTERN } from "./story-address";
import { japaneseText } from "./text-language";

/**
 * The scene list content:build writes (`generated/scenes.json`; the unified event design,
 * stage 3a, 3.3): every scene the head tags of the place files describe (`origin: "place"`),
 * the head `# on_done:` of the one-scene files (`origin: "file"`) and today's encounter
 * catalogs read as the same table (`origin: "catalog"`, Milan: content:build converts them, so
 * the same scenes run where and when they ran). Each scene keeps its choices' effects by
 * option ID (the game applies them before passing the choice to Ink) and what it does when it
 * is done. The AP rules of the tags (`scene_tag`) are written next to the scenes.
 * Light module (zod only): the runtime parses the generated file with it.
 */

const id = z.string().regex(/^[a-z][a-z0-9_]*$/u);
const signed = z.number().int().safe();
/** `tour_leg`: a tour leg's narration (tour stage 2b), found by its `# at: tour <tour> <leg>` (no catalog points at it). */
export const SCENE_KINDS = ["talk", "encounter", "guide", "battle", "date", "arrival", "epilogue", "tour_leg"] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];
/** Kinds the game places at a moment (差し込み); the others are main parts (a catalog points at them, or a tour leg's narration). */
export const INSERTED_KINDS: readonly SceneKind[] = ["talk", "encounter"];

/** Fixed relationship changes (`# rel: affection +1, trust -1`): whole numbers, any size (rev. 5). */
export const relationshipDeltaSchema = z.object(Object.fromEntries(RELATIONSHIP_AXES.map((axis) => [axis, signed.optional()])) as
  Record<(typeof RELATIONSHIP_AXES)[number], z.ZodOptional<typeof signed>>).strict();
export type RelationshipDelta = z.infer<typeof relationshipDeltaSchema>;

/**
 * A moment of `# at:` (2.3). Stage 3: `visit <landmark>`, `visit any` (any landmark of the scene's city) and
 * `place <place>` (the visits of the landmarks at that transport place, and from stage 4 its dates and finale too).
 * Stage 4: `date <date>`, `finale <city>`, `epilogue <city>`, `depart <city>` (opens only when the city has a next
 * city), `arrive <city>` (the first city's is the opening), `hotel` (`any`: the scene's city's hotel) or `hotel <place>`,
 * `trip <mode>` (`walk` for walking; `from <place>`, `to <place>` narrow it) and `ticket <place>` (the ticket counter
 * of an admission there). Tour stages 2b and 3: `tour <tour> <step>`, a step of a tour (a leg: its narration, the scenes
 * before it, `after leg` and after it; an event step: before and after its visit).
 */
export const sceneAtSchema = z.union([
  z.object({ visit: id }).strict(),
  z.object({ place: id }).strict(),
  z.object({ date: id }).strict(),
  z.object({ finale: id }).strict(),
  z.object({ epilogue: id }).strict(),
  z.object({ depart: id }).strict(),
  z.object({ arrive: id }).strict(),
  z.object({ hotel: id }).strict(),
  z.object({ trip: id, from: id.optional(), to: id.optional() }).strict(),
  z.object({ ticket: id }).strict(),
  z.object({ tour: id, step: id }).strict(),
]);
export type SceneAt = z.infer<typeof sceneAtSchema>;
/**
 * The main parts an inserted scene may follow (`# priority: after <part>`): a visit's guide, observation and battle, a finale's battle,
 * a date, an arrival's logo, a tour leg's narration (`after leg`: the in-car encounter, before the leg moves the party).
 */
export const AFTER_PARTS = ["guide", "observe", "battle", "date", "logo", "leg"] as const;
export type AfterPart = (typeof AFTER_PARTS)[number];

/** `# then: move <place> [by <mode>]` / `# then: epilogue`: where the game goes right after the scene ends (stage 3b). */
export const sceneThenSchema = z.union([
  z.object({ move: id, by: id.optional() }).strict(),
  z.object({ epilogue: z.literal(true) }).strict(),
]);
export type SceneThen = z.infer<typeof sceneThenSchema>;

/** One choice's tags (3.1 「選択肢の札」), by its `# option:` ID. */
export const sceneOptionSchema = z.object({
  id,
  /** The knot the choice is written in: the scene's own knot, or a helper knot it calls. */
  knot: id,
  /** `# requires:` (all must hold; the choice is hidden otherwise, decision 43). */
  requires: z.array(conditionSchema).optional(),
  give: z.object({ item: id, to: id }).strict().optional(),
  use: id.optional(),
  rel: relationshipDeltaSchema.optional(),
  /** `# money: -300` / `+500`: the sum of the choice's lines. */
  money: signed.optional(),
  /** `# ap: -1` / `+2`: the sum (never 0). */
  ap: signed.optional(),
  set: z.array(id).optional(),
  memory: z.array(id).optional(),
  /** `# profile:` (docs/03 「噛み合い」): the reaction profile the choice resolves with. */
  profile: id.optional(),
  /** Today's date effect (`# effect:`), for the dates not moved to tags. */
  effect: id.optional(),
  /** `# later` (「また今度」): the scene ends seen, not done. */
  later: z.literal(true).optional(),
  then: sceneThenSchema.optional(),
  /** The choice has a `# translation:` (the player can open it). */
  translated: z.literal(true).optional(),
}).strict();
export type SceneOption = z.infer<typeof sceneOptionSchema>;

/** What the scene does when it is done (`# on_done:`; a main part: the first time it is finished). */
export const sceneDoneSchema = z.object({
  items: z.array(id).optional(),
  use: z.array(id).optional(),
  set: z.array(id).optional(),
  rel: relationshipDeltaSchema.optional(),
  money: signed.optional(),
  ap: signed.optional(),
}).strict();
export type SceneDone = z.infer<typeof sceneDoneSchema>;

/** Which main part a main scene is (a catalog points at it). */
export const sceneMainSchema = z.union([
  z.object({ guide: id }).strict(),
  z.object({ battle: id }).strict(),
  z.object({ date: id }).strict(),
  z.object({ arrival: id }).strict(),
  z.object({ epilogue: id }).strict(),
]);
export type SceneMain = z.infer<typeof sceneMainSchema>;

export const sceneEntrySchema = z.object({
  /** The knot's name (a place file), the encounter's ID (a catalog) or the main part's (a one-scene file). */
  id,
  kind: z.enum(SCENE_KINDS),
  title: z.string().min(1).optional(),
  cityId: id,
  /** Where the scene starts: its story file and, in a place file, its knot. */
  story: z.object({ storyId: z.string().regex(STORY_FILE_PATTERN), knot: id.optional() }).strict(),
  main: sceneMainSchema.optional(),
  /** `# at:` (2.3): the moments the scene runs at (several are allowed: it runs at any of them); a tour leg's narration: its leg. */
  at: z.array(sceneAtSchema),
  /** `# priority:` (an inserted scene): a whole number, or after one main part of its moment. */
  priority: z.union([signed, z.literal("after guide"), z.literal("after observe"), z.literal("after battle"), z.literal("after date"), z.literal("after logo"),
    z.literal("after leg")]).optional(),
  /** The scene's place in its file (the same priority runs in written order, then by file name). */
  order: z.number().int().nonnegative(),
  repeat: z.enum(["once", "always"]),
  people: z.array(id),
  /** Every `# when:` and none of the `# until:`. */
  when: conditionSchema.optional(),
  options: z.array(sceneOptionSchema),
  done: sceneDoneSchema,
  then: sceneThenSchema.optional(),
  /** `# sources: none` (B4: a production journey's scene says it states no real fact, or lists sources in its scene JSON). */
  sources: z.enum(["none", "listed"]).optional(),
  /** The `cond("…")` texts the scene and its helper knots read. */
  conds: z.array(z.string()),
  /** The scene's knot and every knot it calls (helper knots), for the fingerprint. */
  knots: z.array(id),
  /** Changes when the scene's knots, the declarations or its data change (a save inside it is then refused). */
  fingerprint: z.string().min(1),
  origin: z.enum(["place", "file", "catalog"]),
}).strict();
export type SceneEntry = z.infer<typeof sceneEntrySchema>;

export const generatedScenesSchema = z.object({
  scenes: z.array(sceneEntrySchema),
  /** The AP rules of the tags that give AP (`scene_tag`, 3.3 「札の AP の決まり」). */
  rewards: z.array(rewardRuleSchema),
}).strict();
export type GeneratedScenes = z.infer<typeof generatedScenesSchema>;

/**
 * The story state an author declares (`progression/story.json`, 3a): flags (物語の状態; set by
 * `# set:` in any city's scene, read by `flag <id>`), people (`# person:`, read by `met <id>`;
 * the given-to of `# give:`) and named conditions (`condition <name>`: or, at least, nesting). A person's optional
 * `descriptionJa` is shown under the name in 旅の記録's 「出会った人」 once the person is met (2026-11-11 user decision).
 */
const text = z.string().trim().min(1);
export const storyStateCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  flags: z.array(z.object({ id, noteJa: text.optional() }).strict()).default([]),
  /**
   * `descriptionJa`: a line about the person in 旅の記録's 出会った人; `characterId`: the portrait
   * (presentation/characters.json) that stands for the person in a scene with their `# person:`,
   * and from their own lines (`# speaker: <person ID>`) in any scene (speakingPerson); `titleJa`: their role,
   * shown with the name on a name plate at their first own line in a battle (like the opponent's).
   */
  people: z.array(z.object({
    id, cityId: id, nameJa: text, titleJa: japaneseText.optional(), descriptionJa: japaneseText.optional(), characterId: id.optional(),
  }).strict()).default([]),
  conditions: z.record(id, conditionSchema).default({}),
}).strict();
export type StoryStateCatalog = z.infer<typeof storyStateCatalogSchema>;

/**
 * The scene JSON (`scenes/catalog.json`, 3.7): what tags cannot say, by scene ID. Stage 3a
 * reads `sources` (B4); a place file's quiz and alternative AP stay in today's encounter catalog.
 */
export const sceneDataCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  scenes: z.array(z.object({ id, sources: z.array(quizQuestionSchema.shape.sources.element).min(1) }).strict()).default([]),
}).strict();
