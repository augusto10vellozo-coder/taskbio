import { useEffect, useMemo, useState } from "react";
import { useEntryState } from "@/lib/navigation-context";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, CalendarDays, Check, Flame, Pause, Play, Plus, Square, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleHeader } from "@/components/ModuleHeader";
import { Button } from "@/components/ui/button";
import { useTaskBio } from "@/lib/trilha-store";
import { type Subject } from "@/lib/engagement";
import { readingStreak } from "@/lib/reading";
import { dailyStudyGoal, daysUntil, DEFAULT_POMODORO, migrateLegacySubjects, minutesBySubject, normalizeSubject, studyDays, subjectName, suggestColor, upcomingExams, validStudyGoal } from "@/lib/study";
import { useStudyTimer } from "@/components/StudyTimerProvider";
import { recordXp } from "@/lib/social.functions";
import { XP_EVENT } from "@/lib/xp-client";
import { brasiliaDay } from "@/lib/xp";
import { useAuth } from "@/lib/auth-context";
import { getWeekKeys } from "@/lib/calendar-utils";
import type { Block } from "@/lib/trilha-data";

const input = "h-10 min-w-0 rounded-md bg-background px-3 text-sm ring-1 ring-line";
const WEEK_DAYS = [
  { value: 1, label: "seg" },
  { value: 2, label: "ter" },
  { value: 3, label: "qua" },
  { value: 4, label: "qui" },
  { value: 5, label: "sex" },
  { value: 6, label: "sáb" },
  { value: 0, label: "dom" },
];
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const hm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}min` : ""}` : `${m} min`);

export function StudyModule() {
  const { trackers, setTrackers, plan, replaceDays, removeBlock } = useTaskBio();
  const subjects = trackers.subjects ?? [];
  const sessions = trackers.estudos ?? [];
  const exams = trackers.exams ?? [];
  const pomo = trackers.pomodoro ?? DEFAULT_POMODORO;
  const [today, setToday] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useEntryState("study:subject", "");
  const [minutes, setMinutes] = useState("");
  const [learned, setLearned] = useState("");
  const [newSub, setNewSub] = useState({ name: "", color: "", touched: false });
  const [exam, setExam] = useState({ subjectId: "", title: "", date: "" });
  const { run, now, start, pause, stop, record: saveSession } = useStudyTimer();
  const revoke = useServerFn(recordXp);
  const { user } = useAuth();
  const [removing, setRemoving] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [planSub, setPlanSub] = useState("");
  const [planDays, setPlanDays] = useState<number[]>([1, 3, 5]);
  const [planMinutes, setPlanMinutes] = useState("60");
  const [planTime, setPlanTime] = useState("19:00");

  useEffect(() => setToday(brasiliaDay(new Date(now || Date.now()))), [now]);
  // Old free-text sessions ("Programação") become subjects once.
  useEffect(() => {
    const r = migrateLegacySubjects(subjects, sessions, exams);
    if (r.changed) setTrackers((t) => ({ ...t, subjects: r.subjects, estudos: r.sessions, exams: r.exams }));
  }, [subjects, sessions, exams, setTrackers]);
  useEffect(() => { if (!subjectId && subjects[0]) setSubjectId(subjects[0].id); }, [subjects, subjectId]);
  useEffect(() => { if (!newSub.touched) setNewSub((s) => ({ ...s, color: suggestColor(subjects) })); }, [subjects, newSub.touched]);

  const record = (mins: number, how: string) => {
    const sub = subjects.find((s) => s.id === subjectId);
    const day = brasiliaDay(new Date());
    if (!sub || mins < 1) return;
    const id = `study-${crypto.randomUUID()}`;
    const note = learned.trim().slice(0, 140);
    void saveSession({ id, date: day, minutes: mins, title: sub.name, subjectId: sub.id, ...(note ? { learned: note } : {}) });
    setLearned("");
  };

  /** Adds study blocks to this week's agenda; completing a block records the session. */
  const addSchedule = () => {
    const sub = subjects.find((s) => s.id === (planSub || subjectId));
    if (!sub) { toast.error("Crie uma matéria primeiro"); return; }
    const mins = Math.round(Number(planMinutes));
    if (!(mins >= 5)) { toast.error("Informe a duração em minutos"); return; }
    if (!planDays.length) { toast.error("Escolha ao menos um dia"); return; }
    const days: Record<string, Block[]> = {};
    for (const key of getWeekKeys(new Date())) {
      const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
      if (!planDays.includes(weekday)) continue;
      const existing = plan[key] ?? [];
      if (existing.some((b) => b.subjectId === sub.id)) continue;
      days[key] = [...existing, {
        id: `b-${crypto.randomUUID()}`,
        time: planTime,
        kind: "compromisso",
        title: `Estudo: ${sub.name}`,
        subjectId: sub.id,
        durationMinutes: mins,
        done: false,
      }];
    }
    if (!Object.keys(days).length) { toast.info("Já existe estudo desta matéria nos dias escolhidos"); return; }
    replaceDays(days);
    toast.success(`Cronograma de ${sub.name} adicionado à agenda`);
  };

  const streak = useMemo(() => readingStreak(sessions, new Date(`${today ?? "2000-01-01"}T12:00:00`)), [sessions, today]);
  if (!today) return <main className="mx-auto max-w-4xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;

  const bySub = minutesBySubject(sessions, [today]);
  const days = studyDays(sessions, today);
  const totalGoal = subjects.reduce((n, s) => n + dailyStudyGoal(s), 0);
  const chartMax = Math.max(1, totalGoal, ...days.map(d => d.minutes)) * 1.15;
  const subOf = (id?: string) => subjects.find((s) => s.id === id);
  const patchSub = (id: string, p: Partial<Subject>) => setTrackers((t) => ({ ...t, subjects: (t.subjects ?? []).map((s) => (s.id === id ? { ...s, ...p } : s)) }));
  const remaining = run ? Math.max(0, Math.ceil((run.endsAt - (run.paused ?? now)) / 1000)) : 0;
  const upcoming = upcomingExams(exams, today);
  const weekKeys = getWeekKeys(new Date());
  const weekBlocks = weekKeys.flatMap((key) => (plan[key] ?? []).filter((b) => b.subjectId).map((b) => ({ key, block: b })));
  const weekBySub = minutesBySubject(sessions, weekKeys);
  const weekTargets = new Map<string, number>();
  for (const { block } of weekBlocks) {
    if (!block.subjectId || block.review) continue;
    weekTargets.set(block.subjectId, (weekTargets.get(block.subjectId) ?? 0) + (block.durationMinutes ?? 0));
  }

  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 sm:px-8">
      <ModuleHeader title="Estudos" />
      <div className="-mt-1 flex flex-wrap items-center gap-2 pb-5 text-sm text-steel">
        <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 font-medium text-foreground ring-1 ring-line"><Flame className="size-4 text-accent" /> {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}</span>
        <span>Seu tempo de estudo</span>
      </div>

      <section aria-labelledby="materias" className="rounded-lg bg-card p-4 ring-1 ring-line">
        <h2 id="materias" className="font-display text-lg font-semibold">Minhas matérias</h2>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const name = subjectName(newSub.name); const normalizedName = normalizeSubject(name); if (!normalizedName) { toast.error("Informe o nome da matéria"); return; } if (subjects.some((s) => normalizeSubject(s.name) === normalizedName)) { toast.error("Você já tem essa matéria"); return; } const sub = { id: `sub-${Date.now()}`, name, normalizedName, color: newSub.touched ? newSub.color : suggestColor(subjects) }; setTrackers((t) => ({ ...t, subjects: [...(t.subjects ?? []), sub] })); setSubjectId(sub.id); setNewSub({ name: "", color: "", touched: false }); toast.success(`Matéria “${name}” criada`); }}>
          <input type="color" aria-label="Cor da matéria" value={newSub.color || "#5EEAD4"} onChange={(e) => setNewSub({ ...newSub, color: e.target.value, touched: true })} className="h-10 w-12 shrink-0 cursor-pointer rounded-md bg-background p-1 ring-1 ring-line" />
          <input aria-label="Nova matéria" placeholder="Nova matéria (ex.: Inglês)" value={newSub.name} onChange={(e) => setNewSub({ ...newSub, name: e.target.value })} className={`${input} flex-1`} />
          <Button className="h-10 shrink-0" aria-label="Criar matéria"><Plus /></Button>
        </form>
        <ul className="mt-3 space-y-3">
          {subjects.length === 0 && <li className="text-sm text-steel">Crie sua primeira matéria pra começar a estudar.</li>}
          {subjects.map((s) => {
            const m = bySub.get(s.id) ?? 0;
            const g = dailyStudyGoal(s);
            const weekMin = weekBySub.get(s.id) ?? 0;
            const scheduled = weekTargets.get(s.id) ?? 0;
            const weekTarget = scheduled || (s.weeklyGoalMin ?? 0) || g * 7;
            const weekPct = weekTarget > 0 ? Math.min(100, Math.round((weekMin / weekTarget) * 100)) : 0;
            const nextExam = upcoming.find((e) => e.subjectId === s.id);
            const examDays = nextExam ? daysUntil(nextExam.date, today) : 0;
            return (
              <li key={s.id} className="rounded-lg bg-background/50 p-3 ring-1 ring-line">
                <div className="flex items-center gap-2 text-sm">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Editar ${s.name}`} onClick={() => { setEditing(s.id); setEditName(s.name); }}><span aria-hidden>✎</span></Button>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Remover ${s.name}`} onClick={() => { if (confirm(`Remover a matéria “${s.name}”? O histórico continua salvo.`)) setTrackers((t) => ({ ...t, subjects: (t.subjects ?? []).filter((x) => x.id !== s.id) })); }}><Trash2 /></Button>
                </div>
                {editing === s.id && <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); const name = subjectName(editName); const key = normalizeSubject(name); if (!key) return; if (subjects.some(x => x.id !== s.id && normalizeSubject(x.name) === key)) { toast.error("Você já tem essa matéria"); return; } patchSub(s.id, { name, normalizedName: key }); setEditing(null); }}><input aria-label="Nome da matéria" className={`${input} flex-1`} value={editName} onChange={e => setEditName(e.target.value)} /><Button size="icon" aria-label="Salvar nome"><Check /></Button></form>}
                <p className="mt-1.5 text-xs text-steel">hoje {hm(m)}{g ? ` / ${hm(g)}` : ""} · semana {hm(weekMin)}{weekTarget > 0 ? ` / ${hm(weekTarget)}` : ""}</p>
                {weekTarget > 0 && <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-mist" role="progressbar" aria-label={`Progresso semanal de ${s.name}`} aria-valuenow={weekPct} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-brand" style={{ width: `${weekPct}%` }} /></div>}
                {nextExam && (
                  <p className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-ink" style={{ background: `${s.color}22` }}>
                    <CalendarClock className="size-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">{examDays < 0 ? `Prova atrasada há ${-examDays}d` : examDays === 0 ? "Prova hoje" : `Prova em ${examDays} ${examDays === 1 ? "dia" : "dias"}`} · {nextExam.title}</span>
                  </p>
                )}
                <StudyGoal subject={s} save={m => { patchSub(s.id, { dailyGoalMin: m }); toast.success(`Meta de ${s.name}: ${m} min por dia`); }} />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="cronograma" className="mt-4 rounded-lg bg-card p-4 ring-1 ring-line">
        <h2 id="cronograma" className="flex items-center gap-2 font-display text-lg font-semibold"><CalendarDays className="size-5" /> Cronograma da semana</h2>
        <p className="mt-1 text-xs text-steel">Escolha matéria, dias e duração. Os blocos entram na agenda e, ao concluir, contam como estudo.</p>
        {subjects.length === 0 ? <p className="mt-2 text-sm text-steel">Crie uma matéria para montar o cronograma.</p> : <>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_90px_90px_auto]">
            <select aria-label="Matéria do cronograma" value={planSub || subjectId} onChange={(e) => setPlanSub(e.target.value)} className={input}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input aria-label="Minutos por sessão" type="number" min="5" step="5" value={planMinutes} onChange={(e) => setPlanMinutes(e.target.value)} className={input} />
            <input aria-label="Horário do estudo" type="time" value={planTime} onChange={(e) => setPlanTime(e.target.value)} className={input} />
            <Button className="h-10" onClick={addSchedule}><Plus /> Adicionar</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Dias do cronograma">
            {WEEK_DAYS.map((d) => {
              const on = planDays.includes(d.value);
              return <button key={d.value} type="button" aria-pressed={on} onClick={() => setPlanDays((cur) => (on ? cur.filter((x) => x !== d.value) : [...cur, d.value]))} className={`rounded-full px-3 py-1 text-xs font-medium ${on ? "bg-brand text-primary-foreground" : "bg-mist text-steel"}`}>{d.label}</button>;
            })}
          </div>
          {weekBlocks.length > 0 && <ul className="mt-3 divide-y divide-line">
            {weekBlocks.map(({ key, block }) => {
              const s = subOf(block.subjectId);
              return <li key={block.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: s?.color ?? "currentColor" }} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][new Date(`${key}T12:00:00Z`).getUTCDay()]} · {block.time} · {s?.name ?? block.title}</span>
                <span className="shrink-0 text-xs text-steel">{block.durationMinutes} min</span>
                <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Remover bloco de ${s?.name ?? "estudo"}`} onClick={() => removeBlock(key, block.id)}><Trash2 /></Button>
              </li>;
            })}
          </ul>}
        </>}
      </section>


      <section aria-labelledby="semana-estudo" className="mt-4">
        <h2 id="semana-estudo" className="font-display text-lg font-semibold">Últimos 7 dias</h2>
        {days.every(d => d.minutes === 0) ? <p className="mt-2 text-sm text-steel">Nenhum estudo registrado nos últimos 7 dias</p> : <>
          <div className="relative mt-3 h-52" role="img" aria-label="Minutos de estudo por dia nos últimos 7 dias">
            <div className="absolute inset-x-0 bottom-8 top-6 border-b border-line">
              {totalGoal > 0 && <div className="absolute inset-x-0 border-t-2 border-dashed border-steel" style={{ bottom: `${totalGoal / chartMax * 100}%` }}><span className="absolute right-0 -top-5 bg-background px-1 text-xs text-steel">{totalGoal} min</span></div>}
              <div className="relative grid h-full grid-cols-7 gap-2 px-1">{days.map(d => <div key={d.date} className="relative flex h-full min-w-0 items-end justify-center"><div className={`w-full max-w-10 rounded-t ${totalGoal > 0 && d.minutes >= totalGoal ? "bg-brand" : "bg-steel/40"}`} style={{ height: `${d.minutes / chartMax * 100}%` }} /><span className="absolute bottom-full hidden">{d.minutes}</span><span className="absolute text-xs tabular-nums text-foreground" style={{ bottom: `calc(${d.minutes / chartMax * 100}% + 3px)` }}>{d.minutes}</span></div>)}</div>
            </div>
            <div className="absolute inset-x-0 bottom-0 grid grid-cols-7 gap-2 text-center text-xs">{days.map(d => <span key={d.date} className={d.date === today ? "font-semibold text-brand" : "text-steel"}>{["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][new Date(`${d.date}T12:00:00Z`).getUTCDay()]}</span>)}</div>
          </div>
          <p className="mt-1 text-xs text-steel">Seus últimos 7 dias{totalGoal > 0 ? " · o traço é a sua meta." : ""}</p>
        </>}
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
              <p className="text-xs font-medium uppercase tracking-wide text-steel">{run.phase === "foco" ? `Foco · ${run.title}` : "Pausa"}</p>
              <p className="mt-1 font-display text-5xl font-semibold tabular-nums" aria-live="polite">{fmt(remaining)}</p>
              <div className="mt-3 flex justify-center gap-2">
                <Button variant="outline" onClick={pause}>{run.paused !== undefined ? <><Play /> Continuar</> : <><Pause /> Pausar</>}</Button>
                <Button variant="secondary" onClick={stop}><Square /> Encerrar sessão</Button>
              </div>
            </>) : (<>
              <Button size="lg" className="h-12" onClick={() => { const s = subOf(subjectId); if (s) start(s.id, s.name, learned.trim(), pomo.focus, pomo.pause); }}><Timer /> Iniciar sessão</Button>
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
            <label className="min-w-0 text-xs text-steel">Data <input type="date" required aria-label="Data da prova" value={exam.date} onChange={(e) => setExam({ ...exam, date: e.target.value })} className={`${input} w-full`} /></label>
            <input aria-label="Descrição da prova" placeholder="Ex.: Prova de verbos, entrega do projeto" value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} className={`${input} col-span-2`} />
            <Button className="col-span-2 h-10"><Plus /> Adicionar</Button>
          </form>
        )}
        <ul className="mt-3 divide-y divide-line">
          {upcoming.length === 0 && <li className="py-3 text-sm text-steel">Nada pela frente — aproveite pra adiantar os estudos.</li>}
          {upcoming.map((ex) => { const d = daysUntil(ex.date, today); const s = subOf(ex.subjectId); return (
            <li key={ex.id} className={`flex flex-wrap items-center gap-2 py-2 text-sm ${d < 0 ? "text-accent" : ""}`}>
              <span className="size-3 shrink-0 rounded-full" style={{ background: s?.color ?? "currentColor" }} aria-hidden />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]"><span className="font-medium">{ex.title}</span> <span className="text-xs text-steel">· {s?.name ?? ex.subjectName} · {ex.date.split("-").reverse().join("/")}</span></span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${d <= 1 ? "bg-accent/20 text-accent" : "bg-mist"}`}>{d < 0 ? `Atrasado há ${-d} ${d === -1 ? "dia" : "dias"}` : `faltam ${d} dias`}</span>
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
              <Button variant="ghost" size="icon" className="size-7 shrink-0" disabled={removing !== null} aria-label="Remover sessão" onClick={async () => { setRemoving(e.id); try { if (user) { const result = await revoke({ data: { kind: "study", ref: e.id, date: e.date, on: false } }); window.dispatchEvent(new CustomEvent(XP_EVENT, { detail: result })); } setTrackers((t) => ({ ...t, estudos: t.estudos.filter((x) => x.id !== e.id) })); } catch { toast.error("Não foi possível excluir a sessão. Tente novamente."); } finally { setRemoving(null); } }}><Trash2 /></Button>
            </li>
          ); })}
        </ul>
      </section>
    </main>
  );
}

function StudyGoal({ subject, save }: { subject: Subject; save: (m: number) => void }) {
  const [value, setValue] = useState(String(dailyStudyGoal(subject) || ""));
  const [unit, setUnit] = useState("min");
  const [message, setMessage] = useState("");
  return <form className="mt-2 flex flex-wrap items-center gap-2 text-xs text-steel" noValidate onSubmit={e => { e.preventDefault(); const m = Number(value) * (unit === "h" ? 60 : 1); if (!validStudyGoal(m)) { setMessage("Informe uma meta entre 5 e 480 min por dia"); return; } save(m); setMessage(`Meta de ${subject.name}: ${m} min por dia`); }}>
    <label htmlFor={`goal-${subject.id}`}>Meta diária</label><input id={`goal-${subject.id}`} aria-label={`Meta diária de ${subject.name}`} type="number" step="any" value={value} onChange={e => setValue(e.target.value)} className="h-8 w-16 rounded bg-background px-2 ring-1 ring-line" /><select aria-label={`Unidade da meta de ${subject.name}`} value={unit} onChange={e => { const next = e.target.value; if (value) setValue(String(Number(value) * (next === "h" ? 1 / 60 : 60))); setUnit(next); }} className="h-8 rounded bg-background px-1 ring-1 ring-line"><option value="min">min</option><option value="h">h</option></select><Button size="icon" className="size-8" aria-label={`Salvar meta de ${subject.name}`}><Check /></Button>{message && <p role="status" className="w-full text-xs text-foreground">{message}</p>}
  </form>;
}
