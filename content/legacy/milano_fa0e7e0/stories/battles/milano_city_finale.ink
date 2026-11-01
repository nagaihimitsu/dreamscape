// Phase 7 / ミラノ都市フィナーレ。5問の採点と都市クリアはTypeScript側。
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
# background: milano_finale
# speaker: narrator
四つの場所を巡った帰り道。広場の小さな台に、燕尾服の男が立っていた。指揮棒には、音が出ないよう布が巻いてある。
# speaker: enemy
「拍手はまだだ。完璧な街は、物音ひとつ立てない」
「マエストロ・ゼーロ。ミラノを最後の一拍で完成させる指揮者だ。以後、変更も失敗も不要！」
# speaker: narrator
足元のメトロノームは、振り子を紐で結ばれていた。
# speaker: heroine
「……息は、どこで吸いますか」
# speaker: enemy
「曲が終わってからだ。まず街の材料を揃える。違う音色は、全部欠陥だからな！」
-> END

=== after_first ===
# background: milano_finale
{ answer_correct:
    # speaker: enemy
    「ドゥオモは大理石。ガッレリアの屋根は鉄とガラス。同じ材質には揃わない、か」
    # speaker: narrator
    ゼーロは一枚の楽譜を裏返した。裏にも同じ音符が書いてあった。
    # speaker: heroine
    「裏返しても、一人分ですね」
- else:
    # speaker: enemy
    「大聖堂の大理石と、屋根の鉄とガラス。見落としたな。……揃えようとしていた私もだが」
    # speaker: narrator
    ゼーロは指揮棒の布を少しほどいた。棒まで同じ材質にする予算は、ないらしい。
}
# speaker: enemy
「音色は違っても、動きは止められる。街に入ったものは、もう移動しなくてよい！」
-> END

=== after_second ===
# background: milano_finale
{ answer_correct:
    # speaker: enemy
    「石は水路で届き、人は広場から広場へ歩く。……私の長い休符は、交通止めだったのか？」
    # speaker: heroine
    「かなり、渋滞しそうです」
- else:
    # speaker: enemy
    「大理石は湖や川、運河を通った。ガッレリアはドゥオモ広場とスカラ広場を結ぶ。動くものは違っても、どちらも通り道だ」
    「よし、運ぶ間だけ動いてよい。……運び終わった人が帰る間も、か」
}
# speaker: narrator
メトロノームの紐が緩み、一度だけ、こつんと鳴った。ゼーロは自分で自分をにらんだ。
# speaker: enemy
「ならば室内だ。壁の内側なら、私の楽譜に収まる！」
-> END

=== after_third ===
# background: milano_finale
{ answer_correct:
    # speaker: enemy
    「絵の食堂は続いて見える。木々の絵は、部屋を木陰に見せる……ただの背景ではないのだな」
    # speaker: heroine
    「座る場所が同じでも、見える場所は変わるんですね」
- else:
    # speaker: enemy
    「本当の窓や木が増えたのではない。描かれた空間で、部屋の見え方が変わるのだ」
    「じっと座っている客まで、私の想定外の場所へ行ってしまう！」
}
# speaker: narrator
ゼーロは楽譜の余白を押さえた。そこから何かが続いて見えるのを、警戒しているらしい。
# speaker: enemy
「しかし、守り方は統一できる。私の指揮棒と同じ手入れで、全部を永久保存だ！」
-> END

=== after_fourth ===
# background: milano_finale
{ answer_correct:
    # speaker: enemy
    「傷んだ聖ゲオルギウス像は室内へ。壁画は、その場の環境を整える。物によって守り方も違う……」
    # speaker: narrator
    ゼーロは指揮棒の布を外した。中から、もう一本の指揮棒が落ちた。
    # speaker: enemy
    「予備まで包んでいた。道理で、誰も細かい指示に気づかんわけだ」
- else:
    # speaker: enemy
    「像の原作を室内で守る方法と、壁画の周囲の空気を管理する方法。同じ処置で済ませてはいけない」
    # speaker: heroine
    「その布も、何を守るか決めてからでいいと思います」
    # speaker: narrator
    ゼーロは布を膝に置いた。指揮棒が、初めて一本ずつ動いた。
}
# speaker: enemy
「最後だ。古い街が完成したなら、昔の役割のまま動かなくなるはずだ。それでも、今日ここを歩いたというのか？」
-> END

=== conclusion ===
# background: milano_finale
{ answer_correct:
    # speaker: enemy
    「城には今、博物館があり、ガッレリアには店と通り道がある。昔から残る場所が、今の一日にも使われている……」
- else:
    # speaker: enemy
    「城は公共の博物館などを担い、ガッレリアは店のある通り道として使われる。どちらも昔のまま閉じた箱ではない」
}
{
- battle_score == 5:
    # speaker: narrator
    ゼーロは両腕を振り上げた。最後の一拍を止めるはずの指揮棒が、布を空へ跳ね上げた。
    # speaker: enemy
    「私の負けだ！　終止符を打つ場所がない。いや――打つ必要がなかった！」
    # speaker: narrator
    ほどけた紐の先で、メトロノームが鳴り始める。遠くの足音とは、まるで合わない。
    # speaker: enemy
    「合わないな。……よし。今度は私が、聞く番だ」
    # speaker: heroine
    「まず、息を吸っても？」
    # speaker: narrator
    ゼーロは深く息を吸い、それから笑った。今度の拍手は、止めなかった。
- battle_score >= 3:
    # speaker: enemy
    「見落とした音もあったな。だが、私の一音だけでは、四つの場所を説明できなかった」
    # speaker: narrator
    ゼーロは楽譜を裏返し、空いている端に、別の音符を書き込んだ。
    # speaker: enemy
    「次の楽譜は二段だ。足りなければ……もう一段。紙を継ぐのは、作曲に含めておこう」
    # speaker: heroine
    「風に飛ばされそうなら、持ちます」
    # speaker: enemy
    「頼む。指揮者が紙の番までしていると、街を聞き逃す」
- else:
    # speaker: enemy
    「勝負は私の勝ちだ。では、完璧な静寂を――」
    # speaker: narrator
    後ろを通った自転車が、短くベルを鳴らした。ゼーロは台を半歩ずらした。
    # speaker: enemy
    「……街を完成させる前に、道を空ける必要があったか」
    「五つの話は、最後まで聞いた。今日は閉演だ。私も、もう一度この街を聞き直す」
    # speaker: heroine
    「私たちも。わからなかったところを残したまま、全部わかったことにはしたくないから」
    # speaker: narrator
    ゼーロは紐を外したメトロノームを抱え、台を降りた。帰る歩幅は、その拍子と少しずれていた。
}
# speaker: narrator
指揮者が去っても、街は鳴り続けた。{heroine_name}は、しばらくその音を聞いていた。
# speaker: heroine
「……静かにしてほしい時もあるけど。今日は、少しだけこのままがいいね」
-> END
