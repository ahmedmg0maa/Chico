const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const sql=source('db/009_points_live.sql');
const ui=source('src/components/v2/AdvancedAdministration.tsx');
const api=source('src/app/api/points/route.ts');
const settings=source('src/app/api/points/config/route.ts');
const undo=source('src/app/api/points/[id]/route.ts');
for(const table of ['point_settings','point_events']){
 assert(sql.includes('CREATE TABLE IF NOT EXISTS chico_next.'+table),'Missing table '+table);
 assert(sql.includes('ALTER TABLE chico_next.'+table+' ENABLE ROW LEVEL SECURITY'),'Missing RLS '+table);
 assert(sql.includes('REVOKE ALL ON TABLE chico_next.point_settings,chico_next.point_events FROM PUBLIC,anon,authenticated'),'Missing private grants');
}
assert(sql.includes('ON DELETE SET NULL'),'History must survive administrator removal');
assert(sql.includes('CONSTRAINT chico_point_category_sign'),'Point signs enforced at database level');
assert(api.includes('requireOwner(req)')&&settings.includes('requireOwner(req)')&&undo.includes('requireOwner(req)'));
assert(api.includes("rank IN ('Helper','SN.Helper','Moderator')"),'General and Administrator excluded');
assert(api.includes('validDay(v.date)'),'Validate point event date');
assert(settings.includes('WHERE id=1 AND revision='),'Concurrent rule edits must not be silently overwritten');
assert(undo.includes('voided_at=now()')&&!undo.includes('DELETE FROM'),'Undo must retain history');
assert(ui.includes("fetch('/api/points'")&&ui.includes("fetch('/api/points/config'")&&ui.includes("method:'PATCH'"),'Live UI must use server endpoints');
assert(!ui.includes('لم يتم تفعيله على البيانات الحية.'),'Remove obsolete disabled-state notice');
assert(ui.includes('if(review)'),'Local preview must stay separate from live storage');
console.log('PASS live points: private schema, authenticated endpoints, strict sign, audit reversal, rules revision and live UI.');
