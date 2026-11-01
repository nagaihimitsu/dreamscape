// Phase 7 / 記録を閉じるために世界を止めたい収集家。
// 問題・採点はJSON/TypeScript。次問の答えは先に述べない。
VAR player_name = "ユウ"
VAR heroine_name = "ミオ"
VAR player_address = "ユウさん"
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: milano_castello
# speaker: narrator
中庭の隅で、男が小さな引き出しを抱えていた。中には鍵、切符、そして「昨日の感動」と書いた空箱がある。
# speaker: enemy
「まだ驚かないで。驚きの整理番号が出ていない」
# speaker: heroine
「……今、少し驚いてしまいました」
# speaker: enemy
「未登録だ！　私はオッターヴィオ・インヴェンタリオ。見終わったものだけを集めている」
「記録が完成すれば、もう見に来なくていい。城の役目も、一枚の札に収めれば済む」
# speaker: narrator
彼は二人の前に、まだ何も書いていない札を置いた。
# speaker: enemy
「三つ確かめよう。今日を、ちゃんと昨日にできるかどうか」
-> END

=== after_first ===
# background: milano_castello
{ answer_correct:
    # speaker: enemy
    「守る要塞。暮らす宮廷。そして今は博物館……一枚の札では、裏まで使うことになる」
    # speaker: heroine
    「裏は、使わないんですか」
    # speaker: enemy
    「そこには『記入完了』と書いてある！」
- else:
    # speaker: enemy
    「要塞だけでは足りない。宮廷の住まいにもなり、今は博物館や文化施設が入っている」
    「私の『城』の引き出しは、今日から重くなる。大きさは変わらないのに」
    # speaker: heroine
    「重さより、開けにくくなった理由を考えたいです」
}
# speaker: narrator
オッターヴィオは札を裏返しかけ、いったん止めた。
# speaker: enemy
「では、部屋の中身だ。名前を知れば見終わるはずだろう。『アッセの間』を確かめたまえ」
-> END

=== after_second ===
# background: milano_castello
{ answer_correct:
    # speaker: enemy
    「枝が絡み、壁から天井へ木陰が広がる。外へ出ずに、外のような場所にいる……」
    「部屋の札を『屋内』にすると、絵が文句を言いそうだ」
    # speaker: heroine
    「木陰の絵なら、雨の日も葉っぱを片付けなくていいね」
- else:
    # speaker: enemy
    「描かれているのは、枝や金色の結び紐が絡む、あずまやのような木陰だ。本物の木が屋根を支えているわけではない」
    # speaker: heroine
    「資料を見ても、ちょっと見上げたくなります」
    # speaker: enemy
    「……記録を読むだけで首が動くとは。厄介な部屋だ」
}
# speaker: narrator
男は「見学済み」の札を、引き出しへ戻さなかった。
# speaker: enemy
「だが、絵の題材がわかれば十分だ。誰がこの部屋を使ったかまで、絵を見るのに必要かね？」
-> END

=== conclusion ===
# background: milano_castello
{ answer_correct:
    # speaker: enemy
    「客や大使を迎える部屋。ルドヴィーコに招かれたレオナルドの装飾が、宮廷の出会いの場を作った……」
    「誰も来なければ、きれいに整理できたのに。それでは、部屋の役目が消えるのか」
- else:
    # speaker: enemy
    「スフォルツァ家が客や大使を迎えた部屋なのだ。絵は、ただ倉庫にしまう品ではなかった」
    「人が来る場所を、人が来ないほうがよいと考えていた。私の収集法は、部屋と仲が悪い」
}
{
- battle_score == 3:
    # speaker: narrator
    オッターヴィオは「記入完了」の札をひっくり返した。何も書いていない面が、初めて上になった。
    # speaker: enemy
    「私の負けだ。記録は、次に見るものを減らすためではなかった」
    「この引き出しには、今日わからなかったことを入れよう。……ふたは、閉まるだろうか」
    # speaker: heroine
    「閉まらなかったら、一つだけ持って歩いては」
    # speaker: narrator
    彼は空の札を一枚選んだ。何も記録せずに持ち出すのは、初めてらしかった。
    # speaker: heroine
    「私も、見た場所に小さく丸をつけてた。……丸の外側は、まだ残ってるんだね」
- battle_score == 2:
    # speaker: enemy
    「一つ見落とした君たちに、全部見終えたつもりの私が負けた。収集品としては、不都合な結果だ」
    # speaker: narrator
    彼は札に「見学途中」と書いた。「途中」の字だけ、やけに小さい。
    # speaker: heroine
    「読めますよ」
    # speaker: enemy
    「私にも読める。だから困っている」
    # speaker: narrator
    男は札をポケットへ入れた。引き出しへ戻す手つきとは、少し違っていた。
    # speaker: heroine
    「……続きを持って帰ったんだね」
- else:
    # speaker: enemy
    「勝負には勝った。だが、この勝利をしまう場所がない」
    # speaker: narrator
    「見終わったもの」と書かれた引き出しの前で、彼は手を止めた。
    # speaker: enemy
    「君たちは、もう一度見たほうがいい。私も……記録と実物の照合が必要だ」
    # speaker: heroine
    「それ、見直すってことでは」
    # speaker: enemy
    「私の言い方だと、仕事として戻ってこられる！」
    # speaker: narrator
    男は中庭を一周すると言った。いちばんゆっくりした歩き方で。
    # speaker: heroine
    「悔しいけど、私も見直したい。覚えた名前より、気になったことが増えました」
}
-> END
