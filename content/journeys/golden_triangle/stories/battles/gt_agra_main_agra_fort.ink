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
# background: gt_bg_agra_agra_fort
# speaker: enemy
「そして、ここの赤と白が重要なんだ。父さん、聞いてる？」
# speaker: narrator
アーグラ城で、赤い壁を指していた青年が振り返る。その目の前にいるのは、父親ではなく二人の旅行者だった。
# speaker: heroine
# reaction: heroine,surprised,interrobang
「あの。わたしたち、途中から聞いてました」
# speaker: enemy
# reaction: enemy,sweat
「途中から？　父は、どこからいない？」
# speaker: narrator
少し離れた案内板の前で、年配の男性が手を振る。青年は額を押さえ、それから自分も手を振り返した。
# speaker: enemy
「ぼくはアディ。建築を勉強してる。家族に説明する機会だったんだけど、話してるうちに家族が変わった」
# speaker: heroine
# reaction: heroine,teasing,music
「変わってはいません。置いていかれたんです」
# speaker: enemy
「父は、一度読み始めると全部読むんだ。ぼくの話も全部聞くはずだったのに」
# speaker: narrator
彼は唇を尖らせる。{heroine_name}は赤い壁の奥に見える白い建物を指した。
# speaker: heroine
「赤と白の続きは気になります。どうして同じ城に、こんなに違う色があるんですか？」
# speaker: enemy
# reaction: enemy,sparkle
「そこから一時間は話せる」
# speaker: heroine
# reaction: heroine,exasperated,sweat
「まず短い方を、お願いします」
-> END

=== after_first ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「そう、違う皇帝の仕事が重なっている。赤い再建、後から加わった白い宮殿。塗り分けではないんだ」
- else:
# speaker: enemy
「一度に二色を選んだわけじゃない。アクバルの赤砂岩の再建に、後のシャー・ジャハーンの白大理石が加わってる」
}
# speaker: narrator
案内板の前にいる父をちらりと見て、アディは説明を続けた。今度は、二人の顔を確かめながら話す。
# speaker: enemy
「城壁から考えると合理的でね、まず防御が――」
# speaker: heroine
# emotion: serious
「でも、壁の中で暮らす人は？　わたしは、毎日の用事の方が気になります」
# speaker: enemy
「いや、防御は毎日の用事を守るためでもあるよ」
# speaker: narrator
彼女は言い返しかけ、案内図を開き直した。城の中の建物を、どちらの話も省かずに見てみる。
-> END

=== after_second ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: heroine
「宮殿に、謁見の間。守るだけでも、暮らすだけでもないね」
- else:
# speaker: heroine
# reaction: heroine,worried,sweat
「宮殿は見てたのに、政治をする場所もあるって抜けてた。わたしも自分の話だけしてたね」
}
# speaker: enemy
「ここで人に会って、決め事をして、家にも帰る。ぼくの家だと、食卓に全部集まるけど」
# speaker: heroine
# reaction: heroine,smile,music
「家族会議、長そうですね」
# speaker: enemy
「父が全員の話を最後まで聞くから。案内板にも同じことをしてる。あれとは競えないな」
# speaker: narrator
アディは案内板への対抗心を口にしかけ、やめた。川沿いの先へ視線を移す。
# speaker: enemy
「住む場所が、出られない場所にもなった。シャー・ジャハーンの晩年に関わる眺めも、ここにはあるんだ」
-> END

=== conclusion ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「ムサンマン・ブルジュから望めるタージ・マハル。自分が造営した墓廟を、別の場所から見る位置になる」
- else:
# speaker: enemy
「ムサンマン・ブルジュからはタージ・マハルが見える。シャー・ジャハーンが晩年を過ごした場所との関係だよ」
}
# speaker: heroine
# emotion: serious
「見えていた、までなんだね。何を考えていたかは、わたしには言えない」
{ battle_score == 3:
# speaker: enemy
「よく拾ったね。ぼくは説明を短くする方に、まだ課題がある」
- else:
# speaker: enemy
「迷った所は資料を見直せる。ぼくの説明も、気になる所だけ聞けばよかったんだね」
}
# speaker: narrator
アディの父が姿を見せた。息子を見つけると案内図を高く掲げ、案内板を読み終えたから今度は息子の話を聞こう、と言う。
# speaker: enemy
# reaction: enemy,sweat
「もう読んできたの？　……じゃあ、ぼくの出番は？」
# speaker: narrator
父が水のボトルを指した。アディの鞄に入っている家族の分だ。
# speaker: heroine
# reaction: heroine,teasing,music
「まずは、そっちの出番みたい」
# speaker: enemy
「重要な役だよ。城にも、家族にも。……防御の話は、また今度ね」
# speaker: narrator
青年は最後まで防御の話を諦めなかった。彼女は笑って手を振り、赤い壁の内側へ視線を戻した。
-> END
