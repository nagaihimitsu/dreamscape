// 【任意：特殊戦B】特殊戦の観光地の案内（stories/tourism/<接頭辞>_…_guide.ink）。
// - 規則は通常の観光案内と同じ：選択肢・# effect なし、日本語、表示される行は40行以内。
// - 特殊戦は地図の地点から直接始まるため、この案内は観光地の情報として登録しておく。
// - 見本の朝市と人物は架空。
// - 最初の行の # photo: は、朝市の絵（public/assets/album/smp_album_market.webp）をアルバムに入れる例（説明の札なし）。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# background: smp_bg_mihon_market
# speaker: narrator
# photo: smp_album_market
朝市には、色違いの屋根の店が三軒並んでいる。真ん中のパン屋から、焼きたての匂いがした。
# speaker: heroine
# emotion: happy
「わ、いい匂い。……でもあの人、なんだか怒ってない？」
-> END
