INCLUDE modules.ink
# background: gt_bg_agra_fatehpur_sikri
# speaker: narrator
巨大な門へ続く急な石段の途中で、{heroine_name}は息を整えていた。見上げるアーチの内側に、流れるような文字が刻まれている。
# speaker: narrator
同じ段に、男が一人座っていた。五十過ぎ。ヘルメットの跡がついた髪。携帯の翻訳アプリを碑文に向けたまま、笑っているのか泣いているのか分からない声を出している。
# speaker: enemy
家を、建てるな……だと
# speaker: heroine
# reaction: heroine,surprised,question
だ、大丈夫ですか？
# speaker: enemy
大丈夫に見えますか。ムケーシュ、建設業です。人の家を三十年建ててきて、三年前から、自分の家を建てている
# speaker: narrator
アーグラの郊外。二階建て。貯金と借金で四百万ルピー。今日の午後四時に、屋根のコンクリートを流すミキサー車が来るという。
# speaker: enemy
聖者の墓に、しるしをくださいと頼みに来たんです。そしたら門に、これだ。世界は橋だ、家を建てるな。……しるし、来ちゃったでしょう
# speaker: narrator
ムケーシュは携帯を突き出した。現場監督の番号が表示されている。
# speaker: enemy
止めるべきですか、ミキサー車。あなたが決めてください。外国の人は、しがらみがない。正しいことが言える
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
えっ、わたしが？　む、無理です。それは、ムケーシュさんが決めることです
# speaker: enemy
# reaction: enemy,anger
冷たいな。人生相談に来た男に
# speaker: heroine
# emotion: worried
人生相談、されてたんですね……。でも、家のことは、やっぱり
# speaker: narrator
ムケーシュは鼻を鳴らし、もう一度アーチを見上げた。翻訳の続きを、指で追う。
# speaker: enemy
だいたい、誰が言ったんだ、こんなこと。皇帝か？　自分は町ごと建てたくせに
-> quiz(1) ->
# background: gt_bg_agra_fatehpur_sikri
{ quiz_correct:
    # speaker: enemy
    イエス……？　キリストの？　イスラームの皇帝の門に？
    # speaker: heroine
    はい。マリアの子イエスの言葉、って書いてあるそうです
- else:
    # speaker: enemy
    ……待て。翻訳の続きに出てる。『マリアの子イエスは言った』。キリストの言葉だ。イスラームの皇帝の門に？
}
# speaker: narrator
ムケーシュは、しばらく口を開けたままだった。それから、変なところに感心し始めた。
# speaker: enemy
皇帝ってのは、度量が大きいんだな。よその宗教の言葉を、自分の勝ちを祝う門に刻むなんて。……うちの施主なら、絶対に許さない
# speaker: heroine
# reaction: heroine,teasing,music
施主さん、厳しいんですね
# speaker: enemy
施主は自分です。だから一番厳しい
# speaker: narrator
彼は石段の上の、赤い石の町並みを見渡した。宮殿、広場、柱廊。人の住まない町が、どこまでも続いている。
# speaker: enemy
でも、変じゃないですか。家を建てるなと刻んだ皇帝が、そもそも、なんでこんな所に町を一つ建てたんです
-> quiz(2) ->
# background: gt_bg_agra_fatehpur_sikri
{ quiz_correct:
    # speaker: enemy
    跡継ぎが欲しくて、聖者に会いに来た。それで息子が生まれて、町を建てた。……息子のために、町を一つ
- else:
    # speaker: enemy
    跡継ぎ、か。聖者に会いに来て、息子が生まれて、それで町を建てた。……息子のために、町を一つ
}
# speaker: narrator
ムケーシュの声の調子が変わった。携帯を膝に置き、画面を伏せる。
# speaker: enemy
わたしの家もね、息子のためなんです。二階は全部、息子夫婦の部屋。孫ができたら、屋上で凧を揚げる
# speaker: enemy
先週、息子が言いました。ベンガルールで仕事が決まった。向こうで暮らすって。……誰も住まない二階に、今日、屋根を流すんです
# speaker: narrator
{heroine_name}は何も言えなかった。慰める言葉なら、いくらでも浮かぶ。どれも、この人の四百万ルピーには軽すぎた。
# speaker: heroine
# emotion: serious
……ごめんなさい。気の利いたことが、言えません
# speaker: enemy
いいんです。言われたら、たぶん怒ってた
# speaker: narrator
ムケーシュは鼻をすすり、町並みを顎で示した。
# speaker: enemy
で、皇帝は、息子のために建てたこの町に、何年住んだんです
-> quiz(3) ->
# background: gt_bg_agra_fatehpur_sikri
{ quiz_correct:
    # speaker: enemy
    十五年……。皇帝でさえ、出ていったのか
- else:
    # speaker: enemy
    十五年ほど。……皇帝でさえ、出ていったのか
}
# speaker: heroine
でも、町は残ってます。四百年以上たっても、こうやって人が来て、上まで石段を上って
# speaker: heroine
この門、家を建てるなとは書いてあるけど、橋を渡るな、とは書いてないです。……ムケーシュさんの家も、誰かが渡ってくる橋みたいなものじゃないかなって
# speaker: narrator
言ってから、{heroine_name}は赤くなった。決めないと言ったのに、口を出してしまった。
# speaker: heroine
# reaction: heroine,exasperated,sweat
い、今のは感想です。決めたわけじゃないです
# speaker: narrator
ムケーシュは長いあいだ黙っていた。それから携帯を表に返し、現場監督の番号を押した。
# speaker: enemy
わたしだ。四時、予定どおり屋根を流せ。……それと、図面の変更だ。二階の奥に一部屋、わたしの部屋を作る。本を読む部屋だ。息子が帰ってきたら、そこで一緒に茶を飲む
# speaker: narrator
電話を切ると、彼は立ち上がり、ズボンの埃を払った。
{
- battle_score == 3:
    # speaker: enemy
    あなたは全部、正しく読んだ。それなのに、わたしの代わりには決めなかった。……そういう人に、家の鍵を預けたい
- battle_score == 2:
    # speaker: enemy
    二つ正解。一つは、この門と同じで、わたしにも読めなかった。おあいこです
- else:
    # speaker: enemy
    あなたもわたしも、碑文は読めなかった。でも、決めることだけは、自分でできた
}
# speaker: enemy
あなた、最後まで決めてくれませんでしたね。……ありがとう。人に決めてもらった家には、住めないところでした
# speaker: narrator
彼は石段を、一段ずつ下りていった。現場の方角へ。四時まで、まだ少し時間がある。
# speaker: heroine
# emotion: smile
……わたし、何もしてないのに、お礼を言われちゃった
-> END
