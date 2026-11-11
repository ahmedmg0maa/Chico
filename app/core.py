"""CHICO Team 1.0 — owner-hosted reporting database with explicit server-side roles.
All numbers come from user entry. No screenshots or real activity seeded.
"""
from __future__ import annotations
import hashlib, hmac, json, secrets, sqlite3, threading, shutil, os, re
from contextlib import contextmanager, closing
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

RANKS=('Responsible','Administrator','Moderator','SN.Helper','Helper')
ROSTER={
'Responsible':['General'],
'Administrator':['Marwan','Bashar','Nar'],
'Moderator':['Alhassan','Bish','Gambul','Haitham','Sundus','Sirbos','Darklight','Zeroo','Dark','Elyas','Bnammo'],
'SN.Helper':['Sherlock','Gaby','Moody','Gehad'],
'Helper':['Abdullahh','Alrawi','Yoyo','Rey','Mohamad','Kararr','Coconot','Leogirl'],
}

def day(s):
    if not isinstance(s,str): raise ValueError('تاريخ غير صحيح')
    try:return date.fromisoformat(s)
    except (ValueError,TypeError):raise ValueError('تاريخ غير صحيح، استخدم YYYY-MM-DD')

def wk(d):return d-timedelta(days=d.weekday())

def now():return datetime.now(timezone.utc).isoformat(timespec='microseconds')

def num(v,name,lo=0,hi=1_000_000,integer=False,optional=True):
    if v is None or v=='':
        if optional:return None
        raise ValueError(f'{name} مطلوب')
    if isinstance(v,bool):raise ValueError(f'{name} غير صحيح')
    try:f=float(v)
    except (TypeError,ValueError):raise ValueError(f'{name} غير صحيح')
    import math
    if not math.isfinite(f) or not lo<=f<=hi or integer and not f.is_integer():raise ValueError(f'{name} خارج النطاق')
    return int(f) if integer else round(f,3)

class Conflict(Exception):pass

class Database:
 def __init__(self,path:Path, tz='Africa/Cairo'):
    self.path=Path(path);self.path.parent.mkdir(parents=True,exist_ok=True);self.lock=threading.RLock();self._actor=threading.local();self.tzname=tz
    try:self.tz=ZoneInfo(tz)
    except ZoneInfoNotFoundError:
     # Windows embeddable Python has no IANA tzdata; ship the official TZif Cairo rule file.
     fallback=Path(__file__).resolve().parents[1]/'tzdata'/'Africa_Cairo'
     if fallback.is_file():
      with fallback.open('rb') as f:self.tz=ZoneInfo.from_file(f,key=tz)
     else:
      self.tz=None
      self.tzname='SYSTEM LOCAL TIME (Cairo timezone file missing)'
    self.first_password=None
    self._backup_before_upgrade()
    self._backup_before_v11()
    self._setup()
 def _backup_before_upgrade(self):
    """Create verified pre-migration backup before upgrading a 0.x database to 1.0."""
    if not self.path.is_file() or self.path.stat().st_size==0:return
    with sqlite3.connect(self.path,timeout=15) as source:
     try:
      exists=source.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='settings'").fetchone()
      if not exists:return
      migrated=source.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='data_migrations'").fetchone()
      if migrated and source.execute("SELECT 1 FROM data_migrations WHERE name='legacy_ratings_v10'").fetchone():return
     except sqlite3.DatabaseError:
      raise ValueError('قاعدة البيانات الموجودة غير سليمة؛ لا يمكن ترقيتها بأمان')
     folder=self.path.parent/'backups';folder.mkdir(exist_ok=True)
     target=folder/f"CHICO_pre_1_0_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.sqlite3"
     with closing(sqlite3.connect(target)) as dest:source.backup(dest)
     with sqlite3.connect(target) as check:
      if check.execute('PRAGMA integrity_check').fetchone()[0]!='ok':
       target.unlink(missing_ok=True)
       raise ValueError('فشل التحقق من النسخة السابقة للتحديث؛ إيقاف الترقية')
 def _backup_before_v11(self):
    if not self.path.exists() or self.path.stat().st_size==0:return
    with sqlite3.connect(self.path) as source:
     if not source.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='members'").fetchone():return
     columns={x[1] for x in source.execute('PRAGMA table_info(members)')}
     if 'display_order' in columns:return
     folder=self.path.parent/'backups';folder.mkdir(exist_ok=True)
     target=folder/f"CHICO_pre_1_1_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.sqlite3"
     with closing(sqlite3.connect(target)) as dest:source.backup(dest)
     with sqlite3.connect(target) as check:
      if check.execute('PRAGMA integrity_check').fetchone()[0]!='ok':
       target.unlink(missing_ok=True);raise ValueError('فشل إنشاء النسخة الاحتياطية قبل تحديث 1.1')
 def today(self):return datetime.now(self.tz).date()
 @contextmanager
 def conn(self):
    c=sqlite3.connect(self.path,timeout=15);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON');c.execute('PRAGMA busy_timeout=15000')
    try:
     with c:yield c
    finally:c.close()
 def _setup(self):
    with self.conn() as c:
     c.executescript('''
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS members(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE NOT NULL,rank TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,joined_on TEXT,resigned_on TEXT);
      CREATE TABLE IF NOT EXISTS ranks(id INTEGER PRIMARY KEY AUTOINCREMENT,member_id INTEGER NOT NULL REFERENCES members(id),rank TEXT NOT NULL,effective_on TEXT NOT NULL,grace INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS weeks(id INTEGER PRIMARY KEY AUTOINCREMENT,starts TEXT NOT NULL UNIQUE,ends TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',opened_at TEXT,closed_at TEXT,closing_note TEXT,closing_snapshot TEXT);
      CREATE TABLE IF NOT EXISTS openings(week_id INTEGER NOT NULL REFERENCES weeks(id),member_id INTEGER NOT NULL REFERENCES members(id),flags_base INTEGER NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(week_id,member_id));
      CREATE TABLE IF NOT EXISTS entries(id INTEGER PRIMARY KEY AUTOINCREMENT,week_id INTEGER NOT NULL REFERENCES weeks(id),member_id INTEGER NOT NULL REFERENCES members(id),start_on TEXT NOT NULL,end_on TEXT NOT NULL,mode TEXT NOT NULL,tickets INTEGER NOT NULL,tickets_counter INTEGER,previous_tickets INTEGER,flags_counter INTEGER,previous_flags INTEGER,flags INTEGER,rate REAL,hours REAL,note TEXT NOT NULL DEFAULT '',revision TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_entries_person ON entries(member_id,end_on);
      CREATE TABLE IF NOT EXISTS snapshots(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL,week_id INTEGER NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,at TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,expires TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'team',username TEXT);
      CREATE TABLE IF NOT EXISTS users(username TEXT PRIMARY KEY COLLATE NOCASE,password_hash TEXT NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS rate_evaluations(id INTEGER PRIMARY KEY AUTOINCREMENT,week_id INTEGER NOT NULL REFERENCES weeks(id),member_id INTEGER NOT NULL REFERENCES members(id),evaluation_date TEXT NOT NULL,rate REAL NOT NULL,revision TEXT NOT NULL,entered_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(member_id,evaluation_date));
      CREATE TABLE IF NOT EXISTS shift_assignments(id INTEGER PRIMARY KEY AUTOINCREMENT,member_id INTEGER NOT NULL REFERENCES members(id),shift TEXT NOT NULL,effective_on TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS data_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS excel_imports(id INTEGER PRIMARY KEY AUTOINCREMENT,source_hash TEXT NOT NULL,for_date TEXT NOT NULL,rows_count INTEGER NOT NULL,saved_at TEXT NOT NULL,operator TEXT NOT NULL,summary TEXT NOT NULL);

     ''')
     if 'display_order' not in {r['name'] for r in c.execute('PRAGMA table_info(members)')}:
      c.execute('ALTER TABLE members ADD COLUMN display_order INTEGER NOT NULL DEFAULT 10000')
     if 'in_reporting' not in {r['name'] for r in c.execute('PRAGMA table_info(members)')}:
      c.execute('ALTER TABLE members ADD COLUMN in_reporting INTEGER NOT NULL DEFAULT 1')
     # Bring legacy dated Rates into a day-keyed canonical table, preserving the original entry records.
     if not c.execute("SELECT 1 FROM data_migrations WHERE name='legacy_ratings_v10'").fetchone():
      for r in c.execute("SELECT week_id,member_id,end_on,rate,updated_at FROM entries WHERE rate IS NOT NULL ORDER BY updated_at,id").fetchall():
       c.execute('INSERT INTO rate_evaluations(week_id,member_id,evaluation_date,rate,revision,entered_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(member_id,evaluation_date) DO UPDATE SET rate=excluded.rate,updated_at=excluded.updated_at', (r['week_id'],r['member_id'],r['end_on'],r['rate'],secrets.token_hex(16),r['updated_at'],r['updated_at']))
      c.execute("INSERT INTO data_migrations(name,applied_at) VALUES('legacy_ratings_v10',?)",(now(),))
     # Upgrade 0.2 data in place without deleting reports or the previous shared password.
     columns={r['name'] for r in c.execute('PRAGMA table_info(sessions)')}
     if 'role' not in columns:
      c.execute("ALTER TABLE sessions ADD COLUMN role TEXT NOT NULL DEFAULT 'team'")
     if 'username' not in columns:
      c.execute('ALTER TABLE sessions ADD COLUMN username TEXT')
     old=c.execute('SELECT value FROM settings WHERE key=?',('password',)).fetchone()
     if not c.execute('SELECT 1 FROM settings WHERE key=?',('team_password',)).fetchone():
      # Existing installations retain their current team password; new ones use user's requested initial password.
      pw=os.environ.pop('CHICO_FIRST_PASSWORD',None) or 'ChicoTop1'
      stored=old['value'] if old else self._hashpw(pw)
      c.execute('INSERT INTO settings(key,value) VALUES(?,?)',('team_password',stored))
      if not old:self.first_password=pw
     if not c.execute('SELECT 1 FROM settings WHERE key=?',('owner_password',)).fetchone():
      c.execute('INSERT INTO settings(key,value) VALUES(?,?)',('owner_password',self._hashpw('ChicoAdmin')))
     if not c.execute('SELECT 1 FROM settings WHERE key=?',('tz',)).fetchone():
      c.execute('INSERT INTO settings(key,value) VALUES(?,?)',('tz',self.tzname))
     if not c.execute("SELECT 1 FROM settings WHERE key='roster_initialized'").fetchone() and not c.execute('SELECT 1 FROM members LIMIT 1').fetchone():
      for rank,names in ROSTER.items():
       for name in names:
        cur=c.execute('INSERT INTO members(name,rank,active) VALUES(?,?,1)',(name,rank));
        c.execute('INSERT INTO ranks(member_id,rank,effective_on,grace) VALUES(?,?,?,0)',(cur.lastrowid,rank,'1900-01-01'))
      c.execute("INSERT INTO members(name,rank,active,resigned_on) VALUES('Memee','Helper',0,?)",(self.today().isoformat(),))
      rid=c.execute("SELECT id FROM members WHERE name='Memee'").fetchone()['id'];c.execute("INSERT INTO ranks(member_id,rank,effective_on) VALUES(?,'Helper','1900-01-01')",(rid,))
      c.execute('INSERT INTO weeks(starts,ends,status,opened_at) VALUES(?,?,?,?)',(wk(self.today()).isoformat(),(wk(self.today())+timedelta(days=6)).isoformat(),'open',now()))
      self._audit(c,'initialise','Team names and ranks only')
     c.execute("INSERT INTO settings(key,value) VALUES('roster_initialized','1') ON CONFLICT(key) DO NOTHING")
 def _hashpw(self,pw):
    salt=secrets.token_bytes(16)
    return salt.hex()+':'+hashlib.pbkdf2_hmac('sha256',pw.encode('utf8'),salt,260000).hex()
 def _checkpw(self,pw,stored):
    try:
     salt,hexdigest=stored.split(':');actual=hashlib.pbkdf2_hmac('sha256',pw.encode('utf8'),bytes.fromhex(salt),260000)
     return hmac.compare_digest(actual,bytes.fromhex(hexdigest))
    except Exception:return False
 def _audit(self,c,action,detail):
    actor=getattr(self._actor,'value',None)
    if actor:detail=f'actor={actor}; '+detail
    c.execute('INSERT INTO audit(at,action,detail) VALUES(?,?,?)',(now(),action,detail))
 def login(self,pw,username=None):
    """Return a random session token; keep the legacy API return shape."""
    if not isinstance(pw,str) or len(pw)>256:return None
    with self.lock,self.conn() as c:
     if username:
      account=c.execute('SELECT * FROM users WHERE username=? AND active=1',(str(username).strip(),)).fetchone()
      if not account or not self._checkpw(pw,account['password_hash']):return None
      token=secrets.token_urlsafe(32)
      c.execute('DELETE FROM sessions WHERE expires<?',(now(),))
      c.execute('INSERT INTO sessions(token_hash,expires,role,username) VALUES(?,?,?,?)',
        (hashlib.sha256(token.encode()).hexdigest(),(datetime.now(timezone.utc)+timedelta(hours=12)).isoformat(),account['role'],account['username']))
      return token
     owner=c.execute('SELECT value FROM settings WHERE key=?',('owner_password',)).fetchone()
     team=c.execute('SELECT value FROM settings WHERE key=?',('team_password',)).fetchone()
     # Check both hashes (even on failure) to avoid leaking which password exists.
     is_owner=bool(owner and self._checkpw(pw,owner['value']))
     is_team=bool(team and self._checkpw(pw,team['value']))
     if not (is_owner or is_team):return None
     role='owner' if is_owner else 'team'
     token=secrets.token_urlsafe(32)
     c.execute('DELETE FROM sessions WHERE expires<?',(now(),))
     c.execute('INSERT INTO sessions(token_hash,expires,role) VALUES(?,?,?)',
               (hashlib.sha256(token.encode()).hexdigest(),(datetime.now(timezone.utc)+timedelta(hours=12)).isoformat(),role))
     return token
 def auth_role(self,token):
    if not isinstance(token,str) or not token:return None
    with self.conn() as c:
     row=c.execute('SELECT expires,role,username FROM sessions WHERE token_hash=?',(hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
     if not row or row['expires']<=now():return None
     if row['username']:
      user=c.execute('SELECT active,role FROM users WHERE username=?',(row['username'],)).fetchone()
      if not user or not user['active']:return None
      return user['role']
     return row['role']
 def auth_actor(self,token):
    if not isinstance(token,str) or not token:return None
    with self.conn() as c:
     r=c.execute('SELECT username,role FROM sessions WHERE token_hash=? AND expires>?',(hashlib.sha256(token.encode()).hexdigest(),now())).fetchone()
     return (r['username'] or 'shared-'+r['role']) if r else None
 def list_accounts(self):
    with self.conn() as c:return [dict(x) for x in c.execute('SELECT username,role,active,created_at FROM users ORDER BY username')]
 def upsert_account(self,username,password,role):
    username=str(username or '').strip();role=str(role or '').strip()
    if not re.fullmatch(r'[a-zA-Z0-9_.-]{3,40}',username):raise ValueError('اسم المستخدم من 3 إلى 40 حرفًا إنجليزيًا أو رقمًا أو ._-')
    if role not in ('owner','team'):raise ValueError('صلاحية غير صحيحة')
    if not isinstance(password,str) or not 12<=len(password)<=256:raise ValueError('كلمة المرور للحساب الشخصي لا تقل عن 12 حرفًا')
    with self.lock,self.conn() as c:
     old=c.execute('SELECT username FROM users WHERE username=?',(username,)).fetchone()
     if old:raise Conflict('اسم المستخدم موجود؛ استخدم إعادة تعيين كلمة المرور')
     c.execute('INSERT INTO users(username,password_hash,role,active,created_at) VALUES(?,?,?,1,?)',(username,self._hashpw(password),role,now()))
     self._audit(c,'user-create',username+' role='+role)
     return {'ok':True,'username':username}
 def set_account(self,username,active=None,new_password=None):
    username=str(username or '').strip()
    with self.lock,self.conn() as c:
     old=c.execute('SELECT username FROM users WHERE username=?',(username,)).fetchone()
     if not old:raise ValueError('المستخدم غير موجود')
     if active is not None:
      if not isinstance(active,bool):raise ValueError('قيمة الحالة غير صحيحة')
      c.execute('UPDATE users SET active=? WHERE username=?',(int(active),username))
     if new_password is not None:
      if not isinstance(new_password,str) or not 12<=len(new_password)<=256:raise ValueError('كلمة المرور الجديدة لا تقل عن 12 حرفًا')
      c.execute('UPDATE users SET password_hash=? WHERE username=?',(self._hashpw(new_password),username))
     c.execute('DELETE FROM sessions WHERE username=?',(username,))
     self._audit(c,'user-update',username+' active='+str(active)+' changed_password='+str(new_password is not None))
     return {'ok':True}
 def auth(self,token):return self.auth_role(token) is not None
 def logout(self,token):
    with self.conn() as c:c.execute('DELETE FROM sessions WHERE token_hash=?',(hashlib.sha256(token.encode()).hexdigest(),))
 def change_role_password(self,role,old,new):
    if role not in ('owner','team'):raise ValueError('Role not supported')
    if not isinstance(new,str) or not 12<=len(new)<=256:raise ValueError('كلمة السر الجديدة من 12 إلى 256 حرفًا')
    key=role+'_password'
    with self.lock,self.conn() as c:
     stored=c.execute('SELECT value FROM settings WHERE key=?',(key,)).fetchone()['value']
     if not self._checkpw(old,stored):raise ValueError('كلمة السر الحالية غير صحيحة')
     if old==new:raise ValueError('أدخل كلمة سر مختلفة')
     c.execute('UPDATE settings SET value=? WHERE key=?',(self._hashpw(new),key))
     c.execute('DELETE FROM sessions')
     self._audit(c,'security',f'{role} password updated; all sessions revoked')
 def change_password(self,old,new):
    # Kept for existing owner maintenance tools; this changes the shared team password.
    self.change_role_password('team',old,new)
 def verify_role_password(self,role,password):
    if role not in ('owner','team') or not isinstance(password,str):return False
    with self.conn() as c:
     stored=c.execute('SELECT value FROM settings WHERE key=?',(role+'_password',)).fetchone()
    return bool(stored and self._checkpw(password,stored['value']))
 def default_password_status(self):
    with self.conn() as c:
     owner=c.execute('SELECT value FROM settings WHERE key=?',('owner_password',)).fetchone()['value']
     team=c.execute('SELECT value FROM settings WHERE key=?',('team_password',)).fetchone()['value']
     return {'owner_default':self._checkpw('ChicoAdmin',owner), 'team_default':self._checkpw('ChicoTop1',team)}
 def week(self,c):
    r=c.execute("SELECT * FROM weeks WHERE status='open' ORDER BY id DESC LIMIT 1").fetchone()
    if not r:raise ValueError('لا يوجد أسبوع مفتوح؛ راجع إغلاق الأسبوع')
    return r
 def week_rows(self,c,weekid):return c.execute('SELECT * FROM entries WHERE week_id=? ORDER BY end_on DESC,id DESC',(weekid,)).fetchall()
 def _rank_at(self,c,member_id,when):
    r=c.execute('SELECT rank FROM ranks WHERE member_id=? AND effective_on<=? ORDER BY effective_on DESC,id DESC LIMIT 1',(member_id,when)).fetchone()
    return r['rank'] if r else None
 def save_ratings(self,evaluation_date,rows):
    target=day(evaluation_date)
    if target>self.today():raise ValueError('تاريخ التقييم لا يمكن أن يكون في المستقبل')
    if not isinstance(rows,list) or not rows or len(rows)>200:raise ValueError('اختر تقييمًا واحدًا على الأقل')
    ids=[int(r.get('member_id',0)) for r in rows]
    if len(ids)!=len(set(ids)):raise ValueError('إداري مكرر في التقييم')
    with self.lock,self.conn() as c:
     c.execute('BEGIN IMMEDIATE');w=self.week(c)
     if target<day(w['starts']) or target>day(w['ends']):raise ValueError('تاريخ التقييم خارج الأسبوع المفتوح')
     result=[]
     for r in rows:
      mid=int(r['member_id']);rating=num(r.get('rate'),'Rate',hi=5,optional=False)
      m=c.execute('SELECT name,rank FROM members WHERE id=?',(mid,)).fetchone()
      if not m or m['rank']=='Responsible':raise ValueError('الإداري غير صحيح')
      old=c.execute('SELECT * FROM rate_evaluations WHERE member_id=? AND evaluation_date=?',(mid,evaluation_date)).fetchone()
      expected=r.get('expected')
      if old and old['revision']!=expected:raise Conflict(f'{m["name"]}: تم تعديل التقييم على جهاز آخر')
      if not old and expected is not None:raise Conflict(f'{m["name"]}: حدّث بيانات التقييم')
      stamp=now();rev=secrets.token_hex(16)
      if old:c.execute('UPDATE rate_evaluations SET rate=?,revision=?,updated_at=? WHERE id=?',(rating,rev,stamp,old['id']))
      else:c.execute('INSERT INTO rate_evaluations(week_id,member_id,evaluation_date,rate,revision,entered_at,updated_at) VALUES(?,?,?,?,?,?,?)',(w['id'],mid,evaluation_date,rating,rev,stamp,stamp))
      self._audit(c,'daily-rate',json.dumps({'member':m['name'],'date':evaluation_date,'previous':old['rate'] if old else None,'new':rating},ensure_ascii=False))
      result.append({'member_id':mid,'evaluation_date':evaluation_date,'rate':rating,'revision':rev})
     return {'saved':result,'evaluation_date':evaluation_date,'recorded_at':now()}
 def save_shift(self,member_id,shift,effective_on):
    mid=int(member_id);start=day(effective_on).isoformat();shift=str(shift).strip()
    if not shift or len(shift)>65:raise ValueError('المناوبة مطلوبة (حتى 65 حرفًا)')
    with self.lock,self.conn() as c:
     if not c.execute('SELECT 1 FROM members WHERE id=?',(mid,)).fetchone():raise ValueError('إداري غير موجود')
     c.execute('INSERT INTO shift_assignments(member_id,shift,effective_on,created_at) VALUES(?,?,?,?)',(mid,shift,start,now()))
     self._audit(c,'shift',f'{mid}: {shift} effective {start}')
     return {'ok':True,'member_id':mid,'shift':shift,'effective_on':start}
 def _reflow_member(self,c,week_id,member_id):
    """Recalculate dependent intervals transactionally after historical corrections."""
    w=c.execute('SELECT * FROM weeks WHERE id=?',(week_id,)).fetchone()
    opening=c.execute('SELECT flags_base FROM openings WHERE week_id=? AND member_id=?',(week_id,member_id)).fetchone()
    prev_flag=opening['flags_base'] if opening else None
    prior_tickets=0
    records=c.execute('SELECT * FROM entries WHERE week_id=? AND member_id=? ORDER BY start_on,end_on,id',(week_id,member_id)).fetchall()
    end_previous=None
    for r in records:
     if end_previous is not None and r['start_on']<=end_previous:raise Conflict('يوجد تداخل في قراءات الإداري')
     end_previous=r['end_on']
     if r['mode']=='counter':
      cur=r['tickets_counter']
      if cur is None or cur<prior_tickets:raise Conflict('تصحيح القراءة يجعل عداد Tickets اللاحق أقل من السابق')
      tickets=cur-prior_tickets
     else:tickets=r['tickets']
     flag_cur=r['flags_counter'];flags=None
     if flag_cur is not None:
      if prev_flag is None:raise Conflict('لا يوجد رصيد أساس مؤكد للفلاجات')
      if flag_cur<prev_flag:raise Conflict('تصحيح القراءة يجعل عداد Flags اللاحق أقل من السابق')
      flags=flag_cur-prev_flag
     changed=(tickets!=r['tickets'] or flags!=r['flags'] or (flag_cur is not None and prev_flag!=r['previous_flags']))
     if changed:
      c.execute('UPDATE entries SET tickets=?,previous_tickets=?,flags=?,previous_flags=?,revision=?,updated_at=? WHERE id=?',(tickets,prior_tickets if r['mode']=='counter' else r['previous_tickets'],flags,prev_flag if flag_cur is not None else None,secrets.token_hex(16),now(),r['id']))
      self._audit(c,'reflow',json.dumps({'entry_id':r['id'],'tickets_before':r['tickets'],'tickets_after':tickets,'flags_before':r['flags'],'flags_after':flags},ensure_ascii=False))
     prior_tickets+=tickets
     if flag_cur is not None:prev_flag=flag_cur
 def week_stats(self,c,w):
    members=[dict(x) for x in c.execute('SELECT * FROM members ORDER BY display_order,CASE rank WHEN "Responsible" THEN 0 WHEN "Administrator" THEN 1 WHEN "Moderator" THEN 2 WHEN "SN.Helper" THEN 3 ELSE 4 END,name COLLATE NOCASE')]
    opens={r['member_id']:r['flags_base'] for r in c.execute('SELECT * FROM openings WHERE week_id=?',(w['id'],))}
    records=self.week_rows(c,w['id']);by={m['id']:[] for m in members}
    for r in records:
     record=dict(r)
     rank_at=c.execute('SELECT rank FROM ranks WHERE member_id=? AND effective_on<=? ORDER BY effective_on DESC,id DESC LIMIT 1',
                       (r['member_id'],r['start_on'])).fetchone()
     record['rank_at_entry']=rank_at['rank'] if rank_at else None
     by[r['member_id']].append(record)
    out=[]
    for m in members:
     rr=sorted(by[m['id']],key=lambda e:e['end_on'])
     last=rr[-1] if rr else None
     rating_records=[dict(r) for r in c.execute('SELECT id,evaluation_date,rate,revision,updated_at,entered_at FROM rate_evaluations WHERE week_id=? AND member_id=? ORDER BY evaluation_date',(w['id'],m['id']))]
     for rating in rating_records:rating['rank_at_rating']=self._rank_at(c,m['id'],rating['evaluation_date'])
     rates=[r['rate'] for r in rating_records]
     shifts=[dict(r) for r in c.execute('SELECT id,shift,effective_on,created_at FROM shift_assignments WHERE member_id=? ORDER BY effective_on,id',(m['id'],))]
     current_shift=next((x['shift'] for x in reversed(shifts) if x['effective_on']<=self.today().isoformat()),None)
     flags=sum(r['flags'] or 0 for r in rr)
     hist=c.execute('SELECT * FROM ranks WHERE member_id=? AND grace=1 AND effective_on BETWEEN ? AND ? ORDER BY id DESC LIMIT 1',(m['id'],w['starts'],w['ends'])).fetchone()
     hours=next((r['hours'] for r in reversed(rr) if r['hours'] is not None),None)
     item={'id':m['id'],'name':m['name'],'rank':m['rank'],'active':bool(m['active']),'reporting':bool(m['in_reporting']),'resigned_on':m['resigned_on'],'joined_on':m['joined_on'],
           'tickets':sum(r['tickets'] for r in rr),'flags':flags,'rate':round(sum(rates)/len(rates),3) if rates else None,'latest_rate':rating_records[-1]['rate'] if rating_records else None,'hours':hours,
           'current_tickets_counter':next((r['tickets_counter'] for r in reversed(rr) if r['tickets_counter'] is not None),None),
           'current_flags_counter':next((r['flags_counter'] for r in reversed(rr) if r['flags_counter'] is not None),None),
           'opening_flags':opens.get(m['id']), 'entry_count':len(rr),'last_end':last['end_on'] if last else None,'grace':bool(hist), 'data':rr, 'daily_ratings':rating_records, 'shift':current_shift, 'shift_history':shifts, 'tickets_by_rank':{rk:sum(r['tickets'] for r in rr if r['rank_at_entry']==rk) for rk in RANKS}}
     if m['rank'] in ('Helper','SN.Helper'):
      item['ticket_target']=120
     elif m['rank']=='Moderator':item['ticket_target']=200
     else:item['ticket_target']=None
     previous_lifetime=c.execute('SELECT e.flags_counter FROM entries e WHERE e.member_id=? AND e.end_on<? AND e.flags_counter IS NOT NULL ORDER BY e.end_on DESC,e.id DESC LIMIT 1',(m['id'],w['starts'])).fetchone()
     item['suggested_opening_flags']=previous_lifetime['flags_counter'] if previous_lifetime else None
     out.append(item)
    return out
 def _compile_week(self,c,w):
    """Build a complete, internally consistent report from a single transaction.

    The exact same structure powers current data, immutable snapshots and closing.
    """
    people=self.week_stats(c,w)
    active=[x for x in people if x['active']]
    team=[x for x in people if x['rank'] in ('Helper','SN.Helper','Moderator')]
    admins=[x for x in people if x['rank']=='Administrator']
    eligible=team+admins
    source=[r for m in people for r in m['data'] if r.get('rank_at_entry') in ('Helper','SN.Helper','Moderator','Administrator')]
    team_source=[r for r in source if r.get('rank_at_entry') in ('Helper','SN.Helper','Moderator')]
    admin_source=[r for r in source if r.get('rank_at_entry')=='Administrator']
    server_tickets=sum(r['tickets'] for r in source)
    weekly_flags=sum(r['flags'] or 0 for r in source)
    rates=[r['rate'] for m in people for r in m['daily_ratings'] if r.get('rank_at_rating') in ('Helper','SN.Helper','Moderator')]
    flag_obs=sum(r['flags'] is not None for r in source)
    missing=sum(r['flags'] is None for r in source)
    totals={
     'flags_missing_entries':missing,
     'unreported_team_members':sum(x['active'] and x.get('reporting',True) and not x['entry_count'] for x in team),
     'flags_observations':flag_obs,
     'tickets_observations':len(source),
     'tickets':server_tickets,
     'team_tickets':sum(r['tickets'] for r in team_source),
     'admin_tickets':sum(r['tickets'] for r in admin_source),
     'flags':weekly_flags,
     'flag_rate':round(100*weekly_flags/server_tickets,2) if server_tickets and flag_obs and not missing else None,
     'rate':round(sum(rates)/len(rates),2) if rates else None,
     'rate_observations':len(rates),
     'rate_basis':'dated_daily_rate_mean_not_official_weekly_rating',
     'active':len(active),'has_data':sum(bool(x['entry_count']) for x in active),
     'helpers':sum(x['active'] and x['rank'] in ('Helper','SN.Helper') for x in people),
     'moderators':sum(x['active'] and x['rank']=='Moderator' for x in people),
    }
    return {'week':dict(w),'members':people,'totals':totals,
            'report_schema':3,'created_from':'recorded_entries_only'}
 def view(self):
    with self.lock,self.conn() as c:
     w=self.week(c);report=self._compile_week(c,w)
     snapshots=[dict(s) for s in c.execute('SELECT id,kind,week_id,created_at FROM snapshots ORDER BY id DESC LIMIT 40')]
     audit=[dict(s) for s in c.execute('SELECT at,action,detail FROM audit ORDER BY id DESC LIMIT 40')]
     history=[dict(s) for s in c.execute('SELECT starts,ends,status,closed_at FROM weeks ORDER BY id DESC LIMIT 40')]
     return {**report,'today':self.today().isoformat(),
             'server_time':datetime.now(self.tz).strftime('%Y-%m-%d %H:%M'),
             'timezone':self.tzname,'password_warnings':self.default_password_status(),'reset_due':self.today()>day(w['ends']),
             'snapshots':snapshots,'audit':audit,'weeks':history}
 def get_entry(self,member,start,end):
    with self.conn() as c:
     w=self.week(c)
     r=c.execute('SELECT * FROM entries WHERE week_id=? AND member_id=? AND start_on=? AND end_on=?',(w['id'],member,start,end)).fetchone()
     return dict(r) if r else None
 def _last_before(self,c,mid,start,wid):
    return c.execute('SELECT * FROM entries WHERE member_id=? AND week_id=? AND end_on<? ORDER BY end_on DESC,id DESC LIMIT 1',(mid,wid,start)).fetchone()
 def preview_opening_correction(self,member_id,flags_base):
    mid=int(member_id);base=num(flags_base,'Opening Flags',integer=True,optional=False)
    with self.lock,self.conn() as c:
     w=self.week(c);m=c.execute('SELECT name FROM members WHERE id=?',(mid,)).fetchone()
     if not m:raise ValueError('الإداري غير موجود')
     prior=c.execute('SELECT flags_base FROM openings WHERE week_id=? AND member_id=?',(w['id'],mid)).fetchone()
     first=c.execute('SELECT flags_counter FROM entries WHERE week_id=? AND member_id=? AND flags_counter IS NOT NULL ORDER BY start_on,end_on,id LIMIT 1',(w['id'],mid)).fetchone()
     if first and base>first['flags_counter']:raise ValueError('الرصيد الجديد أعلى من أول قراءة؛ التصحيح ينتج فلاجات سالبة')
     prev=prior['flags_base'] if prior else None
     old_flags=c.execute('SELECT COALESCE(SUM(flags),0) FROM entries WHERE week_id=? AND member_id=?',(w['id'],mid)).fetchone()[0]
     new_flags=old_flags+(prev-base) if prev is not None and first else old_flags
     totals=self._compile_week(c,w)['totals']
     new_total=totals['flags']+(new_flags-old_flags)
     rate=round(new_total*100/totals['tickets'],2) if totals['tickets']>0 and totals['flags_missing_entries']==0 else None
     return {'name':m['name'],'previous':prev,'proposed':base,'old_flags':old_flags,'new_flags':new_flags,'delta':new_flags-old_flags,'server_flags_after':new_total,'server_flag_rate_after':rate,'week_start':w['starts']}
 def set_openings(self,rows,reason=''):
    if not isinstance(rows,list) or len(rows)>250 or not rows:raise ValueError('أدخل أرصدة بداية الأسبوع')
    ids=[int(r.get('member_id',0)) for r in rows]
    if len(ids)!=len(set(ids)):raise ValueError('إداري مكرر في أرصدة البداية')
    reason=str(reason or '').strip()[:500]
    with self.lock,self.conn() as c:
     c.execute('BEGIN IMMEDIATE');w=self.week(c)
     for r in rows:
      mid=int(r['member_id']);base=num(r.get('flags_base'),'Opening Flags',integer=True,optional=False)
      member=c.execute('SELECT id,name FROM members WHERE id=?',(mid,)).fetchone()
      if not member:raise ValueError('إداري غير موجود')
      existing=c.execute('SELECT flags_base FROM openings WHERE week_id=? AND member_id=?',(w['id'],mid)).fetchone()
      old=existing['flags_base'] if existing else None
      first=c.execute('SELECT flags_counter FROM entries WHERE week_id=? AND member_id=? AND flags_counter IS NOT NULL ORDER BY start_on,end_on,id LIMIT 1',(w['id'],mid)).fetchone()
      if first and base>first['flags_counter']:raise Conflict(f'{member["name"]}: الرصيد أكبر من أول قراءة')
      if old is not None and old!=base and not reason:raise ValueError('اذكر سبب تصحيح Opening Flags')
      c.execute('INSERT INTO openings(week_id,member_id,flags_base,updated_at) VALUES(?,?,?,?) ON CONFLICT(week_id,member_id) DO UPDATE SET flags_base=excluded.flags_base,updated_at=excluded.updated_at',(w['id'],mid,base,now()))
      if old!=base:
       self._reflow_member(c,w['id'],mid)
       self._audit(c,'opening-correction',json.dumps({'member':member['name'],'old':old,'new':base,'reason':reason},ensure_ascii=False))
     return {'saved':len(rows),'corrected':sum(1 for r in rows if r.get('member_id'))}
 def save_batch(self,start_s,end_s,rows):
    start,end=day(start_s),day(end_s)
    if end<start:raise ValueError('نهاية الفترة قبل بدايتها')
    if (end-start).days>6:raise ValueError('نطاق التقرير يزيد عن أسبوع')
    if not isinstance(rows,list) or len(rows)>200:raise ValueError('عدد الصفوف غير صحيح')
    ids=[int(r.get('member_id',0)) for r in rows]
    if len(set(ids))!=len(ids):raise ValueError('نفس الإداري مكرر في التقرير')
    if not rows:raise ValueError('أدخل سطرًا واحدًا على الأقل')
    with self.lock,self.conn() as c:
     c.execute('BEGIN IMMEDIATE')
     w=self.week(c)
     if start<day(w['starts']) or end>day(w['ends']):raise ValueError('الفترة خارج الأسبوع المفتوح؛ راجع تأكيد بداية الأسبوع الجديد')
     results=[]
     for raw in rows:
      # An operator may have a different last reading for every member.
      # Keep each member's covered interval separately, inside the requested week window.
      row_start_s=raw.get('start_on',start_s)
      row_end_s=raw.get('end_on',end_s)
      row_start,row_end=day(row_start_s),day(row_end_s)
      if row_end>self.today():raise ValueError('تاريخ القراءة لا يمكن أن يكون في المستقبل')
      if not (start<=row_start<=row_end<=end):
       raise ValueError('فترة الإداري خارج نطاق التقرير المحدد')
      mid=int(raw['member_id']);m=c.execute('SELECT * FROM members WHERE id=?',(mid,)).fetchone()
      if not m:raise ValueError('إداري غير موجود')
      if m['joined_on'] and row_end<day(m['joined_on']):raise ValueError(f'{m["name"]}: التقرير قبل تاريخ الانضمام')
      if not m['active'] and (not m['resigned_on'] or row_start>day(m['resigned_on'])):raise ValueError(f'{m["name"]} مستقيل؛ التاريخ بعد الاستقالة')
      if m['rank']=='Responsible':raise ValueError('Responsible مستبعد من إدخال التقارير')
      overlap=c.execute('SELECT * FROM entries WHERE week_id=? AND member_id=? AND NOT(end_on<? OR start_on>?)',(w['id'],mid,row_start_s,row_end_s)).fetchall()
      exact=next((x for x in overlap if x['start_on']==row_start_s and x['end_on']==row_end_s),None)
      if len(overlap)>(1 if exact else 0):raise Conflict(f'{m["name"]}: التقرير يتداخل مع فترة محفوظة')
      expected=raw.get('expected')
      if exact and expected!=exact['revision']:raise Conflict(f'{m["name"]}: التقرير تغيّر على جهاز آخر؛ حدّث الصفحة')
      if not exact and expected is not None:raise Conflict(f'{m["name"]}: الفترة تغيّرت على جهاز آخر')
      # Later entries are safely recalculated after this transaction instead of blocking corrections.
      prev=self._last_before(c,mid,row_start_s,w['id'])
      mode=raw.get('mode','direct')
      if mode not in ('direct','counter'):raise ValueError('طريقة التذاكر غير صحيحة')
      direct=num(raw.get('tickets'), 'Tickets',integer=True)
      cur=num(raw.get('tickets_counter'),'Tickets Counter',integer=True)
      prev_input=num(raw.get('previous_tickets'),'Previous Tickets',integer=True)
      if mode=='direct':
       if direct is None:raise ValueError(f'{m["name"]}: أدخل Tickets')
       tickets=direct
      else:
       if cur is None:raise ValueError(f'{m["name"]}: أدخل قراءة Tickets الحالية')
       # The game shows a running WEEKLY tickets total. Prior saved intervals
       # (including ones entered as a daily difference) are the true baseline.
       # Never use a counter from another game week.
       prior=c.execute('SELECT COALESCE(SUM(tickets),0) AS total FROM entries WHERE member_id=? AND week_id=? AND end_on<?',
                      (mid,w['id'],row_start_s)).fetchone()['total']
       if prev_input is not None and prior!=prev_input:
        raise Conflict(f'{m["name"]}: رقم التذاكر السابق تغيّر؛ حدّث التقرير')
       if cur<prior:raise ValueError(f'{m["name"]}: العداد الأسبوعي أقل من السابق؛ راجع الأسبوع')
       tickets=cur-prior;prev_input=prior
      flags_cur=num(raw.get('flags_counter'),'Cumulative Flags',integer=True)
      opening=num(raw.get('opening_flags'),'Opening Flags',integer=True)
      prevflags=None;flags=None
      if flags_cur is not None:
       prev_flag_row=c.execute('SELECT flags_counter FROM entries WHERE member_id=? AND week_id=? AND end_on<? AND flags_counter IS NOT NULL ORDER BY end_on DESC,id DESC LIMIT 1',
          (mid,w['id'],row_start_s)).fetchone()
       if prev_flag_row:prevflags=prev_flag_row['flags_counter']
       else:
        base=c.execute('SELECT flags_base FROM openings WHERE week_id=? AND member_id=?',(w['id'],mid)).fetchone()
        prevflags=base['flags_base'] if base else None
        if prevflags is None:
         if opening is None:raise ValueError(f'{m["name"]}: يلزم Opening Flags المؤكد قبل إدخال Cumulative Flags')
         prevflags=opening
         c.execute('INSERT INTO openings(week_id,member_id,flags_base,updated_at) VALUES(?,?,?,?)',(w['id'],mid,opening,now()))
        elif opening is not None and opening!=prevflags:raise Conflict(f'{m["name"]}: الرصيد الافتتاحي مختلف عن المحفوظ')
       if flags_cur<prevflags:raise ValueError(f'{m["name"]}: عداد Flags تراكمي ولا يجوز أن ينخفض')
       flags=flags_cur-prevflags
      elif opening is not None:
       if prev:raise ValueError('لا يمكن تغيير Opening Flags بعد حفظ قراءات؛ راجع السجل')
       existing=c.execute('SELECT flags_base FROM openings WHERE week_id=? AND member_id=?',(w['id'],mid)).fetchone()
       if existing and existing['flags_base']!=opening:raise Conflict('Opening Flags محفوظ بالفعل؛ لا يُغير ضمن تقرير')
       if not existing:c.execute('INSERT INTO openings VALUES(?,?,?,?)',(w['id'],mid,opening,now()))
      rating=num(raw.get('rate'),'Rate',hi=5)
      evaluation_date=day(raw.get('evaluation_date') or row_end_s).isoformat()
      if not (w['starts']<=evaluation_date<=w['ends']):raise ValueError('تاريخ التقييم خارج الأسبوع المفتوح')
      if rating is not None:
       stamp_rating=now();previous_rating=c.execute('SELECT rate,revision FROM rate_evaluations WHERE member_id=? AND evaluation_date=?',(mid,evaluation_date)).fetchone()
       c.execute('INSERT INTO rate_evaluations(week_id,member_id,evaluation_date,rate,revision,entered_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(member_id,evaluation_date) DO UPDATE SET rate=excluded.rate,revision=excluded.revision,updated_at=excluded.updated_at', (w['id'],mid,evaluation_date,rating,secrets.token_hex(16),stamp_rating,stamp_rating))
       if previous_rating and previous_rating['rate']!=rating:self._audit(c,'daily-rate-correction',f'{m["name"]} {evaluation_date}: {previous_rating["rate"]} -> {rating}')
      hours=num(raw.get('hours'),'Total Hours',hi=168)
      note=str(raw.get('note') or '')[:500]
      rev=secrets.token_hex(16);stamp=now()
      vals=(mode,tickets,cur,prev_input,flags_cur,prevflags,flags,rating,hours,note,rev,stamp)
      if exact:
       c.execute('UPDATE entries SET mode=?,tickets=?,tickets_counter=?,previous_tickets=?,flags_counter=?,previous_flags=?,flags=?,rate=?,hours=?,note=?,revision=?,updated_at=? WHERE id=?',vals+(exact['id'],));rid=exact['id']
      else:
       c.execute('INSERT INTO entries(week_id,member_id,start_on,end_on,mode,tickets,tickets_counter,previous_tickets,flags_counter,previous_flags,flags,rate,hours,note,revision,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (w['id'],mid,row_start_s,row_end_s)+vals);rid=c.execute('SELECT last_insert_rowid()').fetchone()[0]
      results.append({'id':rid,'member_id':mid,'tickets':tickets,'flags':flags,'revision':rev})
      self._audit(c,'entry',json.dumps({'member':m['name'],'start':row_start_s,'end':row_end_s,'before':{'tickets':exact['tickets'],'flags':exact['flags'],'flags_counter':exact['flags_counter']} if exact else None,'after':{'tickets':tickets,'flags':flags,'flags_counter':flags_cur}},ensure_ascii=False))
      self._reflow_member(c,w['id'],mid)
     for result in results:
      actual=c.execute('SELECT tickets,flags,revision FROM entries WHERE id=?',(result['id'],)).fetchone()
      result.update(dict(actual))
     return {'saved':results}
 def preview_excel(self,parsed):
    with self.lock,self.conn() as c:
     members=[dict(m) for m in c.execute('SELECT id,name,rank,active,in_reporting FROM members ORDER BY display_order,id')]
     known={m['name'].casefold():m for m in members}
     week=self.week(c)
     matches=[]
     for r in parsed['rows']:
      existing=known.get(r['name'].casefold())
      stripped=re.sub(r'^(?:M\.|SN\.)','',r['name'],flags=re.I).casefold()
      candidate=known.get(stripped) if not existing else None
      matches.append({'source_row':r['source_row'],'name':r['name'],'match_id':existing['id'] if existing else None,
       'suggested_id':candidate['id'] if candidate else None,'suggested_name':candidate['name'] if candidate else None})
     count=c.execute('SELECT COUNT(*) FROM entries').fetchone()[0]
     ratings=c.execute('SELECT COUNT(*) FROM rate_evaluations').fetchone()[0]
     return {'parsed':parsed,'matches':matches,'members':[{'id':m['id'],'name':m['name'],'rank':m['rank'],'active':bool(m['active']),'reporting':bool(m['in_reporting'])} for m in members],
      'week':dict(week),'existing_entries':count,'existing_ratings':ratings}
 def commit_excel(self,parsed,mapping,reset=False,reason='',source_hash=''):
    """Atomic import: all 31 rows or no data, no automatically merged aliases.
    Mapping keys are sheet row numbers, values are id:<member id> or new:<rank>.
    """
    from .xlsx_import import read_daily_xlsx
    if not isinstance(mapping,dict):raise ValueError('يلزم اعتماد مطابقة جميع الأسماء')
    if reset and reason!='RESET_AND_IMPORT':raise ValueError('تأكيد التصفير غير صحيح')
    date_s=parsed['date'];target=day(date_s)
    if target>self.today():raise ValueError('لا يمكن استيراد تقرير من المستقبل')
    if len(mapping)!=len(parsed['rows']) or len(parsed['rows'])>200:raise ValueError('مطابقة ناقصة أو مكررة')
    mids=set();new_count=0;written=0;unchanged=0
    with self.lock,self.conn() as c:
     c.execute('BEGIN IMMEDIATE')
     if reset:
      # Every old report stays in a separately verified SQLite backup made by caller.
      for table in ('snapshots','entries','rate_evaluations','openings','excel_imports','weeks'):
       c.execute('DELETE FROM '+table)
      start=wk(target)
      c.execute('INSERT INTO weeks(starts,ends,status,opened_at) VALUES(?,?,?,?)',(start.isoformat(),(start+timedelta(days=6)).isoformat(),'open',now()))
      self._audit(c,'stats-reset','RESET_AND_IMPORT '+date_s+'; verified safety backup created')
     w=self.week(c)
     if not w['starts']<=date_s<=w['ends']:
      raise Conflict('تاريخ Excel خارج الأسبوع المفتوح؛ الإغلاق الأسبوعي يتم يدويًا')
     saved_ids=[]
     for ix,r in enumerate(parsed['rows']):
      option=mapping.get(str(r['source_row']))
      if not isinstance(option,str):raise ValueError(f'{r["name"]}: حدّد الإداري أو رتبته الجديدة')
      if option.startswith('id:'):
       mid=int(option[3:]);member=c.execute('SELECT * FROM members WHERE id=?',(mid,)).fetchone()
       if not member:raise ValueError(f'{r["name"]}: الإداري المحدد غير موجود')
       if member['rank']=='Responsible':raise ValueError('Responsible لا يدخل في تقرير الأداء')
       if not member['active']:raise ValueError(f'{member["name"]}: الإداري مؤرشف؛ راجع التفعيل أولًا')
      elif option.startswith('new:'):
       rank=option[4:]
       if rank not in ('Administrator','Moderator','SN.Helper','Helper'):raise ValueError(f'{r["name"]}: اختر رتبة الإداري الجديد')
       if c.execute('SELECT 1 FROM members WHERE name=? COLLATE NOCASE',(r['name'],)).fetchone():raise Conflict('الاسم موجود؛ اختر العضو بدل إضافة مكرر')
       cur=c.execute('INSERT INTO members(name,rank,active,joined_on,display_order) VALUES(?,?,1,?,?)',(r['name'],rank,date_s,ix))
       mid=cur.lastrowid;new_count+=1
       c.execute('INSERT INTO ranks(member_id,rank,effective_on) VALUES(?,?,?)',(mid,rank,date_s))
       self._audit(c,'member-add-excel',r['name']+' rank='+rank)
      else:raise ValueError(f'{r["name"]}: مطابقة غير صحيحة')
      if mid in mids:raise Conflict('لا يمكن مطابقة صفين من Excel لنفس الإداري')
      mids.add(mid);saved_ids.append(mid)
      prev_t=c.execute('SELECT COALESCE(SUM(tickets),0) FROM entries WHERE week_id=? AND member_id=? AND end_on<?',(w['id'],mid,date_s)).fetchone()[0]
      if prev_t!=r['previous_tickets']:
       raise Conflict(f'{r["name"]}: Tickets السابقة في الشيت {r["previous_tickets"]}، والمسجلة في CHICO {prev_t}')
      previous=c.execute('SELECT flags_counter FROM entries WHERE week_id=? AND member_id=? AND end_on<? AND flags_counter IS NOT NULL ORDER BY end_on DESC,id DESC LIMIT 1',(w['id'],mid,date_s)).fetchone()
      opening=c.execute('SELECT flags_base FROM openings WHERE week_id=? AND member_id=?',(w['id'],mid)).fetchone()
      old_base=previous['flags_counter'] if previous else opening['flags_base'] if opening else None
      if old_base is not None and old_base!=r['previous_flags']:raise Conflict(f'{r["name"]}: Flags السابقة في Excel لا تطابق القراءة المحفوظة')
      if old_base is None:
       c.execute('INSERT INTO openings(week_id,member_id,flags_base,updated_at) VALUES(?,?,?,?)',(w['id'],mid,r['previous_flags'],now()))
      exact=c.execute('SELECT * FROM entries WHERE week_id=? AND member_id=? AND start_on=? AND end_on=?',(w['id'],mid,date_s,date_s)).fetchone()
      overlap=c.execute('SELECT 1 FROM entries WHERE week_id=? AND member_id=? AND NOT (end_on<? OR start_on>?) AND NOT (start_on=? AND end_on=?) LIMIT 1',(w['id'],mid,date_s,date_s,date_s,date_s)).fetchone()
      if overlap:raise Conflict(f'{r["name"]}: توجد قراءة تغطي هذا اليوم ضمن فترة مختلفة')
      oldrate=c.execute('SELECT rate FROM rate_evaluations WHERE member_id=? AND evaluation_date=?',(mid,date_s)).fetchone()
      same=(exact is not None and exact['tickets_counter']==r['tickets_counter'] and exact['flags_counter']==r['flags_counter'] and exact['hours']==r['hours'] and oldrate is not None and oldrate['rate']==r['rate'])
      if not same:
       rev=secrets.token_hex(16);stamp=now()
       if exact:
        c.execute('UPDATE entries SET mode="counter",tickets_counter=?,previous_tickets=?,flags_counter=?,previous_flags=?,rate=?,hours=?,revision=?,updated_at=? WHERE id=?',(r['tickets_counter'],r['previous_tickets'],r['flags_counter'],r['previous_flags'],r['rate'],r['hours'],rev,stamp,exact['id']))
       else:
        c.execute('INSERT INTO entries(week_id,member_id,start_on,end_on,mode,tickets,tickets_counter,previous_tickets,flags_counter,previous_flags,flags,rate,hours,note,revision,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(w['id'],mid,date_s,date_s,'counter',r['tickets'],r['tickets_counter'],r['previous_tickets'],r['flags_counter'],r['previous_flags'],r['flags'],r['rate'],r['hours'],'Excel sheet row '+str(r['source_row']),rev,stamp))
       c.execute('INSERT INTO rate_evaluations(week_id,member_id,evaluation_date,rate,revision,entered_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(member_id,evaluation_date) DO UPDATE SET rate=excluded.rate,revision=excluded.revision,updated_at=excluded.updated_at',(w['id'],mid,date_s,r['rate'],secrets.token_hex(16),stamp,stamp))
       self._reflow_member(c,w['id'],mid)
       written+=1
      else:unchanged+=1
     # Keep the exact Excel order for both manual and Excel workflows.
     if reset:c.execute('UPDATE members SET in_reporting=0')
     for i,mid in enumerate(saved_ids):c.execute('UPDATE members SET display_order=?,in_reporting=1 WHERE id=?',(i,mid))
     for i,r in enumerate(c.execute('SELECT id FROM members WHERE id NOT IN ('+','.join('?' for _ in saved_ids)+') ORDER BY display_order,id',saved_ids).fetchall(),start=len(saved_ids)):
      c.execute('UPDATE members SET display_order=? WHERE id=?',(i,r['id']))
     summary={'ok':True,'date':date_s,'saved':written,'unchanged':unchanged,'added_members':new_count,'totals':parsed['totals'],'reset':bool(reset),'ordering':'excel'}
     c.execute('INSERT INTO excel_imports(source_hash,for_date,rows_count,saved_at,operator,summary) VALUES(?,?,?,?,?,?)',(source_hash,date_s,len(parsed['rows']),now(),getattr(self._actor,'value','shared'),json.dumps(summary,ensure_ascii=False)))
     self._audit(c,'excel-import',json.dumps(summary,ensure_ascii=False))
     return summary
 def add_member(self,name,rank,joined=None):
    name=str(name).strip();rank=str(rank)
    if not 2<=len(name)<=48 or not all(ch.isalnum() or ch in '._- ' for ch in name):raise ValueError('الاسم يجب أن يكون من 2 إلى 48 حرفًا')
    if rank not in RANKS:raise ValueError('رتبة غير صحيحة')
    start=day(joined).isoformat() if joined else self.today().isoformat()
    with self.lock,self.conn() as c:
     if c.execute('SELECT 1 FROM members WHERE name=? COLLATE NOCASE',(name,)).fetchone():raise Conflict('هذا الاسم مسجل بالفعل')
     cur=c.execute('INSERT INTO members(name,rank,active,joined_on) VALUES(?,?,1,?)',(name,rank,start))
     c.execute('INSERT INTO ranks(member_id,rank,effective_on,grace) VALUES(?,?,?,0)',(cur.lastrowid,rank,start));self._audit(c,'member-add',name)
 def edit_member(self,mid,action,**kw):
    mid=int(mid)
    with self.lock,self.conn() as c:
     m=c.execute('SELECT * FROM members WHERE id=?',(mid,)).fetchone()
     if not m:raise ValueError('الإداري غير موجود')
     if action=='rename':
      newname=str(kw.get('name') or '').strip()
      if not 2<=len(newname)<=48 or not all(ch.isalnum() or ch in '._- ' for ch in newname):raise ValueError('الاسم غير صحيح')
      if c.execute('SELECT 1 FROM members WHERE name=? COLLATE NOCASE AND id!=?',(newname,mid)).fetchone():raise Conflict('هذا الاسم مسجل بالفعل')
      c.execute('UPDATE members SET name=? WHERE id=?',(newname,mid))
      self._audit(c,'member-rename',f'{m["name"]} -> {newname}')
     elif action=='rank':
      rank=kw.get('rank');effective=day(kw.get('effective_on')).isoformat()
      if rank not in RANKS:raise ValueError('رتبة غير صحيحة')
      if day(effective)>self.today():raise ValueError('تاريخ الترقية المستقبلي غير مدعوم؛ استخدم تاريخ سريان فعلي')
      if rank==m['rank']:raise ValueError('الرتبة هي نفسها')
      later=c.execute('SELECT 1 FROM entries WHERE member_id=? AND end_on>=? LIMIT 1',(mid,effective)).fetchone()
      if later:raise Conflict('لا يمكن تطبيق الترقية بأثر رجعي على تقارير محفوظة؛ استخدم تاريخًا لاحقًا')
      c.execute('UPDATE members SET rank=? WHERE id=?',(rank,mid))
      c.execute('INSERT INTO ranks(member_id,rank,effective_on,grace) VALUES(?,?,?,1)',(mid,rank,effective));self._audit(c,'member-rank',f'{m["name"]} {m["rank"]}->{rank} on {effective}')
     elif action=='resign':
      date_=day(kw.get('date')).isoformat()
      if c.execute('SELECT 1 FROM entries WHERE member_id=? AND start_on>? LIMIT 1',(mid,date_)).fetchone():raise Conflict('يوجد تقرير بعد تاريخ الاستقالة؛ راجعه قبل اعتماد التاريخ')
      c.execute('UPDATE members SET active=0,resigned_on=? WHERE id=?',(date_,mid));self._audit(c,'member-resign',f'{m["name"]} {date_}')
     elif action=='reactivate':
      date_=day(kw.get('date')).isoformat();c.execute('UPDATE members SET active=1,resigned_on=NULL WHERE id=?',(mid,));self._audit(c,'member-reactivate',f'{m["name"]} {date_}')
     else:raise ValueError('إجراء غير معروف')
 def manage_member(self,mid,*,name=None,rank=None,active=None,reporting=None,display_order=None):
    """Owner CRUD: update roster fields; historical rank change is dated today."""
    mid=int(mid)
    with self.lock,self.conn() as c:
     c.execute('BEGIN IMMEDIATE')
     row=c.execute('SELECT * FROM members WHERE id=?',(mid,)).fetchone()
     if not row:raise ValueError('الإداري غير موجود')
     if name is not None:
      name=str(name).strip()
      if not 2<=len(name)<=48 or not all(ch.isalnum() or ch in '._- ' for ch in name):raise ValueError('اسم الإداري غير صحيح')
      dupe=c.execute('SELECT id FROM members WHERE name=? COLLATE NOCASE AND id!=?',(name,mid)).fetchone()
      if dupe:raise Conflict('الاسم موجود بالفعل')
      c.execute('UPDATE members SET name=? WHERE id=?',(name,mid))
     if rank is not None and rank!=row['rank']:
      if rank not in RANKS:raise ValueError('رتبة غير صحيحة')
      c.execute('UPDATE members SET rank=? WHERE id=?',(rank,mid))
      c.execute('INSERT INTO ranks(member_id,rank,effective_on,grace) VALUES(?,?,?,1)',(mid,rank,self.today().isoformat()))
     if active is not None:
      if not isinstance(active,bool):raise ValueError('الحالة غير صحيحة')
      c.execute('UPDATE members SET active=?,resigned_on=? WHERE id=?',(int(active),None if active else self.today().isoformat(),mid))
     if reporting is not None:
      if not isinstance(reporting,bool):raise ValueError('الظهور في التقارير غير صحيح')
      c.execute('UPDATE members SET in_reporting=? WHERE id=?',(int(reporting),mid))
     if display_order is not None:
      position=int(display_order)
      if not 0<=position<=100000:raise ValueError('الترتيب غير صحيح')
      c.execute('UPDATE members SET display_order=? WHERE id=?',(position,mid))
     self._audit(c,'roster-edit',f'member_id={mid}; name={name}; rank={rank}; active={active}; reporting={reporting}; order={display_order}')
     return {'ok':True,'id':mid}
 def delete_member_permanently(self,mid):
    """Physical deletion including historical dependent records; archives invalidated."""
    mid=int(mid)
    with self.lock,self.conn() as c:
     c.execute('BEGIN IMMEDIATE')
     row=c.execute('SELECT name FROM members WHERE id=?',(mid,)).fetchone()
     if not row:raise ValueError('الإداري غير موجود')
     for table in ('entries','rate_evaluations','shift_assignments','openings','ranks'):
      c.execute('DELETE FROM '+table+' WHERE member_id=?',(mid,))
     c.execute('DELETE FROM members WHERE id=?',(mid,))
     # Snapshots are whole-roster JSON: removing them avoids stale removed identities.
     c.execute('DELETE FROM snapshots')
     c.execute('UPDATE weeks SET closing_snapshot=NULL')
     self._audit(c,'roster-delete',f'member_id={mid}; archived reports invalidated')
     return {'ok':True,'removed_id':mid}
 def reset_chico(self,scope):
    """Erase old statistics or every member, never security/settings."""
    if scope not in ('statistics','all'):raise ValueError('اختيار المسح غير صحيح')
    with self.lock,self.conn() as c:
     c.execute('BEGIN IMMEDIATE')
     for table in ('snapshots','rate_evaluations','entries','openings','excel_imports','shift_assignments','weeks'):
      c.execute('DELETE FROM '+table)
     if scope=='all':
      c.execute('DELETE FROM ranks')
      c.execute('DELETE FROM members')
     else:
      c.execute('DELETE FROM ranks')
      c.execute('UPDATE members SET joined_on=NULL,resigned_on=NULL,active=1,in_reporting=1')
      for row in c.execute('SELECT id,rank FROM members').fetchall():
       c.execute('INSERT INTO ranks(member_id,rank,effective_on,grace) VALUES(?,?,?,0)',(row['id'],row['rank'],'1900-01-01'))
     c.execute("INSERT INTO settings(key,value) VALUES('roster_initialized','1') ON CONFLICT(key) DO UPDATE SET value='1'")
     monday=wk(self.today())
     c.execute('INSERT INTO weeks(starts,ends,status,opened_at) VALUES(?,?,?,?)',(monday.isoformat(),(monday+timedelta(days=6)).isoformat(),'open',now()))
     c.execute('DELETE FROM audit')
     self._audit(c,'reset',f'{scope}; confirmed by owner after backup')
     return {'ok':True,'scope':scope,'kept_names_and_ranks':scope=='statistics'}
 def remove_record(self,kind,rec_id):
    """Delete individual editable record, keeping dependent ticket/flag maths consistent."""
    allowed={'entry':('entries','member_id','week_id'), 'rating':('rate_evaluations','member_id','week_id'),
             'shift':('shift_assignments','member_id',None), 'snapshot':('snapshots',None,None), 'opening':('openings','member_id','week_id')}
    if kind not in allowed:raise ValueError('نوع السجل غير صحيح')
    rec_id=int(rec_id)
    table,member_col,week_col=allowed[kind]
    with self.lock,self.conn() as c:
     c.execute('BEGIN IMMEDIATE')
     if kind=='opening':
      w=self.week(c)
      row=c.execute('SELECT member_id,week_id FROM openings WHERE member_id=? AND week_id=?',(rec_id,w['id'])).fetchone()
     else:
      row=c.execute(f'SELECT * FROM {table} WHERE id=?',(rec_id,)).fetchone()
     if not row:raise ValueError('السجل غير موجود')
     if week_col:
      w=self.week(c)
      if row['week_id']!=w['id']:raise Conflict('تعديل سجلات الأسبوع المغلق غير متاح؛ استخدم إعادة ضبط البيانات بالكامل')
     if kind=='opening':
      flags=c.execute('SELECT 1 FROM entries WHERE member_id=? AND week_id=? AND flags_counter IS NOT NULL LIMIT 1',(rec_id,row['week_id'])).fetchone()
      if flags:raise Conflict('احذف قراءات Flags قبل حذف رصيد البداية')
      c.execute('DELETE FROM openings WHERE member_id=? AND week_id=?',(rec_id,row['week_id']))
     else:
      c.execute('DELETE FROM '+table+' WHERE id=?',(rec_id,))
     if kind=='entry':self._reflow_member(c,row['week_id'],row['member_id'])
     if kind in ('entry','rating','opening'):
      c.execute('DELETE FROM snapshots')
      c.execute('UPDATE weeks SET closing_snapshot=NULL')
     self._audit(c,'delete-record',f'{kind} id={rec_id}')
     return {'ok':True,'kind':kind,'id':rec_id}
 def _period_report(self,report,start_s,end_s):
    start,end=day(start_s),day(end_s)
    week=report['week']
    if start<day(week['starts']) or end>day(week['ends']) or end<start:
     raise ValueError('التقرير خارج الأسبوع الحالي')
    people=[]
    for m in report['members']:
     x=dict(m)
     rr=[r for r in m['data'] if r['start_on']>=start_s and r['end_on']<=end_s]
     overlapping=[r for r in m['data'] if not (r['end_on']<start_s or r['start_on']>end_s) and r not in rr]
     x['overlapping_intervals']=[{'start_on':r['start_on'],'end_on':r['end_on'],'tickets':r['tickets'],'flags':r['flags']} for r in overlapping]
     x['daily_ratings']=[r for r in m['daily_ratings'] if start_s<=r['evaluation_date']<=end_s]
     x['data']=rr;x['entry_count']=len(rr)
     x['tickets']=sum(r['tickets'] for r in rr)
     x['flags']=sum(r['flags'] or 0 for r in rr)
     rates=[r['rate'] for r in x['daily_ratings']]
     x['rate']=round(sum(rates)/len(rates),3) if rates else None
     x['latest_rate']=x['daily_ratings'][-1]['rate'] if x['daily_ratings'] else None
     x['hours']=next((r['hours'] for r in reversed(rr) if r['hours'] is not None),None)
     people.append(x)
    source=[r for m in people for r in m['data'] if r.get('rank_at_entry') in ('Moderator','SN.Helper','Helper','Administrator')]
    team_source=[r for r in source if r.get('rank_at_entry') in ('Moderator','SN.Helper','Helper')]
    admin_source=[r for r in source if r.get('rank_at_entry')=='Administrator']
    overlapping=[{'member_id':m['id'],'name':m['name'],**r} for m in people for r in m['overlapping_intervals']]
    eligible=[m for m in people if m['rank'] in ('Moderator','SN.Helper','Helper','Administrator')]
    team=[m for m in eligible if m['rank']!='Administrator']
    rates=[r['rate'] for m in people for r in m['daily_ratings'] if r.get('rank_at_rating') in ('Moderator','SN.Helper','Helper')]
    count=len(source)
    flag_count=sum(r['flags'] is not None for r in source)
    missing=count-flag_count
    tickets=sum(r['tickets'] for r in source);flags=sum(r['flags'] or 0 for r in source)
    return {**report,'members':people,'period':{'from':start_s,'to':end_s},
     'overlapping_intervals':overlapping,'totals':{**report['totals'],'tickets':tickets,'team_tickets':sum(r['tickets'] for r in team_source),
       'admin_tickets':sum(r['tickets'] for r in admin_source),
       'flags':flags,'rate':round(sum(rates)/len(rates),2) if rates else None,
       'rate_observations':len(rates),'flag_rate':round(flags*100/tickets,2) if tickets and flag_count and not missing and not overlapping else None,
       'tickets_observations':count,'flags_observations':flag_count,
       'flags_missing_entries':missing,
       'unreported_team_members':sum(m['active'] and not m['entry_count'] for m in team)}}
 def period_view(self,start_s,end_s):
    with self.lock,self.conn() as c:
     w=self.week(c);return self._period_report(self._compile_week(c,w),start_s,end_s)
 def snapshot(self,kind,start=None,end=None):
    if kind not in ('weekly','daily'):raise ValueError('نوع التقرير غير صحيح')
    with self.lock,self.conn() as c:
     c.execute('BEGIN IMMEDIATE')
     w=self.week(c);report=self._compile_week(c,w)
     data=self._period_report(report,start,end) if kind=='daily' else report
     data['snapshot_created_at']=now()
     cur=c.execute('INSERT INTO snapshots(kind,week_id,created_at,payload) VALUES(?,?,?,?)',
       (kind,w['id'],data['snapshot_created_at'],json.dumps(data,ensure_ascii=False)))
     self._audit(c,'snapshot',f'{kind}: {cur.lastrowid}')
     return {'id':cur.lastrowid}
 def get_snapshot(self,sid):
    with self.conn() as c:
     r=c.execute('SELECT * FROM snapshots WHERE id=?',(int(sid),)).fetchone()
     if not r:return None
     result=dict(r)
     payload=json.loads(result['payload'])
     if payload.get('members') is not None and 'totals' not in payload:
      people=payload['members']
      team=[x for x in people if x.get('rank') in ('Moderator','SN.Helper','Helper')]
      admin=[x for x in people if x.get('rank')=='Administrator']
      eligible=team+admin
      tickets=sum(x.get('tickets') or 0 for x in eligible)
      flags=sum(x.get('flags') or 0 for x in eligible)
      records=[r for x in eligible for r in x.get('data',[])]
      known=sum(r.get('flags') is not None for r in records)
      rates=[r['rate'] for x in team for r in x.get('data',[]) if r.get('rate') is not None]
      payload['totals']={'tickets':tickets,'team_tickets':sum(x.get('tickets') or 0 for x in team),
       'admin_tickets':sum(x.get('tickets') or 0 for x in admin),'flags':flags,
       'flags_observations':known,'flags_missing_entries':len(records)-known,
       'tickets_observations':len(records),'unreported_team_members':sum(x.get('active') and not x.get('entry_count') for x in team),
       'flag_rate':round(100*flags/tickets,2) if known and tickets else None,
       'rate':round(sum(rates)/len(rates),2) if rates else None,
       'rate_observations':len(rates),'rate_basis':'manual_sample_mean_not_official_game_weekly_rating'}
      payload['report_schema']=2
      payload['legacy_reconstructed']=True
      result['payload']=json.dumps(payload,ensure_ascii=False)
     return result
 def close_week(self,leader,confirmed=False):
    if not confirmed:raise ValueError('يلزم تأكيد إغلاق الأسبوع يدويًا')
    with self.lock,self.conn() as c:
     c.execute('BEGIN IMMEDIATE');w=self.week(c)
     if self.today()<=day(w['ends']):raise ValueError('لم يبدأ الاثنين التالي بعد؛ لا يمكن إغلاق الأسبوع مبكرًا')
     report=self._compile_week(c,w)
     totals=report['totals']
     leader=leader if isinstance(leader,dict) else {}
     compare={}
     for k in ('team_tickets','admin_tickets','flags'):
      typed=num(leader.get(k),k,integer=True)
      compare[k]={'recorded':totals[k],'leader':typed,'difference':None if typed is None else totals[k]-typed}
     diff=[k for k,v in compare.items() if v['difference'] not in (None,0)]
     if diff and not leader.get('acknowledge_differences'):raise Conflict('في فروقات مع تقرير القائد؛ راجعها أو وافق صراحة على إغلاقها')
     opening=(day(w['starts'])+timedelta(days=7)).isoformat()
     closed_at=now()
     report.update({'kind':'weekly_closing','closed_at':closed_at,'checks':compare,
                    'closing_note':str(leader.get('note') or '')[:500]})
     payload=json.dumps(report,ensure_ascii=False)
     c.execute('UPDATE weeks SET status="closed",closed_at=?,closing_snapshot=?,closing_note=? WHERE id=?',
       (closed_at,payload,report['closing_note'],w['id']))
     c.execute('INSERT INTO snapshots(kind,week_id,created_at,payload) VALUES(?,?,?,?)',('weekly',w['id'],closed_at,payload))
     c.execute('INSERT INTO weeks(starts,ends,status,opened_at) VALUES(?,? ,"open",?)',
       (opening,(day(opening)+timedelta(days=6)).isoformat(),now()))
     self._audit(c,'weekly-close',f'{w["starts"]} closed; opened {opening}; mismatches {diff}')
     return {'closed':w['starts'],'opened':opening,'comparison':compare}
 def daily_backup(self):
    # Concurrent HTTP requests MUST NOT create the same SQLite backup at once.
    # Hold one re-entrant lock through existence check, creation and retention.
    with self.lock:
     folder=self.path.parent/'backups';folder.mkdir(exist_ok=True)
     filename=folder/f"CHICO_auto_{self.today().strftime('%Y%m%d')}.sqlite3"
     if not filename.exists():
      self.backup(filename)
      files=sorted(folder.glob('CHICO_auto_*.sqlite3'))
      for old in files[:-14]:old.unlink(missing_ok=True)
     return filename
 def delete_backups(self, filename=None):
    """Owner-confirmed permanent deletion; never follow user-controlled symlinks."""
    folder=(self.path.parent/'backups').resolve()
    with self.lock:
     if not folder.exists():return {'ok':True,'removed':0}
     if filename is not None:
      if not isinstance(filename,str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,140}\.sqlite3',filename):raise ValueError('اسم النسخة غير صحيح')
      candidates=[folder/filename]
     else:candidates=list(folder.glob('*.sqlite3'))
     count=0
     for target in candidates:
      if target.is_symlink() or target.resolve().parent!=folder:raise ValueError('مسار النسخة غير مسموح')
      if target.is_file():target.unlink();count+=1
     return {'ok':True,'removed':count}
 def diagnostics(self):
    """Read-only local database maintenance details (owner-authenticated HTTP only)."""
    with self.lock,self.conn() as c:
     integrity=c.execute('PRAGMA quick_check').fetchone()[0]
     fks=len(c.execute('PRAGMA foreign_key_check').fetchall())
     members=c.execute('SELECT COUNT(*) FROM members').fetchone()[0]
     entries=c.execute('SELECT COUNT(*) FROM entries').fetchone()[0]
     archived=c.execute('SELECT COUNT(*) FROM snapshots').fetchone()[0]
    folder=self.path.parent/'backups'
    backups=sorted((x for x in folder.glob('*.sqlite3') if x.is_file()),key=lambda x:x.stat().st_mtime,reverse=True) if folder.exists() else []
    return {'ok':integrity=='ok' and fks==0,'integrity':integrity,'foreign_key_errors':fks,
     'members':members,'entries':entries,'snapshots':archived,'backup_count':len(backups),
     'latest_backup':backups[0].name if backups else None,'database_bytes':self.path.stat().st_size,
     'backups':[{'name':x.name,'bytes':x.stat().st_size,'modified':datetime.fromtimestamp(x.stat().st_mtime,timezone.utc).isoformat()} for x in backups[:25]]}
 def restore_backup(self,filename,password,confirmation):
    """Restore a verified local backup, preserving an escape copy of current data.

    Only the authenticated Owner endpoint invokes this. The Owner must also
    provide the current Owner password and an explicit RESTORE confirmation.
    """
    if confirmation!='RESTORE':raise ValueError('اكتب RESTORE للتأكيد')
    if not isinstance(filename,str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,140}\.sqlite3',filename):
     raise ValueError('اسم النسخة غير صحيح')
    folder=self.path.parent/'backups'
    chosen=folder/filename
    if not chosen.is_file() or chosen.is_symlink() or chosen.resolve().parent!=folder.resolve():
     raise ValueError('النسخة غير موجودة في مجلد النسخ الاحتياطية المحلي')
    if not isinstance(password,str) or not password:raise ValueError('كلمة سر المالك مطلوبة')
    with self.lock:
     with self.conn() as c:
      stored=c.execute("SELECT value FROM settings WHERE key='owner_password'").fetchone()
      if not stored or not self._checkpw(password,stored['value']):raise ValueError('كلمة سر المالك غير صحيحة')
     with closing(sqlite3.connect(f'file:{chosen.as_posix()}?mode=ro',uri=True)) as s:
      if s.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or s.execute('PRAGMA foreign_key_check').fetchall():
       raise ValueError('ملف النسخة الاحتياطية تالف أو غير مترابط')
      tables={row[0] for row in s.execute("SELECT name FROM sqlite_master WHERE type='table'")}
      if not {'settings','members','weeks','entries','audit','sessions','snapshots','openings','ranks'}.issubset(tables):
       raise ValueError('هذه ليست قاعدة Chico Team مكتملة')
      if not s.execute("SELECT 1 FROM settings WHERE key='owner_password'").fetchone():
       raise ValueError('النسخة قديمة؛ يجب ترقيتها أولًا بصورة منفصلة')
     before=folder/f"CHICO_before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.sqlite3"
     self.backup(before)
     try:
      with closing(sqlite3.connect(chosen)) as src,closing(sqlite3.connect(self.path,timeout=30)) as dest:
       src.backup(dest)
      with self.conn() as c:
       if c.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or c.execute('PRAGMA foreign_key_check').fetchall():
        raise ValueError('الاستعادة فشلت في التحقق')
       c.execute('DELETE FROM sessions')
       self._audit(c,'restore',f'Owner restored local backup {filename}; rescue {before.name}')
     except Exception:
      # The rescue copy is verified; restore it even if a failed import partially touched the target.
      with closing(sqlite3.connect(before)) as src,closing(sqlite3.connect(self.path,timeout=30)) as dest:
       src.backup(dest)
      raise
     return {'restored':filename,'rescue':before.name,'sessions_revoked':True}
 def backup(self,target):
    """Produce a complete, checked SQLite backup without exposing live DB through HTTP."""
    path=Path(target);path.parent.mkdir(parents=True,exist_ok=True)
    if path.resolve()==self.path.resolve():raise ValueError('Backup destination must differ from database')
    stage=path.with_name(path.name+'.building')
    stage.unlink(missing_ok=True)
    try:
     with self.lock,self.conn() as source,closing(sqlite3.connect(stage)) as dest:source.backup(dest)
     with closing(sqlite3.connect(stage)) as check:
      if check.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('Backup integrity verification failed')
      if check.execute('PRAGMA foreign_key_check').fetchall():raise ValueError('Backup has orphaned records')
     os.replace(stage,path)
    finally:stage.unlink(missing_ok=True)
    return path

# Methods added for the protected, password-reconfirmed Owner recovery workflow.
