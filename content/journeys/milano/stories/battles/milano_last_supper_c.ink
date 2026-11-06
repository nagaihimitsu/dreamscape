// Phase 6 / C型。観察できる配置と、その働きの解釈を区別する。
// 正しい証拠二枚を選んでも、結論は英語3択でプレイヤーが答える。
VAR player_name = "ユウ"
VAR heroine_name = "ミオ"
VAR player_address = "ユウさん"
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "claim": -> claim }
{ battle_scene == "evidence_failure": -> evidence_failure }
{ battle_scene == "evidence_success": -> evidence_success }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: milano_refectory
# speaker: narrator
男が一枚のメモを二枚に切った。片方には名前、もう片方には名字が書いてある。
# speaker: enemy
「エットレ。……セパラート。別々に覚えてくれ。隣同士にすると、すぐ仲間だと思われる」
# speaker: heroine
「同じ人の名前では……」
# speaker: enemy
「だから困る！　パンとチーズも、隣に置くと勝手にサンドイッチを名乗る。私は仕切りを入れる」
# speaker: narrator
彼の手帳には、ページより多くの仕切りが挟まっていた。
# speaker: enemy
「この絵も一つずつ見る。まず人物だ。線や壁の都合を持ち込まず、並び方だけ確かめたまえ」
-> END

=== after_first ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「三人ずつ四組。よし、四つの封筒に分けられる」
    # speaker: heroine
    「……中央の人は？」
    # speaker: enemy
    「別便だ。封筒同士が話し始める前に、次へ行くぞ」
- else:
    # speaker: enemy
    「左右に六人ずつだが、その中でも三人ずつに分かれる。全部で四組だ」
    # speaker: heroine
    「まとまりを見分けるには、隣の人も見るんですね」
    # speaker: narrator
    エットレは手帳に仕切りを一枚足した。返事の代わりらしかった。
}
# speaker: enemy
「今度は部屋だ。人物とは別のページを使いたまえ」
-> END

=== after_second ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「絵の部屋が、実際の食堂の続きに見える……壁が仕切りの仕事をしていない！」
    # speaker: heroine
    「私は、その続いて見える感じが好きです」
- else:
    # speaker: enemy
    「遠近法や光で、描かれた空間が実際の食堂の続きに見える。別の箱に収まった小さな絵、ではないのだ」
    「……説明したら、私まで壁の向こうへ招かれた気がしてきた」
    # speaker: heroine
    「お断りするほどのことでは、ないと思います」
}
# speaker: enemy
「部屋と部屋なら、例外として認めよう。だが、人物の並びと、天井の線は別々だ」
# speaker: narrator
エットレは二枚のメモの間に、最後の仕切りを立てた。
-> END

=== claim ===
# background: milano_refectory
# speaker: enemy
「人の並びと、部屋の奥行きは無関係だ。二つの資料で、この絵の見え方について何か言えるかね？」
-> END

=== evidence_failure ===
# background: milano_refectory
# speaker: enemy
「二枚あるだけなら、私の名前と名字でもよいだろう。絵の中で、何がつながる？」
# speaker: heroine
「人物がどうまとまるか。線がどこへ向かうか。その二つを比べられる資料が、まだ揃っていないみたい」
-> END

=== evidence_success ===
# background: milano_refectory
# speaker: narrator
エットレは二枚の資料を並べ、仕切りを少しずらした。絵を見上げてから、また資料に目を戻す。
# speaker: enemy
「……この二枚なら、比較はできる。だが、机の上で隣り合っただけでは結論にならん。何が読み取れる？」
-> END

=== conclusion ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「人物のまとまりと、頭部へ集まる線。違う仕組みで、中央への注意を強めると読める……」
    「無関係として片付けたのは早かった。だが、作者の頭の中を読んだことにはならんぞ」
    # speaker: heroine
    「うん。見えるものから、そう考えられる、という話ですね」
- else:
    # speaker: enemy
    「二枚は、中央への注意を強める構図だと読む手がかりになる。だが、使徒を見せたくなかったという作者の気持ちまでは証明できん」
    # speaker: heroine
    「つなげて考えるのと、何でも言い切るのは、別なんですね」
}
{
- battle_score == 3:
    # speaker: narrator
    エットレは最後の仕切りを抜いた。倒れると思った二枚のメモは、そのまま残った。
    # speaker: enemy
    「私の負けだ。一人ずつ見るために、関係を全部切っていた。だが、隣に誰がいるかも、その人の見え方に関わるのだな」
    「帰ったらパンとチーズを……一度、同じ皿に乗せる。名前は食べてから決める」
    # speaker: heroine
    「おいしかったら、仕切りには内緒ですね」
    # speaker: narrator
    エットレは二枚の名札を重ねて持ち、出口へ向かった。
    # speaker: heroine
    「……{player_address}。私、三人ずつの表情も、もう少し見たくなった。中央を見たら、周りも気になった」
- battle_score == 2:
    # speaker: enemy
    「見落としは一つ。だが、無関係だと決めつけた私の仕切りは、もう立たない」
    # speaker: narrator
    エットレはメモの間に、細い矢印を描いた。
    # speaker: enemy
    「仮の橋だ。両側をちゃんと見てから渡る。……通行料は取らん」
    # speaker: narrator
    彼は手帳を閉じた。今日は初めて、すんなり閉じた。
    # speaker: heroine
    「一枚減っただけなのに、ずいぶん持ちやすそうになったね」
- else:
    # speaker: enemy
    「勝負は私の勝ちだ。だが、関係なしの判は押せなくなった」
    # speaker: narrator
    エットレは二枚のメモを別々の封筒に入れた。少し考えて、封筒同士をクリップで留めた。
    # speaker: enemy
    「判定保留。次は、私も二枚まとめて持ってくる」
    # speaker: heroine
    「……持ち方は、もう変わったんですね」
    # speaker: narrator
    彼はクリップを見ないようにして去った。{heroine_name}は、残った絵をゆっくり見直した。
    # speaker: heroine
    「私たちも、答えを急いだかも。二つとも読んで、どこまで言えるか考えたいね」
}
-> END
