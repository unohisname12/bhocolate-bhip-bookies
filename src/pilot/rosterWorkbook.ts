import { signInLink } from './signInLinks';
import { checkRosterPrivacy, PRIVATE_NAME_HEADER } from './rosterPrivacy';
import { validateNickname } from './metadata';
import ExcelJS from 'exceljs';

export interface ImportRow { rowNumber: number; sourceKey: string; accountId?: string; code: string }
export interface ImportCard { id: string; alias: string; code: string; created: boolean }
const normalizeCode = (value: string) => value.toUpperCase().replace(/[\s-]/g, '');
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[byte & 31]).join('');
const sha = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');

export async function readRosterWorkbook(buffer: ArrayBuffer, classCode: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  checkRosterPrivacy(workbook);
  const sheets = workbook.worksheets.filter(sheet => sheet.getRow(1).values && Array.from({ length: sheet.columnCount }, (_, i) => sheet.getCell(1, i + 1).text.trim().toLowerCase()).includes('account id'));
  if (sheets.length !== 1) throw new Error('Use one roster sheet with an Account ID column.');
  const sheet = sheets[0];
  const columns = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, col) => {
    const name = cell.text.trim().toLowerCase();
    if (columns.has(name)) throw new Error(`Duplicate column: ${cell.text}`);
    columns.set(name, col);
  });
  for (const name of ['class code', 'account id', 'learner account']) if (!columns.has(name)) throw new Error(`Missing column: ${name}`);
  const column = (name: string) => {
    const key = name.toLowerCase();
    if (!columns.has(key)) { const col = sheet.columnCount + 1; sheet.getCell(1, col).value = name; columns.set(key, col); }
    return columns.get(key)!;
  };
  const codeCol = column('Secret pet code');
  const originalCol = column('Original account ID');
  const gameAliasCol = column('Game learner account');
  const urlCol = column('Game URL');
  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  for (let n = 2; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    if (!row.hasValues) continue;
    const id = row.getCell(columns.get('account id')!).text.trim();
    if (!id) throw new Error(`Row ${n}: add a unique Account ID (for example student-01).`);
    if (seen.has(id)) throw new Error(`Row ${n}: duplicate Account ID.`);
    seen.add(id);
    const existingClass = normalizeCode(row.getCell(columns.get('class code')!).text);
    if (existingClass && existingClass !== normalizeCode(classCode)) throw new Error(`Row ${n}: this class code belongs to a different classroom.`);
    const original = row.getCell(originalCol).text.trim() || id;
    const rawCode = row.getCell(codeCol).text.trim();
    if (uuid.test(id) && !rawCode) throw new Error(`Row ${n}: this existing account needs its current pet code. Use its saved card or Replace lost login card.`);
    const code = rawCode ? normalizeCode(rawCode) : newCode();
    if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/.test(code)) throw new Error(`Row ${n}: invalid pet code; use its current login card.`);
    row.getCell(codeCol).value = code.match(/.{4}/g)!.join('-');
    row.getCell(originalCol).value = original;
    rows.push({ rowNumber: n, sourceKey: await sha(original), ...(uuid.test(id) ? { accountId: id.toLowerCase() } : {}), code });
  }
  if (!rows.length || rows.length > 35) throw new Error('The roster must contain between 1 and 35 learners.');
  return { workbook, sheet, rows, columns, codeCol, gameAliasCol, urlCol };
}
export type PreparedRoster = Awaited<ReturnType<typeof readRosterWorkbook>>;
export function completeRoster(roster: PreparedRoster, cards: ImportCard[], classCode: string, url: string) {
  if (cards.length !== roster.rows.length) throw new Error('The import response did not match the roster. Keep this page open and retry.');
  cards.forEach((card, index) => {
    const row = roster.sheet.getRow(roster.rows[index].rowNumber);
    row.getCell(roster.columns.get('class code')!).value = classCode;
    row.getCell(roster.columns.get('account id')!).value = card.id;
    row.getCell(roster.gameAliasCol).value = card.alias;
    row.getCell(roster.codeCol).value = card.code.match(/.{4}/g)!.join('-');
    row.getCell(roster.urlCol).value = url;
    let linkCol = roster.columns.get('private sign-in link');
    if (!linkCol) { linkCol = roster.sheet.columnCount + 1; roster.sheet.getCell(1, linkCol).value = 'Private sign-in link'; roster.columns.set('private sign-in link', linkCol); }
    row.getCell(linkCol).value = signInLink(url, {role:'student', classCode, code:card.code});
  });
  roster.sheet.getRow(1).font = { bold: true };
  roster.sheet.views = [{ state: 'frozen', ySplit: 1 }];
  roster.sheet.columns.forEach(col => { col.width = Math.max(col.width ?? 0, 24); });
}
export async function downloadRoster(roster: PreparedRoster, filename: string) {
  const buffer = await roster.workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface NicknameRosterRow { id: string; alias: string; nicknameVersion?: number; nicknameAt?: number; pet?: { name: string } | null }
export async function freshNicknameRoster(rows: NicknameRosterRow[], classCode: string) {
  const workbook = new ExcelJS.Workbook(), sheet=workbook.addWorksheet('Nickname roster');
  sheet.addRow(['Class code','Account ID','Learner account','Approved nickname','Nickname version','Nickname approved at',PRIVATE_NAME_HEADER,'Game URL','Pet name']);
  for(const row of rows) sheet.addRow([classCode,row.id,row.alias,row.alias,row.nicknameVersion ?? 1,row.nicknameAt ? new Date(row.nicknameAt).toISOString() : '', '', window.location.origin, row.pet?.name ?? '']);
  sheet.getRow(1).font={bold:true}; sheet.views=[{state:'frozen',ySplit:1}];
  sheet.columns.forEach(col=>{col.width=28;}); sheet.getColumn(7).width=55;
  sheet.getCell(1,7).note='Fill this column only in your private offline copy. Never upload that copy. Keep a separate copy with this column blank. Match records by Account ID.';
  return workbook;
}
export async function readNicknameRoster(buffer: ArrayBuffer, classCode: string) {
  const workbook=new ExcelJS.Workbook(); await workbook.xlsx.load(buffer); checkRosterPrivacy(workbook);
  const sheet=workbook.worksheets[0], columns=new Map<string,number>();
  sheet.getRow(1).eachCell((cell,col)=>{const key=cell.text.trim().toLowerCase();if(columns.has(key))throw new Error('Duplicate roster column.');columns.set(key,col);});
  for(const key of ['class code','account id','learner account']) if(!columns.has(key))throw new Error('Use the downloaded roster template with Class code, Account ID and Learner account.');
  const result:{id:string;nickname:string;version?:number}[]=[], seen=new Set<string>();
  for(let n=2;n<=sheet.rowCount;n++) {
    const row=sheet.getRow(n); if(!row.hasValues)continue;
    const id=row.getCell(columns.get('account id')!).text.trim().toLowerCase();
    if(!uuid.test(id)||seen.has(id))throw new Error(`Row ${n}: use a unique existing classroom Account ID.`);seen.add(id);
    if(normalizeCode(row.getCell(columns.get('class code')!).text)!==normalizeCode(classCode))throw new Error(`Row ${n}: this is not the selected classroom.`);
    const name=row.getCell(columns.get('approved nickname') ?? columns.get('learner account')!);
    if(name.type===ExcelJS.ValueType.Formula)throw new Error('Nickname cells must contain plain text, not formulas.');
    const version=columns.has('nickname version')?Number(row.getCell(columns.get('nickname version')!).text):undefined;
    if(version!==undefined && (!Number.isSafeInteger(version)||version<1))throw new Error(`Row ${n}: invalid nickname version.`);
    result.push({id,nickname:validateNickname(name.text),version});
  }
  if(!result.length||result.length>35)throw new Error('Choose 1–35 existing learners.');
  return result;
}
export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer=await workbook.xlsx.writeBuffer();
  const url=URL.createObjectURL(new Blob([new Uint8Array(buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
