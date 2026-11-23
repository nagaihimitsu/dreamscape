INCLUDE modules.ink
-> DONE

// ジャイプールの差し込み（宿・フィナーレの前後）。どれも【4】の時点を使う。
// 土地の事実を言う場面は scenes/catalog.json に出典を書く（gt_jaipur_hotel_mehndi_night・gt_jaipur_hotel_mehndi_morning・gt_jaipur_hotel_radish_morning・gt_jaipur_finale_before_envelope・gt_jaipur_finale_after_envelope）。ほかは # sources: none。
// 服装は別の作業（ジャイプール用の衣装）で決まるので、服の色や種類は書かない。

// 【4】宿・眠る前：手のひらの模様の中を探す（「明日にする」は # later。夜だけ）
// 探すのはミニゲーム「手のひらの模様」（# minigame: mehndi_hidden_name）。灯りを動かし、模様にまぎれた文字を押す。
// 文字の場所と中身は、ジャル・マハルのフラグで分かれ道に書き分ける（主人公の名前はアルファベットで、飾り文字の書体で描き、
// 模様に日本語の文字は入れない：2026-11-16 のユーザー判断。ひらがな・カタカナの名前はそのままローマ字に、漢字の名前は
// 名前を入れたときの読みからローマ字にする。ローマ字にできない名前（読みの分からない漢字の名前など）とヒンディー語の文字の
// 所は、わざと読めない印にする：偽の文字は作らない）。
// 結果は found・wrong_spot（違う所も指してから見つけた。違う所や文字に似せた飾りを指すたびに彼女が答えて探すのが続き、
// 3つ目からは彼女がだいたいの場所を教える（点線の輪と「このへん、かな」。場所は見せない：見つけるのはいつも遊ぶ人。
// 2026-11-14）。その後で自分で見つける）・later（「明日にする」のボタン。時間の制限は無い（2026-11-13）。# later なので、
// また次の夜に出る）。場面の中のゲームなので、関係値の札は付けない。
=== gt_jaipur_hotel_mehndi_night ===
# scene: talk
# at: hotel jaipur_hotel_hub
# priority: -1
# when: date gt_jaipur_date_jal_mahal
# when: time night
# background: gt_bg_jaipur_hotel_courtyard_night
# tint: off
# bgm: feather_waltz
{ cond("seen gt_jaipur_hotel_mehndi_night"):
    # speaker: narrator
    今夜も、彼女が手のひらを差し出してきた。模様は、前に見たときより、ずっと濃くなっている。
    # speaker: heroine
    # emotion: teasing
    # voice: gt_jaipur_hotel_mehndi_night_001
    はい、続き。今夜こそ、見つけてね
- else:
    { cond("seen gt_jaipur_hotel_mehndi_morning"):
        # speaker: narrator
        夜、宿の中庭のランプの下。彼女は、赤茶色に濃く染まった手のひらを、こちらへ差し出した。
    - else:
        # speaker: narrator
        夜、宿の中庭のランプの下。乾いたペーストを指でこそげ落とすと、オレンジ色の模様が現れた。彼女は、その手のひらを、こちらへ差し出した。
    }
    # speaker: heroine
    # emotion: teasing
    # voice: gt_jaipur_hotel_mehndi_night_002
    はい。探して。ちゃんと、隠したものがあるんだから
}
{
- cond("flag gt_jaipur_mehndi_his_name"):
    # speaker: narrator
    # minigame: mehndi_hidden_name target thumb text player auto found
    花びらと蔓の間を、目でたどる。どこかに、自分の名前があるはずだった。
- cond("flag gt_jaipur_mehndi_her_secret"):
    { cond("seen gt_jaipur_hotel_mehndi_morning"):
        # speaker: narrator
        # minigame: mehndi_hidden_name target peacock text illegible auto found
        何が、どこに書いてあるかは、もう聞いてしまった。それでも、花びらと蔓の間を、自分の目でたどる。
    - else:
        # speaker: narrator
        # minigame: mehndi_hidden_name target peacock text illegible auto found
        何が隠されているのかも、分からない。花びらと蔓の間を、目でたどる。
    }
- else:
    # speaker: narrator
    # minigame: mehndi_hidden_name target vine text farhana auto found
    名前は隠していない、はずだった。けれど、手のひらの真ん中の蔓だけ、妙に形がこみいっている。
}
// 選択肢の代わりにミニゲーム。結果の ID の選択肢をゲームが選ぶ。
* [模様の中の文字を見つけた # option: found]
    -> found
// wrong_spot はゲームの中で違う所を指した後（そのたびに彼女が「そこは、ただの花びら」「それは字じゃなくて、飾り。似てるでしょ」などと答え、探すのは続く）。
// その後で自分で見つけたときも、3つ目からの彼女のヒント（だいたいの場所の輪。場所は見せない）の後で見つけたときも、この選択肢。だから台詞は、済んだことを振り返る形にする。
* [違う所も指してから、模様の中の文字を見つけた # option: wrong_spot]
    { cond("flag gt_jaipur_mehndi_her_secret") and cond("seen gt_jaipur_hotel_mehndi_morning"):
        # speaker: narrator
        今朝、フロントの女性が指さした所だったのに。最初に指したのは、まるで違う模様だった。
        # speaker: heroine
        # reaction: heroine,teasing,question
        # voice: gt_jaipur_hotel_mehndi_night_017
        今朝、教えてもらったばっかりなのに。……ふふ、忘れっぽいんだから
    - else:
        # speaker: narrator
        最初に指したのは、文字ではなく、ただの模様だった。くすっと笑われて、灯りで模様をたどり直した。
        # speaker: heroine
        # reaction: heroine,teasing,question
        # voice: gt_jaipur_hotel_mehndi_night_018
        さっき、自信満々に違う所を指してたでしょ。……ふふ、あの顔、見せてあげたかったな
    }
    -> found
* [「色が濃くなる明日にする」 # option: later]
    # later
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_hotel_mehndi_night_006
    逃げたね。いいよ。明日の方が、濃くて見つけやすいかも
    -> END

= found
{
- cond("flag gt_jaipur_mehndi_his_name"):
    // 模様に描いた名前と同じもの（ローマ字にできない名前は、ファルハーナさんがヒンディー語の文字で書いた）。
    { player_name_latin != "":
        # speaker: narrator
        親指の付け根、蔓が三回巻いたところ。模様のふりをした文字が、小さく並んでいた。アルファベットで、{player_name_latin}。
    - else:
        # speaker: narrator
        親指の付け根、蔓が三回巻いたところ。模様のふりをした文字が、小さく並んでいた。上に一本線の引かれた、ヒンディー語の文字。読めない。それでも、自分の名前だと分かった。
    }
    # speaker: heroine
    # reaction: heroine,shy_deep,blush
    # voice: gt_jaipur_hotel_mehndi_night_007
    ……見つけた、ね。自分の名前、人の手のひらで見るの、どんな気分？
    # speaker: heroine
    # voice: gt_jaipur_hotel_mehndi_night_008
    わたしは、ちょっと、くすぐったい。ずっと、持って歩いてたんだもん
- cond("flag gt_jaipur_mehndi_her_secret"):
    # speaker: narrator
    手のひらの真ん中、孔雀の羽の付け根に、小さな文字の列があった。上に一本、横線が引かれた文字。ヒンディー語だ。読めない。
    { cond("seen gt_jaipur_hotel_mehndi_morning"):
        # speaker: narrator
        けれど、何と書いてあるかは、もう知っている。
        # speaker: heroine
        # reaction: heroine,shy,blush
        # voice: gt_jaipur_hotel_mehndi_night_009
        見つけたね。もう、フロントの人に読まれちゃったけど。自分で見つけてくれたのは、うれしい
    - else:
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # voice: gt_jaipur_hotel_mehndi_night_010
        見つけたけど、読めない。ふふ、セーフ。ファルハーナさん、ヒンディー語の文字で書いてくれたんだ
        # speaker: heroine
        # voice: gt_jaipur_hotel_mehndi_night_011
        何て書いてあるかは、教えない。読めなかったなら、読めないままで
    }
- else:
    # speaker: narrator
    こみいった蔓をほどくように見ていくと、模様のふりをした英語の文字が出てきた。FARHANA。その下に、小さな数字の列。
    # speaker: heroine
    # reaction: heroine,surprised_big,interrobang
    # voice: gt_jaipur_hotel_mehndi_night_012
    電話番号！？　隠したの、ファルハーナさん自身の宣伝だった！
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    # voice: gt_jaipur_hotel_mehndi_night_013
    ふふっ、あはは！　すごい、本気だ。自分の店、絶対持てると思う、あの人
}
-> END

// 【4】宿・起きた後：色が濃くなる。フロントの女性が、隠した名前を読み上げてしまう
=== gt_jaipur_hotel_mehndi_morning ===
# scene: talk
# at: hotel jaipur_hotel_hub
# priority: +1
# when: date gt_jaipur_date_jal_mahal
# background: gt_bg_jaipur_hotel_hub
# bgm: morning
# speaker: narrator
朝、宿の帳場。手のひらの模様は、一晩で、オレンジから赤茶色のほうへ、ぐっと濃くなっていた。フロントの女性が、それを見て声を上げた。
# speaker: gt_jaipur_hotel_front
# voice: gt_jaipur_hotel_mehndi_morning_jaipur_hotel_front_001
まあ、濃い。いい色。……濃く染まるほど、愛されるって言うのよ。旦那さまに、ってね。お姑さんに、って言う人もいるけど
# speaker: heroine
# reaction: heroine,surprised_big,blush
# voice: gt_jaipur_hotel_mehndi_morning_001
だ、旦那さまはいないです！
{ cond("flag gt_jaipur_mehndi_her_secret"):
    -> secret_read
- else:
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_hotel_mehndi_morning_006
    でも、きれいに出てよかった。しばらく、ちゃんと残りそう
    -> END
}

= secret_read
# speaker: narrator
フロントの女性は、彼女の手のひらをのぞきこみ、孔雀の羽の付け根を指でさした。
# speaker: gt_jaipur_hotel_front
# voice: gt_jaipur_hotel_mehndi_morning_jaipur_hotel_front_002
あら。ここ、名前が書いてある。ヒンディー語で。……『{player_name}』
# speaker: narrator
# photo: gt_album_j26 # photo_caption: 読み上げられた名前
# pause: 900
帳場の前に、短い沈黙が落ちた。彼女は、ゆっくり手のひらを閉じた。
# speaker: heroine
# emotion: shy_deep
# voice: gt_jaipur_hotel_mehndi_morning_003
教えないって、言ったのに。……もう。聞かなかったことに、してくれる？
* [「聞かなかった」 # option: didnt_hear]
    # rel: affection +1
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_hotel_mehndi_morning_004
    うそつき。でも、ありがと
* [「聞いた」 # option: did_hear]
    # rel: spark +2
    # speaker: heroine
    # reaction: heroine,shy_deep,heart
    # voice: gt_jaipur_hotel_mehndi_morning_005
    ……だよね。うん。隠したのは、わたしだから。わたしが選んだ名前だから
- -> END

// 【4】宿・眠る前：ハワー・マハルでガウラにもらった大根を、宿の台所に預ける（大根を持っているときだけ。終えると持ち物から消える）
// ガウラの「宿の台所に渡しなさい。明日の朝、あんたの皿に戻ってくるから」を受ける。選択肢はなく、休めば自動で流れる。
// 昼に休んでも流れる（背景は時刻の色に任せる）。priority -2 なので、メヘンディの夜（-1）より先。
=== gt_jaipur_hotel_radish_night ===
# scene: talk
# at: hotel jaipur_hotel_hub
# priority: -2
# when: item gt_jaipur_gaura_radish held
# on_done: use gt_jaipur_gaura_radish
# sources: none
# background: gt_bg_jaipur_hotel_hub
# speaker: narrator
宿に戻ると、{heroine_name}は新聞紙の包みを抱えて、まっすぐ帳場へ向かった。
# speaker: narrator
# item_out: gt_jaipur_gaura_radish
包みの端から、大根の葉がはみ出している。ハワー・マハルの前で、ガウラにもらった一本だ。
# speaker: heroine
# voice: gt_jaipur_hotel_radish_night_001
あの、これ……台所に渡しなさいって、言われたんです。通りで野菜を売ってる、ガウラさんに
# speaker: gt_jaipur_hotel_front
あら、大根。……葉っぱが、まだぴんとしてる。朝いちばんの市場で仕入れた顔ね
# speaker: gt_jaipur_hotel_front
いいわ、料理人に渡しておく。明日の朝ね
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_jaipur_hotel_radish_night_002
本当に、お皿に戻ってくるんだ……。何になるんですか？
# speaker: gt_jaipur_hotel_front
それは、朝のお楽しみ
# speaker: narrator
# leave: gt_jaipur_hotel_front
フロントの女性は包みを抱え、帳場の奥の扉へ消えた。
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_jaipur_hotel_radish_night_003
ホテルで大根どうしよう、って思ってたのに。ガウラさん、全部分かってたんだね
-> END

// 【4】宿・起きた後：預けた大根が、朝食の大根のパラーターになって戻ってくる（眠る前に大根を預けたときだけ。一度きり）
// 土地の事実（大根はヒンディー語でムーリー、北インドでは大根をパラーターに詰める、ダヒーと漬物を添える）は scenes/catalog.json に出典。
// ライムの漬物（シティ・パレスの審判の報酬）を持っていれば、取り出して添える（品物は使わない）。priority +2 なので、メヘンディの朝（+1）の後。
=== gt_jaipur_hotel_radish_morning ===
# scene: talk
# at: hotel jaipur_hotel_hub
# priority: +2
# when: item gt_jaipur_gaura_radish used
# background: gt_bg_jaipur_hotel_courtyard
# bgm: morning
# speaker: narrator
# term: gt_term_paratha
朝、宿の中庭。テーブルに着くと、焼きたての平たいパンが運ばれてきた。こんがりした生地の合わせ目から、白い細切りがのぞいている。
# speaker: gt_jaipur_hotel_front
お待たせ。ゆうべの大根よ。刻んで、香辛料と混ぜて、小麦の生地に包んで焼いたの
# speaker: heroine
# reaction: heroine,surprised_big,sparkle
# voice: gt_jaipur_hotel_radish_morning_001
ほんとに戻ってきた……！　ガウラさんの大根が、パンになってる
# speaker: gt_jaipur_hotel_front
# local_word: gt_jaipur_word_mooli
大根は、こっちの言葉でムーリー。だから、ムーリー・パラーター。北インドじゃ、大根はよくパラーターに詰めるのよ
# speaker: gt_jaipur_hotel_front
# local_word: gt_jaipur_word_dahi
ダヒーと、漬物を添えて食べてね。ダヒーは、ヨーグルトのこと
# speaker: narrator
# leave: gt_jaipur_hotel_front
小さな器の白いダヒーを置いて、フロントの女性は帳場へ戻っていった。{heroine_name}はパラーターの端をちぎって、ダヒーにつけた。
# speaker: heroine
# reaction: heroine,happy,sparkle
# voice: gt_jaipur_hotel_radish_morning_002
……おいしい！　外はぱりっとしてて、中の大根が、ちょっと辛くて、ちょっと甘い
{ cond("item gt_jaipur_sushma_lime_pickle held"):
    # speaker: heroine
    # reaction: heroine,surprised,exclamation
    # voice: gt_jaipur_hotel_radish_morning_003
    あ、漬物！　漬物なら、持ってる
    # speaker: narrator
    # item_out: gt_jaipur_sushma_lime_pickle
    彼女は鞄から小瓶を取り出し、ふたを開けた。シティ・パレスで、スシュマに握らされたライムの漬物だ。酸っぱい匂いが、中庭に広がる。
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_jaipur_hotel_radish_morning_004
    ガウラさんの大根に、スシュマさんの漬物。この朝ごはん、ジャイプールでもらったものだけで出来てる
- else:
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_hotel_radish_morning_005
    ガウラさん、四十年、あの窓の下でこういう大根を売ってきたんだね。毎朝四時に、市場で選んで
}
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_hotel_radish_morning_006
今度ハワー・マハルの前を通ったら、ガウラさんに言わなきゃ。おいしかったです、って。……日傘の下で、ちゃんと
-> END

// フィナーレの前：旅の最後の日の朝、祝儀袋を用意する（封筒は品物。フィナーレの後の差し込みで渡す）
// 本筋のフィナーレは「昼のうちに、行列の道を確かめておいた」から始まるので、その前の朝にする。
// 【4】
=== gt_jaipur_finale_before_envelope ===
# scene: talk
# at: finale jaipur
# priority: -1
# on_done: item gt_jaipur_wedding_envelope
# background: gt_bg_jaipur_hotel_courtyard
# tint: off
# bgm: morning
# speaker: narrator
今朝、宿の中庭のテーブルに、彼女が白い封筒を一枚置いた。着いた日に、フロントの女性に教わったとおり。お祝いは現金で、金額の最後に一ルピーを足す。
# speaker: heroine
# voice: gt_jaipur_finale_before_envelope_001
割り切れない数は、縁起がいい。終わりにしないで、続いていく感じ、だったよね
# speaker: heroine
# emotion: worried
# voice: gt_jaipur_finale_before_envelope_002
でも、いくら包めばいいんだろう。少なすぎても失礼だし、多すぎても気をつかわせちゃう
* [「気持ちが伝わるくらいにしよう」 # option: modest_gift]
    # money: -501
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_finale_before_envelope_003
    うん。気持ちが伝わるくらい。一ルピー玉、ちゃんと持ってる？
* [「旅の最後だから、思いきって奮発しよう」 # option: generous_gift]
    # money: -1101
    # speaker: heroine
    # reaction: heroine,surprised,sparkle
    # voice: gt_jaipur_finale_before_envelope_004
    奮発、だね。カムラさん、きっと中身を見て、ふんって言う。でも、うれしそうに言う
* [「お金は一ルピーだけ。あとは手紙を書こう」 # option: letter_gift]
    # set: gt_jaipur_envelope_letter
    # speaker: heroine
    # reaction: heroine,surprised,sparkle
    # voice: gt_jaipur_finale_before_envelope_005
    一ルピーと、手紙。それ、いいかも。割り切れない数の、いちばん小さいやつ
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_finale_before_envelope_006
    アマンさんに、毎日言葉にしてくださいって、書く。カムラさんの言葉の、受け売りだけど
    # speaker: narrator
    デリーの最後の夜にアマンから聞いた、カムラの言いつけだ。
-
# speaker: narrator
# item_show: gt_jaipur_wedding_envelope
封筒の表に、彼女は自分とこちらの名前を並べて書いた。それから、今夜のための支度を一つずつ確かめていく。
{ cond("item gt_jaipur_lac_bangles held"):
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_finale_before_envelope_007
    腕輪は、出かける直前にはめる。ナスリーンさんに、割れやすいって言われたから。今夜、からんって鳴らすの
}
{ cond("date gt_jaipur_date_jal_mahal"):
    # speaker: heroine
    # voice: gt_jaipur_finale_before_envelope_008
    メヘンディも、まだちゃんと残ってる。色、いちばん濃いときに結婚式でよかった
}
{
- cond("item gt_delhi_rain_attar held"):
    # speaker: narrator
    # item_out: gt_delhi_rain_attar
    彼女は鞄から小瓶を取り出し、栓を抜いて、手首にほんの一滴だけのせた。デリーの路地で買った、雨の匂い。
    # speaker: heroine
    # item_out: gt_delhi_rain_attar
    # voice: gt_jaipur_finale_before_envelope_009
    デリーの雨を、少しだけ、ジャイプールの結婚式に持っていく。全部は使わない。日本の分も、残しておくの
- cond("flag gt_agra_rain_on_lawn"):
    # speaker: narrator
    デリーで買った雨の匂いの小瓶は、もう無い。アーグラの廟で猿に取られ、石の通路で割れてしまった。
    # speaker: heroine
    # reaction: heroine,teasing,music
    # recall: gt_album_a39
    # voice: gt_jaipur_finale_before_envelope_010
    雨の匂いがあったら、一滴つけたかったな。アーグラの鹿の芝生に、全部降っちゃったけど
}
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_finale_before_envelope_011
踊りは、要相談、だったよね。相談の余地、たぶん、ないけど
-> END

// 【4】フィナーレの後（+1）：踊りの輪がひと息ついたころ、カムラに祝儀袋を渡す
=== gt_jaipur_finale_after_envelope ===
# scene: talk
# person: gt_kamla
# at: finale jaipur
# priority: +1
# when: item gt_jaipur_wedding_envelope held
# on_done: use gt_jaipur_wedding_envelope
# background: gt_bg_jaipur_hawa_mahal_night
# tint: off
# bgm: gt_naraina
# speaker: narrator
# item_out: gt_jaipur_wedding_envelope
踊りの輪がひと息ついたころ、彼女は鞄から封筒を取り出して、花婿の祖母のカムラに差し出した。
# speaker: heroine
# voice: gt_jaipur_finale_after_envelope_001
アマンさんに
# speaker: narrator
カムラは封筒を光にかざし、中の一ルピー玉を、指で確かめた。
{ cond("flag gt_jaipur_envelope_letter"):
    # speaker: enemy
    # voice: gt_jaipur_finale_after_envelope_kamla_001
    手紙も入ってるね。……毎日言葉にしなさい、か。わたしの言ったことじゃないか
    # speaker: enemy
    # voice: gt_jaipur_finale_after_envelope_kamla_002
    いいわ。アマンには、わたしが読み上げてやる。花嫁の前でね
- else:
    # speaker: enemy
    # voice: gt_jaipur_finale_after_envelope_kamla_003
    ……ふん。割り切れないね。よろしい
}
# speaker: heroine
# voice: gt_jaipur_finale_after_envelope_002
アマンさんに、おめでとうございますって、伝えてください
# speaker: enemy
# voice: gt_jaipur_finale_after_envelope_kamla_004
自分で言いなさい。花婿は、逃げやしないよ
# speaker: narrator
# leave: enemy
カムラは封筒をサリーの胸元にしまい、踊りの輪の方へ戻っていった。足どりが、デリーで見たときより、ずっと軽かった。
-> END

// 【4】フィナーレの後（+2）：花嫁のいとこに、デリーの動画がばれる
=== gt_jaipur_finale_after_reel ===
# scene: talk
# at: finale jaipur
# priority: +2
# when: date gt_delhi_date_agrasen_baoli
# sources: none
# background: gt_bg_jaipur_hawa_mahal_night
# tint: off
# bgm: gt_naraina
# speaker: narrator
踊りの輪がほどけたころ、花嫁のいとこのプージャーが、携帯を握りしめて走ってきた。画面と彼女の顔を、交互に見る。
# speaker: gt_pooja
# voice: gt_jaipur_finale_after_reel_pooja_001
やっぱり！　デリーの階段井戸の、『きゃー？』の人でしょ！　いとこ全員で見たの、あの動画！
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_jaipur_finale_after_reel_001
こ、ここまで！？　ジャイプールにまで！
# speaker: narrator
デリーの階段井戸で、頼まれて出た怖い動画だ。その最後に、彼女の「きゃー？」が、おまけで入っている。
# speaker: gt_pooja
# voice: gt_jaipur_finale_after_reel_pooja_002
さっきの問題に答えた声で、分かった。質問みたいな声だったから。……ねえ、もう一回やって。『きゃー？』って
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_jaipur_finale_after_reel_002
や、やりません！　あれは、鳩がいないと出ないの
# speaker: narrator
# leave: gt_pooja
# emotion: shy
プージャーはけらけら笑い、いとこたちを呼びに戻っていった。彼女は両手で顔を覆い、それから、指のすきまからこちらを見た。
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_finale_after_reel_003
旅の最後の夜に、デリーの階段井戸が追いかけてくるなんて。でも、ちょっと、うれしいかも。全部、つながってる感じがして
-> END
