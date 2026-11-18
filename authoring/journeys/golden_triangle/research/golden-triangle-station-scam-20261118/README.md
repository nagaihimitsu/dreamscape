# ニューデリー駅「運休です」：調べと、作者に確かめてほしいこと（2026-11-18）

デリーを発つ日のニューデリー駅前の場面を、3つの道に分けた。この記録は、そのときの事実の調べの短い版と、作者に決めてほしいこと、まだ声のない新しい行の一覧。
入れた文とデータは、どれも下書き（作者の確認待ち）。Ink では、新しい塊・変えた塊の上に「// 下書き（2026-11-18）：作者の確認待ち。…」のコメントがある。

## 入れたもの

| 道 | 誰が通るか | 場面 |
| --- | --- | --- |
| 全員 | デリーの出発の時点（`# at: depart delhi`） | `gt_delhi_depart_scam`（−3。駅前の導入。最初の3択の後は終わる） |
| 道1 | ロディ・ガーデンのデートを終えた人（手がかり `gt_delhi_clue_dubey_announcement` を持つ） | 推理クイズB `gt_delhi_depart_scam_quiz`（−2。道を渡る前に見抜く。報酬の AP なし） |
| 道2 | 手がかりがなく、`rel spark >= 6`（仮） | `gt_delhi_depart_scam_office`（−2）の `sees_through`：彼女がノートの筆跡で見抜く。手付金なし |
| 道3 | それ以外 | 同じ場面の `taken_in`：見抜けない。使えるお金が 500 以上なら手付金 ₹500（額は案）を払う。足りなければ払えずに追い出される（お金は動かない） |

- 手がかり：ロディ・ガーデンのデート（`stories/places/gt_delhi_lodhi_garden.ink`）の頭の `# on_done: clue gt_delhi_clue_dubey_announcement`。デートを初めて終えたときに手がかり帳に入る。最初の3択の後に、ドゥベイが案内放送の口調で駅の運休の知らせ方を話す4行と、彼女の2行を足した。
- 駅の観光地 `delhi_new_delhi_station`（`tourism/catalog.json`。地図の出来事・案内・観察なし。写真は `gt_img_delhi_station_front`）と、手がかりカード3枚（正解「元・案内放送係の話」、はずれ「名札とベストと無線機」「『政府公認』の看板」。並びはベスト → ドゥベイ → 看板）。`cities/delhi.json` の `landmarkIdsPlanned` に駅を足した。
- 推理クイズ：`battles/catalog.json` の `gt_delhi_special_station_battle`、`quizzes/gt_delhi_special_station_quiz.json`（英語3問。第2問が推理の結論）、`learning/translations.json` の和訳3件、`learning/word-meanings.json` の語38、`presentation/characters.json` の `battleCharacters`（青年の絵 `gt_delhi_scam_young_man`）。
- 出典：`scenes/catalog.json` に `gt_delhi_depart_scam_office` の項（5件）を足した。−3 の `gt_delhi_depart_scam` の項は今のまま（下の質問1・16）。
- ホームの場面 `gt_delhi_depart_station` の station_004：案内所の場面を見た道（道2・道3）は今の「……一時間、遅かった」、見ていない道（道1）は新しい行「返事しておくね。今年のお客さんは、引っかかる手前で止まりました、って」。
- `authoring/journeys/golden_triangle/voice/cast.json` の場面の説明：`gt_delhi_depart_scam` を差し替え、`gt_delhi_depart_scam_quiz`・`gt_delhi_depart_scam_office` を足し、`gt_delhi_date_lodhi_garden` に1文足した。

文の変わらない今の行は、声の ID をそのまま使った（−3 の全行、案内所の背広の男・電話の声・荷運び・検札係、ヒロインの 004〜019）。`npm run voice:changes` で、録り直し 0 行・使われなくなった声はこの作業の前と同じ 15 本を確かめた。

## 事実の調べ（短い版）

確認日はどれも 2026-11-18（その日に本文を開いて読んだ）。本文を開けなかった資料は「本文未確認」とし、出典には使っていない。

### 確かめられたこと

| 事実 | 確度 | 資料 |
| --- | --- | --- |
| 鉄道駅などで政府観光局の職員を装って声をかけ、悪質な旅行会社へ連れて行くのが典型的な手口。インド政府観光局はツアーを手配しない。パハールガンジなどの小さな旅行会社は、空港や鉄道駅の客引きと結託している可能性が高い | 公的（外務省） | [外務省 海外安全ホームページ「安全対策基礎データ（インド）」](https://www.anzen.mofa.go.jp/info/pcsafetymeasure_001.html)（更新日 2025-08-22） |
| 鉄道駅で切符やツアーを持ちかける人は避けること | 公的（英国政府） | [GOV.UK「Safety and security - India travel advice」](https://www.gov.uk/foreign-travel-advice/india/safety-and-security) |
| 2016年、無許可の「Incredible India」「India Tourism」の事務所の強制捜査と、駅への警察のブースの設置が予定された（予定として報道） | 報道 | [Business Standard（PTI）2016-08-24](https://www.business-standard.com/amp/article/pti-stories/delhi-police-to-raid-unauthorised-tour-operators-116082401665_1.html) |
| 2019年、デリー警察が私設の旅行会社に、看板に政府のロゴを使わないよう申し渡した | 報道 | [Millennium Post 2019-05-30](https://www.millenniumpost.in/delhi/dont-use-govt-logos-to-misguide-passengers-delhi-police-to-private-travel-agents-355608) |
| 2022年、ニューデリー駅で検札係を装った11人が逮捕。多くが偽の採用通知と身分証を持ち、白いシャツに黒いズボンだった（RPF と営業部門の合同の摘発） | 報道 | [ThePrint（PTI）2022-09-02](https://theprint.in/india/fake-ttes-operating-at-new-delhi-rly-station-arrested-northern-railways/1113210) |
| 鉄道委員会は2024年、駅の旅客案内の表示板を NTES とつなぐよう指示。ホームの列車案内板は列車番号・列車名・運行状況を出す | 報道 | [ThePrint（PTI）2024-10-06](https://theprint.in/india/act-against-officials-for-wrong-train-data-in-passenger-information-systems-railway-board-to-zones/2299836) |
| ニューデリー駅の待合区画に PAS と電子の列車案内板がある（2026年3月、ラージヤ・サバーでの鉄道相の答弁）。PAS を「構内放送の設備」と書いたのは略語の読み | 公的（PIB） | [PIB Release ID 2246448](https://pib.gov.in/PressReleasePage.aspx?PRID=2246448) |
| 鉄道の問い合わせは電話139にまとめられ、列車の到着・発車も聞ける（2021年） | 公的（PIB） | [PIB Release ID 1703201](https://pib.gov.in/PressReleasePage.aspx?PRID=1703201) |
| 外国人旅行者向けの International Tourist Bureau は駅舎の First Floor（日本式の2階）。公式ページでは 2014-12-12 から24時間 | 公的（インド鉄道） | [Indian Railways「Facilities for International Tourist」](https://www.indianrail.gov.in/international_Tourist.html) |
| 列車が運休になると、e切符の運賃は自動で払い戻される（2015-07-01 から。TDR は要らない） | 公的（インド鉄道） | [Indian Railways「Revised Refund Rules w.e.f. 12.11.2015」](https://www.indianrail.gov.in/refund_Rules.html) |
| 「列車は運休、上の階で取り直しを」と声をかけ、路地の私設の旅行会社へ連れて行く。オートリキシャが「Government of India Tourist Office」などの看板の事務所へ連れて行く | 二次（旅行ガイド） | [Travel India Smart「India Travel Scams in 2026 and How to Spot Them」](https://www.travelindiasmart.com/trip-planning/india-travel-scams-2026)（公開 2026-05-20、更新 2026-10-11） |
| 客引きが「窓口は改装中で閉まっている」「道の向かいに移った」などと言い、上の階の外国人向け窓口へ行かせない | 二次（旅行ガイド） | [Bennion Kearny「Delhi Indian Railway Ticket Scam」](https://www.bennionkearny.com/?p=554)（2017-02-03） |

### 確かめられなかったこと・作中の作り事

- 「運休」の口実そのものを書いた公的な資料はない（旅行ガイドと報道の事例まで）。
- 「運休は駅の放送で知らせる」「駅の外で呼び止める者は駅の者ではない」：公的な資料に、この形の記述はない。台詞とカードでは、ドゥベイの経験（「わたしの知るかぎり」）として書き、出典の `claimJa` には書いていない。
- International Tourist Bureau が今も24時間か、払い戻しの決まりが今も同じか（下の質問2）、運休の SMS が今も送られるか：未確認。
- 2026年1月の黒いプリンスコートの廃止が検札係の上着に及ぶか：未確認。クイズの正解や手がかりの根拠に上着の色を使っていない。
- Travel Trends Today の記事（今の −3 の出典）：2026-11-18 は 403 で本文を開けなかった。米国務省・豪州 Smartraveller・在インド日本国大使館の資料も取得できなかった。
- 作中の作り事：青年・ベストの男・背広の男・電話の「駅長」・日本語の感想ノート・手付金 ₹500・「婚礼の季節で満席」・青年が「路地の上の誰か」に言い訳をすること・検札係の「毎日いますよ」・宿の主人の「毎年、誰かが引っかかる」。

## 作者に確かめてほしいこと

1. **−3 の出典の Travel India Smart の題名**：ページの題名は「India Travel Scams in 2026 and How to Spot Them」。新しく足した出典はこの題名にした。`scenes/catalog.json` の `gt_delhi_depart_scam` の項は「Common …」のまま変えていない（16 と一緒に決める）。
2. **払い戻しの決まり（第3問）**：公式ページ（2015年の改定規則）は本文どおり確かめたが、今も同じ規則かは公式の今の規則で確かめていない。公開前に IRCTC か鉄道の今の払い戻し規則で確かめる。第3問の文は今のままでよい。
3. **PIB 2026-03-28 の答弁を出典に使ったこと**（手がかり「元・案内放送係の話」と第2問）。運休を放送で知らせることは、ドゥベイの経験として扱っている。
4. **手がかり帳の出どころの印**：ドゥベイの話だけ「会話で聞いた」、ほかの2枚は「ケース資料」と出るので、正解が見分けやすい。会話を聞いた人へのごほうびとして受け入れるか。
5. **道2のしきい値** `rel spark >= 6`（仮）。書いたのは `gt_delhi_depart_scam_office` の `cond("rel spark >= 6")` の1か所だけ。
6. **推理クイズの曲**：−3 の `# bgm: gt_vadodora`・`# ambience: gt_amb_street_traffic` を続けている。クイズの既定の曲にするなら、`gt_delhi_depart_scam_quiz` の頭のこの2行を消す。
7. **道1のアルバムの写真**：ない（道2の `gt_album_d84` は案内所での瞬間なので使っていない）。作るなら絵の発注。
8. **ロディ・ガーデンのデートの行き先の資料**（`romance/date_destinations.json` の facts）に駅の話の出典を足すか。今は手がかりカードに置いた。
9. **英語の問いで嘘を引くこと**：第1問と第3問は、青年の言い分を「The young man says …」の形で引いている。学習の上で紛らわしくないか。
10. **道1の終わりの返事の3択（任意で入れてある）**：「……してない」affection +1、「ドゥベイさんの放送のおかげ」trust +1、「先に思い出したのは、こっちだから」spark +1（案）。クイズの中の札なので、最初に遊んだときだけ当たる。外すなら、3択と返事3行と下の「-」を消し、「次は、わたしが先に気づく番だからね」だけ残す。
11. **ロディ・ガーデンのドゥベイの4行**（あいさつ1行と、知らせ方の3行）と、置き場所（最初の3択の後の合流。分かれ道がないので、デートを遊ぶ人は全員が聞く）。
12. **ホームの地の文の直し**：「黒い上着の検札係」を「黒い上着を羽織った検札係」にした（声なし）。道1のカードの「白いシャツに黒いズボン」と並べて違って見えないようにするため。今のままでもよい。
13. **cast.json の `gt_delhi_depart_station` の説明**：足していない。この場面には配役した声の台詞がない（宿の主人の行は携帯の伝言で、録音しない）ので、足すと `voice:script` が「場面の状況の knot に、配役した声の台詞がありません」と注意する。
14. **推理クイズの青年の声**：決まった。クイズの中の行は `# speaker: enemy` のままで、`battleCharacters` が青年（`gt_delhi_scam_young_man`）を結ぶので、`voice:script`・`voice:changes` は −3 と同じ青年の声として数える。
15. **第1問の出典**：解説には旅行ガイドの話を書いていないが、出典2件（Bennion Kearny・Travel India Smart）は問いの前提（よくある口実）を支えるものとして残した。
16. **−3 の出典の差し替えの案**（今は変えていない）：Travel India Smart の title を直して checkedAt を 2026-11-18 に（claimJa のアプリは本文どおり「IRCTC のアプリ」）、本文を開けない Travel Trends Today を Bennion Kearny（窓口が閉まった・向かいに移ったという口実）に、erail.in をインド鉄道の公式ページ（International Tourist Bureau は駅舎の First Floor）に替えるか。
17. **案内所の場面の出典のインド鉄道の公式ページ**：claimJa に「2014年12月から24時間（今も24時間かは未確認）」と書いた。台詞の荷運びは「今日も開いてる」としか言わないので、24時間の部分を外してもよい。
18. **名前の付け方**：下書きのとおり、クイズ ID `gt_delhi_special_station_battle`、場面（knot）`gt_delhi_depart_scam_quiz`（`stories/places/gt_delhi_inserts.ink`）、問題 `gt_delhi_special_station_quiz` にした。[技術設計の「IDの付け方」](../../../../../docs/02_TECH_ARCHITECTURE.md#idの付け方)の特殊戦B（`places/<頭>_<観光地>.<頭>_special_b_<観光地>`、knot の名前＝バトルID、手伝いは `_claim`・`_press`）とは違う（ビルドは止めない）。そろえるなら、遊ぶ人のセーブに場面 ID が入る前に決める。
19. **手付金 ₹500 の払い**：いちばん安い本筋だけの道（デートなし）は、手がかりがなく spark も低いので道3に入り、使えるお金が 500 以上なら必ず払う。今の予算の余裕は大きいが、本筋の必要額の表（収支表の「本筋だけ」）にこの払いは入らない。
20. **絵と音**：クイズの青年は −3 の絵（`gt_delhi_scam_young_man`）を使う。`portrait` は、インド編のほかのクイズと同じ `abstract`（絵が読めないときに描いた顔を出さない）にした。

## まだ声のない新しい行（録音の発注用）

`npm run voice:changes -- --journey golden_triangle` の「台本にない新しい台詞」に出る43行。声を作るときは `npm run voice:script` で台本を作り直す（声の ID はそのとき決まる）。

| 場面 | 話し手 | 行数 | 行 |
| --- | --- | --- | --- |
| ロディ・ガーデン | ヒロイン | 2 | 「駅の案内放送をされていたんですよね。……」、「放送で言われると、忘れられなさそう」（主人公への小声） |
| ロディ・ガーデン | ドゥベイ | 4 | 「さようでございます。では、元・放送係より、お知らせいたします」「運休・遅れのご案内は、……」「駅の外でお客様をお呼び止めし、……」「ご不明の点は、……以上、お知らせでした」。どれも案内放送の口調で。「139番」の読み（「いち・さん・きゅう」など）は録音のときに決める |
| 推理クイズ（道1） | ヒロイン | 16 | 主張の後の「本当なら、急がなきゃ。……」、追及の「駅の方なんですよね。……」、「ドゥベイさん！……」「確かめよう。自分たちで」「Thank you. We'll check it ourselves.」、第2問の不正解の「ううん。駅の放送と、……」、アプリを開いた人の「さっきのアプリの『定刻』も、……」、「本当に運休だったら、……」、第3問の正解の「だよね。念のため、……」・不正解の「待って。鉄道の決まりを……」、「運休になったe切符は、……」「助かった。……」、返事の3択の「してたよ。……」「そうだね。笑う会に……」「はいはい。……」、「次は、わたしが先に気づく番だからね」 |
| 推理クイズ（道1） | 青年（−3 と同じ声） | 12 | 導入1、第1問の後1、主張2、追及1、はずれの証拠への返し2、正しい証拠の後1、第2問の前の言い返し1、第2問の正解1、第3問の前1、去り際「……今日は、ついてないな。どうぞ、よい旅を」（芝居の外の声が一言だけ出て、すぐ戻る） |
| 案内所（道3） | ヒロイン | 6 | 「……待って。少し、考えたい」、「少しだけ、外に出よう。……」（払った道）、「……駅の掲示板、自分の目で見に行こう。……」（払えない道）、「定刻……！……」、「払えなかったから、……」（払えない道）、「……ありがと、黙っててくれて。……」（水を渡す選択） |
| 案内所（道3） | 背広の男 | 2 | 「では、手付金だけ。考えるお時間は、お約束します」、「……では、お金をご用意してから、またどうぞ」（払えない道） |
| ホーム（道1） | ヒロイン | 1 | 「返事しておくね。今年のお客さんは、……」 |

- 文を変えた今の行は、ホームの地の文1行（声なし）だけ。使わなくなった録音済みの行はない（使わなくなったのは、声のない地の文「男が立ち上がる。その間、彼女はノートをめくっていた。」だけ）。
- 新しい地の文（声なし）：ロディ・ガーデン2行、推理クイズ、案内所の「案内してきた青年は、戸口で軽く頭を下げて、階段を下りていった。」など。
