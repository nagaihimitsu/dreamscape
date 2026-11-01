// Phase 2 試遊用短編。夜景デート。通常デート：3択を2回。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false

VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"

VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0

-> start

=== start ===
# background: milano_night_landmark
# speaker: narrator
ナヴィリオの橋から見る運河には、窓の灯りが細く揺れていた。
{
- relationship_tone == "reserved":
彼女は欄干から少し離れ、暗い窓にカメラを向けた。
- relationship_tone == "strained":
彼女はカメラを構えたまま、静かに窓を見ていた。
- relationship_tone == "comfortable":
彼女はカメラを下ろし、隣で一緒に窓を待った。
- relationship_tone == "guarded_attraction":
隣に目を向けかけた彼女は、またファインダーをのぞいた。
- relationship_tone == "warm":
彼女はカメラの画面を傾け、窓の暗さを見せた。
- else:
彼女は欄干に置いた手を引かず、窓の灯りを待った。
}
# speaker: heroine
「この辺りには、いくつもの家の入口が同じ廊下に並ぶ建物があるんだって」
「帰る人も、すれ違う人も、みんな同じ廊下を通るんだね」
# speaker: narrator
{heroine_name}のカメラは、明るい店先ではなく、一つだけ暗い窓に向いている。
# speaker: heroine
「灯りがつくところを待ってたんだけど。……もう十分くらい、負けてる」

* [「窓の方は、消灯したまま勝ち続けてるね」]
    # effect: milano_night_first_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「勝ち負けにすると、窓がちょっとかわいそう」
        # speaker: narrator
        彼女はカメラを構えたまま、暗い窓を見上げた。
    - else:
        # speaker: heroine
        「強いね。何もしてないのに」
        # speaker: narrator
        彼女はカメラを下ろし、ようやく小さく笑った。
    }
    -> photo

* [「写真にはならなくても、待ってるのは嫌じゃないよ」]
    # effect: milano_night_first_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「本当？　寒かったら、待たなくてもいいんだよ」
        # speaker: narrator
        彼女は足元を見てから、カメラを持ち直した。
    - else:
        # speaker: heroine
        「……うん。でも、足が冷えたら言って。私、ときどき忘れるから」
        # speaker: narrator
        視線は窓に残したまま、彼女は半歩こちらへ寄った。
    }
    -> photo

* [「窓より、待ってる横顔を覚えて帰りたいな」]
    # effect: milano_night_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「……今は、窓のほうを見てて」
        # speaker: narrator
        彼女はカメラの陰に顔を隠し、レンズだけを窓へ向けた。
    - else:
        # emotion: shy
        # speaker: heroine
        「じゃあ今、かなり意地になってる顔を覚えられてるね」
        # speaker: narrator
        カメラの陰に隠れようとして、彼女は途中でやめた。
    }
    -> photo

=== photo ===
# speaker: narrator
{
- relationship_tone_after == "strained":
彼女は写真を確かめるふりをして、少し間を置いた。
- relationship_tone_after == "reserved":
彼女は画面を一度伏せ、運河に目を戻した。
- else:
彼女は暗い窓を指さし、まだ待つつもりだと笑った。
}
# speaker: narrator
少しして、窓に灯りがついた。誰かがカーテンを引き、すぐに部屋の奥へ消えた。
{heroine_name}はシャッターを押さなかった。
# speaker: heroine
「……ただ、帰ってきた人がいたんだね」
「{player_address}。今の、写真にしなくてよかった気がする」

* [「じゃあ、二人とも見たっていう証言だけ残そう」]
    # effect: milano_night_second_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: neutral
        「証言って言うと、何か事件みたいだね」
        # speaker: narrator
        彼女はカメラを下ろし、窓をもう一度見た。
    - else:
        # speaker: heroine
        「証人が二人とも、窓を見てただけの人だ」
        # speaker: narrator
        彼女は首を傾けた。けれど、カメラを構え直すことはなかった。
    }
    -> ending

* [「見たものを全部、持って帰らなくてもいいんだね」]
    # effect: milano_night_second_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「うん。でも、忘れたくないものもあるから」
        # speaker: narrator
        彼女はカメラの電源を切らずにいた。
    - else:
        # speaker: heroine
        「うん。忘れたら……どっちかが覚えてるかもしれないし」
        # speaker: narrator
        彼女はこちらを見た。確認するように、一瞬だけ。
    }
    -> ending

* [「帰ってからも、こういう話を一緒にしたい」]
    # effect: milano_night_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「帰ってからの話は……帰ってから考えよう」
        # speaker: narrator
        彼女はカメラの紐を指に巻き、そっとほどいた。
    - else:
        # emotion: shy
        # speaker: heroine
        「……うまく説明できない話ばかりになりそう」
        # speaker: narrator
        彼女はカメラを鞄へしまった。両手が空いても、すぐには歩き出さなかった。
    }
    -> ending

=== ending ===
# speaker: narrator
橋を降りる途中で、足音が自然に揃った。
振り返らなくても、あの窓の場所は二人ともわかっていた。
-> END
