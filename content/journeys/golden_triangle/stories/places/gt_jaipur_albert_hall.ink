INCLUDE modules.ink
-> DONE

// アルバート・ホールのデート（噛み合いの選択は2回）。
// 遠足の子は、階段の下で先生とクラスが待っている所まで付き添うだけにする（知らない子を連れ回さない）。

// 【3】
=== gt_jaipur_date_albert_hall ===
# scene: date
# title: ミイラより鳩
# when: episodes jaipur >= 1
# background: gt_bg_jaipur_albert_hall
# speaker: narrator
アルバート・ホールは、白と薄茶の石でできた、ドームと塔だらけの博物館だった。その正面の広場が、灰色に揺れている。鳩だ。何百羽もの鳩が、地面を埋めつくしていた。
# se: pigeons_takeoff
広場の端で、男が小さな袋に入った穀物を売っている。買った人が撒くたびに、灰色の波が、ざあっと音を立てて動く。
{ cond("date gt_delhi_date_agrasen_baoli"):
    # speaker: heroine
    # reaction: heroine,exasperated,sweat
    # recall: gt_album_d55
    鳩……。デリーの階段井戸以来、鳩には、ちょっと思うところがあるんだけど
- else:
    # speaker: heroine
    # reaction: heroine,surprised_big,sweat
    鳩！　こんなに、いっぺんに。地面が動いてるみたい
}
* [穀物を一袋買って、撒いてみる # option: feed_pigeons]
    # profile: playful
    # memory: gt_jaipur_date_albert_hall_memory
    # money: -20
    { romance_result == "negative":
        # speaker: narrator
        一握り撒いた瞬間、灰色の波が、こちらではなく彼女の足もとに押し寄せた。
        # speaker: heroine
        # reaction: heroine,surprised_big,sweat
        やだ、肩に！　は、早く払って！
    - else:
        # speaker: narrator
        一握り撒いた瞬間、灰色の波が足もとに押し寄せた。肩に一羽、頭に一羽。彼女は、悲鳴の手前で笑い出した。
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # photo: gt_album_j31 # photo_caption: 鳩の王さま
        頭！　頭に乗ってる！　ふふっ、すごく似合ってるよ、鳩の王さま
    }
* [鳩の群れを、大回りでよける # option: avoid_pigeons]
    # profile: honest
    # memory: gt_jaipur_date_albert_hall_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        ……ちょっとだけ、鳩とも遊びたかったかも。ううん、いいの。行こう
    - else:
        # speaker: heroine
        # emotion: smile
        賢い。わたしも、そっちに一票。鳩は、遠くから見るのがいちばん
    }
* [彼女の前に立って、鳩よけになる # option: shield_her]
    # profile: bold
    # memory: gt_jaipur_date_albert_hall_memory
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy,sweat
        鳩から守られるの、ちょっと恥ずかしい……。みんな、普通に歩いてるよ
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        守ってくれてる？　鳩から？　……ふふ、ありがと。でも、背中に一羽、乗ってるよ
    }
-
# speaker: narrator
博物館の中は、ひんやりしていた。細密画、陶器、絨毯、鎧。ひときわ賑やかなのは、制服の子どもたちの遠足の一団だった。先生に連れられて、地下の展示室への階段を、列になって下りていく。
階段の手前の柱の陰に、一人だけ、取り残された女の子がいた。八歳くらい。三つ編みの先を、ぎゅっと握っている。
# speaker: heroine
# emotion: worried
……あの子、下りられないみたい
# speaker: narrator
彼女は女の子の前にしゃがんで、目の高さを合わせた。女の子は地下を指さして、小さな声で言った。
# speaker: gt_kavya
# cutin: name
……わたし、カヴィヤ。下に、ミイラがいるの。エジプトの、本物の。……みんな、平気だって。でも、わたし、怖い
# speaker: heroine
そっか。……実はね、わたしも、ちょっと怖い。ミイラって、本物を見たことないから
# speaker: narrator
階段の下で、先生が手を振っていた。ほかの子たちは、もう展示室の前に集まっている。
# speaker: heroine
先生、あそこで待ってるね。下まで、一緒に行こうか。わたしも怖いから、手、つないでくれる？
# speaker: narrator
カヴィヤは、少し考えてから、彼女の手を握った。
* [先に一段下りて、二人の前を歩く # option: lead_ahead]
    # profile: bold
    { romance_result == "negative":
        # speaker: narrator
        先に下りると、カヴィヤは足を止め、彼女の後ろに隠れてしまった。知らない大人が前にいるのは、かえって怖いらしい。
        # speaker: heroine
        # emotion: smile
        大丈夫。この人、鳩より怖くないから。ね、ゆっくり行こう
    - else:
        # speaker: narrator
        一段ずつ、先に下りる。振り返るたびに、カヴィヤの足が一段ずつついてくる。
    }
* [二人の後ろを、ゆっくりついていく # option: walk_behind]
    # profile: attentive
    { romance_result == "negative":
        # speaker: narrator
        カヴィヤは何度も振り返り、後ろのこちらを確かめた。前を見ていないので、そのたびに足が止まる。
    - else:
        # speaker: narrator
        後ろから見ると、彼女の方が、カヴィヤよりしっかり手を握っていた。
    }
* [「怖いときは、数を数えるといい」と教える # option: count_numbers]
    # profile: playful
    { romance_result == "negative":
        # speaker: gt_kavya
        エーク、ドー、ティーン！
        # speaker: narrator
        声が大きすぎて、階段の下で先生が人差し指を口に当てた。カヴィヤは首をすくめ、彼女も一緒に首をすくめた。
    - else:
        # speaker: gt_kavya
        ……エーク、ドー、ティーン
        # speaker: heroine
        # emotion: smile
        いち、に、さん。二つの国の言葉で数えたら、倍、強くなれそう
    }
-
# speaker: narrator
地下の展示室の真ん中に、ガラスの箱があった。中に、布にくるまれた細長い姿が横たわっている。
案内によると、エジプトの古い時代の女性で、神官の家の人だったと考えられている。およそ二千三百年前の人だ。1887年、はるばるカイロからジャイプールへやってきた。トゥトゥと呼ばれている。
# speaker: gt_kavya
……トゥトゥ？　名前、あるの？
# speaker: gt_kavya
かわいい名前。……トゥトゥは、遠くから来て、さみしくないのかな
# speaker: heroine
# emotion: smile
毎日、こんなにたくさんの子が、会いに来てくれるなら。たぶん、さみしくないと思うよ
# speaker: narrator
カヴィヤは、ガラスに額がつくほど近づいた。それから、振り向いて、先生のところへ走っていった。
# speaker: gt_kavya
先生！　わたし、見た！
# speaker: narrator
自慢しに行ったのだ。
外に出ると、鳩は相変わらず、広場を埋めていた。
# speaker: heroine
怖いって、ちゃんと言えるの、えらいよね。……わたし、八歳のとき、たぶん言えなかった。平気なふりして、一人で泣いてた気がする
# speaker: heroine
# reaction: heroine,teasing,music
それにしても、ミイラより、鳩の方がよっぽど元気。わたし、やっぱり鳩の方が怖いかも
-> END
