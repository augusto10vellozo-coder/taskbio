import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Check, Flame, Pause, Play, Plus, Square, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleHeader } from "@/components/ModuleHeader";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { lastDays, type Subject } from "@/lib/engagement";
import { readingStreak } from "@/lib/reading";
import { daysUntil, DEFAULT_POMODORO, migrateLegacySubjects, minutesBySubject, suggestColor, upcomingExams } from "@/lib/study";
import { emitXp } from "@/lib/xp-client";

const input = "h-10 min-w-0 rounded-md bg-background px-3 text-sm ring-1 ring-line";
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const hm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}min` : ""}` : `${m} min`);

type Run = { phase: "foco" | "pausa"; endsAt: number; startedAt: number; paused?: number | undefined };

export function StudyModule() {
  const { trackers, setTrackers } = useTaskBio();
  const subjects = trackers.subjects ?? [];
  const sessions = trackers.estudos ?? [];
  const exams = trackers.exams ?? [];
  const pomo = trackers.pomodoro ?? DEFAULT_POMODORO;
  const [today, setToday] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [minutes, setMinutes] = useState("");
  const [learned, setLearned] = useState("");
  const [newSub, setNewSub] = useState({ name: "", color: "", touched: false });
  const [exam, setExam] = useState({ subjectId: "", title: "", date: "" });
  const [run, setRun] = useState<Run | null>(null);
  const [, tick] = useState(0);
  const runRef = useRef(run); runRef.current = run;

  useEffect(() => setToday(toDateKey(new Date())), []);
  // Old free-text sessions ("Programação") become subjects once.
  useEffect(() => {
    const r = migrateLegacySubjects(subjects, sessions);
    if (r.changed) setTrackers((t) => ({ ...t, subjects: r.subjects, estudos: r.sessions }));
  }, [subjects, sessions, setTrackers]);
  useEffect(() => { if (!subjectId && subjects[0]) setSubjectId(subjects[0].id); }, [subjects, subjectId]);
  useEffect(() => { if (!newSub.touched) setNewSub((s) => ({ ...s, color: suggestColor(subjects) })); }, [subjects, newSub.touched]);

  const record = (mins: number, how: string) => {
    const sub = subjects.find((s) => s.id === subjectId);
    const day = toDateKey(new Date());
    if (!sub || mins < 1) return;
    const id = `s-${Date.now()}`;
    const note = learned.trim().slice(0, 140);
    setTrackers((t) => ({ ...t, estudos: [{ id, date: day, minutes: mins, title: sub.name, subjectId: sub.id, ...(note ? { learned: note } : {}) }, ...t.estudos] }));
    emitXp({ kind: "study", ref: id, date: day, on: true });
    setLearned("");
    toast.success(`${how}: ${mins} min de ${sub.name} · +5 XP`);
  };

  useEffect(() => {
    if (!run || run.paused) return;
    const iv = setInterval(() => {
      const r = runRef.current;
      if (!r || r.paused) return;
      if (Date.now() >= r.endsAt) {
        if (r.phase === "foco") {
          record(pomo.focus, "Sessão concluída");
          setRun({ phase: "pausa", startedAt: Date.now(), endsAt: Date.now() + pomo.pause * 60000 });
          try { navigator.vibrate?.(300); } catch { /* sem vibração */ }
        } else { setRun(null); toast("Pausa encerrada. Pronto para mais um foco?"); }
      }
      tick((n) => n + 1);
    }, 500);
    return () => clearInterval(iv);
  });

  const streak = useMemo(() => readingStreak(sessions, new Date()), [sessions]);
  if (!today) return <main className="mx-auto max-w-4xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;

  const week = lastDays(new Date(), 7);
  const bySub = minutesBySubject(sessions, week);
  const maxMin = Math.max(1, ...subjects.map((s) => Math.max(bySub.get(s.id) ?? 0, s.weeklyGoalMin ?? 0)));
  const subOf = (id?: string) => subjects.find((s) => s.id === id);
  const patchSub = (id: string, p: Partial<Subject>) => setTrackers((t) => ({ ...t, subjects: (t.subjects ?? []).map((s) => (s.id === id ? { ...s, ...p } : s)) }));
  const remaining = run ? Math.max(0, Math.ceil(((run.paused ?? Date.now()) >= run.endsAt ? 0 : run.endsAt - (run.paused ?? Date.now())) / 1000)) : 0;
  const upcoming = upcomingExams(exams, today);

  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 sm:px-8">
      <ModuleHeader title="Estudos" />
      <div className="-mt-1 flex flex-wrap items-center gap-2 pb-5 text-sm text-steel">
        <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 font-medium text-foreground ring-1 ring-line"><Flame className="size-4 text-accent" /> {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}</span>
        <span>Seu tempo de estudo</span>
      </div>

      <section aria-labelledby="materias" className="rounded-lg bg-card p-4 ring-1 ring-line">
        <h2 id="materias" className="font-display text-lg font-semibold">Minhas matérias</h2>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const name = newSub.name.trim(); if (!name) { toast.error("Informe o nome da matéria"); return; } if (subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) { toast.error("Essa matéria já existe"); return; } const sub = { id: `sub-${Date.now()}`, name, color: newSub.touched ? newSub.color : suggestColor(subjects) }; setTrackers((t) => ({ ...t, subjects: [...(t.subjects ?? []), sub] })); setSubjectId(sub.id); setNewSub({ name: "", color: "", touched: false }); toast.success(`Matéria “${name}” criada`); }}>
          <input type="color" aria-label="Cor da matéria" value={newSub.color || "#5EEAD4"} onChange={(e) => setNewSub({ ...newSub, color: e.target.value, touched: true })} className="h-10 w-12 shrink-0 cursor-pointer rounded-md bg-background p-1 ring-1 ring-line" />
          <input aria-label="Nova matéria" placeholder="Nova matéria (ex.: Inglês)" value={newSub.name} onChange={(e) => setNewSub({ ...newSub, name: e.target.value })} className={`${input} flex-1`} />
          <Button className="h-10 shrink-0" aria-label="Criar matéria"><Plus /></Button>
        </form>
        <ul className="mt-3 space-y-3">
          {subjects.length === 0 && <li className="text-sm text-steel">Crie sua primeira matéria pra começar a estudar.</li>}
          {subjects.map((s) => { const m = bySub.get(s.id) ?? 0; const g = s.weeklyGoalMin ?? 0; return (
            <li key={s.id}>
              <div className="flex items-center gap-2 text-sm">
                <span className="size-3 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                <span className="shrink-0 text-xs text-steel">{hm(m)}{g ? ` / ${hm(g)}` : ""}</span>
                <label className="flex shrink-0 items-center gap-1 text-xs text-steel">Meta <input type="number" min="0" step="0.5" aria-label={`Meta semanal em horas de ${s.name}`} value={g ? g / 60 : ""} placeholder="0" onChange={(e) => patchSub(s.id, { weeklyGoalMin: Math.max(0, Math.round(Number(e.target.value) * 60)) })} className="h-8 w-14 rounded bg-background px-2 text-center ring-1 ring-line" /><span>h</span></label>
                <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Remover ${s.name}`} onClick={() => { if (confirm(`Remover a matéria “${s.name}”? O histórico continua salvo.`)) setTrackers((t) => ({ ...t, subjects: (t.subjects ?? []).filter((x) => x.id !== s.id) })); }}><Trash2 /></Button>
              </div>
              <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-mist" role="img" aria-label={`${m} minutos nos últimos 7 dias`}>
                <div className="h-full rounded-full" style={{ width: `${(m / maxMin) * 100}%`, background: s.color }} />
                {g > 0 && <div className="absolute inset-y-0 w-0.5 bg-foreground/60" style={{ left: `${Math.min(99.5, (g / maxMin) * 100)}%` }} />}
              </div>
            </li>
          ); })}
        </ul>
        {subjects.length > 0 && <p className="mt-3 text-xs text-steel">Seus últimos 7 dias · o traço é a sua meta.</p>}
      </section>

      {subjects.length > 0 && (
        <section aria-labelledby="sessao" className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line">
          <h2 id="sessao" className="font-display text-lg font-semibold">Sessão de estudo</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select aria-label="Matéria" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={run?.phase === "foco"} className={`${input} col-span-2`}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input aria-label="O que aprendi hoje" maxLength={140} placeholder="O que aprendi hoje (opcional)" value={learned} onChange={(e) => setLearned(e.target.value)} className={`${input} col-span-2`} />
          </div>

          <div className="mt-4 rounded-lg bg-background p-4 text-center ring-1 ring-line">
            {run ? (<>
              <p className="text-xs font-medium uppercase tracking-wide text-steel">{run.phase === "foco" ? `Foco · ${subOf(subjectId)?.name ?? ""}` : "Pausa"}</p>
              <p className="mt-1 font-display text-5xl font-semibold tabular-nums" aria-live="polite">{fmt(remaining)}</p>
              <div className="mt-3 flex justify-center gap-2">
                <Button variant="outline" onClick={() => setRun((r) => r && (r.paused ? { ...r, endsAt: r.endsAt + (Date.now() - r.paused), paused: undefined } : { ...r, paused: Date.now() }))}>{run.paused ? <><Play /> Continuar</> : <><Pause /> Pausar</>}</Button>
                <Button variant="secondary" onClick={() => { if (run.phase === "foco") { const mins = Math.floor(((run.paused ?? Date.now()) - run.startedAt) / 60000); if (mins >= 1) record(mins, "Sessão registrada"); else toast("Sessão com menos de 1 minuto não foi registrada"); } setRun(null); }}><Square /> Encerrar</Button>
              </div>
            </>) : (<>
              <Button size="lg" className="h-12" onClick={() => setRun({ phase: "foco", startedAt: Date.now(), endsAt: Date.now() + pomo.focus * 60000 })}><Timer /> Iniciar sessão</Button>
              <div className="mt-3 flex justify-center gap-3 text-xs text-steel">
                <label className="flex items-center gap-1">Foco <input type="number" min="1" max="180" aria-label="Minutos de foco" value={pomo.focus} onChange={(e) => { const v = Math.round(Number(e.target.value)); if (v > 0) setTrackers((t) => ({ ...t, pomodoro: { ...pomo, focus: v } })); }} className="h-8 w-14 rounded bg-card px-2 ring-1 ring-line" /> min</label>
                <label className="flex items-center gap-1">Pausa <input type="number" min="1" max="60" aria-label="Minutos de pausa" value={pomo.pause} onChange={(e) => { const v = Math.round(Number(e.target.value)); if (v > 0) setTrackers((t) => ({ ...t, pomodoro: { ...pomo, pause: v } })); }} className="h-8 w-14 rounded bg-card px-2 ring-1 ring-line" /> min</label>
              </div>
            </>)}
          </div>

          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const m = Math.round(Number(minutes)); if (!(m > 0)) { toast.error("Informe os minutos"); return; } record(m, "Sessão registrada"); setMinutes(""); }}>
            <input type="number" min="1" aria-label="Minutos" placeholder="Ou informe os minutos" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={`${input} flex-1`} />
            <Button variant="outline" className="h-10 shrink-0"><Plus /> Registrar</Button>
          </form>
        </section>
      )}

      <section aria-labelledby="provas" className="mt-4 rounded-lg bg-card p-4 pb-6 ring-1 ring-line">
        <h2 id="provas" className="flex items-center gap-2 font-display text-lg font-semibold"><CalendarClock className="size-5" /> Provas e entregas</h2>
        {subjects.length === 0 ? <p className="mt-2 text-sm text-steel">Crie uma matéria pra organizar suas provas.</p> : (
          <form className="mt-3 grid grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); const sid = exam.subjectId || subjectId; if (!exam.title.trim() || !exam.date) { toast.error("Informe descrição e data"); return; } setTrackers((t) => ({ ...t, exams: [...(t.exams ?? []), { id: `ex-${Date.now()}`, subjectId: sid, subjectName: subOf(sid)?.name ?? "", title: exam.title.trim(), date: exam.date }] })); setExam({ subjectId: "", title: "", date: "" }); toast.success("Prova salva · lembrete 1 dia antes e no dia"); }}>
            <select aria-label="Matéria da prova" value={exam.subjectId || subjectId} onChange={(e) => setExam({ ...exam, subjectId: e.target.value })} className={input}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <input type="date" aria-label="Data da prova" min={today} value={exam.date} onChange={(e) => setExam({ ...exam, date: e.target.value })} className={input} />
            <input aria-label="Descrição da prova" placeholder="Ex.: Prova de verbos, entrega do projeto" value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} className={`${input} col-span-2`} />
            <Button className="col-span-2 h-10"><Plus /> Adicionar</Button>
          </form>
        )}
        <ul className="mt-3 divide-y divide-line">
          {upcoming.length === 0 && <li className="py-3 text-sm text-steel">Nada pela frente — aproveite pra adiantar os estudos.</li>}
          {upcoming.map((ex) => { const d = daysUntil(ex.date, today); const s = subOf(ex.subjectId); return (
            <li key={ex.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="size-3 shrink-0 rounded-full" style={{ background: s?.color ?? "currentColor" }} aria-hidden />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]"><span className="font-medium">{ex.title}</span> <span className="text-xs text-steel">· {s?.name ?? ex.subjectName} · {ex.date.split("-").reverse().join("/")}</span></span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${d <= 1 ? "bg-accent/20 text-accent" : "bg-mist"}`}>{d === 0 ? "Hoje" : d === 1 ? "Amanhã" : `em ${d} dias`}</span>
              <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Marcar como feita" onClick={() => setTrackers((t) => ({ ...t, exams: (t.exams ?? []).map((x) => (x.id === ex.id ? { ...x, done: true } : x)) }))}><Check /></Button>
              <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Remover prova" onClick={() => setTrackers((t) => ({ ...t, exams: (t.exams ?? []).filter((x) => x.id !== ex.id) }))}><Trash2 /></Button>
            </li>
          ); })}
        </ul>
      </section>

      <section aria-labelledby="hist" className="mt-6">
        <h2 id="hist" className="font-display text-lg font-semibold">Histórico</h2>
        <ul className="mt-3 divide-y divide-line rounded-lg bg-card px-4 ring-1 ring-line">
          {sessions.length === 0 ? <li className="py-6 text-center text-sm text-steel">Nenhuma sessão ainda.</li> : sessions.slice(0, 30).map((e) => { const s = subOf(e.subjectId); return (
            <li key={e.id} className="flex items-start gap-3 py-2 text-sm">
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: s?.color ?? "currentColor" }} aria-hidden />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{s?.name ?? (e.title || "Estudo")} <span className="text-xs text-steel">· {e.date.split("-").reverse().join("/")}</span>{e.learned && <span className="block text-xs italic text-steel">💡 {e.learned}</span>}</span>
              <span className="shrink-0 font-medium">{e.minutes} min</span>
              <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Remover sessão" onClick={() => { emitXp({ kind: "study", ref: e.id, date: e.date, on: false }); setTrackers((t) => ({ ...t, estudos: t.estudos.filter((x) => x.id !== e.id) })); }}><Trash2 /></Button>
            </li>
          ); })}
        </ul>
      </section>
    </main>
  );
}
