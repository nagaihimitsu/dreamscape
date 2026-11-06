# 開発時の確認

変更の影響範囲に合わせて確認を選ぶ。ファイルの拡張子だけで判断せず、Ink・JSONが生成データや画面に渡る経路、共通コンポーネントや保存への影響も確認する。

| 変更 | 主な確認 |
| --- | --- |
| 文書（Markdown）の追加・移動・リンク | `npx vitest run scripts/docs-links.test.ts`（生成不要。Git管理下の全Markdownの相対リンク先が存在するかを検査する。新しいファイルは `git add` 後に対象になる） |
| 誤字・会話文 | Ink・JSONの変更は `npm run content:check` と必要な会話経路の実表示。型やUIコードにも影響する場合は型検査や対象テストを追加 |
| 画像・背景 | `npm run content:check`、対象画面の実表示と必要な画像失敗時の表示。画像の配置・パスを変えた場合はE2E一式（`npm run test:e2e`）も実行 |
| CSS・UIの小変更 | 対象操作とスマートフォン幅の実画面。共通UIや型・操作への影響に応じて `npm run typecheck` やE2E一式を追加 |
| ゲームルール | 該当ドメインテストと必要な画面操作。型・共通進行への影響があれば型検査と関連テストを追加 |
| 旅行編フォルダの追加・削除、統合規則・生成処理の変更 | `npm run content:build`、`npx vitest run scripts/journey-folders.test.ts scripts/content-sources.test.ts scripts/catalog-merge.test.ts scripts/content-ownership.test.ts`（先に `content:build`）、E2E一式（`boot.spec.ts` が登録済みの全旅行編の開始画面を開く） |
| 保存・進行 | 同一バージョン内の保存・再開、読めないデータの保護、明示消去、別タブ、報酬重複防止の関連テストとE2E一式、必要な実画面。型・共通基盤の影響に応じて型検査と検証範囲を広げる |
| CI・Playwrightの設定、本番ビルドの検査（`.github/workflows/`・`playwright.config.ts`・`scripts/dist-guard.ts`） | `npm run build`（`dist/` の検査を含む）、`npx vitest run scripts/dist-guard.test.ts`、E2E一式。ワークフローの変更はPRで実際の実行結果を確認する |
| 大きな変更・公開前 | `npm run verify`、E2E一式と、影響範囲に応じた実画面確認 |

`npm run content:check` は差分検証ではなく全コンテンツを検証・生成する。対象テストを絞る場合、例えば `npm test -- src/domain/encounter-ap.test.ts` は通常どおり `pretest` でコンテンツを生成してから、そのテストだけを実行する。Playwrightの `webServer` は通常 `npm run dev` を実行し、その `predev` がコンテンツを生成する。既に起動したサーバーを再利用する場合は、対象の変更が反映され、生成物が最新であることを確認する。自動テストの通過だけを写真の切れ方や操作性の目視確認の代わりにはしない。

小変更のたびに全単体テストや全E2Eを手元で実行する必要はない。PRと `main` へのpushでは、GitHub Actionsが全単体テスト・本番ビルド・E2E一式を自動実行する（[CI](#cigithub-actions)）。上の表でE2E一式を挙げた変更は、PRを出す前に手元でも実行する。開発中はv12以前の旧開発版セーブの更新後の再開を保証せず、旧互換テストを新機能ごとに増やす必要はない。現在のゲームの保存・再開や読めないデータの保護は維持する。

`npm test` と `npm run build` はそれぞれ実行前にコンテンツを生成する。`npm run verify` は生成、全ユニットテスト、型検査、製品ビルド、`dist/` の検査を順に行う一括用コマンドで、生成は一度だけ行う。この中の `npm run test --ignore-scripts` は直前の生成を利用して `pretest` のみ省略している。個別に `--ignore-scripts` を付ける、または `npx vitest run` を直接呼ぶ場合は自動生成されないため、Ink・JSON等を変更した後は事前に `npm run content:build` を実行する。生成物の鮮度が分からない場合も再生成する。

ゲームと、データを参照するだけの単体テストは `content/` のJSONを直接読まず、`npm run content:build` が検証・統合して書き出す `src/content/generated/content/`（生成物。手動編集しない）を読む。JSONを編集した後も `npm run content:build` を実行する。一方、原本を一時フィクスチャへ写して書き換え、生成を検証するテスト（`src/content/*-content.test.ts` など）と制作ツールは `content/`（旅行編フォルダを含む）の原本を読む。画像も同様に、`npm run content:build` が直下の `public/` と各旅行編の `public/` を `src/content/generated/public/` にまとめ、開発サーバー・`vite build`・Playwrightはこのフォルダを配信する（`npm run dev` / `build` / `test` は先に `content:build` を実行する）。`vite`（`npx vite`・`vite build`・`vite preview`）を直接起動する場合は、先に `npm run content:build` を実行する。このフォルダがないと、画像なしで起動・ビルドされる（警告は出ない）。

`scripts/journey-folders.test.ts` は、原本の一時コピーで旅行編フォルダの改名・追加（`tests/fixtures/journeys/zz_fixture_trip/`）・各旅行編フォルダの除外を行い、そのたびに `content:build` 相当の生成と検証を実行する（約1分、旅行編が増えるほど長くなる）。特定の旅行編・都市の内容を確かめる単体テストは、全旅行編の合計件数や一覧ではなく、その旅行編・都市の範囲に絞って数える。

テストは簡潔な dot レポーターを使い、成功したテスト内のログを省略する。失敗したテストのログ、失敗箇所、終了コードは保持する。内容を詳しく追う場合は、生成後に `npx vitest run --reporter=verbose <対象>` とする。通常のコンテンツ生成は旧会話注釈の警告を件数で示し、個々の警告は `npm run content:build -- --verbose` で確認できる。生成に失敗した場合は警告の詳細と原因を表示し、失敗のまま終了する。

検証の絞り込みと成功ログの抑制は、テストを削除したことや実行時間・トークンの削減量を意味しない。今回確認したコマンドと、実施できなかった確認は作業報告に記載する。

## E2Eテスト

`tests/e2e/` のE2Eは、利用者と同じ操作で主要機能が動くことと、重大な不具合（起動できない、進行が止まる、保存が失われる、致命的なJSエラー）がないことだけを確認する最小構成とする。個々の観光地・シナリオ・選択肢・デート・品物の網羅や、細かな見た目・位置は対象にしない。それらのルールは単体・統合テストで、見た目は [UIレビュー](../UI_REVIEW_CHECKLIST.md) と実画面で確認する。

| ファイル | 確認する流れ |
| --- | --- |
| `boot.spec.ts` | 起動とタイトル画面、登録済みの全旅行編の開始画面、Debugが通常の保存データに触れないこと |
| `play.spec.ts` | ミラノの新しい旅で移動、観光ガイド、クイズバトル、報酬、デート（AP消費）を経て自由時間へ戻る |
| `save-load.spec.ts` | 自動保存とイベント途中の再読み込み、手動セーブ、別タブからの同時利用の防止、読めないセーブの保護 |
| `inter-city.spec.ts` | ゴールデントライアングル編でデリーのエピローグからアーグラへ移り、地図と都市情報が切り替わる |

`npm run test:e2e`（個別には `npx playwright test tests/e2e/play.spec.ts`）で実行する。一式は1〜2ワーカーで数分以内に終わる。各テストは自分のブラウザコンテキスト（保存領域・タブ）を持ち、同じファイルのテストも別のワーカーで並列に実行する（`fullyParallel`）。テスト同士で保存データや順序に依存しない。共通の `tests/e2e/helpers.ts` の `test` は、どのタブでもコンソールエラー・未処理の例外・ゲームの画像等の欠落があればテストを失敗にする（外部の地図タイル・Webフォントの取得失敗は除く）。都市間移動はデリー全体の操作に数分かかるため、ページ内のゲーム関数で実際の規則どおりにデリーを最後まで進めたセーブを作り、移動そのものを画面で操作している。

### E2Eテストを追加する際の判断基準

1. まず単体・統合テストで確認できないか考える。ゲームルール、AP・報酬、分岐・解放条件、保存形式・別タブ競合・破損データの保護、コンテンツ参照は `src/**/*.test.ts`・`scripts/**/*.test.ts` に書く。画面の中にしかない判定は、先に純粋関数へ移せないか検討する。
2. E2Eに残すのは、ブラウザで組み合わせて初めて起きる重大な失敗（画面の遷移、ReactとInkの実行、ブラウザの保存領域・再読み込み・別タブ、画像やスクリプトの読み込み）を、利用者と同じ操作で確かめる場合に限る。
3. 新しいファイルやテストを増やす前に、上の4つの流れへ1〜2個の確認を足せないか検討する。
4. 全観光地・全シナリオ・全選択肢・全デート・全品物の網羅、台詞や文言の一致、要素の位置・幅・余白、画面幅ごとの繰り返し、Debug画面の細部はE2Eにしない。
5. 共通の `test` を使い、固定時間ではなく保存のリビジョンや画面要素で待つ。状態の近道は、実際の操作では数分かかる場合だけ、実際のゲーム関数で作った通常のセーブを使い、理由をコメントに残す。テストのためにゲーム側の設計・分岐・設定を変えない。コンテンツファイルのパスには依存せず、IDと画面で確認する。
6. 追加・変更後は一式を3回続けて実行し、毎回通ることを確かめる。不安定なテストは再試行で隠さず、原因を直すか削除する。一式の実行時間は数分以内に保つ。

## CI（GitHub Actions）

GitHub Actionsは次のワークフローを実行する。同じイベントで動くジョブはすべて並列に動き、互いの完了を待たない。

| きっかけ | ワークフローとジョブ | 内容 |
| --- | --- | --- |
| PR（作成・push） | `ci.yml`「Content, types and production build」 | `npm run build`（コンテンツの検証・生成、型検査、本番ビルド、`dist/` の検査） |
| | `ci.yml`「Unit tests」 | `npm test`（全単体テスト） |
| | `e2e.yml`「E2E (gate)」 | E2E一式（`npm run test:e2e`） |
| `main` へのpush | `pages.yml` | `npm run verify` の後にGitHub Pagesへ公開する |
| | `e2e.yml`「E2E (gate)」 | E2E一式。公開と並列に動く |
| 手動（Actions画面の「Run workflow」） | 3つのワークフロー | それぞれ上と同じ内容 |

- 公開はE2Eの合格を待たない。`main` のE2Eは公開と並列に動き、失敗するとそのコミットのチェックが失敗（赤い×）になり、GitHubの通知設定に従って知らされる。公開済みの版に問題があれば、修正をPRで取り込んで再公開する。
- PRでは、新しいpushが来ると同じPRの実行中のCIとE2Eを取り消して最新のコミットだけを確かめる。`main` へのpushと手動実行は取り消さず、最後まで実行する。
- 画面の見た目・操作感・実機の確認は人が並行して行う。CIの合否を待つ必要はなく、CIの通過は目視確認の代わりにならない。
- E2Eはマトリクスの段（tier）ごとに別のジョブになる。現在は「gate」の1段だけ。本番ビルドでの確認などの段を足すときや、長い段を `--shard=1/2`・`--shard=2/2` で分けるときは、`e2e.yml` の `matrix.include` に項目を足す。足した段も並列に動く。
- Playwrightの設定（`playwright.config.ts`）：失敗したテストは再試行しない（不安定なテストは再試行で隠さず原因を直す）。失敗したテストだけ、スクリーンショットとトレースを `test-results/` に保存する。CI（環境変数 `CI` がある場合）では、さらに `test.only` が残っていれば失敗にし、2ワーカーで実行し、失敗の注釈・HTMLレポート（`playwright-report/`）・一覧を出力する。手元では一覧だけを出力し、ワーカー数はPlaywrightの既定（CPUの半数）。

### 失敗したときの見方

1. PRの「Checks」タブ、またはコミットの赤い×から失敗したジョブを開く。単体テスト・ビルドはジョブのログの末尾に、失敗したテストと理由が出る。
2. E2Eは、失敗したテストの行が注釈として実行結果ページ（Summary）の「Annotations」に出る。そのファイルがPRの差分に含まれる場合は、差分（Files changed）の該当行にも出る。ジョブのログには各テストの成否と失敗箇所が出る。
3. E2Eが失敗した実行では、実行結果ページ（Summary）の「Artifacts」に `e2e-<段の名前>` が14日間残る。ダウンロードして展開し、`npx playwright show-report playwright-report` でHTMLレポートを開く。レポートから各テストのスクリーンショットとトレース（操作ごとの画面・DOM・コンソール・通信）を見られる。トレースだけを見る場合は `npx playwright show-trace test-results/<テスト名>/trace.zip`。`test-results/<テスト名>/error-context.md` には失敗時のページの構造が残る。
4. 手元で同じテストを実行して再現する（`npx playwright test tests/e2e/<ファイル> --repeat-each=3` など）。CIでだけ失敗する場合は、待ち時間ではなく画面の状態・保存のリビジョンで待っているかを確かめる。

### 本番ビルドの検査

`npm run build` と `npm run verify` は、`vite build` の後に `npm run dist:check`（`scripts/check-dist.ts`）で `dist/` を検査する。Debug・人物素材のプレビュー（`src/dev/`）、テスト用の仮データ（`*-test-fixture.ts`・`tests/fixtures/`）、自動テスト専用・見本の旅行編（`zz_fixture_trip`・`sample_trip`）に固有の文字列が、公開されるファイルの名前か内容に1つでもあれば、ファイル名・文字列・その由来を表示してビルドを失敗にする。`vite.config.ts` は変えていない。

- 失敗した場合は、開発専用のモジュールを `import.meta.env.DEV` の分岐の外から読み込んでいないか、生成物（`src/content/generated/`）にテスト用・見本の旅行編が入っていないかを確かめる。生成物が原因なら `npm run content:build` で生成し直してからビルドする。
- 検出に使う文字列と由来のファイルは `scripts/dist-guard.ts` にある。由来のファイルを改名・改稿して文字列が消えると `scripts/dist-guard.test.ts` が失敗するので、そのファイルに固有の別の文字列へ差し替える。本番のコードやコンテンツが同じ文字列を使うとビルドが失敗するため、目印には開発用のファイルにしかない文字列を選ぶ。
