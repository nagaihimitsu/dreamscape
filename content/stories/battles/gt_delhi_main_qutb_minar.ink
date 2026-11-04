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
# background: gt_bg_delhi_qutb_minar
# speaker: narrator
{heroine_name}はクトゥブ・ミナールの足元から、スマートフォンをゆっくり上へ向けた。塔を撮っているつもりの画面が、途中から空だけになる。
# speaker: heroine
# emotion: surprised
「あれ。塔、どこまで行った？」
# speaker: narrator
画面を覗いたこちらの肩が揺れる。彼女も吹き出した。その笑い声まで入ってから、録画が止まる。
# speaker: enemy
「それ、僕もやった。縦に長い相手には勝てない」
# speaker: narrator
近くで絵を描いていた青年が、スケッチ帳を持ち上げる。塔の先が、紙の外に出ていた。
# speaker: heroine
# emotion: teasing
「そちらも、続きは空にあるんですね」
# speaker: enemy
「デーヴ。まだ描いてる途中。失敗した絵じゃなくて、途中の絵」
# speaker: narrator
言い切ってから、彼は近くにある未完の塔の方を見た。閉じかけたスケッチ帳を、また開く。
# speaker: enemy
「あれの説明を読んだら、途中のものも気になってきて。三つ、面白い話を見つけたんだ」
# speaker: heroine
「じゃあ、当ててみたいです。わたしたちの動画も、まだ失敗って決めないでおきます」
# speaker: enemy
「最初は、低いまま残ったアラーイー・ミナール。造る人は、どんな姿を目指していたでしょう？」
-> END

=== after_first ===
# background: gt_bg_delhi_qutb_minar
{ answer_correct:
    # speaker: enemy
    「クトゥブ・ミナールの二倍。今の低さを見て、小さな計画だったと思ったら違うんだ」
- else:
    # speaker: enemy
    「目指したのは、クトゥブ・ミナールの二倍の規模。第一層までで止まっているけどね」
}
# speaker: narrator
デーヴは自分の絵の、紙からはみ出した先を見る。{heroine_name}も、未完の塔から空へ目を上げた。
# speaker: heroine
「わたしの動画より、ずっと大きな続きがあったんだ」
# speaker: enemy
「僕の紙なら、あと一枚貼れば描けるかな。風に負けそうだけど」
# speaker: narrator
彼は次のメモを出す。アラーイー門の形と、そのそばに小さく文字の位置が描かれていた。
# speaker: enemy
「この門がいつできたか、勝手に当てなくて済む手がかりがある。どこを調べればいいと思う？」
-> END

=== after_second ===
# background: gt_bg_delhi_qutb_minar
{ answer_correct:
    # speaker: enemy
    「門に刻まれた碑文。完成が1311年と記録されているんだ」
- else:
    # speaker: enemy
    「門の碑文に、1311年の完成記録がある。形が古そう、だけじゃ決められないね」
}
# speaker: heroine
「模様に見えていたところが、読むものにもなるんだ」
# speaker: narrator
デーヴは文字のある位置に、小さな矢印を足した。塔の絵には、上の方の色の違いも描き込んである。
# speaker: enemy
「こっちの塔にも、直した人の記録がある。そこを読むと、ある思い込みが崩れる」
# speaker: heroine
# emotion: serious
「一人が、全部同じように造ったと思ってた？」
# speaker: enemy
「お、近い。じゃあ最後。残った記録から、塔の時間をどう説明する？」
-> END

=== conclusion ===
# background: gt_bg_delhi_qutb_minar
{ answer_correct:
    # speaker: enemy
    「建て始めた人の後にも、増築や修理をした人がいる。一本の塔なのに、何人もの仕事なんだ」
- else:
    # speaker: enemy
    「塔は後の時代にも増築や修理が重ねられている。最初に建てた人だけで、今の姿になったわけじゃない」
}
# speaker: narrator
デーヴは塔の先を無理に縮めるのをやめ、紙の端に、続きがあることだけ書き込んだ。
{
- battle_score == 3:
    # speaker: enemy
    「三つとも正解。僕の説明、いらなくなっちゃったな」
    # speaker: heroine
    「絵は見たいです。今の、その書き足したところも」
- battle_score == 2:
    # speaker: enemy
    「二つ正解。僕が見落としてたところも、二つどころじゃないんだけど」
    # speaker: heroine
    「塔の先は、もう見落としてないですもんね。紙の外にあるだけで」
- else:
    # speaker: enemy
    「今回は僕の勝ち。でも、塔を一回で描く勝負なら、まだ負けてる」
    # speaker: heroine
    「何度でも描けるなら、続きですね」
}
# speaker: narrator
別れ際、彼女は先ほどの動画を再生した。塔が消え、空になる。次いで、自分の笑い声が聞こえる。
# speaker: heroine
# emotion: happy
「あ、これ。見てると、また笑っちゃう」
# speaker: narrator
削除の印に触れかけた指が、画面から離れた。
# speaker: heroine
「取っておこう。上手に撮れた方は、もう一本撮ればいいし」
# speaker: narrator
今度は少し離れて、塔を画面に収める。デーヴが紙を押さえ直す姿は入れず、赤い輪郭をゆっくり追った。
-> END
