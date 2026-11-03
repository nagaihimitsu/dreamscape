# 施設営業時間と曜日制約

## 必須の扱い
- タージ・マハル：金曜は一般見学不可。日の出30分前から日没30分前まで（政府案内）。早朝開始を前提にすることで本来の観光価値を表現できる。通常開場と特別な満月夜間観覧は区別。 https://agra.nic.in/tourist-place/tajmahal/
- **タージ特別夜間見学**：満月と前後2日、金曜とラマダン月を除く。公式サイトの20:00–23:59（30分×8枠、定員50/枠）とAgra地区政府の20:30–00:30が矛盾する。予約制・身分証・Shilpgramでの事前集合が必要。公式確認先 https://www.tajmahal.gov.in/night-view.aspx 。
- Agra Fort/Fatehpur Sikriなど：日の出〜日没と紹介される。朝夕の具体的「6:00～18:00」の一律固定はしない。
- Red Fort：**2026年2月13日ASI指示で月曜休館を廃止**。以前の政府教育サイト・観光省サイトには『月曜休み』が残る。現行実務は毎日開場だが、09:30–16:30の時間は改めて照合する。2026年PTI報道 https://www.business-standard.com/india-news/red-fort-to-remain-open-on-all-days-of-week-asi-126022100547_1.html
- Qutb Minar：Delhi Tourismページは日の出〜20時の案内。 https://delhitourism.gov.in/tourist_place/qutab_minar.html
- Humayun Tomb：Delhi Tourismのページ間で日の出〜日没 vs 日の出〜19:30、入場料 40/600 vs 35/550 の**不一致**。真実を決めつけず現場・ASIチケットページで照合。両資料は `ENTRANCE_FEES.csv` に併記。
- Lotus Temple：火曜～日曜09:00–17:30、月曜休館。 https://delhitourism.gov.in/tourist_place/bahai_temple.html
- Jama Masjid：礼拝用途優先。外国人観光08:00〜日没、インド人11:00〜日没と観光局掲載。祈りの時刻による制限は別。 https://delhitourism.gov.in/tourist_place/jama_masjid.html
- Chandni Chowk：市場店舗はおおむね10:30–21:00、一部日曜休業。ただし通りそのものを閉める意味でない。 https://delhitourism.gov.in/dt/delhi_delicacies/chandni_chowk.html
- Amber Palace：政府観光局サイトで08:00–17:30。夜の音と光のショーは10–2月（英18:30、印19:30）、3–4月（英19:00、印20:00）、5–9月（英19:30、印20:30）を掲載。ただし10月1–10日例外あり。 https://www.tourism.rajasthan.gov.in/jaipur.html
- Jaipur Jantar Mantar：政府観光局の古いページと2026年料金改定報道が共存。価格は最新確認が必要。開場時刻も当日確認。

## 時間モデル比較
A. 09–21維持：コード変更最少だがタージの本質的な早朝、朝のロディ庭園、交通接続に弱い。
B. インドのみ早朝：比較的容易。都市×開始時刻の例外が増えれば改修が散る。
C. **開始時刻・時間窓を設定可能にする（推奨）**：旅単位のdayStart/dayEnd/overnight minute + 施設ごとの weekday/season windows を導入。最初はインド編のみ適用、旧ミラノの値を既定値として維持。日にちの固定がないゲームの「曜日」にはゲーム内暦の根拠が必要で、現段階では曜日を実装するときだけ正確に定義する。

構造の拡張案：`openingHoursRules[{weekday, season, solarOffset, opens, closes, restrictions}]` と `startWindows`/`endWindows` の判定を合成。`dayStart`と`dayEnd`は旅行編/都市設定。日没を実時刻へ換算するには都市・日付・時区が必要。物語イベント時間は未確定のため設定しない。
