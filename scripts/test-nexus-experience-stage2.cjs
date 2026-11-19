const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('src/components/nexus/experience.ts');
const code=ts.transpileModule(source.replace(/^'use client';/,'').replace("import type {Tab} from '../v2/ExecutiveCommand';",''),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const exported={exports:{}};
new Function('require','module','exports',code)((name)=>name==='react'?{useEffect:()=>{},useRef:()=>({current:0})}:require(name),exported,exported.exports);
const map=exported.exports.NEXUS_SCENE_FAMILY;
const paths=['dashboard','team','operations','updates','excel','server','daily','reports','weeks','alerts','settings','salary','academy'];
assert.deepEqual(Object.keys(map).sort(),paths.sort(),'Every workspace needs one scene family; no faux routes');
assert.equal(map.salary,'finance');
assert.equal(map.academy,'learning');
assert.equal(map.reports,'reports');
const main=read('src/components/v2/ExecutiveCommand.tsx');
for(const token of ["useNexusSpotlight","NEXUS_SCENE_FAMILY[tab]","nx-experience-field","onPointerMove={spotlight.onPointerMove}","onPointerLeave={spotlight.onPointerLeave}"]){
 assert(main.includes(token),'Missing functional experience layer integration: '+token);
}
assert(source.includes('requestAnimationFrame')&&source.includes('prefers-reduced-motion: reduce'));
const css=read('src/components/v2/experience.css');
assert(css.includes('data-nx-scene="finance"')&&css.includes('data-nx-scene="learning"'));
assert(css.includes('pointer-events:none')&&css.includes('prefers-reduced-motion:reduce')&&css.includes('forced-colors:active'));
assert(css.includes('focus-visible'));
const generator=read('scripts/build-executive-css.cjs');
assert(generator.includes("'experience.css'"),'The source must join the canonical CSS bundle');
const pkg=JSON.parse(read('package.json'));
assert(pkg.scripts.prebuild.includes('test:experience-stage2'),'Fail the production build if experience contract breaks');
assert(!pkg.dependencies.gsap&&!pkg.dependencies.three&&!pkg.dependencies['@react-three/fiber'],'Research phase must not introduce expensive runtime libraries');
console.log('PASS CHICO Stage 2: all 13 scene identities, pointer lifecycle, accessibility, canonical CSS and lean dependencies');
