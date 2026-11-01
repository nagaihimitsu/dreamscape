// 出典確認 2026-11-01: https://www.duomomilano.it/en/about-us/the-candoglia-quarry/ （石材・水運）
// 出典確認 2026-11-01: https://www.duomomilano.it/en/spire/s-giorgio-carelli-spire/ （聖ゲオルギウス像）
// 大聖堂の資料を準備する案内係。史実の根拠はクイズの各sourcesを参照。
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
# background: milano_duomo
# speaker: narrator
広場の片隅で、資料を抱えた男性が紙を取り落とした。{heroine_name}が一枚を拾う。
# speaker: heroine
「石の写真ですね。こっちは……花柄？」
# speaker: enemy
「大理石の見本です。花柄にも見えますね。説明係のマッテオです」
「旅行者向けの英語カードを作ったんですが、答えを知っている私には、問題が親切なのか分からなくて」
# speaker: heroine
「じゃあ、試してもいいですか？　{player_address}、一緒に見よう」
# speaker: enemy
「助かります。まず、大聖堂の石から。間違えたら、説明の直しどころが見つかります」
-> END

=== after_first ===
# background: milano_duomo
{ answer_correct:
    # speaker: enemy
    「正解です。カンドーリアの大理石。桃色の筋が入っているんです」
    # speaker: heroine
    「写真だと白く見えたのに、近づくと少し違うんですね」
- else:
    # speaker: enemy
    「答えはカンドーリアの大理石。白い石、とだけ書くと区別しにくいですね」
    # speaker: narrator
    マッテオはカードに小さく線を引き、写真の淡い筋を指した。
    # speaker: heroine
    「同じ白でも、並べると表情が違う。石って難しいな」
}
# speaker: enemy
「次は、その石が大聖堂までどう来たか。広場を見ても、昔の道は分かりにくいんですよ」
-> END

=== after_second ===
# background: milano_duomo
{ answer_correct:
    # speaker: enemy
    「船です。湖と川、運河を通って、街の中まで運ばれました」
    # speaker: heroine
    「今ここに水は見えないのに。地図が一枚、増えた感じ」
- else:
    # speaker: enemy
    「船で湖や川、運河をつないだんです。今の広場には水が見えませんものね」
    # speaker: heroine
    「私、石をずっと荷車に乗せたまま想像してました。船もあったんだ」
}
# speaker: narrator
マッテオは水路を指でなぞろうとして、持っていたカードをまた一枚落とした。
# speaker: enemy
「次で最後です。尖塔にいた聖ゲオルギウス像を、どう守ったと思いますか」
-> END

=== conclusion ===
# background: milano_duomo
{ answer_correct:
    # speaker: enemy
    「そう、傷んだ原像を修復して屋内に置き、尖塔には写しを置きました」
- else:
    # speaker: enemy
    「原像は修復して屋内で保存し、尖塔には写しを置いたんです」
}
# speaker: heroine
「外にいる方だけが、あの像の話じゃないんですね」
{
- battle_score == 3:
    # speaker: enemy
    「三枚とも伝わった。……あ、よかった。昨日書き直してから、ずっと不安で」
    # speaker: narrator
    マッテオはカードを揃え、今度は両手で持った。
    # speaker: heroine
    「そこは書き直さなくてもよさそうですね。落とさない工夫は必要かも」
    # speaker: enemy
    「それは最初に直します」
- battle_score == 2:
    # speaker: enemy
    「一枚、見直してみます。答えより先に、どこで迷ったか知れてよかった」
    # speaker: heroine
    「迷ったところなら、覚えてます。ええと、どの言葉だったかな……」
    # speaker: enemy
    「急がなくて大丈夫です。私もメモを探します」
- else:
    # speaker: enemy
    「私が知っている順番で書いただけでしたね。旅の人がどこで迷うか、もう一度考えます」
    # speaker: heroine
    「私も、当てようとして見落としたところがありました。もう一回、大聖堂を見てもいい？」
    # speaker: enemy
    「ぜひ。カードより大きいので、今度は落としません」
}
# speaker: narrator
{heroine_name}は拾った一枚を返し、改めて大聖堂を見上げた。
-> END
