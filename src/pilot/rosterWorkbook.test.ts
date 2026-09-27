import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { completeRoster, readRosterWorkbook } from './rosterWorkbook';
async function fixture(rows: unknown[][]) {
  const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Roster');
  sheet.addRow(['Class code', 'Account ID', 'Learner account', 'Child name (fill in privately)']);
  rows.forEach(row => sheet.addRow(row));
  return new Uint8Array(await book.xlsx.writeBuffer()).buffer;
}
describe('Excel classroom roster', () => {
  it('preserves nicknames and account mapping through clean export and re-import', async () => {
    const roster = await readRosterWorkbook(await fixture([['', 'demo_abc', 'Soldier 76', ''], ['', 'test-mr-dre', 'Mr Dre', '']]), 'CLASS123');
    expect(roster.rows).toHaveLength(2);
    expect(JSON.stringify(roster.rows)).not.toContain('Private child');
    expect(JSON.stringify(roster.rows)).not.toContain('Soldier');
    const cards = roster.rows.map((row, i) => ({ id: `12345678-1234-4123-a123-12345678901${i}`, alias: `Learner ${i + 1}`, code: row.code, created: true }));
    completeRoster(roster, cards, 'CLASS123', 'https://game.example');
    expect(roster.sheet.getCell(2, roster.columns.get('private sign-in link')!).text).toContain('#signin=student&code=');
    expect(roster.sheet.getCell('D2').text).toBe('');
    expect(roster.sheet.getCell('C2').text).toBe('Soldier 76');
    const again = await readRosterWorkbook(new Uint8Array(await roster.workbook.xlsx.writeBuffer()).buffer, 'CLASS123');
    expect(again.rows.map(r => r.code)).toEqual(roster.rows.map(r => r.code));
    expect(again.rows.map(r => r.sourceKey)).toEqual(roster.rows.map(r => r.sourceKey));
    expect(again.rows[0].accountId).toBe(cards[0].id);
  });
  it('rejects duplicate IDs, wrong classroom, blank IDs, and existing accounts without codes', async () => {
    await expect(readRosterWorkbook(await fixture([['', 'same', 'One'], ['', 'same', 'Two']]), 'CLASS123')).rejects.toThrow('duplicate');
    await expect(readRosterWorkbook(await fixture([['OTHER', 'new', 'One']]), 'CLASS123')).rejects.toThrow('different classroom');
    await expect(readRosterWorkbook(await fixture([['', '', 'One']]), 'CLASS123')).rejects.toThrow('unique Account ID');
    await expect(readRosterWorkbook(await fixture([['', '12345678-1234-4123-a123-123456789010', 'One']]), 'CLASS123')).rejects.toThrow('current pet code');
  });
});
