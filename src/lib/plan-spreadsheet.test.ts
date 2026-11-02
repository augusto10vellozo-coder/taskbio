import { expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { readSpreadsheet, spreadsheetRows, spreadsheetValid, SPREADSHEET_EMPTY } from './plan-spreadsheet';
const rows=[['Dia','Treino','Exercício','Séries','Reps','Carga'],['seg','Treino A','Supino',4,12,20],['seg','Treino A','Remada',3,10,'']];
function file(name:string, data:ArrayBuffer|string):File {return {name,size:typeof data==='string'?data.length:data.byteLength,text:async()=>String(data),arrayBuffer:async()=>data} as File;}
it('xlsx and csv map the same values and preserve empty optional load',async()=>{
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'Planilha');
 const xlsx=await readSpreadsheet(file('a.xlsx',XLSX.write(book,{type:'array',bookType:'xlsx'})));
 const csv=await readSpreadsheet(file('a.csv',rows.map(r=>r.join(';')).join('\n')));
 expect(xlsx).toEqual(csv);expect(xlsx[0]?.exercises[0]).toEqual({name:'Supino',sets:4,reps:12,loadKg:20});expect(xlsx[0]?.exercises[1]?.loadKg).toBeNull();expect(spreadsheetValid(xlsx)).toBe(true);
});
it('missing required cells remain null and block saving until corrected',()=>{
 const items=spreadsheetRows([['Exercício','Séries','Reps','Carga'],['Supino','','ilegível','']]);
 expect(items[0]?.exercises[0]).toEqual({name:'Supino',sets:null,reps:null,loadKg:null});expect(spreadsheetValid(items)).toBe(false);
});
it('structure without headers supports combined prescription and comma load',()=>{expect(spreadsheetRows([['Supino','4x12','20,5']])[0]?.exercises[0]).toEqual({name:'Supino',sets:4,reps:12,loadKg:20.5});});
it('timer column accepts seconds without repetitions',()=>{
 const items=spreadsheetRows([['Exercício','Séries','Reps','Tempo','Carga'],['Prancha',3,'',30,''],['Supino',4,12,'',20]]);
 expect(items[0]?.exercises[0]).toEqual({name:'Prancha',sets:3,reps:null,durationSec:30,loadKg:null});
 expect(items[0]?.exercises[1]).toEqual({name:'Supino',sets:4,reps:12,loadKg:20});
 expect(spreadsheetValid(items)).toBe(true);
});
it('timer column without seconds stays invalid',()=>{
 const items=spreadsheetRows([['Exercício','Séries','Tempo'],['Prancha',3,'']]);
 expect(items[0]?.exercises[0]).toEqual({name:'Prancha',sets:3,reps:null,loadKg:null});
 expect(spreadsheetValid(items)).toBe(false);
});
it('rejects unrelated sheets, oversize and wrong extension',async()=>{
 await expect(readSpreadsheet(file('a.csv','Produto;Valor\nBanana;10'))).rejects.toThrow(SPREADSHEET_EMPTY);
 await expect(readSpreadsheet({...file('a.xlsx',''),size:10*1024*1024+1})).rejects.toThrow('10 MB');
 await expect(readSpreadsheet(file('a.pdf',''))).rejects.toThrow('Formato');
});
