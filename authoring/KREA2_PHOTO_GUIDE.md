# Krea 2 で写真を作るやり方（アルバム・SNS）

アルバムの写真と SNS の写真を、画像を作る AI（Krea 2）で作るときの、プロンプト（英文）の書き方と、頼み方・受け取り方の手引きです。インド編の作り直し（02〜09）で分かったことを、2026-11-27 にまとめ直しました。アルバムと SNS の Krea 2 の依頼は、この手引きに従って書きます。

- 人に描いてもらう絵（立ち絵・ミニゲームの絵など）の依頼書は [発注マニュアルの5章](ORDERING_MANUAL.md#5-絵の依頼書) です。この手引きは、ユーザーが ComfyUI で Krea 2 を回して作る写真だけを扱います。
- 人物の外見の英文は、旅行編ごとの `authoring/journeys/<旅行編ID>/album-photos/00_characters.txt` にあります（インド編は[こちら](journeys/golden_triangle/album-photos/00_characters.txt)）。
- これまでの生成の記録と原因の調べは [album-photos/README.md](journeys/golden_triangle/album-photos/README.md) と [08_strategy_krea2.md](journeys/golden_triangle/album-photos/08_strategy_krea2.md) です。この手引きと食い違うときは、この手引きに従います。

## 目次

- [1. 画風が変わった原因（2026-11-27）](#1-画風が変わった原因2026-11-27)
- [2. 決まり（10か条）](#2-決まり10か条)
- [3. 生成の設定](#3-生成の設定)
- [4. プロンプトの組み立て](#4-プロンプトの組み立て)
- [5. 決まった文（そのまま貼る）](#5-決まった文そのまま貼る)
- [6. 場面の文の書き方](#6-場面の文の書き方)
- [7. SNS の写真](#7-sns-の写真)
- [8. 依頼ファイルの形](#8-依頼ファイルの形)
- [9. 届いたら点検すること](#9-届いたら点検すること)
- [10. 画風の確かめ（試作3枚）](#10-画風の確かめ試作3枚)

## 1. 画風が変わった原因（2026-11-27）

09（2026-11-27 に67枚を差し替えた作り直し）の絵から、ヒロインの見た目と絵の塗りが、それまでの絵と変わっています。ゲームに入っている絵を、02（ヒロイン1人の183枚）・05（ほかの人物も写る絵の作り直し）・09 に分けて見比べました。

| | 02・05 の絵（見本にする） | 09 の絵（変わった） |
| --- | --- | --- |
| 髪 | まっすぐ寄りのボブで、毛先だけ軽くはねる | 強いくせ毛・巻き毛。量が増えて暗い |
| 服の襟 | 立ち襟に小さなボタンが3つ | 丸首。Tシャツのようなワンピース |
| バッグ | 胸の前に斜めに掛けた小さな黒いボディバッグ（立ち絵と同じ） | 腰の横に下がる四角い肩掛けのバッグ |
| 目 | 大きく、光が入る | 小さめで、光が少ない |
| 線と塗り | 細い線、明るい色 | 太い線、ざらついた質感、濃い茶色の影。顔が写実寄り |
| クオッカ | 丸い顔の、ぬいぐるみのような姿 | 本物の動物に近い頭と毛 |

プロンプトを比べると、変わったのは 09 からです。

| | 02 | 05 | 09 |
| --- | --- | --- | --- |
| 画風の文 | `sparkling eyes with bright highlights` あり | あり | **外した** |
| ヒロインの外見文 | 立ち絵を見て書いた長い文（約75語） | 同じ | **短くした**（`wavy brown bob`・`long white dress`・`black crossbody bag`） |
| クオッカの外見文 | （写さない） | 長い文（約60語） | **短くした**（`gentle smile`・`big glossy dark-brown eyes` などが消えた） |
| ほかの人物 | — | 00_characters.txt の英文をそのまま | 15〜25語に縮めた（絵ごとに違う縮め方） |
| 1件の長さ（平均） | 172語 | 334語 | 149語 |

- **原因は、決まった文を短くしたこと**です。`wavy brown bob` が巻き毛に、`long white dress` が丸首のワンピースに、`black crossbody bag` が肩掛けのバッグになりました。`sparkling eyes` を外したことで、目と顔の描き方も変わりました。
- 短くしたのは、同じ人物が2人出る絵を減らすため（[08 の作戦1](journeys/golden_triangle/album-photos/08_strategy_krea2.md#作戦1書き方を変える費用なし全部の作り直しに使う)）でした。けれども、重なりが直ったのは主に「否定の文を消した」ほうの効き目で、09 でも重なりは残りました（J-091・J-097 など）。
- `sparkling eyes` を外したのは、目を閉じる絵（眠る・くしゃみ）とぶつかると考えたからでした。けれども、外しても A-062（眠る）・D-111・A-070（くしゃみ）は出ませんでした。外した得はなく、画風が変わっただけでした。
- 05 は長い文のままで、画風は 02 とそろっています。決め手の文を外見の文より前に置いても、画風は変わっていません。

**結論：画風の文と、ヒロイン・クオッカ・ほかの人物の外見文は、決まった文を全件そのまま使い、絵ごとに縮めたり言い換えたりしない。** 否定の文を書かないこと、表情を体の形で書くことなど、09 で効いた書き方は続けます。

## 2. 決まり（10か条）

1. **画風の文は、決まった4つのどれかをそのまま使う**（5.1）。語を足したり外したりしない。
2. **ヒロインとクオッカの外見文は、決まった文をそのまま使う**（5.2・5.3）。変えてよいのは、決めた所（服を替える・腰から上で足もとを外す・クオッカの表情）だけ。
3. **ほかの人物の外見文は、00_characters.txt の英文をそのまま使う**（5.4）。外すのは、手に持つ物の句（`holding …`・`carrying …`）だけ。
4. **否定の文を一切書かない**（`no`・`not`・`only`・`without`・`faceless`・`close-up`・`each appearing only once`・`No text, no logos …`）。欲しいものだけを書く（6.1）。
5. **人・持ち物・位置は1度だけ書く**。決め手の文で位置と動作を書き、外見の文で見た目を書く。同じ物を2つの文に書かない。
6. **決め手（その写真の見どころ）を、外見の文より前に書く**（4章の順）。
7. **表情は、顔と体の形で書く**。感情の語（surprised など）だけにしない。出にくい表情は、同じ場面の別の瞬間に替える（6.3）。
8. **画角は人数で決める**。3人以上は全身か膝から上。腰から上は2人まで。`close-up` の語は使わない（6.2）。
9. **字の出やすい物は、なるべく画面に出さない**。出すときは色・模様・形だけを書く（6.4）。
10. **1つの文につき種を2つ以上作って選ぶ**（3章）。書き方は1通り（文で書く。09 の A の形）にする。

## 3. 生成の設定

これまでと同じにし、変えません。設定を変えると画風も変わるためです（変えるときは、10章の試作で先に確かめる）。

| 項目 | 値 |
| --- | --- |
| モデル | `krea2_turbo_bf16-Q5_1.gguf`（Krea 2 Turbo） |
| 文の読み取り | `qwen3vl_4b_fp8_scaled` |
| 手順 | 8ステップ、cfg 1.0、`er_sde` ＋ `simple` |
| 大きさ | 1344×896（3:2。アルバムも SNS も枠は 3:2） |
| 負のプロンプト | 空（cfg 1.0 では効かない） |
| 参照画像 | 使わない（文だけで作る） |
| 種 | `batch_size` 2。表情が決め手の絵と、3人以上の絵は 4 |
| ファイル名 | SaveImage の `filename_prefix` を、依頼ファイルの「ファイル名」の行にする |

送るとき：zip は1つ25MBくらいまでに分けます（約29MBを超えると途中が切れた）。種を2つ以上作ったときは、良いほうだけを送るか、全部を送って点検でこちらが選びます（依頼ファイルの頭に、どちらにするかを書く）。

## 4. プロンプトの組み立て

1つの文（英文）を、次の順に並べます。

1. **画風の文**（5.1 の4つのどれか）
2. **写真の文**（SNS だけ。7章）
3. **人数と画角と場所の一言**：`Two full figures by a lake, head to toe at eye level.`・`Three figures at an arched entrance, a medium-wide shot at eye level, full figures.`・`A young woman seen from the waist up in a narrow Delhi lane.`
4. **決め手**：人ごとに1文。位置（左・中・右）、動作、顔と体の形。いちばん大事な人から。
5. **外見の文**：人ごとに1文。決まった文をそのまま。4 と同じ呼び名・同じ順で。
6. **場所**：名所の名前と、見て分かる形・色・材料。
7. **光**：最後の1文（時間・光の向き・空気）。

- **呼び名をそろえる**：ヒロインは `the young woman`、主人公は `the quokka`。ほかの人物は役の語（`the elderly woman`・`the tea stall owner`・`the bride`）で、4 と 5 で同じ語を使います。ほかの若い女性を `young woman` と呼ばない（ヒロインと混ざる）。
- **長さの目安**：決まった文が長いので、1人で約150〜200語、2人で約200〜270語、3人で約260〜340語になります。縮めるのは決め手・場所・光の文だけです。
- 1人の絵も同じ順にします：`A young woman seen from the waist up …` → 決め手 → `The young woman has …`（外見）→ 場所 → 光。

## 5. 決まった文（そのまま貼る）

### 5.1 画風の文

| どの絵か | 文 |
| --- | --- |
| 顔の写る人がいる・日が当たる（屋外の昼・夕方、日の差す屋内） | `Detailed modern anime illustration with rich soft shading, fine detailed hair strands, sparkling eyes with bright highlights, warm sunlight, highly detailed background.` |
| 顔の写る人がいる・日が当たらない（夜・雨・曇り・暗い屋内・明け方） | `Detailed modern anime illustration with rich soft shading, fine detailed hair strands, sparkling eyes with bright highlights, highly detailed background.` |
| 顔の写る人がいない・日が当たる（人のいない絵、手だけ・後ろ姿だけの絵） | `Detailed modern anime illustration with rich soft shading, warm sunlight, highly detailed background.` |
| 顔の写る人がいない・日が当たらない | `Detailed modern anime illustration with rich soft shading, highly detailed background.` |

- 眠る・くしゃみ・目をつぶる絵でも、`sparkling eyes` を外しません（1章）。
- 人のいない絵で髪と目の語を書くと、人が描かれやすくなります。だから顔の写る人がいない絵だけ、その2語を外します。

### 5.2 ヒロイン

いつもの服・全身（足もとまで写る絵）：

```text
The young woman has shoulder-length brown bob hair with slightly wavy tips and warm amber-brown eyes, and wears a light grey baseball cap, a long white A-line dress reaching her ankles with a band collar and three small buttons at the chest, loose elbow-length sleeves, and a light grey pleated underskirt peeking out below the hem, a black crossbody body bag worn diagonally across her torso with the bag resting at her front hip, and black flat sandals.
```

いつもの服・腰から上（足もとが写らない絵。足もとの語があると、全身の彼女がもう1人出やすい）：

```text
The young woman has shoulder-length brown bob hair with slightly wavy tips and warm amber-brown eyes, and wears a light grey baseball cap, a long white A-line dress with a band collar, three small buttons at the chest and loose elbow-length sleeves, and a black crossbody body bag worn diagonally across her torso with the bag resting at her front hip.
```

服を替えるとき：髪と目の所までを残し、`and wears` の後ろだけを替えます。

```text
The young woman has shoulder-length brown bob hair with slightly wavy tips and warm amber-brown eyes, and wears <服の文>.
```

| 服 | `<服の文>` |
| --- | --- |
| 夜のパーカー | `a light grey hoodie over her long white A-line dress with a band collar, and a light grey pleated underskirt peeking out below the hem`（フードをかぶるなら `a light grey hoodie with the hood up over …`） |
| 帽子を外す | 全身か腰から上の文から `a light grey baseball cap, ` だけを外す |
| 店で買った服 | 旅行編の服の英文（インド編は [02 の頭](journeys/golden_triangle/album-photos/02_heroine_only_krea2.txt)：青いサリー・紺のサルワール・カミーズ・木版プリントのクルタ・翡翠色のアナルカリ） |
| 手の模様（メヘンディ）・腕輪・裸足 | 服の文は替えず、決め手の文に書く（例 `her palms covered in fresh dark-brown henna patterns`・`barefoot on the marble`） |

- バッグは、この文のほかに書きません（ほかの人物やクオッカに移るため）。
- 立ち絵：`public/assets/characters/heroine/default_01/standing_01/neutral.webp`。

### 5.3 主人公（クオッカ）

```text
The quokka is a small anthropomorphic quokka traveler about half her height, with fluffy light tan-brown fur, a round chubby face with the quokka's famous gentle smile, small rounded ears, big glossy dark-brown eyes, a small dark nose and a short thick tail, wearing a light grey hoodie, black trousers, white sneakers and a small white backpack.
```

- クオッカの表情が決め手の絵（照れる・固まる・にやりとする）だけ、` with the quokka's famous gentle smile` を外します。
- ヒロインが写らない絵では、`about half her height` を `about the size of a small child` にします。
- 持ち物は `a small white backpack` だけです。ほかのバッグの話を、クオッカの文に書きません。

### 5.4 ほかの人物

```text
The <呼び名> is <00_characters.txt の en>.
```

- en は立ち絵を見て書いた文です。そのまま使い、縮めません。
- en の終わりの、手に持つ物の句（`holding a black smartphone`・`carrying a steaming plate of noodles`・`with a canvas tote bag stuffed with papers` など）は外します。持ち物は、その場面で要るときだけ決め手の文に1度書きます（同じ物を2回書くと2つ出る。杖が2本になった A-131）。ただし、いつも身につけている物（杖・カメラなど）がその人の目印なら、en に残して決め手の文には書きません。
- 服が立ち絵と違う絵（SNS の過去の投稿のふだん着・制服など）：en の `wearing` から後ろの服の所だけを替え、年・体つき・髪・顔の目印の所は残します。
- 主な人物は3人まで en を全部書きます。4人目からと群衆は、外見の文を書かず、決め手の文で `a crowd of listeners`・`a few passers-by in the background` と書きます。

## 6. 場面の文の書き方

### 6.1 否定を書かない（言い換え）

Krea 2 Turbo（cfg 1.0）では、否定の文が効かず、否定した物がかえって出ます（[08 の 2-1](journeys/golden_triangle/album-photos/08_strategy_krea2.md#2-1-禁止の文が禁じたものを呼んでいるいちばん大きい)）。

| 書きたくなる文 | 代わりにする |
| --- | --- |
| `She is the only person in the frame.`・`each appearing only once` | 人数を肯定で数える（`Two figures …`）。ほかの人に触れない |
| `no black bag`・`only one cane` | その物に触れない。1度だけ書く |
| `not smiling`・`no smile` | 欲しい顔の形を書く（`lips pressed into a tight line`） |
| `faceless background figures` | `a few passers-by in the background`（顔に触れない） |
| `No text, no signs, no logos, no watermark` | 書かない。字の出やすい物を出さない（6.4） |
| `no close-up`・`no inset panels` | 画角を1つだけ肯定で書く（6.2） |
| `No people` | 人に触れない（人のいない絵は 5.1 の「顔の写る人がいない」の画風の文） |

### 6.2 人数と画角

| 人数 | 画角 | 書き方 |
| --- | --- | --- |
| 1人 | 全身か腰から上 | `seen from the waist up`・`full figure, head to toe` |
| 2人 | 全身か腰から上 | `Two figures from the waist up …`・`Two full figures …` |
| 3人以上 | 全身か膝から上 | `Three full figures, a medium-wide shot at eye level` |

- 重なり（同じ人が2人）の割合は、全身12%・腰から上26%・大写し4枚中3枚でした（05）。近い画角ほど、大写しの彼女がもう1人出ます。
- `close-up` の語は、否定でも使いません。顔に寄った絵が要るときは、全身か腰から上で作って、後で切り抜きます（約2/3を切り出して拡大。少しぼやける）。
- 位置は、人ごとに `On the left, …`・`In the center, …`・`On the right, …` で1度だけ書きます。
- 群衆や通行人は、`in the background`・`in the distance` と奥にいることを書きます（手前に大きくぼけた人が出た D-053・D-096）。

### 6.3 表情と動作

顔と体の形で書きます（感情の語だけにしない）。

| 表情・動作 | 書き方の例 |
| --- | --- |
| 驚く | `eyes wide open, eyebrows shot up, mouth open in a round O, leaning back` |
| 慌てて打ち消す | `both hands waving fast in front of her chest, eyes wide, mouth open mid-shout` |
| 心配する | `eyebrows drawn together and tilted up, lips parted, leaning toward him` |
| しょんぼり | `shoulders drooped, head hung, eyes cast down` |
| むくれる | `cheeks puffed out, lips pushed into a pout, eyebrows drawn together` |
| 大笑い | `bent forward laughing, eyes crinkled shut, mouth wide open, one hand on her stomach` |
| 気まずい | `lips pressed together, eyes glancing aside, a sweat drop on her temple, rubbing the back of her neck` |
| 眉を寄せて聞く | `knitted eyebrows, a troubled frown, lips pressed together` |

**出にくい表情**：赤面・照れ、くしゃみ、眠る、辛さで赤い顔、お腹を壊した顔、おびえ、苦笑い、ため息、片目を開ける、目を閉じてうなずく、は 05〜09 で4回まで直しても出ませんでした。同じ文を繰り返さず、**その気持ちが体の向きや手で分かる別の瞬間**に替えます（下は案。10章の試作3で1つ確かめる）。

| 出にくい表情 | 替える瞬間の例 |
| --- | --- |
| 照れ・赤面 | 顔をそむけて、両手で帽子のつばを引き下げる／手のひらで顔の下半分を隠す |
| 眠る | 帽子が目の上までずり落ち、頭が相手の肩に落ち、手が膝の上でだらりとする（目を見せない） |
| くしゃみ | 舞う赤い粉の中で、両手で鼻と口を覆い、体を前に折る |
| おびえ | 相手の背中に隠れて袖をつかみ、肩越しにのぞく |
| 辛さ | 水のコップを両手で持って一気にあおる／手で口をあおぐ |
| お腹を壊した | ベッドの端でお腹を両手で押さえ、前かがみになる／毛布にくるまる |
| 苦笑い・ため息 | 肩を落とし、片手を額に当てる |

- 表情が大事な絵は、種を4つ作ります。
- `smile` の語は、笑顔が決め手の絵のほかは使いません（立ち絵の穏やかな微笑みに戻りやすい）。

### 6.4 字を出さない

- 看板・貼り紙・名札・新聞・地図・封筒・本は、字のような線が出やすい物です。場面に要らなければ書きません。
- 要るときは、色・模様・形・たたみ方だけを書きます（`brown cardboard boxes`・`a folded newspaper`・`a red and yellow painted board`）。`plain`・`blank` は書きません（字の話題に触れることになる）。
- 携帯の画面は、写すなら `glowing screen` とだけ書きます。

### 6.5 そのほか

- 名所は、名前と、見て分かる形・色・材料を書きます（`the red sandstone Tomb of Mariam-uz-Zamani with its arched entrance`）。名前だけだと別の建物になりやすい（大日時計が黄色い円錐になった J-020）。
- 物の数が大事なときは、数を1度だけ書きます（`three brown cardboard boxes`）。
- 1枚を2つ以上のこまに分けたくなる場面（朝ごはんを並べる・見比べる）は、1つの画角の中に並べて書きます（`side by side on the table`）。

## 7. SNS の写真

SNS の写真は、出会った人が携帯で撮った日常の写真です。画風はアルバムと同じにします（5.1）。

- **写真の文**：画風の文のすぐ後に `Framed like a casual everyday snapshot.` を書きます。手で撮った傾きが要るときは `Framed like a casual everyday snapshot, tilted slightly to the right.`。`smartphone` の語は、携帯が写る絵だけに書きます（携帯そのものが描かれやすい）。
- **撮った人の目**：視点は、撮った人がどこにいて、どの高さかで書きます（`at a seated person's eye level`・`from about one metre away`）。手だけが写る絵は `First-person view, …`、または「画面の端から腕が入る」（`an arm reaches in from the bottom edge of the frame`）と書きます。
- **写さないもの**（依頼書の「写さないもの」の行）：文に書きません。顔を枠の外にしたいときは、写る所だけを書きます（`his arm and the chest of his grey shirt reach in from the top edge of the frame`）。撮った本人・ヒロイン・主人公は、項目に写ると書いてあるときだけ書きます。
- **写る人**：5.4 のとおり 00_characters.txt の en を使います。ふだん着・制服などは服の所だけ替えます。
- **画面で重なる所**：投稿の写真の左上に顔アイコン、右下に場所の名前が重なります。見どころは真ん中に置き、`in the center of the frame` と書きます。人物ページでは真ん中の約2/3が正方形に切り抜かれます。

## 8. 依頼ファイルの形

依頼ファイルは、アルバムは `authoring/journeys/<旅行編ID>/album-photos/<番号>_<名前>_krea2.txt`、SNS は `authoring/journeys/<旅行編ID>/art-requests/<日付>-sns-<名前>-krea2.txt` に置きます。頭に次の5行を書き、書き方の説明はこの手引きへのリンクにします（くり返さない）。

```text
<何の写真か>（<枚数>枚）の Krea 2 用プロンプト
作成: <日付> ／ <都市ごとの枚数>
書き方: authoring/KREA2_PHOTO_GUIDE.md（<日付>）のとおり。
生成の設定: 手引きの3章のとおり（1344×896、batch_size 2。★の項目は 4）。filename_prefix は各項目のファイル名。
送るもの: <良いほうだけ／全部>。zip は25MBくらいまで。
```

1項目の形：

```text
[<ID>] <題>
  ファイル名: <filename_prefix にする名前>
  場面: <日本語1〜2行。写真の見どころ>
  写る人: <人物（人物ID）と位置。左・中・右>
  服: <いつもの服／…>
  画角: <全身／膝から上／腰から上>
  直す所: <作り直しのときだけ。前の絵で直っていない所>
  前の絵: <作り直しのときだけ。今ゲームにある絵のファイル名>
  prompt: <英文1つ>
```

- 種を4つにする項目は、題の前に ★ を付けます。
- 届いた絵をゲームに入れる手順は、アルバムは [art-requests の README](journeys/golden_triangle/art-requests/README.md) の「アルバムの絵」、SNS は同じ README の SNS の節です（WebP 品質80にして、同じ名前で置く）。
- 届いたら、結果（直った・一部だけ直った・直っていない）を `album-photos/README.md` に書き足します。

## 9. 届いたら点検すること

見本の絵と並べて見ます。

- 見本の絵：立ち絵（5.2）と、`content/journeys/golden_triangle/public/assets/album/` の `gt_album_d054.webp`・`gt_album_j056.webp`（02。ヒロイン1人）、`gt_album_d123.webp`（05。2人）、`gt_album_a091.webp`（05。ヒロイン・クオッカ・ほかの人）。

**画風（全件）**

- [ ] 髪：まっすぐ寄りのボブで、毛先だけ軽くはねる（巻き毛でない）
- [ ] 服：立ち襟に小さなボタン3つ、肘までの袖。全身なら裾の下にグレーのプリーツ
- [ ] バッグ：胸の前に斜めに掛けた小さな黒いボディバッグ（腰の横の四角い肩掛けでない）
- [ ] 目：大きく、光が入る
- [ ] 線と塗り：細い線、明るい色（太い線・ざらついた質感・濃い茶色の影でない）
- [ ] クオッカ：丸い顔のぬいぐるみのような姿で、彼女の半分くらいの背
- [ ] ほかの人物：立ち絵と同じ髪・ひげ・服の色

**場面（全件）**

- [ ] 同じ人物が2人以上いない。こまに分かれていない
- [ ] 持ち物が別の人に移っていない（黒いバッグ・帽子・ワンピース）。物の数が合う
- [ ] 字・ロゴ・字のような線がない
- [ ] 決め手の表情・動作が出ている
- [ ] 名所が、その名所に見える

**SNS だけ**

- [ ] 左上と右下の角に見どころがない。真ん中の約2/3に見どころが入る
- [ ] 撮った本人・ヒロイン・主人公が、項目に書いたとき以外に写っていない

## 10. 画風の確かめ（試作3枚）

大きな依頼の前に、この手引きの書き方で画風が 02・05 に戻るかを確かめるための3件です。どれも、09 で画風が変わった絵、または直っていない絵の作り直しです。batch_size 2（計6枚）。ファイル名は `T1_J-063` のように試作番号と ID にします。

- 見るもの：試作1・2は、今の絵（09）と見本の絵（9章）を並べ、9章の「画風」の7つがそろっているか。試作3は、眠っているように見えるか（6.3 の替え方が効くか）。
- 良い絵は、そのまま今の絵と差し替えます。

### 試作1 J-063「いじわる！」（ヒロインとクオッカ。今の `gt_album_j063` は髪・襟が変わった絵）

```text
Detailed modern anime illustration with rich soft shading, fine detailed hair strands, sparkling eyes with bright highlights, warm sunlight, highly detailed background. Two full figures by a lake, head to toe at eye level. On the left, the quokka stands facing right with a teasing grin, holding a charred roasted corn cob behind his back at arm's length. On the right, the young woman pouts at him: cheeks puffed out, lips pushed into a pout, eyebrows drawn together, both hands held up stiffly at her chest with fingers spread, her palms and the backs of her hands covered in fresh dark-brown henna patterns. The quokka is a small anthropomorphic quokka traveler about half her height, with fluffy light tan-brown fur, a round chubby face, small rounded ears, big glossy dark-brown eyes, a small dark nose and a short thick tail, wearing a light grey hoodie, black trousers, white sneakers and a small white backpack. The young woman has shoulder-length brown bob hair with slightly wavy tips and warm amber-brown eyes, and wears a light grey baseball cap, a long white A-line dress reaching her ankles with a band collar and three small buttons at the chest, loose elbow-length sleeves, and a light grey pleated underskirt peeking out below the hem, a black crossbody body bag worn diagonally across her torso with the bag resting at her front hip, and black flat sandals. Behind them, the honey-colored Jal Mahal palace floats in the middle of Man Sagar Lake in Jaipur, with low hills beyond. Golden late-afternoon light glitters on the water.
```

### 試作2 A-082 ヴィムラー先生、ふたたび（3人。今の `gt_album_a082` はバッグ・髪が変わった絵）

```text
Detailed modern anime illustration with rich soft shading, fine detailed hair strands, sparkling eyes with bright highlights, warm sunlight, highly detailed background. Three full figures at an arched entrance, a medium-wide shot at eye level. On the left, the young woman has just spotted the teacher: frozen mid-step, eyes wide open, eyebrows shot up, mouth open in a round O, one hand pointing at her. In the center, the elderly teacher holds out a clipboard of signature sheets to the father with a brisk, determined look. On the right, the father hugs a round stainless steel lidded food container against his belly and leans back with a stiff, awkward grin. The young woman has shoulder-length brown bob hair with slightly wavy tips and warm amber-brown eyes, and wears a light grey baseball cap, a long white A-line dress reaching her ankles with a band collar and three small buttons at the chest, loose elbow-length sleeves, and a light grey pleated underskirt peeking out below the hem, a black crossbody body bag worn diagonally across her torso with the bag resting at her front hip, and black flat sandals. The elderly teacher is a thin elderly Indian woman around seventy with white hair in a low bun, thin wire-rimmed glasses, deep wrinkles, tiny gold stud earrings and a thin gold chain, wearing a dusty lavender-purple saree with a block-printed leaf pattern and border, a thin gold bangle on each wrist and black flip-flops. The father is a heavyset Indian man around fifty, with a round face, short thick black hair and a thick black moustache, wearing an untucked short-sleeved grey and white gingham check shirt with a chest pocket, grey trousers and brown leather sandals, a black wristwatch. Behind them, the red sandstone Tomb of Mariam-uz-Zamani in Agra, with a tall arched entrance and carved stone panels, on a sunny lawn. Warm afternoon light.
```

### 試作3 ★ A-062 帰りの車、こつんと落ちる頭（眠る。6.3 の替え方。batch_size 4）

```text
Detailed modern anime illustration with rich soft shading, fine detailed hair strands, sparkling eyes with bright highlights, highly detailed background. Two figures from the waist up on the back seat of a moving car, seen from the side at seat level. On the left, the young woman has dozed off: her head has dropped onto the quokka's shoulder, her cap has slid down over her eyes, her mouth hangs slightly open, and her hands lie limp in her lap as her whole body leans slack against him. On the right, the quokka sits bolt upright and frozen stiff, cheeks flushed pink, eyes round, holding his breath. The young woman has shoulder-length brown bob hair with slightly wavy tips and warm amber-brown eyes, and wears a light grey baseball cap, a long white A-line dress with a band collar, three small buttons at the chest and loose elbow-length sleeves, and a black crossbody body bag worn diagonally across her torso with the bag resting at her front hip. The quokka is a small anthropomorphic quokka traveler about half her height, with fluffy light tan-brown fur, a round chubby face, small rounded ears, big glossy dark-brown eyes, a small dark nose and a short thick tail, wearing a light grey hoodie, black trousers, white sneakers and a small white backpack. Through the car window, flat dusty North Indian fields and flat-roofed village houses slide past. Soft late-afternoon light.
```
