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

# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの端で彼女が人の流れをよけた。店の窓に、小さな隙間を空けた二人が映っている。
# speaker: heroine
# emotion: serious
「今日どうしたいか、片方だけが決めると、もう片方は「いいよ」しか言えなくなるね。ひとつずつ言ってみない？」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は慌ててこちらの顔色を読もうとして、いったん自分の手を見た。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は窓に映る二人を指さし、先に主人公の名を呼んだ。
}

* [「先に、君のを聞かせて」]
    # effect: milano_recovery_listen
    { romance_result == "negative":
        # speaker: heroine
        「また私だけが先？　小さいことでいいから、今日はそちらからも聞きたい。」
    - else:
        # speaker: heroine
        「今日は広場まで歩く。ここで終わり。さあ、そっちの番。」
    }
    -> join_1

* [「僕の希望は、おやつ」]
    # effect: milano_recovery_playful
    { romance_result == "negative":
        # speaker: heroine
        「お腹がすいてるのは分かった。私はゆっくり話せる所がいいな。」
    - else:
        # speaker: heroine
        「いい。私の希望は、立ち食いしないこと。両方かなう場所を探そう。」
    }
    -> join_1

* [「さっきの沈黙を急いで埋めたくない」]
    # effect: milano_recovery_honest
    { romance_result == "negative":
        # speaker: heroine
        「私は今、おしゃべりしたい日みたい。半分ずつにしよう。」
    - else:
        # speaker: heroine
        「私も。じゃあ少しだけ、次の柱まで黙ってみようか。」
    }
    -> join_1

=== join_1 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
二人の間で先に伸びたのは、行き先を指す彼女の手だった。
}
# speaker: narrator
柱を一本過ぎたところで、彼女は自分から歩幅を決めた。隣には、一人ぶんの空きがある。
-> END
