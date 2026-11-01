// 誘いは任意。特定のデートを経験していなくても成立する。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false

# background: milano_city_date_landmark
# speaker: narrator
ガッレリアのガラス屋根の下で、{heroine_name}が小さな紙袋を抱えていた。
# speaker: heroine
「今日は、私の行きたいところに付き合ってくれますか」
「ここはミラノの居間って呼ばれることもあるんですって」
「居間なのに、みんな通り過ぎていく。……私たちは少し、座り込んでしまいましょうか」
# speaker: narrator
彼女はさっき立ち寄った店の紙袋から、何も書かれていない葉書を出した。

* [「何も書かずに送ったら、深い意味がありそう」]
    # effect: milano_invitation_chosen_joke
    # speaker: heroine
    # emotion: smile
    「たぶん最初に、書き忘れを心配されます」
    # speaker: narrator
    彼女は葉書を裏返して、くすっと息をこぼした。
    -> ending
* [「どの色で迷ってたの？」]
    # effect: milano_invitation_chosen_listen
    # speaker: heroine
    「この白と、もう少し白い方」
    # speaker: narrator
    違いを聞くと、彼女は真面目な顔でもう一枚取り出した。
    -> ending
* [「ここに誘ってもらえて、嬉しい」]
    # effect: milano_invitation_chosen_honest
    # speaker: heroine
    # emotion: shy
    「……まだ、何も案内してませんよ」
    # speaker: narrator
    彼女はガラス屋根へ目を戻した。でも、葉書は二人の間に置いたままだった。
    -> ending

=== ending ===
# speaker: heroine
「{player_address}、もう少し見ててもいいですか。次の行き先は、まだ決めてなくて」
# speaker: narrator
どこへ送るかは、ガッレリアを出るまで決まらなかった。
-> END
