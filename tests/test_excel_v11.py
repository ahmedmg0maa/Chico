import sys, tempfile, unittest, pathlib, os
from datetime import date
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from app.core import Database,Conflict
from app.xlsx_import import read_daily_xlsx
SHEET=pathlib.Path(__file__).resolve().parents[1]/'fixtures'/'monday_sheet.xlsx'
class ExcelImportTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.db=Database(pathlib.Path(self.tmp.name)/'data.sqlite3')
 def tearDown(self):self.tmp.cleanup()
 def parsed(self):return read_daily_xlsx(SHEET.read_bytes())
 def mapping(self,parsed):
  d=self.db.preview_excel(parsed);names={m['name'].casefold():m for m in d['members']}; mapping={}
  for row in parsed['rows']:
   name=row['name'].casefold();base=name[3:] if name.startswith('sn.') else name[2:] if name.startswith('m.') else name
   m=names.get(name) or names.get(base)
   mapping[str(row['source_row'])]='id:'+str(m['id']) if m else 'new:Helper' # test-only rank, never auto assigned by product
  return mapping
 def test_totals_and_repeated_import(self):
  p=self.parsed();self.assertEqual(p['totals']['tickets'],1105);self.assertEqual(p['totals']['flags'],25)
  self.assertEqual(len([w for w in p['warnings'] if w['message'].startswith('Excel date')]),7)
  m=self.mapping(p)
  a=self.db.commit_excel(p,m,reset=True,reason='RESET_AND_IMPORT',source_hash='test1')
  self.assertEqual(a['saved'],31)
  out=self.db.view();self.assertEqual(out['totals']['tickets'],1105);self.assertEqual(out['totals']['flags'],25)
  self.assertEqual(round(out['totals']['flag_rate'],2),2.26)
  self.assertEqual([x['name'] for x in out['members'] if x['rank']!='Responsible'][:31], [r['name'] if m[str(r['source_row'])].startswith('new:') else next(x['name'] for x in out['members'] if x['id']==int(m[str(r['source_row'])][3:])) for r in p['rows']])
  again=self.db.commit_excel(p,self.mapping(p),source_hash='test1')
  self.assertEqual(again['unchanged'],31)
  self.assertEqual(self.db.view()['totals']['tickets'],1105)
 def test_rollback_wrong_mapping(self):
  p=self.parsed();mapping=self.mapping(p)
  first=p['rows'][0]['source_row'];second=p['rows'][1]['source_row'];mapping[str(second)]=mapping[str(first)]
  with self.assertRaises(Conflict):self.db.commit_excel(p,mapping,reset=True,reason='RESET_AND_IMPORT')
  with self.db.conn() as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM entries').fetchone()[0],0)
 def test_opening_correction(self):
  p=self.parsed();m=self.mapping(p);self.db.commit_excel(p,m,reset=True,reason='RESET_AND_IMPORT')
  row=next(r for r in p['rows'] if r['flags']>0)
  mid=int(m[str(row['source_row'])][3:]) if m[str(row['source_row'])].startswith('id:') else None
  if mid is None:
   with self.db.conn() as c:mid=c.execute('SELECT id FROM members WHERE name=?',(row['name'],)).fetchone()[0]
  preview=self.db.preview_opening_correction(mid,row['previous_flags']-1)
  self.assertEqual(preview['delta'],1)
  self.db.set_openings([{'member_id':mid,'flags_base':row['previous_flags']-1}],reason='corrected baseline')
  self.assertEqual(self.db.view()['totals']['flags'],26)
if __name__=='__main__':unittest.main()
