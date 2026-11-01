// Phase 2 試遊用短編。夜景デート。通常デート：3択を2回。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false

-> start

=== start ===
# background: milano_night
# speaker: narrator
橋の上から見る運河には、窓の灯りが細く揺れていた。
{heroine_name}のカメラは、明るい店先ではなく、一つだけ暗い窓に向いている。
# speaker: heroine
「灯りがつくところを待ってたんだけど。……もう十分くらい、負けてる」

* [「窓の方は、消灯したまま勝ち続けてるね」]
    # effect: milano_night_first_joke
    # speaker: heroine
    「強いね。何もしてないのに」
    # speaker: narrator
    彼女はカメラを下ろし、ようやく小さく笑った。
    -> photo

* [「写真にはならなくても、待ってるのは嫌じゃないよ」]
    # effect: milano_night_first_listen
    # speaker: heroine
    「……うん。でも、足が冷えたら言って。私、ときどき忘れるから」
    # speaker: narrator
    視線は窓に残したまま、彼女は半歩こちらへ寄った。
    -> photo

* [「窓より、待ってる横顔を覚えて帰りたいな」]
    # effect: milano_night_first_honest
    # emotion: shy
    # speaker: heroine
    「じゃあ今、かなり意地になってる顔を覚えられてるね」
    # speaker: narrator
    カメラの陰に隠れようとして、彼女は途中でやめた。
    -> photo

=== photo ===
# speaker: narrator
少しして、窓に灯りがついた。誰かがカーテンを引き、すぐに部屋の奥へ消えた。
{heroine_name}はシャッターを押さなかった。
# speaker: heroine
「……ただ、帰ってきた人がいたんだね」
「{player_address}。今の、写真にしなくてよかった気がする」

* [「じゃあ、二人とも見たっていう証言だけ残そう」]
    # effect: milano_night_second_joke
    # speaker: heroine
    「証人が二人とも、窓を見てただけの人だ」
    # speaker: narrator
    彼女は首を傾けた。けれど、カメラを構え直すことはなかった。
    -> ending

* [「見たものを全部、持って帰らなくてもいいんだね」]
    # effect: milano_night_second_listen
    # speaker: heroine
    「うん。忘れたら……どっちかが覚えてるかもしれないし」
    # speaker: narrator
    彼女はこちらを見た。確認するように、一瞬だけ。
    -> ending

* [「帰ってからも、こういう話を一緒にしたい」]
    # effect: milano_night_second_honest
    # emotion: shy
    # speaker: heroine
    「……うまく説明できない話ばかりになりそう」
    # speaker: narrator
    彼女はカメラを鞄へしまった。両手が空いても、すぐには歩き出さなかった。
    -> ending

=== ending ===
# speaker: narrator
橋を降りる途中で、足音が自然に揃った。
振り返らなくても、あの窓の場所は二人ともわかっていた。
-> END
