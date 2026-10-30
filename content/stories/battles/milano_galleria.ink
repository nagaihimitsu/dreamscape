// Phase 7 / A型。幸運を使わず貯め込む男。採点と報酬はTypeScript側。
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
# background: milano_galleria
# speaker: enemy
「止まって！　今の一歩、運を使った？」
# speaker: narrator
爪先立ちの男が、小瓶のふたを締めた。両方の踵には、小さな袋がかぶせてある。
# speaker: enemy
「ヴィットリオ・タリスマーニ。幸運は貯めてから使う主義だ。これは、まだ一度も使っていない幸運の瓶！」
# speaker: heroine
「……何も見えないのは、減っていない証拠ですか」
# speaker: enemy
「そう！　買い物も休憩も、もっと運が貯まってからだ。まず、床の雄牛を知っているかね。私には幸運製造機に見えるが」
-> END

=== after_first ===
# background: milano_galleria
{ answer_correct:
    # speaker: enemy
    「トリノの紋章……他の街の看板に、私は毎朝お礼を言っていたのか」
    # speaker: heroine
    「挨拶されて、悪い気はしないと思います。雄牛も」
- else:
    # speaker: enemy
    「雄牛はトリノの紋章だ。幸運の製造元を示す商標ではない……私も、そこは読み違えていた」
    # speaker: heroine
    「願掛けの話と、何を表す絵なのかは、別なんですね」
}
# speaker: enemy
「回ると幸運が来るという言い伝えはある。だが、それを確かめる前に、靴下の片方をなくした」
# speaker: heroine
「踵の袋に、なっていませんか」
# speaker: narrator
ヴィットリオは足元を見ないまま、話題を頭上へ逃がした。
# speaker: enemy
「この屋根なら幸運も逃げにくいはず。もっとも、私より先に、建築家が何か工夫したらしいな」
-> END

=== after_second ===
# background: milano_galleria
{ answer_correct:
    # speaker: enemy
    「鉄で支えて、ガラスで光を通す。明るくて雨に濡れにくいのは……設計のおかげか」
    # speaker: heroine
    「お守りを持っていない人にも、同じ屋根ですから」
- else:
    # speaker: enemy
    「鉄とガラスの屋根だ。支えるものと、光を通すものを組み合わせている。お守りの数ではなかった」
    # speaker: heroine
    「見上げると、支えている線まで見えますね」
}
# speaker: narrator
男の片足が、そっと床についた。もう片方は、まだ将来の幸運を待っている。
# speaker: enemy
「それでも、ここは運のいい人が買い物に来る箱だろう。買わない私は、邪魔にならぬよう隅で待つ」
-> END

=== conclusion ===
# background: milano_galleria
{ answer_correct:
    # speaker: enemy
    「広場と広場をつなぐ道に、店やカフェが並ぶ。通る人、会う人、休む人……買わない人まで、街を動かしていたのか」
- else:
    # speaker: enemy
    「ここはドゥオモ広場とスカラ広場をつなぐ屋根付きの道でもある。店の箱の中だけで、終わってはいないのだな」
    # speaker: heroine
    「さっきの人たちも、お店へ入らず、そのまま向こうへ歩いていきましたね」
}
{
- battle_score == 3:
    # speaker: narrator
    ヴィットリオは両足で立ち、小瓶のふたを開けた。何も飛び出さなかった。
    # speaker: enemy
    「私の負けだ。いい日になるまで待っていたら、いい日を過ごす時間がなくなる」
    「コーヒーを飲もう。幸運を使うのではない。今日は、小銭を使う！」
    # speaker: heroine
    「……お財布は、ありますか」
    # speaker: narrator
    男は瓶をポケットへ戻し、反対のポケットを探った。今度はちゃんと、硬貨の音がした。
    # speaker: heroine
    「あの瓶、空のままでもいいんですね。私は、買うか迷っていた葉書をもう一度見てきたいです」
- battle_score == 2:
    # speaker: enemy
    「一つ見落としたな。だが、私も『貯まったら』ばかり言って、何をしたいか忘れていた」
    # speaker: narrator
    ヴィットリオは踵の袋を外した。片方だけ柄の違う靴下だった。
    # speaker: enemy
    「まず座る。それから、飲みたいものを考える。運が追いつくまで待たん」
    # speaker: heroine
    「椅子は、もう来ていますしね」
    # speaker: narrator
    彼が店先へ向かうと、こちらにも座れそうな椅子が見えた。
- else:
    # speaker: enemy
    「勝負には勝った。これで幸運が増え――いや、まだ瓶に入るかどうかも知らないのだった」
    # speaker: narrator
    男は瓶を掲げかけ、やめた。踵が二つとも床につく。
    # speaker: enemy
    「次は座って勝負しよう。幸運のために、ふくらはぎを使いすぎた」
    # speaker: heroine
    「……その疲れは、瓶より確かですね」
    # speaker: narrator
    ヴィットリオは椅子を引き、瓶を倒れない場所に置いた。
    # speaker: heroine
    「私たちも、少し休みませんか。わからなかったところ、座ってから一緒に見たいです」
}
-> END
