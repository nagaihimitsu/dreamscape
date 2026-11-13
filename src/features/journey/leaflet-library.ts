// Leaflet and its stylesheet: a file of their own (src/features/journey/leaflet.ts loads it with the first map), so the
// title page and the story scenes download no map library.
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

export default L;
