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
# background: gt_bg_delhi_red_fort
# speaker: narrator
レッド・フォートの見学路で、女性が手帳を押さえていた。風にめくれたページには、赤い壁を囲む小さな四角が並んでいる。
# speaker: heroine
「そこ、折れそうです」
# speaker: narrator
{heroine_name}が風上に立つ。女性は手帳を閉じ、ほっと息をついた。
# speaker: enemy
「助かった。ターラーです。友達と遊ぶ盤面を考えてたの。城を取ったら勝ち、っていうゲーム」
# speaker: heroine
# emotion: smile
「ほんものを見ながら作ってるんですか。楽しそう」
# speaker: enemy
「門はできた。壁もできた。ところが、中身が全部『広場』になってしまった」
# speaker: narrator
手帳が開く。四角の中に『広場』『広場』『かなり広い広場』。彼女は最後の一つで笑いをこらえた。
# speaker: heroine
# emotion: teasing
「最後だけ、少し自信がありますね」
# speaker: enemy
「場所は正確なんだよ。中で何が起こるかを、まだ決められなくて」
# speaker: narrator
ターラーは調べてきた短い説明を三枚、手帳から取り出した。答えを隠すように、下側を折ってある。
# speaker: enemy
「せっかくだから、三回勝負しない？　当てたら、そこを最初に歩く役を決めていい。最初は、この城が新しい都に必要だった理由」
-> END

=== after_first ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: enemy
    「そう、皇帝の暮らす宮殿でもある。守る壁ばっかり作って、帰る場所を作ってなかった」
- else:
    # speaker: enemy
    「新しい都の中心となる宮殿要塞。兵士だけじゃなくて、ここで暮らす皇帝もいたんだ」
}
# speaker: narrator
ターラーが『かなり広い広場』を消し、宮殿と書き直した。{heroine_name}は、その隣を指す。
# speaker: heroine
「住む役も必要ですね。ずっと攻められるだけだと、ごはんを食べ損ねそう」
# speaker: enemy
「食事の時間に襲うのは禁止。友達に一人、やりそうなのがいる」
# speaker: narrator
次の紙には、建物の間をつなぐ細い線が描かれている。ターラーは線の端に、小さな印を置いた。
# speaker: enemy
「さて、この線を道だと思って駒を置くと、困ったことになります。何を表している？」
-> END

=== after_second ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: enemy
    「水路。宮殿の居室をつないだ『ナフル・イ・ベヒシュト』。駒が濡れちゃうね」
- else:
    # speaker: enemy
    「これは『ナフル・イ・ベヒシュト』という水路。宮殿の居室をつないでいたんだって」
}
# speaker: heroine
# emotion: happy
「水が建物を通っていくんだ。壁の外を見ていた時には、想像しなかった」
# speaker: narrator
ターラーは線を青く塗り始める。勢い余ってはみ出し、しばらくペン先を見つめた。
# speaker: enemy
「……ここは、あとで乾かす」
# speaker: narrator
最後の紙は、同じ赤い壁の前に、別々の時代の人々がいる説明だった。
# speaker: enemy
「勝った人が城を取れば、おしまい。そう決めてたけど、本当の城には続きがある。何が変わっていったんだろう？」
-> END

=== conclusion ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: enemy
    「宮殿から英軍の施設へ、そして独立を祝う場所へ。持ち主だけ変えればいい、って話じゃないね」
- else:
    # speaker: enemy
    「宮殿として使われた後、英軍の施設にもなり、やがて独立を祝う場所になった。壁の前で起こることまで変わったんだ」
}
# speaker: narrator
ターラーは一度、手帳を閉じた。赤い壁を見てから、今度は別のページを開く。
{
- battle_score == 3:
    # speaker: enemy
    「三つとも取られた。約束どおり、最初の役をどうぞ」
    # speaker: heroine
    「水路を見に来た人。戦う前に、そこを通りたいです」
- battle_score == 2:
    # speaker: enemy
    「二つ正解。では、最初の来訪者を募集します」
    # speaker: heroine
    「わたしは水路を見る人がいいです。駒は、ちゃんと岸に置きます」
- else:
    # speaker: enemy
    「今回は私の勝ち。でも、中身を全部広場にした人が威張るのも、ちょっとね」
    # speaker: heroine
    「最初のお客さんはできますよ。水路を見に行きたいです」
}
# speaker: narrator
こちらが置いた小さな印の隣に、彼女も指を置いた。ターラーは二人分の余白を残す。
# speaker: enemy
「よし。この版は、見学から始まる。攻めたい友達には、少し待ってもらおう」
# speaker: heroine
# emotion: smile
「遊ぶ時、青いところが乾いているといいですね」
# speaker: narrator
ターラーは笑って手帳をあおいだ。二人は実物の方へ歩き出す。さっきより、囲いの内側が広く感じられた。
-> END
