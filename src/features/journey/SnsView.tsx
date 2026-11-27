import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CharacterFace } from "../../components/CharacterPortrait";
import { Icon } from "../../components/icons";
import { getAlbumImage } from "../../content";
import { pictureThumbPath } from "../../content/derived-images";
import { SNS_HEROINE } from "../../content/sns";
import type { GameState } from "../../domain/game";
import { snsShowsPerson } from "../../domain/sns";
import { JourneyNumbersCard } from "./JourneyNumbers";
import type { JourneyNumbers } from "./journey-numbers";
import {
  snsHeroinePage, snsMetPeople, snsPersonPage, snsPostPageTitle, snsPostView, snsTimeline,
  type SnsCommentView, type SnsDay, type SnsFace, type SnsMetPerson, type SnsPhotoView, type SnsPostView,
} from "./sns";
import { useSwipe } from "./useSwipe";
import "./sns.css";

// 旅の記録's 「SNS」 (2026-11-26・27 user decisions; authoring/SNS_PLAN.md 「画面」): the timeline of the nights (a night's two
// cards, a photo a slide: the heroine's posts, and under them the people's), the comments and likes under each, the people met and their pages,
// the heroine's page with 旅の数字. Read-only but for the player's like (a heart; no count anywhere). Each page opens in
// place inside 旅の記録 and 「‹」 goes back to where the page before it was. A photo opens larger over it (TravelLog's viewer).

const served = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/** A page over the timeline. */
type Page = { kind: "people"; day?: SnsDay } | { kind: "person"; personId: string } | { kind: "heroine" } | { kind: "post"; postId: string };

/** What the cards and pages do: open a person's page (the heroine's too), a photo larger, a post; like a post. */
type Actions = {
  onPerson: (id: string) => void;
  onPhoto: (photo: SnsPhotoView, post?: SnsPostView) => void;
  onLike?: (postId: string) => void;
  newIds: ReadonlySet<string>;
};

/** The paper's tilt of a slide (a few tenths of a degree, in turn), so neighbouring prints lie differently. */
const TILTS = [-0.9, 0.6, -0.4, 0.8];

/**
 * 「SNS」 inside 旅の記録. `newIds`: the comments new to the player as 旅の記録 opened (GameApp's marks; a small red dot before
 * the name, and by the post's dots). `openPostId`: the post to open on (the night screen's card): the timeline at its card, on
 * its first photo. `numbers`: 旅の数字 on the heroine's page. `onLike`: none for a kept journey (its likes only show).
 */
export function SnsView({ game, newIds, openPostId, numbers, reduceMotion, onLike, onPhoto }: {
  game: GameState;
  newIds: ReadonlySet<string>;
  openPostId?: string;
  numbers: JourneyNumbers | null;
  reduceMotion: boolean;
  onLike?: (postId: string) => void;
  /** A photo pressed (an album photo they are in has no post). */
  onPhoto: (photo: SnsPhotoView, post?: SnsPostView) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Page[]>([]);
  // Where each page was opened from (its button, focused again on the way back) and the timeline's scroll then.
  const openers = useRef<(HTMLElement | null)[]>([]);
  const topScroll = useRef(0);
  const moved = useRef<"in" | "back" | null>(null);
  const dialog = () => root.current?.closest("dialog") ?? null;
  function open(page: Page) {
    openers.current.push(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    if (!pages.length) topScroll.current = dialog()?.scrollTop ?? 0;
    moved.current = "in";
    setPages((current) => [...current, page]);
  }
  function back() {
    moved.current = "back";
    setPages((current) => current.slice(0, -1));
  }
  const onPerson = (id: string) => {
    if (id === SNS_HEROINE) open({ kind: "heroine" });
    else if (snsShowsPerson(id)) open({ kind: "person", personId: id });
  };
  const actions: Actions = { onPerson, onPhoto, onLike, newIds };
  useLayoutEffect(() => {
    const how = moved.current;
    moved.current = null;
    const frame = dialog();
    if (how === "in") {
      if (frame) frame.scrollTop = 0;
      root.current?.querySelector<HTMLElement>(".sns-page:not([hidden]) .sns-page-title")?.focus({ preventScroll: true });
    } else if (how === "back") {
      if (frame && !pages.length) frame.scrollTop = topScroll.current;
      const opener = openers.current.pop();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length]);
  // Opened on a post (the night's card): its card at the top of the view.
  useLayoutEffect(() => {
    if (!openPostId) return;
    const card = [...(root.current?.querySelectorAll<HTMLElement>("[data-sns-posts]") ?? [])]
      .find((element) => element.dataset.snsPosts?.split(" ").includes(openPostId));
    card?.scrollIntoView({ block: "start" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const page = pages.at(-1);
  const backLabel = (index: number) => {
    const before = pages[index - 1];
    if (!before) return "SNS";
    if (before.kind === "people") return "出会った人";
    if (before.kind === "person") return snsPersonPage(game, before.personId)?.face.nameJa ?? "戻る";
    if (before.kind === "heroine") return game.heroineName;
    return "投稿";
  };
  return <div ref={root} className="sns" data-testid="sns">
    <div hidden={!!page}><SnsTop game={game} openPostId={openPostId} actions={actions} onOpen={open} /></div>
    {page && <div className="sns-page" key={pages.length}>
      <button type="button" className="sns-back" data-testid="sns-back" onClick={back}>
        <span aria-hidden="true">‹</span> {backLabel(pages.length - 1)}<span className="sr-only">へ戻る</span></button>
      {page.kind === "people" && <PeoplePage game={game} day={page.day} onPerson={onPerson} />}
      {page.kind === "person" && <PersonPage game={game} personId={page.personId} actions={actions} onPost={(postId) => open({ kind: "post", postId })} />}
      {page.kind === "heroine" && <HeroinePage game={game} numbers={numbers} reduceMotion={reduceMotion} actions={actions} />}
      {page.kind === "post" && <PostPage game={game} postId={page.postId} actions={actions} />}
    </div>}
  </div>;
}

/** The top: 「出会った人 ›」, then each night (the newest first) with its people met, her card and the people's card. */
function SnsTop({ game, openPostId, actions, onOpen }: { game: GameState; openPostId?: string; actions: Actions; onOpen: (page: Page) => void }) {
  const days = useMemo(() => snsTimeline(game), [game]);
  const met = useMemo(() => snsMetPeople(game).flatMap((group) => group.people), [game]);
  return <>
    {met.length > 0 && <button type="button" className="sns-met-all" data-testid="sns-met-all" onClick={() => onOpen({ kind: "people" })}>
      <span>出会った人</span>
      <Faces faces={met.slice(-4).reverse()} size="sm" />
      <Icon name="chevron-right" />
    </button>}
    {days.length === 0 && <p className="sns-empty" data-testid="sns-empty">まだ投稿はありません。夜になると、旅の写真や出会った人の便りがここに届きます。</p>}
    {days.map((day) => <section key={`${day.cityId}:${day.day}`} className="sns-day" aria-labelledby={`sns-day-${day.cityId}-${day.day}`}>
      <DayHead day={day} onMet={() => onOpen({ kind: "people", day })} />
      {day.heroine.length > 0 && <SnsCard posts={day.heroine} startPostId={openPostId} actions={actions} />}
      {day.posts.length > 0 && <SnsCard posts={day.posts} startPostId={openPostId} actions={actions} />}
    </section>)}
  </>;
}

/** A night's heading 「デリー · 2日目」, a hairline, and the faces of the people first met that day (a button to them). */
function DayHead({ day, onMet }: { day: SnsDay; onMet?: () => void }) {
  return <div className="sns-day-head">
    <h3 id={`sns-day-${day.cityId}-${day.day}`}>{day.cityNameJa} · {day.day}日目</h3>
    <span className="sns-rule" aria-hidden="true" />
    {onMet && day.met.length > 0 && <button type="button" className="sns-day-met" onClick={onMet}>
      <Faces faces={day.met.slice(0, 4)} size="xs" />
      <Icon name="chevron-right" />
      <span className="sr-only">この日に会った人（{day.met.map((face) => face.nameJa).join("、")}）</span>
    </button>}
  </div>;
}

/** A face: the person's icon in a round frame (their portrait in their own outfit, never the worn one), else their initial. */
function Face({ face, size }: { face: SnsFace; size: "xs" | "sm" | "md" | "lg" }) {
  return <span className={`sns-face is-${size}`} aria-hidden="true">
    {face.characterId ? <CharacterFace characterId={face.characterId} costume={face.costume} fixed />
      : <span className="sns-face-initial">{[...face.nameJa][0]}</span>}
  </span>;
}

/** Faces overlapped (no count). Pictures only: their names are said by the control or line they are in. */
function Faces({ faces, size }: { faces: readonly SnsFace[]; size: "xs" | "sm" }) {
  return <span className={`sns-faces is-${size}`} aria-hidden="true">
    {faces.map((face) => <Face key={face.id} face={face} size={size} />)}
  </span>;
}

/**
 * A card: one post's paper, or a night's posts as one card (a photo a slide: the heroine's in the order written, or the
 * people's in the order they came; each one card a day). The photos turn sideways (‹ ›, or a swipe on the photo band only); within a post the line and the comments
 * stay, across posts they change with it. The card is as tall as its tallest post (every post's part under the band is laid
 * in one cell, the others hidden), so nothing under it moves as it turns.
 */
function SnsCard({ posts, startPostId, actions }: { posts: readonly SnsPostView[]; startPostId?: string; actions: Actions }) {
  const slides = useMemo(() => posts.flatMap((post, postIndex) => post.photos.map((photo, photoIndex) =>
    ({ post, photo, postIndex, key: `${post.id}:${photoIndex}` }))), [posts]);
  const [index, setIndex] = useState(() => Math.max(0, slides.findIndex((slide) => slide.post.id === startPostId)));
  const at = Math.min(index, slides.length - 1);
  const current = slides[at];
  const last = slides.length - 1;
  const prevButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const go = (step: -1 | 1) => {
    const next = Math.max(0, Math.min(last, at + step));
    // The button pressed goes from sight at the end: the focus moves to the other one.
    if (next === 0 && document.activeElement === prevButton.current) nextButton.current?.focus({ preventScroll: true });
    if (next === last && document.activeElement === nextButton.current) prevButton.current?.focus({ preventScroll: true });
    setIndex(next);
  };
  const swipe = useSwipe(go);
  if (!current) return null;
  const many = slides.length > 1;
  const hasUnder = posts.some((post) => post.comments.length || post.likers.length);
  return <article className="sns-card" data-sns-posts={posts.map((post) => post.id).join(" ")} data-testid="sns-card"
    aria-label={`${current.post.author.nameJa}の投稿`}>
    <div className="sns-strip" {...swipe}>
      <div className="sns-track" style={{ "--sns-at": at } as CSSProperties}>
        {slides.map((slide, slideIndex) => <div key={slide.key} className="sns-slide" inert={slideIndex !== at}
          aria-hidden={slideIndex !== at || undefined} style={{ "--sns-tilt": `${TILTS[slideIndex % TILTS.length]}deg` } as CSSProperties}>
          <Paper post={slide.post} photo={slide.photo} actions={actions} />
        </div>)}
      </div>
      {many && <>
        <button ref={prevButton} type="button" className="sns-turn is-prev" hidden={at === 0} onClick={() => go(-1)}>
          <span aria-hidden="true">‹</span><span className="sr-only">前の写真</span></button>
        <button ref={nextButton} type="button" className="sns-turn is-next" hidden={at === last} onClick={() => go(1)}>
          <span aria-hidden="true">›</span><span className="sr-only">次の写真</span></button>
      </>}
    </div>
    {many && <div className="sns-dots" aria-hidden="true">
      {posts.map((post, postIndex) => <span key={post.id} className="sns-dot-group">
        {slides.map((slide, slideIndex) => slide.postIndex === postIndex &&
          <span key={slide.key} className={`sns-dot${slideIndex === at ? " is-on" : ""}`} />)}
        {post.comments.some((comment) => actions.newIds.has(comment.id)) && <span className="sns-new-dot" />}
      </span>)}
    </div>}
    {many && <p className="sr-only" aria-live="polite">{`${current.post.author.nameJa}の写真 ${at + 1} / ${slides.length}`}</p>}
    {hasUnder && <div className="sns-unders">
      {posts.map((post, postIndex) => <div key={post.id} className="sns-under" inert={postIndex !== current.postIndex}
        aria-hidden={postIndex !== current.postIndex || undefined} data-current={postIndex === current.postIndex || undefined}>
        {(post.comments.length > 0 || post.likers.length > 0) && <PostUnder post={post} actions={actions} />}
      </div>)}
    </div>}
  </article>;
}

/**
 * A photo's paper (the scenes' print: a white border, a little tilted; its words not): the photo (a press opens it larger),
 * the writer's face and name at its top left (their page), the place at its bottom right, and in the margin under it the
 * post's line in a hand, its translation, and the heart (the player's like; none for a kept journey but its mark).
 */
function Paper({ post, photo, actions }: { post: SnsPostView; photo: SnsPhotoView; actions: Actions }) {
  return <figure className="sns-paper">
    <div className="sns-photo">
      <button type="button" className="sns-photo-open" onClick={() => actions.onPhoto(photo, post)}
        aria-label={`${photo.placeNameJa ? `${photo.placeNameJa}の` : ""}写真を大きく見る`}>
        {photo.path && <img src={served(photo.path)} alt="" loading="lazy" decoding="async" />}
      </button>
      <button type="button" className="sns-author" onClick={() => actions.onPerson(post.author.id)}>
        <Face face={post.author} size="md" />
        <span className="sns-author-name">{post.author.nameJa}</span>
      </button>
      {photo.placeNameJa && <span className="sns-place">{photo.placeNameJa}</span>}
    </div>
    <figcaption className="sns-margin">
      <span className="sns-line">
        <span className="sns-line-text">{post.line.textJa}</span>
        {post.line.translationJa && <span className="sns-line-translation">{post.line.translationJa}</span>}
      </span>
      <LikeButton post={post} onLike={actions.onLike} />
    </figcaption>
  </figure>;
}

/**
 * The player's heart (2026-11-26): a line when not liked, red when liked; pressed again, taken back. No count. None on a past
 * post (`# past:`: from before the two met, it is only read).
 */
function LikeButton({ post, onLike }: { post: SnsPostView; onLike?: (postId: string) => void }) {
  if (post.pastJa) return null;
  if (!onLike) return post.liked ? <span className="sns-like is-liked is-still"><Icon name="heart" /><span className="sr-only">いいね済み</span></span> : null;
  return <button type="button" className={`sns-like${post.liked ? " is-liked" : ""}`} aria-pressed={post.liked} data-testid="sns-like"
    onClick={() => onLike(post.id)}>
    <Icon name="heart" /><span className="sr-only">いいね</span>
  </button>;
}

/** Under a post's photo band: the faces of those who like it, then its comments, one a line, the replies set in. */
function PostUnder({ post, actions }: { post: SnsPostView; actions: Actions }) {
  return <div className="sns-under-paper">
    {post.likers.length > 0 && <p className="sns-likers">
      <Icon name="heart" />
      <Faces faces={post.likers} size="xs" />
      <span className="sr-only">いいね：{post.likers.map((face) => face.nameJa).join("、")}</span>
    </p>}
    {post.comments.length > 0 && <ul className="sns-comments">
      {post.comments.map((comment) => <Comment key={comment.id} comment={comment} isNew={actions.newIds.has(comment.id)} onPerson={actions.onPerson} />)}
    </ul>}
  </div>;
}

/** One comment: its line (a red dot before the name when new), then the replies, smaller faces, set in. */
function Comment({ comment, isNew, onPerson }: { comment: SnsCommentView; isNew: boolean; onPerson: (id: string) => void }) {
  return <li className="sns-comment" data-testid="sns-comment">
    {comment.lines.map((line, index) => <p key={index} className={`sns-comment-line${index ? " is-reply" : ""}`}>
      {index === 0 && isNew && <span className="sns-new-dot"><span className="sr-only">新着：</span></span>}
      <button type="button" className="sns-who" onClick={() => onPerson(line.speaker.id)}>
        <Face face={line.speaker} size={index ? "xs" : "sm"} />
        <span className="sns-who-name">{line.speaker.nameJa}</span>
      </button>
      <span className="sns-comment-text">
        {line.textJa}
        {line.translationJa && <span className="sns-comment-translation">{line.translationJa}</span>}
      </span>
    </p>)}
  </li>;
}

/** 「出会った人」: everyone met so far, by city in the journey's order (or a night's people), each a row to their page. */
function PeoplePage({ game, day, onPerson }: { game: GameState; day?: SnsDay; onPerson: (id: string) => void }) {
  const groups = useMemo(() => snsMetPeople(game), [game]);
  const all = groups.flatMap((group) => group.people);
  const shown = day ? [{ cityId: day.cityId, cityNameJa: "", people: day.met.map((face) => all.find((person) => person.id === face.id) ?? face) }] : groups;
  return <section aria-labelledby="sns-people-title">
    <h3 id="sns-people-title" className="sns-page-title" tabIndex={-1}>{day ? `${day.cityNameJa} · ${day.day}日目に会った人` : "出会った人"}</h3>
    {shown.map((group) => <div key={group.cityId} className="sns-people-group">
      {group.cityNameJa && <h4 className="sns-section-title"><span>{group.cityNameJa}</span><span className="sns-rule" aria-hidden="true" /></h4>}
      <ul className="sns-people">
        {group.people.map((person: SnsMetPerson) => <li key={person.id}>
          <button type="button" className="sns-person-row" data-testid={`sns-person-${person.id}`} onClick={() => onPerson(person.id)}>
            <Face face={person} size="md" />
            <span className="sns-person-row-text">
              <span className="sns-person-row-name">{person.nameJa}</span>
              {person.introFirstJa && <span className="sns-person-row-intro">{person.introFirstJa}</span>}
            </span>
            <Icon name="chevron-right" />
          </button>
        </li>)}
      </ul>
    </div>)}
  </section>;
}

/** A section of a page: its heading over a hairline, then its body. */
function PageSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="sns-page-section">
    <h4 className="sns-section-title"><span>{title}</span><span className="sns-rule" aria-hidden="true" /></h4>
    {children}
  </section>;
}

/** A page's head: the face, the name (the page's title, focused as it opens) and their own words. */
function PageHead({ face, introJa }: { face: SnsFace; introJa: readonly string[] }) {
  return <header className="sns-profile">
    <Face face={face} size="lg" />
    <div className="sns-profile-text">
      <h3 className="sns-page-title" tabIndex={-1}>{face.nameJa}</h3>
      {introJa.length > 0 && <p className="sns-intro">{introJa.map((line, index) => <span key={index}>{line}</span>)}</p>}
    </div>
  </header>;
}

/**
 * A person's page (one for the journey): their own words, the heroine's note (their role; where and when first met), their
 * photos (each opens its post), their comments on her posts (with the post's photo; each opens it), the album's photos they
 * are in (each opens larger).
 */
function PersonPage({ game, personId, actions, onPost }: { game: GameState; personId: string; actions: Actions; onPost: (postId: string) => void }) {
  const page = useMemo(() => snsPersonPage(game, personId), [game, personId]);
  if (!page) return null;
  const { met, titleJa } = page.note;
  const noteJa = [titleJa, met && `${met.cityNameJa} · ${met.day}日目に${met.placeNameJa ? `${met.placeNameJa}で` : ""}会った`].filter(Boolean).join("。");
  const heroine = { id: SNS_HEROINE, nameJa: game.heroineName, characterId: "heroine" };
  return <article aria-label={`${page.face.nameJa}のページ`} data-testid="sns-person-page">
    <PageHead face={page.face} introJa={page.introJa} />
    {noteJa && <aside className="sns-note" aria-label={`${game.heroineName}のメモ`}>
      <p className="sns-note-head"><Face face={heroine} size="xs" />{game.heroineName}のメモ</p>
      <p className="sns-note-text">{noteJa}</p>
    </aside>}
    {page.photos.length > 0 && <PageSection title={`${page.face.nameJa}の写真`}>
      <ul className="sns-grid is-3">
        {page.photos.map((tile, index) => <li key={`${tile.postId}:${index}`}>
          <button type="button" onClick={() => tile.postId && onPost(tile.postId)} aria-label="この写真の投稿を見る">
            {(tile.thumbPath ?? tile.path) && <img src={served(tile.thumbPath ?? tile.path!)} alt="" loading="lazy" decoding="async" />}
          </button>
        </li>)}
      </ul>
    </PageSection>}
    {page.comments.length > 0 && <PageSection title={`${game.heroineName}の投稿へのコメント`}>
      <ul className="sns-their-comments">
        {page.comments.map(({ post, comment }) => <li key={comment.id}>
          <button type="button" onClick={() => post.postId && onPost(post.postId)}>
            {(post.thumbPath ?? post.path) && <img src={served(post.thumbPath ?? post.path!)} alt="" loading="lazy" decoding="async" />}
            <span>{comment.lines[0].textJa}</span>
            <span className="sr-only">（投稿を見る）</span>
          </button>
        </li>)}
      </ul>
    </PageSection>}
    {page.withPhotos.length > 0 && <PageSection title="一緒に写っている写真">
      <ul className="sns-grid is-5">
        {page.withPhotos.map((photo) => {
          const image = getAlbumImage(photo.imageId);
          return <li key={photo.imageId}>
            <button type="button" aria-label={`${photo.caption ?? "写真"}を大きく見る`}
              onClick={() => actions.onPhoto({ imageId: photo.imageId, ...(image ? { path: image.path } : {}), album: photo })}>
              {image && <img src={served(pictureThumbPath(image))} alt="" loading="lazy" decoding="async" />}
            </button>
          </li>;
        })}
      </ul>
    </PageSection>}
  </article>;
}

/** The heroine's page: her face, name and words, 旅の数字 (small), then her day cards, the newest first. */
function HeroinePage({ game, numbers, reduceMotion, actions }: { game: GameState; numbers: JourneyNumbers | null; reduceMotion: boolean; actions: Actions }) {
  const page = useMemo(() => snsHeroinePage(game), [game]);
  return <article aria-label={`${game.heroineName}のページ`} data-testid="sns-heroine-page">
    <PageHead face={page.face} introJa={page.introJa} />
    {numbers && <div className="sns-numbers"><JourneyNumbersCard numbers={numbers} reduceMotion={reduceMotion} /></div>}
    {page.days.map((day) => <section key={`${day.cityId}:${day.day}`} className="sns-day" aria-labelledby={`sns-day-${day.cityId}-${day.day}`}>
      <DayHead day={day} />
      <SnsCard posts={day.heroine} actions={actions} />
    </section>)}
  </article>;
}

/**
 * One post on a page of its own (from a person's page): its night's heading and its card; a past post (`# past:`), its writer
 * and when it was posted (「カムラ · 去年の冬」).
 */
function PostPage({ game, postId, actions }: { game: GameState; postId: string; actions: Actions }) {
  const view = useMemo(() => snsPostView(game, postId), [game, postId]);
  if (!view) return null;
  const title = snsPostPageTitle(view);
  return <section aria-labelledby="sns-post-title" data-testid="sns-post-page">
    <h3 id="sns-post-title" className="sns-page-title sns-post-title" tabIndex={-1}>{title}</h3>
    <SnsCard posts={[view]} actions={actions} />
  </section>;
}
