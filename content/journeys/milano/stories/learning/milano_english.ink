// 英語ノートの解説（learning/details.json の storyId がこのファイルを指す）。『最後の晩餐』の通常戦3問の話題（topic）ごとに分かれる。
// 場面（時点に置く出来事）ではないので、場所のファイルには入れない。どの問題も使わない話題は置かない（2026-11-13 に3つ消した）。
VAR player_name = ""
VAR heroine_name = ""
VAR topic = ""
# speaker: heroine
{
- topic == "sound_why":
    doesが前に出たから、seemsの最後のsはもういらないよ
    部屋がどう見えるのかをつかんでから、なぜ、と聞くと読みやすいね
- topic == "sound_show":
    this shows somethingと置いてみて。何を、に当たるところがsomethingだね
    そこをwhatにして先頭に出すと、What does this show? になるよ
- topic == "sound_freedom":
    paintingからplasterまでを、ひとまとめの「そうやって描くこと」にしてみよう
    didのあとに長い主語が挟まっても、giveは原形のままだよ
- else:
    この英文のまとまりを一緒に見よう
}
-> END
