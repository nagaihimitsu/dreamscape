# 02 技術設計 / 第一候補

## 原則
既存リポジトリを最初に調査。作成時にはREADMEのみ確認されていたが、変更がありうる。構成が空に近い場合、以下を第一候補とする。
- Vite + React + TypeScript（ブラウザゲーム、スマホ優先、静的配信）。
- `.ink`（編集用の会話原稿）、Inkコンパイラ（ビルド時）、`inkjs`（ブラウザの実行時）。**原稿の独自パーサーを作らない。**
- `.json`（都市/観光地/クイズ/デート定義/数値バランス）。スキーマ検証（Zodなど）は必要な範囲だけ導入。
- 状態は小規模ならReact Context + useReducer等。用途が拡大してから状態管理ライブラリの導入を検討する。
- `localStorage` と `schemaVersion`。現在のゲームで作成した有効なデータの、同一バージョン内の保存・再開を維持する。将来の汎用移行基盤やJSONエクスポート/インポートは今回の必須要件ではない。
- 画像 WebP/PNG。最初はプレースホルダーで十分。写真・名画の細部を問う本番問題は、画像使用権と正確性を確認したものを使う。

## 編集元と生成物の分離
編集元 `content/journeys/<journeyId>/stories/**/*.ink` → ビルド時にコンパイル → 配信対象となる `.json` → `inkjs` 実行 → Reactで台詞と選択肢を描画 → TypeScriptのルール層にイベント通知。
- `.ink` から生成したJSONは手動で編集しない。
- `.ink` はゲームの文章と分岐を担当。AP計算/好感度/保存はTypeScript側。
- Inkのタグは制限付きのメタデータ: `speaker: heroine`, `background: milano_cafe`, `emotion: shy`, `effect: memory_milano_promise` など。
- `effect` は**許可済みイベントIDをルール層に渡す**だけ。文字列をコードとして評価しない。同一効果の適用はイベント単位で冪等にする。
- ヒロイン/主人公名や現在の呼称は、GameStateから読み込み、Inkの変数または安全なプレースホルダーに渡す。新規台詞に固定名を直書きしない。

## 推奨フォルダ（Codexが現状調査のうえ適宜調整）
```
src/
  app/                  # 画面遷移・起動
  components/           # DialogueBox, ChoiceButtons, CharacterPortrait
  features/romance/     # RomanceScreen, DateMenu
  features/tourism/     # 将来: TourismScreen, Observation
  features/battle/      # 将来: BattleScreen, QuestionCard
  domain/               # AP, event eligibility, affection, rewards（UIに依存しない）
  content/              # 読み込みとスキーマ検証
  story/                # inkjs実行アダプタ
  persistence/          # セーブ・復元・データ保護
  types/                # GameState, Event, Content types
content/
  stories/milano/       # 編集する .ink
  romance/              # デート定義 JSON
  quizzes/              # 例示／後続実装
  cities/               # 都市データ
scripts/                # Inkコンパイル・コンテンツ検証
public/assets/         # 画像・音声
```

## レイヤー間の依存
- `screens/components` → アプリ操作サービス → `domain` 純粋関数 → `persistence`
- シナリオアダプタは Ink の `Continue/currentChoices/ChooseChoiceIndex` を包み、画面に表示用のDialogueLine・ChoiceViewを返す。
- シナリオ終了・選択効果はゲームイベントへ変換する。APの残高やイベントの可否はstory runtimeでなくdomainが判定。
- `romance` が `battle` のUIコードを直接呼ばない。クイズ結果は `GameEvent` 経由でAP付与処理へ。
- 初期から巨大なイベントバスやプラグイン基盤は作らない。

## 実装の責務分担

既存の入口を保ちながら、次の単位で処理を分担する。

- `src/app/App.tsx` は旅行編の選択と保存領域のロック、`GameApp.tsx` はゲーム画面と画面間の操作を担当する。`useGameSession.ts` が状態更新・保存・復元・削除時の競合確認をまとめ、`useTravelEffects.tsx` が成功した移動の演出を扱う。
- `src/domain/game.ts` はゲームの状態遷移を扱う。保存形式の定義は `game-state-schema.ts`、デートの条件判定は `date-rules.ts`、保存された進行の整合確認は `game-state-validation.ts` に分ける。既存の公開関数と型は `game.ts` から引き続き利用できる。
- `src/domain/travel-destinations.ts` は行き先候補と待機時刻を計算する。帰宿候補と宿泊計画は `travel-game.ts` を画面表示と実際の操作で共用し、画面内に同じルールを重複実装しない。
- `scripts/content-pipeline.ts` はコンテンツ検証・生成の実行順を管理する。Inkのコンパイルと会話経路の検証は `ink-validation.ts`、背景画像とキャラクターの参照検証は `presentation-validation.ts` が担当する。共通データと各旅行編フォルダ（`content/journeys/<journeyId>/`）の統合は `content-sources.ts`、旅行編フォルダが自分の都市だけを扱い、同じ旅行編か共通データだけを参照することの検査は `content-ownership.ts` が担当する。
- `scripts/city-bundle.ts` は都市編集の公開APIと検証手順を担当する。編集形式は `city-bundle-schema.ts`、経路の圧縮・展開は `city-bundle-routes.ts`、共有カタログの統合は `city-bundle-catalogs.ts`、競合確認と原子的なファイル更新は `city-bundle-files.ts` が担当する。

機能を追加するときは該当する責務へ実装し、画面や入口のファイルへ個別の保存・進行・検証ルールを戻さない。分離したモジュール間で型だけが必要な場合は `import type` を使い、実行時の循環参照を避ける。

## 開発中の保存とシナリオ更新

開発中は、更新後に以前のセーブを利用できることや、自動移行を保証しない。現在のゲームセーブはv13で、v1〜v12の自動移行は行わず読み込み対象外とする（元のデータは消さず、旧版として案内する）。v13は旅行の日数・時刻・現在地と活動中の時間枠を保持する。保存先は旅行編ごとに分かれ、ミラノ編を含むすべての旅行編が `dreamscape.journey.<旅行編ID>.save.v1`（ゲーム進行）と `dreamscape.journey.<旅行編ID>.learning.v1`（英語ノート）を使う。以前のミラノ編の `dreamscape.save.v1` / `dreamscape.learning.v1` は読み込まず、消去もしない。各旅行編はWeb Locksで別タブからの同時編集を防ぐ。`schemaVersion` と保存された場面の指紋・状態を検証し、内容が異なる脚本や問題を無理に復元しない。誤字修正や改稿のたびに旧セーブ再開用のInk・定義を残すことは必須ではない。一方、読み込めるデータを更新のたびに無条件で無効化しない。

安全に読めないデータは自動削除・上書きせず、原因を断定できない場合もその旨を案内する。利用者が確認した場合だけ対象のDreamscape管理キーを消去できるようにし、別タブ競合と他アプリ・バックアップの保護を維持する。現在のバージョン内の保存・再開と二重適用防止は維持する。一般公開時には必要に応じて互換性方針を再検討する。

## UX/スマホ
- 縦画面最優先（約360〜430px幅）。PCでは適切な最大幅を設定。
- 選択肢は大きなタップ領域、文字切れ防止。読みやすい文字送り・戻れない選択時の確認・スキップ機能は段階的に実装。
- 台詞表示は行をまとめて同時に見せすぎず、状況説明→会話→選択のテンポを設計。
- 本番は静的WebサイトとしてURLでアクセス（HTML添付をiPhoneで開かせる方式に依存しない）。

## 品質
- `npm run dev` / `npm run build` / `npm run test` を初期導入。TypeScript型チェック、ユニットテスト、Inkコンパイル失敗時の検出。
- `content/` にあるサンプルは検証されるまで試作扱い。実際の実装でサンプルの見た目や数値を固定しない。
- 実際の依存バージョン、Inkコンパイラ方法、ライセンス、Vite対応をCodexが公式資料から確認し、手元で動く手順をREADMEに記録する。
