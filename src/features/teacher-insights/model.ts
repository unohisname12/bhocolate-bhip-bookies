import type { LearningSettings } from '../../services/game/curriculum';
import type { LearningEvidence } from '../../types/woodland';
export const RULE_VERSION = 'pilot-1';
export const DAY = 86400000;
export interface EvidenceRecord extends LearningEvidence { eventAt: number; receivedAt: number; settingsVersion: number; imported: boolean }
export type Rule = 'check-in' | 'support' | 'stretch' | 'fresh-check' | 'review' | 'save-help';
export interface Recommendation {
 rule: Rule; skillId: string; topic: string; title: string; explanation: string; suggestion: string;
 count: number; independent: number; support: number; settingsVersion: number; lastEvidenceAt: number;
 patch: Partial<Pick<LearningSettings,'challenge'|'topic'|'learningHelp'>> | null;
 evidenceIds: string[]; ruleVersion: string;
}
export interface SkillSummary { studentId:string; skillId:string; topic:string; grade:number; challenge:string; questions:number; attempted:number; independent:number; supported:number; completed:number; unfinished:number; retries:number; laterChecks:number; lastAt:number; imported:number }
export interface InsightLearner { id:string;alias:string;active:boolean;learning:LearningSettings;settingsVersion:number;assignment:string;lastSaved:number;lastSeen:number|null;activity:string|null;savePhase:string|null;historyStart:number|null;evidenceAt:number }
export interface Alert extends Recommendation {id:string;evidenceToken:string;studentId:string;alias:string;status:'new'|'reviewed'|'snoozed'|'dismissed'|'applied'|'resolved';active:boolean;snoozedUntil:number;createdAt:number;updatedAt:number}
export interface Intervention {id:string;studentId:string;alias:string;kind:string;createdAt:number;appliedVersion:number;before:LearningSettings;after:LearningSettings;recommendation:Recommendation|null;revertedBy:string|null;followup:{attempted:number;independent:number;supported:number}}
export interface SettingsChange {studentId:string;alias:string;version:number;learning:LearningSettings;assignment:string;changedAt:number}
export interface InsightsData {settingsChanges:SettingsChange[];serverTime:number;days:number;historySince:number;enabled:boolean;students:InsightLearner[];skills:SkillSummary[];alerts:Alert[];interventions:Intervention[];trend:{day:string;attempted:number;independent:number;supported:number}[];retentionDays:number;ruleVersion:string}
export const independent = (r:LearningEvidence) => r.attempts === 1 && r.correct && r.firstAttemptCorrect && r.support === 'none' && r.answerRevealed !== true;
export function recommend(rows:EvidenceRecord[], settings:LearningSettings, version:number, now:number):Recommendation[] {
 // Recommendations use recent, comparable records received promptly. Imported/unknown settings stay report-only.
 const usable=rows.filter(r=>!r.imported && r.settingsVersion===version && r.practiceSettings?.challenge===settings.challenge && r.grade===settings.grade && (settings.topic==='mixed'||r.topic===settings.topic) && r.attempts>0 && r.eventAt<=now && r.eventAt>=now-7*DAY && r.receivedAt-r.eventAt<=5*60000 && r.updatedAt<=r.receivedAt+5*60000);
 const groups=new Map<string,EvidenceRecord[]>();
 for(const row of usable){const key=row.skillId??`${row.grade}:${row.topic}`;groups.set(key,[...(groups.get(key)??[]),row]);}
 const out:Recommendation[]=[];
 for(const [skillId,group] of groups){
  const sorted=[...new Map(group.map(r=>[r.questionId,r])).values()].sort((a,b)=>a.eventAt-b.eventAt);
  const list=sorted.slice(-20),n=list.length,yes=list.filter(independent).length,support=list.filter(r=>r.support!=='none'||r.answerRevealed).length;
  const last=list.at(-1)!;
  const make=(rule:Rule,title:string,explanation:string,suggestion:string,patch:Recommendation['patch'])=>out.push({rule,skillId,topic:last.topic,title,explanation,suggestion,patch,count:n,independent:yes,support,settingsVersion:version,lastEvidenceAt:Math.max(...list.map(r=>r.receivedAt)),evidenceIds:list.map(r=>r.questionId),ruleVersion:RULE_VERSION});
  if(now-last.eventAt>DAY){if(last.correct)make('review','A later check is due',`The last recorded question on ${last.topic} was more than a day ago.`,'Try a new question to see what the student can do independently today.',settings.topic!==last.topic?{topic:last.topic}:null);continue;}
  const recent=list.slice(-3);
  if(recent.length===3&&recent.every(r=>!r.correct&&r.attempts>=2)){
   make('check-in','A check-in may help',`Three different ${last.topic} questions remain unfinished after at least two attempts each.`,'Check in with the student before changing their settings.',null);
  }else if(n>=8&&yes/n<.5&&list.filter(r=>r.attempts>1||r.support!=='none').length>=3){
   const challenge=settings.challenge==='stretch'?'standard':'support';
   make('support','May need more support',`${yes} of ${n} recent questions were correct first try without help; ${support} used support.`,settings.challenge==='support'?'Keep support and work through a fresh question together.':`Try ${challenge} challenge within Grade ${settings.grade}.`,settings.challenge==='support'?null:{challenge});
  }else{
   const sessions=1+list.slice(1).filter((r,i)=>r.eventAt-list[i].eventAt>=30*60000).length;
   const templates=new Set(list.map(r=>r.templateId).filter(Boolean)).size;
   if(n>=12&&yes/n>=.9&&sessions>=2&&templates>=2){
    const challenge=settings.challenge==='support'?'standard':'stretch';
    make('stretch','Ready for a little more challenge',`${yes} of ${n} questions were correct first try without help across ${sessions} practice periods and ${templates} templates.`,settings.challenge==='stretch'?'Use a fresh independent check; grade placement stays teacher-led.':`Try ${challenge} challenge within the same grade.`,settings.challenge==='stretch'?null:{challenge});
   }else if(n>=12&&yes/n>=.9){
    make('fresh-check','Check readiness for more challenge',`${yes} of ${n} recent questions were correct first try without help, but the evidence does not yet cover two practice periods and two templates.`,'Try a different question format before increasing difficulty.',null);
   }else if(n>=5&&list.filter(r=>r.correct&&(r.support!=='none'||r.answerRevealed)).length>=3&&!list.slice(-2).every(independent)){
    make('fresh-check','Try a fresh independent check',`${support} of ${n} recent questions used support. Supported completion and independent success are different evidence.`,'Ask for a new question on this topic without revealing its answer.',settings.topic!==last.topic?{topic:last.topic}:null);
   }
  }
 }
 return out;
}
export function csvValue(value:unknown){const text=String(value??'');return '"'+(/^[\s]*[=+@-]/.test(text)?"'"+text:text).replaceAll('"','""')+'"';}
export function reportCSV(data:InsightsData){const header=['Student','Skill','Grade','Challenge','Questions attempted','First try without help','With support','Completed','Unfinished','Later independent checks'];return [header,...data.skills.map(s=>[data.students.find(r=>r.id===s.studentId)?.alias??s.studentId,s.topic,s.grade,s.challenge,s.attempted,s.independent,s.supported,s.completed,s.unfinished,s.laterChecks])].map(r=>r.map(csvValue).join(',')).join('\r\n');}
export function validEvidenceRows(rows:LearningEvidence[]){
 return new Set(rows.map(r=>r.questionId)).size===rows.length&&rows.every(r=>
  r.questionId.length>0&&r.questionId.length<=200&&r.topic.length>0&&r.topic.length<=100&&r.source.length<=80&&
  Number.isInteger(r.grade)&&r.grade>=0&&r.grade<=12&&Number.isInteger(r.attempts)&&r.attempts>=0&&r.attempts<=10000&&Number.isFinite(r.updatedAt)&&r.updatedAt>=0&&
  (!r.correct||r.attempts>0)&&(!r.firstAttemptCorrect||independent(r))&&
  (!r.practiceSettings||(r.practiceSettings.grade===r.grade&&(r.practiceSettings.topic==='mixed'||r.practiceSettings.topic===r.topic)))
 );
}
