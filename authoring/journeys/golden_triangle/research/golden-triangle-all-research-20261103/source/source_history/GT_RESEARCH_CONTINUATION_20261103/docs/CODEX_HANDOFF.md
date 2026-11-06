# Codex向け差分統合指示

対象 `nagaihimitsu/dreamscape` / `feature/golden-triangle-foundation`。

1. このパッケージは **作者の実装待ちのインド調査データに対する証拠差分**。旅行・バトル・エピソードの本番ファイルは変更・生成せず、まず `authoring/research/golden-triangle-20261103` へ隔離して取り込む。
2. `PRICE_AUDIT_ALL_30.csv` は既存のゲーム値と2026年の資料値を別列に持つ。**外国人料金6件を自動で上書きしてはならない。** またタージの₹1,100には公式上ASI/ADAが含まれる旨がある一方、別の公的資料に追加₹500の表記があり、機械的な二重課金は禁止。
3. `ACCESS_AND_OPERATIONS_16.csv` は地点ID単位の出入場・駐車場等の機能上の制約。`verifiedGateLatitude/Longitude` が空欄のままであり、`travel/*.json` の座標を「公式入場門」に書き換える根拠ではない。
4. タージ南門は `exit_only`、東西は `admit`。タージの外国人券に含まれる場内乗り継ぎをゲームのタクシー移動費として二重請求しない。
5. アンベール城 Suraj Pol と Chand Pol の違いは、物理の徒歩・車進入経路が別である証拠。ルートに `entryNodeId` 等を追加する設計が必要な場合は、機能を決めてからスキーマ拡張する。
6. `PHOTO_AUDIT_ALL_30.csv` の `filePageVerificationStatus` はページ閲覧の程度であり、**画像ファイル0件／本番利用0件**。ライセンスにCC BY-SAがあれば、縮小・編集等の改変告知と適切な継承を扱う。まず人が取得画像を観察し、用途が決定してから既存背景IDへ登録する。
7. `BUDGET_ENVELOPES_20.csv` は金銭面の「市内移動前残高」の上限目安。`all30 / car_car` は₹1,740しか残らない（既存モデル）。**旅行可能性を証明するものではない。** 2人の市内移動費、AP、曜日、開館時間、待ち時間で別途E2Eを行う。
8. Gatimaan 12050の08:10はゲーム内09:00より早い。実時刻をそのまま採用する場合、列車がゲーム上の当日開始前に出発する。前泊・前日出発・時刻の抽象化・便選択を決めてから接続する。指定日実運行と料金を勝手に確定しない。
9. この作業に伴いミラノ本体やシナリオを変更しない。次にインドのシナリオ完成後、都市／旅行編の共通予算・時間・AP・保存テストを追加し、`npm run content:check`、`npm run typecheck`、`npm test`、`npm run build`、必要なE2Eを実行する。


## 第4パスの追加ファイル

- `data/COMMONS_30_FILE_PAGE_AUDIT.csv`：30/30 Wikimedia Commons *個別ファイルページの本文*から作者・ライセンス・画像サイズを確認。**写真ファイル本体は0/30**。
- `data/HIGH_RES_ALTERNATIVES_2.csv`：低解像度ナハルガル城・透かし警告のジャイガル城の代替候補。どちらも実ファイルを取得・目視していない。
- `data/PRICE_SENSITIVITY_ENVELOPES_20.csv`：外国人券種の二次候補価格を変えたゲーム用予算の感度分析。現実の交通費ではない。
- `data/OPERATOR_WEB_FACTS_ADDENDUM.csv`：ASIオンライン割引の政府一次発表など。フマユーン廟の₹550/₹600は割引だけで説明されたと確定せず、官庁別ページの矛盾をそのまま保持。
- `scripts/download_all30_commons.py`：標準は計画のみ。`--fetch` 指定で画像原本を取得する。**保存済みのライセンスを自動採用するのではなく、APIで相違が出たら停止する。**
- `docs/FOURTH_PASS_FINDINGS.md`：追加の品質注意と次作業。

既存 `scripts/build_addendum.py` は第3パスの再構築用であり、第4パスの追補を認識しない可能性がある。過去のデータを上書きせず、新しい台帳を正本として扱い、必要なら更新差分をスクリプトへ移植してから再生成する。
