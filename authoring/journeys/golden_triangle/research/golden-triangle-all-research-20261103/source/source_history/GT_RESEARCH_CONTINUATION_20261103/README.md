# Dreamscape | Golden Triangle 現地調査・続編（道路網以外の残件／第3パス）

調査基準日：**2026-11-03**。対象：`nagaihimitsu/dreamscape` の `feature/golden-triangle-foundation`、確認したコミット `c816d25f3cb638c5ca08f7a6a5d9c84d939ade62`。

## 要旨

前回の補完ZIP `Dreamscape_Golden_Triangle_NonRoad_Gaps_20261103.zip` を**置換せず追加で使う差分資料**です。
今回新たに照合したのは (a) 6料金未確定施設の証拠の追加、(b) 公式の入口・運行規則16件、(c) Wikimedia Commonsの主要12ファイルの作者・画像寸法・ライセンス説明の**ページ直接確認**、(d) 30候補の画像監査一覧、(e) ゲーム内予算20シナリオ、(f) 都市間列車のゲーム時計との不整合です。

**いずれもGitHub本体には書き込んでいません。** 原本の `cities/`、`travel/`、`content/` を勝手に上書きしないでください。シナリオ／敵／デート／写真本体は作成していません。

## 調査によって明確化した主な点

1. **タージ・マハル**は現在東・西ゲートから入場し、南ゲートは退出専用。Shilpgram（東）・Amrood ka Teela（西）の乗り継ぎが必要。**外国人入場券にバッテリーバス・ゴルフカートの料金が含まれる**と運営者が明記しているため、交通費の二重計上を避けます。[公式見学案内](https://tajmahal.gov.in/visiting-hours.aspx/night-view.aspx) / [公式禁止事項・交通](https://www.tajmahal.gov.in/dos-and-donts.aspx)
2. **アーグラ城**の一般入場はアマル・シング門。**ファテープル・シークリー**は麓に車を止めてバッテリーバスで移動することを地区政府が案内。[Agra Fort](https://agra.nic.in/tourist-place/agra-fort/) / [Fatehpur Sikri](https://agra.nic.in/tourist-place/fatehpur-sikri/)
3. **アンベール城**は徒歩アプローチが Suraj Pol、車が Chand Pol。**シティ・パレス**は駐車場が Gate 2 側。周辺の Gate 1 は美術施設への入場に使用される。[Rajasthan Tourism](https://www.tourism.rajasthan.gov.in/amber-palace.html) / [City Palace](https://citypalace.org/visit) / [Jaipur Centre for Art](https://www.jaipurcentreforart.com/visit)
4. **シティ・パレスの外国人価格₹1,200**は2026年の複数の二次サイトに見られ、元のゲーム用₹1,000と1人₹200異なる。ただし公式Webの「International」のタブは読み取れず、**正式な外国人運賃にはまだ昇格させない**。[比較資料](https://traveliac.com/india/rajasthan/jaipur/city-palace-jaipur) / [運営元](https://citypalace.org/visit)
5. **ジャイガル城の外国人料金は未確定**。運営元の国内料金₹200と、二次サイトの₹700 / ₹85が混在する。価格を勝手に確定させない。[運営元](https://www.jaigarh.co/visit)
6. **フマユーン廟**はデリー観光当局の2ページが₹600と₹550で矛盾。**ロータス寺院**は運営元の火〜日8:30–17:00、月曜休館が確認できた。[Delhi Tourism A](https://www.delhitourism.gov.in/tourist_place/humayun_tomb.html) / [Delhi Tourism B](https://delhitourism.gov.in/dt/explore_the_city/humayuns_tomb.html) / [Bahá’í temple](https://bahaihouseofworship.in/plan-a-visit/)
7. **Gatimaan 12050** の08:10出発は現行ゲームの09:00開始より早い。列車は史料・第三者時刻表で確認できるが、指定日の運行・価格・予約可能性は検証していない。[Indian Railways 2018 release](https://www.pib.gov.in/newsite/PrintRelease.aspx?lang=2&reg=48&relid=178275) / [2026参考時刻表](https://erail.in/train-enquiry/12050)
8. **画像12件はCommonsファイルページの作者・ライセンス・寸法を照合**。元ファイル本体は取得していない。ファテープル・シークリーの従来候補は遺跡全体ではなく **Hathi Pol の写真**。別候補を登録した。

## 数値を混同しない

- **ゲーム内試算**：30件入場費は₹21,760（2名分）、車の都市間移動は₹6,500、暫定列車モデルは₹2,430。すべて既存のゲーム編集値を合計したもので、公式運賃見積でも旅行予約でもない。
- **主要12件入場費**は既存ゲームモデルで₹15,940。交通・徒歩・曜日・デートAPの確定前に予算の完成度は判定できない。
- **証拠として確認できた価格**は施設ごとに `data/PRICE_AUDIT_ALL_30.csv` に根拠の階層を記録する。6料金は「最新の外国人券種を運営者から確定できない状態」が残る。
- **実際の入口GPS 0/33、道路網測定 0/126、画像バイナリ 0/30** は今も未完了です。特に匿名の外部座標や相場を実測・公式・現地確定と装わないでください。

## ファイル案内

- `data/PRICE_AUDIT_ALL_30.csv`：既存ゲーム用料金、今回新たに発見した候補、証拠レベル
- `data/SIX_FOREIGN_PRICES_OUTSTANDING.csv`：未確定6料金に絞った再照合の要点
- `data/ACCESS_AND_OPERATIONS_16.csv`：運営元等で根拠が取れた門・駐車場・休館関連16件
- `data/WEEKDAYS_AND_LATEST_HOURS.csv`：曜日・特別休止・販売終了
- `data/PHOTO_AUDIT_ALL_30.csv`：30候補のライセンス調査状況
- `data/PRIORITY_COMMONS_12_FILE_VERIFIED.csv`：12写真のファイルページ確認結果（**実画像ではない**）
- `data/BETTER_PHOTO_ALTERNATIVES_2.csv`：ファテープル・シークリー／ジャンタル・マンタルの別候補
- `data/TRAIN_TRANSFER_DELTA.csv`：列車の時刻・資料確実性とゲーム上の課題
- `data/BUDGET_ENVELOPES_20.csv`：入場費・都市間交通費のみの予算残高20パターン（**市内交通・イベント時間を含まない**）
- `data/OPEN_ISSUES_PRIORITIZED.csv`：まだ必要な調査・実装と次アクション
- `data/SOURCE_REGISTER_ADDENDUM.csv`：使用URL、情報源の階層・確認日
- `scripts/download_verified_commons.py`：ネット接続PCで明示的 `--fetch` を指定した時だけ写真本体を取得
- `scripts/validate_addendum.py`：全CSVの参照・項目・フラグ整合を確認
- `docs/CODEX_HANDOFF.md`：Codexへ渡す差分取り込みルール
- `docs/EVIDENCE_LIMITATIONS.md`：検証済・未確認の境界

## 動作確認（オフライン）

```bash
python3 scripts/validate_addendum.py
```

画像取得はこのZIPだけでは行われておらず、画像候補のページをその場で確認できても著作権処理完了とはしません。


## 第4パス追補：全30件画像ページの個別監査（2026-11-03）

前パスで未確認だった18件についても、Wikimedia Commonsの個別ファイルページを開いて作者・ライセンス・原画像寸法を確認した。`data/COMMONS_30_FILE_PAGE_AUDIT.csv` と更新済み `data/PHOTO_AUDIT_ALL_30.csv` を使用する。**30/30はファイルページの本文情報の確認であり、画像ダウンロードや画像内容の目視チェックではない。** 画像本体は引き続き0枚。

重要な品質問題：ジョーハリー・バザール800×600、ナハルガル城640×399、ジャイガル城はCommonsの透かし入り警告、ロディ・ガーデンは正方形、ファテープル・シークリーはハーティー門部分写真。`data/HIGH_RES_ALTERNATIVES_2.csv` にナハルガル城・ジャイガル城の代替候補を追加。ジョーハリー・バザールは現代の同一場所と確認できる高解像度画像をまだ特定していない。代替と称して異なる市場を使用しない。

`data/PRICE_SENSITIVITY_ENVELOPES_20.csv` は2026年二次資料の価格候補を使った予算変化を示す。入場券と都市間交通のみで、市内移動・食事・APは含まない。画像ライセンス・料金は**その場で公開・適用できる事実との保証ではない**。

別スクリプト `scripts/download_all30_commons.py` は30件の出典台帳を使う任意のダウンロードツール。`--fetch` を指定しない限り画像を取得しない。ダウンロード後も編集者による画像確認と使用条件のレビューを必須とする。


### 検証

```bash
python3 scripts/validate_addendum.py
python3 scripts/validate_fourth_pass.py
```

本ZIPの `MANIFEST.json` は第4パスの全ファイルを含むSHA-256台帳。以前の第3パス `scripts/build_addendum.py` を再実行すると新しい画像監査表を上書きする可能性があるため、**第4パスで追補された値を維持すること**。
