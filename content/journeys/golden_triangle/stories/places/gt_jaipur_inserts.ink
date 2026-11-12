INCLUDE modules.ink
-> DONE

// ジャイプールの差し込み（宿・フィナーレの前後）。どれも【4】の時点を使う。
// 土地の事実を言う場面は scenes/catalog.json に出典を書く（gt_jaipur_hotel_mehndi_night・gt_jaipur_hotel_mehndi_morning・gt_jaipur_finale_before_envelope・gt_jaipur_finale_after_envelope）。ほかは # sources: none。
// 服装は別の作業（ジャイプール用の衣装）で決まるので、服の色や種類は書かない。

// 【4】宿・眠る前：手のひらの模様の中を探す（「明日にする」は # later。夜だけ）
=== gt_jaipur_hotel_mehndi_night ===
# scene: talk
# at: hotel jaipur_hotel_hub
# priority: -1
# when: date gt_jaipur_date_jal_mahal
# when: time night
# background: gt_bg_jaipur_hotel_hub
{ cond("seen gt_jaipur_hotel_mehndi_night"):
    # speaker: narrator
    今夜も、彼女が手のひらを差し出してきた。模様は、前に見たときより、ずっと濃くなっている。
    # speaker: heroine
    # emotion: teasing
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
    はい。探して。ちゃんと、隠したものがあるんだから
}
{
- cond("flag gt_jaipur_mehndi_his_name"):
    # speaker: narrator
    花びらと蔓の間を、目でたどる。どこかに、自分の名前があるはずだった。
- cond("flag gt_jaipur_mehndi_her_secret"):
    { cond("seen gt_jaipur_hotel_mehndi_morning"):
        # speaker: narrator
        何が、どこに書いてあるかは、もう聞いてしまった。それでも、花びらと蔓の間を、自分の目でたどる。
    - else:
        # speaker: narrator
        何が隠されているのかも、分からない。花びらと蔓の間を、目でたどる。
    }
- else:
    # speaker: narrator
    名前は隠していない、はずだった。けれど、手のひらの真ん中の蔓だけ、妙に形がこみいっている。
}
* [指でたどりながら、根気よく探す # option: search_patiently]
    # rel: trust +1
    -> found
* [見つけたふりをする # option: pretend_found]
    # rel: trust -1
    { cond("flag gt_jaipur_mehndi_her_secret") and cond("seen gt_jaipur_hotel_mehndi_morning"):
        # speaker: heroine
        # reaction: heroine,teasing,question
        ほんと？　それ、フロントの人が見つけた所でしょ
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,question
        ほんと？　じゃあ、指でさして。そこ、ただの花びらだよ
    }
    # speaker: heroine
    見つけたふり、すぐばれるんだから。ちゃんと探して
    -> found
* [「色が濃くなる明日にする」 # option: tomorrow_then]
    # later
    # speaker: heroine
    # emotion: smile
    逃げたね。いいよ。明日の方が、濃くて見つけやすいかも
    -> END

= found
{
- cond("flag gt_jaipur_mehndi_his_name"):
    # speaker: narrator
    親指の付け根、蔓が三回巻いたところ。模様のふりをした文字が、小さく並んでいた。{player_name}。
    # speaker: heroine
    # reaction: heroine,shy_deep,blush
    ……見つけた、ね。自分の名前、人の手のひらで見るの、どんな気分？
    # speaker: heroine
    わたしは、ちょっと、くすぐったい。ずっと、持って歩いてたんだもん
- cond("flag gt_jaipur_mehndi_her_secret"):
    # speaker: narrator
    手のひらの真ん中、孔雀の羽の付け根に、小さな文字の列があった。上に一本、横線が引かれた文字。ヒンディー語だ。読めない。
    { cond("seen gt_jaipur_hotel_mehndi_morning"):
        # speaker: narrator
        けれど、何と書いてあるかは、もう知っている。
        # speaker: heroine
        # reaction: heroine,shy,blush
        見つけたね。もう、フロントの人に読まれちゃったけど。自分で見つけてくれたのは、うれしい
    - else:
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        見つけたけど、読めない。ふふ、セーフ。ファルハーナさん、ヒンディー語の文字で書いてくれたんだ
        # speaker: heroine
        何て書いてあるかは、教えない。読めなかったなら、読めないままで
    }
- else:
    # speaker: narrator
    こみいった蔓をほどくように見ていくと、模様のふりをした英語の文字が出てきた。FARHANA。その下に、小さな数字の列。
    # speaker: heroine
    # reaction: heroine,surprised_big,interrobang
    電話番号！？　隠したの、ファルハーナさん自身の宣伝だった！
    # speaker: heroine
    # reaction: heroine,teasing_big,music
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
# speaker: narrator
朝、宿の帳場。手のひらの模様は、一晩で、オレンジから赤茶色のほうへ、ぐっと濃くなっていた。フロントの女性が、それを見て声を上げた。
# speaker: gt_jaipur_hotel_front
まあ、濃い。いい色。……濃く染まるほど、愛されるって言うのよ。旦那さまに、ってね。お姑さんに、って言う人もいるけど
# speaker: heroine
# reaction: heroine,surprised_big,blush
だ、旦那さまはいないです！
{ cond("flag gt_jaipur_mehndi_her_secret"):
    -> secret_read
- else:
    # speaker: heroine
    # emotion: smile
    でも、きれいに出てよかった。結婚式の夜まで、ちゃんと残りそう
    -> END
}

= secret_read
# speaker: narrator
フロントの女性は、彼女の手のひらをのぞきこみ、孔雀の羽の付け根を指でさした。
# speaker: gt_jaipur_hotel_front
あら。ここ、名前が書いてある。ヒンディー語で。……『{player_name}』
# speaker: narrator
# photo: gt_album_j26 # photo_caption: 読み上げられた名前
中庭に、短い沈黙が落ちた。彼女は、ゆっくり手のひらを閉じた。
# speaker: heroine
# reaction: heroine,shy_deep,blush
教えないって、言ったのに。……もう。聞かなかったことに、してくれる？
* [「聞かなかった」 # option: didnt_hear]
    # rel: affection +1
    # speaker: heroine
    # emotion: smile
    うそつき。でも、ありがと
* [「聞いた」 # option: did_hear]
    # rel: spark +2
    # speaker: heroine
    # reaction: heroine,shy_deep,heart
    ……だよね。うん。隠したのは、わたしだから。わたしが選んだ名前だから
- -> END

// フィナーレの前：旅の最後の日の朝、祝儀袋を用意する（封筒は品物。フィナーレの後の差し込みで渡す）
// 本筋のフィナーレは「昼のうちに、行列の道を確かめておいた」から始まるので、その前の朝にする。
// 【4】
=== gt_jaipur_finale_before_envelope ===
# scene: talk
# at: finale jaipur
# priority: -1
# on_done: item gt_jaipur_wedding_envelope
# background: gt_bg_jaipur_hotel_hub
# speaker: narrator
今朝、宿の中庭のテーブルに、彼女が白い封筒を一枚置いた。着いた日に、フロントの女性に教わったとおり。お祝いは現金で、金額の最後に一ルピーを足す。
# speaker: heroine
割り切れない数は、縁起がいい。終わりにしないで、続いていく感じ、だったよね
# speaker: heroine
# emotion: worried
でも、いくら包めばいいんだろう。少なすぎても失礼だし、多すぎても気をつかわせちゃう
* [「気持ちが伝わるくらいにしよう」 # option: modest_gift]
    # money: -501
    # speaker: heroine
    # emotion: smile
    うん。気持ちが伝わるくらい。一ルピー玉、ちゃんと持ってる？
* [「旅の最後だから、思いきって奮発しよう」 # option: generous_gift]
    # money: -1101
    # speaker: heroine
    # reaction: heroine,surprised,sparkle
    奮発、だね。カムラさん、きっと中身を見て、ふんって言う。でも、うれしそうに言う
* [「お金は一ルピーだけ。あとは手紙を書こう」 # option: letter_gift]
    # set: gt_jaipur_envelope_letter
    # speaker: heroine
    # reaction: heroine,surprised,sparkle
    一ルピーと、手紙。それ、いいかも。割り切れない数の、いちばん小さいやつ
    # speaker: heroine
    # emotion: smile
    アマンさんに、毎日言葉にしてくださいって、書く。カムラさんの言葉の、受け売りだけど
-
# speaker: narrator
封筒の表に、彼女は二人の名前を並べて書いた。それから、今夜のための支度を一つずつ確かめていく。
{ cond("item gt_jaipur_lac_bangles held"):
    # speaker: heroine
    # emotion: smile
    腕輪は、出かける直前にはめる。ナスリーンさんに、割れやすいって言われたから。今夜、からんって鳴らすの
}
{ cond("date gt_jaipur_date_jal_mahal"):
    # speaker: heroine
    メヘンディも、まだちゃんと残ってる。色、いちばん濃いときに結婚式でよかった
}
{
- cond("item gt_delhi_rain_attar held"):
    # speaker: narrator
    彼女は鞄から小瓶を取り出し、栓を抜いて、手首にほんの一滴だけのせた。デリーの路地で買った、雨の匂い。
    # speaker: heroine
    デリーの雨を、少しだけ、ジャイプールの結婚式に持っていく。全部は使わない。日本の分も、残しておくの
- cond("flag gt_agra_rain_on_lawn"):
    # speaker: heroine
    # reaction: heroine,teasing,music
    # recall: gt_album_a39
    雨の匂いがあったら、一滴つけたかったな。アーグラの鹿の芝生に、全部降っちゃったけど
}
# speaker: heroine
# emotion: smile
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
# background: gt_bg_jaipur_hawa_mahal
# speaker: narrator
踊りの輪がひと息ついたころ、彼女は鞄から封筒を取り出して、カムラに差し出した。
# speaker: heroine
アマンさんに
# speaker: narrator
カムラは封筒を光にかざし、中の一ルピー玉を、指で確かめた。
{ cond("flag gt_jaipur_envelope_letter"):
    # speaker: enemy
    手紙も入ってるね。……毎日言葉にしなさい、か。わたしの言ったことじゃないか
    # speaker: enemy
    いいわ。アマンには、わたしが読み上げてやる。花嫁の前でね
- else:
    # speaker: enemy
    ……ふん。割り切れないね。よろしい
}
# speaker: heroine
アマンさんに、おめでとうございますって、伝えてください
# speaker: enemy
自分で言いなさい。花婿は、逃げやしないよ
# speaker: narrator
カムラは封筒をサリーの胸元にしまい、踊りの輪の方へ戻っていった。足どりが、デリーで見たときより、ずっと軽かった。
-> END

// 【4】フィナーレの後（+2）：花嫁のいとこに、デリーの動画がばれる
=== gt_jaipur_finale_after_reel ===
# scene: talk
# at: finale jaipur
# priority: +2
# when: date gt_delhi_date_agrasen_baoli
# sources: none
# background: gt_bg_jaipur_hawa_mahal
# speaker: narrator
踊りの輪がほどけたころ、花嫁のいとこのプージャーが、携帯を握りしめて走ってきた。画面と彼女の顔を、交互に見る。
# speaker: gt_pooja
やっぱり！　デリーの階段井戸の、『きゃー？』の人でしょ！　いとこ全員で見たの、あの動画！
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
こ、ここまで！？　ジャイプールにまで！
# speaker: gt_pooja
さっきの問題に答えた声で、分かった。質問みたいな声だったから。……ねえ、もう一回やって。『きゃー？』って
# speaker: heroine
# reaction: heroine,exasperated,sweat
や、やりません！　あれは、鳩がいないと出ないの
# speaker: narrator
プージャーはけらけら笑い、いとこたちを呼びに戻っていった。彼女は両手で顔を覆い、それから、指のすきまからこちらを見た。
# speaker: heroine
# emotion: smile
旅の最後の夜に、デリーの階段井戸が追いかけてくるなんて。でも、ちょっと、うれしいかも。全部、つながってる感じがして
-> END
