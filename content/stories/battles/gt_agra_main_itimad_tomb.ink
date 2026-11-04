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
# background: gt_bg_agra_itimad_tomb
# speaker: narrator
イティマード・ウッダウラ廟の装飾を、ノートに写している女性がいる。{heroine_name}が距離を取ってのぞくと、彼女は紙をこちらへ傾けた。
# speaker: enemy
「見てもいいですよ。ただ、実物の方がずっと細かい。私の花、少し太ってしまった」
# speaker: heroine
# emotion: smile
「ふっくらしてる。これはこれで、わたしは好きです」
# speaker: narrator
女性はアミナと名乗る。服の仕立ての仕事をしていて、休みの日には気になった模様を描いているという。
# speaker: enemy
「きれい、とだけ覚えると、家で何も描けなくなるんです。形を見て、作り方も少し調べておく」
# speaker: heroine
「わたし、模様に目が行って、建物を誰が建てたか忘れかけてました」
# speaker: enemy
「では、そこから。私も案内を読みながらなので、確かめ合いましょう」
# speaker: narrator
彼女はノートの余白に、小さな三つの丸を描いた。三つの問いを終えたら、続きを描くつもりらしい。
# speaker: heroine
# emotion: teasing
「その丸、花びらになる予定ですか？」
# speaker: enemy
「それは結果次第。今のところ、ただの休憩です」
# speaker: narrator
彼女の乾いた返しに、{heroine_name}が笑った。最初の問いは、この廟を建てた人と、そこに葬られた人についてだった。
-> END

=== after_first ===
# background: gt_bg_agra_itimad_tomb
{ answer_correct:
# speaker: enemy
「ヌール・ジャハーンが、父のために建てた。そうです」
- else:
# speaker: enemy
「皇妃ヌール・ジャハーンが、父ギヤース・ベグのために造営した廟なんです」
}
# speaker: heroine
# emotion: neutral
「名前を覚える前に、娘と父って聞いた方が、わたしは気になってくる」
# speaker: narrator
アミナはうなずき、今度は紙の花と壁の装飾を交互に指した。
# speaker: enemy
「私のは鉛筆の線。では、壁の色のある模様は、どうやって作っているのでしょう」
-> END

=== after_second ===
# background: gt_bg_agra_itimad_tomb
{ answer_correct:
# speaker: heroine
# emotion: surprised
「色のところに、別の石をはめ込むんだ。絵を描くのとは、手順から違うね」
- else:
# speaker: heroine
「塗った色だと思ってた。石を組み合わせた象嵌なんだね」
}
# speaker: enemy
「私は布を切るのも迷うのに。こういう曲線を見ると、しばらく帰れなくなる」
# speaker: narrator
彼女はノートを持ち直す。{heroine_name}も、さっき通り過ぎた細い線をもう一度見た。
# speaker: enemy
「最後は格子。あの細かな網目は、ただ壁を飾っているだけでしょうか。部屋の中へ目を向けてみて」
-> END

=== conclusion ===
# background: gt_bg_agra_itimad_tomb
{ answer_correct:
# speaker: enemy
「そう。透かし彫りの隙間を、光が通るんです。模様を見ていたら、部屋の明るさにも気が付きますね」
- else:
# speaker: enemy
「石を透かして彫った隙間から、光が入るんです。壁を飾るだけでなく、部屋の中にも関わっています」
}
# speaker: heroine
# emotion: surprised
「模様の向こうにも、見るところがあったんだ。わたし、壁の表ばかり見てた」
{ battle_score == 3:
# speaker: enemy
「三つとも確認できました。じゃあ、この丸は花にしましょう」
- else:
# speaker: enemy
「知らなかったところも、これでノートに残せます。丸は三つとも、花にします」
}
# speaker: narrator
アミナは丸の周りに花びらを描く。一枚だけ太くなった花びらを、今度は消さなかった。
# speaker: heroine
# emotion: happy
「さっきの花の仲間が増えた。これ、お仕事の服にも使うんですか？」
# speaker: enemy
「今日は自分の服用。お客さんの希望を聞くのも好きだけど、自分の分は自分で決めたい」
# speaker: narrator
彼女は紙を戻し、続きを描き始めた。二人が別れを告げると、鉛筆を持つ方とは逆の手で、小さく手を振る。
# speaker: heroine
# emotion: smile
「わたしも、もう少し見たい。さっきより、見るところが細かくなっちゃった」
-> END
