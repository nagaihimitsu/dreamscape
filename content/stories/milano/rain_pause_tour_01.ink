// ガッレリアを出たあと、雨宿りする短い寄り道。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの出口で、雨が広場を白く塗り始めた。
{heroine_name}は屋根の下に立ったまま、石の濡れる音を聞いている。
# speaker: heroine
「ガラスを鉄で支えた屋根だから、雨が見えるんですね」
「さっきと同じ場所なのに、音だけ別の街みたい」
「……もう少し、ここにいてもいいですか」

* [「今日は雲が街の音楽係なんだね」]
    # effect: milano_rain_pause_music
    # speaker: heroine
    # emotion: smile
    「選曲が激しいですね。傘の音も入れてほしい」
    -> ending
* [「屋根の端までなら、濡れずに見られそう」]
    # effect: milano_rain_pause_watch
    # speaker: heroine
    「あ、あの柱のところ。そこなら少し見えるかも」
    -> ending
* [「傘を買って、すぐ先へ行こう」]
    # effect: milano_rain_pause_hurry
    # speaker: heroine
    # emotion: worried
    「……もう少し、ここにいたいです。せっかく聞いていたから」
    -> ending

=== ending ===
# speaker: narrator
雨が弱まり、広場の向こうの輪郭が少しずつ戻ってきた。
急ぎ足の人の傘が、二人の前を横切った。
-> END
