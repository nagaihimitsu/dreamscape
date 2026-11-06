// 観光案内（stories/tourism/<接頭辞>_…_guide.ink）：観光地で最初に読む短い案内。
// - 選択肢と # effect は置かない。日本語で、表示される行は40行以内。
// - 名前は {player_name}・{heroine_name}・{player_address} の変数で書き、ベタ書きしない。
// - クイズの答えはここで明かさず、「何を知りたいか」という問いで終える。
// - # background: には romance/presentation.json の背景ID、# speaker: には narrator・heroine・player・enemy を使う。
// - 見本の街・人物・言い伝えはすべて架空。本番の旅行編では実在の観光地と確認した出典に置き換える。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# background: smp_bg_mihon_clock_tower
# speaker: narrator
広場の真ん中に、見本の街の時計塔が立っている。文字盤の針は三時を指していた。
# speaker: heroine
# reaction: heroine,surprised,question
「あれ、三時？　宿を出たの、朝だったよね」
# speaker: narrator
{heroine_name}は自分の時計と文字盤を見比べた。塔の針は、少しも動かない。
# speaker: heroine
「止まってるんだ。でも塔の下はきれいに掃いてある。放っておかれてる感じじゃないね」
# speaker: narrator
塔の扉の前で、作業着の青年が油差しを手に、文字盤を見上げている。
# speaker: heroine
# emotion: smile
「直さないのか、直せないのか。……わたし、ちょっと聞いてみたい」
-> END
