INCLUDE modules.ink
-> DONE

// チャンドニー・チョークのデート（二人きり。噛み合いの選択は2回）。
// 「チャンドニー」の名の由来はデリーのフィナーレの答えなので、ここでは言わない。
// 二人分の皿の代金は、頭の # on_done: で払う（選択のない買い物。2026-11-16 からゲームで二人とも食べるので二皿分）。腹を壊した夜と翌朝は gt_delhi_inserts.ink【4】。
// 一回目の噛み合いは、ミニゲーム「ゴルガッパの勝負」（結果で、前の3択の道の台詞へつなぐ。下の注）。

// 【3】
=== gt_delhi_date_chandni_chowk ===
# scene: date
# title: バス、と言うまで
# when: episodes delhi >= 1
# hint: デリーの観光を一つ終えてから
# on_done: money -80
{ cond("time night"):
    # background: gt_bg_delhi_chandni_chowk_night
    # tint: off
    # speaker: narrator
    日が落ちても、チャンドニー・チョークの路地は眠らない。頭の上で電線が黒い毛糸玉みたいに絡まり、裸電球の下で、大鍋の油がずっと鳴っている。
- else:
    # background: gt_bg_delhi_chandni_chowk
    # speaker: narrator
    チャンドニー・チョークの路地は、昼でも薄暗い。頭の上で電線が黒い毛糸玉みたいに絡まり、その下で、大鍋の油がずっと鳴っている。
}
# speaker: narrator
人だかりのできた屋台があった。客はみんな、葉っぱを固めた小さな器を手に、屋台の男の前に半円を作っている。
# speaker: heroine
# reaction: heroine,surprised,exclamation
# voice: gt_delhi_date_chandni_chowk_001
見て。あの人たち、丸いのを一口で食べてる。中に、水が入ってるの？
# speaker: narrator
# term: gt_term_golgappa
ゴルガッパ。男が親指で穴を開け、じゃがいもを少し詰め、酸っぱくて辛い緑の水にくぐらせる。それを、客の器に一つずつ置いていく。
# speaker: heroine
# voice: gt_delhi_date_chandni_chowk_002
やってみたい。一個だけ。ううん、一皿だけ
# speaker: narrator
器を受け取った瞬間、一つ目が置かれた。彼女は覚悟を決めて、丸ごと口に入れた。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_delhi_date_chandni_chowk_003
すっぱ、からっ、おいしい！　口の中で、割れた！
# speaker: narrator
感想を言い終わる前に、二つ目が来た。飲み込む前に、三つ目。屋台の男は客の顔を見ていない。手だけが、正確に、休まずに動いている。
# speaker: narrator
# emotion: smile
四つ目。五つ目。彼女は涙目のまま、律儀に笑ってうなずいている。口がいっぱいで、何も言えない。
隣の男の客が、短く何か言った。
# speaker: gt_delhi_chandni_customer
# local_word: gt_delhi_word_bas
バス
# speaker: narrator
# leave: gt_delhi_chandni_customer
屋台の男の手が、その客の器だけを飛ばした。
// 一回目の噛み合いの代わりに、ミニゲーム「ゴルガッパの勝負」（2026-11-16。前は「勝負を挑む」を選んだときだけ遊んだ）。
// 屋台の男が二人の器に交互に置き、ゲームの結果と同じ ID の選択肢をゲームが選ぶ（噛み合いはここで1回）。結果ごとに、前の3択の道の台詞へつなぐ。
// 同時（together）：手では止まらず、こちらの「バス」を聞いた彼女が自分で言う（前の「耳打ち」の道。gt_delhi_said_bas）。
// 先に言った（you_first）：男の手が止まり、彼女は「わたしが言うところだった」（前の「代わりに言う」の道。gt_delhi_bas_for_her）。
// むせた（choke）：彼女が「この人の分も、バス！」と自分で言う（gt_delhi_said_bas）。長く食べた（outlast）：拍手。フラグなし。
# speaker: narrator
# minigame: golgappa_duel auto together art.stall gt_img_delhi_golgappa_stall
男は、隣に立つこちらにも葉の器を持たせた。それから二人の器に、交互に置き始めた。一つ置くごとに、手が速くなる。周りの客が数を数え出す。
* [ゴルガッパの勝負：十四で、二人同時に手を上げた # option: together]
    # profile: attentive
    # memory: gt_delhi_date_chandni_chowk_memory
    # set: gt_delhi_said_bas
    # speaker: narrator
    十四で、二人の手が同時に上がった。けれど屋台の男は、手を見ていない。二人の器に、十五個目が置かれた。思わず「バス」と口に出すと、男の手が、こちらの器の上でだけ止まった。
    { romance_result == "negative":
        # speaker: narrator
        彼女は口をいっぱいにしたまま、目だけで「バス？」と聞き返した。乗り物の、あのバスだ。飲み込んで、息を吸って、屋台の男に向かって言う。
        # speaker: heroine
        # voice: gt_delhi_date_chandni_chowk_006
        ば、ばす……
        # speaker: narrator
        小さすぎて、もう一つ来た。二回目で、ようやく男の手が止まった。
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        # voice: gt_delhi_date_chandni_chowk_007
        ……言葉は合ってるのに、声が足りなかった
    - else:
        # speaker: narrator
        彼女は口をいっぱいにしたまま、目だけで「バス？」と聞き返した。乗り物の、あのバスだ。飲み込んで、息を吸って、屋台の男に向かって言う。
        # speaker: heroine
        # voice: gt_delhi_date_chandni_chowk_008
        バ、バス！
        # speaker: narrator
        男の手が、ぴたりと止まった。それから初めて客の顔を見て、にっと笑った。
        # speaker: heroine
        # reaction: heroine,happy,sparkle
        # voice: gt_delhi_date_chandni_chowk_009
        止まった！　乗り物の名前で止まった！　これ、日本に持って帰りたい言葉かも
    }
* [ゴルガッパの勝負：先に「バス」と言った # option: you_first]
    # profile: bold
    # memory: gt_delhi_date_chandni_chowk_memory
    # set: gt_delhi_bas_for_her
    # speaker: narrator
    先に「バス」と言ったのは、こちらだった。
    { romance_result == "negative":
        # speaker: narrator
        屋台の男の手が止まった。彼女は最後の一つをどうにか飲み込み、水を一口飲んでから、こちらを見た。
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        # voice: gt_delhi_date_chandni_chowk_004
        ……今の、わたしが言うところだったのに。止めてもらうの、ちょっと悔しい
    - else:
        # speaker: narrator
        屋台の男の手が止まった。彼女は最後の一つをどうにか飲み込み、水を一口飲んでから、こちらを見た。
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        # voice: gt_delhi_date_chandni_chowk_005
        助かった。助かったけど。次は、自分で言うからね
    }
* [ゴルガッパの勝負：器にたまって、むせた # option: choke]
    # profile: playful
    # memory: gt_delhi_date_chandni_chowk_memory
    # set: gt_delhi_said_bas
    # speaker: narrator
    器の中に、二つたまっていた。慌てて一つ放り込むと、酸っぱい水が喉に飛び込んだ。むせて、声が出ない。
    # speaker: narrator
    彼女が、こちらの器の上に手をかざした。
    # speaker: heroine
    # reaction: heroine,surprised,exclamation
    バス！　この人の分も、バス！
    # speaker: heroine
    # reaction: heroine,teasing,music
    勝負は、わたしの勝ちでいい？　……はい、水。ゆっくり飲んで
* [ゴルガッパの勝負：彼女より長く食べ続けた # option: outlast]
    # profile: provocative
    # memory: gt_delhi_date_chandni_chowk_memory
    # speaker: narrator
    十四で、彼女が手を上げた。こちらの手は、上がらなかった。数える声が、ひときわ大きくなる。屋台の男がとうとう笑って手を止めると、周りの客から拍手が起きた。
    # speaker: heroine
    # reaction: heroine,teasing,music
    負けた……。でも、勝った人の顔じゃないよ、それ。真っ赤だし、涙まで出てる
-
# speaker: narrator
屋台の男が、指を一本立てた。
# speaker: gt_delhi_chandni_vendor
最後の一つ。おまけだ
# speaker: narrator
緑の水が、今日いちばんたっぷり入っている。
# speaker: heroine
# emotion: worried
# voice: gt_delhi_date_chandni_chowk_012
……食べたい。食べたいけど、もう入らないかも。でも、せっかくくれたのに
# speaker: narrator
彼女は器の上の一つと、こちらの顔を、三回ずつ見比べた。
* [自分が食べる # option: eat_last_myself]
    # profile: provocative
    # set: gt_delhi_player_sick
    # set: gt_delhi_golgappa_sick
    { romance_result == "negative":
        # speaker: narrator
        器を引き寄せ、一口で放り込む。今日いちばんの酸っぱさが、鼻の奥まで駆け上がった。
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_delhi_date_chandni_chowk_013
        あっ。それ、わたしのだったのに。ほんとに食べたかったんだよ
    - else:
        # speaker: narrator
        器を引き寄せ、一口で放り込む。今日いちばんの酸っぱさが、鼻の奥まで駆け上がった。
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_delhi_date_chandni_chowk_014
        あ、ずるい。ふふ、涙出てる。わたしの分まで、ありがとう。たぶん、すごく後悔する味だね、それ
    }
* [「食べたいって顔してる」と、彼女に譲る # option: give_her_last]
    # profile: attentive
    # set: gt_delhi_heroine_sick
    # set: gt_delhi_golgappa_sick
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_delhi_date_chandni_chowk_015
        顔で決めないで。食べたいけど、言う前に決められると、ちょっと悔しい
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        # voice: gt_delhi_date_chandni_chowk_016
        ばれた？　じゃあ、いただきます。最後の一個って、いちばんおいしい気がするから
    }
    # speaker: narrator
    # emotion: happy
    彼女は目を閉じて、最後の一つを丸ごと味わった。それから、勝った人の顔で、空の器を屋台の男に見せた。
* [「二人で言おう。せーの」 # option: say_bas_together]
    # profile: playful
    # set: gt_delhi_said_bas
    { romance_result == "negative":
        # speaker: heroine
        # voice: gt_delhi_date_chandni_chowk_017
        バス！
        # speaker: narrator
        声はそろわなかった。彼女が半拍早く、こちらの声が後から追いかけた。
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        # voice: gt_delhi_date_chandni_chowk_018
        ……ずれた。わたし、ちょっと早かったね
    - else:
        # speaker: heroine
        # voice: gt_delhi_date_chandni_chowk_019
        バス！
        # speaker: narrator
        こちらの声と、ぴったりそろった。
    }
    # speaker: narrator
    屋台の男は肩をすくめ、水をくぐらせない、乾いた一つを代わりにくれた。塩と香辛料だけがまぶしてある。
    # speaker: heroine
    # reaction: heroine,happy,sparkle
    # voice: gt_delhi_date_chandni_chowk_020
    水なしの、おまけのおまけ。断ったのに、もらえちゃった。言ってみるものだね
-
# speaker: narrator
# leave: gt_delhi_chandni_vendor
路地を出ると、人の流れに押されて、二人の肩がぶつかった。彼女は口の中の辛さを冷ますように、何度も息を吐いている。
# speaker: heroine
# voice: gt_delhi_date_chandni_chowk_021
この通り、たぶん一日じゃ全部は無理だね。お店の数より、人の数の方が多そう
# speaker: heroine
# emotion: smile
# voice: gt_delhi_date_chandni_chowk_022
ねえ。今日覚えた言葉、言ってみて。違う、乗り物じゃないよ。ふふ
{ cond("flag gt_delhi_golgappa_sick"):
    # speaker: narrator
    # pause: 800
    このとき二人は、まだ知らなかった。最後の一つが、夜中に何をするのか。
}
-> END
