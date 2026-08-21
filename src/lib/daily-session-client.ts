import type { Concept, DailyDoseSession, DailyDoseStep } from './types';

function hashDate(date: string) { let h = 0; for (let i = 0; i < date.length; i++) h = ((h << 5) - h + date.charCodeAt(i)) | 0; return Math.abs(h); }
function todayLocal(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function wasYesterday(slug:string, events:Array<{concept_slug:string;created_at:string}>){ const y=new Date(Date.now()-86400000).toISOString().slice(0,10); return events.some(e=>e.concept_slug===slug&&e.created_at.slice(0,10)===y); }
function addStep(steps:DailyDoseStep[], concept:Concept, type:string, kind:DailyDoseStep['kind'], title:string, description:string){ const b=concept.blocks.find(x=>x.type===type); if(b) steps.push({id:kind,kind,title,description,block_ref:b.id,completed:false}); }
export function buildDailyDoseForConcept(concept:Concept, weak:boolean, review:boolean, events:Array<{concept_slug:string;created_at:string}>):DailyDoseSession{
 const date=todayLocal(); const dayType=['A','B','C','D'][hashDate(date)%4] as 'A'|'B'|'C'|'D'; const steps:DailyDoseStep[]=[];
 if(review||weak) steps.push({id:'warmup',kind:'recall',title:'Warm-up recall',description:weak?'Pull up what you remember before you rebuild it.':'Review time — what do you still remember?',completed:false});
 steps.push({id:'intro',kind:'concept_intro',title:(review?'Review: ':'')+concept.title,description:concept.summary,completed:false});
 if(dayType==='A'){ addStep(steps,concept,'mermaid','visual','Visual','See the concept drawn out.'); addStep(steps,concept,'quiz','quiz','Quiz','Anchor the mental model.'); }
 if(dayType==='B'){ addStep(steps,concept,'scenario','prediction','Scenario','Apply what you know.'); addStep(steps,concept,'quiz','quiz','Quiz','Test your understanding.'); }
 if(dayType==='C'){ addStep(steps,concept,'mermaid','visual','Architecture','Revisit the system flow.'); addStep(steps,concept,'quiz','quiz','Misconception check','Catch the common trap.'); }
 if(dayType==='D'){ addStep(steps,concept,'mermaid','visual','Visual','Revisit the architecture.'); addStep(steps,concept,'quiz','quiz','Architecture question','Where does this fit?'); }
 steps.push({id:'recall',kind:'recall',title:dayType==='D'?'Interview recall':'Active recall',description:'Explain this in your own words without looking.',completed:false});
 return {date,concept_slug:concept.slug,review_slug:review?concept.slug:undefined,steps};
}
