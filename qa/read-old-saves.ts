import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {validateGameState,advanceDate} from "../src/domain/game";
import {advanceBattle,answerBattle,getActiveBattleContent,selectReasoningClue,submitBattleEvidence} from "../src/domain/battle";
import {advanceTourismGuide} from "../src/domain/tourism";
import {advanceCityEpilogue} from "../src/domain/epilogue";
import {advanceEncounter,finishEncounter} from "../src/domain/encounter";
const root=new URL("./old-saves/",import.meta.url);
let failures=0;
for(const file of readdirSync(fileURLToPath(root))) {
  try {
    let s=validateGameState(JSON.parse(readFileSync(new URL(file,root),"utf8")));
    const revision=s.revision;
    if(s.activeBattle){
      const a=s.activeBattle, c=getActiveBattleContent(a);
      if(a.phase==="reasoning") {
        for(const id of c.battle.reasoning!.correctClueIds)if(!s.activeBattle!.reasoning!.selectedClueIds.includes(id))s=selectReasoningClue(s,id,s.revision);
        s=submitBattleEvidence(s,s.revision);
      }else s=a.phase==="question"?answerBattle(s,c.quiz.questions[a.roundIndex].correctOptionId,s.revision):advanceBattle(s,s.revision);
    }else if(s.activeEncounter) {
      const oldBudget=s.travelBudget;
      for(let i=0;s.activeEncounter&&i<100;i++){
        const a=s.activeEncounter;
        if(a.frame.ended && (a.phase==="outcome" || a.phase==="story"&&file==="cafe-paid.json"))s=finishEncounter(s,s.revision);
        else s=advanceEncounter(s,s.revision);
      }
      assert.equal(s.activeEncounter,null);
      if(file==="cafe-paid.json"){assert.equal(s.travelBudget,oldBudget+2);assert.equal(s.inventory.galleria_souvenir,"held");}
      if(file==="fortune-awarded.json"){assert.equal(s.travelBudget,oldBudget);assert.equal(s.inventory.galleria_ticket,"held");}
    }else if(s.activeTourism)s=advanceTourismGuide(s,s.revision);
    else if(s.activeDate)s=advanceDate(s,s.revision);
    else if(s.activeEpilogue)s=advanceCityEpilogue(s,s.revision);
    assert.ok(s.revision>revision,file+" did not advance");
    validateGameState(JSON.parse(JSON.stringify(s)));
    console.log("OK",file);
  }catch(error){failures++;console.error("FAIL",file,error instanceof Error ? error.message:String(error));}
}
if(failures)process.exitCode=1;
