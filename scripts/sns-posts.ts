import path from "node:path";
import { parseConditionText, combineWhenUntil } from "../src/content/condition-text";
import type { Condition } from "../src/content/condition-schemas";
import { CONTENT_ID_PATTERN } from "../src/content/content-id";
import {
  SNS_HEROINE, SNS_IMAGE_FOLDER, snsImageIdOf, type SnsComment, type SnsImage, type SnsLine, type SnsPost,
} from "../src/content/sns";
import type { ContentWarning } from "./content-report";
import { displayPath, type ContentLayer, type ContentSources } from "./content-sources";
import { withoutComments } from "./place-files";

// content:build's SNS (2026-11-26 user decisions; authoring/SNS_PLAN.md 「札（書き方）」): each journey's
// `stories/posts/<city>.ink`, read statically into the posts of src/content/generated/sns.json (src/content/sns.ts). A knot
// is a post, a stitch a comment; nothing is played, so a posts file holds only knots, stitches, tags and lines. The build
// stops what would break the SNS (a missing photo, picture or person, a post ID twice, a choice, a `cond(…)`, an effect
// tag, a tag it does not know) and warns, without stopping, where reading would tire (4 comments or more on a post, 2 or
// more `# timing: later` comments on one). Light module (no content loading): unit tests call it directly.

/** A posts file as content-sources.ts lists it: `stories/posts/<city>.ink` of a journey folder. */
export type PostsSource = { cityId: string; file: string; layer: string; source: string };

/** The tags of a post's head, of a comment's head, and of a line. */
export const POST_HEAD_TAGS = ["post", "images", "where", "when", "until", "likes"] as const;
export const COMMENT_HEAD_TAGS = ["when", "until", "one_of", "timing"] as const;
export const SNS_LINE_TAGS = ["speaker", "translation"] as const;
/** The effect tags of the scenes: a comment changes nothing in the game (authoring/SNS_PLAN.md 「作らないもの」). */
const EFFECT_TAGS = ["give", "use", "rel", "profile", "memory", "set", "clue", "outfit", "money", "ap", "then", "requires", "on_done"];

/** How many comments on one post, and how many later ones, make the build warn (2026-11-26: reading should not tire). */
export const SNS_COMMENT_WARNING = 4;
export const SNS_LATER_WARNING = 2;

type Tag = { key: string; value: string; line: number };
type RawLine = { tags: Tag[]; text: string; line: number };
type RawPart = { id: string; line: number; head: Tag[]; lines: RawLine[] };
/** A post as read from its knot, before its names are checked against the content. */
export type ReadPost = { id: string; line: number; head: Tag[]; lines: RawLine[]; comments: RawPart[] };

const KNOT = /^\s*={2,}\s*([A-Za-z_][A-Za-z0-9_]*)\s*=*\s*$/u;
const STITCH = /^\s*=(?!=)\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/u;
const NAMES = /\{(?:heroine_name|player_name)\}/gu;

/** A line's tags (`# key: value`), in order. */
function tagsOf(text: string, line: number): Tag[] {
  return text.split("#").map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf(":");
    return separator < 0 ? { key: part, value: "", line } : { key: part.slice(0, separator).trim(), value: part.slice(separator + 1).trim(), line };
  });
}

/**
 * Read a posts file: its knots (posts) with their head tags and lines, and their stitches (comments). Throws, with the
 * line, for anything a post cannot hold: a choice, a gather, a divert, logic (`~`, `VAR`, `{…}` but the names set), a
 * `cond(…)`, text before the first knot or a stitch outside one. Tags are checked later (checkPost), once the parts are known.
 */
export function readPostsFile(raw: string): ReadPost[] {
  const posts: ReadPost[] = [];
  let part: RawPart | undefined;
  let pending: Tag[] = [];
  const fail = (line: number, message: string): never => { throw new Error(`${line}行目：${message}`); };
  withoutComments(raw).split("\n").forEach((source, index) => {
    const line = index + 1;
    const text = source.trim();
    if (!text) return;
    const knot = KNOT.exec(source);
    const stitch = STITCH.exec(source);
    if (knot || stitch) {
      if (pending.length) fail(pending[0].line, `札 # ${pending[0].key} の後に行がありません（a tag without its line）。`);
      if (knot) {
        const post: ReadPost = { id: knot[1], line, head: [], lines: [], comments: [] };
        posts.push(post);
        part = post;
      } else {
        const post = posts.at(-1);
        if (!post) fail(line, `コメント（stitch = ${stitch![1]}）は、投稿（knot === 投稿のID ===）の中に書きます（a stitch outside a post）。`);
        part = { id: stitch![1], line, head: [], lines: [] };
        post!.comments.push(part);
      }
      return;
    }
    if (!part) {
      // The top of the file: the lines a place file has, for Inky's preview.
      if (/^INCLUDE\s+modules\.ink$/u.test(text) || text === "-> DONE") return;
      fail(line, "投稿のファイルの最初の knot より前には、INCLUDE modules.ink と -> DONE だけを書けます（text before the first post）。");
    }
    if (text.startsWith("=")) fail(line, `投稿は === 投稿のID ===、コメントは = コメントの名前 の形で書きます（関数は書けません）：${text}（Invalid knot or stitch line）。`);
    if (/^[*+]/u.test(text)) fail(line, "投稿とコメントには選択肢を書けません。届いた後に文が変わらないよう、書き分けは # one_of: で（no choice in a post）。");
    if (/^(?:-(?!>)|->|<-|~|VAR\b|CONST\b|LIST\b|INCLUDE\b)/u.test(text) || text.includes("->") || text.includes("<-"))
      fail(line, `投稿とコメントには、分岐・処理・行き先を書けません：${text}（no gather, divert or logic in a post）。`);
    if (/\bcond\s*\(/u.test(text)) fail(line, "投稿とコメントには cond(…) を書けません。条件は頭の札 # when:・# until: で（no cond in a post）。");
    const hash = text.indexOf("#");
    const body = (hash < 0 ? text : text.slice(0, hash)).trim();
    const tags = hash < 0 ? [] : tagsOf(text.slice(hash), line);
    if (body.replace(NAMES, "").includes("{"))
      fail(line, `投稿とコメントの文に {…} を書けるのは {heroine_name} と {player_name} だけです：${body}（no Ink logic in a post's text）。`);
    if (!body) { pending.push(...tags); return; }
    const lineTags = [...pending, ...tags];
    pending = [];
    // The head: the tags before the part's first line that are head tags.
    if (!part!.lines.length) {
      const heads = "comments" in part! ? POST_HEAD_TAGS : COMMENT_HEAD_TAGS;
      part!.head.push(...lineTags.filter((tag) => (heads as readonly string[]).includes(tag.key)));
      part!.lines.push({ text: body, line, tags: lineTags.filter((tag) => !(heads as readonly string[]).includes(tag.key)) });
    } else part!.lines.push({ text: body, line, tags: lineTags });
  });
  if (pending.length) fail(pending[0].line, `札 # ${pending[0].key} の後に行がありません（a tag without its line）。`);
  return posts;
}

/** What a posts file's checks know of the content. */
export type PostsContext = {
  journeyId: string;
  cityId: string;
  /** The people of progression/story.json: whether each has a portrait and is hidden from the SNS. */
  people: readonly { id: string; characterId?: string; sns?: { hidden?: true } }[];
  /** The album images of the journey, and its SNS pictures. */
  albumImageIds: ReadonlySet<string>;
  snsImageIds: ReadonlySet<string>;
  /** The places of the post's city (`# where:`). */
  placeIds: ReadonlySet<string>;
};

/** Who may write or like on the SNS: the heroine, or a person with a portrait who is not hidden; else the reason in Japanese. */
function writerProblem(id: string, context: PostsContext): string | undefined {
  if (id === SNS_HEROINE) return undefined;
  const person = context.people.find((item) => item.id === id);
  if (!person) return `${id} は progression/story.json の people にいません（heroine か人物ID を書きます。Unknown person: ${id}）`;
  if (!person.characterId) return `${id} には立ち絵（characterId）がないので、SNS に出せません（Person without a portrait on the SNS: ${id}）`;
  if (person.sns?.hidden) return `${id} は SNS に出さない印（sns.hidden）が付いています（Hidden person on the SNS: ${id}）`;
  return undefined;
}

/** A line of a post or a comment: its speaker (`# speaker:`, else `defaultSpeaker`), text and `# translation:`. */
function checkLine(line: RawLine, context: PostsContext, defaultSpeaker?: string): SnsLine {
  const at = `${line.line}行目`;
  let speaker: string | undefined;
  let translationJa: string | undefined;
  for (const tag of line.tags) {
    if (EFFECT_TAGS.includes(tag.key))
      throw new Error(`${at}：投稿とコメントには効果の札 # ${tag.key}: を書けません。SNS は品物・お金・AP・関係値・フラグを変えません（no effect tag in a post）。`);
    if (!(SNS_LINE_TAGS as readonly string[]).includes(tag.key))
      throw new Error(`${at}：投稿とコメントの行に書けない札です：# ${tag.key}（書ける札は # speaker: と # translation:。Unknown post tag: ${tag.key}）。`);
    if (!tag.value) throw new Error(`${at}：# ${tag.key}: の値がありません（Empty tag: ${tag.key}）。`);
    if (tag.key === "speaker") {
      if (speaker !== undefined) throw new Error(`${at}：# speaker: が2つあります（Duplicate speaker）。`);
      speaker = tag.value;
    } else {
      if (translationJa !== undefined) throw new Error(`${at}：# translation: が2つあります（Duplicate translation）。`);
      translationJa = tag.value;
    }
  }
  speaker ??= defaultSpeaker;
  if (!speaker) throw new Error(`${at}：コメントの行には、誰の言葉かを # speaker: で書きます（a comment line needs # speaker:）。`);
  const problem = writerProblem(speaker, context);
  if (problem) throw new Error(`${at}：# speaker: ${speaker}：${problem}。`);
  return { speaker, textJa: line.text, ...(translationJa ? { translationJa } : {}) };
}

/** `# when:` and `# until:` of a head (each may be written more than once) as one condition. */
function headCondition(head: readonly Tag[]): Condition | undefined {
  const read = (key: string) => head.filter((tag) => tag.key === key).map((tag) => {
    try { return parseConditionText(tag.value); } catch (error) {
      throw new Error(`${tag.line}行目：# ${key}: ${tag.value}：${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  });
  return combineWhenUntil(read("when"), read("until"));
}

/** The one value of a head tag that may be written once (undefined when absent). */
function single(head: readonly Tag[], key: string): Tag | undefined {
  const tags = head.filter((tag) => tag.key === key);
  if (tags.length > 1) throw new Error(`${tags[1].line}行目：# ${key}: が2つあります（Duplicate ${key}）。`);
  if (tags[0] && !tags[0].value) throw new Error(`${tags[0].line}行目：# ${key}: の値がありません（Empty ${key}）。`);
  return tags[0];
}

/** `# likes: <id> … [if <condition>]`: each person (or the heroine) and the condition they like the post on. */
function likesOf(head: readonly Tag[], context: PostsContext): SnsPost["likes"] {
  return head.filter((tag) => tag.key === "likes").flatMap((tag) => {
    const [who, condition] = tag.value.split(/\s+if\s+/u);
    const ids = who.split(/\s+/u).filter(Boolean);
    if (!ids.length) throw new Error(`${tag.line}行目：# likes: には、いいねする人を書きます（# likes: <人物ID> …、条件は # likes: <人物ID> if <条件>）。`);
    let when: Condition | undefined;
    if (condition !== undefined) {
      try { when = parseConditionText(condition); } catch (error) {
        throw new Error(`${tag.line}行目：# likes: の条件 ${condition}：${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
    }
    return ids.map((personId) => {
      const problem = writerProblem(personId, context);
      if (problem) throw new Error(`${tag.line}行目：# likes: ${personId}：${problem}。`);
      return { personId, ...(when ? { when } : {}) };
    });
  });
}

/** A comment (a stitch) of a post. */
function checkComment(part: RawPart, context: PostsContext): SnsComment {
  if (!CONTENT_ID_PATTERN.test(part.id))
    throw new Error(`${part.line}行目：コメントの名前 ${part.id} には英小文字・数字・_ だけを使い、英小文字で始めます（Invalid comment ID）。`);
  if (!part.lines.length) throw new Error(`${part.line}行目：コメント ${part.id} に行がありません（a comment without a line）。`);
  const timing = single(part.head, "timing");
  if (timing && timing.value !== "later") throw new Error(`${timing.line}行目：# timing: に書けるのは later だけです（# timing: later）。`);
  const oneOf = single(part.head, "one_of");
  if (oneOf && !CONTENT_ID_PATTERN.test(oneOf.value)) throw new Error(`${oneOf.line}行目：# one_of: の名前 ${oneOf.value} には英小文字・数字・_ だけを使います。`);
  const when = headCondition(part.head);
  return {
    id: part.id, lines: part.lines.map((line) => checkLine(line, context)),
    ...(when ? { when } : {}), ...(timing ? { later: true as const } : {}), ...(oneOf ? { oneOf: oneOf.value } : {}),
  };
}

/** A post (a knot) checked against the content: its writer, pictures, place, conditions, line, likes and comments. */
export function checkPost(read: ReadPost, context: PostsContext): SnsPost {
  const at = `${read.line}行目の投稿 ${read.id}`;
  if (!CONTENT_ID_PATTERN.test(read.id))
    throw new Error(`${at}：投稿のID（knot の名前）には英小文字・数字・_ だけを使い、英小文字で始めます（Invalid post ID）。`);
  const author = single(read.head, "post");
  if (!author) throw new Error(`${at}：投稿の頭に、投稿した人 # post: heroine（か人物ID）を書きます（a post needs # post:）。`);
  const problem = writerProblem(author.value, context);
  if (problem) throw new Error(`${author.line}行目：# post: ${author.value}：${problem}。`);
  const images = single(read.head, "images");
  if (!images) throw new Error(`${at}：投稿の頭に、載せる絵 # images: <絵ID> … を1枚以上書きます（a post needs # images:）。`);
  const imageIds = images.value.split(/\s+/u).filter(Boolean);
  for (const imageId of imageIds) {
    const known = context.albumImageIds.has(imageId) || (author.value !== SNS_HEROINE && context.snsImageIds.has(imageId));
    if (!known)
      throw new Error(`${images.line}行目：# images: ${imageId}：${author.value === SNS_HEROINE
        ? "この旅行編のアルバムの絵（public/assets/album/）にありません。ヒロインの投稿にはアルバムの写真を載せます"
        : `この旅行編のアルバムの絵（public/assets/album/）にも SNS の絵（public/${SNS_IMAGE_FOLDER}/）にもありません`}（Unknown post image: ${imageId}）。`);
  }
  if (new Set(imageIds).size !== imageIds.length) throw new Error(`${images.line}行目：# images: に同じ絵を2回書いています（Duplicate post image）。`);
  const whereTag = single(read.head, "where");
  if (whereTag && author.value === SNS_HEROINE)
    throw new Error(`${whereTag.line}行目：ヒロインの投稿には # where: を書きません。場所は写真を撮った所を出します（# where: is for a person's post）。`);
  let where: SnsPost["where"];
  if (whereTag) {
    if (CONTENT_ID_PATTERN.test(whereTag.value) && !context.placeIds.has(whereTag.value))
      throw new Error(`${whereTag.line}行目：# where: ${whereTag.value} は、この都市の地点（travel/${context.cityId}.json の places）にありません。` +
        "地点のIDか、場所の名前（日本語）を書きます（Unknown post place）。");
    where = context.placeIds.has(whereTag.value) ? { placeId: whereTag.value } : { nameJa: whereTag.value };
  }
  if (!read.lines.length) throw new Error(`${at}：投稿の頭の後に、投稿の一言を1行書きます（a post needs its line）。`);
  if (read.lines.length > 1)
    throw new Error(`${read.lines[1].line}行目：投稿の一言は1行です。2行目からはコメント（= コメントの名前）に書きます（a post has one line）。`);
  const line = checkLine(read.lines[0], context, author.value);
  if (line.speaker !== author.value)
    throw new Error(`${read.lines[0].line}行目：投稿の一言は投稿した人（${author.value}）の言葉です：# speaker: ${line.speaker}（the post's line is its writer's）。`);
  const ids = read.comments.map((comment) => comment.id);
  const twice = ids.find((id, index) => ids.indexOf(id) !== index);
  if (twice) throw new Error(`${at}：同じ名前のコメントが2つあります：${twice}（Duplicate comment ID）。`);
  const when = headCondition(read.head);
  return {
    id: read.id, journeyId: context.journeyId, cityId: context.cityId, author: author.value, imageIds,
    ...(where ? { where } : {}), ...(when ? { when } : {}), line, likes: likesOf(read.head, context),
    comments: read.comments.map((comment) => checkComment(comment, context)),
  };
}

/** The warnings of the posts: a post with SNS_COMMENT_WARNING comments or more, or SNS_LATER_WARNING later ones or more. */
export function postWarnings(posts: readonly (SnsPost & { file: string })[]): ContentWarning[] {
  return posts.flatMap((post) => [
    ...(post.comments.length >= SNS_COMMENT_WARNING ? [{ kind: "sns-reading" as const,
      message: `SNS の投稿 ${post.id}（${post.file}）にコメントが${post.comments.length}件あります。読み疲れないよう、1つの投稿に2件くらいまでにします` +
        `（${post.comments.length} comments on one post）` }] : []),
    ...(post.comments.filter((comment) => comment.later).length >= SNS_LATER_WARNING ? [{ kind: "sns-reading" as const,
      message: `SNS の投稿 ${post.id}（${post.file}）に、後から届くコメント（# timing: later）が${post.comments.filter((comment) => comment.later).length}件あります` +
        "（several later comments on one post）" }] : []),
  ]);
}

/** The journey layer whose public/assets/sns/ holds `file`, if any. */
export function snsFolderLayer(sources: Pick<ContentSources, "layers">, file: string): ContentLayer | undefined {
  return sources.layers.find((layer) => layer.type === "journey" &&
    file.startsWith(path.join(layer.directory, "public", ...SNS_IMAGE_FOLDER.split("/")) + path.sep));
}

/**
 * Every SNS picture of the journeys (a journey's public/assets/sns/<ID>.<webp|png|jpg|jpeg>): Dreamscape's own artwork, as
 * the album's (image-rights.ts asks nothing for them). Throws for a file named otherwise, an ID twice, or an ID of an album
 * image (a post's `# images:` names both kinds by their IDs).
 */
export function snsImagesOf(sources: Pick<ContentSources, "root" | "layers" | "publicFiles">, albumImageIds: ReadonlySet<string>): SnsImage[] {
  const images: SnsImage[] = [];
  const errors: string[] = [];
  for (const [assetPath, file] of sources.publicFiles) {
    const layer = snsFolderLayer(sources, file);
    if (!layer) continue;
    const id = snsImageIdOf(assetPath);
    if (id === undefined) errors.push(`SNS の絵のファイル名が使えません：${displayPath(sources.root, file)}。public/${SNS_IMAGE_FOLDER}/ の直下に「ID.webp」の名前で置きます` +
      `（ID は英小文字・数字・_。Invalid SNS image file: ${assetPath}）。`);
    else if (images.some((image) => image.id === id) || albumImageIds.has(id))
      errors.push(`SNS の絵のIDが、ほかの SNS の絵かアルバムの絵と同じです：${displayPath(sources.root, file)}（Duplicate SNS image ID: ${id}）。`);
    else images.push({ id, path: assetPath, journeyId: layer.id });
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return images;
}

const PHOTO_LINE = /#\s*photo\s*:\s*([^#]*)/u;
const PHOTO_WITH = /#\s*photo_with\s*:\s*([^#]*)/u;

/**
 * The people a story's photos show (`# photo_with: <人物ID> …` on the source line of its `# photo:`; 2026-11-26), read
 * statically as the album tags are (album-images.ts): album image → people, in the order written. Throws for a
 * `# photo_with:` on a line without `# photo:`, an empty one, or a person progression/story.json does not declare.
 */
export function photoWithOf(source: string, personIds: ReadonlySet<string>): Map<string, string[]> {
  const shows = new Map<string, string[]>();
  withoutComments(source).split("\n").forEach((text, index) => {
    const withTag = PHOTO_WITH.exec(text);
    if (!withTag) return;
    const photo = PHOTO_LINE.exec(text)?.[1].trim();
    const at = `${index + 1}行目`;
    if (!photo) throw new Error(`${at}：# photo_with: は、写真の札 # photo: と同じ行に書きます（# photo_with: without # photo: on its line）。`);
    const people = withTag[1].trim().split(/\s+/u).filter(Boolean);
    if (!people.length) throw new Error(`${at}：# photo_with: に、写っている人の人物ID を書きます（Empty photo_with）。`);
    for (const id of people)
      if (!personIds.has(id)) throw new Error(`${at}：# photo_with: ${id} は progression/story.json の people にいません（Unknown person in photo_with: ${id}）。`);
    shows.set(photo, [...new Set([...(shows.get(photo) ?? []), ...people])]);
  });
  return shows;
}

/** What validateSns reads of the validated content. */
export type SnsContent = {
  root: string;
  layers: ContentLayer[];
  postFiles: readonly PostsSource[];
  storyFiles: readonly { id: string; file: string; source: string }[];
  publicFiles: ReadonlyMap<string, string>;
  journeys: readonly { id: string; cities: readonly { id: string }[] }[];
  people: readonly { id: string; cityId: string; characterId?: string; sns?: { hidden?: true; iconCostume?: string } }[];
  /** progression/story.json `heroineSns` by journey, and the file each key comes from (its provenance). */
  heroineSns: Readonly<Record<string, { iconCostume?: string }>>;
  heroineSnsFiles: Readonly<Record<string, string | undefined>>;
  /** Each portrait's outfits (characters.json `costumes`). */
  costumes: ReadonlyMap<string, readonly string[]>;
  albumImages: readonly { id: string; journeyId: string }[];
  placesOfCity: ReadonlyMap<string, readonly string[]>;
};

/**
 * The SNS of every journey (src/content/generated/sns.json) and its warnings. Throws for what would break it (Japanese
 * first): a posts file of a city its journey does not have, a post ID twice in the build, a post's problems (checkPost),
 * a person's icon outfit their portrait does not have, the heroine's written by another journey's folder, a `# photo_with:`
 * naming an unknown person.
 */
export function validateSns(content: SnsContent): { posts: SnsPost[]; images: SnsImage[]; photoWith: Record<string, string[]>; warnings: ContentWarning[] } {
  const show = (file: string) => displayPath(content.root, file);
  for (const person of content.people) {
    const costume = person.sns?.iconCostume;
    if (costume !== undefined && !(person.characterId && content.costumes.get(person.characterId)?.includes(costume)))
      throw new Error(`アイコンの服がありません：progression/story.json の people "${person.id}" の sns.iconCostume "${costume}" は、` +
        `その人の立ち絵（characterId）の costumes にありません（Unknown SNS icon costume: ${person.id}/${costume}）。`);
  }
  for (const [journeyId, heroine] of Object.entries(content.heroineSns)) {
    const layer = content.layers.find((item) => item.type === "journey" && item.id === journeyId);
    const file = content.heroineSnsFiles[journeyId];
    if (!layer || (file !== undefined && !file.startsWith(layer.directory + path.sep)))
      throw new Error(`progression/story.json の heroineSns "${journeyId}" は、その旅行編のフォルダの progression/story.json に書きます` +
        `（heroineSns of another journey: ${journeyId}）。`);
    if (heroine.iconCostume !== undefined && !content.costumes.get(SNS_HEROINE)?.includes(heroine.iconCostume))
      throw new Error(`アイコンの服がありません：heroineSns "${journeyId}" の iconCostume "${heroine.iconCostume}" は、ヒロインの costumes にありません` +
        `（Unknown SNS icon costume: heroine/${heroine.iconCostume}）。`);
  }
  const albumIds = new Set(content.albumImages.map((image) => image.id));
  const images = snsImagesOf(content, albumIds);
  const posts: (SnsPost & { file: string })[] = [];
  for (const posted of content.postFiles) {
    const file = show(posted.file);
    const journey = content.journeys.find((item) => item.id === posted.layer);
    if (!journey?.cities.some((city) => city.id === posted.cityId))
      throw new Error(`${file}：投稿のファイルの名前は、この旅行編の都市のID にします（stories/posts/<都市>.ink。Unknown posts city: ${posted.cityId}）。`);
    const context: PostsContext = {
      journeyId: journey.id, cityId: posted.cityId, people: content.people,
      albumImageIds: new Set(content.albumImages.filter((image) => image.journeyId === journey.id).map((image) => image.id)),
      snsImageIds: new Set(images.filter((image) => image.journeyId === journey.id).map((image) => image.id)),
      placeIds: new Set(content.placesOfCity.get(posted.cityId) ?? []),
    };
    for (const read of (() => { try { return readPostsFile(posted.source); } catch (error) { throw new Error(`${file}：${(error as Error).message}`, { cause: error }); } })()) {
      let post: SnsPost;
      try { post = checkPost(read, context); } catch (error) { throw new Error(`${file}：${(error as Error).message}`, { cause: error }); }
      const previous = posts.find((item) => item.id === post.id);
      if (previous) throw new Error(`同じIDの投稿が2つあります：${post.id}（${previous.file} と ${file}）。投稿のIDは、すべての旅行編で1つだけにします（Duplicate post ID）。`);
      posts.push({ ...post, file });
    }
  }
  const personIds = new Set(content.people.map((person) => person.id));
  const photoWith: Record<string, string[]> = {};
  for (const story of content.storyFiles) {
    let shows: Map<string, string[]>;
    try { shows = photoWithOf(story.source, personIds); } catch (error) { throw new Error(`${show(story.file)}：${(error as Error).message}`, { cause: error }); }
    for (const [imageId, people] of shows) photoWith[imageId] = [...new Set([...(photoWith[imageId] ?? []), ...people])];
  }
  return { posts: posts.map(({ file: _file, ...post }) => post), images, photoWith, warnings: postWarnings(posts) };
}
