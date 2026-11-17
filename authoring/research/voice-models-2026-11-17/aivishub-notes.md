# AivisHub モデル一覧（配役用）メモ

確認日: 2026-11-17。データ本体は `catalog/aivishub.json`。

## 1. 何を調べたか

- ユーザーが示した一覧（ダウンロード順、Official と Community）を、公開APIで全部取得した。
  - API: `https://api.aivis-project.com/v1/aivm-models/search?sort=download&tiers=Official&tiers=Community&limit=30&page=1〜3`
  - 1ページの上限は30件（`limit=100` は「30以下」とエラー）。3ページで77件。重複なし。API の `total` も77。
  - Official は4件（まお・コハク・みちのくあいり・らせつん）。残り73件が Community。
  - 生データ: `samples/aivishub/raw/page1.json`〜`page3.json`。
- AivisHub のページURLは `https://hub.aivis-project.com/aivm-models/<uuid>`。まおのページを開いて、タイトルと og:url が一致することを確かめた。
- 77件とも、話者は1人、対応言語は日本語のみ、構造は Style-Bert-VITS2 (JP-Extra)。スタイルは合計246。
- ボイスサンプルは各スタイル最大2本、計298本を取得して測った（`samples/aivishub/<uuid>/`）。

## 2. JSON の読み方

- `models[]` の主な項目
  - `licenseClass`: OK（無料Webゲームで商用も含め使える。クレジットが必須のものもある）／NC（非営利のみ）／条件付き（クレジット以外にも条件あり）。
  - `credit`: クレジットが必須か任意か、決められた書き方。
  - `styles[]`: スタイルごとの声の高さ（`f0_median_hz`・`f0_p10_hz`・`f0_p90_hz`）、高さの幅（`semitones`、半音）、速さ（`chars_per_sec`）。
  - `chars_per_sec_std_text`: 共通の文「おはようございます！現在時刻は7時30分です。…」を読んだ時の速さ。モデルどうしを比べる時はこちらが公平。
  - `impressionJa`・`genderGuess`・`ageBand`・`natural`: 説明文・AivisHubの表示・測定値だけから書いた推定。実際に聞いた判断ではない。
  - `realPersonJa`: 実在の人や声優の声か。
  - `pitchCrossCheck`: 最初のサンプルを別の方式（ケプストラム）でも測った値。76件とも差は3半音以内。
- 声の高さの目安: ヒロインは約245Hz。男性は約80〜250Hz（多くは100〜180Hz）、女性は約210〜420Hz（上限付近のものはもっと高い可能性）。

### 測定の限界

- 測定ツールの上限は500Hz。`nearPitchCeiling: true` のスタイルは、高い所が切れていて、実際はもっと高い可能性がある（例: まおは別方式で約421Hz）。
- 花音・るな・中2・桜音は、サンプルの文字起こしが音声より短く、速さは測れない（`chars_per_sec: null`）。
- サンプルがないスタイルは測れない。kokuren_voice はサンプルが1本もない。
- 速さは「字/秒」。漢字も1字と数えるので、違う文どうしでは比べにくい。
- 説明に「スタイルの強さ2.0」と書かれたサンプル（M1・M2・F1）は、感情を強めた状態の声。

## 3. ライセンス

| ライセンス | 件数 | 区分 | 商用 | クレジット | 主な注意 | 出典 |
|---|---|---|---|---|---|---|
| ACML 1.0 | 39 | OK | 可 | 任意 | なりすまし・誹謗中傷・政治宗教の呼びかけ・詐欺などは禁止 | https://github.com/Aivis-Project/ACML/blob/master/ACML-1.0.md |
| ACML-NC 1.0 | 7 | NC | 不可 | 任意 | ACML 1.0と同じ＋営利目的の禁止 | https://github.com/Aivis-Project/ACML/blob/master/ACML-NC-1.0.md |
| CC0 | 3 | OK | 可 | 不要 | なし | https://creativecommons.org/publicdomain/zero/1.0/deed.ja |
| Tαkoe利用規約（カスタム） | 16 | OK | 可 | 必須「Tαkoe:キャラ名」 | 宗教活動・ギャンブル関連・不適切なコンテンツ・キャラのイメージを損なう利用は禁止。青少年にふさわしくない表現はゾーニング | モデル内の規約文（規約ページ http://wedst.pj.ymhk.jp/tos.html は2回とも503で開けず） |
| JVNV（CC BY-SA 4.0） | 4 | 条件付き | 可 | 必須（表示） | 継承（SA）がかかる可能性 | https://creativecommons.org/licenses/by-sa/4.0/deed.ja ・ https://sites.google.com/site/shinnosuketakamichi/research-topics/jvnv_corpus ・ https://huggingface.co/litagin/style_bert_vits2_jvnv |
| AI声優（カスタム） | 2 | OK | 可 | 必須「AI声優-金苗」「AI声優-銀芽」 | 18歳以上の年齢制限作品には使えない。思想・宗教の過激な扇動は禁止 | https://aiseiyou.com/ |
| リダ（カスタム） | 1 | 条件付き | 可 | 必須「リダ」または「Lida」＋指定URL | 暴力的・性的な利用、学習への使用は禁止。ライセンスは都度変わる場合がある | モデル内の規約文 |
| 蒼月ハヤテ規約（カスタム） | 1 | OK | 可 | 必須「AivisSpeech: 蒼月ハヤテ」 | 政治・宗教活動、特定の団体の批判・応援は禁止 | モデル内の規約文 |
| Flow（カスタム） | 1 | OK | 明記なし（禁止もなし） | 規定なし | ゲームへの利用は明記して許可。モデルの改変・再配布・学習は禁止 | モデル内の規約文 |
| ACML-NC 1.1（kuroike ai、作者独自） | 1 | NC | 不可 | 規定なし | 公式のACMLには1.0しかない | モデル内の規約文 |
| Amene Lila Voice License 1.0 | 1 | OK | 可 | 必須「音声モデル：Amene Lila」 | 18禁・性的表現は禁止 | モデル内の規約文 |
| 楽心の探し場所 規約（カスタム） | 1 | 条件付き | 可 | 必須「楽間勇笑」 | 出力音声を他人が素材として使える形で公開するのは禁止 | https://docs.google.com/document/d/1E9Vsw3qqvM6sJ5NJlBVZfYKjIu28Ow1GAR9iroNr6oo/edit |

区分の合計: OK 63、NC 8、条件付き 6。

### 私たちのゲームに関係する点

- 生成した音声を無料Webゲームに入れて公開すること: ACML 1.0・CC0・各カスタムとも許されている（NCは非営利の場合のみ）。
- 商用かどうか: 無料でも、広告・課金・販売・仕事の受注などがあれば営利に当たる可能性がある。NCのモデル（8件）を使うかは、ゲームの運営の形を決めてからにする（判断はユーザー）。
- クレジット: ACML 1.0とCC0は義務なし。ただし次のものは説明文で表記を頼んでいる。
  - まお「AivisSpeech: まお」、コハク「AivisSpeech: コハク」（「クレジットして頂ける際は」＝任意）。
  - リアボVCの7件（ほのか・かりん・わかな・れな・さつき・もえ・すみれ）「声は(x.com/dopoiro)のAI」など（「お願いします」）。
  - MarkN「AivisSpeech:MarkN」（任意と明記）。
- 必須のクレジットは、Tαkoe 16件・JVNV 4件・AI声優 2件・リダ・蒼月ハヤテ・Amene Lila・楽間勇笑。
- 音声の加工（音量・ノイズ除去・MP3化など）: ACMLに加工を禁じる条項はない。Tαkoe・蒼月ハヤテ・楽心・Amene Lila・CC系は加工を許可と明記。AI声優・リダ・Flowは明記なし（未確認）。
- 恋愛の場面: 恋愛そのものを禁じるライセンスはない。性的・成人向けは AI声優・リダ・Amene Lila で禁止。Tαkoe と楽心は刺激の強い表現にゾーニングを求める。
- 実在人物の声（morioki・猩々博士・オレンジ・G59・akiRAM・MarkN など）: ACMLは「本人と誤解させない」ことを求める。クレジットに「音声合成モデル『○○』による」と書くのが安全。
- 宗教: Tαkoe・蒼月ハヤテ・楽心・ACMLは「宗教活動」や「宗教への賛否の呼びかけ」を禁じる。寺院や信仰の小話を観光として紹介するのは活動ではないと考えられるが、判断はユーザー。
- 楽間勇笑（楽心）: 音声ファイルを「自由素材」として配ったり、リポジトリで音声に自由なライセンスを付けたりしない。
- JVNVの4件（M1・M2・F1・F2）: 生成音声がCC BY-SA 4.0の「翻案物」に当たるかは未確認。当たる場合はその音声にもCC BY-SA 4.0を付ける必要がある。
- AivisSpeech本体: クレジット不要、商用も可（AivisSpeechの「よくある質問」）。ソフトはLGPL-3.0。

## 4. 配役用の早見表

男性→女性→中性→不明の順。各グループの中は声の低い順。声の高さと速さは最初のスタイル（ふつうはノーマル。様子ヶ丘シイナは「のーまる」）の値。区分の OK はクレジット必須のものを含む。

| 名前 | 区分 | 性別/年代 | 声の高さ(Hz) | 速さ(字/秒) | 自然さ | スタイル数 | クレジット |
|---|---|---|---|---|---|---|---|
| [kokuren_voice](https://hub.aivis-project.com/aivm-models/e40d5b99-8cde-4442-a45b-0ebec9167506) | OK | 男性/若い大人 | - | - | 不明 | 6 | 任意（ACML 1.0）。 |
| [Flow](https://hub.aivis-project.com/aivm-models/76a774e4-cc4d-4d8c-879e-8d2be3d30dad) | OK | 男性/若い大人 | 82 | 6.67 | 自然 | 21 | 必須ではない（利用報告は任意）。 |
| [G59](https://hub.aivis-project.com/aivm-models/83f2930e-4697-4265-822c-04d7337b3047) | NC | 男性/大人 | 83 | 7.4 | 自然 | 1 | 任意（ACML-NC）。 |
| [akiRAM](https://hub.aivis-project.com/aivm-models/1112959e-bb11-4a61-8c07-ebea8ea568cc) | NC | 男性/大人 | 102 | 7.03 | 自然 | 1 | 任意（ACML-NC）。 |
| [蒼月ハヤテ](https://hub.aivis-project.com/aivm-models/eefe1fbd-d15a-49ae-bc83-fc4aaad680e1) | OK | 男性/若い大人 | 105 | 7.44 | 不明 | 1 | 必須: 「AivisSpeech: 蒼月ハヤテ」。 |
| [ろてじん（匿名インタビュー風）](https://hub.aivis-project.com/aivm-models/80fe2db4-5891-4550-a3f3-dff9a91c0946) | OK | 男性/中年 | 105 | 8.17 | アニメ調/加工 | 1 | 任意（ACML 1.0）。 |
| [宗周定昌](https://hub.aivis-project.com/aivm-models/00f29eb2-e12b-4f64-a5e8-4188be62de33) | OK | 男性/若い大人 | 110 | 4.95 | アニメ調/加工 | 1 | 任意（ACML 1.0）。 |
| [観測症](https://hub.aivis-project.com/aivm-models/ed47c952-c253-405e-adba-1172399816a1) | OK | 男性/大人 | 119 | 6.58 | 自然 | 1 | 任意（ACML 1.0）。 |
| [kokuren_3rd](https://hub.aivis-project.com/aivm-models/3bef4d35-124e-4ddd-93d3-75f292732195) | OK | 男性/若い大人 | 121 | 7.97 | 不明 | 1 | 任意（ACML 1.0）。 |
| [立神ケイ](https://hub.aivis-project.com/aivm-models/b2bee8fc-3f65-4c99-9607-a1075a10066b) | OK | 男性/若い大人 | 125 | 7.43 | 不明 | 1 | 任意（ACML 1.0）。 |
| [すきやき馬太郎](https://hub.aivis-project.com/aivm-models/f493ab6c-1ffa-4534-9bbd-2ba398f17cd5) | OK | 男性/若い大人 | 129 | 6.67 | 自然 | 1 | 不要（CC0）。 |
| [fumifumi](https://hub.aivis-project.com/aivm-models/71e72188-2726-4739-9aa9-39567396fb2a) | OK | 男性/若い大人 | 129 | 5.76 | 自然 | 1 | 任意（ACML 1.0）。 |
| [亜空マオ](https://hub.aivis-project.com/aivm-models/9e9f84bd-05cd-4476-b47e-ad34264b2a03) | NC | 男性/若い大人 | 130 | 6.42 | アニメ調/加工 | 3 | 任意（ACML-NC）。 |
| [RakumaYue](https://hub.aivis-project.com/aivm-models/657f4f16-3cf5-4048-9a98-00987038ebf0) | 条件付き | 男性/10代 | 135 | 9.32 | アニメ調/加工 | 1 | 必須: キャラクター名「楽間勇笑」。 |
| [銀芽(ぎんが)](https://hub.aivis-project.com/aivm-models/052bb693-112b-45be-b498-8e05aa9d6e5e) | OK | 男性/中年 | 137 | 6.99 | 不明 | 4 | 必須: 「AI声優-銀芽」。 |
| [Shinjou Tomoharu](https://hub.aivis-project.com/aivm-models/098d4e66-2faf-4a00-889c-a1d2f05bde78) | NC | 男性/中年 | 138 | 6.77 | 自然 | 1 | 任意（ACML-NC）。 |
| [yukyu](https://hub.aivis-project.com/aivm-models/1f04a608-916c-4d9e-bf6e-b9da5c176f85) | OK | 男性/若い大人 | 138 | 5.8 | 不明 | 1 | 任意（ACML 1.0）。 |
| [MarkN](https://hub.aivis-project.com/aivm-models/f79e73ab-3320-473b-8e3f-713c30c39ed1) | OK | 男性/若い大人 | 139 | 8.14 | 自然 | 1 | 任意。する場合は「AivisSpeech:MarkN」（リンクも任意）。 |
| [natto-z](https://hub.aivis-project.com/aivm-models/0c032c2d-272a-4030-a75c-74dc6f7662ad) | OK | 男性/若い大人 | 140 | 8.54 | 不明 | 1 | 任意（ACML 1.0）。 |
| [TANAKA](https://hub.aivis-project.com/aivm-models/470a41e2-863f-4bf2-8a20-bf7cde0d8f7b) | OK | 男性/中年 | 151 | 7.44 | 自然 | 5 | 任意（ACML 1.0）。 |
| [kuroike ai](https://hub.aivis-project.com/aivm-models/ebd755af-392e-44ac-a523-53a1b1fa1377) | NC | 男性/若い大人 | 156 | 5.38 | 不明 | 5 | 規定なし（非営利のみ）。 |
| [阿井田 茂](https://hub.aivis-project.com/aivm-models/47e53151-a378-46f3-abee-ce13aa07feb1) | OK | 男性/中年 | 158 | 6.46 | 不明 | 7 | 任意（ACML 1.0）。 |
| [はきみて れく(瞭魅推 れく)](https://hub.aivis-project.com/aivm-models/70ad7e84-6a10-48d6-8f9a-8dac4bba3c0b) | OK | 男性/若い大人 | 158 | 7.98 | 不明 | 1 | 任意（ACML 1.0）。 |
| [猩々博士 (雑談ボイス)](https://hub.aivis-project.com/aivm-models/70a875a9-feae-41e6-a586-8cf9e47c6c0b) | OK | 男性/大人 | 163 | 8.03 | 自然 | 1 | 任意（ACML 1.0）。 |
| [にせ](https://hub.aivis-project.com/aivm-models/6d11c6c2-f4a4-4435-887e-23dd60f8b8dd) | OK | 男性/若い大人 | 166 | 7.51 | 不明 | 1 | 任意（ACML 1.0）。 |
| [オレンジ](https://hub.aivis-project.com/aivm-models/6e60c40a-6d0f-4d86-9d97-61c11402058a) | NC | 男性/若い大人 | 175 | 8.2 | 自然 | 1 | 任意（ACML-NC）。 |
| [澤原 玄二郎](https://hub.aivis-project.com/aivm-models/2e1fdde8-d089-42d7-b64f-cf89952b1bdc) | OK | 男性/若い大人 | 179 | 7.84 | アニメ調/加工 | 5 | 任意（ACML 1.0）。 |
| [Lux](https://hub.aivis-project.com/aivm-models/3dabea2b-cc10-41da-955b-4618ce84e716) | OK | 男性/若い大人 | 213 | 6.79 | 不明 | 1 | 任意（ACML 1.0）。 |
| [M2](https://hub.aivis-project.com/aivm-models/d1a7446f-230d-4077-afdf-923eddabe53c) | 条件付き | 男性/若い大人 | 218 | 6.97 | 自然 | 7 | 必須: CC BY-SA 4.0の表示（JVNVコーパスの作成者・ライセンス名とリンク・改変の有無）。 |
| [M1](https://hub.aivis-project.com/aivm-models/d7255c2c-ddd0-425a-808c-662cd94c7f41) | 条件付き | 男性/若い大人 | 232 | 5.82 | 自然 | 7 | 必須: CC BY-SA 4.0の表示（JVNVコーパスの作成者・ライセンス名とリンク・改変の有無）。 |
| [ろてじん（長老ボイス）](https://hub.aivis-project.com/aivm-models/696c98a2-c0b7-4fe7-8cf2-c7e9b8a9bd82) | OK | 男性/高齢 | 247 | 5.65 | アニメ調/加工 | 1 | 任意（ACML 1.0）。 |
| [楽町音穏_T3モデル](https://hub.aivis-project.com/aivm-models/0e8ea44c-d904-467d-a0e6-81d52b1db098) | OK | 女性/大人 | 213 | 6.99 | 不明 | 1 | 必須: 「Tαkoe:楽町音穏」の形の著作権表示。 |
| [水巻咲_T2モデル](https://hub.aivis-project.com/aivm-models/55696911-05cb-4cd2-bdb9-dbc8bfe6e5c7) | OK | 女性/大人 | 215 | 6.86 | 不明 | 3 | 必須: 「Tαkoe:水巻咲」の形の著作権表示。 |
| [蝶舞和香_T3モデル](https://hub.aivis-project.com/aivm-models/7ac45cff-1e2f-4545-91bb-e7b2cc67649b) | OK | 女性/大人 | 230 | 6.68 | 不明 | 3 | 必須: 「Tαkoe:蝶舞和香」の形の著作権表示。 |
| [矢月舞_T2モデル](https://hub.aivis-project.com/aivm-models/f13c2ec8-1069-403f-a23e-503b3a270c57) | OK | 女性/若い大人 | 240 | 7.18 | 不明 | 3 | 必須: 「Tαkoe:矢月舞」の形の著作権表示。 |
| [様子ヶ丘シイナ](https://hub.aivis-project.com/aivm-models/d6bfe943-6903-491f-8d01-454ad8f88c14) | NC | 女性/若い大人 | 241 | 6.34 | 自然 | 3 | 任意（ACML-NC）。 |
| [morioki](https://hub.aivis-project.com/aivm-models/baaae3c0-7b22-4605-8ba5-80c959b41a48) | OK | 女性/大人 | 252 | 7.56 | 自然 | 1 | 任意（ACML 1.0）。 |
| [鰻川叶恵_T3モデル](https://hub.aivis-project.com/aivm-models/33090ea6-7696-491b-afb9-86fdbc4c2e51) | OK | 女性/若い大人 | 256 | 6.71 | 不明 | 1 | 必須: 「Tαkoe:鰻川叶恵」の形の著作権表示。 |
| [Amene Lila](https://hub.aivis-project.com/aivm-models/ddbea2e2-e51f-48da-ace1-197b2c6a77bb) | OK | 女性/10代 | 257 | 4.71 | 不明 | 1 | 必須: 「音声モデル：Amene Lila」を見える場所に。 |
| [zonoko](https://hub.aivis-project.com/aivm-models/7fc08a41-b64d-456d-8b22-8e1284674775) | OK | 女性/若い大人 | 268 | 5.64 | 不明 | 5 | 不要（CC0）。 |
| [七日週_T2モデル](https://hub.aivis-project.com/aivm-models/baa6d55a-d751-49b8-bafb-b3a6555a100c) | OK | 女性/若い大人 | 271 | 5.84 | 不明 | 3 | 必須: 「Tαkoe:七日週」の形の著作権表示。 |
| [ほのか(~現実20代女子AIボイチェン~リアボVC公式モデル)](https://hub.aivis-project.com/aivm-models/59f96896-64d2-4378-830a-4d5feb3d81aa) | OK | 女性/若い大人 | 273 | 6.45 | 自然 | 5 | 依頼あり: 「声は(x.com/dopoiro)のAI」などの表記をお願いします（ACML上は任意）。 |
| [わかな(現実20代女子AIボイチェン@リアボVC公式モデル)](https://hub.aivis-project.com/aivm-models/f83c385c-829b-40c4-8c11-639027e61636) | OK | 女性/若い大人 | 290 | 6.78 | 自然 | 5 | 依頼あり: 「声は(x.com/dopoiro)のAI」など（ACML上は任意）。 |
| [かりん(現実20代女子AIボイチェン@リアボVC公式モデル)](https://hub.aivis-project.com/aivm-models/18972473-ca36-4e06-a33a-5cc14adba0c4) | OK | 女性/若い大人 | 294 | 6.65 | 自然 | 5 | 依頼あり: 「声は(x.com/dopoiro)のAI」など（ACML上は任意）。 |
| [さつき(現実20代女子AIボイチェン@リアボVC公式モデル)](https://hub.aivis-project.com/aivm-models/21d8d535-f206-462d-a3bb-05f8252dede7) | OK | 女性/若い大人 | 296 | 6.19 | 自然 | 5 | 依頼あり: 「声は(x.com/dopoiro)のAI」など（ACML上は任意）。 |
| [木角空_T2モデル](https://hub.aivis-project.com/aivm-models/d0471c7d-3adc-4c99-b7b7-0e91c4d9d96f) | OK | 女性/若い大人 | 301 | 7.49 | 不明 | 3 | 必須: 「Tαkoe:木角空」の形の著作権表示。 |
| [金苗(かなえ)](https://hub.aivis-project.com/aivm-models/1a322ad9-6b7e-4a6d-8d0b-c4cd264538dc) | OK | 女性/大人 | 307 | 6.28 | 不明 | 6 | 必須: 「AI声優-金苗」。 |
| [まい](https://hub.aivis-project.com/aivm-models/e9339137-2ae3-4d41-9394-fb757a7e61e6) | OK | 女性/若い大人 | 307 | 7.01 | 不明 | 1 | 任意（ACML 1.0）。 |
| [AI Maid K1-3486](https://hub.aivis-project.com/aivm-models/01a7121c-a96f-4809-8925-f5f7359be09e) | OK | 女性/若い大人 | 308 | 6.56 | 不明 | 1 | 任意（ACML 1.0）。 |
| [凛音エル](https://hub.aivis-project.com/aivm-models/f5017410-fbb5-49e1-97cb-e785f42e15f5) | OK | 女性/若い大人 | 308 | 7.91 | 不明 | 5 | 任意（ACML 1.0）。 |
| [AI Maid K2-3481](https://hub.aivis-project.com/aivm-models/16d1e9be-9ea2-4c8e-a73e-89b97a003705) | OK | 女性/若い大人 | 313 | 6.92 | 不明 | 1 | 任意（ACML 1.0）。 |
| [天深シノ](https://hub.aivis-project.com/aivm-models/0f6821f4-9f86-4da1-a41a-fbe6fff9ca88) | NC | 女性/若い大人 | 318 | 6.6 | アニメ調/加工 | 4 | 任意（ACML-NC）。 |
| [地良谷詩_T3モデル](https://hub.aivis-project.com/aivm-models/9badaf1f-f664-47de-9754-51ad6936d693) | OK | 女性/若い大人 | 324 | 6.9 | 不明 | 1 | 必須: 「Tαkoe:地良谷詩」の形の著作権表示。 |
| [雪降白華_T3モデル](https://hub.aivis-project.com/aivm-models/37e49039-522f-4608-b8d6-fc6716ada80e) | OK | 女性/若い大人 | 328 | 6.69 | 不明 | 1 | 必須: 「Tαkoe:雪降白華」の形の著作権表示。 |
| [リダ / Lida（感情表現モデル）](https://hub.aivis-project.com/aivm-models/446d2053-14ca-4b68-897c-380faf555b59) | 条件付き | 女性/若い大人 | 331 | 6.44 | アニメ調/加工 | 10 | 必須: 「リダ」または「Lida」と、指定のURLを話者に記載。 |
| [るな](https://hub.aivis-project.com/aivm-models/4f281e78-eba6-495a-8e50-5c322d02b5b1) | OK | 女性/10代 | 333 | - | 不明 | 1 | 任意（ACML 1.0）。 |
| [花音](https://hub.aivis-project.com/aivm-models/a670e6b8-0852-45b2-8704-1bc9862f2fe6) | OK | 女性/10代 | 338 | - | 不明 | 1 | 任意（ACML 1.0）。 |
| [もえ(現実20代女子AIボイチェン@リアボVC公式モデル)](https://hub.aivis-project.com/aivm-models/9a7feb22-b6f3-4f79-92d9-26849e063fa1) | OK | 女性/若い大人 | 342 | 6.41 | 自然 | 5 | 依頼あり: 「声は(x.com/dopoiro)のAI」など（ACML上は任意）。 |
| [梅𡵅弓哥_T3モデル](https://hub.aivis-project.com/aivm-models/1f677b65-741e-4ba4-b029-d5525deb82b8) | OK | 女性/10代 | 345 | 6.99 | 不明 | 1 | 必須: 「Tαkoe:梅𡵅弓哥」の形の著作権表示。 |
| [れな(現実20代女子AIボイチェン@リアボVC公式モデル)](https://hub.aivis-project.com/aivm-models/b1b8072f-809f-4c6d-9ba1-2ca94d9c3663) | OK | 女性/若い大人 | 350 | 6.03 | 自然 | 5 | 依頼あり: 「声は(x.com/dopoiro)のAI」など（ACML上は任意）。 |
| [みちのくあいり](https://hub.aivis-project.com/aivm-models/1b2830f4-8cf1-4184-a0d9-3a1bace3a844) | OK | 女性/10代 | 352 | 5.98 | アニメ調/加工 | 7 | 任意（ACML 1.0）。 |
| [中2](https://hub.aivis-project.com/aivm-models/9107b8b6-1ed1-43f5-bebe-0de4df4d229d) | OK | 女性/10代 | 366 | - | 不明 | 1 | 任意（ACML 1.0）。 |
| [葉土此_T2モデル](https://hub.aivis-project.com/aivm-models/d200a39c-7c0f-4e03-a947-b3f0cb8d3d6b) | OK | 女性/10代 | 368 | 6.9 | 不明 | 3 | 必須: 「Tαkoe:葉土此」の形の著作権表示。 |
| [F2](https://hub.aivis-project.com/aivm-models/25b39db7-5757-47ef-9fe4-2b7aff328a18) | 条件付き | 女性/若い大人 | 370 ↑ | 5.97 | 自然 | 7 | 必須: CC BY-SA 4.0の表示（JVNVコーパスの作成者・ライセンス名とリンク・改変の有無）。 |
| [F1](https://hub.aivis-project.com/aivm-models/6acf95e8-11a9-414e-aa9c-6dbebf9113ca) | 条件付き | 女性/若い大人 | 372 ↑ | 6.4 | 自然 | 7 | 必須: CC BY-SA 4.0の表示（JVNVコーパスの作成者・ライセンス名とリンク・改変の有無）。 |
| [大日椛_T2モデル](https://hub.aivis-project.com/aivm-models/fb04b883-13cb-40ef-b0ea-fad060a408e8) | OK | 女性/10代 | 373 ↑ | 6.59 | 不明 | 3 | 必須: 「Tαkoe:大日椛」の形の著作権表示。 |
| [騾馬原杏_T3モデル](https://hub.aivis-project.com/aivm-models/9f0d1fba-3acd-439a-8446-ea94e8ca6985) | OK | 女性/10代 | 374 | 7.04 | 不明 | 1 | 必須: 「Tαkoe:騾馬原杏」の形の著作権表示。 |
| [すみれ(現実20代女子AIボイチェン@リアボVC公式モデル)](https://hub.aivis-project.com/aivm-models/2ff1c526-27d4-4eeb-b069-4207ae5fe259) | OK | 女性/若い大人 | 383 | 6.46 | 自然 | 5 | 依頼あり: 「声は(x.com/dopoiro)のAI」など（ACML上は任意）。 |
| [火山夢_T2モデル](https://hub.aivis-project.com/aivm-models/e4ee047d-3af4-4936-90eb-29a3c9104709) | OK | 女性/10代 | 386 ↑ | 6.36 | 不明 | 3 | 必須: 「Tαkoe:火山夢」の形の著作権表示。 |
| [まお](https://hub.aivis-project.com/aivm-models/a59cb814-0083-4369-8542-f51a29e72af7) | OK | 女性/10代 | 391 ↑ | 6.36 | アニメ調/加工 | 6 | 任意。する場合は「AivisSpeech: まお」（説明文の指定）。 |
| [黄金笑_T2モデル](https://hub.aivis-project.com/aivm-models/734c12b6-eaf2-4dbd-8596-8663c72d2afa) | OK | 女性/10代 | 397 ↑ | 6.69 | 不明 | 3 | 必須: 「Tαkoe:黄金笑」の形の著作権表示。 |
| [夢咲舞空_T3モデル](https://hub.aivis-project.com/aivm-models/53c4bdca-992e-4289-8cf7-1338b11eb567) | OK | 女性/10代 | 416 ↑ | 6.74 | 不明 | 1 | 必須: 「Tαkoe:夢咲舞空」の形の著作権表示。 |
| [コハク](https://hub.aivis-project.com/aivm-models/22e8ed77-94fe-4ef2-871f-a86f94e9a579) | OK | 女性/10代 | 418 ↑ | 6.58 | アニメ調/加工 | 4 | 任意。する場合は「AivisSpeech: コハク」（説明文の指定）。 |
| [桜音](https://hub.aivis-project.com/aivm-models/3328da9a-8124-4619-a853-f7fc2f37889f) | OK | 女性/10代 | 424 ↑ | - | アニメ調/加工 | 1 | 任意（ACML 1.0）。 |
| [らせつん](https://hub.aivis-project.com/aivm-models/9f36ec0d-8dac-42dc-aff4-149c5f99faad) | OK | 中性/10代 | 303 | 5.7 | アニメ調/加工 | 8 | 任意（ACML 1.0）。 |
| [六弦エレキ](https://hub.aivis-project.com/aivm-models/ed0f793d-786c-4fde-8561-e8bbac7bfe1d) | OK | 不明/不明 | 212 | 6.8 | アニメ調/加工 | 4 | 任意（ACML 1.0）。 |
| [結亜ナル](https://hub.aivis-project.com/aivm-models/b79c40e4-8a5e-4f20-802c-2c0eba2f0983) | OK | 不明/10代 | 232 | 7.01 | アニメ調/加工 | 1 | 不要（CC0）。 |

「↑」は測定上限（500Hz）付近で、実際はもっと高い可能性があるもの。

### 配役で気をつける点

- 同じ声の人がいる組: まおとコハク（CV ねゆたろ）、みちのくあいりとらせつん（声 上戸恵里）、阿井田 茂と澤原 玄二郎（CV 古山キリヲ）。モデルは別でも、同じ編で両方使うと似て聞こえる可能性がある。
- 制作者が同じでよく似ている可能性がある組（未確認）: リアボVCの7件、Tαkoe の16件、JVNV の4件、MAHOPROGRAM の6件、kokuren の4件（凛音エルを含む）、ニッケルの2件（様子ヶ丘シイナ・立神ケイ）、オレンジの3件、ろてじんの2件、AI Maid の2件。
- ヒロイン（約245Hz）と高さが近い: morioki（約252Hz）、矢月舞（約240Hz）、様子ヶ丘シイナ（約241Hz）、鰻川叶恵（約256Hz）、Amene Lila（約257Hz）、蝶舞和香（約230Hz）。ヒロインと同じ場面で話す女性には、高さか声の質が離れたものを選ぶ。
- AI Maid K1・K2 は Irodori-TTS で作った合成音声から学習している。ヒロインも Irodori-TTS なので、声の感じが似る可能性がある（未確認）。
- 年配の男性の候補は少ない: 銀芽（渋い中年）、阿井田 茂（朗らかな中年）、Shinjou Tomoharu（落ち着いた中年、NC）、TANAKA（おとん）、ろてじん（長老ボイス、高めの老人演技）。
- 年配の女性はいない。大人の女性は 金苗（母親のような声）、morioki、水巻咲・楽町音穏・蝶舞和香（低めの女性声）が候補。
- 子どもの声の候補はほぼない。楽間勇笑（14歳の少年キャラ、声は約135Hz）、Amene Lila（AivisHub表示は「幼い女性の声」）、結亜ナル（高めの声だが成り立ちがネタ寄り）。
- 外国の人の訛りを表せるモデルは見つからなかった。全モデル日本語のみ。zonoko は英語話者の音声から作ったと書かれているが、訛りがあるかは未確認。
- 加工声・特殊な声: ろてじん（匿名インタビュー風、ピッチ加工）、澤原 玄二郎（ノイズ強め、出力後にノイズ除去）、六弦エレキ（機械音/環境音）、宗周定昌（「アニメのだれかっぽい」）。
- 様子ヶ丘シイナのスタイル「!選択しないでください」は使わない。
- Flow のおすすめは、感情表現の強さ（スタイルの強さ）0.95〜1.30、テンポの緩急0.90〜1.60。ささやき・気だるげは滑舌が悪くなりやすい（説明文）。

## 5. AivisSpeech の調整項目

出典: AivisSpeech Engine（https://github.com/Aivis-Project/AivisSpeech-Engine 、README「AudioQuery 型の仕様変更」、`voicevox_engine/model.py`、`app/routers/tts_pipeline.py`。commit 0eb6c1e、2026-11-15、Engine 1.2.0）と AivisSpeech エディタ（https://github.com/Aivis-Project/AivisSpeech 、`src/components/Talk/AudioInfo.vue`、`src/store/utility.ts`、`public/howtouse.md`。commit 77a3675、2026-07-13）。

テキスト欄ごとに、画面右の欄で次を変えられる。

| 画面の名前 | API名 | 範囲 | 初期値 | 意味 |
|---|---|---|---|---|
| 話速 | speedScale | 0.50〜2.00 | 1.00 | 話す速さ。2.00で2倍速。 |
| 感情表現の強さ | intonationScale | 0.00〜2.00 | 1.00 | 選んだスタイルの感情の強さ。VOICEVOXの「抑揚」とは別物。上げすぎると発声が崩れたり棒読みになる。ノーマルスタイルでは無効（スライダーが使えない）。 |
| テンポの緩急 | tempoDynamicsScale | 0.00〜2.00 | 1.00 | AivisSpeech独自。速さの緩急。大きいほど早口で生っぽい抑揚。 |
| 音高 | pitchScale | -0.15〜0.15 | 0.00 | 声の高さ。合成後に変えるので、0から動かすと音質が落ちる。 |
| 音量 | volumeScale | 0.00〜2.00 | 1.00 | 声の大きさ。 |
| 開始無音（秒） | prePhonemeLength | 0.00〜1.50 | 0.10 | 先頭の無音。 |
| 終了無音（秒） | postPhonemeLength | 0.00〜1.50 | 0.10 | 末尾の無音。 |

- 「間の長さ」（pauseLengthScale）は AivisSpeech Engine では効かない。エディタにも出ない。間は句読点や「…」で作る。
- Style-Bert-VITS2 の値との換算（Engine README）: 感情表現の強さ 0〜1 は「スタイルの強さ」0〜1、1〜2 は 1〜10。テンポの緩急 0〜1 は 0〜0.2、1〜2 は 0.2〜1.0。
- 疑問の抑揚は文末に「？」を付けるだけでよい。「！」「？」「…」「〜」に合わせて抑揚が付く。
- 長い文は句読点や会話の区切りで分ける（1回500文字以内が望ましい）。

### スタイルの選び方

- 話者ごとに複数のスタイル（喋り方）がある。テキスト欄の左のアイコンから話者とスタイルを選ぶ。
- 話者を選んだ時のスタイルは「設定」→「デフォルトスタイルの設定」で変える。
- 「ファイル」→「テキストを読み込む」では、`話者名,テキスト` や `話者名（スタイル名）,テキスト` の形で読み込める（例: `コハク（せつなめ）,さようなら。`）。スタイル名がなければデフォルトスタイル。依頼書の書き方に使える。
- スタイルごとにデフォルトプリセットがある。「設定」→「オプション」→「スタイル変更時にデフォルトプリセットを適用」で自動適用できる。
- 書き出しファイル名の初期設定は `$連番$_$キャラ$（$スタイル$）_$テキスト$.wav`（「設定」→「オプション」→「書き出しファイル名パターン」で変更可）。

### 読みとアクセントの直し方

- その場で直す: 画面下のアクセント欄で読みをクリックして書き換える。直したアクセント句は平板型に戻るので、必要ならアクセントを付け直す。アクセントの位置は読みの上のバーを左右に動かす。句の区切りは文字の間をクリックして分ける・つなぐ。
- 辞書に登録する: 「設定」→「読み方＆アクセント辞書」→「追加」。
  - 「単語」に表記、「読み」にひらがなかカタカナを入れる。
  - 「品詞」を選ぶ（固有名詞／地名／組織・施設名／人名／人名(姓)／人名(名)／普通名詞／動詞／形容詞／語尾）。
  - 「アクセント調整」のスライダーで音が下がる位置を決める（APIでは accent_type。音が下がる直前のモーラ番号、0は平板型）。
  - 「単語優先度」を決める（APIでは0〜10、推奨1〜9、未指定は5）。反映されない時は優先度を上げる。
  - ＋ボタンで、苗字と名前のような複合語を分けてアクセントを付けられる。
  - 複合語や英単語は、優先度にかかわらず反映されないことがある（現時点の仕様と Engine README に記載）。
  - 辞書は `user_dict.json` でエクスポート・インポートできる（インポートは足し合わせ）。依頼先へ辞書を渡す時に使える。
- API で登録する場合: `POST /user_dict_word`（surface＝表記、pronunciation＝カタカナの読み、accent_type、word_type、priority）。

## 6. 未確認のこと

- 声の性別・年代・性格・自然さは、説明文と測定値からの推定。実際に聞いての確認はしていない。
- Tαkoe の規約ページ（http://wedst.pj.ymhk.jp/tos.html）は開けなかった。モデルに入っている写しで確認した。Tαkoe のキャラごとの設定（年齢など）も未確認。
- JVNV モデルの生成音声に CC BY-SA 4.0 の継承がかかるか（法的な判断）。
- 楽心の規約が参照する「Bert-VITS2の禁止事項」の中身。
- AI声優・リダ・Flow の、生成音声の加工についての扱い。
- リアボVC のモデルについて、配布元（poipoipoi.booth.pm）に追加の条件があるか。
- kuroike ai の「ACML-NC 1.1」が Aivis Project の公式な版か（公式リポジトリには1.0のみ）。
- 宗周定昌の「アニメのだれかっぽい声」が、実在の声優の声を学習したものか。
- 同じ制作者のモデルどうしが実際に似て聞こえるか。
- ゲームが営利に当たるか（NCのモデルを使えるか）。
