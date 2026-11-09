INCLUDE modules.ink
-> DONE

// チャンドニー・チョークのデート（二人きり。噛み合いの選択は2回）。
// 「チャンドニー」の名の由来はデリーのフィナーレの答えなので、ここでは言わない。
// 一皿分の代金は、頭の # on_done: で払う（選択のない買い物）。腹を壊した夜と翌朝は gt_delhi_inserts.ink【4】。

// 【3】
=== gt_delhi_date_chandni_chowk ===
# scene: date
# title: バス、と言うまで
# when: episodes delhi >= 1
# on_done: money -40
# background: gt_bg_delhi_chandni_chowk
{ cond("time night"):
    # speaker: narrator
    日が落ちても、チャンドニー・チョークの路地は眠らない。頭の上で電線が黒い毛糸玉みたいに絡まり、裸電球の下で、大鍋の油がずっと鳴っている。
- else:
    # speaker: narrator
    チャンドニー・チョークの路地は、昼でも薄暗い。頭の上で電線が黒い毛糸玉みたいに絡まり、その下で、大鍋の油がずっと鳴っている。
}
# speaker: narrator
人だかりのできた屋台があった。客はみんな、葉っぱを固めた小さな器を手に、屋台の男の前に半円を作っている。
# speaker: heroine
# reaction: heroine,surprised,exclamation
「見て。あの人たち、丸いのを一口で食べてる。中に、水が入ってるの？」
# speaker: narrator
ゴルガッパ。薄く揚げた空洞の玉に、男が親指で穴を開け、じゃがいもを少し詰め、酸っぱくて辛い緑の水にくぐらせる。それを、客の器に一つずつ置いていく。
# speaker: heroine
「やってみたい。一個だけ。ううん、一皿だけ」
# speaker: narrator
器を受け取った瞬間、一つ目が置かれた。彼女は覚悟を決めて、丸ごと口に入れた。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
「すっぱ、からっ、おいしい！　口の中で、割れた！」
# speaker: narrator
感想を言い終わる前に、二つ目が来た。飲み込む前に、三つ目。屋台の男は客の顔を見ていない。手だけが、正確に、休まずに動いている。
四つ目。五つ目。彼女は涙目のまま、律儀に笑ってうなずいている。口がいっぱいで、何も言えない。
隣の男の客が、短く何か言った。屋台の男の手が、その客の器だけを飛ばした。――バス。
* [「バス！」と、彼女の代わりに言う # option: say_bas_for_her]
    # profile: bold
    # memory: gt_delhi_date_chandni_chowk_memory
    # set: gt_delhi_bas_for_her
    { romance_result == "negative":
        # speaker: narrator
        屋台の男の手が止まった。彼女は最後の一つをどうにか飲み込み、水を一口飲んでから、こちらを見た。
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        「……今の、わたしが言うところだったのに。止めてもらうの、ちょっと悔しい」
    - else:
        # speaker: narrator
        屋台の男の手が止まった。彼女は最後の一つをどうにか飲み込み、水を一口飲んでから、こちらを見た。
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「助かった。助かったけど。次は、自分で言うからね」
    }
* [「『バス』で止まるみたい」と耳打ちする # option: whisper_bas]
    # profile: attentive
    # memory: gt_delhi_date_chandni_chowk_memory
    # set: gt_delhi_said_bas
    { romance_result == "negative":
        # speaker: narrator
        彼女は口をいっぱいにしたまま、目だけで「バス？」と聞き返した。乗り物の、あのバスだ。飲み込んで、息を吸って、屋台の男に向かって言う。
        # speaker: heroine
        「ば、ばす……」
        # speaker: narrator
        小さすぎて、六つ目が来た。二回目で、ようやく男の手が止まった。
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「……言葉は合ってるのに、声が足りなかった」
    - else:
        # speaker: narrator
        彼女は口をいっぱいにしたまま、目だけで「バス？」と聞き返した。乗り物の、あのバスだ。飲み込んで、息を吸って、屋台の男に向かって言う。
        # speaker: heroine
        「バ、バス！」
        # speaker: narrator
        男の手が、ぴたりと止まった。それから初めて客の顔を見て、にっと笑った。
        # speaker: heroine
        # reaction: heroine,happy,sparkle
        「止まった！　乗り物の名前で止まった！　これ、日本に持って帰りたい言葉かも」
    }
* [隣で同じ皿を頼み、勝負を挑む # option: golgappa_duel]
    # profile: playful
    # memory: gt_delhi_date_chandni_chowk_memory
    # money: -40
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「勝負？　今？　……もう五個食べてるんだよ、わたし」
        # speaker: narrator
        それでも彼女は器を差し出した。負けず嫌いの顔だった。
    - else:
        # speaker: narrator
        こちらも器を受け取ると、彼女の目つきが変わった。涙目のまま、口の端だけで笑う。受けて立つ、という顔だった。
    }
    # speaker: narrator
    屋台の男は事情を察したらしい。二人の器に、交互に、同じ速さで置き始めた。周りの客が数を数え出す。七。八。九。
    十二で、彼女が胸を叩いた。十三で、こちらがむせた。十四で、二人とも同時に手を上げた。
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    「引き分け！　今の、わたしの方が一瞬早かったけどね」
-
# speaker: narrator
屋台の男が、指を一本立てた。最後の一つ。おまけだ、と言う。緑の水が、今日いちばんたっぷり入っている。
# speaker: heroine
# emotion: worried
「……食べたい。食べたいけど、もう入らないかも。でも、せっかくくれたのに」
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
        「あっ。それ、わたしのだったのに。ほんとに食べたかったんだよ」
    - else:
        # speaker: narrator
        器を引き寄せ、一口で放り込む。今日いちばんの酸っぱさが、鼻の奥まで駆け上がった。
        # speaker: heroine
        # reaction: heroine,teasing,music
        「あ、ずるい。ふふ、涙出てる。わたしの分まで、ありがとう。たぶん、すごく後悔する味だね、それ」
    }
* [「食べたいって顔してる」と、彼女に譲る # option: give_her_last]
    # profile: attentive
    # set: gt_delhi_heroine_sick
    # set: gt_delhi_golgappa_sick
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        「顔で決めないで。食べたいけど、言う前に決められると、ちょっと悔しい」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「ばれた？　じゃあ、いただきます。最後の一個って、いちばんおいしい気がするから」
    }
    # speaker: narrator
    彼女は目を閉じて、最後の一つを丸ごと味わった。それから、勝った人の顔で、空の器を屋台の男に見せた。
* [「二人で言おう。せーの」 # option: say_bas_together]
    # profile: playful
    # set: gt_delhi_said_bas
    { romance_result == "negative":
        # speaker: narrator
        声はそろわなかった。彼女の「バス」が半拍早く、こちらの「バス」が後から追いかけた。
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「……ずれた。わたし、ちょっと早かったね」
    - else:
        # speaker: narrator
        声がそろった。バス。
    }
    # speaker: narrator
    屋台の男は肩をすくめ、水をくぐらせない、乾いた一つを代わりにくれた。塩と香辛料だけがまぶしてある。
    # speaker: heroine
    # reaction: heroine,happy,sparkle
    「水なしの、おまけのおまけ。断ったのに、もらえちゃった。言ってみるものだね」
-
# speaker: narrator
路地を出ると、人の流れに押されて、二人の肩がぶつかった。彼女は口の中の辛さを冷ますように、何度も息を吐いている。
# speaker: heroine
「この通り、たぶん一日じゃ全部は無理だね。お店の数より、人の数の方が多そう」
# speaker: heroine
# emotion: smile
「ねえ。今日覚えた言葉、言ってみて。違う、乗り物じゃないよ。ふふ」
{ cond("flag gt_delhi_golgappa_sick"):
    # speaker: narrator
    このとき二人は、まだ知らなかった。最後の一つが、夜中に何をするのか。
}
-> END
