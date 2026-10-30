# 02 技術設計 / 第一候補

## 原則
既存リポジトリを最初に調査。作成時にはREADMEのみ確認されていたが、変更がありうる。構成が空に近い場合、以下を第一候補とする。
- Vite + React + TypeScript（ブラウザゲーム、スマホ優先、静的配信）。
- `.ink`（編集用の会話原稿）、Inkコンパイラ（ビルド時）、`inkjs`（ブラウザの実行時）。**原稿の独自パーサーを作らない。**
- `.json`（都市/観光地/クイズ/デート定義/数値バランス）。スキーマ検証（Zodなど）は必要な範囲だけ導入。
- 状態は小規模ならReact Context + useReducer等。用途が拡大してから状態管理ライブラリの導入を検討する。
- `localStorage`（最初の保存）と `schemaVersion`。保存層を抽象化し、将来IndexedDBや複数セーブへ移行できるようにする。JSONのエクスポート/インポートは後続フェーズでよい。
- 画像 WebP/PNG。最初はプレースホルダーで十分。写真・名画の細部を問う本番問題は、画像使用権と正確性を確認したものを使う。

## 編集元と生成物の分離
編集元 `content/stories/**/*.ink` → ビルド時にコンパイル → 配信対象となる `.json` → `inkjs` 実行 → Reactで台詞と選択肢を描画 → TypeScriptのルール層にイベント通知。
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
  persistence/          # セーブ・復元・将来のマイグレーション
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

## UX/スマホ
- 縦画面最優先（約360〜430px幅）。PCでは適切な最大幅を設定。
- 選択肢は大きなタップ領域、文字切れ防止。読みやすい文字送り・戻れない選択時の確認・スキップ機能は段階的に実装。
- 台詞表示は行をまとめて同時に見せすぎず、状況説明→会話→選択のテンポを設計。
- 本番は静的WebサイトとしてURLでアクセス（HTML添付をiPhoneで開かせる方式に依存しない）。

## 品質
- `npm run dev` / `npm run build` / `npm run test` を初期導入。TypeScript型チェック、ユニットテスト、Inkコンパイル失敗時の検出。
- `content/` にあるサンプルは検証されるまで試作扱い。実際の実装でサンプルの見た目や数値を固定しない。
- 実際の依存バージョン、Inkコンパイラ方法、ライセンス、Vite対応をCodexが公式資料から確認し、手元で動く手順をREADMEに記録する。
