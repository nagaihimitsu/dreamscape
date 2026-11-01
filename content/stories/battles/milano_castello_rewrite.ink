// 城とアッセの間は実際に見える場所と資料を区別する。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: milano_castello
# speaker: narrator
城の中庭で、紙の束を抱えた男性が風に追いかけられていた。一枚が{heroine_name}の靴の前に着地する。
# speaker: heroine
# emotion: surprised
「あ、つかまえました！」
# speaker: enemy
「助かった。……それ、僕が配る前に読まないで。まだ間違いがあるかもしれない」
# speaker: narrator
青年の名はルカ。親戚の子どもに城を案内するため、自分で小さな案内を作っているという。
# speaker: enemy
「あの子は、間違いを見つけると三日は笑う。昨日は僕が自分の靴を左右逆に描いた」
# speaker: heroine
# emotion: teasing
「笑ってもらえたなら、いい案内になりそう」
# speaker: enemy
「よくない。靴から先を読んでくれなかった」
# speaker: narrator
ルカは三か所の空欄を指した。
# speaker: enemy
「正確にしたい。案内と資料を見比べるのを、手伝ってくれないか」
# speaker: heroine
# emotion: serious
「いいですよ。見ていない部屋は、見ていないって書きましょう」
-> END

=== after_first ===
# background: milano_castello
{ answer_correct:
    # speaker: enemy
    「要塞で、宮廷の住まいで、今は博物館もある。よし、『城』の一行に収まらない」
    # speaker: heroine
    # emotion: smile
    「紙を大きくします？」
    # speaker: enemy
    「それをやると、あの子が僕より先に走って地図を広げる」
- else:
    # speaker: enemy
    「防御のためだけじゃなかったんだ。宮廷の住まいにもなって、今は博物館も入っている」
    # speaker: heroine
    # emotion: surprised
    「壁の外から、役目まで一つに決めてました」
}
# speaker: narrator
ルカは余白に矢印を書き足した。風に紙が浮き、{heroine_name}が端を押さえる。
# speaker: enemy
「次はアッセの間。中庭から見えないから、資料に頼るしかないね」
-> END

=== after_second ===
# background: milano_castello
{ answer_correct:
    # speaker: enemy
    「描かれた枝が壁から天井まで。部屋の中に、絵の木陰があるんだ」
    # speaker: heroine
    # emotion: happy
    「わ、雨が降っても葉っぱの下ですね」
- else:
    # speaker: enemy
    「本物の木じゃなくて、壁から天井に描かれた枝が木陰をつくるんだって」
    # speaker: heroine
    # emotion: smile
    「私、本物の幹を探すところでした。資料を先に見てよかった」
}
# speaker: narrator
{heroine_name}が紙の端に枝を一本描く。ルカがそれを見て、別の紙で隠した。
# speaker: heroine
# emotion: surprised
「え、だめでした？」
# speaker: enemy
「上手だから、靴を描いた人と同じ人だと思われたくない」
# speaker: heroine
# emotion: teasing
「じゃあ靴も描き直します？」
# speaker: enemy
「話を戻そう。最後は、その部屋が何に使われたか」
-> END

=== conclusion ===
# background: milano_castello
{ answer_correct:
    # speaker: enemy
    「資料には、客や大使を迎えた部屋とある。飾りの下には、訪ねてくる人がいたわけだ」
- else:
    # speaker: enemy
    「資料では、客や大使を迎えるための部屋だった。絵の題材だけじゃ、何の場所かわからなかったな」
}
{
- battle_score == 3:
    # speaker: enemy
    「これなら、あの子が空欄を見つけても困らない」
    # speaker: heroine
    # emotion: teasing
    「靴は？」
    # speaker: enemy
    「そこは……本人に直してもらう」
- battle_score == 2:
    # speaker: enemy
    「一か所は僕も書き損ねた。空欄のまま渡して、あの子と調べ直すよ」
    # speaker: heroine
    # emotion: smile
    「今度は靴以外で笑ってもらえそう」
- else:
    # speaker: enemy
    「案内を作った僕が、いちばん勘違いしてたかもしれない」
    # speaker: heroine
    # emotion: worried
    「私もです。でも、わからなかったところを残せたら、次に一緒に調べられる」
}
# speaker: narrator
ルカは束を二つ折りにして、今度は飛ばないよう鞄へしまった。
# speaker: enemy
「ありがとう。あの子に枝の絵も見せるよ。靴の絵は……見せない」
# speaker: heroine
# emotion: happy
「それは残念。ちょっと見たかったです」
-> END
