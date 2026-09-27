import {lesson} from './lessons';
import type {Challenge} from '../../services/game/curriculum';
import {QuantityModel} from './QuantityModel';
export {QuantityModel} from './QuantityModel';
import {MiniLessonButton} from '../mini-lesson/MiniLesson';
export function LessonView({id,level}:{id:string;level:Challenge}){const l=lesson(id,level);return <section className="skill-lesson"><p className="skill-eyebrow">{l.mission} · Worked example</p><h3>{l.title}</h3><p>{l.concept}</p><QuantityModel visual={l.visual}/><h4>{l.question}</h4><ol>{l.steps.map(step=><li key={step}>{step}</li>)}</ol><MiniLessonButton skillId={id} level={level}/><p>Your next problem uses fresh quantities. Help is welcome during practice.</p></section>;}
