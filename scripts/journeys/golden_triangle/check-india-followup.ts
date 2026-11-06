import { readIndiaFollowup, validateIndiaFollowup } from "./india-followup";

const counts = validateIndiaFollowup(readIndiaFollowup(process.cwd()));
console.log(`India research OK: ${counts.venues} venue records, ${counts.access} access records, ${counts.transit} transport records, ${counts.images} image candidates, ${counts.alternatives} alternatives. Research only.`);
