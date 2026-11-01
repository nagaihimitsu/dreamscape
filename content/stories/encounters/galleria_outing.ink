VAR player_name = ""
VAR heroine_name = ""
EXTERNAL has_item_status(id, status)

# background: milano_galleria
# speaker: narrator
ガッレリアの一角に、床の紋章を紹介する小さな展示が出ていた。
# speaker: heroine
「あの床の雄牛、他の街の紋章と並ぶとどう見えるんだろう」

* [Use the ticket.]
    # speaker: narrator
    受付で展示券を渡し、二人は小さな展示へ入った。
    -> exhibition
* [Buy an entry ticket.]
    # speaker: narrator
    受付で入場料を払い、二人は小さな展示へ入った。
    -> exhibition
* [Not now.]
    # speaker: heroine
    「うん。今日は通りから見えるところを楽しもう」
    -> END

=== exhibition ===
# speaker: narrator
展示には、トリノの雄牛とミラノの赤い十字を並べた図があった。
# speaker: heroine
「同じ床に別の街の印があるって、やっぱり面白いね」
「帰り道、床の牛にもう一度会いたくなった」
{has_item_status("galleria_souvenir", "gifted"):
    「もらったしおりも、手帳の目印にしてるよ」
}
-> END
