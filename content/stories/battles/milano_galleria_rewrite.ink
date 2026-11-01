// 出典確認 2026-11-01: https://www.italia.it/en/lombardy/milan/vittorio-emanuele-ii-gallery （通路・鉄骨）
// 出典確認 2026-11-01: https://www.in-lombardia.it/en/tourism-in-lombardy/tourism-milan/monuments-milan/vittorio-emanuele-gallery （鉄とガラス）
// 出典確認 2026-11-01: https://www.euronews.com/2026/05/29/a-real-bull-ache-milan-restores-a-national-treasures-family-jewels （雄牛とトリノ）
// 架空の土産売りとガッレリア。史実の根拠はクイズの各sourcesを参照。
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
# background: milano_galleria
# speaker: narrator
ガッレリアの入口で、土産売りが小さな牛のカードを差し出した。
# speaker: enemy
「ミラノの幸運を持ち帰りません？　この牛、ミラノの紋章ですから」
# speaker: heroine
「待って。床の案内には、別の街の名前が書いてあったような」
# speaker: enemy
「レナータよ。よく見てるのね。でも旅の記念は、細かい話より楽しい方が売れるの」
# speaker: heroine
「楽しいのは好きです。でも違うなら、知らずに買う人が困ります」
# speaker: enemy
「じゃあ確かめましょうか。その牛が、どこの街のものか」
-> END

=== after_first ===
# background: milano_galleria
{ answer_correct:
    # speaker: enemy
    「ええ、トリノ。そこまで見られてたとはね」
    # speaker: heroine
    「やっぱり。さっき名前を読み間違えたのかと思いました」
- else:
    # speaker: enemy
    「トリノよ。ミラノの床にいるから、間違えやすいでしょう？」
    # speaker: heroine
    「だからって、違うと知っていて売るのは困ります」
}
# speaker: enemy
「『ミラノで買えるトリノの牛』。長くなるけど、それなら嘘じゃない」
# speaker: narrator
レナータはカードの裏に何かを書き足した。値札は隠したままだ。
# speaker: heroine
「今の、ちゃんと読ませてくださいね」
# speaker: enemy
「目がいいのね。じゃあ次は頭上を見て。この屋根、何でできているかしら」
-> END

=== after_second ===
# background: milano_galleria
{ answer_correct:
    # speaker: enemy
    「鉄の骨組みにガラス。知ってるわ。この明るさが、カードをきれいに見せるもの」
- else:
    # speaker: enemy
    「鉄とガラスよ。曇りの日でも、ここなら絵柄が見やすいの」
}
# speaker: heroine
「屋根を見上げたら、値札を隠した手も見えました」
# speaker: enemy
「そっちも見てたの？　商売しにくいお客さん」
# speaker: narrator
彼女は笑ったが、カードを引く手は早い。
# speaker: enemy
「最後。ここが店の集まりだってこと以外に、どんな場所か分かる？」
-> END

=== conclusion ===
# background: milano_galleria
{ answer_correct:
    # speaker: enemy
    「二つの広場をつなぐ道。そうよ。お客さんも、買わない人も通る」
- else:
    # speaker: enemy
    「ドゥオモ広場とスカラ広場をつなぐ道よ。買い物しなくても通れるの」
}
# speaker: heroine
「なら、私たちは買わずに通ります。カードの説明も、ちゃんと直してください」
{
- battle_score == 3:
    # speaker: enemy
    「全部ご存じね。今日は私の売り文句より、あなたたちの目が勝ったわ」
    # speaker: narrator
    レナータは値札を表に返したが、次の通行人にも声をかけた。
    # speaker: enemy
    「トリノの牛のカード、いかが？　幸運の保証はつけません」
- battle_score == 2:
    # speaker: enemy
    「一つ迷っても、買うかどうかは別なのね。そこは手強いわ」
    # speaker: narrator
    レナータは値札を表に返すと、次の人へカードを差し出した。
    # speaker: enemy
    「トリノの牛よ。ミラノの通りで買えます」
- else:
    # speaker: enemy
    「知らないことがあっても、断るのはお上手ね」
    # speaker: narrator
    レナータはカードを引っ込め、別の通行人へ向いた。商売をやめる気はないらしい。
    # speaker: enemy
    「トリノの牛。よかったら、値段を見ていって」
}
# speaker: heroine
「危なかった。きれいな絵だと思って、値段を聞く前に手が出そうだった」
「{player_address}、ちょっとあの屋根、もう一回見よう。今度は上だけ」
-> END
