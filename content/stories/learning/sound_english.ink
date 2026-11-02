VAR player_name = ""
VAR heroine_name = ""
VAR topic = ""
# speaker: heroine
{
- topic == "which_subject":
    「Which descriptionが、この文では主語だね。」
    「その後にmatchesが続くから、doは置かないよ。」
- topic == "where_do":
    「whereは場所を尋ねているね。」
    「doの後には主語、最後に動詞のmeetが来るよ。」
- topic == "compared_with":
    「Compared withは、『〜と比べて』という比較の入口だね。」
    「ここでは、濡れた漆喰に描く方法と比べているよ。」
- topic == "sound_why":
    「doesが前に出たから、seemsの最後のsはもういらないよ。」
    「部屋がどう見えるのかをつかんでから、なぜ、と聞くと読みやすいね。」
- topic == "sound_show":
    「this shows somethingと置いてみて。何を、に当たるところがsomethingだね。」
    「そこをwhatにして先頭に出すと、What does this show? になるよ。」
- topic == "sound_freedom":
    「paintingからplasterまでを、ひとまとめの「そうやって描くこと」にしてみよう。」
    「didのあとに長い主語が挟まっても、giveは原形のままだよ。」
- else:
    「この英文のまとまりを一緒に見よう。」
}
-> END
