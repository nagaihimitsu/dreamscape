VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: gt_bg_agra_hotel_hub
# speaker: narrator
アーグラの宿は、タージ・マハルの南門に近い路地の奥にあった。若い支配人のサミールが自ら彼女の部屋まで案内し、扉を開けた瞬間、{heroine_name}が固まった。
# speaker: narrator
寝台の上に、薔薇の花びらで大きなハート。その真ん中で、タオルで折った白鳥が二羽、くちばしを寄せ合っている。ハネムーン・スペシャルです、とサミールは胸を張った。
# speaker: narrator
隣のこちらの部屋の寝台にも、まったく同じハートと白鳥が待っていた。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
「は、ハネムーン！？　ち、違います、わたしたち、新婚じゃ……！」
# speaker: narrator
皆さん、最初はそうおっしゃいます。三回説明して、三回とも笑顔で流された。去り際に置いていった名刺には、こう添えてあった。叔父はアーグラ一のガイドです。愛の物語なら、叔父に。
{ ending_reached:
    # speaker: heroine
    # reaction: heroine,shy_deep,blush
    「……恋人では、あるけど。新婚では、ない。そこは、大事なところだから」
- else:
    # speaker: heroine
    # reaction: heroine,shy,blush
    「どうしよう。白鳥、すごく仲良さそう。……見ないで、白鳥」
}
# speaker: narrator
彼女は花びらを集め、捨てようとして手を止めた。洗面所のグラスに水を張り、そこへ浮かべる。用意してくれた人がいるんだもんね、と小さく言いながら。
# speaker: heroine
# emotion: worried
「カムラさんに言われたのにな。言いたいことは言いなさいって。……今の、全然言えてなかった」
# speaker: narrator
窓の外、家々の屋根の向こうに、白いドームの先がほんの少しだけのぞいていた。
# speaker: heroine
# reaction: heroine,surprised,sparkle
「あ……見えた。あれ、タージ・マハルの屋根だよね。写真で百回は見たのに、指先がそわそわする。……よし。誤解は、ちゃんと解く。その前に、どこから行こうか」
-> END
