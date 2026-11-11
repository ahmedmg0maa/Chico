"""Regression tests for the v1.0 reporting semantics using isolated SQLite files."""
import tempfile, unittest
from datetime import date
from unittest.mock import patch
from pathlib import Path
from app.core import Database, Conflict

class TestRelease10(unittest.TestCase):
 def setUp(self):
  p=patch.object(Database, "today", lambda _:date(2026,11,8));p.start();self.addCleanup(p.stop)
  self.dir=tempfile.TemporaryDirectory();self.addCleanup(self.dir.cleanup)
  self.db=Database(Path(self.dir.name)/'chico.sqlite3')
  self.db.today=lambda:date(2026,11,8)
  self.week=self.db.view()['week'];self.assertEqual(self.week['starts'],'2026-11-02')
  self.mid=next(m['id'] for m in self.db.view()['members'] if m['name']=='Sherlock')
 def entry(self,start,end,tickets=None,counter=None,flags=None,opening=None,expected=None,rate=None):
  r={'member_id':self.mid,'mode':'counter' if counter is not None else 'direct','start_on':start,'end_on':end,'tickets':tickets,'tickets_counter':counter,'flags_counter':flags,'opening_flags':opening,'expected':expected,'rate':rate}
  return self.db.save_batch(start,end,[r])['saved'][0]
 def test_rate_backdated_once_and_correctable(self):
  r=self.db.save_ratings('2026-11-02',[{'member_id':self.mid,'rate':4.5}])
  rev=r['saved'][0]['revision']
  self.db.save_ratings('2026-11-02',[{'member_id':self.mid,'rate':4.9,'expected':rev}])
  m=next(x for x in self.db.view()['members'] if x['id']==self.mid)
  self.assertEqual(len(m['daily_ratings']),1)
  self.assertEqual(m['daily_ratings'][0]['rate'],4.9)
  self.assertEqual(m['daily_ratings'][0]['evaluation_date'],'2026-11-02')
  self.assertEqual(self.db.period_view('2026-11-02','2026-11-02')['totals']['rate'],4.9)
  with self.assertRaises(Conflict):self.db.save_ratings('2026-11-02',[{'member_id':self.mid,'rate':3.8,'expected':rev}])
 def test_flag_rate_and_old_entry_correction_reflows(self):
  first=self.entry('2026-11-02','2026-11-02',counter=100,flags=1200,opening=1000)
  second=self.entry('2026-11-03','2026-11-03',counter=180,flags=1350)
  self.assertEqual(self.db.view()['totals']['tickets'],180)
  self.assertEqual(self.db.view()['totals']['flags'],350)
  self.assertEqual(self.db.view()['totals']['flag_rate'],194.44)
  revised=self.entry('2026-11-02','2026-11-02',counter=90,flags=1100,expected=first['revision'])
  report=self.db.view();m=next(x for x in report['members'] if x['id']==self.mid)
  self.assertEqual(report['totals']['tickets'],180)
  self.assertEqual(report['totals']['flags'],350)
  self.assertEqual([(r['tickets'],r['flags']) for r in sorted(m['data'],key=lambda x:x['start_on'])],[(90,100),(90,250)])
  self.assertEqual(revised['flags'],100)
 def test_period_overlap_is_disclosed_not_allocated(self):
  self.entry('2026-11-02','2026-11-03',counter=70,flags=1200,opening=1000)
  d=self.db.period_view('2026-11-02','2026-11-02')
  self.assertEqual(d['totals']['tickets'],0)
  self.assertEqual(len(d['overlapping_intervals']),1)
  self.assertIsNone(d['totals']['flag_rate'])
 def test_historical_rank_preserved_after_promotion(self):
  self.entry('2026-11-02','2026-11-02',tickets=40)
  self.db.edit_member(self.mid,'rank',rank='Moderator',effective_on='2026-11-03')
  self.entry('2026-11-03','2026-11-03',tickets=60)
  r=self.db.view();m=next(x for x in r['members'] if x['id']==self.mid)
  self.assertEqual(m['tickets_by_rank']['SN.Helper'],40)
  self.assertEqual(m['tickets_by_rank']['Moderator'],60)
  self.assertEqual(r['totals']['team_tickets'],100)
 def test_manual_close_only_and_stepwise_weeks(self):
  self.db.today=lambda:date(2026,11,16)
  self.assertEqual(self.db.view()['week']['starts'],'2026-11-02')
  self.assertEqual(self.db.view()['week']['status'],'open')
  self.db.close_week({},confirmed=True)
  self.assertEqual(self.db.view()['week']['starts'],'2026-11-09')
  self.db.close_week({},confirmed=True)
  self.assertEqual(self.db.view()['week']['starts'],'2026-11-16')
 def test_named_accounts_and_revocation(self):
  self.db.upsert_account('admin_one','Super-Secure-Pass-1234','owner')
  tok=self.db.login('Super-Secure-Pass-1234','admin_one')
  self.assertEqual(self.db.auth_role(tok),'owner')
  self.assertEqual(self.db.auth_actor(tok),'admin_one')
  self.db.set_account('admin_one',active=False)
  self.assertIsNone(self.db.auth_role(tok))
  self.assertIsNone(self.db.login('Super-Secure-Pass-1234','admin_one'))
 def test_shift_persists_and_history(self):
  self.db.save_shift(self.mid,'Morning','2026-11-02')
  self.db.save_shift(self.mid,'Evening','2026-11-04')
  m=next(x for x in self.db.view()['members'] if x['id']==self.mid)
  self.assertEqual(len(m['shift_history']),2)
  self.assertEqual(m['shift'],'Evening')

if __name__=='__main__':unittest.main()
