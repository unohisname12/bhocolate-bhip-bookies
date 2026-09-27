import { describe, expect, it } from 'vitest';
import { rosterCSV } from './rosterCSV';
describe('private roster spreadsheet', () => {
  it('exports stable account mappings with a blank name column and no secrets', () => {
    const text = rosterCSV([{ id: 'student_123', alias: 'Learner 01' }], 'CLASS');
    expect(text).toContain('"CLASS","student_123","Learner 01",""');
    expect(text).toContain('Child name (fill in privately)');
    expect(text).not.toContain('pet code');
  });
  it('escapes CSV delimiters and prevents formula execution in labels', () => {
    expect(rosterCSV([{ id: 'id', alias: '=1+1' }])).toContain('"\'=1+1"');
    expect(rosterCSV([{ id: 'id', alias: 'Blue, "team"' }])).toContain('"Blue, ""team"""');
    expect(rosterCSV([{ id: 'id', alias: '\t@SUM(A1)' }])).toContain('"\'\t@SUM(A1)"');
  });
});
