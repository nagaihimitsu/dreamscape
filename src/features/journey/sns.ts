import { cityContents, getAlbumImage, getSnsImage, snsData, storyState } from "../../content";
import { pictureThumbPath } from "../../content/derived-images";
import { getJourneyForCity } from "../../content/journeys";
import { SNS_HEROINE, snsCommentId, type SnsLine, type SnsPost } from "../../content/sns";
import type { AlbumPhoto } from "../../domain/album-state";
import type { GameState } from "../../domain/game";
import { metPeople } from "../../domain/met-people";
import { metTimeOf } from "../../domain/met-times";
import {
  likesPost, postLikers, sameNight, snsOf, snsPost, snsShowsPerson, type SnsNight,
} from "../../domain/sns";
import { withNames } from "../romance/names";
import { placeDisplayName } from "./travel-labels";

// What the SNS's screens read (2026-11-26 user decisions; authoring/SNS_PLAN.md 「画面」): pure readers of the save's SNS
// record (src/domain/sns.ts) and the content, the names set filled in. The timeline (snsTimeline), the people met
// (snsMetPeople), a person's page (snsPersonPage), the heroine's page (snsHeroinePage) and what came on a night
// (snsNightArrivals). What is new to the player (the dots) is the screen's own memory of the tab: each post and comment
// says when it came.

/** A face on the SNS: whose, their name, and the icon (the portrait and its outfit; the person's own, fixed). */
export type SnsFace = { id: string; nameJa: string; characterId?: string; costume?: string };
/** A line as shown: the text and its translation, the names filled in. */
export type SnsText = { textJa: string; translationJa?: string };
/**
 * One photo of a post: the picture's served path and its square copy (`thumbPath`, the grids'), the place it shows, and for
 * the heroine's the album's record of it.
 */
export type SnsPhotoView = { imageId: string; path?: string; thumbPath?: string; placeNameJa?: string; album?: AlbumPhoto };
/** A comment as shown: its writer, its lines (the comment, then the replies) and the night it came (none on a past post). */
export type SnsCommentView = { id: string; writer: SnsFace; lines: (SnsText & { speaker: SnsFace })[]; arrived?: SnsNight };
/**
 * A post as shown. `likers`: the faces of those who like it (postLikers); `liked`: the player likes it. `arrived`: the night
 * it came; a past post (`# past:`, 2026-11-27) has none but `pastJa`, when it was posted (「去年の冬」), and no player's like.
 */
export type SnsPostView = {
  id: string; author: SnsFace; photos: SnsPhotoView[]; line: SnsText; comments: SnsCommentView[]; likers: SnsFace[]; liked: boolean;
  arrived?: SnsNight; pastJa?: string;
};
/**
 * A day of the timeline (the night the posts came): its city and day, the faces of the people first met that day, and the
 * posts of the night, the day's one card (2026-11-27 user decision: a slide a photo, turned sideways): the heroine's first,
 * in the order written, then the people's, in the order they came.
 */
export type SnsDay = { cityId: string; cityNameJa: string; day: number; met: SnsFace[]; posts: SnsPostView[] };

const cityName = (cityId: string) => cityContents[cityId]?.city.nameJa ?? cityId;
const journeyOf = (game: Pick<GameState, "currentCityId">) => getJourneyForCity(game.currentCityId)?.id ?? "";

/** The face of the heroine or a person on the SNS (the heroine's outfit: progression/story.json `heroineSns`). */
export function snsFace(game: Readonly<GameState>, id: string): SnsFace {
  if (id === SNS_HEROINE) {
    const costume = storyState.heroineSns[journeyOf(game)]?.iconCostume;
    return { id, nameJa: game.heroineName, characterId: "heroine", ...(costume ? { costume } : {}) };
  }
  const person = storyState.people.find((item) => item.id === id);
  if (!person) return { id, nameJa: id };
  return { id, nameJa: person.nameJa, ...(person.characterId ? { characterId: person.characterId } : {}),
    ...(person.sns?.iconCostume ? { costume: person.sns.iconCostume } : {}) };
}

const textOf = (game: Readonly<GameState>, line: SnsLine): SnsText =>
  ({ textJa: withNames(line.textJa, game), ...(line.translationJa ? { translationJa: withNames(line.translationJa, game) } : {}) });

/** A place's name as the screens write it, in its city. */
function placeName(game: Readonly<GameState>, cityId: string, placeId: string): string | undefined {
  const place = cityContents[cityId]?.travel.places.find((item) => item.id === placeId);
  return place ? placeDisplayName(game, place) : undefined;
}

/** An album or SNS picture's served path and square copy. */
export function snsPicture(imageId: string): { path?: string; thumbPath?: string } {
  const image = getAlbumImage(imageId) ?? getSnsImage(imageId);
  return image ? { path: image.path, thumbPath: pictureThumbPath(image) } : {};
}

function photosOf(game: Readonly<GameState>, post: SnsPost, imageIds: readonly string[]): SnsPhotoView[] {
  return imageIds.map((imageId) => {
    const { path, thumbPath } = snsPicture(imageId);
    const album = post.author === SNS_HEROINE ? game.album.find((photo) => photo.imageId === imageId) : undefined;
    const placeNameJa = album ? placeName(game, album.cityId, album.placeId)
      : post.where && "placeId" in post.where ? placeName(game, post.cityId, post.where.placeId) : post.where?.nameJa;
    return { imageId, ...(path ? { path } : {}), ...(thumbPath ? { thumbPath } : {}), ...(placeNameJa ? { placeNameJa } : {}), ...(album ? { album } : {}) };
  });
}

/**
 * A past post as shown (`# past:`): all its photos and comments, always the same; those who like it are its commenters, then
 * its `# likes:` people (its writer left out). Read on its writer's page, which the SNS opens only for someone met.
 */
function pastPostView(game: Readonly<GameState>, post: SnsPost & { past: string }): SnsPostView {
  const comments = post.comments.map((comment): SnsCommentView => ({ id: snsCommentId(post.id, comment.id),
    writer: snsFace(game, comment.lines[0].speaker), lines: comment.lines.map((line) => ({ speaker: snsFace(game, line.speaker), ...textOf(game, line) })) }));
  const likers = [...new Set([...post.comments.map((comment) => comment.lines[0].speaker), ...post.likes.map((like) => like.personId)])]
    .filter((id) => id !== post.author);
  return { id: post.id, author: snsFace(game, post.author), photos: photosOf(game, post, post.imageIds), line: textOf(game, post.line),
    comments, likers: likers.map((id) => snsFace(game, id)), liked: false, pastJa: post.past };
}

/** A post as shown: an arrived one with its arrived comments in the order they came, or a past one (pastPostView). */
export function snsPostView(game: Readonly<GameState>, postId: string): SnsPostView | null {
  const post = snsPost(postId);
  if (post?.past) return pastPostView(game, { ...post, past: post.past });
  const record = snsOf(game).posts.find((item) => item.id === postId);
  if (!post || !record) return null;
  const comments = snsOf(game).comments.flatMap((arrived): SnsCommentView[] => {
    const comment = post.comments.find((item) => snsCommentId(post.id, item.id) === arrived.id);
    if (!comment) return [];
    const { id: _id, ...night } = arrived;
    return [{ id: arrived.id, writer: snsFace(game, comment.lines[0].speaker), arrived: night,
      lines: comment.lines.map((line) => ({ speaker: snsFace(game, line.speaker), ...textOf(game, line) })) }];
  });
  const { cityId, day, minute } = record;
  return { id: post.id, author: snsFace(game, post.author), photos: photosOf(game, post, record.imageIds), line: textOf(game, post.line),
    comments, likers: postLikers(game, post.id).map((id) => snsFace(game, id)), liked: likesPost(game, post.id), arrived: { cityId, day, minute } };
}

/** A post's own page's heading: its night (「デリー · 2日目」), or for a past post its writer and when (「モヌ · 去年の冬」). */
export function snsPostPageTitle(view: Pick<SnsPostView, "arrived" | "pastJa" | "author">): string {
  if (view.arrived) return `${cityName(view.arrived.cityId)} · ${view.arrived.day}日目`;
  return view.pastJa ? `${view.author.nameJa} · ${view.pastJa}` : view.author.nameJa;
}

/** The faces of the people first met on a day (the save's metTimes), in the order met; only those the SNS shows. */
function metOn(game: Readonly<GameState>, night: Pick<SnsNight, "cityId" | "day">): SnsFace[] {
  return (game.metTimes ?? []).filter((item) => sameNight(item, night) && snsShowsPerson(item.id)).map((item) => snsFace(game, item.id));
}

/**
 * The timeline (トップ): a day for each night something came, the newest first, each the day's one card: the heroine's posts
 * of that night (in the order written), then the people's (in the order they came).
 */
export function snsTimeline(game: Readonly<GameState>): SnsDay[] {
  const days: (SnsDay & { people: SnsPostView[] })[] = [];
  for (const record of snsOf(game).posts) {
    const view = snsPostView(game, record.id);
    if (!view) continue;
    let day = days.find((item) => sameNight(item, record));
    if (!day) {
      day = { cityId: record.cityId, cityNameJa: cityName(record.cityId), day: record.day, met: metOn(game, record), posts: [], people: [] };
      days.push(day);
    }
    (view.author.id === SNS_HEROINE ? day.posts : day.people).push(view);
  }
  const order = snsData.posts.map((post) => post.id);
  return days.reverse().map(({ people, posts, ...day }) =>
    ({ ...day, posts: [...posts.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)), ...people] }));
}

/** One person in 「出会った人」: their face and the first line of their self-introduction. */
export type SnsMetPerson = SnsFace & { introFirstJa?: string };
/** 「出会った人」: the people met so far whom the SNS shows, by city in travel order, in a city in the order met. */
export function snsMetPeople(game: Readonly<GameState>): { cityId: string; cityNameJa: string; people: SnsMetPerson[] }[] {
  const groups: { cityId: string; cityNameJa: string; people: SnsMetPerson[] }[] = [];
  const cities = getJourneyForCity(game.currentCityId)?.cities.map((city) => city.id) ?? [];
  const met = metPeople(game).filter((entry) => snsShowsPerson(entry.id))
    .sort((a, b) => cities.indexOf(a.cityId) - cities.indexOf(b.cityId));
  for (const entry of met) {
    let group = groups.find((item) => item.cityId === entry.cityId);
    if (!group) groups.push(group = { cityId: entry.cityId, cityNameJa: cityName(entry.cityId), people: [] });
    const intro = storyState.people.find((person) => person.id === entry.id)?.sns?.introJa?.[0];
    group.people.push({ ...snsFace(game, entry.id), ...(intro ? { introFirstJa: withNames(intro, game) } : {}) });
  }
  return groups;
}

/** A photo on a person's page: the post it opens (none for a photo they are in), the picture, its served path and square copy. */
export type SnsTile = { postId?: string; imageId: string; path?: string; thumbPath?: string };
const tileOf = (postId: string, photo: SnsPhotoView): SnsTile =>
  ({ postId, imageId: photo.imageId, ...(photo.path ? { path: photo.path } : {}), ...(photo.thumbPath ? { thumbPath: photo.thumbPath } : {}) });

/**
 * A person's page (one for the whole journey): their own words (face, name, self-introduction), the heroine's note (their
 * role, where and when they were first met: none for a save that did not keep it), their photos (their posts' photos, the
 * newest first, then their past posts' in the order written: the newest written first), their comments on her posts (with
 * the post's first photo) and the album's photos they are in
 * (`# photo_with:`, in the order taken). Null for someone the SNS does not show.
 */
export type SnsPersonPage = {
  face: SnsFace;
  introJa: string[];
  note: { titleJa?: string; met?: { cityNameJa: string; day: number; placeNameJa?: string } };
  photos: SnsTile[];
  comments: { post: SnsTile; comment: SnsCommentView }[];
  withPhotos: AlbumPhoto[];
};
export function snsPersonPage(game: Readonly<GameState>, personId: string): SnsPersonPage | null {
  const person = storyState.people.find((item) => item.id === personId);
  if (!person || !snsShowsPerson(personId)) return null;
  const time = metTimeOf(game, personId);
  const views = snsOf(game).posts.flatMap((record) => snsPostView(game, record.id) ?? []);
  return {
    face: snsFace(game, personId),
    introJa: (person.sns?.introJa ?? []).map((line) => withNames(line, game)),
    note: {
      ...(person.titleJa ? { titleJa: withNames(person.titleJa, game) } : {}),
      ...(time ? { met: { cityNameJa: cityName(time.cityId), day: time.day,
        ...(placeName(game, time.cityId, time.placeId) ? { placeNameJa: placeName(game, time.cityId, time.placeId) } : {}) } } : {}),
    },
    photos: [...views.filter((view) => view.author.id === personId).reverse(),
      ...snsData.posts.filter((post) => post.past && post.author === personId).flatMap((post) => snsPostView(game, post.id) ?? [])]
      .flatMap((view) => view.photos.map((photo) => tileOf(view.id, photo))),
    comments: views.filter((view) => view.author.id === SNS_HEROINE).flatMap((view) => view.comments
      .filter((comment) => comment.writer.id === personId)
      .map((comment) => ({ post: tileOf(view.id, view.photos[0]), comment }))),
    withPhotos: game.album.filter((photo) => snsData.photoWith[photo.imageId]?.includes(personId)),
  };
}

/**
 * The heroine's page: her face and self-introduction (progression/story.json `heroineSns`) and her day cards, the newest
 * first (the timeline's days, her posts only).
 */
export function snsHeroinePage(game: Readonly<GameState>): { face: SnsFace; introJa: string[]; days: SnsDay[] } {
  return {
    face: snsFace(game, SNS_HEROINE),
    introJa: (storyState.heroineSns[journeyOf(game)]?.introJa ?? []).map((line) => withNames(line, game)),
    days: snsTimeline(game).map((day) => ({ ...day, posts: day.posts.filter((post) => post.author.id === SNS_HEROINE) }))
      .filter((day) => day.posts.length),
  };
}

/**
 * What came on a night (the night screen's card, the city and day of `night`): the posts and the comments that came, in
 * the order they came, and the faces of their writers (each once; the comments' first). Empty lists for a quiet night.
 */
export function snsNightArrivals(game: Readonly<GameState>, night: Pick<SnsNight, "cityId" | "day">): {
  posts: SnsPostView[]; comments: { postId: string; comment: SnsCommentView }[]; faces: SnsFace[];
} {
  const sns = snsOf(game);
  const posts = sns.posts.filter((record) => sameNight(record, night)).flatMap((record) => snsPostView(game, record.id) ?? []);
  const comments = sns.comments.filter((record) => sameNight(record, night)).flatMap((record) => {
    const postId = record.id.split(".")[0];
    const comment = snsPostView(game, postId)?.comments.find((item) => item.id === record.id);
    return comment ? [{ postId, comment }] : [];
  });
  const faces = [...comments.map((item) => item.comment.writer), ...posts.map((post) => post.author)]
    .filter((face, index, all) => all.findIndex((other) => other.id === face.id) === index);
  return { posts, comments, faces };
}

/** Whether the journey has an SNS: some post written for it (without, 旅の記録 shows 「写真」 alone; 2026-11-26). */
export const journeyHasSns = (game: Pick<GameState, "currentCityId">): boolean =>
  snsData.posts.some((post) => post.journeyId === journeyOf(game));

/**
 * The night screen's SNS card (2026-11-27): the faces of who wrote tonight (snsNightArrivals; the heroine's own only when
 * nothing else came), its words and the first of
 * what came, the post it opens. 「SNS にコメントが届きました」 and the first comment when a comment came, else 「SNS に新しい
 * 投稿があります」 and the first post's line. Null for a quiet night. No count (the faces say that some came).
 */
export type SnsNightCard = { faces: SnsFace[]; titleJa: string; first: { nameJa: string; textJa: string }; postId: string };
export function snsNightCard(game: Readonly<GameState>, night: Pick<SnsNight, "cityId" | "day">): SnsNightCard | null {
  const arrivals = snsNightArrivals(game, night);
  const { posts, comments } = arrivals;
  // Whose words came: the others' faces (hers only when nothing else came: her own post of the night).
  const others = arrivals.faces.filter((face) => face.id !== SNS_HEROINE);
  const faces = others.length ? others : arrivals.faces;
  const [comment] = comments;
  if (comment) return { faces, titleJa: "SNS にコメントが届きました", postId: comment.postId,
    first: { nameJa: comment.comment.writer.nameJa, textJa: comment.comment.lines[0].textJa } };
  const [post] = posts;
  return post ? { faces, titleJa: "SNS に新しい投稿があります", postId: post.id, first: { nameJa: post.author.nameJa, textJa: post.line.textJa } } : null;
}

/** The IDs of everything arrived (posts, then comments `<post>.<comment>`): GameApp's marks of what is new on the SNS. */
export const snsArrivedIds = (game: Pick<GameState, "sns">): string[] =>
  [...snsOf(game).posts.map((post) => post.id), ...snsOf(game).comments.map((comment) => comment.id)];
