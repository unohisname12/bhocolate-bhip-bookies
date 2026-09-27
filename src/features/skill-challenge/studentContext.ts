import {createContext,useContext} from 'react';
import type {Policy,ProgressView} from './model';
export type Challenge={id:string;policy:Policy;createdAt:number;closedAt:number|null;winnerId:string|null;winnerReason:string};
export type StudentData={challenge:Challenge|null;assignment:{studentId:string;revision:number;gradeChanged:boolean;progress:ProgressView}|null;serverNow:number};
export const StudentChallengeContext=createContext<{data:StudentData|null;ready:boolean;error:string;accept:(data:StudentData)=>void;refresh:()=>Promise<StudentData>;openRequest:number;open:()=>void}|null>(null);
export const useStudentChallenge=()=>useContext(StudentChallengeContext);
