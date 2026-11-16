# Dreamscape

恋愛 × 世界観光 × 英語学習の、スマートフォン向けのブラウザゲームです。旅先の名所を訪ね、そこで出会った人と英語のクイズをし、街歩きではヒロインとのデートを選びます。

今遊べるのは、ミラノ編と、デリー → アーグラ → ジャイプールを巡るインド・ゴールデントライアングル編です。ウズベキスタン編とルアンパパーン編は準備中です。

公開版：https://nagaihimitsu.github.io/dreamscape/

## 資料

遊ぶ人は「遊び方」を、開発する人は「開発の手引き」を、都市や旅行編を作る人は「新しい都市を1つ足す手引き」を最初に読みます。

### 遊ぶ人へ

- [遊び方](docs/11_HOW_TO_PLAY.md)：旅の進め方、AP、クイズ、デート、操作、保存。

### 決まりと仕様

食い違うときは、[AGENTS.md](AGENTS.md) の「仕様の優先順位」に従います。

- [AGENTS.md](AGENTS.md)：開発の決まりと仕様の優先順位。いちばん上の決まり。
- [01 ゲーム企画](docs/01_GAME_DESIGN.md)：確定した企画と、遊びの流れ。
- [03 恋愛システム](docs/03_ROMANCE_SYSTEM.md)：関係の値、デート、告白、彼女の返事。
- [04 観光・英語クイズ](docs/04_BATTLE_TOURISM.md)：観光、クイズ、推理クイズ、英語の難しさ。
- [02 技術設計](docs/02_TECH_ARCHITECTURE.md)：フォルダ構成、データの統合、生成時の検査、IDの付け方、場面の時点、画面の仕組み。
- [07 データ契約・検証・テスト](docs/07_DATA_AND_TESTS.md)：安定したID、保存の仕組み、セーブの版、受け入れテスト。
- [05 ロードマップ](docs/05_ROADMAP.md)：最初の計画のフェーズと受け入れ条件（記録）。
- [06 文章の規格](docs/06_WRITING_STANDARDS.md)：人物・恋愛の選択肢・場面の点検の決まり。
- [09 キャラクターバイブル](docs/09_HEROINE_CHARACTER_BIBLE.md)：ヒロインの人物像。ヒロインの台詞を書く前に読む。

### 開発する人へ

- [12 開発の手引き](docs/12_DEVELOPMENT.md)：開発の入口。起動、コマンドの一覧、生成と編集の流れ、公開、今の実装の範囲。
- [10 開発時の確認](docs/10_DEVELOPMENT_CHECKS.md)：変更ごとの確認、テストの組、E2E、探索テスト、Debug起動URL、CI。
- [13 ミニゲームの仕組み](docs/13_MINIGAMES.md)：ミニゲームの仕組みと、ゲームを足す人のチェックリスト。
- [08 公式資料](docs/08_REFERENCES.md)：使っている版と公式資料、史実の確かめ先。
- [UI_RULES.md](UI_RULES.md)・[UI_REVIEW_CHECKLIST.md](UI_REVIEW_CHECKLIST.md)：画面の作り方と、作った後の点検。
- [UI監査記録](docs/UI_AUDIT_2026_10.md)：2026年10月の画面の点検の記録。
- [不具合を調べる手順](authoring/BUG_HUNT_GUIDE.md)：報告を受けたときと、CIだけで落ちるときに調べる順番。
- [大きな作り替えで「前と同じ」を確かめる](authoring/SAME_AS_BEFORE_GUIDE.md)：変える前の結果を残し、変えた後と比べる道具を先に作るやり方。
- [計ってから速く・軽くする](authoring/MEASURE_FIRST_GUIDE.md)：読み込み・生成・画像を、同じ条件で計ってから直すやり方。
- [画面を作り直す進め方](authoring/UI_REDESIGN_GUIDE.md)：今の画面を一覧にして測り、小さな直しから入れて、実機で見るまでの順番。

### 作る人へ（[authoring/](authoring/)）

- [新しい都市を1つ足す手引き](authoring/NEW_CITY_GUIDE.md)：都市を1つ足す作業の順番と、同時に進められる作業。ここから始める。
- [コンテンツ制作ガイド](authoring/CONTENT_GUIDE.md)：会話・札・クイズ・観光・デート・条件・移動・音・人物の絵の書き方。
- [シナリオ改稿のポイント（編集者視点）](authoring/SCENARIO_EDITING_GUIDE.md)：書き上がったシナリオを、書いた人とは別の編集者が、初めて遊ぶ人の目で読み直して整える手引き。
- [発注マニュアル](authoring/ORDERING_MANUAL.md)：ヒロインの声と、描いてもらう絵の頼み方・受け取り方。
- [外の書き手とのやりとり](authoring/WRITER_HANDOFF_GUIDE.md)：書き手に説明書を渡す前の試し書きと、受け取った原稿の点検のしかた。
- [調べものの落とし穴集](authoring/RESEARCH_PITFALLS.md)：事実・出典・道のり・写真を調べるときに実際に引っかかった所と、防ぐ習慣。
- [書いた場面をDebugで確かめる](authoring/DEBUG_CHECK_GUIDE.md)：書いた場面を、ゲームの中ですぐ見る手順。
- [AIと決めごとを進める型](authoring/DECISION_GUIDE.md)：AIがユーザーに聞く・自分で決める・書き残すときの型。
- [AIに仕事を分けて頼む手引き](authoring/AI_DELEGATION_GUIDE.md)：AIの担当を分けて速く進め、取り込む前に確かめるやり方。
- [「調べて → 方法を決めて → 作る」の進め方](authoring/RESEARCH_TO_BUILD_GUIDE.md)：「調べて」「方法を考えて」「実装して」と頼まれたときの進め方。
- [表現の道具（札・機能）を足すときの考え方](authoring/EXPRESSION_TOOLS_GUIDE.md)：新しい札を作る前に見ること、作るときにそろえるもの、一律の決まりを制作者の条件に移す手順。
- [横の点検](authoring/SWEEP_CHECK_GUIDE.md)：1つの指摘を直したら、同じ型の所をほかにも全部探す手順。
- [ミニゲームの手応えの作り方と確かめ方](authoring/MINIGAME_FEEL_GUIDE.md)：物語の中のミニゲームを気持ちよくする基準と、試遊・ボットでの確かめ方。
- [無料の素材の探し方](authoring/FREE_ASSETS_GUIDE.md)：曲・環境音・効果音の探し方とライセンスの読み方、写真で足りない所。
- [旅の数字の決め方](authoring/NUMBERS_GUIDE.md)：運賃・移動の時間・予算の出し方と、バランス調整で見ること。
- [旅行編の制作手順](authoring/JOURNEY_AUTHORING.md)：下書きのシナリオとクイズを旅行編へ取り込む道具。
- [都市データの編集](authoring/CITY_BUNDLES.md)：地点・交通・背景を都市ごとの作業用JSONでまとめて直す。
- [都市の追加手順](authoring/FUTURE_CITIES.md)：都市のデータの登録と、都市の移り方・保存の決まり。
- [見本の編](authoring/templates/sample_trip/README.md)：遊べる最小の旅行編（開発・テスト専用の架空の街）。
- [新しい旅行編のチェックリストの元](authoring/templates/journey-new-checklist.md)：`journey:new` が書く `CHECKLIST.md` の元。
- [旅行編ごとの制作資料](authoring/journeys/README.md)：旅行編ごとの下書き・調査記録。

## 起動

Node.js 22.12以上を勧めます。

```sh
npm ci
npm run dev
```

表示されたURL（ふつうは `http://localhost:5173`）で遊べます。同じネットワークのスマートフォンからは、開発機のIPアドレスと表示されたポートで開きます。

```sh
npm run dev:sample   # 見本の編（開発・テスト専用の架空の旅行編）も入れて起動
npm run build        # 本番の出力を dist/ に作る
npm run preview      # 本番の出力を確かめる
```

`dist/` は静的なホスティングで配信できます。準備中の旅行編の写真などは `dist/` に入りません（開発サーバーでは見られます）。HTMLファイルを直接開かず、HTTPで開いてください。詳しくは[開発の手引き](docs/12_DEVELOPMENT.md#準備と起動)にあります。
