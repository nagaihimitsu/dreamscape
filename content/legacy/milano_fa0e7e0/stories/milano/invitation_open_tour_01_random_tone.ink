// 誘いは任意。特定のデートを経験していなくても成立する。
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false

# background: milano_city_date_landmark
# speaker: narrator
ガッレリアのガラス屋根の下で、{heroine_name}が小さな紙袋を抱えていた。
{
- relationship_tone == "strained":
彼女は持ち手を握り直し、こちらの返事を待った。
- relationship_tone == "guarded_attraction":
目が合うと、彼女は紙袋の口を覗き込んだ。
- relationship_tone == "comfortable":
彼女は袋をこちらにも見せ、買い物の続きを話し始めた。
- relationship_tone == "warm":
彼女は紙袋を軽く揺らし、こちらにも見せた。
- relationship_tone == "romantic_tension":
彼女は紙袋を二人の間に持ち、少しこちらへ寄せた。
- else:
彼女は袋を抱えたまま、控えめに声をかけた。
}
# speaker: heroine
「今日は、私の行きたいところに付き合ってくれますか」
「ここはミラノの居間って呼ばれることもあるんですって」
「居間なのに、みんな通り過ぎていく。……私たちは少し、座り込んでしまいましょうか」
# speaker: narrator
彼女はさっき立ち寄った店の紙袋から、何も書かれていない葉書を出した。

* [「何も書かずに送ったら、深い意味がありそう」]
    # effect: milano_invitation_chosen_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「それだと、届いた人が心配するかも」
        # speaker: narrator
        彼女は葉書をそっと引き寄せ、宛名の欄を指でなぞった。
    - else:
        # speaker: heroine
        # emotion: smile
        「たぶん最初に、書き忘れを心配されます」
        # speaker: narrator
        彼女は葉書を裏返して、くすっと息をこぼした。
    }
    -> ending
* [「どの色で迷ってたの？」]
    # effect: milano_invitation_chosen_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「色の話になると、長いですよ。……本当に聞きます？」
        # speaker: narrator
        彼女は二枚を重ね、違いが見えなくなった方から説明を始めた。
    - else:
        # speaker: heroine
        「この白と、もう少し白い方」
        # speaker: narrator
        違いを聞くと、彼女は真面目な顔でもう一枚取り出した。
    }
    -> ending
* [「ここに誘ってもらえて、嬉しい」]
    # effect: milano_invitation_chosen_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: surprised
        {
        - relationship_tone_after == "strained":
        「まだ誘ったばかりです。行き先を聞いてからにしてください」
        - relationship_tone_after == "guarded_attraction":
        「……まだ行き先も言ってないのに、そう言うんですね」
        - else:
        「嬉しい、が早いです。まだ行き先を言ってません」
        }
        # speaker: narrator
        彼女は紙袋を抱え直し、視線をガラス屋根へ逃がした。
    - else:
        # speaker: heroine
        # emotion: shy
        {
        - relationship_tone_after == "romantic_tension":
        「……私も、誘ってよかったです。案内はこれからですけど」
        - relationship_tone_after == "comfortable":
        「まだ何も案内してませんよ。期待が大きすぎます」
        - relationship_tone_after == "guarded_attraction":
        「……それ、行き先より先に聞くとは思いませんでした」
        - else:
        「……まだ、何も案内してませんよ」
        }
        # speaker: narrator
        彼女はガラス屋根へ目を戻した。でも、葉書は二人の間に置いたままだった。
    }
    -> ending

=== ending ===
# speaker: heroine
「{player_address}、もう少し見ててもいいですか。次の行き先は、まだ決めてなくて」
# speaker: narrator
どこへ送るかは、ガッレリアを出るまで決まらなかった。
-> END
