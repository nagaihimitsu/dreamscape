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
# speaker: narrator
アーグラ城で待ち合わせた女性は、首から下げたカメラより先に、二人へ手を振った。ニールから紹介された、写真好きのサナだ。
# speaker: enemy
「あなたたちが、三分の映像を作ってる二人？　私はサナ。先に言っておくけど、ニールの『ちょっと見て』は長いから」
# speaker: heroine
# emotion: smile
「それは、少し分かります。わたしたちのも、まだ三分を超えてて」
# speaker: narrator
通り道から離れて、{heroine_name}がスマートフォンを開く。デリーで撮った映像に、アーグラで見た白い廟や赤い城が加わっている。
# speaker: enemy
「見せて。画面には触らないから、自分で送って」
# speaker: narrator
サナは、色と形の似た場面を続けてはどうかと提案した。彼女が指した順番で再生すると、映像は驚くほど滑らかにつながる。
# speaker: heroine
# emotion: surprised
「わ、きれい。こんなにつながるんだ」
# speaker: enemy
「庭を歩くところを短くすれば、あとで説明も入る。何秒残す？」
# speaker: heroine
# emotion: worried
「ええと……短くした方が、見やすいですよね」
# speaker: narrator
彼女は再生位置を戻した。歩いているだけの数秒を、消す直前で止める。
# speaker: enemy
「決めるのは後でもいい。先に、説明の方を確認しよう。写真につける一文で、別の話になってしまうから」
# speaker: narrator
サナは自分の撮った名所の写真を見せる。勝負は五問。映像に合う説明を選び、資料と照らし合わせるという。
# speaker: heroine
# emotion: serious
「お願いします。見やすくするところと、違うことを言ってしまうところは、分けて考えたい」
# speaker: enemy
「いいね。間違えた説明は直せる。最初はタージ・マハル。何のために建てられた場所か、そこから」
-> END

=== after_first ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「そう。シャー・ジャハーンが、妃ムムターズ・マハルをしのんで建てた墓廟」
- else:
# speaker: enemy
「勝利を祝う宮殿ではないね。妃ムムターズ・マハルをしのぶ墓廟、という説明が合う」
}
# speaker: heroine
「形がきれい、だけでつなぐと、何を見てる映像なのか抜けちゃうね」
# speaker: narrator
彼女は自分のメモに一行書き足す。消そうとしていた場面は、まだそのまま残っている。
# speaker: enemy
「次は、今いる城。赤い部分と白い部分を続けたとき、造った人をどう説明する？」
-> END

=== after_second ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「別の時代の皇帝たちの仕事。同じ映像の中にいても、同じ時にできたわけじゃない」
- else:
# speaker: enemy
「一人の皇帝が、すべてを一度に造ったとは言えない。アクバルの赤砂岩、後のシャー・ジャハーンの白大理石だね」
}
# speaker: heroine
# emotion: neutral
「映像だと、わたしが好きな順に並べられる。でも、出来事の順番まで変わるわけじゃないんだ」
# speaker: enemy
「そう。並べるのは自由。何を並べたか、分かるようにしておこう」
# speaker: narrator
サナが次に見せたのは、小さな花の装飾が見える廟の写真だった。
# speaker: enemy
「『ベビー・タージ』と呼ばれるイティマード・ウッダウラ廟。愛称だけで、どちらが先か決めてもいい？」
-> END

=== after_third ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: heroine
# emotion: surprised
「小さい方が、後からまねしたわけじゃない。こっちが先なんだよね」
- else:
# speaker: heroine
「愛称に引っ張られちゃった。イティマード・ウッダウラ廟の方が、タージ・マハルより先に造られてるんだ」
}
# speaker: enemy
「似ていると、分かった気になりやすい。私も整理するとき、見た目だけで並べたくなる」
# speaker: narrator
サナはそう言って、最初に勧めた並びをもう一度見た。自分の案が唯一の答えだとは言わなかった。
# speaker: heroine
# emotion: serious
「サナさん。あとで、さっきの順番のこと、もう少し話したいです」
# speaker: enemy
「もちろん。じゃあ四問目。ファテープル・シークリーを、ひとつの宮殿と紹介していいかな」
-> END

=== after_fourth ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「そう。行政の場所も、住まいも、礼拝の場所もある街。宮殿だけにすると、狭くなるね」
- else:
# speaker: enemy
「宮殿だけではないんだ。行政の建物や住まい、礼拝の場所を含む都市として紹介したい」
}
# speaker: heroine
「歩いてるところも、少し残したいな。建物と建物の間があって、わたしは街だって分かったから」
# speaker: narrator
彼女は、今度は画面から顔を上げて言った。サナが小さくうなずく。
# speaker: enemy
「じゃあ、その話は最後まで取っておいて。五問目はタージの記念棺。ここは写真ではなく資料図で、実際のお墓との関係を確かめよう」
-> END

=== conclusion ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「上の記念棺と、下階の実際の墓。そこを区別できれば、説明は大丈夫」
- else:
# speaker: enemy
「地上の記念棺と、実際の墓は分かれている。説明を入れるなら、そこは直しておこう」
}
{ battle_score == 5:
# speaker: enemy
「五問とも確認できた。さて、残るのは、あなたが何を見せたいかだね」
- else:
# speaker: enemy
「分からなかったところは、資料で確認して直せばいい。残るのは、あなたが何を見せたいか」
}
# speaker: narrator
{heroine_name}は映像を最初まで戻す。つながりのきれいな順番を再生し、途中で止めた。
# speaker: heroine
# emotion: serious
「ありがとう。でも、ここの順番は変えたいです」
「わたし、さっきは上手に見える方を選ぼうとしてました。でも、これだと、すぐ次の建物に着いちゃう」
# speaker: narrator
彼女は歩いている数秒を戻し、その後ろに広場の場面を置いた。こちらに画面を見せ、それから自分でもう一度見る。
# speaker: heroine
「ここで、次はどこだろうって探してた。わたしは、そこも楽しかったんです」
# speaker: enemy
「だったら、その版を見せて」
# speaker: narrator
サナは腕を組んで待った。数秒が過ぎる。彼女は笑顔を作って褒めず、見終わってから一度うなずいた。
# speaker: enemy
「私は短い方が好み。でも、これを残したい理由は分かった。消さなくていいと思う」
# speaker: heroine
# emotion: smile
「よかった。好みは、違うままでいいんですね」
# speaker: enemy
「全部同じだったら、三人分の映像を集める意味がないでしょう。ジャイプールで、続きを見せて」
# speaker: narrator
彼女は、変更した順番で保存した。画面の端に並ぶ小さな場面を、今度は迷わず指で送っていく。
-> END
