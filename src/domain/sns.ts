import { snsData, storyState } from "../content";
import { getJourneyForCity } from "../content/journeys";
import { SNS_HEROINE, snsCommentId, type SnsPost } from "../content/sns";
import { meets } from "./conditions";
import type { GameState } from "./game-state-schema";
import { EMPTY_SNS, type SnsArrivedComment, type SnsArrivedPost, type SnsState } from "./sns-state";

// The SNS's rules (2026-11-26 user decisions; authoring/SNS_PLAN.md 「届き方と記録」). Pure functions on the game state: what
// arrives is checked only at night (deliverSns: the night screen's state at 21:00, a rest at the hotel, leaving a city) and
// once more as the journey ends, never during the day or in a scene. A post comes on the first such night after its
// conditions hold (the heroine's, only with at least one of its photos taken); its comments come that same night and close
// there, but those of `# timing: later`, which may come on any later night. `# one_of:` keeps the first of its comments to
// come. What came is kept with its night and never changes (src/domain/sns-state.ts). Likes change nothing in the game but
// what a writer's `liked <post>` reads.

/** A night as the SNS records it: the city, its day and the minute of the game clock. */
export type SnsNight = { cityId: string; day: number; minute: number };

/** The night now (the city, its day and minute). */
export const nightNow = (state: Pick<GameState, "currentCityId" | "travel">): SnsNight =>
  ({ cityId: state.currentCityId, day: state.travel.day, minute: state.travel.minute });
/** Whether two records are of the same night (one city's same day). */
export const sameNight = (a: Pick<SnsNight, "cityId" | "day">, b: Pick<SnsNight, "cityId" | "day">) => a.cityId === b.cityId && a.day === b.day;

/** The save's SNS record (empty for a save written before it). */
export const snsOf = (state: Pick<GameState, "sns">): SnsState => state.sns ?? EMPTY_SNS;

/**
 * The posts that may arrive: of the current journey's cities reached so far (the current city and those before it), in
 * file order. Never a past post (`# past:`, 2026-11-27): it is read on its writer's page once met, and never arrives.
 */
export function reachablePosts(state: Pick<GameState, "currentCityId">): SnsPost[] {
  const cities = getJourneyForCity(state.currentCityId)?.cities.map((city) => city.id) ?? [state.currentCityId];
  const reached = cities.slice(0, cities.indexOf(state.currentCityId) + 1);
  return snsData.posts.filter((post) => reached.includes(post.cityId) && !post.past);
}

/** A post of the content by its ID. */
export const snsPost = (postId: string): SnsPost | undefined => snsData.posts.find((post) => post.id === postId);
/** The arrived record of a post, when it has arrived. */
export const arrivedPost = (state: Pick<GameState, "sns">, postId: string): SnsArrivedPost | undefined =>
  snsOf(state).posts.find((post) => post.id === postId);
/** The arrived record of a comment (`<post>.<comment>`), when it has arrived. */
export const arrivedComment = (state: Pick<GameState, "sns">, commentId: string): SnsArrivedComment | undefined =>
  snsOf(state).comments.find((comment) => comment.id === commentId);

const withSns = (state: GameState, change: (sns: SnsState) => SnsState): GameState => ({ ...state, sns: change(snsOf(state)) });

/** What of `post` arrives now, or null: its conditions, and for the heroine's at least one photo taken. */
function postArrival(state: GameState, post: SnsPost, night: SnsNight): SnsArrivedPost | null {
  if (!meets(state, post.when)) return null;
  const taken = new Set(state.album.map((photo) => photo.imageId));
  const imageIds = post.author === SNS_HEROINE ? post.imageIds.filter((imageId) => taken.has(imageId)) : post.imageIds;
  if (!imageIds.length) return null;
  const likes = [...new Set(post.likes.filter((like) => meets(state, like.when)).map((like) => like.personId))];
  return { id: post.id, ...night, imageIds, likes };
}

/** Whether the comment `commentId` of `post` (arrived as `record`) arrives now. */
function commentArrives(state: GameState, post: SnsPost, record: SnsArrivedPost, commentId: string, night: SnsNight): boolean {
  const comment = post.comments.find((item) => item.id === commentId)!;
  if (arrivedComment(state, snsCommentId(post.id, comment.id))) return false;
  // `# one_of:`: another of the same name came first.
  if (comment.oneOf && post.comments.some((other) => other.oneOf === comment.oneOf && arrivedComment(state, snsCommentId(post.id, other.id))))
    return false;
  // A comment comes on its post's night, then closes; `# timing: later` may come on any night after it too.
  if (!comment.later && !sameNight(record, night)) return false;
  return meets(state, comment.when);
}

/**
 * The state with what arrives on the SNS tonight recorded (`night`: the night's city, day and minute; now by default): every
 * post of the cities reached whose time has come, then the comments that come with it, in the order written. A post or a
 * comment that arrives can make another one's condition true (`comment <post>.<comment>`), so the round is read again until
 * nothing more comes. Unchanged (the same object) when nothing arrives; no revision of its own (the caller's action has one).
 */
export function deliverSns(state: GameState, night: SnsNight = nightNow(state)): GameState {
  let current = state;
  for (let changed = true; changed;) {
    changed = false;
    for (const post of reachablePosts(current)) {
      let record = arrivedPost(current, post.id);
      if (!record) {
        const arrival = postArrival(current, post, night);
        if (!arrival) continue;
        current = withSns(current, (sns) => ({ ...sns, posts: [...sns.posts, arrival] }));
        record = arrival;
        changed = true;
      }
      for (const comment of post.comments) {
        if (!commentArrives(current, post, record, comment.id, night)) continue;
        const id = snsCommentId(post.id, comment.id);
        current = withSns(current, (sns) => ({ ...sns, comments: [...sns.comments, { id, ...night }] }));
        changed = true;
      }
    }
  }
  return current;
}

/**
 * The player's like of an arrived post, pressed (2026-11-26): liked, or taken back when it was. It changes no relationship
 * value, item, money or AP; a writer's `liked <post>` reads it. Unchanged for a post that has not arrived or a stale revision.
 */
export function toggleSnsLike(state: GameState, postId: string, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || !arrivedPost(state, postId)) return state;
  return withSns({ ...state, revision: state.revision + 1 }, (sns) => ({
    ...sns, liked: sns.liked.includes(postId) ? sns.liked.filter((id) => id !== postId) : [...sns.liked, postId],
  }));
}

/** Whether the player likes the post now. */
export const likesPost = (state: Pick<GameState, "sns">, postId: string): boolean => snsOf(state).liked.includes(postId);

/**
 * The people (and the heroine) who like an arrived post, as their faces show under its photo (2026-11-26): the writers of
 * its arrived comments (a comment's first line; never the post's own writer), in the order they came, then its `# likes:`
 * people as it arrived. Each once. None for a post that has not arrived.
 */
export function postLikers(state: Pick<GameState, "sns">, postId: string): string[] {
  const post = snsPost(postId);
  const record = arrivedPost(state, postId);
  if (!post || !record) return [];
  const writers = snsOf(state).comments.flatMap((arrived) => {
    const [postOf, commentId] = arrived.id.split(".");
    const speaker = postOf === postId ? post.comments.find((comment) => comment.id === commentId)?.lines[0].speaker : undefined;
    return speaker ? [speaker] : [];
  });
  return [...new Set([...writers, ...record.likes])].filter((id) => id !== post.author);
}

/**
 * Whether the person (or the heroine) may be on the SNS: the heroine, or a person of progression/story.json with a portrait
 * who is not hidden (2026-11-27 user decision; content:build stops a post, comment or like of anyone else).
 */
export function snsShowsPerson(personId: string): boolean {
  if (personId === SNS_HEROINE) return true;
  const person = storyState.people.find((item) => item.id === personId);
  return !!person?.characterId && !person.sns?.hidden;
}

/**
 * A saved SNS record names only what this build knows, as the save's other references do: posts of the save's journey,
 * their photos (the heroine's taken), their `# likes:` people and their comments (of an arrived post), and likes of arrived
 * posts. Otherwise the save is not loaded and its data is kept (persistence loadGame).
 */
export function validateSns(state: GameState): void {
  const sns = snsOf(state);
  const journeyId = getJourneyForCity(state.currentCityId)?.id;
  const taken = new Set(state.album.map((photo) => photo.imageId));
  const fail = () => { throw new Error("SNSの記録の参照先が見つかりません。"); };
  for (const record of sns.posts) {
    const post = snsPost(record.id);
    if (!post || post.journeyId !== journeyId || getJourneyForCity(record.cityId)?.id !== journeyId) fail();
    if (record.imageIds.some((imageId) => !post!.imageIds.includes(imageId) || (post!.author === SNS_HEROINE && !taken.has(imageId)))) fail();
    if (record.likes.some((personId) => !post!.likes.some((like) => like.personId === personId))) fail();
  }
  for (const record of sns.comments) {
    const [postId, commentId] = record.id.split(".");
    if (!arrivedPost(state, postId) || !snsPost(postId)?.comments.some((comment) => comment.id === commentId) ||
        getJourneyForCity(record.cityId)?.id !== journeyId) fail();
  }
  if (sns.liked.some((postId) => !arrivedPost(state, postId))) fail();
}
