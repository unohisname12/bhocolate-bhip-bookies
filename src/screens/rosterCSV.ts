export interface RosterRow { id: string; alias: string }
const cell = (value: string) => `"${(/^[\s]*[=+@-]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`;
export function rosterCSV(rows: RosterRow[], classCode = '') {
  return '\uFEFF' + [['Class code', 'Account ID', 'Learner account', 'Child name (fill in privately)'], ...rows.map(row => [classCode, row.id, row.alias, ''])].map(row => row.map(cell).join(',')).join('\r\n');
}
