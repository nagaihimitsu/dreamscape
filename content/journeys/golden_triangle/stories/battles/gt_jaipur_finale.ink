VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

# background: gt_bg_jaipur_jantar_mantar
{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "after_3": -> after_third }
{ battle_scene == "after_4": -> after_fourth }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# speaker: enemy
「三分の人たち？　私はラヴィ。先に言っておくけど、あとで褒める約束はできないよ」
# speaker: narrator
ジャンタル・マンタルで待ち合わせた男性は、四角い眼鏡を直した。挨拶代わりにそんなことを言って、にっと笑う。
# speaker: heroine
# reaction: heroine,surprised,interrobang
「会うなり、厳しいですね」
# speaker: enemy
「ニールが『とにかく褒めて緊張を解いて』って。見てもいない作品を？　私、そこは下手なんだ」
# speaker: narrator
彼女は吹き出して、動画を開いた。長さの数字を見せる手だけ、少しためらう。
# speaker: heroine
「まだ、少し長くて。アーグラの歩くところを残したら、こっちで見せたいものも増えてしまって」
# speaker: enemy
「サナからも聞いた。彼女は『短くすることはできる。本人が切りたいかは別』だって」
# speaker: narrator
ラヴィは時計を見てから、こちらへ向き直る。家の食堂へ戻り、父と交代するまでの時間で仲間と集まるのだという。
# speaker: enemy
「三分って、作品を急がせるためだけじゃない。見てくれる人にも、そのあとの用事があるからね」
# speaker: heroine
# emotion: serious
「それは、守りたいです。でも、早送りで全部詰めたら、歩くところを残した意味までなくなっちゃう」
# speaker: narrator
似た角度の門の映像を二つ並べ、彼女は片方を候補から外した。続けて、アンベールの中庭の映像を開く。
# speaker: enemy
「一枚減った。こっちは残す？　字幕に『ひとつの大きな城』だけだと、同じ所を何度も通ってるみたいだ」
# speaker: heroine
「区画のつながりを見せたいんです。どんな暮らしがある城なのか、言葉も合わせたい」
# speaker: narrator
彼女は字幕の候補を並べた。映像の順番を変える前に、アンベールの構成に合う説明を確かめる。
-> END

=== after_first ===
# speaker: heroine
{ answer_correct:
「中庭を持つ区画がつながって、宮殿の違う営みがある。うん、これなら、別の門へ移る理由も見える」
- else:
「一つの広場でも、同じ武器庫の繰り返しでもないんですね。字幕、ここで直しておきます」
}
# speaker: narrator
彼女は字幕を直し、門の映像を一つ短くした。ハリッシュの最短経路を思い出し、口元を曲げる。
# speaker: heroine
# reaction: heroine,teasing,music
「あの人に見せたら、まだ遠回りって言われそう」
# speaker: enemy
「私は、次のハワー・マハルで一度止まった。窓のこっちと向こう、同じ説明でいい？」
# speaker: narrator
ラヴィが資料の格子の図を指す。通りの映像から格子越しの眺めへ切り替えるなら、という仮の編集例だった。
# speaker: heroine
「内側からの動画は撮っていません。わたしの映像は外観のまま、見ていた人の立場を字幕で補いたいです」
# speaker: narrator
絵で作る内側の眺めを実際の撮影のようには足さず、二つの視線の違いを確かめる。
-> END

=== after_second ===
# speaker: heroine
{ answer_correct:
「内側の女性は、姿を見られずに街を見られた。窓がたくさんある、だけでは逆の想像もできるんですね」
- else:
「内側からは見られて、街からは姿を見られない。その向きを字幕で取り違えるところでした」
}
# speaker: narrator
窓についての説明を短くしたあと、別の一文を置く。『顔を撮られたくない日もある』。イーシャが匿名で使ってよいと言った言葉だ。
# speaker: enemy
「この人の写真は？」
# speaker: heroine
# emotion: serious
「ありません。撮られたくないって言った人なので。声も、録っていません」
# speaker: narrator
ラヴィは口をつぐみ、文章をもう一度読んだ。
# speaker: enemy
「じゃあ、ここはこのまま。……私も、顔がある方が親切だって決めてたな」
# speaker: narrator
次はシティ・パレスの字幕。王たちが作品を集め、制作を依頼したことは書いてある。彼女は、その先で指を止めた。
# speaker: heroine
「ヴィクラムさんが怒りそう。頼んだ人だけ書いて、作った人がまだ一人もいない」
-> END

=== after_third ===
# speaker: heroine
{ answer_correct:
「宮廷に支えられた芸術家や職人。その仕事があって、品物が生まれたんですね」
- else:
「値踏みした人や今展示する人ではなく、当時の芸術家や作り手の仕事。作られる途中が抜けていました」
}
# speaker: narrator
彼女は作り手について一行を足した。代わりに、建物の名前を二度繰り返していた字幕を消す。
# speaker: enemy
「さっきから、足すたびに何か減らしてるね」
# speaker: heroine
# reaction: heroine,exasperated,sweat
「三分が増えてくれないので。さっき、数字をにらんでみたんですけど」
# speaker: narrator
ラヴィが笑う。彼女はアーグラの歩く場面を再生し、今回はそのまま通り過ぎた。
# speaker: heroine
「ここを詰める方が速いのは、分かってます。でも残すって言ったの、やっぱり変わりません」
# speaker: narrator
最後の候補は、ジャンタル・マンタルの装置から空へ伸びる短い映像。彼女はそこに、説明を一つだけ置こうとする。
# speaker: enemy
「背景の建物として終わらせるのは惜しいね。何をする道具か、ひと言入る？」
-> END

=== after_fourth ===
# speaker: heroine
{ answer_correct:
「望遠鏡を使わず、天体の位置を観測する装置。空の映像へつながる前に、これを置こう」
- else:
「肉眼で天体の位置を測る装置。建物として見上げたわたしの最初の勘違いまで、残すところでした」
}
# speaker: narrator
字幕を置くと、最後の数秒が静かになった。空だけになった画面を、彼女はしばらく見ている。
# speaker: enemy
「最初も空、最後も空。同じ所に戻ったみたいだね」
# speaker: heroine
# reaction: heroine,serious,exclamation
「同じじゃないです。最初は、塔を追い越しちゃった。こっちは、ここまで見てから空を撮りたくなったんです」
# speaker: narrator
言ってから、彼女は少し驚いた顔になった。ラヴィは笑わず、続きを待つ。
# speaker: heroine
「ただ、ここに『同じ空を、みんなが同じように見た』って書くのは、違う気がする」
# speaker: narrator
彼女は最後の字幕を選び直す。観測所へ届いた知識は、どんな人々の積み重ねだったのか。
-> END

=== conclusion ===
# speaker: heroine
{ answer_correct:
「違う科学の伝統が、同じ空を調べながら出会った。始めから、同じ見方だったわけじゃないんですね」
- else:
「ここだけで始まった知識ではなくて、いろんな科学の伝統が出会った場所。最後の説明も、直せました」
}
# speaker: narrator
字幕を短く整える。彼女は録音の印を押したが、準備していた紹介の文章を読む前に止まった。
# speaker: heroine
# emotion: neutral
「旅を通して、わたしは……。違うな。それ、最後まで聞く前に眠くなりそう」
# speaker: enemy
{
- battle_score == 5:
「説明は全部合っていた。それと、最後に何を言うかは、別の話だよ」
- battle_score >= 3:
「確かめた字幕は直った。君の言いたいことまで、私が採点するわけじゃない」
- else:
「取り違えた説明は直せた。今から言うことまで、正解を探さなくていいよ」
}
# speaker: narrator
彼女は画面を閉じ、目の前の装置と空を見た。それからもう一度、録音を始める。
# speaker: heroine
# emotion: smile
「ちょっと待って。わたし、ここをもう一度見たい」
# speaker: narrator
今度は消さなかった。空の映像へ声を重ね、長さを確かめる。三分以内。ラヴィが片手で合図を送り、仲間たちがこちらへ来る。
# speaker: heroine
# reaction: heroine,shy,blush
「紹介は、名前だけお願いします。あとは、わたしが言います」
# speaker: enemy
「私の長い挨拶を、いちばん効率よく切ったね」
# speaker: heroine
# reaction: heroine,teasing,music
「そこは、迷いませんでした」
-> END
