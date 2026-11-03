"""Run with python -m unittest discover -s tests (dependencies: networkx, shapely, pyproj)."""
import sys,unittest,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from route_on_osm_xml import build_route_candidates,allowed_directions

OSM='''<?xml version="1.0" encoding="UTF-8"?><osm version="0.6">
<node id="1" lat="28.650000" lon="77.230000"/>
<node id="2" lat="28.650000" lon="77.231000"/>
<node id="3" lat="28.651000" lon="77.231000"/>
<node id="4" lat="28.651000" lon="77.230000"/>
<way id="11"><nd ref="1"/><nd ref="2"/><nd ref="3"/><tag k="highway" v="footway"/></way>
<way id="12"><nd ref="3"/><nd ref="4"/><tag k="highway" v="footway"/><tag k="foot" v="private"/></way>
</osm>'''
class TestRouting(unittest.TestCase):
 def test_permissions(self):
  self.assertEqual(allowed_directions({'highway':'motorway'}),(False,False))
  self.assertEqual(allowed_directions({'highway':'footway','foot':'private'}),(False,False))
  self.assertEqual(allowed_directions({'highway':'residential','oneway':'yes'}),(True,True))
  self.assertEqual(allowed_directions({'highway':'footway','oneway:foot':'yes'}),(True,False))
 def test_same_edge_and_disconnected(self):
  with tempfile.TemporaryDirectory() as t:
   p=Path(t)/'network.osm';p.write_text(OSM)
   rows=[{'placeId':'a','cityId':'delhi','latitude':'28.650000','longitude':'77.230100'},
         {'placeId':'b','cityId':'delhi','latitude':'28.650000','longitude':'77.230900'},
         {'placeId':'c','cityId':'delhi','latitude':'28.651000','longitude':'77.230000'}]
   results,features,stats=build_route_candidates(p,rows,max_snap_m=45)
   tab={(r['fromPlaceId'],r['toPlaceId']):r for r in results}
   self.assertEqual(len(results),9)
   self.assertGreater(tab['a','b']['networkMeters'],70)
   self.assertLess(tab['a','b']['networkMeters'],100)
   self.assertEqual(tab['a','c']['status'],'ANCHOR_TOO_FAR_FROM_OSM_WALKWAY')
   self.assertFalse(tab['a','b']['productionReady'])
   self.assertEqual(len(features),2) # a<->b, no graph path to c due to closed segment
if __name__=='__main__':unittest.main()
