const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const component of ['DailyReportStudio','DiscordReportStudio']){
 const file=fs.readFileSync(path.join(root,'src/components/v2',component+'.tsx'),'utf8');
 assert(file.includes("const [renderedKey,setRenderedKey]=useState('')"),component+': no completed-render tracking');
 assert(file.includes('const renderKey=useMemo('),component+': no period and source-dependent render signature');
 assert(file.includes('renderedKey===renderKey'),component+': stale canvas might be downloaded');
 assert(file.includes('if(!canvas.current||!imageReady||downloading)return;'),component+': download must verify matching canvas');
 assert(file.includes('disabled={!imageReady||downloading}'),component+': export button must await render completion');
 assert(file.includes("style={{display:period.canExport?'flex':'none'}}"),component+': do not display partial report as complete');
 assert(file.includes('setRenderedKey(renderKey)'),component+': completed draw must mark current period');
 assert(file.includes('if(!canvas.current||!period.canExport)return'),component+': never render incomplete period selection');
 assert(file.includes('period.canExport&&!imageReady'),component+': pending render must have explicit label');
}
console.log('PASS Phase 3 UI export: both reports guard stale/blank canvas and suppress incomplete period previews');
