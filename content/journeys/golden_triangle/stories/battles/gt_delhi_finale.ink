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
# background: gt_bg_delhi_red_fort
# speaker: narrator
レッド・フォートの見学路の脇で、空の動画を見ていた{heroine_name}が、また笑った。塔が消えた後も、二人の声だけが続いている。
# speaker: enemy
「今、何が映ってたの？」
# speaker: narrator
少し離れた青年が尋ねた。画面をのぞき込む前に足を止め、ニール、と名乗る。
# speaker: heroine
# reaction: heroine,teasing,music
「空です。主役の塔は、途中で帰りました」
# speaker: enemy
「見てもいい？　笑うタイミングだけ聞こえて、気になって仕方ない」
# speaker: narrator
彼女が画面を向けると、ニールも同じ所で吹き出した。鞄から自分の端末を出し、旅の映像を作っているのだと話す。
# speaker: enemy
「二人はこの先どこへ？」
# speaker: narrator
彼女が地図を開き、デリー、アーグラ、ジャイプールの順に指を動かす。ニールは最後の街を見て顔を上げた。
# speaker: enemy
「じゃあ、誘いたい。友達と短い映像を見せ合うんだ」
# speaker: heroine
# reaction: heroine,surprised,question
「映画の、上映会みたいなものですか？」
# speaker: enemy
「数人で画面を囲むだけ。一作品三分。長いと、ラヴィがおやつを出してくる。本人は親切のつもりで」
# speaker: narrator
彼女は笑ったが、画面を閉じなかった。空になった動画の横に、ほかの撮影が短く並んでいる。
# speaker: heroine
# emotion: worried
「わたし、何を見たか分かるように撮るだけで、まだ精いっぱいなんです」
# speaker: enemy
「じゃあ、仮に一本つないでみよう。君の映像で足りない所は、僕の写真で試す。借りた分は後で外せばいい」
# speaker: narrator
最初に並んだのは赤い城壁。ニールは指を止め、すぐ内側の写真も開いた。
# speaker: enemy
「壁だけだと、守る城で終わる。中の暮らしが入る一枚、どれを挟もう」
-> END

=== after_first ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: heroine
    「居室をつなぐ水路。これなら、城の中でどう過ごしていたかも気になる」
- else:
    # speaker: heroine
    「水路を入れればよかったんだ。壁の高さだけを足しても、中へ入れないままだった」
}
# speaker: narrator
ニールがその写真を入れると、外壁だけだった並びに奥行きが生まれた。続けて次へ送る指を、彼女は目で追う。
# speaker: heroine
# reaction: heroine,surprised,exclamation
「速い。いま、入ったところでした！」
# speaker: enemy
「ごめん。サナにも言われる。僕は移動より、編集の方がせっかちなんだ」
# speaker: narrator
次の画面はクトゥブ・ミナール。塔が消え、空になる。ニールは空の部分を短くする位置へ指を置いた。
# speaker: enemy
「ここを切ると、次がすぐ来る」
# speaker: heroine
# emotion: serious
「待って。笑うところまで、今は残してください」
# speaker: narrator
指が止まり、笑い声まで再生される。その隣に、未完のアラーイー・ミナールを写した写真が置かれた。
# speaker: enemy
「こっちは、写ってる高さだけで説明すると間違える。字幕を付けるなら、そこを避けたいね」
-> END

=== after_second ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: heroine
    「もっと大きくなるはずだった塔の第一層。見えていない続きもあるんだって、短く言えるね」
- else:
    # speaker: heroine
    「小さく完成した塔じゃなくて、大きな計画の途中。今ある高さを、そのまま目的にしない方がいいんだ」
}
# speaker: narrator
彼女は字幕の長さより先に、空のカットがまだあるかを確かめた。ニールはその視線に気づいたが、何も消さなかった。
# speaker: enemy
「空は残す。その代わり、ほかを短くすることにはなるよ」
# speaker: heroine
「うん。……はい。それは、あとでちゃんと考えます」
# speaker: narrator
フマユーン廟の庭を写した一枚が続く。二人はしばらく黙った。塔の後にまっすぐな道が来ると、歩く速さまで変わった気がする。
# speaker: enemy
「ここは『きれいな庭』だけでも伝わる。でも、なぜ水路をこう配したか、一言入れると違って見える」
# speaker: heroine
# emotion: neutral
「わたしの好き、とは別に、場所の意味も残しておきたいです」
-> END

=== after_third ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: heroine
    「楽園の川を思い描いた庭。その一言なら、見ながら考える時間も残るね」
- else:
    # speaker: heroine
    「庭の水路は、楽園の川と結び付けて説明されるんだよね。言い切る前に、ここは調べ直しておこう」
}
# speaker: narrator
字幕を入れたニールが、次の素材を探す。ジャーマー・マスジドのところで、彼女はスマートフォンを少し引き戻した。
# speaker: heroine
「そこで会ったイムランさんの映像はないです。話を聞いてたので」
# speaker: enemy
「じゃあ、その人の場面は飛ばす？」
# speaker: heroine
# reaction: heroine,serious,exclamation
「飛ばしたくないです。門を間違えたと思って、びっくりして。そのあと、本人がもっと慌てて帰っちゃって」
# speaker: narrator
説明の途中で彼女が笑う。ニールも笑ったが、画面はまだ静かなままだった。
# speaker: enemy
「今みたいに話せば、映ってなくても分かる。建物の紹介は添えよう。昔話だけの場所に見えないように」
-> END

=== after_fourth ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: heroine
    「今も礼拝に人が来るモスク。イムランさんの待ち合わせも、今日の用事だった」
- else:
    # speaker: heroine
    「昔の記念物だけじゃなくて、今も人が祈るモスクなんだ。そこは外したくない」
}
# speaker: narrator
彼女は映像のない部分に、短いメモを置いた。声を入れるかどうかは、まだ決められない。
# speaker: heroine
# reaction: heroine,worried,sweat
「話すと長くなる。さっきも、三分くらい使いませんでした？」
# speaker: enemy
「安心して。僕の説明の方が長い。サナに見せると、そこから削られる」
# speaker: narrator
ニールは最後に、フマユーン廟の写真をもう一度出した。次の街へつなぐ並べ方を試すのだという。
# speaker: enemy
「アーグラのタージ・マハルへ続けるなら、ただ地図を送るより、建物のつながりが使える。どんな関係だった？」
-> END

=== conclusion ===
# background: gt_bg_delhi_red_fort
{ answer_correct:
    # speaker: heroine
    「先にあった庭園墓が、後のタージ・マハルへつながる。同じ人が一度に造った、ということじゃないんですね」
- else:
    # speaker: heroine
    「フマユーン廟の庭園墓が、後のタージ・マハルにも影響した。似てるはず、だけで撮らないようにしよう」
}
{
- battle_score == 5:
    # speaker: enemy
    「説明は五つとも合った。映像は……まだ長い。正確さと三分は、別々の難問だね」
- battle_score >= 3:
    # speaker: enemy
    「字幕は、直すところも見つかったね。見せる前に調べ直せるのが、作る側のずるいところ」
- else:
    # speaker: enemy
    「今のまま確定しない方がいい説明は、印を残そう。間違えた字幕を抱えたまま上映する必要はない」
}
# speaker: narrator
仮の並びを見返すと、ニールの写真が何枚も入っている。彼女は借りた部分を外し、自分たちの素材だけに戻した。まだ短い。少し、頼りない。
# speaker: heroine
# emotion: serious
「わたし、参加したいです。この続きを、自分で作ってみたい」
# speaker: narrator
こちらの顔を見て、返事を待つ。うなずきを受け取ると、彼女はもう一度、空の動画を先頭へ動かした。
# speaker: heroine
# reaction: heroine,smile,sparkle
「今は、これから始めたい。ちゃんと塔を撮れた方より、わたしが笑った方」
# speaker: enemy
「空から始めるんだ。僕なら塔だけど。……完成したら、どうなったか見せて」
# speaker: narrator
ニールは連絡先を交換し、上映会のことはあとで送ると約束した。編集を手伝う友人のサナにも、二人を紹介してくれるという。
# speaker: heroine
# reaction: heroine,teasing,music
「三分になる前に、おやつを出されないようにしなきゃ」
# speaker: enemy
「そこは僕も保証できない。ラヴィ、お腹がすくと親切が早まるから」
# speaker: narrator
別れた後、彼女は音を消して仮の映像を見た。次に、音を戻す。空のところで、やっぱり肩が揺れた。
-> END
