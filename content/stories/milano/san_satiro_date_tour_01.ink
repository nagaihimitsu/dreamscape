// 教会の奥行きと、相手に近づくときの距離。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: milano_san_satiro_date
# speaker: narrator
サンタ・マリア・プレッソ・サン・サティロ教会。祭壇の奥に、長い通路が続いているように見えた。
# speaker: heroine
「……あれ？　横から見ると、壁がすぐそこにある」
# speaker: narrator
二人で案内を読む。
# speaker: heroine
「奥に場所が取れなくて、浅いところに漆喰を使い、遠近法で深く見せたんですね」
# speaker: narrator
{heroine_name}は正面に戻り、また一歩横へ動いた。
# speaker: heroine
# emotion: smile
「行ったり来たりしてると、自分のほうがおかしくなりそう」

* [「壁なんだから、通路だと思うほうが間違いだね」]
    # effect: milano_san_satiro_first_a
    # speaker: heroine
    # emotion: serious
    「間違い、かな。正面から見える景色も、ここにあるのに」
    -> after_first
* [「横から見る役、交代しようか」]
    # effect: milano_san_satiro_first_b
    # speaker: heroine
    # emotion: smile
    「じゃあ私が正面。壁に着いたら教えてください」
    「……あ、歩かなくていいです。声が響きそう」
    -> after_first
* [「近くで見るなら、もう少し隣に行ってもいい？」]
    # effect: milano_san_satiro_first_c
    # speaker: heroine
    { romance_stage < 3:
        # emotion: worried
        「あ、うん。でも、まずはこの距離で見せてください」
        「私も、まだどこを見るか決めてなくて」
    - else:
        # emotion: shy
        「……いいですよ。でも、絵のほうも見てくださいね」
    }
    -> after_first

=== after_first ===
# speaker: narrator
二人が少し位置を変えるたび、壁の見え方も変わる。
# speaker: heroine
「近くに行けば全部分かる、ってわけでもないんですね」
「正面で見たものも、横で見たものも、どっちも残しておきたいな」

* [「じゃあ、ひとつに決めなくていい」]
    # effect: milano_san_satiro_second_a
    # speaker: heroine
    # emotion: smile
    「うん。帰ったら、同じ場所に通路と壁の両方があったって話します」
    -> ending
* [「でも、知らないままのほうが楽しかったかも」]
    # effect: milano_san_satiro_second_b
    # speaker: heroine
    # emotion: serious
    「私は、横から見てよかったです」
    「まだ正面からも見られるし」
    -> ending
* [「もう一度だけ、隣で同じ角度を探そう」]
    # effect: milano_san_satiro_second_c
    # speaker: heroine
    # emotion: smile
    「今度は、どっちが先に壁を見つけるか」
    「……って、もう二人とも知ってるんでした」
    -> ending

=== ending ===
# speaker: narrator
教会を出る前に、彼女はもう一度だけ振り返った。
{ ending_reached:
    # speaker: heroine
    # emotion: teasing
    「次は私が、あなたの見落としを探しますね」
- else:
    # speaker: heroine
    「次は、違うところに気づくかもしれませんね」
}
-> END
