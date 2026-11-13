import { useEffect, useState } from "react";
import { ImageCredit } from "../components/ImageCredit";
import { Modal, ModalTitle } from "../components/Modal";
import {
  FONT_CREDIT,
  MAP_CREDIT,
  OWN_ARTWORK_NOTE_JA,
  parseThirdPartyLicenses,
  musicCredits,
  ambienceCredits,
  photoCredits,
  SOUND_LICENSE_TEXT,
  soundCredits,
  THIRD_PARTY_LICENSES_FILE,
  voiceCredits,
  type JourneyPhotoCredits,
  type SoundCredit,
  type ThirdPartyLicense,
  type VoiceCredit,
} from "../content/credits";
import "./credits.css";

/**
 * The library licences of the list: the production build's `third-party-licenses.json`
 * (decision D7), `dev` on the development server (it has no such file), `failed` when the
 * file cannot be read.
 */
export type LicenceListState =
  | { status: "dev" }
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; licenses: ThirdPartyLicense[] };

function useThirdPartyLicenses(): LicenceListState {
  const [state, setState] = useState<LicenceListState>(() => (import.meta.env.PROD ? { status: "loading" } : { status: "dev" }));
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    let live = true;
    fetch(`${import.meta.env.BASE_URL}${THIRD_PARTY_LICENSES_FILE}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((value: unknown) => {
        const licenses = parseThirdPartyLicenses(value);
        if (live) setState(licenses ? { status: "ready", licenses } : { status: "failed" });
      })
      .catch(() => {
        if (live) setState({ status: "failed" });
      });
    return () => {
      live = false;
    };
  }, []);
  return state;
}

function Licences({ state }: { state: LicenceListState }) {
  if (state.status === "dev") return <p className="fine-print">開発用のサーバーでは表示しません。公開版（本番ビルド）では、ここに一覧が出ます。</p>;
  if (state.status === "loading") return <p role="status">読み込んでいます…</p>;
  if (state.status === "failed") return <p role="status">ライブラリのライセンス一覧を読み込めませんでした。ページを開き直してください。</p>;
  return <ul className="credits-licences" data-testid="credits-licences">
    {state.licenses.map((licence) => <li key={`${licence.name}@${licence.version}`}>
      <details>
        <summary>{licence.name} {licence.version}（{licence.identifier}）</summary>
        <pre>{licence.text}</pre>
      </details>
    </li>)}
  </ul>;
}

/**
 * The sound effects' or the music's sources (2026-11-12): each work once, with its author, licence (and its link), the
 * page it comes from (none for one made for Dreamscape), the credit its author asks for, and what its sounds or tracks
 * are used for (`usesLabelJa`).
 */
function SoundCredits({ sounds, usesLabelJa = "使っている音" }: { sounds: readonly SoundCredit[]; usesLabelJa?: string }) {
  return <ul className="credits-sounds">
    {sounds.map(({ source, usesJa }) => {
      const licence = SOUND_LICENSE_TEXT[source.license];
      return <li key={source.id}>
        <p className="credits-place">{source.titleJa}</p>
        <p>作者：{source.author}</p>
        <p>ライセンス：{licence.url ? <a href={licence.url} target="_blank" rel="noreferrer">{licence.labelJa}</a> : licence.labelJa}</p>
        {source.creditJa && <p>{source.creditJa}</p>}
        {source.license !== "own" && source.url && <p>
          <a href={source.url} target="_blank" rel="noreferrer">元の作品{source.site ? `（${source.site}）` : ""}</a>
        </p>}
        <p>{usesLabelJa}：{usesJa.join("、")}</p>
      </li>;
    })}
  </ul>;
}

/**
 * The body of 「出典・権利の一覧」: every served tourism photo by journey (preparing journeys
 * marked, D1), the sound effects', the music's and the ambience's sources, the voices' (by journey: only the
 * journeys with voices; 2026-11-13), the map, the fonts (D4), the libraries (D7) and the note that artwork made for
 * Dreamscape is not listed (D5). Each journey's photos, the sounds' and the music's sources and each licence text
 * open on demand.
 */
export function CreditsList({ photos, sounds = [], music = [], ambience = [], voices = [], licences }: {
  photos: readonly JourneyPhotoCredits[]; sounds?: readonly SoundCredit[]; music?: readonly SoundCredit[]; ambience?: readonly SoundCredit[];
  voices?: readonly VoiceCredit[]; licences: LicenceListState;
}) {
  return <div className="credits-list">
    <section aria-labelledby="credits-photos-title">
      <h3 id="credits-photos-title">写真</h3>
      <p className="fine-print">観光地と背景の写真です。旅行編ごとに開いて、作者・元の画像・ライセンスを確かめられます。</p>
      {photos.map((journey) => <details key={journey.journeyId} className="credits-journey" data-testid={`credits-journey-${journey.journeyId}`}>
        <summary>{journey.headingJa}</summary>
        {journey.kinds.map((group) => <section key={group.kind}>
          <h4>{group.labelJa}</h4>
          <ul className="credits-photos">
            {group.credits.map((credit) => <li key={credit.asset.id}>
              <p className="credits-place">{credit.labelJa}</p>
              <ImageCredit asset={credit.asset} sourceLabelJa={credit.sourceLinkJa} />
            </li>)}
          </ul>
        </section>)}
      </details>)}
    </section>
    {sounds.length > 0 && <section aria-labelledby="credits-sounds-title" data-testid="credits-sounds">
      <h3 id="credits-sounds-title">効果音</h3>
      <p className="fine-print">ゲームの中で鳴る音です。開くと、もとの作品ごとに作者・ライセンスと、使っている音を確かめられます。</p>
      <details className="credits-journey">
        <summary>効果音の出典（{sounds.length}件）</summary>
        <SoundCredits sounds={sounds} />
      </details>
    </section>}
    {music.length > 0 && <section aria-labelledby="credits-music-title" data-testid="credits-music">
      <h3 id="credits-music-title">音楽</h3>
      <p className="fine-print">ゲームの中で流れる曲です。開くと、もとの作品ごとに作者・ライセンスと、使っている場面を確かめられます。</p>
      <details className="credits-journey">
        <summary>音楽の出典（{music.length}件）</summary>
        <SoundCredits sounds={music} usesLabelJa="使っている場面" />
      </details>
    </section>}
    {ambience.length > 0 && <section aria-labelledby="credits-ambience-title" data-testid="credits-ambience">
      <h3 id="credits-ambience-title">環境音</h3>
      <p className="fine-print">場面の後ろで小さく流れる、場所の音です。開くと、もとの録音ごとに作者・ライセンスと、使っている音を確かめられます。</p>
      <details className="credits-journey">
        <summary>環境音の出典（{ambience.length}件）</summary>
        <SoundCredits sounds={ambience} usesLabelJa="使っている音" />
      </details>
    </section>}
    {voices.length > 0 && <section aria-labelledby="credits-voices-title" data-testid="credits-voices">
      <h3 id="credits-voices-title">声</h3>
      <p className="fine-print">台詞の声の作り方です。声のある旅行編だけに載せています。</p>
      <ul className="credits-sounds">
        {voices.map((voice) => <li key={`${voice.journeyId}-${voice.url}`}>
          <p className="credits-place">{voice.journeyNameJa}</p>
          <p>{voice.useJa}：{voice.titleJa}（{voice.author}、{voice.license}）</p>
          {voice.creditJa && <p>{voice.creditJa}</p>}
          <p><a href={voice.url} target="_blank" rel="noreferrer">元の作品</a></p>
        </li>)}
      </ul>
    </section>}
    <section aria-labelledby="credits-map-title" data-testid="credits-map">
      <h3 id="credits-map-title">地図</h3>
      <p>{MAP_CREDIT.textJa}</p>
      <p><a href={MAP_CREDIT.url} target="_blank" rel="noreferrer">OpenStreetMap の著作権とライセンス</a></p>
      <p className="fine-print">{MAP_CREDIT.noteJa}</p>
    </section>
    <section aria-labelledby="credits-fonts-title">
      <h3 id="credits-fonts-title">文字（フォント）</h3>
      <p>{FONT_CREDIT.textJa}</p>
      <p>{FONT_CREDIT.links.map((link, index) => <span key={link.url}>
        {index > 0 && " · "}
        <a href={link.url} target="_blank" rel="noreferrer">{link.labelJa}</a>
      </span>)}</p>
    </section>
    <section aria-labelledby="credits-libraries-title">
      <h3 id="credits-libraries-title">ライブラリ</h3>
      <Licences state={licences} />
    </section>
    <p className="fine-print credits-own-artwork">{OWN_ARTWORK_NOTE_JA}</p>
  </div>;
}

/** 「出典・権利の一覧」 (WP20b), opened from the title screen and from ⚙設定 → ゲームの設定. */
export function CreditsDialog({ onClose }: { onClose: () => void }) {
  const [photos] = useState(photoCredits);
  const [sounds] = useState(soundCredits);
  const [music] = useState(musicCredits);
  const [ambience] = useState(ambienceCredits);
  const [voices] = useState(voiceCredits);
  const licences = useThirdPartyLicenses();
  return <Modal labelledBy="credits-title" className="credits-modal" onClose={onClose} settlePresses>
    <ModalTitle id="credits-title" onClose={onClose} closeTestId="credits-close">出典・権利の一覧</ModalTitle>
    <CreditsList photos={photos} sounds={sounds} music={music} ambience={ambience} voices={voices} licences={licences} />
  </Modal>;
}
