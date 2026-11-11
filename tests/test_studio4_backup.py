"""Owner-only erasure of application backup archives (no auto erasure on roster reset)."""
import asyncio, os, tempfile, unittest
from unittest.mock import patch
import httpx
from api import index

class BackupErasureContract(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        env=patch.dict(os.environ,{'CHICO_LOCAL_SQLITE':'1','CHICO_LOCAL_DATA':self.tmp.name})
        env.start();self.addCleanup(env.stop);index._db=None;self.addCleanup(lambda:setattr(index,'_db',None))
    def test_protected_single_and_all_backups(self):
        async def check():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=index.app),base_url='http://example.test') as c:
                user=await c.post('/api/login',json={'password':'ChicoAdmin'});self.assertEqual(user.status_code,200)
                h={'Authorization':'Bearer '+user.json()['token']}
                b=await c.post('/api/owner/backup',json={},headers=h);self.assertEqual(b.status_code,200,b.text)
                fname=b.json()['filename']
                r=await c.post('/api/owner/backup/delete',json={'filename':fname,'confirmation':'DELETE BACKUP','password':'wrong'},headers=h)
                self.assertEqual(r.status_code,403)
                r=await c.post('/api/owner/backup/delete',json={'filename':fname,'confirmation':'DELETE BACKUP','password':'ChicoAdmin'},headers=h)
                self.assertEqual(r.status_code,200,r.text);self.assertEqual(r.json()['removed'],1)
                b=await c.post('/api/owner/backup',json={},headers=h);self.assertEqual(b.status_code,200,b.text)
                r=await c.post('/api/owner/backup/delete',json={'confirmation':'DELETE BACKUPS','password':'ChicoAdmin'},headers=h)
                self.assertEqual(r.status_code,200,r.text);self.assertGreaterEqual(r.json()['removed'],1)
                report=await c.get('/api/owner/diagnostics',headers=h);self.assertEqual(report.json()['backup_count'],0)
        asyncio.run(check())
