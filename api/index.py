"""CHICO Command Center · authenticated FastAPI entrypoint for Vercel + Supabase."""
from __future__ import annotations
import base64
import hashlib
import json
import os
import secrets
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from app.core import Database, Conflict, now
from app.xlsx_import import read_daily_xlsx

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'public'
app=FastAPI(title='CHICO GENERAL TEAM',docs_url=None,redoc_url=None,openapi_url=None)
_lock=threading.RLock()
_db=None
_local_previews={}
_attempts={}


def database():
    global _db
    with _lock:
        if _db is None:
            if os.environ.get('CHICO_LOCAL_SQLITE')=='1':
                if os.environ.get('VERCEL'):
                    raise RuntimeError('SQLite local mode is forbidden on Vercel')
                base=Path(os.environ.get('CHICO_LOCAL_DATA',str(ROOT/'local_data')))
                base.mkdir(exist_ok=True,parents=True)
                _db=Database(base/'chico_team.sqlite3')
            else:
                from app.postgres import PgDatabase
                _db=PgDatabase(os.environ.get('DATABASE_URL',''))
        return _db


def backup_target(db,filename):
    return Path('/tmp')/filename if hasattr(db,'url') else db.path.parent/'backups'/filename

def api_error(status,message):return JSONResponse({'error':str(message)},status_code=status)

def role_of(db,request):
    auth=request.headers.get('authorization','')
    token=auth[7:] if auth.startswith('Bearer ') else ''
    return ('owner' if db.auth_role(token)=='owner' else None,token)

def _previews_set(db,ticket,token,parsed,source_hash):
    sess=hashlib.sha256(token.encode()).hexdigest()
    expiry=(datetime.now(timezone.utc)+timedelta(minutes=15)).isoformat()
    if hasattr(db,'url'):
        with db.conn() as c:
            c.execute('DELETE FROM import_previews WHERE expires_at<?',(now(),))
            c.execute('INSERT INTO import_previews(ticket_hash,session_hash,parsed,source_hash,expires_at) VALUES(?,?,?,?,?)',
                     (hashlib.sha256(ticket.encode()).hexdigest(),sess,json.dumps(parsed,ensure_ascii=False),source_hash,expiry))
    else:
        _local_previews[ticket]={'token':sess,'parsed':parsed,'source_hash':source_hash,'expiry':expiry}

def _previews_get(db,ticket,token):
    if not isinstance(ticket,str) or len(ticket)>200:return None
    sess=hashlib.sha256(token.encode()).hexdigest()
    if hasattr(db,'url'):
        with db.conn() as c:
            row=c.execute('SELECT * FROM import_previews WHERE ticket_hash=? AND expires_at>?',
                          (hashlib.sha256(ticket.encode()).hexdigest(),now())).fetchone()
        if not row or row['session_hash']!=sess:return None
        return {'parsed':json.loads(row['parsed']),'source_hash':row['source_hash']}
    obj=_local_previews.get(ticket)
    if not obj or obj['token']!=sess or obj['expiry']<now():return None
    return obj

def _previews_delete(db,ticket):
    if hasattr(db,'url'):
        with db.conn() as c:c.execute('DELETE FROM import_previews WHERE ticket_hash=?',(hashlib.sha256(ticket.encode()).hexdigest(),))
    else:_local_previews.pop(ticket,None)

@app.middleware('http')
async def secure_headers(request,call_next):
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['X-Frame-Options']='DENY'
    response.headers['Referrer-Policy']='no-referrer'
    response.headers['Permissions-Policy']='camera=(), microphone=(), geolocation=()'
    response.headers['Content-Security-Policy']=(
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
      "img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    )
    response.headers['Cache-Control']='no-store' if request.url.path.startswith('/api/') else 'public, max-age=300'
    return response

@app.api_route('/api/{path:path}',methods=['GET','POST'])
async def api_routes(path:str,request:Request):
    if path=='health':
        try:
            d=database()
            if hasattr(d,'url'):
                with d.conn() as c:c.execute('SELECT 1')
            return {'ok':True,'version':'4.0-web','storage':'Supabase PostgreSQL' if hasattr(d,'url') else 'local-dev SQLite'}
        except Exception:
            return api_error(503,'قاعدة البيانات غير جاهزة؛ راجع إعدادات الموقع')
    try:
        db=database()
        if request.method=='POST':
            raw=await request.body()
            limit=3_000_000 if path=='import/preview' else 220000
            if not 0<len(raw)<=limit:return api_error(413,'Request too large or empty')
            if 'application/json' not in request.headers.get('content-type',''):return api_error(415,'Expected JSON')
            try:data=json.loads(raw)
            except (ValueError,UnicodeError):return api_error(400,'JSON غير صحيح')
            if not isinstance(data,dict):return api_error(400,'Expected JSON object')
        else:data={}
        if path=='login' and request.method=='POST':
            # Shared rate limit persisted in PostgreSQL across serverless functions.
            password=str(data.get('password',''))[:256]
            if not password:return api_error(401,'كلمة السر مطلوبة')
            address=request.headers.get('x-real-ip') or (request.client.host if request.client else 'unknown')
            if hasattr(db,'login_limited'):
                token,limited=db.login_limited(password,address)
                if token and db.auth_role(token)!='owner':
                    db.logout(token);token=None
                if limited:return api_error(429,'محاولات كثيرة؛ حاول مرة أخرى بعد خمس دقائق')
            else:
                with _lock:
                    t=datetime.now(timezone.utc).timestamp()
                    attempts=[x for x in _attempts.get(address,[]) if t-x<300]
                    _attempts[address]=attempts
                    if len(attempts)>=12:return api_error(429,'محاولات كثيرة؛ حاول بعد خمس دقائق')
                token=db.login(password)
                if token and db.auth_role(token)!='owner':
                    db.logout(token);token=None
                if not token:
                    with _lock:_attempts.setdefault(address,[]).append(t)
            if not token:return api_error(401,'كلمة السر غير صحيحة')
            return {'token':token,'role':db.auth_role(token)}
        role,token=role_of(db,request)
        if not role:return api_error(401,'سجل الدخول أولًا')
        owner=role=='owner'
        if path=='state' and request.method=='GET':
            return {**db.view(),'access_role':role}
        if path=='owner/users' and request.method=='GET':
            return api_error(404,'الحسابات الفردية غير مستخدمة: الدخول بكلمة سر المالك فقط')
        if False and path=='owner/users' and request.method=='GET':
            if not owner:return api_error(403,'للمالك فقط')
            return {'users':db.list_accounts()}
        if path=='owner/diagnostics' and request.method=='GET':
            if not owner:return api_error(403,'للمالك فقط')
            return db.diagnostics()
        if path=='owner/backup/download' and request.method=='GET':
            if not owner:return api_error(403,'للمالك فقط')
            filename=request.query_params.get('filename','')
            if not hasattr(db,'export_backup'):return api_error(400,'Cloud backup download is available in Supabase mode')
            raw=db.export_backup(filename)
            return Response(raw,media_type='application/json',headers={'Content-Disposition':f'attachment; filename="{filename}"'})
        if path=='entry' and request.method=='GET':
            p=request.query_params
            return {'entry':db.get_entry(int(p.get('member','0')),p.get('from',''),p.get('to',''))}
        if path=='report' and request.method=='GET':
            p=request.query_params
            return db.period_view(p.get('from',''),p.get('to',''))
        if path=='snapshot' and request.method=='GET':
            snap=db.get_snapshot(request.query_params.get('id','0'))
            return {'snapshot':snap} if snap else api_error(404,'تقرير غير موجود')
        if request.method!='POST':return api_error(404,'الصفحة غير موجودة')
        if path=='logout':
            db.logout(token);return {'ok':True}
        if path=='owner/users/create':return api_error(404,'الدخول بكلمة سر واحدة فقط')
        if False and path=='owner/users/create':
            if not owner:return api_error(403,'للمالك فقط')
            db.daily_backup();return db.upsert_account(data.get('username'),data.get('password'),data.get('role'))
        if path=='owner/users/update':return api_error(404,'الدخول بكلمة سر واحدة فقط')
        if False and path=='owner/users/update':
            if not owner:return api_error(403,'للمالك فقط')
            db.daily_backup();return db.set_account(data.get('username'),data.get('active'),data.get('new_password'))
        if path=='password/change':
            if not owner:return api_error(403,'للمالك فقط')
            db.change_role_password('owner',str(data.get('old') or ''),str(data.get('new') or ''))
            return {'ok':True,'sessions_revoked':True}
        if path=='owner/backup':
            if not owner:return api_error(403,'للمالك فقط')
            filename='CHICO_manual_'+datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f')+('.json' if hasattr(db,'url') else '.sqlite3')
            db.backup(backup_target(db,filename))
            return {'ok':True,'filename':filename,'verified':True}
        if path=='owner/backup/delete':
            if not owner:return api_error(403,'للمالك فقط')
            filename=data.get('filename')
            phrase='DELETE BACKUP' if filename else 'DELETE BACKUPS'
            if data.get('confirmation')!=phrase:return api_error(400,'تأكيد الحذف غير صحيح')
            if not db.verify_role_password('owner',str(data.get('password') or '')):return api_error(403,'كلمة السر غير صحيحة')
            return db.delete_backups(filename)
        if path=='owner/restore':
            if not owner:return api_error(403,'للمالك فقط')
            return db.restore_backup(data.get('filename'),data.get('owner_password'),data.get('confirmation'))
        if path=='owner/shutdown':return api_error(405,'Shutdown is unavailable for a hosted web service')
        if path=='import/preview':
            encoded=data.get('data','')
            if not isinstance(encoded,str) or len(encoded)>2_750_000:raise ValueError('ملف Excel كبير للغاية')
            try:excel=base64.b64decode(encoded,validate=True)
            except Exception:raise ValueError('ملف Excel غير صحيح')
            parsed=read_daily_xlsx(excel)
            view=db.preview_excel(parsed)
            ticket=secrets.token_urlsafe(32)
            _previews_set(db,ticket,token,parsed,hashlib.sha256(excel).hexdigest())
            view['ticket']=ticket
            return view
        if path=='import/commit':
            info=_previews_get(db,data.get('ticket'),token)
            if not info:return api_error(409,'انتهت صلاحية المعاينة؛ ارفع الملف مرة أخرى')
            reset=data.get('reset') is True
            if (reset or any(str(v).startswith('new:') for v in (data.get('mapping') or {}).values())) and not owner:
                return api_error(403,'إضافة إداري أو تصفير البيانات يتطلب المالك')
            if reset:
                if not db.verify_role_password('owner',data.get('owner_password')):
                    return api_error(403,'أدخل كلمة سر المالك قبل تصفير البيانات')
                filename='CHICO_before_excel_reset_'+secrets.token_hex(12)+('.json' if hasattr(db,'url') else '.sqlite3')
                db.backup(backup_target(db,filename))
            else:db.daily_backup()
            result=db.commit_excel(info['parsed'],data.get('mapping'),reset,
                                   'RESET_AND_IMPORT' if reset else '',info['source_hash'])
            _previews_delete(db,data.get('ticket'))
            return result
        if path=='members/manage':
            if not owner:return api_error(403,'للمالك فقط')
            db.daily_backup()
            return db.manage_member(data.get('id'),name=data.get('name'),rank=data.get('rank'),active=data.get('active'),reporting=data.get('reporting'),display_order=data.get('display_order'))
        if path=='members/delete':
            if not owner:return api_error(403,'للمالك فقط')
            if data.get('confirm')!='DELETE':return api_error(400,'يلزم تأكيد الحذف')
            db.daily_backup()
            return db.delete_member_permanently(data.get('id'))
        if path=='records/delete':
            if not owner:return api_error(403,'للمالك فقط')
            if data.get('confirm')!='DELETE':return api_error(400,'يلزم تأكيد الحذف')
            db.daily_backup()
            return db.remove_record(str(data.get('kind') or ''),data.get('id'))
        if path=='data/reset':
            if not owner:return api_error(403,'للمالك فقط')
            scope=str(data.get('scope') or '')
            confirmation='RESET STATS' if scope=='statistics' else 'DELETE ALL' if scope=='all' else None
            if not confirmation or data.get('confirmation')!=confirmation:return api_error(400,'تأكيد المسح غير صحيح')
            if not db.verify_role_password('owner',str(data.get('password') or '')):return api_error(403,'كلمة السر غير صحيحة')
            filename='CHICO_before_'+scope+'_'+datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f')+('.json' if hasattr(db,'url') else '.sqlite3')
            db.backup(backup_target(db,filename))
            result=db.reset_chico(scope)
            return {**result,'backup':filename}
        if path in ('members/add','members/update','close','openings','ratings','entry','shift'):
            if path in ('members/add','members/update','close','openings','shift') and not owner:
                return api_error(403,'هذا الإجراء متاح للمالك فقط')
            db.daily_backup()
        if path=='entry':return db.save_batch(data.get('from'),data.get('to'),data.get('rows'))
        if path=='ratings':return db.save_ratings(data.get('evaluation_date'),data.get('rows'))
        if path=='shift':return db.save_shift(data.get('member_id'),data.get('shift'),data.get('effective_on'))
        if path=='openings':return db.set_openings(data.get('rows'),data.get('reason',''))
        if path=='openings/preview':
            if not owner:return api_error(403,'للمالك فقط')
            return db.preview_opening_correction(data.get('member_id'),data.get('flags_base'))
        if path=='members/add':
            db.add_member(data.get('name'),data.get('rank'),data.get('joined_on'));return {'ok':True}
        if path=='members/update':
            db.edit_member(data.get('id'),data.get('action'),**{k:v for k,v in data.items() if k not in ('id','action')})
            return {'ok':True}
        if path=='snapshot':return db.snapshot(data.get('kind','weekly'),data.get('from'),data.get('to'))
        if path=='close':return db.close_week(data.get('leader'),data.get('confirmed') is True)
        return api_error(404,'Unknown API route')
    except Conflict as e:return api_error(409,str(e))
    except (ValueError,TypeError,KeyError,OverflowError,sqlite3.IntegrityError) as e:
        return api_error(400,str(e))
    except Exception as e:
        # Do not leak DB credentials/SQL/paths to clients.
        import logging
        logging.exception('CHICO API failure at %s',path)
        return api_error(500,'Internal error; no operation confirmed')

app.mount('/',StaticFiles(directory=str(PUBLIC),html=True),name='public')
