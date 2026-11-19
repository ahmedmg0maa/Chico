import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {SaxesParser} from 'saxes';

const spreadsheet='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const encodeText=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const encodeAttribute=(value:string)=>encodeText(value).replace(/"/g,'&quot;').replace(/\r/g,'&#13;').replace(/\n/g,'&#10;').replace(/\t/g,'&#9;');

// ExcelJS recognizes spreadsheet elements by their unprefixed name. Normalize
// expanded XML names, preserving namespace changes, attributes and cell text.
function normalizedPart(xml:string){
 const parser=new SaxesParser({xmlns:true}),output:string[]=[];
 const names:string[]=[];
 parser.on('doctype',()=>{throw Error('INVALID_XLSX');});
 parser.on('opentag',tag=>{
  const canonical=tag.uri===spreadsheet;
  const name=canonical?tag.local:tag.name;
  const attrs=Object.values(tag.attributes).filter(attr=>!(canonical&&attr.name==='xmlns'));
  const serialized=attrs.map(attr=>' '+attr.name+'="'+encodeAttribute(attr.value)+'"').join('');
  output.push('<'+name+serialized+(canonical?' xmlns="'+spreadsheet+'"':'')+'>');
  names.push(name);
 });
 parser.on('closetag',()=>output.push('</'+names.pop()+'>'));
 parser.on('text',value=>output.push(encodeText(value)));
 parser.on('cdata',value=>output.push(encodeText(value)));
 parser.write(xml).close();
 return output.join('');
}

export async function readWorkbook(bytes:Buffer){
 const workbook=new ExcelJS.Workbook();
 try{
  await workbook.xlsx.load(bytes as Parameters<typeof workbook.xlsx.load>[0]);
  return workbook;
 }catch{
  const zip=await JSZip.loadAsync(bytes);
  const root=await zip.file('xl/workbook.xml')?.async('string');
  if(!root||!/<[\w.-]+:workbook[\s>]/.test(root))throw Error('INVALID_XLSX');
  for(const part of Object.values(zip.files)){
   if(!/^xl\/(workbook|sharedStrings|styles|worksheets\/sheet\d+)\.xml$/.test(part.name))continue;
   zip.file(part.name,normalizedPart(await part.async('string')));
  }
  const normalized=new ExcelJS.Workbook();
  await normalized.xlsx.load(await zip.generateAsync({type:'nodebuffer'}) as Parameters<typeof normalized.xlsx.load>[0]);
  return normalized;
 }
}
