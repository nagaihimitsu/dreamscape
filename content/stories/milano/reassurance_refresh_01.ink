// 保留後の交流。告白の結果はここでは変更しない。
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
ガッレリアの屋根の下を、人がドゥオモ広場からスカラ広場へ行き交う。
{heroine_name}は流れの端で立ち止まった。
{
- relationship_tone == "strained":
彼女は急いで笑わず、一度深く息を吸った。
- else:
彼女は人の波を避けてから、こちらへ向き直った。
}
# speaker: heroine
「この前の返事、まだ決まってない。だから会いに行っていいか、迷ったんだ」
「でも、黙って離れるのも違うと思って。今日は私から話しに来たよ」

* [「返事の予告だけ先に届いた」]
    # effect: milano_reassurance_chosen_joke_refresh
    { romance_result == "negative":
        # speaker: heroine
        「予告じゃなくて、今話せることを話してるの」
        # speaker: narrator
        彼女は目をそらさず、言い終えた。
    - else:
        # speaker: heroine
        「配達される前に読まれた葉書みたい。……訂正はしません」
        # speaker: narrator
        彼女はちょっとだけ笑った。
    }
    -> ending
* [「話してくれてありがとう。急がなくていいよ」]
    # effect: milano_reassurance_chosen_listen_refresh
    { romance_result == "negative":
        # speaker: heroine
        「ありがとう。でも、待ってもらうだけで済ませたくないの」
    - else:
        # speaker: heroine
        「うん。考えてるふりのままにはしたくないから、話しに来た」
        # speaker: narrator
        彼女はこちらを見て、自分の言葉を確かめた。
    }
    -> ending
* [「返事を待ちながら、また会いたい」]
    # effect: milano_reassurance_chosen_honest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「会うのはいいよ。でも、そのたびに返事を求められると困る」
        # speaker: narrator
        彼女は鞄の持ち手を握り直した。
    - else:
        # speaker: heroine
        「次の約束なら、私からしてもいい？　返事とは別に」
        # speaker: narrator
        彼女は足元のモザイクを指さした。
    }
    -> ending

=== ending ===
# speaker: heroine
「今日は、もう少しだけ歩こう。ガラスの屋根が終わるところまで」
# speaker: narrator
二人はどちらの広場へ行くかを相談しながら、人の流れに戻った。
-> END
