const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const geometry=read('src/components/nexus/orbital-geometry.ts');
const out=ts.transpileModule(geometry,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const m={exports:{}};new Function('exports','module',out)(m.exports,m);
const {createOrbitMesh,ORBIT_SEGMENTS,ORBIT_SIDES}=m.exports;
const mesh=createOrbitMesh();
assert.equal(mesh.length,3*ORBIT_SEGMENTS*ORBIT_SIDES*6*9);
assert(mesh.byteLength<400000);
for(let i=0;i<mesh.length;i+=9){
 for(let j=0;j<9;j++)assert(Number.isFinite(mesh[i+j]));
 const radius=Math.hypot(mesh[i],mesh[i+1],mesh[i+2]);assert(radius>1.2&&radius<1.7);
 assert(Math.abs(Math.hypot(mesh[i+3],mesh[i+4],mesh[i+5])-1)<.0001);
}
const component=read('src/components/nexus/WolfOrbit.tsx');
for(const needle of ["getContext('webgl'","MAX_EDGE=420","1000/24","IntersectionObserver","ResizeObserver","visibilitychange","cancelAnimationFrame","webglcontextlost","deleteBuffer","deleteProgram","prefers-reduced-motion","failIfMajorPerformanceCaveat","aria-pressed={enabled}","dataset.ready='true'"])assert(component.includes(needle),needle);
assert(!component.includes('fetch('));
const shell=read('src/components/nexus/NexusShell.tsx');
assert(shell.includes('<WolfStage immersive/>')&&shell.includes('{immersive&&<WolfOrbit/>}'));
assert(shell.includes('/assets/chico-noble-wolf.svg'));
const css=read('src/components/v2/immersive-phase5.css');assert(css.includes('pointer-events:none')&&css.includes('prefers-reduced-motion')&&css.includes('data-ready'));
assert(read('scripts/build-executive-css.cjs').includes("'immersive-phase5.css'"));
const pkg=JSON.parse(read('package.json'));assert(pkg.scripts.prebuild.includes('test:immersive-stage5'));
assert(!pkg.dependencies.three&&!pkg.dependencies['@react-three/fiber']);
console.log('PASS Phase 05: finite normalized orbit geometry, bounded native WebGL, fallback, lifecycle and opt-out contract');
