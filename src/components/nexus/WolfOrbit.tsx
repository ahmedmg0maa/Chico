'use client';

import {useEffect,useRef,useState} from 'react';
import {Box} from 'lucide-react';
import {createOrbitMesh} from './orbital-geometry';

const MEDIA='(min-width: 901px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)';
const MAX_EDGE=420;
const FRAME_MS=1000/24;
const VERTEX=
 'attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor;'+
 'uniform vec2 uTilt; uniform float uAngle; uniform float uAspect;'+
 'varying vec3 vNormal; varying vec3 vPosition; varying vec3 vColor;'+
 'vec3 spin(vec3 p){float a=uAngle+uTilt.x,b=uTilt.y;'+
 'p=vec3(cos(a)*p.x+sin(a)*p.z,p.y,-sin(a)*p.x+cos(a)*p.z);'+
 'return vec3(p.x,cos(b)*p.y-sin(b)*p.z,sin(b)*p.y+cos(b)*p.z);}'+
 'void main(){vec3 p=spin(aPosition);vNormal=spin(aNormal);vPosition=p;vColor=aColor;'+
 'float d=4.4-p.z;vec2 scale=vec2(min(1.0,1.0/uAspect),min(1.0,uAspect));'+
 'gl_Position=vec4(2.45*p.x*scale.x,2.45*p.y*scale.y+.08*d,1.285714*d-2.285714,d);}';
const FRAGMENT=
 'precision mediump float; varying vec3 vNormal; varying vec3 vPosition; varying vec3 vColor;'+
 'void main(){vec3 n=normalize(vNormal),l=normalize(vec3(-.45,.75,1.0));'+
 'vec3 eye=normalize(vec3(0.0,0.0,4.4)-vPosition);'+
 'float diffuse=max(0.0,dot(n,l));float spec=pow(max(0.0,dot(n,normalize(l+eye))),24.0);'+
 'vec3 color=vColor*(.38+.67*diffuse)+vec3(.55,.46,.34)*spec;'+
 'gl_FragColor=vec4(min(color,vec3(1.0)),1.0);}';

function compile(gl:WebGLRenderingContext,type:number,source:string){
 const shader=gl.createShader(type);
 if(!shader)return null;
 gl.shaderSource(shader,source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null;}
 return shader;
}

/** One opt-out-able, decorative desktop scene. Never owns application data.
 * Original DOM/SVG and CSS theater remain the non-WebGL fallback. */
export default function WolfOrbit(){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const [eligible,setEligible]=useState(false);
 const [enabled,setEnabled]=useState(true);
 const [supported,setSupported]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia(MEDIA);
  const update=()=>{setEligible(media.matches);if(!media.matches)setSupported(false);};
  update();media.addEventListener('change',update);
  return ()=>media.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  if(!eligible||!enabled)return;
  const canvas=canvasRef.current;
  if(!canvas)return;
  const host=canvas.parentElement;
  if(!host)return;
  let gl:WebGLRenderingContext|null;
  try{
   gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,powerPreference:'low-power',failIfMajorPerformanceCaveat:true,preserveDrawingBuffer:false});
  }catch{return;}
  if(!gl){setSupported(false);return;}
  const gpu=gl;
  const vs=compile(gpu,gpu.VERTEX_SHADER,VERTEX),fs=compile(gpu,gpu.FRAGMENT_SHADER,FRAGMENT);
  const program=gpu.createProgram(),buffer=gpu.createBuffer();
  const release=()=>{
   if(gpu.isContextLost())return;
   if(buffer)gpu.deleteBuffer(buffer);
   if(program)gpu.deleteProgram(program);
   if(vs)gpu.deleteShader(vs);
   if(fs)gpu.deleteShader(fs);
  };
  if(!vs||!fs||!program||!buffer){release();setSupported(false);return;}
  gpu.attachShader(program,vs);gpu.attachShader(program,fs);gpu.linkProgram(program);
  if(!gpu.getProgramParameter(program,gpu.LINK_STATUS)){release();setSupported(false);return;}
  const mesh=createOrbitMesh();
  gpu.useProgram(program);gpu.bindBuffer(gpu.ARRAY_BUFFER,buffer);gpu.bufferData(gpu.ARRAY_BUFFER,mesh,gpu.STATIC_DRAW);
  for(const [name,offset] of [['aPosition',0],['aNormal',12],['aColor',24]] as const){
   const location=gpu.getAttribLocation(program,name);
   if(location<0){release();setSupported(false);return;}
   gpu.enableVertexAttribArray(location);gpu.vertexAttribPointer(location,3,gpu.FLOAT,false,36,offset);
  }
  const tilt=gpu.getUniformLocation(program,'uTilt'),angle=gpu.getUniformLocation(program,'uAngle'),aspect=gpu.getUniformLocation(program,'uAspect');
  gpu.enable(gpu.DEPTH_TEST);gpu.clearColor(0,0,0,0);
  let frame=0,last=0,elapsed=0,shown=false,visible=false,lost=false,disposed=false;
  let targetX=0,targetY=0,x=0,y=0;
  let width=1,height=1;
  function resize(){
   const box=canvas!.getBoundingClientRect();
   if(!box.width||!box.height)return;
   const scale=Math.min(1.25,window.devicePixelRatio||1,MAX_EDGE/Math.max(box.width,box.height));
   width=Math.max(1,Math.round(box.width*scale));height=Math.max(1,Math.round(box.height*scale));
   if(canvas!.width!==width||canvas!.height!==height){canvas!.width=width;canvas!.height=height;}
  }
  function draw(now:number){
   frame=0;
   if(disposed||lost||!visible||document.hidden)return;
   if(!last||now-last>=FRAME_MS){
    const dt=last?Math.min(80,now-last):0;last=now;elapsed=(elapsed+dt/1000)%480;
    x+=(targetX-x)*.12;y+=(targetY-y)*.12;
    gpu.viewport(0,0,width,height);gpu.clear(gpu.COLOR_BUFFER_BIT|gpu.DEPTH_BUFFER_BIT);
    gpu.uniform2f(tilt,x,y);gpu.uniform1f(angle,elapsed*Math.PI/40);gpu.uniform1f(aspect,width/height);
    gpu.drawArrays(gpu.TRIANGLES,0,mesh.length/9);
    if(!shown){shown=true;canvas!.dataset.ready='true';setSupported(true);}
   }
   frame=requestAnimationFrame(draw);
  }
  function sync(){
   if(disposed||lost||!visible||document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;last=0;return;}
   if(!frame)frame=requestAnimationFrame(draw);
  }
  function move(e:PointerEvent){
   if(e.pointerType!=='mouse')return;
   const box=host!.getBoundingClientRect();
   targetX=((e.clientX-box.left)/Math.max(1,box.width)-.5)*.30;
   targetY=-((e.clientY-box.top)/Math.max(1,box.height)-.5)*.22;
  }
  function leave(){targetX=0;targetY=0;}
  function contextLost(){lost=true;delete canvas!.dataset.ready;setSupported(false);sync();}
  const observer=new IntersectionObserver(entries=>{visible=Boolean(entries[0]?.isIntersecting);sync();},{threshold:0.12});
  const sizeObserver=new ResizeObserver(resize);
  resize();observer.observe(canvas);sizeObserver.observe(canvas);
  document.addEventListener('visibilitychange',sync);
  host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);
  canvas.addEventListener('webglcontextlost',contextLost);
  return ()=>{
   disposed=true;sync();observer.disconnect();sizeObserver.disconnect();
   document.removeEventListener('visibilitychange',sync);
   host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);
   canvas.removeEventListener('webglcontextlost',contextLost);delete canvas.dataset.ready;release();
  };
 },[eligible,enabled]);
 return <>
  {eligible&&enabled&&<canvas ref={canvasRef} className="nx-orbit-canvas" aria-hidden="true"/>}
  {eligible&&supported&&<button type="button" className="nx-orbit-toggle" aria-pressed={enabled}
   aria-label="التأثير ثلاثي الأبعاد" title={enabled?'إيقاف المشهد ثلاثي الأبعاد':'تشغيل المشهد ثلاثي الأبعاد'}
   onClick={()=>setEnabled(v=>!v)}><Box size={14} aria-hidden="true"/><span>3D</span></button>}
 </>;
}
