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
# background: gt_bg_delhi_humayun_tomb
# speaker: narrator
フマユーン廟の庭で、女性がカメラとノートを交互に見ていた。写真を撮るたび、首をかしげる。
# speaker: heroine
「何か、写らないんですか？」
# speaker: enemy
「うん。祖母に見せる写真なんだけど、『そこにいたら何が分かる？』って聞かれて」
# speaker: narrator
女性はサイラと名乗った。ノートには『赤い』『大きい』『きれい』。その下は、空いている。
# speaker: heroine
# emotion: smile
「わたしも、たぶん最初にその三つを言います」
# speaker: enemy
「祖母はそれも喜んでくれるんだけどね。もう少し、話の続きがほしくて」
# speaker: narrator
サイラは調べた説明を三つ、折り目に沿って並べる。一方の端をこちらが押さえた。
# speaker: enemy
「よかったら、どの写真にどの説明が合うか、一緒に考えてくれない？　当てっこにした方が覚えられそう」
# speaker: heroine
「やってみたいです。でも写真の感想は、わたしの方が先に言っていいですか。大きい、以外も探します」
# speaker: narrator
彼女は庭を見渡し、細く続く水路の方へ顔を向ける。
# speaker: enemy
「最初は庭のつくり方。水路で分けられた庭に、どんな世界を思い描いたんだろう？」
-> END

=== after_first ===
# background: gt_bg_delhi_humayun_tomb
{ answer_correct:
    # speaker: enemy
    「楽園の川。庭の区切り方にも、ここで眠る人への願いがあるんだね」
- else:
    # speaker: enemy
    「この庭の水路は、楽園の川を表す構成と結び付けて説明される。歩くためだけの区切りじゃないんだ」
}
# speaker: heroine
「さっきは、まっすぐな道だなって。立つ場所は同じなのに、見るところが増えた」
# speaker: narrator
サイラは建物だけの写真をやめ、庭の道が手前から続く構図に変えた。
# speaker: enemy
「これなら、祖母にも入口から歩いてもらえるかな」
# speaker: narrator
次の写真には廟が大きく写っている。ノートには、皇帝一人の名が書かれていた。
# speaker: enemy
「ところが、この名前だけで紹介すると、ここに眠る人をだいぶ見落とす。どんな場所なんでしょう？」
-> END

=== after_second ===
# background: gt_bg_delhi_humayun_tomb
{ answer_correct:
    # speaker: enemy
    「そう。ここには多くのムガル皇族の墓がある。一人だけの場所として見ちゃいけなかった」
- else:
    # speaker: enemy
    「庭園墓群には、フマユーンだけでなく多くのムガル皇族の墓があるんだって」
}
# speaker: narrator
サイラはノートの名前を消さず、下に説明を足した。{heroine_name}は建物の方へ目を戻す。
# speaker: heroine
「全部の名前を今日覚えるのは難しいけど、一人じゃないって知ってから見たいね」
# speaker: enemy
「祖母、うちの集合写真でも、画面の端の人から探すんだ。きっと、そこを聞く」
# speaker: narrator
最後の紙を広げると、デリーの外にある建物の名前が出てきた。
# speaker: enemy
「この場所で生まれた形は、ここだけで終わらなかった。後にどんな建物へつながっていく？」
-> END

=== conclusion ===
# background: gt_bg_delhi_humayun_tomb
{ answer_correct:
    # speaker: enemy
    「タージ・マハル。あちらへ行く人にも、この庭が気になってほしいな」
- else:
    # speaker: enemy
    「後のタージ・マハルにも影響したとされる庭園墓なんだ。こちらを先に見たら、比べる楽しみがあるね」
}
# speaker: heroine
# emotion: happy
「わたしたち、アーグラにも行く予定です。楽しみが一つ増えました」
{
- battle_score == 3:
    # speaker: enemy
    「全問正解のお二人から、最後に写真の感想を一つ。さっきの約束、覚えてるよ」
- battle_score == 2:
    # speaker: enemy
    「二つ正解。じゃあ、点数のつかない感想も聞かせて。さっき、言いたそうにしてた」
- else:
    # speaker: enemy
    「私も読み返せてよかった。さて、説明を閉じたら、どう見える？」
}
# speaker: narrator
{heroine_name}は少し考え、入口の方を振り向いた。来た道に、別の人たちが小さく見える。
# speaker: heroine
「近づく途中で、何度も立ち止まりたくなりました。大きいから、だけじゃなくて」
# speaker: enemy
「それ、祖母に話していい？　写真と一緒に」
# speaker: heroine
# emotion: smile
「はい。でも『大きい』も残してください。それは、ほんとうだったので」
# speaker: narrator
サイラは笑って、最初の三つの言葉を丸で囲む。ノートの空欄はもう、無理に埋めなくてもよさそうだった。
-> END
