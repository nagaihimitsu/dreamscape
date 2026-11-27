INCLUDE modules.ink
-> DONE

// ファテープル・シークリーの場所のファイル（2026-11-10 に新しい書き方へ形を移した）。
// バトル（対決）は、このファイルの最後の knot。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== gt_agra_fatehpur_sikri_guide ===
# scene: guide
# background: gt_bg_agra_fatehpur_sikri
# weather: dust
# speaker: narrator
# photo: gt_album_a049 # photo_caption: 尾根の上に、町が丸ごと
アーグラから車で一時間ほど。畑の中の道の先、尾根の上に、赤い石の町が丸ごと載っていた。
# speaker: heroine
# reaction: heroine,surprised,interrobang
# voice: gt_agra_fatehpur_sikri_guide_001
町が、まるごと？　お城じゃなくて、町なの？
# speaker: narrator
# photo: gt_album_a050 # photo_caption: 暮らしの音だけが抜けた町
宮殿、広場、柱廊。どこまでも赤い砂岩。けれど、洗濯物も、呼び込みの声もない。人の暮らしの音だけが、すっぽり抜けている。
# speaker: heroine
# emotion: neutral
# voice: gt_agra_fatehpur_sikri_guide_002
きれいなのに、ちょっと不思議。お店も家もあるのに、誰も住んでないみたい
# speaker: narrator
# term: gt_term_buland_darwaza
町の一角に、巨大な門がそびえていた。見上げるほど高いアーチ。その下へ、急な石段が延々と続く。
# speaker: heroine
# reaction: heroine,exasperated,dizzy
# voice: gt_agra_fatehpur_sikri_guide_003
# photo: gt_album_a051 # photo_caption: 門って、登るものだった
この階段を、上るの……？　門って、くぐるものじゃなくて、登るものだったんだ
# speaker: narrator
# term: gt_term_calligraphy_band
途中で三回休み、{heroine_name}はやっとアーチの真下にたどり着いた。見上げると、石の表面に、流れるような文字が帯になって刻まれている。
# speaker: heroine
# voice: gt_agra_fatehpur_sikri_guide_004
何て書いてあるんだろう。……文字が読めなくても、何か大事なことが書いてあるのは分かるね
# speaker: narrator
同じ段に、男の人が一人座っていた。携帯を碑文に向けたまま、肩を震わせている。笑っているのか、泣いているのか。
# speaker: heroine
# reaction: heroine,worried,question
# voice: gt_agra_fatehpur_sikri_guide_005
……あの人、大丈夫かな
-> END

// ───── バトル（本筋）。battles/catalog.json の gt_agra_main_fatehpur_sikri_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
=== gt_agra_main_fatehpur_sikri_battle ===
# scene: battle
# background: gt_bg_agra_fatehpur_sikri
# speaker: narrator
# photo: gt_album_a052 # photo_caption: アーチの真下、文字の帯
# term: gt_term_buland_darwaza
# term: gt_term_calligraphy_band
巨大な門へ続く急な石段を上りきって、{heroine_name}はまだ息を整えていた。見上げるアーチの内側に、流れるような文字が刻まれている。
# speaker: narrator
同じ段に、男が一人座っていた。五十過ぎ。ヘルメットの跡がついた髪。携帯の翻訳アプリを碑文に向けたまま、笑っているのか泣いているのか分からない声を出している。
# speaker: gt_agra_fatehpur_man
# unnamed
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_001
家を、建てるな……だと
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_agra_main_fatehpur_sikri_001
だ、大丈夫ですか？
# speaker: enemy
# cutin: name
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_002
大丈夫に見えますか。ムケーシュ、建設業です。人の家を三十年建ててきて、三年前から、自分の家を建てている
# speaker: narrator
アーグラの郊外。二階建て。貯金と借金で四百万ルピー。今日の午後四時に、屋根のコンクリートを流すミキサー車が来るという。
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_003
この町の聖者の墓に、しるしをくださいと頼みに来たんです。そしたら門に、これだ。世界は橋だ、家を建てるな。……しるし、来ちゃったでしょう
# speaker: narrator
ムケーシュは携帯を突き出した。現場監督の番号が表示されている。
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_004
止めるべきですか、ミキサー車。あなたが決めてください。外国の人は、しがらみがない。正しいことが言える
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_agra_main_fatehpur_sikri_002
# photo: gt_album_a053 # photo_caption: 碑文に携帯を向ける男 # photo_with: gt_agra_fatehpur_man
えっ、わたしが？　む、無理です。それは、ムケーシュさんが決めることです
# speaker: enemy
# reaction: enemy,anger
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_005
冷たいな。人生相談に来た男に
# speaker: heroine
# emotion: worried
# voice: gt_agra_main_fatehpur_sikri_003
人生相談、されてたんですね……。でも、家のことは、やっぱり
# speaker: narrator
ムケーシュは鼻を鳴らし、もう一度アーチを見上げた。翻訳の続きを、指で追う。
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_006
だいたい、誰が言ったんだ、こんなこと。皇帝か？　自分は町ごと建てたくせに
-> quiz(1) ->
# background: gt_bg_agra_fatehpur_sikri
{ quiz_correct:
    # speaker: enemy
    # em: イエス
    # voice: gt_agra_main_fatehpur_sikri_battle_mukesh_007
    イエス……？　キリストの？　イスラームの皇帝の門に？
    # speaker: heroine
    # voice: gt_agra_main_fatehpur_sikri_004
    はい。マリアの子イエスの言葉、って書いてあるそうです
- else:
    # speaker: enemy
    # em: イエス
    # voice: gt_agra_main_fatehpur_sikri_battle_mukesh_008
    ……待て。翻訳の続きに出てる。『マリアの子イエスは言った』。キリストの言葉だ。イスラームの皇帝の門に？
}
# speaker: narrator
ムケーシュは、しばらく口を開けたままだった。それから、変なところに感心し始めた。
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_009
皇帝ってのは、度量が大きいんだな。よその宗教の言葉を、自分の勝ちを祝う門に刻むなんて。……うちの施主なら、絶対に許さない
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_agra_main_fatehpur_sikri_005
施主さん、厳しいんですね
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_010
# photo: gt_album_a054 # photo_caption: 「施主は自分です」 # photo_with: gt_agra_fatehpur_man
施主は自分です。だから一番厳しい
# speaker: narrator
彼は石段の上の、赤い石の町並みを見渡した。宮殿、広場、柱廊。人の住まない町が、どこまでも続いている。
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_011
でも、変じゃないですか。家を建てるなと刻んだ皇帝が、そもそも、なんでこんな所に町を一つ建てたんです
-> quiz(2) ->
# background: gt_bg_agra_fatehpur_sikri
{ quiz_correct:
    # speaker: enemy
    # voice: gt_agra_main_fatehpur_sikri_battle_mukesh_012
    跡継ぎが欲しくて、聖者に会いに来た。それで息子が生まれて、町を建てた。……息子のために、町を一つ
- else:
    # speaker: enemy
    # voice: gt_agra_main_fatehpur_sikri_battle_mukesh_013
    跡継ぎ、か。聖者に会いに来て、息子が生まれて、それで町を建てた。……息子のために、町を一つ
}
# speaker: narrator
# term: gt_term_salim_chishti
ムケーシュの声の調子が変わった。携帯を膝に置き、画面を伏せる。
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_014
# term: gt_term_kite
わたしの家もね、息子のためなんです。二階は全部、息子夫婦の部屋。孫ができたら、屋上で凧を揚げる
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_015
# photo: gt_album_a055 # photo_caption: 伏せた携帯、誰も住まない二階 # photo_with: gt_agra_fatehpur_man
先週、息子が言いました。ベンガルールで仕事が決まった。向こうで暮らすって。……誰も住まない二階に、今日、屋根を流すんです
# speaker: narrator
{heroine_name}は何も言えなかった。慰める言葉なら、いくらでも浮かぶ。どれも、この人の四百万ルピーには軽すぎた。
# speaker: heroine
# emotion: serious
# voice: gt_agra_main_fatehpur_sikri_006
……ごめんなさい。気の利いたことが、言えません
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_016
いいんです。言われたら、たぶん怒ってた
# speaker: narrator
ムケーシュは鼻をすすり、町並みを顎で示した。
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_017
で、皇帝は、息子のために建てたこの町に、何年住んだんです
-> quiz(3) ->
# background: gt_bg_agra_fatehpur_sikri
{ quiz_correct:
    # speaker: enemy
    # voice: gt_agra_main_fatehpur_sikri_battle_mukesh_018
    十五年……。皇帝でさえ、出ていったのか
- else:
    # speaker: enemy
    # voice: gt_agra_main_fatehpur_sikri_battle_mukesh_019
    十五年ほど。……皇帝でさえ、出ていったのか
}
# speaker: heroine
# voice: gt_agra_main_fatehpur_sikri_007
でも、町は残ってます。四百年以上たっても、こうやって人が来て、上まで石段を上って
# speaker: heroine
# voice: gt_agra_main_fatehpur_sikri_battle_001
この門、家を建てるなとは書いてあるけど、橋を渡るな、とは書いてないです
# speaker: heroine
# voice: gt_agra_main_fatehpur_sikri_battle_002
……ムケーシュさんの家も、誰かが渡ってくる橋みたいなものじゃないかなって
# speaker: narrator
# emotion: shy
言ってから、{heroine_name}は赤くなった。
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_agra_main_fatehpur_sikri_009
# photo: gt_album_a056 # photo_caption: 「橋を渡るな、とは書いてないです」 # photo_with: gt_agra_fatehpur_man
い、今のは感想です。決めたわけじゃないです
# speaker: narrator
# pause: 900
ムケーシュは長いあいだ黙っていた。それから携帯を表に返し、現場監督の番号を押した。
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_020
# photo: gt_album_a057 # photo_caption: 「四時、予定どおり屋根を流せ」 # photo_with: gt_agra_fatehpur_man
わたしだ。四時、予定どおり屋根を流せ。……それと、図面の変更だ。二階の奥に一部屋、わたしの部屋を作る。本を読む部屋だ。息子が帰ってきたら、そこで一緒に茶を飲む
# speaker: narrator
電話を切ると、彼は立ち上がり、ズボンの埃を払った。
{
- battle_score == 3:
    # speaker: enemy
    # voice: gt_agra_main_fatehpur_sikri_battle_mukesh_021
    あなたは全部、正しく読んだ。それなのに、わたしの代わりには決めなかった。……そういう人に、家の鍵を預けたい
- battle_score == 2:
    # speaker: enemy
    # voice: gt_agra_main_fatehpur_sikri_battle_mukesh_022
    二つ正解。一つは、この門と同じで、わたしにも読めなかった。おあいこです
- else:
    # speaker: enemy
    # voice: gt_agra_main_fatehpur_sikri_battle_mukesh_023
    あなたもわたしも、碑文は読めなかった。でも、決めることだけは、自分でできた
}
# speaker: enemy
# voice: gt_agra_main_fatehpur_sikri_battle_mukesh_024
あなた、最後まで決めてくれませんでしたね。……ありがとう。人に決めてもらった家には、住めないところでした
# speaker: narrator
# leave: enemy
# photo: gt_album_a058 # photo_caption: 現場の方角へ下りていく背中 # photo_with: gt_agra_fatehpur_man
彼は石段を、一段ずつ下りていった。現場の方角へ。四時まで、まだ少し時間がある。
# speaker: heroine
# emotion: smile
# voice: gt_agra_main_fatehpur_sikri_010
……わたし、何もしてないのに、お礼を言われちゃった
-> END
