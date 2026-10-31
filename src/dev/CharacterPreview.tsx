import { useState } from "react";
import characterData from "../../content/presentation/characters.json";
import { CharacterPortrait } from "../components/CharacterPortrait";
import {
  characterCatalogSchema,
  characterImage,
  resolveCharacterCostume,
} from "../content/character-assets";
import "../features/romance/romance-scene.css";
import "./character-preview.css";

const catalog = characterCatalogSchema.parse(characterData);
const heroine = catalog.characters.find((character) => character.id === "heroine")!;
const expressionLabels: Record<string, string> = {
  neutral: "通常",
  smile: "微笑み",
  happy: "喜び",
  shy: "照れ",
  surprised: "驚き",
  worried: "心配",
  serious: "真剣",
  teasing: "からかい",
};

/** A local-only view of the real portrait component; no game state is mounted. */
export default function CharacterPreview() {
  const costumes = heroine.costumes ?? [];
  const [costumeId, setCostumeId] = useState(costumes[0]?.id ?? "");
  const costume = costumes.find((item) => item.id === costumeId);
  const [poseId, setPoseId] = useState(costume?.poses[0]?.id ?? "");
  const pose = costume?.poses.find((item) => item.id === poseId);
  const [emotion, setEmotion] = useState("neutral");
  const [background, setBackground] = useState("light");
  const [layout, setLayout] = useState("fit");
  const [showDialogue, setShowDialogue] = useState(true);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const resolved = resolveCharacterCostume(heroine, catalog.wardrobe, {
    costume: costumeId || undefined,
    pose: poseId || undefined,
  });
  const path = characterImage(heroine, { ...resolved, emotion });
  const status = failedPath
    ? resolved.costume && failedPath !== pose?.expressions.neutral
      ? "登録された画像を読み込めません。同じ衣装・ポーズの neutral を表示中"
      : "登録された画像を読み込めません。仮素材を表示中"
    : resolved.costume
      ? pose?.expressions[emotion]
        ? "選択した表情の画像を表示中"
        : "この表情は未登録。同じ衣装・ポーズの neutral を表示中"
      : "この衣装の neutral は未登録。基本衣装または仮素材を表示中";

  return (
    <main className="character-preview" data-testid="character-preview">
      <header>
        <h1>人物素材の確認</h1>
        <a href={import.meta.env.BASE_URL}>ゲームへ戻る</a>
      </header>
      <div className="preview-controls">
        <label>
          衣装
          <select data-testid="preview-costume" value={costumeId} onChange={(event) => {
            const next = costumes.find((item) => item.id === event.target.value);
            setCostumeId(event.target.value);
            setPoseId(next?.poses[0]?.id ?? "");
            setFailedPath(null);
          }}>
            {!costumes.length && <option value="">未登録</option>}
            {costumes.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
          </select>
        </label>
        <label>
          ポーズ
          <select data-testid="preview-pose" value={poseId} onChange={(event) => {
            setPoseId(event.target.value);
            setFailedPath(null);
          }}>
            {!costume?.poses.length && <option value="">未登録</option>}
            {costume?.poses.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
          </select>
        </label>
        <label>
          表情
          <select data-testid="preview-emotion" value={emotion} onChange={(event) => {
            setEmotion(event.target.value);
            setFailedPath(null);
          }}>
            {(catalog.expressionIds ?? ["neutral", "shy"]).map((id) => (
              <option key={id} value={id}>{expressionLabels[id] ?? id} ({id})</option>
            ))}
          </select>
        </label>
        <label>
          背景
          <select data-testid="preview-background" value={background} onChange={(event) => setBackground(event.target.value)}>
            <option value="light">明るい背景</option>
            <option value="dark">暗い背景</option>
          </select>
        </label>
      </div>
      <p className="preview-status" data-testid="preview-status" role="status">{status}</p>
      {path && <p className="preview-path">{path}</p>}
      <div className="preview-options">
        <label className="preview-layout">
          人物の配置
          <select data-testid="preview-layout" value={layout} onChange={(event) => setLayout(event.target.value)}>
            <option value="fit">全体を確認</option>
            <option value="game">ゲーム中の配置</option>
          </select>
        </label>
        <label className="preview-dialogue-toggle">
          <input type="checkbox" checked={showDialogue} onChange={(event) => setShowDialogue(event.target.checked)} />
          台詞枠を表示
        </label>
      </div>
      <div className={`vn-scene preview-stage preview-stage-${background}${layout === "fit" ? " preview-stage-fit" : ""}`} data-testid="preview-stage">
        <div className="preview-guides" aria-hidden="true" />
        <div className="vn-character-layer">
          <CharacterPortrait key={`${costumeId}/${poseId}/${emotion}`} characterId="heroine" costume={costumeId || undefined} pose={poseId || undefined}
            emotion={emotion} active onImageError={setFailedPath} />
        </div>
        {showDialogue && (
          <div className="vn-dialogue preview-dialogue">
            <span className="speaker">名前</span>
            <p className="dialogue-text">台詞と顔が重ならないか確認できます。</p>
          </div>
        )}
      </div>
      <p className="preview-caption">基準線を目安に、表情ごとの位置と縮尺を比べられます。「ゲーム中の配置」では実際の会話画面と同じ配置を確認できます。</p>
    </main>
  );
}
