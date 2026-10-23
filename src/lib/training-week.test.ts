import { expect, it } from 'vitest';
import { weeklyTrainingProgress } from './training-session';
import type { Plan } from './trilha-data';
it('counts 2 of 5 planned days, then 3, complete, and uncheck immediately',()=>{
 const dates=['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23'];
 const plan:Plan=Object.fromEntries(dates.map((d,i)=>[d,[{id:d,kind:'treino',title:'A',time:'07:00',done:i<2}]]));
 expect(weeklyTrainingProgress(plan,dates)).toEqual({total:5,done:2,complete:false});
 const third=plan[dates[2] ?? '']?.[0];if(!third)throw new Error('fixture');third.done=true;
 expect(weeklyTrainingProgress(plan,dates).done).toBe(3);
 Object.values(plan).flat().forEach(b=>b.done=true);expect(weeklyTrainingProgress(plan,dates).complete).toBe(true);
 third.done=false;expect(weeklyTrainingProgress(plan,dates).done).toBe(4);
});
it('counts days not duplicate appointments, excludes other weeks and no empty trophy',()=>{
 const b={id:'1',kind:'treino' as const,title:'A',time:'07:00',done:true};
 expect(weeklyTrainingProgress({'2026-10-19':[b,{...b,id:'2'}],'2026-10-26':[b]},['2026-10-19']).total).toBe(1);
 expect(weeklyTrainingProgress({},['2026-10-19']).complete).toBe(false);
});
