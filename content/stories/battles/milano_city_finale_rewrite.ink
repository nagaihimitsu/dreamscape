// 都市フィナーレ。五つの検証問題と進行は TypeScript が担当する。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "after_3": -> after_third }
{ battle_scene == "after_4": -> after_fourth }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: milano_darsena_finale
# speaker: narrator
ナヴィリオ地区のダルセナ。ジェンマが孫と、水面をのぞき込んでいた。
# speaker: heroine
# emotion: surprised
「わ、お二人も水辺を見に来たんですね」
# speaker: narrator
ジェンマ「ええ。この子に、今日見た絵の話をしていたの」
ベンチには刷りたての観光案内が積まれていた。男性が、二人に一枚を差し出す。
# speaker: enemy
「駅まで戻るなら僕の案内で。水辺は遠回りだし、見るものもない。次の場所だけ見て行けばいい」
# speaker: narrator
子どもは水面を振り返ったが、ジェンマは男性の紙を受け取ろうとした。
# speaker: heroine
# emotion: serious
「待って。寄り道したいなら、今ならまだ選べますよ」
# speaker: narrator
{heroine_name}は自分の地図を広げた。二人は立ち止まり、男性は紙を引っ込める。
# speaker: enemy
「僕はトンマーゾ。案内を売るのが仕事だ。短い時間の旅行者に選択肢を増やせば、乗り遅れたとき誰が困る？」
# speaker: heroine
# emotion: serious
「時間が大事なのはわかります。でも、ここを見たい人に『何もない』と決めるのは違うと思う」
# speaker: narrator
二人は地図と案内を交互に見た。駅へ向かうか、水辺を歩くか、まだ決めていない。
# speaker: enemy
「じゃあ、君たちの地図で選べるようにしてみなよ。ただし間違いは困る。僕の案内を配る前に、五つの記述を一行ずつ確かめよう」
# speaker: heroine
# emotion: smile
「できます。……一人じゃ心細いので、{player_address}もお願いします」
「どちらを選ぶかは、お二人に決めてもらいましょう」
-> END

=== after_first ===
# background: milano_darsena_finale
{ answer_correct:
    # speaker: enemy
    「大聖堂はカンドーリアの大理石、ガッレリアの屋根は鉄とガラス。そこは正確に書こう」
    # speaker: heroine
    # emotion: smile
    「同じ空の下なのに、光り方が違いましたね」
- else:
    # speaker: enemy
    「大聖堂にはカンドーリアの大理石。ガッレリアの屋根は鉄とガラスだ。ここは直しておく」
    # speaker: heroine
    # emotion: worried
    「似たように覚えてました。見上げた景色と、もう一度つなぎます」
}
# speaker: narrator
孫が水辺の印に指を置き、ジェンマは案内の出発時刻を見る。二人の指は違う場所に止まった。
# speaker: heroine
# emotion: neutral
「両方は難しいかもしれない。どっちに行きたいか、二人で話してみてください」
# speaker: narrator
トンマーゾが赤い鉛筆を渡す。{heroine_name}は地図の端を押さえて受け取った。
# speaker: enemy
「次は道。石を運んだ道と、人が歩く通路を取り違えないようにな」
-> END

=== after_second ===
# background: milano_darsena_finale
{ answer_correct:
    # speaker: heroine
    # emotion: surprised
    「石は水路で、人はガッレリアの通路で。運ぶものも、つなぐ先も違うんだ」
    # speaker: enemy
    「そう。ここの水面を見て、大聖堂の石を思い出す人もいるだろうな」
- else:
    # speaker: enemy
    「石は水路を使って運ばれた。ガッレリアの通路が結ぶのはドゥオモ広場とスカラ広場だ」
    # speaker: heroine
    # emotion: neutral
    「同じ『道』でも、一緒にしちゃいけないんですね」
}
# speaker: narrator
風が地図をベンチからさらった。{heroine_name}は追いかけ、水際へ届く前に靴で端を押さえる。
# speaker: heroine
# emotion: surprised
「あっ、靴あと……！　でも飛んでいくよりはいいよね」
# speaker: narrator
彼女は戻ると、地図の汚れた角を隠さず二人に見せた。トンマーゾは案内の束を鞄にしまい、自分のペンを重しにした。
# speaker: enemy
「水に入って追いかけるつもりなら止めたよ。濡れた地図じゃ駅もわからない」
# speaker: heroine
# emotion: smile
「そこは同意です。ペン、借りますね」
-> END

=== after_third ===
# background: milano_darsena_finale
{ answer_correct:
    # speaker: enemy
    「食堂の絵も、城の木陰も、実際の部屋で感じる空間を広げる。物理的に壁を広げたわけじゃない」
    # speaker: heroine
    # emotion: happy
    「絵の中へ行けないのに、向こうから部屋に来るみたい」
- else:
    # speaker: enemy
    「壁を壊さなくても、絵で空間の感じ方は変わる。食堂の奥行きも、城の木陰もそう読める」
    # speaker: heroine
    # emotion: smile
    「城の資料を見たとき、つい天井を探しました」
}
# speaker: narrator
{heroine_name}が一行を書き、トンマーゾが文字数を数える。
# speaker: enemy
「一行半だ」
# speaker: heroine
# emotion: teasing
「字を小さくすれば一行です」
# speaker: enemy
「それは案内じゃなくて視力検査」
-> END

=== after_fourth ===
# background: milano_darsena_finale
{ answer_correct:
    # speaker: enemy
    「像の原作は屋内に移し、壁画は周りの空気を管理する。それぞれに合う守り方がある」
- else:
    # speaker: enemy
    「像の原作は屋内へ。壁画は塗り直し続けるのではなく、周囲の環境も管理する。処置を一つにまとめちゃいけない」
}
# speaker: narrator
ジェンマは孫と、駅に戻る時間を確かめてから、水辺を少し歩いて向かうと話している。
# speaker: enemy
「僕の案内なら、迷う時間はなかった」
「選べることが、いつも親切とは限らない。決めるのが苦手な人もいる」
# speaker: heroine
# emotion: serious
「そうですね。私も、誰かに決めてほしい日はあります」
「でも今、あの子は水を見たいって顔をしてた。聞かないまま帰すのは嫌でした」
-> END

=== conclusion ===
# background: milano_darsena_finale
{ answer_correct:
    # speaker: heroine
    # emotion: smile
    「城には今も博物館があって、ガッレリアにはお店やカフェがある。今日来る人たちの場所でもあるんですね」
- else:
    # speaker: enemy
    「城は今、博物館などの場所。ガッレリアには店やカフェがあって、人が通り抜ける」
    # speaker: heroine
    # emotion: neutral
    「残った建物と、今の使い方。両方書きます」
}
{
- battle_score == 5:
    # speaker: enemy
    「五つとも確かめられた。地図は渡していい。僕の案内が売れなかったのは残念だけどね」
    # speaker: heroine
    # emotion: teasing
    「靴あとまで渡すことになりますね」
    # speaker: enemy
    「うちの案内なら不良品だ。まあ、これは君の地図だし」
- battle_score >= 3:
    # speaker: enemy
    「間違えた行も直せた。その地図なら、二人に渡していい」
    # speaker: heroine
    # emotion: smile
    「さっきよりは、読める字で書けました」
    # speaker: enemy
    「靴あとの上は、ちょっと難しいけどね」
- else:
    # speaker: enemy
    「まだ確かめ直す行が多い。僕なら、そのまま案内としては渡さない」
    # speaker: heroine
    # emotion: serious
    「わかりました。わからなかったまま載せるのは、私も嫌です」
    # speaker: narrator
    彼女は赤い鉛筆で印をつけ、手帳を閉じなかった。
    # speaker: enemy
    「駅までの道なら僕の案内を使ってくれ。水辺で何を見るかは、二人で決めればいい」
}
# speaker: narrator
ジェンマと孫は駅への道を確かめてから、水面のほうへ歩き出した。トンマーゾは案内を鞄に戻す。
# speaker: enemy
「僕はまだ、迷わず着ける案内が一番だと思っている。売れない日が続いたら、考え直すかもしれないけど」
# speaker: narrator
彼は二人の背中を見送り、それから駅の方向へ歩いていった。
# speaker: heroine
# emotion: smile
「あの人の言うことも、間違いじゃないんですよね。私だって、飛行機には乗り遅れたくないし」
「でも今日は、聞いてよかった。……それと、地図を濡らさなくてよかった」
「{player_address}。次は何を残します？　靴あとの場所は、もう決まりです」
-> END
