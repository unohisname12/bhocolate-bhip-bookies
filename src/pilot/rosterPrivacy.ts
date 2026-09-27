import type ExcelJS from 'exceljs';
export const PRIVATE_NAME_HEADER = 'Real name — PRIVATE: fill offline; do not upload';
export const PRIVATE_ROSTER_ERROR = "This spreadsheet has information in the real-name column. Please don't give us this copy. Keep it on your computer and choose a copy with the real-name column completely blank. Nicknames and account IDs can stay.";
const normalize = (text: string) => text.trim().toLowerCase().replace(/[_–—-]/g,' ').replace(/\s+/g,' ');
const allowed = new Set(['class code','account id','learner account','secret pet code','original account id','game learner account','game url','private sign in link','approved nickname','nickname version','nickname approved at','roster version','pet name']);
export function checkRosterPrivacy(workbook: ExcelJS.Workbook) {
  for(const sheet of workbook.worksheets) {
    const privateColumns:number[]=[];
    sheet.getRow(1).eachCell((cell,col)=> {
      if (/^(real name|child name|student name|full name|first name|last name)\b/.test(normalize(cell.text))) privateColumns.push(col);
    });
    for(const col of privateColumns) for(let row=2;row<=sheet.rowCount;row++) {
      const cell=sheet.getCell(row,col);
      if(cell.value!==null && cell.value!==undefined && cell.value!=='') throw new Error(PRIVATE_ROSTER_ERROR);
    }
    sheet.eachRow((row,index)=>{if(index>1)row.eachCell((cell,col)=>{if(cell.value!==null && !sheet.getCell(1,col).text.trim())throw new Error('Use the downloaded roster template without unlabelled columns.');});});
    sheet.getRow(1).eachCell(cell=> {
      const header=normalize(cell.text);
      if(!allowed.has(header) && !/^(real name|child name|student name|full name|first name|last name)\b/.test(header)) throw new Error('Use the downloaded roster template without extra columns or worksheets.');
    });
  }
  if(workbook.worksheets.length!==1 || workbook.worksheets[0].state==='veryHidden' || workbook.worksheets[0].state==='hidden') throw new Error('Use one visible roster worksheet. Remove extra worksheets before importing.');
}
