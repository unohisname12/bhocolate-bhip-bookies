import { describe,it,expect } from 'vitest';
import ExcelJS from 'exceljs';
import { checkRosterPrivacy,PRIVATE_NAME_HEADER,PRIVATE_ROSTER_ERROR } from './rosterPrivacy';
import { readNicknameRoster } from './rosterWorkbook';
function book(){const b=new ExcelJS.Workbook(),s=b.addWorksheet('Roster');s.addRow(['Class code','Account ID','Learner account',PRIVATE_NAME_HEADER]);s.addRow(['CLASS','12345678-1234-1234-1234-123456789012','OrbitFox','']);return b;}
describe('private roster boundary',()=>{
 it('accepts blank real-name cells and returns only nickname fields',async()=>{const b=book();expect(()=>checkRosterPrivacy(b)).not.toThrow();const rows=await readNicknameRoster(await b.xlsx.writeBuffer() as ArrayBuffer,'CLASS');expect(rows).toEqual([{id:'12345678-1234-1234-1234-123456789012',nickname:'OrbitFox',version:undefined}]);});
 it.each(['private text',{formula:'""'},' '])('rejects any content, including formulas and whitespace',value=>{const b=book();b.worksheets[0].getCell(2,4).value=value;expect(()=>checkRosterPrivacy(b)).toThrow(PRIVATE_ROSTER_ERROR);});
 it('checks hidden rows and legacy columns without echoing contents',()=>{const b=book(),s=b.worksheets[0];s.getCell(1,4).value='Child name (fill in privately)';s.getRow(2).hidden=true;s.getColumn(4).hidden=true;s.getCell(2,4).value='Synthetic private value';expect(()=>checkRosterPrivacy(b)).toThrow(PRIVATE_ROSTER_ERROR);});
 it('rejects extra hidden sheets and unknown columns',()=>{const b=book();b.addWorksheet('Hidden',{state:'hidden'});expect(()=>checkRosterPrivacy(b)).toThrow(/one visible/);const c=book();c.worksheets[0].getCell(1,5).value='Private notes';expect(()=>checkRosterPrivacy(c)).toThrow(/extra columns/);});
});
