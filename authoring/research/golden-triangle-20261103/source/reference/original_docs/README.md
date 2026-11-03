# Dreamscape｜Golden Triangle Research – インド3都市実装準備

調査日：**2026-11-03 (Asia/Tokyo)** ／ 対象ゲーム：`nagaihimitsu/dreamscape` ／ 旅行編ID：`golden_triangle`

## このZIPの利用区分

**外部調査データと開発下書きです。ゲームにそのまま登録して公開できるパッケージではありません。** GitHubのファイルを変更していません。

- `30`件の観光地候補（デリー10、アーグラ10、ジャイプール10）、架空宿の地理アンカー3件、都市間の途中候補1件。
- 90件の史実/伝承/観察題材。ユーザー向けのクイズ・物語は一切制作していません。`classification` と `reliability` を確認してください。
- 87件の区分別入場料金行（未確認行含む）、33件の営業時間行（未確認・対立資料含む）、19件の交通モード・料金例、9件の都市間交通案、56件の画像台帳行、39件の入場/撮影制限記録。
- 徒歩優先網：3都市各7地点＝49方向ずつ（自己地点含む）、合計147行。**異なる地点間の歩行時間126行は未計算**。徒歩距離の推測補完なし。
- `travel/`の6ファイル：実際のZodオブジェクト構造に揃えた**リサーチ段階のテンプレート**。画像背景IDは未登録、`routes=[]`、`events=[]`で、現在の旅行機能に組み込めません。`initialBudget=0`などの数値は「未定」の占位子で本番用ではありません。
- `maps/*.geojson`は空のFeatureCollection。道路図形を取得していないため生成していません。

### 確認済み・未確認の読み方
- `documented_fact`：出典ページに記載があるという意味（その出典自体が唯一の歴史的真実だとは保証しない）。
- `interpretation` / `legend` / `hypothesis`：史実や検証済み事象へ昇格させない。
- `2026_secondary_needs_official_notice`：2026年料金改定の報道資料だが州政府の料金表原本照合前。
- `UNVERIFIED_DO_NOT_IMPORT`：歩行ネットワーク経路未取得。
- `file_and_license_verified`：作者・ページ・画像寸法・権利条件を確認し元ファイルURLも得た候補。ただしバイナリは未収録。`file_and_license_verified_original_url_pending`：直接元ファイルURLだけ未取得。

### 主要ディレクトリ
`data/` CSV+JSON、`research/` ガイドと判断根拠、`maps/` 不足記録、`travel/` 形状準拠の草案、`cities/` 地域カタログ草案、`codex/` 実装ガイドとテスト、`scripts/` 研究資料のチェック。

### 最重要の未解決事項
1. 調査対象都市の **実際のゲート座標** と歩行ネットワークの取得・経路計算。
2. 新規画像の入手とライセンスに適合した表示・クレジット機能。
3. 2026年料金の不一致（Delhi Humayun、Jaipur州立施設）、空白になっている各種料金・撮影制限。
4. 早朝・曜日・時期別営業時間、`INR`対応と2人分の課金単位、都市間移動の金銭/時間処理。
5. story/Quiz/date の内容は未確定。新都市を `complete` にすることは禁止。

参照URL一覧は `research/SOURCES.md` と `data/SOURCES.json`。
