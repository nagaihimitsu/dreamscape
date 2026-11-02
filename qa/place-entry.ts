import assert from "node:assert/strict";
import {createGame} from "../src/domain/game";
import {getEncounterAvailability,startEncounter,advanceEncounter,chooseEncounter,validateEncounterState} from "../src/domain/encounter";
const fresh=createGame("ユウ","ミオ");
const first={...fresh,completedEpisodeIds:["milano_duomo_episode"],completedChapters:["milano"]};
// A completed episode in a real save always carries its completed battle.
const second={...first,completedEpisodeIds:[...first.completedEpisodeIds,"milano_galleria_episode"],battleRecords:[{battleId:"milano_galleria_01",firstScore:0,lastScore:0,bestScore:0,attempts:1}]};
assert.equal(getEncounterAvailability(first,"duomo_string").available,true);
assert.equal(getEncounterAvailability(first,"galleria_fortune").available,false);
assert.equal(getEncounterAvailability(second,"galleria_print").available,false);
assert.equal(getEncounterAvailability(second,"galleria_cafe").available,false);
assert.equal(getEncounterAvailability(second,"scala_mint").available,false);
let s=startEncounter(second,"galleria_fortune",()=>100);
for(let i=0;!s.activeEncounter!.frame.choices.length;i++){assert.ok(i<30);s=advanceEncounter(s,s.revision);}
const leave=s.activeEncounter!.frame.choices.find(c=>c.optionId==="leave")!;
s=chooseEncounter(s,leave.index,s.revision);
while(s.activeEncounter){
 assert.equal(s.activeEncounter.phase,"story");
 validateEncounterState(s);
 s=advanceEncounter(s,s.revision);
}
assert.equal(s.ap,0);
assert.deepEqual(s.inventory,{});
assert.deepEqual(s.encounterRewards,{});
assert.deepEqual(s.completedEncounterIds,[]);
assert.ok(getEncounterAvailability(s,"galleria_fortune").available);
assert.ok(getEncounterAvailability({...second,battleRecords:[{battleId:"milano_la_scala_b01",firstScore:0,lastScore:0,bestScore:0,attempts:1}]},"scala_mint").available);
console.log("OK: visited-place entry, pre/post case, dormant new starts, free exit without quiz/AP/draw");
