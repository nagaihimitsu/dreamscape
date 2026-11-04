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
# speaker: narrator
アーグラ城の案内図の前で、青年がノートに四つの枠を描いていた。ひとつ目は門。ふたつ目は人影。最後には、大きな水のボトルがある。
# speaker: heroine
# emotion: smile
「それ、漫画ですか？　最後の瓶、ずいぶん大きいですね」
# speaker: enemy
「甥に、ここへ来た話をしようと思って。ぼくはアディ。四コマで、城の一日を見せるつもりです」
# speaker: narrator
彼は建築を学んでいるという。ノートを見せる前に、水のボトルの絵を指で隠した。
# speaker: heroine
# emotion: teasing
「最後、隠しちゃうんですか？　結末が気になるんですけど」
# speaker: enemy
「ぼくが水を忘れて困った場面。ちゃんと補充しました。でも、これだと四分の一が水の話になる」
# speaker: narrator
彼は足元のボトルを軽く持ち上げる。城の絵に使う色鉛筆は、赤と白の二本が分けて置かれていた。
# speaker: enemy
「見たものを詰めると、どこを描いたか分からなくなりそうで。色も、使い分ける理由を説明したいんです」
# speaker: heroine
「四コマにするって決めたら、入りきらなくなったんですね。お城、広いから」
# speaker: enemy
「三つだけ、確認勝負に付き合ってもらえませんか。説明を間違えて描く前に、確かめたいので」
# speaker: heroine
# emotion: happy
「はい。最初の読者になります。あの赤いところと白いところから？」
-> END

=== after_first ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「別々の時代の仕事が、並んで残っている。そこですね」
- else:
# speaker: enemy
「アクバルが赤砂岩で再建を進め、後のシャー・ジャハーンが白大理石で飾ったんです」
}
# speaker: heroine
「次の皇帝が来ても、前の城を全部消してしまうわけじゃないんだ」
# speaker: narrator
アディはノートの建物を二色に塗り分けた。そこで鉛筆が止まり、指に付いた赤を見て笑う。
# speaker: enemy
「次は、城の仕事。門をくぐった後、どんな場所があるか。案内図も使って考えてみてください」
-> END

=== after_second ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: heroine
# emotion: smile
「戦うためだけじゃない。人を迎えたり、話を聞いたりする場所もあるね」
- else:
# speaker: heroine
「城壁に気を取られてた。中の宮殿や謁見の間も、忘れちゃいけなかったね」
}
# speaker: enemy
「話を聞く人を描くだけでも、もう一コマ要りますね。あの子、じっと座る場面は飛ばすかな」
# speaker: narrator
{heroine_name}が笑うと、彼も笑って、枠を一つ足した。最初に決めた四つには、もう収まっていない。
# speaker: enemy
「最後は、城から見えるもの。シャー・ジャハーンの晩年に結び付く場所へ、目を向けてみましょう」
-> END

=== conclusion ===
# background: gt_bg_agra_agra_fort
{ answer_correct:
# speaker: enemy
「ムサンマン・ブルジュと、川沿いに見えるタージ・マハル。そういう関係です」
- else:
# speaker: enemy
「シャー・ジャハーンが晩年を過ごしたムサンマン・ブルジュからは、タージ・マハルを望めるんです」
}
# speaker: heroine
# emotion: serious
「そこから何を思って見たかまで、勝手には決められないけど。建てた人が、別の場所から眺めてたんだね」
# speaker: narrator
アディは、最後にもう一つ枠を描いた。窓と、その先に見えるタージを、小さく描き込む。
{ battle_score == 3:
# speaker: enemy
「全問正解。最初の読者は頼もしいな。甥にも、絵と一緒に資料を見せておきます」
- else:
# speaker: enemy
「付き合ってくれてありがとう。迷うところが分かったので、説明を足せます」
}
# speaker: heroine
# emotion: teasing
「六コマになりましたね。水の話も、一コマ丸ごと残すんですか？」
# speaker: enemy
「そこは譲れません。さっき、本当に大変だったので。次に甥が来るときのためにも」
# speaker: narrator
譲らない青年に、彼女は肩をすくめて笑った。ノートには、門を入り、城を歩き、窓の外を見る一日が並んでいた。
# speaker: heroine
# emotion: smile
「甥っ子さん、水の話が一番好きだったりして。次の漫画も頼まれそうですね」
-> END
