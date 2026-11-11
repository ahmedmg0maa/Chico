#!/usr/bin/env python3
"""Migrate a real CHICO Windows SQLite DB to Supabase, never the demo Excel fixture.

Dry-run by default. Requires the real %LOCALAPPDATA%/ChicoTeam/data/chico_team.sqlite3
file, Supabase DATABASE_URL and owner re-confirmation for --apply.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import sqlite3
import sys
import secrets
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.postgres import PgDatabase,EXPORT_TABLES
from app.core import now


def load_real_sqlite(path:Path):
    if not path.is_file():raise ValueError(f'لا توجد قاعدة بيانات في: {path}')
    with sqlite3.connect(f'file:{path.resolve().as_posix()}?mode=ro',uri=True) as source:
        source.row_factory=sqlite3.Row
        if source.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('SQLite integrity_check failed')
        if source.execute('PRAGMA foreign_key_check').fetchall():raise ValueError('SQLite has broken references')
        tables={row[0] for row in source.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        mandatory={'settings','members','ranks','weeks','entries','openings','snapshots','audit'}
        if not mandatory.issubset(tables):raise ValueError('Not a compatible CHICO SQLite database')
        archive={'schema':'chico-relational-v1','exported_at':now(),'tables':{}}
        for table in EXPORT_TABLES:
            if table not in tables:raise ValueError('CHICO database is too old; run the Windows 1.1 migration first: '+table)
            archive['tables'][table]=[dict(x) for x in source.execute('SELECT * FROM '+table)]
    return archive


def main():
    parser=argparse.ArgumentParser(description='CHICO local Windows SQLite -> Supabase PostgreSQL')
    parser.add_argument('--sqlite',required=True,type=Path,help='Path to your real Windows CHICO SQLite database')
    parser.add_argument('--apply',action='store_true',help='WRITE to Supabase; otherwise only validate and print counts')
    parser.add_argument('--force-replace',action='store_true',help='Explicitly allow replacing populated cloud reports')
    opts=parser.parse_args()
    archive=load_real_sqlite(opts.sqlite)
    counts={k:len(archive['tables'][k]) for k in ('members','weeks','entries','rate_evaluations','snapshots')}
    print('CHICO SQLite verified. Record counts:',json.dumps(counts,ensure_ascii=False))
    print('No writes performed yet.')
    if not opts.apply:return
    url=os.environ.get('DATABASE_URL','')
    if not url:raise ValueError('Set DATABASE_URL locally; do not paste your secret into chat')
    db=PgDatabase(url)
    owner=os.environ.get('CHICO_MIGRATION_OWNER_PASSWORD','')
    if not db.verify_role_password('owner',owner):raise ValueError('Cloud owner password re-confirmation failed')
    with db.conn() as c:
        existing=c.execute('SELECT COUNT(*) AS n FROM entries').fetchone()['n']
        # Keep secure new cloud password hashes and account records; never reinstate old defaults.
        archive['tables']['settings']=[dict(x) for x in c.execute('SELECT * FROM settings')]
        archive['tables']['users']=[dict(x) for x in c.execute('SELECT * FROM users')]
    if existing and not opts.force_replace:
        raise ValueError(f'Cloud already has {existing} entries. Use --force-replace after comparing backups.')
    filename='CHICO_windows_migration_'+secrets.token_hex(6)+'.json'
    content=json.dumps(archive,ensure_ascii=False,sort_keys=True,separators=(',',':'))
    digest=hashlib.sha256(content.encode()).hexdigest()
    with db.conn() as c:
        c.execute('INSERT INTO backups(filename,kind,created_at,content,sha256) VALUES(?,?,?,?,?)',
                  (filename,'windows-source',now(),content,digest))
    result=db.restore_backup(filename,owner,'RESTORE')
    with db.conn() as c:
        updated={k:c.execute('SELECT COUNT(*) AS n FROM '+k).fetchone()['n'] for k in counts}
    if updated!=counts:raise RuntimeError('Post-migration counts differ: '+str(updated))
    print('Migration completed. Checksum:',digest)
    print('Source record counts match cloud. Cloud backup:',result['restored'])
    print('All sessions revoked. No old insecure passwords were migrated.')

if __name__=='__main__':main()
