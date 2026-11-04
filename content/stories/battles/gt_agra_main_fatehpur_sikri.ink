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
# background: gt_bg_agra_fatehpur_sikri
# speaker: narrator
ファテープル・シークリーで、二人が道を譲った女性は、折り畳んだ紙を落としかけた。{heroine_name}が端を押さえ、紙を渡す。
# speaker: enemy
「ありがとう。これをなくすと、来週の家族会議に負けるところでした」
# speaker: heroine
# emotion: surprised
「家族会議？」
# speaker: enemy
「妹が子どもを連れて来るの。私が案内役。十か所回れると言ったら、『休憩を数に入れてないでしょう』って」
# speaker: narrator
キランというその女性は、見どころを調べに来たらしい。紙のあちこちに丸があり、その間に何度も『休む』と書き加えられている。
# speaker: heroine
# emotion: teasing
「妹さん、もう会議に参加してますね」
# speaker: enemy
「これが一番重要な指摘でした。私は見始めると、つい全部回りたくなるので」
# speaker: narrator
キランは立ち止まり、赤い建物の連なりを見た。子どもたちに、この場所を何と紹介するかでも迷っているという。
# speaker: enemy
「大きなお城、とだけ言うと違う気がして。三つ、見立てを試してもいい？」
# speaker: heroine
# emotion: smile
「わたしたちでよければ。わたしも、来るまで一つの建物だと思ってました」
# speaker: enemy
「では最初。こんなに立派な街は、ずっと帝国の中心だったのでしょうか」
-> END

=== after_first ===
# background: gt_bg_agra_fatehpur_sikri
{ answer_correct:
# speaker: enemy
「そう、首都としての期間は短かった。大きさからは想像しにくいでしょう」
- else:
# speaker: enemy
「実は、首都だった期間は長くありません。建物が大きいから長続きした、とは言えないのね」
}
# speaker: heroine
「造るのにも時間がかかったはずなのに。人が使い方を変えていく方が、早いこともあるんだ」
# speaker: narrator
キランは紙の冒頭に『首都だった街』と書く。思いついた飾り言葉は、いったん後回しにした。
# speaker: enemy
「次は、ここでどんなことが行われていたか。建物を一つだけ見て、街全部を決めないでください」
-> END

=== after_second ===
# background: gt_bg_agra_fatehpur_sikri
{ answer_correct:
# speaker: heroine
# emotion: smile
「宮殿だけじゃなくて、役所も、礼拝するところも。用事の違う人が来てたんだね」
- else:
# speaker: heroine
「ひとつの用途だけじゃなかった。暮らす場所、政治の場所、宗教の場所が、つながってるんだ」
}
# speaker: enemy
「だったら、案内する順番も一つじゃなくていいのね。子どもたちに選んでもらおうかな」
# speaker: narrator
キランは紙に二本の線を引き、すぐに交わらせた。別行動ではなく、最初の行き先を選べるようにするらしい。
# speaker: enemy
「最後。首都が移った後、この場所の話をどう続けるか。『誰も来なくなりました』で終わっていい？」
-> END

=== conclusion ===
# background: gt_bg_agra_fatehpur_sikri
{ answer_correct:
# speaker: enemy
「そう。ラホールへ首都が移った後も、皇帝たちが一時的に訪れる場所として使われました」
- else:
# speaker: enemy
「首都がラホールへ移っても、皇帝たちの一時的な滞在は続いたの。首都でなくなることと、誰も来なくなることは別ね」
}
# speaker: heroine
# emotion: neutral
「空っぽになった街、って思い込むところだった。言葉ひとつで、ずいぶん違っちゃうね」
{ battle_score == 3:
# speaker: enemy
「三つともぴったり。来週もいてほしいくらいだけど、旅行の続きを邪魔しちゃうわね」
- else:
# speaker: enemy
「付き合ってくれてありがとう。間違えやすいところ、私も説明を直しておく」
}
# speaker: narrator
キランは最後に、紙へ大きな休憩の丸をひとつ増やした。それは建物の丸より、少し大きい。
# speaker: heroine
# emotion: teasing
「ついに、一番の見どころになりましたね」
# speaker: enemy
「妹に見せたら、そこだけ丸を付けられそう」
# speaker: narrator
笑いながら紙を畳むキランに手を振る。彼女の案内図は、最初より行き先が少なく、書き込みが増えていた。
# speaker: heroine
# emotion: smile
「わたしたちも、水を飲もう。次、ちゃんと楽しむために」
-> END
