"""Supabase PostgreSQL adapter for the reviewed CHICO 1.1 accounting engine.

Keeps calculations in app.core while replacing persistent SQLite with native relational
PostgreSQL tables. All public API access goes through owner/team authentication.
"""
from __future__ import annotations
import hashlib
import json
import os
import re
import secrets
import threading
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from app.core import Database, ROSTER, now, wk

TABLES = ('settings','members','ranks','weeks','openings','entries','snapshots',
          'audit','sessions','users','rate_evaluations','shift_assignments','data_migrations','excel_imports')
EXPORT_TABLES = ('settings','members','ranks','weeks','openings','entries','snapshots',
                 'audit','users','rate_evaluations','shift_assignments','data_migrations','excel_imports')
IDENTITY = {'members','ranks','weeks','entries','snapshots','audit','rate_evaluations',
            'shift_assignments','excel_imports'}

class PgRow(dict):
    """Mimic sqlite3.Row's column-name AND numerical-index access."""
    def __getitem__(self, key):
        if isinstance(key,int):
            return tuple(self.values())[key]
        return super().__getitem__(key)

class PgCursor:
    def __init__(self, handle, conn, is_insert=False):
        self.handle, self.conn, self.is_insert=handle,conn,is_insert
        self._lastrowid=None
    @property
    def lastrowid(self):
        if self._lastrowid is None and self.is_insert:
            # PostgreSQL equivalent of SQLite cursor.lastrowid, inside same transaction.
            with self.conn.cursor() as c:
                c.execute('SELECT LASTVAL()')
                self._lastrowid=next(iter(c.fetchone().values()))
        return self._lastrowid
    def fetchone(self):
        r=self.handle.fetchone()
        return PgRow(r) if r is not None else None
    def fetchall(self):return [PgRow(x) for x in self.handle.fetchall()]
    def __iter__(self):
        for r in self.handle:yield PgRow(r)

class PgCompat:
    def __init__(self,conn):self.conn=conn
    def execute(self,sql,args=None):
        norm=sql.strip()
        if norm.upper()=='BEGIN IMMEDIATE':
            # conn() already opened a transaction and acquired a cross-process lock.
            return self
        if norm.upper()=='SELECT LAST_INSERT_ROWID()':norm='SELECT LASTVAL() AS lastrowid'
        # SQLite's double quotes were used for literal status/rank labels.
        for literal in ('Responsible','Administrator','Moderator','SN.Helper','Helper','counter','closed','open'):
            norm=norm.replace('"'+literal+'"', "'"+literal+"'")
        norm=re.sub(r'\s+COLLATE\s+NOCASE\b','',norm,flags=re.I)
        norm=norm.replace('?', '%s')
        c=self.conn.execute(norm, tuple(args or ()))
        return PgCursor(c,self.conn,norm[:6].upper()=='INSERT')
    def fetchone(self):return None

class PgDatabase(Database):
    """Native relational PostgreSQL persistence with the original report calculations.

    A transaction-scoped advisory lock serializes writes across Vercel functions;
    the transaction pooler can safely release connections after each request.
    """
    def __init__(self, url:str, tz='Africa/Cairo'):
        if not url or not url.startswith(('postgres://','postgresql://')):
            raise RuntimeError('DATABASE_URL: Supabase PostgreSQL connection string required')
        self.url=url
        self.lock=threading.RLock()
        self._actor=threading.local()
        self.tzname=tz
        self.tz=ZoneInfo(tz)
        self.path=Path('/tmp/chico_postgres') # legacy display only; NOT a data file.
        self.first_password=None
        self._setup_pg()

    @contextmanager
    def conn(self):
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError as e:
            raise RuntimeError('Install psycopg[binary] for Supabase mode') from e
        # One connection per request transaction; compatible with Supavisor transaction pooler.
        with psycopg.connect(self.url, row_factory=dict_row, prepare_threshold=None,
                             connect_timeout=12, sslmode='require') as raw:
            with raw.transaction():
                raw.execute('SELECT pg_advisory_xact_lock(%s)', (734187236,))
                raw.execute('SET LOCAL search_path = chico, public')
                yield PgCompat(raw)

    def _setup_pg(self):
        # Scripts are deterministic, idempotent and write no test statistics.
        sql=(Path(__file__).resolve().parents[1]/'db'/'schema.sql').read_text('utf8')
        # File has no semicolons inside SQL quoted strings.
        with self.lock,self.conn() as c:
            for statement in sql.split(';'):
                stmt='\n'.join(line for line in statement.splitlines() if not line.lstrip().startswith('--')).strip()
                if stmt:c.execute(stmt)
            has_owner=c.execute("SELECT value FROM settings WHERE key='owner_password'").fetchone()
            if not has_owner:
                password=os.environ.get('CHICO_OWNER_PASSWORD','')
                if len(password)<12 or password in ('ChicoAdmin','ChicoTop1'):
                    raise RuntimeError('Set a unique CHICO_OWNER_PASSWORD (at least 12 characters) before initial deployment')
                c.execute('INSERT INTO settings(key,value) VALUES(%s,%s)'.replace('%s','?'),('owner_password',self._hashpw(password)))
            has_team=c.execute("SELECT value FROM settings WHERE key='team_password'").fetchone()
            if not has_team:
                password=secrets.token_urlsafe(48)  # not usable for shared login: Studio 4 is owner password-only
                c.execute('INSERT INTO settings(key,value) VALUES(?,?)',('team_password',self._hashpw(password)))
            c.execute('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT (key) DO NOTHING',('tz',self.tzname))
            already_initialized=c.execute("SELECT 1 FROM settings WHERE key='roster_initialized'").fetchone()
            if not already_initialized and not c.execute('SELECT 1 FROM members LIMIT 1').fetchone():
                for rank,names in ROSTER.items():
                    for name in names:
                        mid=c.execute('INSERT INTO members(name,rank,active) VALUES(?,?,1)',(name,rank)).lastrowid
                        c.execute('INSERT INTO ranks(member_id,rank,effective_on,grace) VALUES(?,?,?,0)',(mid,rank,'1900-01-01'))
                memee=c.execute('INSERT INTO members(name,rank,active,resigned_on) VALUES(?,?,0,?)',
                                ('Memee','Helper',self.today().isoformat())).lastrowid
                c.execute('INSERT INTO ranks(member_id,rank,effective_on) VALUES(?,?,?)',(memee,'Helper','1900-01-01'))
                monday=wk(self.today())
                c.execute('INSERT INTO weeks(starts,ends,status,opened_at) VALUES(?,?,?,?)',
                          (monday.isoformat(),(monday+timedelta(days=6)).isoformat(),'open',now()))
                self._audit(c,'initialise','Team names and ranks only; no performance statistics')
            c.execute("INSERT INTO settings(key,value) VALUES('roster_initialized','1') ON CONFLICT(key) DO NOTHING")

    def _export_data(self,c):
        out={'schema':'chico-relational-v1','exported_at':now(),'tables':{}}
        for table in EXPORT_TABLES:
            out['tables'][table]=[dict(row) for row in c.execute(f'SELECT * FROM {table}')]
        return out
    def backup(self,target):
        # The backup is saved in Supabase itself (not /tmp on a serverless worker).
        filename=Path(target).name
        kind='manual' if 'manual' in filename else 'pre-reset' if 'reset' in filename else 'pre-restore' if 'restore' in filename else 'automatic'
        with self.lock,self.conn() as c:
            content=json.dumps(self._export_data(c),ensure_ascii=False,sort_keys=True,separators=(',',':'))
            digest=hashlib.sha256(content.encode()).hexdigest()
            c.execute('INSERT INTO backups(filename,kind,created_at,content,sha256) VALUES(?,?,?,?,?) ON CONFLICT(filename) DO NOTHING',
                      (filename,kind,now(),content,digest))
        return Path(filename)

    def daily_backup(self):
        today=self.today().strftime('%Y%m%d')
        filename=f'CHICO_auto_{today}.json'
        # Cheap existence check avoids copying every table on each write.
        with self.conn() as c:
            exists=c.execute('SELECT 1 FROM backups WHERE filename=?',(filename,)).fetchone()
        if not exists:self.backup(filename)
        with self.conn() as c:
            c.execute("DELETE FROM backups WHERE kind='automatic' AND filename NOT IN (SELECT filename FROM backups WHERE kind='automatic' ORDER BY created_at DESC LIMIT 14)")
        return filename

    def delete_backups(self, filename=None):
        with self.lock,self.conn() as c:
            if filename is None:
                row=c.execute('SELECT COUNT(*) AS n FROM backups').fetchone()
                c.execute('DELETE FROM backups')
                return {'ok':True,'removed':row['n']}
            if not isinstance(filename,str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,140}\.json',filename):
                raise ValueError('اسم النسخة غير صحيح')
            found=c.execute('SELECT 1 FROM backups WHERE filename=?',(filename,)).fetchone()
            if not found:raise ValueError('النسخة مش موجودة')
            c.execute('DELETE FROM backups WHERE filename=?',(filename,))
            return {'ok':True,'removed':1}

    def diagnostics(self):
        with self.lock,self.conn() as c:
            counts={t:c.execute(f'SELECT COUNT(*) AS n FROM {t}').fetchone()['n'] for t in ('members','entries','snapshots')}
            backup_rows=[dict(x) for x in c.execute('SELECT filename,created_at,length(content) AS size FROM backups ORDER BY created_at DESC LIMIT 25')]
        return {'ok':True,'integrity':'PostgreSQL foreign-key constraints active','foreign_key_errors':0,
                'members':counts['members'],'entries':counts['entries'],'snapshots':counts['snapshots'],
                'backup_count':len(backup_rows),'latest_backup':backup_rows[0]['filename'] if backup_rows else None,
                'backups':[{'name':x['filename'],'bytes':x['size'],'modified':x['created_at']} for x in backup_rows]}

    def export_backup(self, filename):
        if not isinstance(filename,str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,140}\.json',filename):
            raise ValueError('Backup filename not valid')
        with self.conn() as c:
            row=c.execute('SELECT content,sha256 FROM backups WHERE filename=?',(filename,)).fetchone()
        if not row:raise ValueError('Backup not found')
        if hashlib.sha256(row['content'].encode()).hexdigest()!=row['sha256']:
            raise ValueError('Backup integrity check failed')
        return row['content']

    def restore_backup(self, filename, password, confirmation):
        if confirmation!='RESTORE':raise ValueError('اكتب RESTORE للتأكيد')
        if not self.verify_role_password('owner', password):raise ValueError('كلمة مرور المالك غير صحيحة')
        # Preserve current database before restoring. Both versions remain server-side.
        self.backup('CHICO_before_restore_'+secrets.token_hex(10)+'.json')
        raw=self.export_backup(filename)
        data=json.loads(raw)
        if data.get('schema')!='chico-relational-v1' or set(data.get('tables',{}))!=set(EXPORT_TABLES):
            raise ValueError('Backup schema does not match')
        with self.lock,self.conn() as c:
            for table in reversed(EXPORT_TABLES):c.execute(f'DELETE FROM {table}')
            # Identity tables require explicit ID preserving old relations.
            for table in EXPORT_TABLES:
                rows=data['tables'][table]
                if not isinstance(rows,list) or len(rows)>500000:raise ValueError('Backup is too large')
                for row in rows:
                    keys=list(row)
                    if not keys or any(not re.fullmatch(r'[a-z_][a-z0-9_]*', k) for k in keys):raise ValueError('Invalid backup data')
                    values=tuple(row[k] for k in keys)
                    c.execute(f"INSERT INTO {table} ({','.join(keys)}) VALUES ({','.join('?' for _ in keys)})",values)
            for table in IDENTITY:
                c.execute('SELECT setval(pg_get_serial_sequence(?, ?), GREATEST(COALESCE((SELECT MAX(id) FROM '+table+'),0),1), COALESCE((SELECT MAX(id) FROM '+table+'),0)>0)',
                          ('chico.'+table,'id'))
            c.execute('DELETE FROM sessions')
            self._audit(c,'restore',f'Restored {filename}, verified checksum, revoked sessions')
        return {'restored':filename,'sessions_revoked':True}

    def login_limited(self, password, ip, username=None):
        """Postgres-backed shared rate limiting, rather than memory per function instance."""
        source=hashlib.sha256(str(ip).encode()).hexdigest()
        five=(datetime.now(timezone.utc)-timedelta(minutes=5)).isoformat()
        with self.conn() as c:
            c.execute('DELETE FROM login_attempts WHERE at<?',(five,))
            count=c.execute('SELECT COUNT(*) AS n FROM login_attempts WHERE source_hash=?',(source,)).fetchone()['n']
            if count>=12:return None, True
        token=self.login(password,username)
        if not token:
            with self.conn() as c:c.execute('INSERT INTO login_attempts(source_hash,at) VALUES(?,?)',(source,now()))
        else:
            with self.conn() as c:c.execute('DELETE FROM login_attempts WHERE source_hash=?',(source,))
        return token,False
