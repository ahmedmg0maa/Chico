// Native decorative 3D geometry. Each vertex is position, normal, RGB.
export const ORBIT_SEGMENTS=72;
export const ORBIT_SIDES=8;
type Vec=[number,number,number];
type Ring={radius:number;thickness:number;rx:number;ry:number;color:Vec};
const rings:Ring[]=[
 {radius:1.48,thickness:.025,rx:.72,ry:.48,color:[.94,.71,.40]},
 {radius:1.37,thickness:.013,rx:-.80,ry:-.50,color:[.52,.73,.90]},
 {radius:1.62,thickness:.009,rx:.19,ry:1.07,color:[.72,.82,.92]}
];
function rotate(p:Vec,rx:number,ry:number):Vec{
 const [x,y,z]=p,cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry);
 const a=y*cx-z*sx,b=y*sx+z*cx;
 return [x*cy+b*sy,a,-x*sy+b*cy];
}
export function createOrbitMesh():Float32Array{
 const data:number[]=[];
 function vertex(r:Ring,i:number,j:number){
  const u=2*Math.PI*i/ORBIT_SEGMENTS,v=2*Math.PI*j/ORBIT_SIDES;
  const cu=Math.cos(u),su=Math.sin(u),cv=Math.cos(v),sv=Math.sin(v);
  const radius=r.radius+r.thickness*cv;
  const p=rotate([radius*cu,radius*su,r.thickness*sv],r.rx,r.ry);
  const n=rotate([cv*cu,cv*su,sv],r.rx,r.ry);
  data.push(...p,...n,...r.color);
 }
 for(const r of rings)for(let i=0;i<ORBIT_SEGMENTS;i++)for(let j=0;j<ORBIT_SIDES;j++){
  vertex(r,i,j);vertex(r,i+1,j);vertex(r,i+1,j+1);
  vertex(r,i,j);vertex(r,i+1,j+1);vertex(r,i,j+1);
 }
 return new Float32Array(data);
}
