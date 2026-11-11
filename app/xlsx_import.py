"""CHICO's dependency-free, read-only XLSX parser for a fixed daily sheet layout.
No formulas/macros/external links are executed. Errors are blocking by default.
"""
from __future__ import annotations
import io, zipfile, re, math, xml.etree.ElementTree as ET
from datetime import datetime, date, timedelta
NS='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
COLS=('A','B','C','D','E','F','I','J','L','M')


def _date(value):
    if isinstance(value,(int,float)) or isinstance(value,str) and re.fullmatch(r'\d{5}(?:\.0)?',value.strip()):
        return (datetime(1899,12,30)+timedelta(days=float(value))).date().isoformat()
    if isinstance(value,str):
        s=value.strip()
        for fmt in ('%m/%d/%Y','%Y-%m-%d','%d/%m/%Y'):
            try:return datetime.strptime(s,fmt).date().isoformat()
            except ValueError:pass
    raise ValueError('تاريخ الصف غير قابل للفهم')


def _number(v,label,row,empty=False):
    if v is None or v=='':
        if empty:return None
        raise ValueError(f'الصف {row}: خانة {label} فارغة')
    if isinstance(v,bool):raise ValueError(f'الصف {row}: قيمة {label} غير صحيحة')
    try:f=float(str(v).replace(',','').strip())
    except (TypeError,ValueError):raise ValueError(f'الصف {row}: قيمة {label} غير رقمية')
    if not math.isfinite(f) or f<0:raise ValueError(f'الصف {row}: قيمة {label} غير صالحة')
    return f


def _integer(v,label,row):
    f=_number(v,label,row)
    if not f.is_integer() or f>10**8:raise ValueError(f'الصف {row}: {label} يجب أن يكون عددًا صحيحًا')
    return int(f)


def _hour(v,row):
    """Excel converted 1.5 into Jan 5 (and 8.5 into Aug 5) in seven cells.
    Only accept a genuinely date-formatted numeric cell for this known pattern;
    expose every such recovery in the preview so the operator can review it.
    """
    if v is None or v=='':return None,None
    value,style=v
    if style=='date' and isinstance(value,(int,float)):
        d=(datetime(1899,12,30)+timedelta(days=float(value))).date()
        if d.year!=2026 or d.day!=5 or d.month not in range(1,13):
            raise ValueError(f'الصف {row}: ساعات Excel محوّلة لتاريخ غير معروف؛ يلزم تصحيح الشيت')
        return float(f'{d.month}.5'),f'Excel date {d.isoformat()} → {d.month}.5 hours'
    return _number(value,'الساعات',row),None


def read_daily_xlsx(data:bytes):
    if not isinstance(data,bytes) or not 100<len(data)<=2_000_000:raise ValueError('حجم ملف Excel غير مدعوم (2MB كحد أقصى)')
    try:z=zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:raise ValueError('الملف ليس XLSX صحيحًا')
    with z:
        members=z.infolist()
        if len(members)>180 or sum(x.file_size for x in members)>9_000_000 or any(x.file_size>3_000_000 for x in members):
            raise ValueError('ملف Excel كبير أو غير اعتيادي')
        names=set(z.namelist())
        if 'xl/worksheets/sheet1.xml' not in names or 'xl/sharedStrings.xml' not in names:raise ValueError('بنية الشيت مختلفة عن النموذج المعتمد')
        if any(n.startswith(('xl/vbaProject','xl/externalLinks/')) for n in names):raise ValueError('الروابط الخارجية أو الماكرو غير مدعومة')
        strings=[]
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(f'.//{NS}si'):
            strings.append(''.join(t.text or '' for t in si.iter(f'{NS}t')))
        styles=[]
        if 'xl/styles.xml' in names:
            root=ET.fromstring(z.read('xl/styles.xml'))
            custom={int(x.get('numFmtId')):x.get('formatCode','') for x in root.findall(f'.//{NS}numFmt')}
            xfs=root.find(f'{NS}cellXfs')
            if xfs is not None:
                for xf in xfs.findall(f'{NS}xf'):
                    code_id=int(xf.get('numFmtId','0'))
                    fmt=custom.get(code_id,'')
                    styles.append('date' if code_id in range(14,23) or any(x in fmt.lower() for x in ('yy','mm','dd','m\\.d')) else 'number')
        doc=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        raw_rows=[]
        for row in doc.findall(f'.//{NS}sheetData/{NS}row'):
            r=int(row.get('r'))
            if r>500:raise ValueError('شيت أكبر من 500 صف غير مدعوم')
            cells={}
            for cell in row.findall(f'{NS}c'):
                ref=cell.get('r','');col=re.match(r'[A-Z]+',ref)
                if not col:continue
                col=col.group()
                if col not in COLS:continue
                v=cell.find(f'{NS}v');typ=cell.get('t')
                if v is None:continue
                value=v.text
                if typ=='s':
                    ix=int(value)
                    value=strings[ix]
                elif typ in ('str','inlineStr'):
                    pass
                else:
                    try:value=float(value)
                    except (TypeError,ValueError):pass
                st=int(cell.get('s','0'))
                style=styles[st] if st<len(styles) else 'number'
                cells[col]=(value,style)
            if cells:raw_rows.append((r,cells))
    if not raw_rows:raise ValueError('الشيت فارغ')
    header=raw_rows[0][1]
    a=str(header.get('A',('',''))[0]).strip().lower();b=str(header.get('B',('',''))[0]).strip().lower()
    if a!='date' or b!='admin':raise ValueError('يجب أن يبدأ الشيت بعمودي DATE وAdmin وفق النموذج المعتمد')
    rows=[];warnings=[];dates=set();seen=set()
    for r,cells in raw_rows[1:]:
        name=str(cells.get('B',('',''))[0]).strip()
        if not name:continue
        if name.lower() in ('total','totals','الإجمالي','اجمالي','grand total'):continue
        if not re.fullmatch(r'[\w. -]{2,48}',name,re.UNICODE):raise ValueError(f'الصف {r}: اسم الإداري غير صحيح')
        if name.lower() in seen:raise ValueError(f'اسم مكرر في الشيت: {name}')
        seen.add(name.lower())
        def cell(k):return cells.get(k,(None,'number'))[0]
        date_s=_date(cell('A'));dates.add(date_s)
        calls=_integer(cell('C'),'Daily Tickets',r);rate=_number(cell('D'),'Rate',r)
        if rate>5:raise ValueError(f'الصف {r}: Rate أكبر من خمسة')
        flags=_integer(cell('E'),'Daily Flags',r)
        hours,fix=_hour(cells.get('F',(None,'number')),r)
        if hours is not None and hours>168:raise ValueError(f'الصف {r}: الساعات تتجاوز 168')
        tc=_integer(cell('I'),'This Day Total Tickets',r);fc=_integer(cell('J'),'This Day Flags',r)
        pt=_integer(cell('L'),'Last Day Tickets',r);pf=_integer(cell('M'),'Last Total Flags',r)
        if tc-pt!=calls:raise ValueError(f'{name}: الفرق بين Tickets الحالية والسابقة لا يساوي Daily Tickets في الصف {r}')
        if fc-pf!=flags:raise ValueError(f'{name}: الفرق بين Flags الحالية والسابقة لا يساوي Daily Flags في الصف {r}')
        if fix:warnings.append({'row':r,'name':name,'message':fix})
        if calls==0 and rate==5:warnings.append({'row':r,'name':name,'message':'Rate=5 despite zero Tickets; verify game rating'})
        rows.append({'source_row':r,'name':name,'date':date_s,'tickets':calls,'rate':round(rate,3),'flags':flags,'hours':round(hours,3) if hours is not None else None,'tickets_counter':tc,'previous_tickets':pt,'flags_counter':fc,'previous_flags':pf,'hours_conversion':fix})
    if not 1<=len(rows)<=200:raise ValueError('لا توجد صفوف إداريين في ملف Excel')
    if len(dates)!=1:raise ValueError('الشيت يحتوي على أكثر من تاريخ؛ كل رفع ليوم واحد فقط')
    return {'date':rows[0]['date'],'rows':rows,'warnings':warnings,'totals':{'members':len(rows),'tickets':sum(r['tickets'] for r in rows),'flags':sum(r['flags'] for r in rows),'flag_rate':round(sum(r['flags'] for r in rows)*100/sum(r['tickets'] for r in rows),2) if sum(r['tickets'] for r in rows) else None}}
