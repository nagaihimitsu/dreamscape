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

# background: milano_walk_landmark
# speaker: narrator
ドゥオモ広場でカメラを渡された。彼女はポーズを取らず、広場の人の流れにすっと混じった。
# speaker: heroine
「大聖堂を撮って。あとで私を探せるくらい、小さく。」
「足元の地下には昔の礼拝施設の跡もあるんだって。そこまで写るかな。」
# speaker: player
「人物が主役じゃなくていいの？」
# speaker: heroine
「いつも撮る係なんです。一枚くらい、たしかにここにいたっていう証拠がほしい。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女はストラップを渡すまで、カメラから両手を離さなかった。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
カメラを渡すとき、彼女は背伸びして、ファインダー越しの相手をのぞいた。
}

* [「袖だけでも分かる」]
    # effect: common_date_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        「私がここにいたって話だから、袖だけで済まさないで。」
    - else:
        # speaker: heroine
        # emotion: teasing
        「じゃあ腕は振らない。難易度、ちょっと上げます。」
    }
    -> join_1

* [「どの辺まで歩きたい？」]
    # effect: common_date_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「範囲を決めたら探すのが簡単すぎる。行き先は内緒。」
    - else:
        # speaker: heroine
        「あの境目。地下に前の広場が残ってるって知ると、石の上を歩く足も撮ってほしいな。」
    }
    -> join_1

* [「一枚だけ僕に任せて」]
    # effect: common_date_first_bold
    { romance_result == "negative":
        # speaker: heroine
        「一枚だけって言われると緊張する。何枚かにしてくれる？」
    - else:
        # speaker: heroine
        「うん。一枚だけね。変でも、あとで二人で見る。」
    }
    -> join_1

=== join_1 ===
# speaker: narrator
画面を拡大すると、人の肩と肩の間に彼女がいた。大聖堂を見上げず、こちらを向いて笑っている。
# speaker: heroine
「しまった。カメラ見たら普通の記念写真だ。」

* [「こっちを見た理由を聞く」]
    # effect: sound_walk_01_2_1
    { romance_result == "negative":
        # speaker: heroine
        「そこまで理由がある顔してた？　たまたまかもよ。」
    - else:
        # speaker: heroine
        「ちゃんと探してくれてるか、気になった。……探してたね。」
    }
    -> join_2

* [「次は交代して探して」]
    # effect: sound_walk_01_2_2
    { romance_result == "negative":
        # speaker: heroine
        「今日は撮る係をお休みしたいの。もう少しだけ。」
    - else:
        # speaker: heroine
        「見つけるよ。立ち止まって人に道を譲る癖、もう知ってる。」
    }
    -> join_2

* [「この一枚を送っていい？」]
    # effect: sound_walk_01_2_3
    { romance_result == "negative":
        # speaker: heroine
        「先に二人で見よう。送るかは、ちょっと考えさせて。」
    - else:
        # speaker: heroine
        「うん。元の大きさで。探すところも家に持って帰りたい。」
    }
    -> join_2

=== join_2 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
小さな画面を一緒に見るために、肩が触れた。
}
# speaker: narrator
二人は画面を縮めた。彼女が街に戻り、それでも今度はすぐ見つかった。
-> END
