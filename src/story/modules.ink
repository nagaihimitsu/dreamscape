// The game's module for the place files (stories/places/*.ink; the unified event design, stage 3a).
// Authors do not edit it: every place file starts with INCLUDE modules.ink, and content:build
// compiles each place file with this text. To preview a place file in Inky, put a copy of this
// file next to it (content:build ignores such copies and always uses this one).
// Every variable the game sets is declared here; a place file declares no VAR.
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false
VAR memory_callback = ""
VAR confession_ready = false
VAR confession_result = "deferred"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR answer_correct = false
VAR battle_score = 0
EXTERNAL cond(text)

// Inky's stand-in (always false); the game binds the real cond.
=== function cond(text) ===
~ return false
