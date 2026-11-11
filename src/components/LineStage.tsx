import { useLayoutEffect, useRef, type ReactNode } from "react";
import { presentation, storyState, tourismAssets } from "../content";
import { albumImageAsset } from "../content/photo-choice";
import type { LetterLine, PhoneLine, Speaker, StoryFrame } from "../story/frame-reader";
import { LETTER_LABELS, phoneBubbles, type PhoneBubble, type PhoneNames } from "./line-staging";
import "./line-stage.css";

// The scene tags of the line on screen (2026-11-11 user decision), as the five dialogue screens show them. Presentation
// only: the line is still its DialogueText (tap, keyboard, 高速送り, auto-advance, the log and 隠す work as on any line).

/**
 * A line's `# recall:`: the photo, faint, over the scene's picture and under the portraits and the window (it covers no
 * face and no text). Its credit is in ⚙設定's 「画像の出典」 while the line shows, as the scene's own photo's (GameApp).
 */
export function RecallLayer({ imageId }: { imageId?: string }) {
  const asset = imageId ? albumImageAsset({ assets: tourismAssets, backgrounds: presentation.backgrounds }, imageId) : null;
  if (!asset) return null;
  return <div className="recall-layer" key={imageId} aria-hidden="true">
    <img src={`${import.meta.env.BASE_URL}${asset.path}`} alt="" decoding="async" />
  </div>;
}

/**
 * The line on screen (`children`, its DialogueText) as its scene tags show it: a phone message (`# phone:`) in a phone's
 * screen below the earlier messages of its run, a letter's line (`# letter:`) on its sheet below the lines written there
 * before; any other line as it is. `compact`: choices follow, so the phone keeps less room.
 */
export function LineStage({ frame, names, compact = false, children }: {
  frame: Pick<StoryFrame, "phone" | "letter" | "speaker" | "speakerPersonId">;
  names: PhoneNames;
  compact?: boolean;
  children: ReactNode;
}) {
  if (frame.phone) return <PhoneScreen phone={frame.phone} speaker={frame.speaker} personId={frame.speakerPersonId}
    names={{ people: PERSON_NAMES, ...names }} compact={compact}>{children}</PhoneScreen>;
  if (frame.letter) return <LetterSheet letter={frame.letter}>{children}</LetterSheet>;
  return <>{children}</>;
}

/** Keeps the newest line in view: a new line scrolls the box to its end (a reader who scrolls back up keeps their place until then). */
function useScrolledToEnd<T extends HTMLElement>(line: unknown) {
  const box = useRef<T>(null);
  useLayoutEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [line]);
  return box;
}

/** The names of progression/story.json people by ID: a person's messages (`# speaker: <person ID>`) show their name. */
const PERSON_NAMES: Readonly<Record<string, string>> = Object.fromEntries(storyState.people.map((person) => [person.id, person.nameJa]));

function PhoneScreen({ phone, speaker, personId, names, compact, children }: {
  phone: PhoneLine; speaker: Speaker; personId: string | undefined; names: PhoneNames; compact: boolean; children: ReactNode;
}) {
  const { earlier, current } = phoneBubbles(phone, speaker, names, personId);
  const thread = useScrolledToEnd<HTMLDivElement>(phone);
  return <div className="phone-screen" role="group" aria-label="スマホのメッセージ" data-compact={compact || undefined}>
    <div className="phone-thread" ref={thread}>
      {earlier.map((bubble) => <PhoneMessage key={bubble.key} bubble={bubble}><p className="phone-bubble">{bubble.text}</p></PhoneMessage>)}
      <PhoneMessage bubble={current}><div className="phone-bubble phone-bubble-current">{children}</div></PhoneMessage>
    </div>
  </div>;
}

function PhoneMessage({ bubble, children }: { bubble: PhoneBubble; children: ReactNode }) {
  return <div className="phone-message" data-side={bubble.side}>
    {bubble.name && <span className="phone-name">{bubble.name}</span>}
    {bubble.sender && <span className="sr-only">{bubble.sender}：</span>}
    {children}
  </div>;
}

function LetterSheet({ letter, children }: { letter: LetterLine; children: ReactNode }) {
  const sheet = useScrolledToEnd<HTMLDivElement>(letter);
  return <div className="letter-sheet" role="group" aria-label={LETTER_LABELS[letter.kind]} data-kind={letter.kind} ref={sheet}>
    {letter.earlier?.map((text, index) => <p className="letter-line" key={index}>{text}</p>)}
    {children}
  </div>;
}
