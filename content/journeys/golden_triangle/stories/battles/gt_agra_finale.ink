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
# background: gt_bg_agra_agra_fort
# speaker: enemy
「ニールの『ちょっと見て』に付き合ったんだって？　勇敢ね」
# speaker: narrator
アーグラ城で待ち合わせたサナは、首からカメラを下げていた。ニールから紹介された、写真好きの友人だ。
# speaker: heroine
# reaction: heroine,smile,music
「三分の映像を作ることになりました。勇敢、だったんでしょうか」
# speaker: enemy
「ここまで来たら、もう引き返せない。……というのは冗談。見せたくない所は飛ばしてね」
# speaker: narrator
人の流れを離れ、彼女は映像を開いた。白い墓廟、城の赤と白、花模様。ファテープル・シークリーで歩いた数秒も入っている。
# speaker: enemy
「触っていい？　複製して、並べ方だけ試したい」
# speaker: narrator
{heroine_name}がうなずく。サナは写っている色と形をつなぎ、似た眺めを一つに絞った。画面の場所が変わるたび、目が自然についていく。
# speaker: heroine
# reaction: heroine,surprised,sparkle
「わ、上手。わたしの、景色の前で何度も立ち止まってた」
# speaker: enemy
「見る人は初めてだから。まず迷わせない。歩いて戻る所も切れば、説明を読む時間ができる」
# speaker: narrator
彼女の指が、一度戻ってから広場へ進む映像の上で止まった。
# speaker: heroine
# emotion: worried
「そう、ですよね。そっちの方が……」
# speaker: enemy
「いいなら切る。迷うなら、まだ触らない」
# speaker: narrator
彼女は手を引いた。サナは急かさず、仮に付けた『白い宮殿』という見出しへ目を移す。
# speaker: enemy
「こっちは好みで決められないね。タージを何の建物として紹介するか。まず、この一文から直そう」
-> END

=== after_first ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「妃をしのぶ墓廟。それなら、初めて見る人にも何を映したか伝わる」
- else:
# speaker: enemy
「勝利の宮殿ではなく、ムムターズ・マハルをしのぶ墓廟。見出しは直そう。ここは好みの違いじゃない」
}
# speaker: heroine
# emotion: serious
「『宮殿みたい』と思った自分の感想を、そのまま建物の説明にしてた」
# speaker: narrator
『白い宮殿』を消す。その次の城の場面は、サナの案だと赤から白へ滑らかにつながっていた。
# speaker: heroine
「これはきれいだから残したい。でも、一度に二色を選んで造ったみたいに見えないかな」
# speaker: enemy
「つながりは使える。添える説明まで、同じ時代にしなければいい」
-> END

=== after_second ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「違う皇帝の時代に重ねた仕事。画面では隣でも、造った時は同じではない」
- else:
# speaker: enemy
「一人が一度に仕上げた城じゃない。異なる皇帝の造営を重ねた場所として、説明を入れよう」
}
# speaker: narrator
短い説明を足すと、画面が少し忙しくなった。サナは文字を減らし、読む時間を確かめる。
# speaker: heroine
「もっと、ゆっくり見せるのは？」
# speaker: enemy
「いい案。でも全部にやると、見終わる前に疲れる。私、前に友達へ見せて、途中で誰も見ていないのに気付かなかった」
# speaker: heroine
# reaction: heroine,worried,sweat
「それは……つらいですね」
# speaker: enemy
「ニールに『長かった』とだけ言われた。悔しくて短くしたら、別の友達が最後まで見てくれた。だから、長さにはうるさいの」
# speaker: narrator
次の廟の場面には『ベビー・タージ』と仮の文字がある。サナは順番を変える前に、二つの建物の前後関係を確かめた。
-> END

=== after_third ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: heroine
「イティマード・ウッダウラ廟の方が先。小さな複製として紹介したら、そこも違っちゃうね」
- else:
# speaker: heroine
# reaction: heroine,exasperated,sweat
「愛称の短さに頼りすぎた。先に造られた、別の家族のための廟なんだよね」
}
# speaker: narrator
彼女は愛称だけの文字を消し、名前を確かめ直した。残す場面は、自分が近くで見た花の方を選ぶ。
# speaker: enemy
「全景を抜くんだ？」
# speaker: heroine
「はい。似てるかどうかより、この花を見つけた時の方を。……名前は読める長さにします」
# speaker: narrator
サナは再生して確かめたが、褒めも否定もしなかった。次には、赤い建物から赤い建物へ飛ぶ場面が続く。
# speaker: heroine
# emotion: serious
「ここ、飛ばしたくないです。シークリーを一つの宮殿だと思っていた時と、同じ見え方になってる」
# speaker: enemy
「じゃあ、何を見て考えが変わったのか。説明と、映像の両方で考えよう」
-> END

=== after_fourth ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「行政も、礼拝も、暮らしもある都市。その説明は、建物ひとつ分では収まらないね」
- else:
# speaker: enemy
「一つの宮殿に限られない。政治や礼拝や暮らしの空間を含む都市。説明は、そこまで戻そう」
}
# speaker: heroine
「歩いて、次の広場を探してたんです。一回戻っちゃって。それも見せたい」
# speaker: enemy
「見たよ。あなたが迷ったのは分かる。でも、何も知らない人に同じ数秒を待ってもらう理由は？」
# speaker: narrator
彼女はすぐには答えられなかった。サナも、答えを代わりに作らない。
# speaker: heroine
# emotion: serious
「考えます。でも、消すのは待ってください」
# speaker: narrator
説明用の資料図が、最後に残っていた。主廟内で撮った写真ではない。サナは、タージの記念棺を描いた図と、彼女の説明文を並べる。
# speaker: enemy
「これは実際に撮った映像と混ぜず、説明用の図と分かるように。図の石棺を何と呼ぶかも確かめておこう」
-> END

=== conclusion ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「実際の埋葬室より上にある記念棺。その区別なら、図にも説明が付く」
- else:
# speaker: enemy
「上の記念棺と、下の実際の墓は別。図の説明は直しておこう。分からなかった所が残ったままより、ずっといい」
}
{ battle_score == 5:
# speaker: heroine
# reaction: heroine,happy,sparkle
「説明は全部確かめられた。残す方は、まだ迷ってます」
- else:
# speaker: heroine
# emotion: neutral
「間違えた説明は直せる。残したい理由の方は、まだ、うまく言えないけど」
}
# speaker: narrator
彼女はサナの短い版を最後まで見る。それから、歩く数秒を戻した版を、自分の手で再生した。
# speaker: heroine
# emotion: serious
「わたし、次に何が見えるか分からないのが楽しかったんです。戻った時も、困ってるだけじゃなくて」
# speaker: enemy
「初めて見る人には、ただ道を間違えた人に見えるかもしれない」
# speaker: heroine
「はい。それでも、わたしがここへ来た映像にしたいです。建物の名前だけなら、もっと上手な紹介があります」
# speaker: narrator
サナは腕を組み、もう一度見る。数秒のあと、赤い広場が開けた。
# speaker: enemy
「私は、やっぱり短い方が好き。そこを残すなら、ほかは削って。三分は伸びないから」
# speaker: heroine
# reaction: heroine,smile,sparkle
「そこは、削ります。まず、同じ全景を二つ入れたところから」
# speaker: narrator
彼女は別の場面を一つ外した。惜しくなって戻しかけ、今度は自分で手を止める。
# speaker: enemy
「簡単にはならないよ」
# speaker: heroine
# reaction: heroine,teasing,music
「今、実感してます。サナさん、言うのが一歩遅いです」
# speaker: narrator
サナは初めて声を出して笑った。二つの版は、どちらも消さずに残す。上映に持っていく方へ、彼女は『歩く版』と名前を付けた。
-> END
