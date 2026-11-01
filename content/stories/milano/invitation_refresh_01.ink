// ガッレリアからの誘い。旧効果IDを維持。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0

# background: milano_city_date_landmark
# speaker: narrator
ガッレリアのガラス屋根の下で、{heroine_name}がこちらに手を振った。
# speaker: heroine
「見て。この葉書、同じ色に見える？」
# speaker: narrator
二枚はどちらも白い。彼女は返事を待たず、並べ方を変えた。
{
- relationship_tone == "strained":
彼女は紙を下ろし、「急に呼び止めてごめん」と付け加えた。
- relationship_tone == "warm":
彼女はわざと難しい顔で、二枚の間を指さした。
- else:
彼女は光に透かして、もう一度見比べた。
}
# speaker: heroine
「こっちは少し黄色いの。家族に送るならこっちかな」
「ここ、『ミラノの居間』って呼ばれることもあるんだって。通り道なのに、立ち止まって悩む人もいて」
「……私も、その一人です。よかったら付き合ってくれる？」

* [「何も書かずに送れば、深い意味がありそう」]
    # effect: milano_invitation_chosen_joke_refresh
    { romance_result == "negative":
        # speaker: heroine
        「家族が心配しそう。私は何か書くよ」
        # speaker: narrator
        彼女は白いほうを引き寄せた。
    - else:
        # speaker: heroine
        「書き忘れたと思って、電話が来るよ」
        # speaker: narrator
        笑いながら彼女は葉書を裏返した。
    }
    -> ending
* [「どの色で迷ってるの？」]
    # effect: milano_invitation_chosen_listen_refresh
    { romance_result == "negative":
        # speaker: heroine
        「本当に聞く？　たぶん長くなるけど」
        # speaker: narrator
        彼女は二枚の端をぴたりと揃えた。
    - else:
        # speaker: heroine
        「この白と、もう少し白い方」
        # speaker: narrator
        真剣に並べた二枚を見ていると、彼女も吹き出した。
    }
    -> ending
* [「誘ってくれて嬉しい」]
    # effect: milano_invitation_chosen_honest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「まだ葉書しか見せてないよ。もう少し見てから言って」
        # speaker: narrator
        彼女は袋を抱え直した。
    - else:
        # speaker: heroine
        「ありがとう。……でも、まだ何も案内してないよ」
        # speaker: narrator
        彼女は葉書を二人の間に置いたまま、屋根を見上げた。
    }
    -> ending

=== ending ===
# speaker: heroine
「決めた。こっちにする。……書くことは、歩きながら考えよう」
# speaker: narrator
彼女は選ばなかった一枚も袋に戻し、自分の足で歩き出した。
-> END
