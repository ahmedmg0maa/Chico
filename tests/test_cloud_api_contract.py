"""Offline API integration tests using a throwaway SQLite store.

Cloud PostgreSQL must additionally be tested against a live staging Supabase project.
"""
import asyncio
import base64
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import httpx
from api import index

ROOT=Path(__file__).resolve().parents[1]

class APIContract(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.e=patch.dict(os.environ,{'CHICO_LOCAL_SQLITE':'1','CHICO_LOCAL_DATA':self.tmp.name})
  self.e.start();self.addCleanup(self.e.stop)
  index._db=None
  self.addCleanup(lambda:setattr(index,'_db',None))
 def test_login_auth_import_and_permissions(self):
  async def task():
   async with httpx.AsyncClient(transport=httpx.ASGITransport(app=index.app),base_url='http://chico.invalid') as client:
    self.assertEqual((await client.get('/api/state')).status_code,401)
    self.assertEqual((await client.post('/api/login',json={'password':'wrong'})).status_code,401)
    res=await client.post('/api/login',json={'password':'ChicoAdmin'})
    self.assertEqual(res.status_code,200)
    headers={'Authorization':'Bearer '+res.json()['token']}
    state=(await client.get('/api/state',headers=headers)).json()
    self.assertEqual(state['totals']['tickets'],0)
    self.assertEqual(state['access_role'],'owner')
    raw=(ROOT/'fixtures'/'monday_sheet.xlsx').read_bytes()
    preview=await client.post('/api/import/preview',headers=headers,json={'data':base64.b64encode(raw).decode()})
    self.assertEqual(preview.status_code,200)
    parsed=preview.json();self.assertEqual(parsed['parsed']['totals']['tickets'],1105)
    known={x['name'].casefold():x for x in parsed['members']}
    mapping={}
    for r in parsed['parsed']['rows']:
     name=r['name'].casefold()
     stripped=name[3:] if name.startswith('sn.') else name[2:] if name.startswith('m.') else name
     member=known.get(name) or known.get(stripped)
     mapping[str(r['source_row'])]='id:'+str(member['id']) if member else 'new:Helper'
    saved=await client.post('/api/import/commit',headers=headers,json={'ticket':parsed['ticket'],'mapping':mapping,'reset':True,'owner_password':'ChicoAdmin'})
    self.assertEqual(saved.status_code,200,saved.text)
    view=(await client.get('/api/state',headers=headers)).json()
    self.assertEqual(view['totals']['tickets'],1105)
    self.assertEqual(view['totals']['flags'],25)
    self.assertAlmostEqual(view['totals']['flag_rate'],2.26,places=2)
    self.assertEqual((await client.post('/api/import/commit',headers=headers,json={'ticket':parsed['ticket'],'mapping':mapping})).status_code,409)
    team=await client.post('/api/login',json={'password':'ChicoTop1'})
    self.assertEqual(team.status_code,401)  # Studio 4: owner password only
    self.assertEqual((await client.post('/api/members/add',json={'name':'illegal','rank':'Helper'})).status_code,401)
    self.assertEqual((await client.post('/api/close',json={'confirmed':True,'leader':{}})).status_code,401)
  asyncio.run(task())

if __name__=='__main__':unittest.main()
