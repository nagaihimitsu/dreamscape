import { useEffect, useState } from "react";
import { ImageCredit } from "../components/ImageCredit";
import { Modal, ModalTitle } from "../components/Modal";
import {
  FONT_CREDIT,
  MAP_CREDIT,
  OWN_ARTWORK_NOTE_JA,
  parseThirdPartyLicenses,
  photoCredits,
  THIRD_PARTY_LICENSES_FILE,
  type JourneyPhotoCredits,
  type ThirdPartyLicense,
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
 * The body of 「出典・権利の一覧」: every served tourism photo by journey (preparing journeys
 * marked, D1), the map, the fonts (D4), the libraries (D7) and the note that artwork made for
 * Dreamscape is not listed (D5). Each journey's photos and each licence text open on demand.
 */
export function CreditsList({ photos, licences }: { photos: readonly JourneyPhotoCredits[]; licences: LicenceListState }) {
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
  const licences = useThirdPartyLicenses();
  return <Modal labelledBy="credits-title" className="credits-modal" onClose={onClose} settlePresses>
    <ModalTitle id="credits-title" onClose={onClose} closeTestId="credits-close">出典・権利の一覧</ModalTitle>
    <CreditsList photos={photos} licences={licences} />
  </Modal>;
}
