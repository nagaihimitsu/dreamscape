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
- else:
    「この英文のまとまりを一緒に見よう。」
}
-> END
