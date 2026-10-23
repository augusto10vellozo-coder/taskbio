import type { ImportedWorkout } from './training';
export type SpreadsheetWorkout = Omit<ImportedWorkout, 'exercises'> & { exercises: { name: string; sets: number | null; reps: number | null; loadKg: number | null }[] };
export const SPREADSHEET_EMPTY = 'Não consegui identificar exercícios nesta planilha. Confira as colunas ou envie outro arquivo.';
const key = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const aliases = { name:['exercicio','exercicios','exercise','nome do exercicio'], sets:['series','serie','sets'], reps:['reps','repeticoes','repeticao'], load:['carga','carga kg','carga (kg)','peso','kg','load'], day:['dia','dia da semana','day'], workout:['treino','nome do treino','workout'] };
function number(v: unknown, integer = false): number | null {
 const text=String(v ?? '').trim().replace(/\s*kg$/i,'').replace(',','.');
 if (!text || !/^\d+(\.\d+)?$/.test(text)) return null;
 const n=Number(text);return Number.isFinite(n) && (integer ? n>0 && Number.isInteger(n) : n>=0) ? n : null;
}
function day(v: unknown): ImportedWorkout['day'] {
 const text=key(v);const days=['seg','ter','qua','qui','sex','sab','dom'] as const;
 return days.find(d=>text.startsWith(d)) ?? null;
}
export function spreadsheetRows(rows: unknown[][], sheetName='Treino importado'): SpreadsheetWorkout[] {
 const headerIndex=rows.findIndex(row=>row.some(c=>aliases.name.includes(key(c))));
 const header=headerIndex>=0 ? rows[headerIndex] ?? [] : [];
 const cols=Object.fromEntries(Object.entries(aliases).map(([field,names])=>[field,header.findIndex(c=>names.includes(key(c)))]));
 const result:SpreadsheetWorkout[]=[];
 let currentName=sheetName;let currentDay:ImportedWorkout['day']=day(sheetName);
 for(const row of rows.slice(headerIndex>=0 ? headerIndex+1 : 0)) {
  if(row.every(c=>!String(c??'').trim()))continue;
  const cell=(field:string)=>row[cols[field] ?? -1];
  let name='';let sets:number|null=null;let reps:number|null=null;let loadKg:number|null=null;
  if(headerIndex>=0){
   name=String(cell('name')??'').trim();sets=number(cell('sets'),true);reps=number(cell('reps'),true);loadKg=number(cell('load'));
   if(String(cell('workout')??'').trim())currentName=String(cell('workout')).trim();
   if(String(cell('day')??'').trim())currentDay=day(cell('day'));
  }else{
   const text=row.map(c=>String(c??'').trim());
   if(text.filter(Boolean).length===1){const title=text.find(Boolean)??'';if(/^(treino\b|seg|ter|qua|qui|sex|sab|dom)/i.test(key(title))){currentName=title;currentDay=day(title);}continue;}
   const nameIndex=text.findIndex(c=>/[a-zà-ú]/i.test(c) && !day(c) && !/^(treino\b|kg$)/i.test(key(c)) && !/^\d+\s*kg$/i.test(c));
   if(nameIndex<0)continue;
   name=text[nameIndex]??'';const after=text.slice(nameIndex+1);const combined=after[0]?.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
   sets=combined?number(combined[1],true):number(after[0],true);reps=combined?number(combined[2],true):number(after[1],true);loadKg=number(after[combined?1:2]);
   if(!combined && after.filter(v=>/\d/.test(v)).length<2)continue;
   const prefix=text.slice(0,nameIndex);const d=prefix.map(day).find(Boolean);if(d)currentDay=d;
   const title=prefix.find(v=>/^treino\b/i.test(v));if(title)currentName=title;
  }
  if(!name || !/[a-zà-ú]/i.test(name) || aliases.name.includes(key(name)))continue;
  let group=result.find(w=>w.name===currentName && w.day===currentDay);
  if(!group){group={name:currentName,day:currentDay,exercises:[]};result.push(group);}
  group.exercises.push({name,sets,reps,loadKg});
 }
 return result;
}
export function spreadsheetValid(items: SpreadsheetWorkout[]) {
 return items.length>0 && items.every(w=>w.name.trim() && w.exercises.length>0 && w.exercises.every(e=>e.name.trim() && e.sets!==null && Number.isInteger(e.sets) && e.sets>0 && e.reps!==null && Number.isInteger(e.reps) && e.reps>0 && (e.loadKg===null || Number.isFinite(e.loadKg) && e.loadKg>=0)));
}
export async function readSpreadsheet(file: File): Promise<SpreadsheetWorkout[]> {
 if(file.size>10*1024*1024)throw new Error('O arquivo passa de 10 MB. Envie um arquivo menor.');
 if(!/\.(xlsx|xls|csv)$/i.test(file.name))throw new Error('Formato não aceito. Use Excel (.xlsx ou .xls) ou CSV.');
 const XLSX=await import('xlsx');
 const book=XLSX.read(/\.csv$/i.test(file.name) ? await file.text() : await file.arrayBuffer(),{type:/\.csv$/i.test(file.name)?'string':'array',raw:true});
 const items=book.SheetNames.flatMap(name=>{const sheet=book.Sheets[name];return sheet?spreadsheetRows(XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:''}),name):[];});
 if(!items.length)throw new Error(SPREADSHEET_EMPTY);
 return items;
}
