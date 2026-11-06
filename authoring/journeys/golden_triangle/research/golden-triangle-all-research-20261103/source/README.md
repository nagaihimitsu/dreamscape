# Dreamscape｜インド・ゴールデントライアングル編　現地調査・全統合版

**対象**：ユーザーが「第一を行いなさい」と指示した以降に制作された、次の**4つのZIP全件**を統合。  
**調査日**：2026-11-03（各原本の調査日を維持）。  
**GitHub照合基準**：[`feature/golden-triangle-foundation`](https://github.com/nagaihimitsu/dreamscape/tree/feature/golden-triangle-foundation)、コミット `c816d25f3cb638c5ca08f7a6a5d9c84d939ade62`。  
**今回の操作**：ローカルで4ZIPを展開、同じ対象の情報をキーで結合、重複した候補URLを統合、出典優先順位と不一致を明示。**Web再照合・GitHub書込・画像取得・道路再計算は実施していない**。

## まず読むもの

1. `00_SUMMARY.json`：全数・確度・ゲーム試算結果の概要
2. `canonical/`：Codexが参照する正規の**調査用統合台帳**（22系列）
3. `quality/SOURCE_PRECEDENCE.csv` と `quality/CONFLICTS_AND_DECISIONS.md`：重複・相違・採用規則
4. `integration/CODEX_HANDOFF.md`：本番反映までの工程と禁止事項
5. `source_history/` と `original_archives/`：4ZIPの全情報とスクリプト（監査・再現用）

## 統合した原本

| 順 | ZIP | 主な内容 |
|---|---|---|
| 1 | `Dreamscape_Golden_Triangle_Gate_Walk_Audit_20261103.zip` | 33地点のゲート・147徒歩監査・24川越え禁止・OSM計算手順 |
| 2 | `Dreamscape_Golden_Triangle_NonRoad_Gaps_20261103.zip` | 33乗継地点、30外国人料金／営業時間、9都市間、121駅間運賃、54行旅程試算 |
| 3 | `Dreamscape_Golden_Triangle_Research_Continuation_20261103.zip` | 6料金再照合、12→30写真ページ照合、運用16件、20件予算比較×2、列車時刻とゲーム仕様差分 |
| 4 | `Dreamscape_Golden_Triangle_Photo_Rights_Completion_20261103.zip` | 写真30件最終メタデータ監査、代替7件、撮影座標10件、権利確認の取得支援 |

元ZIPは `original_archives/` に**バイト単位で保存**、抽出ファイルも `source_history/` に保持。前回ZIP②の内部にZIP①がもう一度含まれますが、それも原本保全のため残しています。

## 最も重要な状態

- **33地点**：運営機関による正確な入口GPS確定 **0地点**。市場・庭園・架空ホテルに単独の「公式門」があるとは限りません。
- **徒歩147行**：同一地点0分×21、直線距離ベースの**試作**×102、橋通行未確認のため**歩行不可扱い**×24。異地点の道路網計測 **0/126**。
- **写真30件**：Commonsのファイルページは作者・ライセンス情報を照合済み。ただし**実画像0枚、目視0件、最終承認0件**。
- **外国人入場料30件**：ゲームモデル値と公開情報を分離。**運営者の現行券種を直接確定できない6施設**が残ります。
- **交通**：ジャイプール地下鉄の公式区間運賃121件。ただし駅出口から観光地までの歩行／待機時間未検証。都市間9案は予約済みの正確な運行・価格ではありません。
- **ゲーム経済**：₹30,000・2人・宿泊費0という**編集用**設定の試算。モデル上、メイン12件は残金₹3,560、全30候補を巡る一つの順路では26/30件・残金₹180。実際の旅程保証ではありません。

## 使用範囲

このZIPの `canonical/` はゲーム本番カタログではありません。ストーリー・Ink・敵・バトル・デート・正式背景画像はまだ作成されていません。`content/travel` に上書きしてはいけません。インド編は**ミラノ編とは別の新規セーブ**、インド内は `delhi→agra→jaipur` の3都市で状態を維持する方針です。

## 検証

```bash
python3 tools/verify_master.py
```

元各パッケージの検証スクリプトも `source_history/` にあります。
