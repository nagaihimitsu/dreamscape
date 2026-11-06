// 通常デート（stories/dates/<接頭辞>_<都市ID>_date_….ink）：行き先で過ごす短い会話。
// - 日本語の3択を2回置き、各選択の直後（最初の台詞の前）に # effect を1つずつ置く。
// - ここでは共通効果 common_date_first_* / common_date_second_* を使う。末尾は返答の性格
//   （attentive・playful・honest・bold・provocative）で、結果は確率で決まる。確率・乱数・数値はInkに書かない。
// - 各選択の反応は romance_result の positive と negative で描き分ける（negative でも関係を壊す台詞にしない）。
// - 冒頭は relationship_tone、結びは relationship_tone_after で少しだけ変える
//   （値は reserved・strained・comfortable・guarded_attraction・warm・romantic_tension）。
// - 行き先の小話（ここでは架空の「ベンチの向き」）を会話に入れ、観光情報の読み上げにしない。
// - ヒロインの台詞は docs/09_HEROINE_CHARACTER_BIBLE.md に照らして書く。見本の街は架空。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0

# background: smp_bg_mihon_clock_tower
# speaker: narrator
時計塔の広場では、ベンチがどれも塔の方を向いている。{heroine_name}は一つを選んで、端に座った。
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: heroine
    「ここのベンチ、待つ人が文字盤を見られる向きなんだって。……隣、どうぞ」
- else:
    # speaker: heroine
    # emotion: teasing
    「ここ、空いてます。三時までの席だけど、いい？」
}
* [「三時になるまで、ここで待とう」]
    # effect: common_date_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「あの時計、ずっと三時だよ。……待つなら、何か話して」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。急がなくていい待ち合わせって、ちょっといいね」
    }
    -> tea
* [「もう三時は過ぎてるって、言ってもいい？」]
    # effect: common_date_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「それ、トーマさんの前で言ったら落ち込んじゃうよ」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「だめ。この広場では、ずっと三時。言い伝え、聞いたでしょ？」
    }
    -> tea
* [「時計より、隣で話す方が気になる」]
    # effect: common_date_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「そう？　わたしは、あの止まった針もけっこう気に入ってるんだけどな」
    - else:
        # speaker: heroine
        # emotion: shy
        「……そういうこと、さらっと言うんだ。じゃあ、ちゃんと隣にいてね」
    }
    -> tea

=== tea ===
# speaker: narrator
広場の店からお茶が運ばれてきた。この街では、いつ頼んでも「三時のお茶」と呼ぶらしい。
# speaker: heroine
「ねえ、わたしたちも『三時に会おう』って使ってみない？　来られるときに来て、って意味で」
* [「じゃあ、次の三時もここで」]
    # effect: common_date_second_bold
    { romance_result == "negative":
        # speaker: heroine
        「もう次の話？　……今日の三時が、まだ終わってないよ」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「……うん。約束ね。来られるときじゃなくて、ちゃんと来て」
    }
    -> ending
* [「時刻を決めない約束は、少し不安かも」]
    # effect: common_date_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「そっか。……わたしだけ、楽しくなってたかな」
    - else:
        # speaker: heroine
        # emotion: serious
        「言ってくれてよかった。じゃあ、来られないときは、来られないって言おう。それも約束」
    }
    -> ending
* [「来られるとき、と言いながら毎日呼びそう」]
    # effect: common_date_second_playful
    { romance_result == "negative":
        # speaker: heroine
        「毎日は……わたしにも予定があるよ？」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「ふふ、毎日三時。それ、ちょっと楽しそう」
    }
    -> ending

=== ending ===
# speaker: narrator
お茶を飲み終えても、針は三時のままだった。{heroine_name}は立ち上がり、文字盤を見上げる。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: heroine
    # emotion: happy
    「次は、わたしから誘うね。三時に、って」
- else:
    # speaker: heroine
    # emotion: smile
    「止まった時計なのに、今日は時間が早かったな」
}
-> END
