VAR player_name = ""
VAR heroine_name = ""
EXTERNAL has_item_status(id, status)

# background: milano_galleria
# speaker: narrator
ガッレリアの床の紋章を題材にした、小さな臨時展示の案内が出ていた。
# speaker: heroine
「トリノの雄牛、他の街の印と並ぶとどう見えるのかな。ちょっと入りたい」

* [Use the ticket.]
    # speaker: narrator
    受付で展示券を渡し、二人は展示へ入った。
    -> exhibition
* [Buy an entry ticket.]
    # speaker: narrator
    受付で入場料を払い、二人は展示へ入った。
    -> exhibition
* [Not now.]
    # speaker: heroine
    「今日は床をもう一度見よう。展示はまた今度でもいいし」
    -> END

=== exhibition ===
# speaker: narrator
図にはトリノの雄牛とミラノの赤い十字が並んでいる。
# speaker: heroine
「同じ床に違う街の印があるんだ。さっきは牛ばっかり見てた」
「帰りは十字も探そう。見つけるまで競争ね」
{has_item_status("galleria_souvenir", "gifted"):
    「しおりの牛には、もう少し手帳で待っててもらおう」
}
-> END
