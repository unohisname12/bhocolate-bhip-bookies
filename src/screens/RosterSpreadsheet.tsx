import { rosterCSV, type RosterRow } from './rosterCSV';
export function RosterSpreadsheet({ rows, classCode }: { rows: RosterRow[]; classCode?: string }) {
  return <section className="teacher-card pilot-card"><h2>Private roster spreadsheet</h2><p>Download the account list, then fill in names privately on your device. Never upload the copy containing real names. Imports with a filled real-name column are rejected. This basic account list does not include secret codes. Keep your completed spreadsheet with codes for future imports.</p>{!classCode && <p>These are local or demo profiles. For working student codes, save your roster as .xlsx and use Import Excel roster in the <a href="https://auralith-classroom-pilot.deandresample3.workers.dev" target="_blank" rel="noreferrer">classroom teacher dashboard</a>. Classroom accounts start with new progress.</p>}<button className="growth-button" disabled={!rows.length} onClick={() => {
    const url = URL.createObjectURL(new Blob([rosterCSV(rows, classCode)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'private-learner-roster.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }}>Download roster spreadsheet</button></section>;
}
