INCLUDE modules.ink
# background: gt_bg_delhi_red_fort
# speaker: narrator
城門の奥、天井のある古い商店街チャッタ・チョーク。{heroine_name}が腕輪の棚に手を伸ばしたとき、紺のセーターの波が押し寄せた。
# speaker: narrator
十二、三歳の子どもたち。四十人近く。全員がノートを開き、全員が同時に言った。
# speaker: gt_delhi_red_fort_children
インタビュー、プリーズ！
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
えっ、えっ、わたし？　待って、四十人？
# speaker: enemy
# reaction: enemy,sigh
三十八人です。二人はトイレ。……すみません、引率のニディです
# speaker: narrator
ショールを肩に掛け直した女性が、笛を首から下げたまま頭を下げる。下げ方が速い。謝り慣れている。
# speaker: enemy
英語の宿題なんです。『外国人観光客に遺産について質問する』。一時半にバスが出ます。さっき韓国の団体に逃げられました
# speaker: heroine
# emotion: worried
逃げたくなる気持ちも、ちょっと分かります……
# speaker: enemy
分かります。わたしも毎日逃げたい。でも、この子たちを手ぶらで帰すと、帰りのバスが地獄になるんです
# speaker: narrator
先生の背後で、子どもたちが押し合う。誰が最初に聞くかで、もう小さな戦争が始まっていた。
# speaker: heroine
# emotion: serious
……分かりました。でも一人ずつ、順番に。押さないって約束してくれるなら
# speaker: enemy
# reaction: enemy,exclamation
聞いた？　一列！　約束を破った人は、バスで歌を歌ってもらいます
# speaker: narrator
一瞬で列ができた。歌はよほど嫌らしい。先頭は三つ編みの女の子。ノートの文字は几帳面で、質問には番号まで振ってある。
# speaker: gt_anjali
学級委員のアンジャリです。質問は、番号順にします
# speaker: narrator
列の最後に、一人だけノートを閉じたままの少年がいる。前の子の背中ばかり見ていた。
# speaker: narrator
アンジャリが胸を張り、宮殿の奥、白い大理石の広間を指さした。外国人がどれくらい知っているか、試す顔だった。
-> quiz(1) ->
# background: gt_bg_delhi_red_fort
{ quiz_correct:
    # speaker: narrator
    アンジャリの眉が、少しだけ下がった。外国人が知っていたのが、ほんの少し悔しいらしい。それでもすぐに付け足す。
    # speaker: gt_anjali
    書いたのはアミール・フスローです！
- else:
    # speaker: narrator
    アンジャリが勝ち誇って正解を読み上げる。
    # speaker: gt_anjali
    地上に楽園があるなら、それはここ！　書いたのはアミール・フスローです！
}
# speaker: narrator
列の最後で、閉じたノートの少年が何か言った。声が小さすぎて、隣の子にしか届かない。
# speaker: narrator
隣の子が大声で通訳した。
# speaker: gt_delhi_red_fort_classmate
ファイズが、『誰が書いたかは分かってない』って！
# speaker: narrator
アンジャリが振り返って睨む。少年は首をすくめ、それきり何も言わなかった。何人かが笑った。
# speaker: heroine
# emotion: worried
先生。今の子は……
# speaker: enemy
ファイズ。話しません。去年の春から、授業で一度も
# speaker: narrator
先生は腕時計を見ながら言った。冷たいというより、もう何度も同じ説明をした人の速さだった。
# speaker: enemy
次！　ソーヌー！
# speaker: narrator
二番手の男の子が、敬礼したまま前に出る。敬礼の角度が妙に本格的で、周りがまた笑った。
-> quiz(2) ->
# background: gt_bg_delhi_red_fort
{ quiz_correct:
    # speaker: gt_sonu
    正解！
    # speaker: narrator
    ソーヌーはそう叫んで、城壁に向かって演説の真似を始めた。手振りが大きすぎて、土産物屋の棚の鈴が一斉に鳴った。
- else:
    # speaker: gt_sonu
    ブブー
    # speaker: narrator
    ソーヌーはそう言って、城壁の上で国旗を掲げる首相の真似を始めた。手振りが大きすぎて、土産物屋の棚の鈴が一斉に鳴った。
}
# speaker: enemy
# reaction: enemy,anger
ソーヌー！　鈴の代金はお父さんに請求します！　……はい、ここまで。バスに向かいます
# speaker: narrator
列が崩れて歩き出す。最後の少年もノートを抱えて歩き出した。一度も開かないまま。
# speaker: heroine
# emotion: serious
待ってください。まだ質問していない子がいます
# speaker: enemy
三十八人と一時間です。話さない子を待つ時間は、わたしにはないんです
# speaker: heroine
じゃあ、わたしの時間を使います。一分だけ。……押したりしません。待つだけです
# speaker: narrator
先生は口を開きかけ、閉じた。腕時計を見て、もう一度{heroine_name}を見る。
# speaker: enemy
# reaction: enemy,sigh
……一分です。あなたが無駄にした一分は、あとで生徒に恨まれますよ
# speaker: narrator
{heroine_name}は少年の前にしゃがんだ。目の高さが合う。何も聞かず、ただ待つ。
# speaker: narrator
三十秒。ファイズはノートを開き、一行書いて、こちらへ向けた。それから、かすれた声で読み上げた。
# speaker: gt_faiz
この楽園に住んでいた人は、ここで、どうなったの
# speaker: narrator
騒いでいた子どもたちが、一人ずつ黙っていった。
-> quiz(3) ->
# background: gt_bg_delhi_red_fort
{ quiz_correct:
    # speaker: narrator
    ファイズの目が、初めてまっすぐこちらを見た。そして、続きを自分で話し始めた。
    # speaker: gt_faiz
    最後の皇帝。詩を書く人だった。自分の家で、裁判にかけられて、遠くへ送られた
- else:
    # speaker: narrator
    ファイズは小さく首を振り、答えを自分で話し始めた。
    # speaker: gt_faiz
    最後の皇帝は、自分の家で裁判にかけられた。詩を書く人だった。それから、遠くへ送られた
}
# speaker: narrator
声は小さい。けれど、もう途切れなかった。楽園と書かれた広間の主が、同じ建物で囚人になった話。三十八人が、誰も茶化さずに聞いていた。
# speaker: heroine
# reaction: heroine,surprised,sparkle
すごい。わたし、今の話、一生忘れないと思う
{
- battle_score == 3:
    # speaker: narrator
    アンジャリが列から叫ぶ。
    # speaker: gt_anjali
    外国の人、全問正解！　ずるい、来年もう一回勝負して！
- battle_score == 2:
    # speaker: narrator
    アンジャリが指を二本立てる。
    # speaker: gt_anjali
    二問正解。外国の人にしては、まあまあです
- else:
    # speaker: narrator
    ソーヌーが胸を叩く。
    # speaker: gt_sonu
    大丈夫！　バスで僕がインドの歴史を全部教えるから、乗っていって！
}
# speaker: enemy
……あの子、去年から一度も、授業で手を挙げなかったんです
# speaker: narrator
先生はノートに何か書きつけ、すぐ顔を上げた。感動した顔ではなかった。
# speaker: enemy
でも、明日になったら、また黙りますよ。あなたは明日ここにいない。毎日あの子の隣にいるのは、わたしです
# speaker: heroine
# emotion: serious
はい。……だから、先生に見ていてほしかったんです。今日、あの子が話したところ
# speaker: narrator
先生は答えず、笛を鳴らした。列が動き出す。歩きながら、一度だけ振り返った。
# speaker: enemy
さっき三十八人と言いましたけど。聞いていたのは、三十九人でした
# speaker: narrator
バスへ向かう列の最後、ファイズがノートを胸に抱えて歩いていく。閉じたノートの端から、さっきの一行がはみ出していた。
-> END
