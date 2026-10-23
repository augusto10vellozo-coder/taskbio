import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { REST_EVENT, readRest, writeRest, restKey, restRemaining, pauseRest, extendRest, type RestState } from '@/lib/rest-timer';
export function RestTimer() {
 const { user }=useAuth(); const key=restKey(user?.id);
 const [state,setState]=useState<RestState|null>(null);const [now,setNow]=useState(0);const notified=useRef<number|null>(null);
 useEffect(()=>{const refresh=()=>{setState(readRest(key));setNow(Date.now());};refresh();window.addEventListener(REST_EVENT,refresh);window.addEventListener('storage',refresh);const id=window.setInterval(()=>setNow(Date.now()),250);return()=>{clearInterval(id);window.removeEventListener(REST_EVENT,refresh);window.removeEventListener('storage',refresh);};},[key]);
 const remaining=state ? restRemaining(state,now) : 0;
 useEffect(()=>{if(!state || state.pausedMs!==null || remaining>0 || notified.current===state.endsAt)return;notified.current=state.endsAt;navigator.vibrate?.([150,80,150]);if(state.sound){try{const context=new AudioContext();const oscillator=context.createOscillator();const gain=context.createGain();gain.gain.value=0.08;oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+0.15);oscillator.onended=()=>{void context.close();};}catch{/* sound unsupported */}}},[remaining,state]);
 if(!state)return null;
 const seconds=Math.ceil(remaining/1000);
 return <aside aria-label="Timer de descanso" className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] inset-x-3 z-40 mx-auto max-w-lg rounded-lg border bg-card p-3 shadow-md xl:bottom-4 ${remaining===0?'border-good':'border-line'}`}>
 <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-steel">{remaining===0?'Descanso encerrado':'Descanso'}</span><output className={`font-mono text-xl tabular-nums ${remaining===0?'text-good':'text-ink'}`} aria-live={remaining===0?'polite':'off'}>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</output><Button variant="ghost" size="icon" aria-label="Som do descanso" aria-pressed={state.sound} onClick={()=>writeRest(key,{...state,sound:!state.sound})} className={state.sound?'text-good':'text-steel'}><Volume2 /></Button></div>
 <div className="mt-1 flex items-center gap-2"><Button size="sm" variant="outline" onClick={()=>writeRest(key,extendRest(state,Date.now()))}>+15s</Button><Button size="sm" variant="outline" onClick={()=>writeRest(key,pauseRest(state,Date.now()))}>{state.pausedMs===null?<Pause/>:<Play/>}{state.pausedMs===null?'Pausar':'Retomar'}</Button><Button size="sm" variant="ghost" onClick={()=>writeRest(key,null)}>Pular</Button></div>
 </aside>;
}
