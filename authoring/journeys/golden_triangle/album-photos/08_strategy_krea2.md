# 直らない絵の原因と作戦（Krea 2）

作成: 2026-11-26。05 の結果で直っていない65枚（[README](README.md) の「05 の結果」）を見て、原因を調べ、直し方を決めるための記録。最後に、作戦を確かめる試作のプロンプト9件（＋くしゃみの言い方の比べ1件）を置いた。

> 2026-11-27：作戦1のうち「外見文を短くする」「画風の文から `sparkling eyes` を外す」は、09 で画風が変わる原因になったのでやめた（髪が巻き毛に、襟が丸首に、バッグが肩掛けに変わった）。今の書き方は [Krea 2 で写真を作るやり方](../../../KREA2_PHOTO_GUIDE.md) にまとめた。

## 1. 生成のしかた（届いた PNG に残っていた設定）

05 の137枚の PNG には ComfyUI のワークフローが埋め込まれていて、全部同じ組み立てだった。

| 項目 | 値 |
| --- | --- |
| モデル | `krea2_turbo_bf16-Q5_1.gguf`（Krea 2 Turbo を GGUF Q5_1 に量子化） |
| 文の読み取り | `qwen3vl_4b_fp8_scaled`（Qwen3-VL 4B） |
| 手順 | 8ステップ、cfg 1.0、`er_sde` ＋ `simple`、1344×896、1枚ずつ（種は毎回違う） |
| 負のプロンプト | `ConditioningZeroOut`（空） |
| 参照画像 | **使っていない**（文だけで生成） |

これまでの記録（06・07）の「参照画像（立ち絵の微笑み）に引っぱられて表情が戻る」という見立ては、少なくとも 05 の絵には当てはまらない。参照画像はつないでいなかった。

## 2. 直らない原因

### 2-1. 禁止の文が、禁じたものを呼んでいる（いちばん大きい）
cfg 1.0 の Turbo では負のプロンプトが計算から消える。文の中の「no ～」「not ～」も効かない。有志の手引き（[rakshazi/krea2-prompting](https://github.com/rakshazi/krea2-prompting)）は「否定は cfg 1.0 ではほぼ効かない。否定した名詞は、かえって強まることがある」と書いている。[有志の手引き（gist）](https://gist.github.com/cicalooo/6d26f1d4d54f6d05e87e6fde94b703b7)も「文で否定しない」としている。

届いた絵でも、そのとおりになった。

| プロンプトに書いた文 | 届いた絵 |
| --- | --- |
| He carries only the white backpack, **no black bag**.（J-041・D-083） | クオッカに黒い斜めがけのバッグ |
| He has **only one cane**.（A-131） | 杖が2本 |
| He has **only one camera**.（A-098） | カメラが2台 |
| She is **not smiling calmly**.（J-059 ほか） | 穏やかな微笑み |
| Any other people are small, distant, **faceless** background figures. | 後ろの人がのっぺらぼう（D-009・D-083・A-031・A-131・J-127）。これは否定ではなく、「顔なし」をそのまま頼んでいた |
| not split into panels, **no triptych, no side-by-side views**（J-089） | 3つのこまに分かれた |

数でも出ている（05 の137枚。「重なり」は同じ人物が2人以上描かれた絵）。

| プロンプトの特徴 | 重なりの割合 |
| --- | --- |
| `close-up` の語がある（「no close-up」など否定でも） | 10/21（48%） |
| `close-up` の語がない | 19/116（16%） |
| `second copy` の禁止文がある | 15/32（47%） |
| `second copy` の禁止文がない | 14/105（13%） |

### 2-2. プロンプトが長く、決め手の文が埋もれる
- 05 のプロンプトは平均約330語（最大約410語）。公式の見本は30〜150語くらい。
- 彼女の外見文だけで約100語あり、人物ごとに長い外見文が続く。読み取りは先に書いたものを主役として扱う（rakshazi：「順番が重み。先に来たものが主役」）。表情・動作の文は、画風・人数・禁止文・配置の後の真ん中にある。
- rakshazi は「持ち物の一覧が長いと、『画面にいるのは彼女だけ』と書いても彼女が分身した。一覧を短くして、種を変える」とも書いている。頭から足もとまで（帽子・ボタン3つ・袖・プリーツ・サンダル）細かく書くと、立ち絵の設定画のように、全身と大写しを並べた絵になりやすい（07 で「腰から上なら足もとの語を外すと1人になった」のと同じ流れ）。

### 2-3. 同じ人・物を2回書くと、2つ出る
rakshazi：「位置を2回書いた人物は、2人として戻ってくる」。05 のプロンプトは、配置の文（「彼女は左」）と決め手の文（「彼女が～する」）の両方で位置や持ち物に触れている。A-131 は杖を「高く掲げる杖」と外見文の「ついている杖」で2回書き、2本になった。

### 2-4. 画風の文と、目を閉じる表情がぶつかる
全件の冒頭の画風の文に `sparkling eyes with bright highlights`（きらきらの目）がある。眠る・くしゃみ・ぎゅっと目をつぶる絵では、目を開けて光らせる指示と食い違う。公式の見本のアニメ調も、表情は「片目を細める」「唇をすぼめる」のような体の形で書いていて、感情の語だけでは書いていない。

### 2-5. 画角
重なりは、全身 7/57（12%）・腰から上 13/50（26%）・大写し 3/4。近い画角ほど、大写しの彼女がもう1人出る。

### 2-6. 種が1つだけ
1つの文につき1枚しか作っていない。rakshazi は「直す前に種を4つ試す。3〜4枚に出る欠点は文のせい、1〜2枚なら種のせい」と書いている。いまは、文のせいか種のせいか区別できていない。

### 2-7. 分かっていないこと
- GGUF Q5_1 の量子化が、文に従う力をどれだけ落とすか（資料がない）。
- `er_sde` ＋ `simple` が絵に向くか。rakshazi は絵（イラスト）なら `euler` ＋ `beta`、shift 4.0（なめらか）を勧めている。公式は shift 1.15。

## 3. 作戦（安い順）

### 作戦1：書き方を変える（費用なし。全部の作り直しに使う）
1. **否定の文をすべて消す**。`no ～`・`not ～`・`only one ～`・`each appearing only once (no duplicates …)`・`No second copy`・`no close-up`・`no inset panels`・`No text, no signs …`・`faceless` を書かない。欲しいものだけを書く。
   - 字を出したくない物は「plain」「blank」と言い換えず、話題に出さないか、模様・色だけを書く（例：段ボールは「brown cardboard boxes」だけ）。
   - クオッカの持ち物は「a small white backpack」だけを書き、黒いバッグに触れない。
   - 後ろの人は「a few passers-by in the distance」「a crowd of listeners」と書く（顔のことは書かない）。
2. **短くする**（目安 120〜180語）。外見文を短くした版を使う（下の「短い外見文」）。足もとの語は全身の絵だけに残す。
3. **順番**：画風（短く）→ 決め手（誰が・どこで・どんな顔と体で）→ 外見（短く）→ 場所 → 光。人物の位置と持ち物は1度だけ書く。
4. **表情は体の形で書く**。感情の語（surprised・flustered）だけにしない（下の「表情の言い方」）。
5. **画風の文から `sparkling eyes with bright highlights` を外す**。少なくとも、目を閉じる・目を見開く絵では外す。
6. 人数は「three figures:」のように肯定で数える。「exactly … only once」の言い方はやめる。

### 作戦2：1つの文で種を4つ作って選ぶ
ComfyUI の `EmptySD3LatentImage` の `batch_size` を4にする。4枚とも同じ欠点なら文を直し、1〜2枚だけなら良い種を選ぶ。ファイル名は今と同じ ID にして、選んだ1枚だけ送ればよい。

### 作戦3：設定を試す（試作で比べる）
- `euler` ＋ `beta`、shift（`ModelSamplingAuraFlow`）4.0 と 1.15。
- VRAM に余裕があれば、Q5_1 の代わりに fp8（公式の `krea2_turbo` fp8 か int8）。
- 公式ワークフローの Prompt Enhance（LLM が文を書き直す）は使わない。いまの組み立ても使っていないので、そのままでよい。

### 作戦4：それでも直らない絵は、後から直す
- **重なり（大写しがもう1人）**：大写しを切り落とせば成り立つ絵がある。1344×896 の約2/3（約896×597）を切り出して拡大するので、少しぼやける。候補：A-012・J-011・J-038・J-051・J-097（ほかも見て決める）。切り抜きはこちら（AI）でもできる。
- **表情だけ違う**：顔のまわりだけを描き直す。
  - Krea 2 用の部分描き直し（有志の inpaint 用 LoRA ＋ Ostris の edit ノード）。顔に黒を塗った絵と、出来上がり全体を書いた文で描き直す。
  - 指示で直す編集モデル（Qwen-Image-Edit-2511 ＋ 4ステップの Lightning LoRA）。「make her sneeze, eyes squeezed shut, hand over her mouth」のように指示する。モデルが大きい（約20B）ので、VRAM と GGUF 版を確かめてから。アニメ絵での表情の編集は、資料では確かめられなかった。
- **負の重み**（KJNodes の `Krea2PromptWeight`。例 `(smiling:-2)`）は公式の機能ではなく、効き方が読みにくいので最後の手段にする。

### 進め方
（2026-11-26：生成の待ち時間が長いので、ユーザー判断で試作は飛ばし、91枚全部を書き方2通りで作る `09_fix_ab_krea2.txt` にした。下の試作のプロンプトは使わない。）
1. 下の試作9件（＋くしゃみの比べ1件）を、種4つずつで作る（作戦1＋2）。余裕があれば作戦3の設定でも同じ種で作る。
2. 届いた絵で、どの作戦が効いたかを確かめる（直った数を数える）。
3. 効いた書き方で、残りの56枚の文を書き直す（09 として作る）。表情が4回以上戻った絵（D-068・D-077・A-063 など）は、作戦4に回す。

## 4. 短い外見文と、表情の言い方

### 短い外見文（試作で使う）
- 彼女（いつもの服）：`a young woman with a shoulder-length wavy brown bob and amber-brown eyes, wearing a light grey baseball cap, a long white dress and a black crossbody bag`
- 全身の絵だけ足す：`and black sandals`
- クオッカ：`a small anthropomorphic quokka, about half her height, with fluffy tan-brown fur, a round face and small round ears, wearing a light grey hoodie, black trousers, white sneakers and a small white backpack`
- ほかの人物：00_characters.txt の en から、髪・顔の目印・服の色を15〜25語だけ取る。

### 表情の言い方（試作で確かめる案）
| 表情・動作 | 書き方 |
| --- | --- |
| くしゃみ | `mid-sneeze: eyes squeezed tightly shut, nose scrunched, the tip of her nose flushed pink, one hand clapped over her own mouth, head jerked forward`（ユーザー案：sneezing ＋ hand over own mouth ＋ nose blush） |
| 驚いて固まる | `frozen mid-step, eyes wide open with small pupils, mouth dropped open, eyebrows shot up, hands stopped in the air` |
| 真っ赤で慌てて打ち消す | `blushing bright red up to her ears, eyes wide, mouth open mid-shout, both hands waving fast in front of her chest` |
| 照れて目をそらす | `face turned sharply away, cheeks and ears bright red, eyes squeezed half shut, lips pressed into a wobbly line` |
| 眠る | `fast asleep, eyes closed in two soft curved lines, mouth slightly open, head tipped sideways, body slack` |
| 大笑い | `bent forward laughing, eyes crinkled shut, mouth wide open, one hand on her stomach` |
| 気まずい | `smile gone, lips pressed together, eyes glancing aside, a sweat drop on her temple` |
| 悔しい | `cheeks puffed out, lips pushed into a pout, eyebrows drawn together` |
| 眉を寄せて聞く | `knitted eyebrows, a troubled frown, lips pressed together` |

## 5. 試作のプロンプト

どれも、1件につき種を4つ（`batch_size` 4）で作る。ファイル名は `P1_D-111` のように試作番号と ID にする。画風の文は全件同じ短い文にした（`sparkling eyes` を外した）。

### P1 D-111 香辛料の市場で、三人そろってくしゃみ（くしゃみ・3人）
```
Modern anime illustration with soft shading and a detailed background. A comic moment in a spice lane at night: three travellers sneeze at the same instant. On the left, a young woman mid-sneeze: eyes squeezed tightly shut, nose scrunched, the tip of her nose flushed pink, one hand clapped over her own mouth, head jerked forward. In the middle, a small quokka sneezes with his eyes shut tight and his ears flung back. On the right, a slim young Indian man with tousled black hair and a creased white shirt bends forward, sneezing into his elbow. Behind the sacks, a thin old spice trader with a bushy white moustache watches them with narrowed, amused eyes. The young woman has a shoulder-length wavy brown bob and wears a light grey baseball cap, a long white dress and a black crossbody bag. The quokka has fluffy tan-brown fur and wears a light grey hoodie and a small white backpack. A fine haze of red chilli dust hangs over mountains of dried red chillies and turmeric in burlap sacks under bare bulbs in Khari Baoli, Old Delhi.
```

### P1b D-111 くしゃみの言い方の比べ（タグ風）
P1 の「On the left, … head jerked forward.」の1文だけを次に替える。ほかは P1 と同じ。
```
On the left, a young woman sneezing, hand over own mouth, eyes closed tight, nose blush.
```

### P2 A-070 くしゃみをする猿（くしゃみ・動物）
```
Modern anime illustration with soft shading and a detailed background. On top of a red sandstone gateway, a rhesus monkey in the middle of a huge sneeze: eyes squeezed shut, mouth wide open, head snapped forward, a little spray in the air. The small glass vial it was sniffing flies out of its paw and tumbles through the air. Below on the left, a young woman seen from the waist up looks up with a gasp: mouth open in a round O, eyebrows raised high, both hands reaching up toward the falling vial. She has a shoulder-length wavy brown bob and amber-brown eyes and wears a light grey baseball cap, a white dress and a black crossbody bag. The gateway of Akbar's Tomb at Sikandra, red sandstone with bold white marble inlay. Hot afternoon sun.
```

### P3 A-062 帰りの車、こつんと落ちる頭（眠る）
```
Modern anime illustration with soft shading. The back seat of a car, seen from the side. A young woman is fast asleep: eyes closed in two soft curved lines, mouth slightly open, her head tipped sideways and resting on the shoulder of a small quokka sitting on the right. Her cap has slid askew and her body is slack. The quokka sits stiff and still, eyes round, cheeks flushed, holding his breath. The young woman has a shoulder-length wavy brown bob and wears a light grey baseball cap, a long white dress and a black crossbody bag. The quokka has fluffy tan-brown fur and wears a light grey hoodie and a small white backpack. Through the window, flat dusty North Indian fields and flat-roofed concrete village houses slide past. Soft late-afternoon light.
```

### P4 J-059 耳まで赤くして、手を差し出す（照れて目をそらす）
```
Modern anime illustration with soft shading and a detailed background. By a lake, a young woman sits on a low stool on the left. Her face is turned sharply away to the side, cheeks and ears bright red, eyes squeezed half shut, lips pressed into a wobbly line, yet her right arm is stretched straight out, open palm offered to the henna artist. On the right, a slim young Indian henna artist with a long black braid, in a dark green embroidered kurta and a pale pink dupatta, laughs with a henna cone raised. The young woman has a shoulder-length wavy brown bob and wears a light grey baseball cap, a white dress and a black crossbody bag. Behind them, the Jal Mahal palace floats on Man Sagar Lake in Jaipur. Golden late-afternoon light.
```

### P5 A-001 薔薇の花びらの道（驚いて固まる）
```
Modern anime illustration with soft shading and a detailed background. A hotel room doorway, full figures at eye level. On the left, a young woman frozen mid-step in the doorway: eyes wide open with small pupils, mouth dropped open, eyebrows shot up, both hands stopped in the air, staring down at the floor. On the right, a tall young Indian hotel manager with slicked-back black hair, in a maroon embroidered Nehru vest over a white shirt, holds the door open and beams proudly like a showman. A trail of red rose petals runs across the floor to a white bed where two towels folded into swans form a heart. The young woman has a shoulder-length wavy brown bob and wears a light grey baseball cap, a long white dress, a black crossbody bag and black sandals. Warm window light.
```

### P6 D-004 「た、旅の連れです！」（真っ赤で打ち消す・重なり）
```
Modern anime illustration with soft shading and a detailed background. A narrow Delhi residential lane, three figures in a medium-wide shot. On the left, a small stooped Indian grandmother in a sage-green saree and a maroon shawl sits on a chair and jerks her chin toward the quokka with a deadpan, knowing look. In the center, a young woman blushes bright red up to her ears: eyes wide, mouth open mid-shout, both hands waving fast in front of her chest in a panicked denial. On the right, a small quokka stands quietly and blinks, unsure where to look. The young woman has a shoulder-length wavy brown bob and wears a light grey baseball cap, a long white dress and a black crossbody bag. The quokka has fluffy tan-brown fur and wears a light grey hoodie and a small white backpack. Brown cardboard boxes are stacked by old plastered houses, and peanut shells lie on the ground. Bright late-morning light.
```

### P7 J-089 ジャイプールでもらったものだけの朝ごはん（3こまに分かれる）
```
Modern anime illustration with soft shading and a detailed background. A young woman sits alone at a small breakfast table in a pink-walled haveli courtyard, seen from the waist up. She lifts the lid off a small glass jar of oily yellow-green lime pickle and grins at it with delight. On her plate are a golden stuffed flatbread with shredded white radish peeking out and a small bowl of yogurt. She has a shoulder-length wavy brown bob and amber-brown eyes and wears a light grey baseball cap, a white dress and a black crossbody bag. Arches and potted plants stand behind her in Jaipur. Fresh morning sunlight.
```

### P8 J-041 鳩の王さま（持ち物が移る）
```
Modern anime illustration with soft shading and a detailed background. The plaza of the Albert Hall Museum in Jaipur, full figures. In the center, a small quokka holds out a palmful of grain while one pigeon perches on his head and another on his shoulder. On the left, a young woman bends forward laughing, eyes crinkled, pointing at him. The quokka has fluffy tan-brown fur, a round face and small round ears and wears a light grey hoodie, black trousers, white sneakers and a small white backpack. The young woman has a shoulder-length wavy brown bob and wears a light grey baseball cap, a long white dress, a black crossbody bag and black sandals. Behind them, the white and buff sandstone museum with small domes and arched galleries; hundreds of grey pigeons cover the ground. Bright morning sun and drifting feathers.
```

### P9 A-131 一番泣かせるガイドの人だかり（物が2つになる・顔のない群衆）
```
Modern anime illustration with soft shading and a detailed background. Near the great red sandstone gate of the Taj Mahal, a crowd of about twenty tourists gathers around an elderly Indian guide. The guide, with swept-back white hair and a trimmed white beard, in a long white kurta, raises a wooden cane with a silver knob high over his head as he tells a tragic tale. The listeners sigh, and some dab their eyes with handkerchiefs. At the left edge of the crowd, a young woman listens with knitted eyebrows and a troubled frown, beside a small quokka. She has a shoulder-length wavy brown bob and wears a light grey baseball cap, a long white dress and a black crossbody bag. The quokka has fluffy tan-brown fur and wears a light grey hoodie and a small white backpack. Bright midday light.
```

## 6. 調べた資料
- [Krea 2 公式（krea-ai/krea-2）](https://github.com/krea-ai/krea-2)：見本のプロンプト、Turbo は8ステップ・shift 1.15。
- [rakshazi/krea2-prompting](https://github.com/rakshazi/krea2-prompting)：否定・順番・分身・種4つ・参照画像・部分描き直し。
- [有志の手引き（gist）](https://gist.github.com/cicalooo/6d26f1d4d54f6d05e87e6fde94b703b7)：否定しない、負の重み（KJNodes）。
- [ComfyUI の Krea 2 の説明](https://docs.comfy.org/tutorials/image/krea/krea-2)：公式ワークフロー、画風の参照、Prompt Enhance。
- [Qwen-Image-Edit-2511（ComfyUI の説明）](https://docs.comfy.org/tutorials/image/qwen/qwen-image-edit-2511)：指示で直す編集モデル。
- 表情・くしゃみ・眠りの書き方を試した資料は見つからなかった。表の書き方は、公式の見本が体の形で表情を書いていることにならった案で、試作で確かめる。
