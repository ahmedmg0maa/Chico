"""Studio 4 integration: owner password, no seeded statistics, complete editing and clearing."""
import asyncio,os,tempfile,unittest
from unittest.mock import patch
import httpx
from api import index

class Studio4Contract(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  env=patch.dict(os.environ,{'CHICO_LOCAL_SQLITE':'1','CHICO_LOCAL_DATA':self.tmp.name})
  env.start();self.addCleanup(env.stop);index._db=None;self.addCleanup(lambda:setattr(index,'_db',None))
 def test_only_owner_password_and_complete_edits_reset(self):
  async def run():
   async with httpx.AsyncClient(transport=httpx.ASGITransport(app=index.app),base_url='http://example.test') as c:
    async def post(path, data=None,token=None):
     h={'Authorization':'Bearer '+token} if token else {}
     return await c.post('/api/'+path,json=data or {},headers=h)
    self.assertEqual((await post('login',{'password':'ChicoTop1'})).status_code,401)
    login=await post('login',{'password':'ChicoAdmin'});self.assertEqual(login.status_code,200)
    token=login.json()['token'];h={'Authorization':'Bearer '+token}
    async def state():
     r=await c.get('/api/state',headers=h);self.assertEqual(r.status_code,200,r.text);return r.json()
    d=await state();self.assertEqual(d['totals']['tickets_observations'],0)
    self.assertEqual(d['totals']['flags_observations'],0)
    self.assertEqual(d['totals']['rate_observations'],0)
    self.assertTrue(d['members']);self.assertEqual(d['access_role'],'owner')
    add=await post('members/add',{'name':'TestModerator','rank':'Moderator'},token)
    self.assertEqual(add.status_code,200,add.text)
    m=next(m for m in (await state())['members'] if m['name']=='TestModerator')
    edited=await post('members/manage',{'id':m['id'],'name':'TestHelper','rank':'Helper','active':True,'reporting':False,'display_order':2},token)
    self.assertEqual(edited.status_code,200,edited.text)
    m=next(m for m in (await state())['members'] if m['id']==m['id']) if False else next(x for x in (await state())['members'] if x['name']=='TestHelper')
    self.assertEqual(m['rank'],'Helper');self.assertFalse(m['reporting'])
    day=(await state())['today'];w=(await state())['week']
    if w['starts']<=day<=w['ends']:
     r=await post('entry',{'from':day,'to':day,'rows':[{'member_id':m['id'],'start_on':day,'end_on':day,'mode':'direct','tickets':9,'opening_flags':0,'flags_counter':2,'rate':4.7,'hours':1.5}]},token)
     self.assertEqual(r.status_code,200,r.text)
     d=await state();self.assertGreater(d['totals']['tickets'],0)
     m=next(x for x in d['members'] if x['name']=='TestHelper')
     self.assertEqual(m['entry_count'],1);self.assertEqual(m['daily_ratings'][0]['rate'],4.7)
     r=await post('records/delete',{'kind':'rating','id':m['daily_ratings'][0]['id'],'confirm':'DELETE'},token)
     self.assertEqual(r.status_code,200,r.text)
     r=await post('records/delete',{'kind':'entry','id':m['data'][0]['id'],'confirm':'DELETE'},token)
     self.assertEqual(r.status_code,200,r.text)
     d=await state();m=next(x for x in d['members'] if x['name']=='TestHelper')
     self.assertEqual(m['entry_count'],0);self.assertEqual(m['daily_ratings'],[])
    before=len((await state())['members'])
    r=await post('data/reset',{'scope':'statistics','confirmation':'RESET STATS','password':'ChicoAdmin'},token)
    self.assertEqual(r.status_code,200,r.text)
    d=await state();self.assertEqual(len(d['members']),before)
    self.assertTrue(all(x['entry_count']==0 for x in d['members']))
    self.assertEqual(len(d['snapshots']),0)
    self.assertEqual((await post('data/reset',{'scope':'all','confirmation':'DELETE ALL','password':'wrong'},token)).status_code,403)
    r=await post('data/reset',{'scope':'all','confirmation':'DELETE ALL','password':'ChicoAdmin'},token)
    self.assertEqual(r.status_code,200,r.text)
    d=await state();self.assertEqual(len(d['members']),0)
    self.assertEqual(d['totals']['tickets_observations'],0)
    # Reopening the database cannot quietly re-create deleted default members.
    index._db=None
    d=await state();self.assertEqual(len(d['members']),0)
    add=await post('members/add',{'name':'NewOne','rank':'Helper'},token)
    self.assertEqual(add.status_code,200,add.text)
    d=await state();self.assertEqual(len(d['members']),1)
    self.assertEqual((await post('members/delete',{'id':d['members'][0]['id'],'confirm':'DELETE'},token)).status_code,200)
    self.assertEqual(len((await state())['members']),0)
  asyncio.run(run())
