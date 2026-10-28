import { spreadsheetValid, type SpreadsheetWorkout } from "@/lib/plan-spreadsheet";
import { RestTimer } from "@/components/RestTimer";
import { ModuleHeader } from "@/components/ModuleHeader";
import { ProgressRecorder } from "@/components/ProgressRecorder";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TrainingExplore, useScheduleWorkout } from "@/components/TrainingExplore";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, getISOWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus, ChevronLeft, ChevronRight, FileUp, Plus, Trash2, TrendingUp, X } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tick } from "@/components/TodayPanel";
import { useTaskBio } from "@/lib/trilha-store";
import { useAuth } from "@/lib/auth-context";
import { getWeekDates, toDateKey } from "@/lib/calendar-utils";
import { exerciseHistory, exercisePerformance, kg, progression, toWorkout, weeklyMax, type ImportedWorkout } from "@/lib/training";
import { interpretWorkoutPlan } from "@/lib/plan-import.functions";
import type { Block, Exercise, Workout } from "@/lib/trilha-data";
import { getWorkoutExamples } from "@/lib/trilha-data";
import { WorkoutSeries, SessionProgress } from "@/components/WorkoutSeries";
import { Progress } from "@/components/ui/progress";
import { exerciseSeries, weeklyTrainingProgress } from "@/lib/training-session";
import { WorkoutPhotoImport } from "@/components/WorkoutPhotoImport";

export const Route = createFileRoute("/treino")({
  head: () => ({ meta: [
    { title: "Treino — TaskBio" },
    { name: "description", content: "Plano de treino da semana, registro de exercícios com carga e repetições e progressão semana a semana." },
    { property: "og:title", content: "Treino — TaskBio" },
    { property: "og:description", content: "Registre seus treinos em dois toques e acompanhe a evolução da carga." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  validateSearch: (search: Record<string, unknown>): { aba?: "explorar" } => (search["aba"] === "explorar" ? { aba: "explorar" } : {}),
  component: Treino,
});

const DAY_ORDER = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;

function Treino() {
  const { aba } = Route.useSearch();
  const navigate = useNavigate({ from: "/treino" });
  const tab = aba === "explorar" ? "explorar" : "semana";
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <ModuleHeader title="Treino" /><section className="pb-4">
        <div role="tablist" aria-label="Seções do treino" className="mt-3 inline-flex rounded-lg bg-mist p-1 text-sm">
          {([["semana", "Minha semana"], ["explorar", "Explorar e criar"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => navigate({ search: id === "explorar" ? { aba: "explorar" } : {}, replace: true })} className={`rounded-md px-3 py-1.5 font-medium ${tab === id ? "bg-ink text-white" : "text-steel"}`}>{label}</button>)}
        </div>
      </section>
      {tab === "semana" ? <WeekTab onExplore={() => navigate({ search: { aba: "explorar" } })} /> : <TrainingExplore />}
      <ProgressRecorder id="registros-treino" title="Carga e corrida" kinds={["strength", "run"]} />
    </main>
  );
}

function WeekTab({ onExplore }: { onExplore: () => void }) {
  const store = useTaskBio();
  const { plan, workouts, addWorkout, toggleBlock, removeBlock } = store;
  const models = workouts.filter((w) => !w.templateId);
  const examples = getWorkoutExamples(store.preferredModality ?? "Musculação", store.goal);
  const schedule = useScheduleWorkout();
  const [ref, setRef] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  useEffect(() => { const d = new Date(); setRef(d); setSelected(toDateKey(d)); }, []);
  if (!ref || !selected) return <div className="h-60 animate-pulse rounded-lg bg-mist" />;

  const week = getWeekDates(ref);
  const weeklyProgress = weeklyTrainingProgress(plan, week.map(toDateKey));
  const blockOf = (k: string) => (plan[k] ?? []).find((b) => b.kind === "treino");
  const selBlock = blockOf(selected);
  const selWorkout = selBlock?.workoutId ? workouts.find((w) => w.id === selBlock.workoutId) : undefined;

  const assign = (dateKey: string, workout: Workout) => schedule(dateKey, workout);
  const createAndAssign = (dateKey: string, name: string) => {
    const w: Workout = { id: `w-${Date.now()}`, name, focus: "", modality: "Academia", exercises: [] };
    addWorkout(w); assign(dateKey, w); toast.success("Treino adicionado ao dia");
  };

  return (
    <div>
      <section className="flex flex-wrap items-end justify-between gap-3 pb-5">
        <div><h2 className="font-display text-xl font-semibold">Plano da semana</h2><div className="mt-3 space-y-2" aria-label="Progresso semanal do treino"><p className="text-xs font-medium">{weeklyProgress.done} de {weeklyProgress.total} treinos · Semana {getISOWeek(ref)}</p><Progress value={weeklyProgress.total ? 100 * weeklyProgress.done / weeklyProgress.total : 0} className="[&>div]:bg-good" />{weeklyProgress.complete && <span className="inline-block text-xs font-medium text-good">Semana completa 🏆</span>}</div><p className="mt-2 text-sm text-steel">Toque no dia pra ver o treino e marque quando concluir 💪</p></div>
        <Button variant="outline" onClick={() => setImporting(true)}><FileUp /> Importar plano</Button>
      </section>

      <div className="mb-3 flex items-center justify-between"><Button variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => setRef(addDays(ref, -7))}><ChevronLeft /></Button><span className="text-sm font-medium">{format(week[0]!, "d MMM", { locale: ptBR })} – {format(week[6]!, "d MMM", { locale: ptBR })}</span><Button variant="ghost" size="icon" aria-label="Próxima semana" onClick={() => setRef(addDays(ref, 7))}><ChevronRight /></Button></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {week.map((d) => { const k = toDateKey(d); const b = blockOf(k); const active = k === selected; return (
          <div key={k} className={`rounded-lg bg-card p-3 ring-1 transition ${active ? "ring-brand" : "ring-line"}`}>
            <button className="w-full text-left" onClick={() => setSelected(k)}><p className="text-[11px] font-medium uppercase leading-4 text-steel">{format(d, "EEE d", { locale: ptBR })}</p><p className={`mt-1.5 min-h-10 break-words text-sm font-medium leading-snug [overflow-wrap:anywhere] ${b?.done ? "text-steel line-through" : ""}`}>{b?.title ?? <span className="text-steel">Sem treino</span>}</p></button>
            {b && <button className="mt-2 flex items-center gap-1.5 text-xs text-steel" onClick={() => { toggleBlock(k, b.id); if (!b.done) toast.success("Treino concluído!"); }} aria-label={`${b.done ? "Desmarcar" : "Concluir"} ${b.title}`}><Tick on={b.done} />{b.done ? "Concluído" : "Concluir"}</button>}
          </div>); })}
      </div>

      <section className="mt-5 rounded-lg bg-card p-5 ring-1 ring-line">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-xl font-semibold">{selBlock ? format(new Date(`${selected}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR }) : "Nada agendado neste dia"}</h2>{selBlock && <Button variant="ghost" size="sm" onClick={() => removeBlock(selected, selBlock.id)}><X /> Tirar do dia</Button>}</div>
        {!selBlock ? <>
          <h3 className="mt-4 text-sm font-semibold">Exemplos disponíveis para agendar</h3>
          <p className="mt-2 border-l-2 border-brand bg-mist px-3 py-2 text-sm text-steel">Toque num treino pra colocá-lo na sua semana.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{examples.map((w) => <article key={w.id} className="rounded-lg border border-line p-3"><p className="text-[11px] uppercase text-steel">Exemplo</p><h4 className="mt-1 text-sm font-semibold">{w.name}</h4><p className="mt-1 text-xs text-steel">{w.focus} · {w.exercises.length} exercícios</p><Button variant="outline" size="sm" className="mt-3" onClick={() => { assign(selected, w); toast.success("Treino adicionado ao dia"); }}><CalendarPlus /> Agendar</Button></article>)}</div>
          <p className="mt-3 text-xs leading-5 text-steel">Registros pessoais. Não substituem orientação de profissional.</p>
          <h3 className="mt-5 text-sm font-semibold">Meus treinos</h3>
          <AssignForm workouts={models} onPick={(w) => { assign(selected, w); toast.success("Treino adicionado ao dia"); }} onCreate={(n) => createAndAssign(selected, n)} />
        </>
          : !selWorkout ? <div className="mt-3"><p className="text-sm text-steel">Escolha um treino abaixo pra registrar seus exercícios.</p><AssignForm workouts={models} onPick={(w) => assign(selected, w)} onCreate={(n) => createAndAssign(selected, n)} /></div>
          : <WorkoutDetail workout={selWorkout} dateKey={selected} />}
      </section>
      <p className="mt-4 text-xs leading-5 text-steel">Registros pessoais. Não substituem orientação de profissional. Quer ideias? <button type="button" onClick={onExplore} className="underline">Explorar e criar</button>.</p>
      <ImportDialog open={importing} onOpenChange={setImporting} week={week} onAssign={assign} />
    </div>
  );
}

function AssignForm({ workouts, onPick, onCreate }: { workouts: Workout[]; onPick: (w: Workout) => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return <div className="mt-3 space-y-3">
    {workouts.length > 0 && <div className="flex flex-wrap gap-2">{workouts.map((w) => <Button key={w.id} variant="outline" size="sm" onClick={() => onPick(w)}>{w.name}</Button>)}</div>}
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onCreate(name.trim()); setName(""); } }}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Novo treino (ex.: Peito e tríceps, Corrida, Full body)" className="h-10 min-w-0 flex-1 rounded-md bg-background px-3 text-sm ring-1 ring-line" /><Button><Plus /> Criar</Button></form>
  </div>;
}

function WorkoutDetail({ workout, dateKey }: { workout: Workout; dateKey: string }) {
  const { updateWorkout } = useTaskBio();
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sets: "3", reps: "10", load: "" });
  return <div className="mt-3 pb-32">
    <RestTimer />
    <SessionProgress workout={workout} date={dateKey} />
    {workout.exercises.length === 0 && <p className="py-4 text-sm text-steel">Adicione os exercícios deste treino.</p>}
    <ul className="divide-y divide-line">{workout.exercises.map((ex) => <ExerciseRow key={ex.id} ex={ex} workout={workout} dateKey={dateKey} open={open === ex.id} onToggle={() => setOpen(open === ex.id ? null : ex.id)} />)}</ul>
    <form className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_64px_64px_80px_auto] gap-2" onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) return; const ex: Exercise = { id: `e-${Date.now()}`, name: form.name.trim(), sets: Math.max(1, Number(form.sets) || 3), reps: Math.max(1, Number(form.reps) || 10), restSec: 60, muscles: "", howTo: "", doneSets: 0, ...(Number(form.load.replace(",", ".")) ? { loadKg: Number(form.load.replace(",", ".")) } : {}) }; updateWorkout({ ...workout, exercises: [...workout.exercises, ex] }); setForm({ ...form, name: "", load: "" }); }}>
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Exercício" className="col-span-4 h-10 min-w-0 sm:col-span-1 rounded-md bg-background px-3 text-sm ring-1 ring-line" />
      <input value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} aria-label="Séries" inputMode="numeric" className="h-10 rounded-md bg-background px-2 text-sm ring-1 ring-line" />
      <input value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} aria-label="Repetições" inputMode="numeric" className="h-10 rounded-md bg-background px-2 text-sm ring-1 ring-line" />
      <input value={form.load} onChange={(e) => setForm({ ...form, load: e.target.value })} placeholder="kg" aria-label="Carga em kg" inputMode="decimal" className="h-10 rounded-md bg-background px-2 text-sm ring-1 ring-line" />
      <Button size="icon" aria-label="Adicionar exercício"><Plus /></Button>
    </form>
  </div>;
}

function ExerciseRow({ ex, workout, dateKey, open, onToggle }: { ex: Exercise; workout: Workout; dateKey: string; open: boolean; onToggle: () => void }) {
  const { exerciseLog, workoutHistory, workouts, plan, addExerciseLog, updateWorkout } = useTaskBio();
  const history = useMemo(() => exerciseHistory(ex.name, exerciseLog ?? [], workoutHistory, workouts, plan, dateKey), [ex.name, exerciseLog, workoutHistory, workouts, plan, dateKey]);
  const last = history[0];
  const delta = progression(history);
  const [load, setLoad] = useState("");
  const [reps, setReps] = useState("");
  useEffect(() => { if (open) { setLoad(String(last?.loadKg ?? ex.loadKg ?? "")); setReps(String(last?.reps ?? ex.reps)); } }, [open]);
  const chart = useMemo(() => weeklyMax(history, new Date()), [history]);
  const seriesDone = exerciseSeries(ex, dateKey).filter(s => s.done).length;

  return <li className="py-3">
    <button className="flex w-full items-center gap-3 text-left" onClick={onToggle} aria-expanded={open}>
      <Tick on={ex.sets > 0 && seriesDone === ex.sets} />
      <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{ex.name}</span><span className="block text-xs text-steel">{seriesDone} de {ex.sets} séries · {ex.sets}x{ex.reps}{ex.loadKg ? ` · ${kg(ex.loadKg)}` : ""}{last ? ` · última vez: ${exercisePerformance(last)}` : ""}</span></span>
      {delta > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-medium"><TrendingUp className="size-3" />progressão +{kg(delta)}</span>}
    </button>
    {open && <div className="mt-3 rounded-md bg-background p-3 ring-1 ring-line">
      <WorkoutSeries workout={workout} ex={ex} date={dateKey} />
      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const l = Number(load.replace(",", ".")); const r = Number(reps); if (!(l >= 0) || !(r > 0)) return; addExerciseLog({ date: dateKey, exercise: ex.name, loadKg: l, reps: r, sets: ex.sets, workoutId: workout.id }); updateWorkout({ ...workout, exercises: workout.exercises.map((x) => x.id === ex.id ? { ...x, loadKg: l } : x) }); toast.success(last && l > last.loadKg ? `Progressão +${kg(l - last.loadKg)}!` : "Registro salvo"); onToggle(); }}>
        <label className="text-xs text-steel">Carga (kg)<input autoFocus inputMode="decimal" value={load} onChange={(e) => setLoad(e.target.value)} className="mt-1 block h-10 w-24 rounded-md bg-card px-2 text-sm text-ink ring-1 ring-line" /></label>
        <label className="text-xs text-steel">Repetições<input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} className="mt-1 block h-10 w-24 rounded-md bg-card px-2 text-sm text-ink ring-1 ring-line" /></label>
        <Button>Salvar registro</Button>
        <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${ex.name} do treino`} onClick={() => { if (window.confirm(`Remover ${ex.name} deste treino? O histórico é mantido.`)) updateWorkout({ ...workout, exercises: workout.exercises.filter((x) => x.id !== ex.id) }); }}><Trash2 /></Button>
      </form>
      <p className="mt-3 text-xs font-medium text-steel">Carga máxima por semana · últimas 8 semanas</p>
      <div className="h-32"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><XAxis dataKey="week" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={30} domain={["auto", "auto"]} /><Tooltip formatter={(v) => [`${v} kg`, "Carga"]} /><Line type="monotone" dataKey="kg" stroke="var(--color-brand, currentColor)" strokeWidth={2} connectNulls /></LineChart></ResponsiveContainer></div>
      {history.length > 0 && <ul className="mt-2 max-h-28 overflow-y-auto text-xs text-steel">{history.slice(0, 10).map((h, i) => <li key={i}>{h.date.split("-").reverse().join("/")} — {exercisePerformance(h)}</li>)}</ul>}
    </div>}
  </li>;
}

function ImportDialog({ open, onOpenChange, week, onAssign }: { open: boolean; onOpenChange: (v: boolean) => void; week: Date[]; onAssign: (dateKey: string, w: Workout) => void }) {
  const { user } = useAuth();
  const { addWorkout, exerciseLog, workoutHistory, workouts } = useTaskBio();
  const interpret = useServerFn(interpretWorkoutPlan);
  const [step, setStep] = useState<"source" | "photo" | "upload" | "reading" | "review">("source");
  const [spreadsheet, setSpreadsheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SpreadsheetWorkout[]>([]);
  const reset = () => { setStep("source"); setError(null); setItems([]); setSpreadsheet(false); };

  async function handleFile(file: File) {
    setError(null);
    const { MAX_IMPORT_BYTES, UNREADABLE_MESSAGE, extractPlanText, isUnreadable } = await import("@/lib/plan-import-browser");
    if (file.size > MAX_IMPORT_BYTES) { setError("O arquivo passa de 10 MB. Envie um arquivo menor."); return; }
    setStep("reading");
    try {
      if (spreadsheet) { const { readSpreadsheet } = await import("@/lib/plan-spreadsheet"); setItems(await readSpreadsheet(file)); setStep("review"); return; }
      const text = await extractPlanText(file);
      if (isUnreadable(text)) { setError(UNREADABLE_MESSAGE); setStep("upload"); return; }
      const res = await interpret({ data: { text: text.slice(0, 40000) } });
      if (res.error || !res.data) { setError(res.error ?? "Não foi possível interpretar o arquivo."); setStep("upload"); return; }
      if (!res.data.readable) { setError(UNREADABLE_MESSAGE); setStep("upload"); return; }
      setItems(res.data.workouts); setStep("review");
    } catch (e) {
      setError(e instanceof Error && (spreadsheet || e.message.startsWith("Formato")) ? e.message : UNREADABLE_MESSAGE); setStep("upload");
    }
  }

  const upd = (i: number, w: SpreadsheetWorkout) => setItems(items.map((x, j) => (j === i ? w : x)));
  const confirm = () => {
    if (spreadsheet && !spreadsheetValid(items)) return;
    const known = [...(exerciseLog ?? []).map((e) => e.exercise), ...workoutHistory.flatMap((h) => h.exercises.map((e) => e.name)), ...workouts.flatMap((w) => w.exercises.map((e) => e.name))];
    const stamp = Date.now();
    items.forEach((it, i) => {
      const validated: ImportedWorkout = { ...it, exercises: it.exercises.map(e => ({ ...e, sets: Number(e.sets), reps: Number(e.reps) })) };
      const w = toWorkout(validated, known, `w-imp-${stamp}-${i}`);
      addWorkout(w);
      if (it.day) { const date = week[DAY_ORDER.indexOf(it.day)]; if (date) onAssign(toDateKey(date), w); }
    });
    toast.success(`${items.length} treino(s) importado(s)`); onOpenChange(false); reset();
  };

  return <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl [&>*]:min-w-0 [&_input]:min-w-0">
      <DialogHeader><DialogTitle>Importar plano de treino</DialogTitle><DialogDescription>Etapas: 1. enviar arquivo · 2. leitura automática · 3. revisar antes de salvar. PDF, Word (.docx), Excel (.xlsx) ou CSV, até 10 MB.</DialogDescription></DialogHeader>
      {!user ? <div className="py-4 text-sm">Entre na sua conta para importar planos. <Button asChild size="sm" className="ml-2"><Link to="/auth">Entrar</Link></Button></div>
        : step === "source" ? <div className="grid gap-3 sm:grid-cols-3">
          <Button variant="outline" onClick={() => setStep("upload")}><FileUp />PDF</Button>
          <Button variant="outline" onClick={() => setStep("photo")}><FileUp />Foto ou print</Button>
          <Button variant="outline" onClick={() => { setSpreadsheet(true); setStep("upload"); }}><FileUp />Excel/CSV</Button>
        </div>
        : step === "photo" ? <WorkoutPhotoImport onCancel={reset} onContinue={result => { setItems(result); setStep("review"); }} />
        : step === "upload" ? <div className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-line p-8 text-center text-sm"><FileUp className="size-6 text-brand" />Escolher arquivo<input type="file" className="sr-only" accept={spreadsheet ? ".xlsx,.xls,.csv" : ".pdf,.docx,.xlsx,.xls,.csv,.txt"} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }} /></label>
          {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </div>
        : step === "reading" ? <div className="py-10 text-center text-sm text-steel"><div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-line border-t-brand" />Lendo e interpretando o plano…</div>
        : <div className="space-y-4">
          <p className="text-sm text-steel">Confira e ajuste antes de salvar.</p>
          {spreadsheet && !spreadsheetValid(items) && items.length > 0 && <p role="alert" className="text-xs text-destructive">Revise os campos de séries e repetições antes de salvar.</p>}
          {items.length === 0 && <p className="text-sm">Nenhum treino restante.</p>}
          {items.map((w, i) => <div key={i} className="rounded-lg p-3 ring-1 ring-line">
            <div className="flex gap-2"><select value={w.day ?? ""} onChange={(e) => upd(i, { ...w, day: (e.target.value || null) as ImportedWorkout["day"] })} aria-label="Dia da semana" className="h-9 rounded-md bg-background px-2 text-sm ring-1 ring-line"><option value="">Sem dia</option>{DAY_ORDER.map((d) => <option key={d} value={d}>{d}</option>)}</select><input value={w.name} onChange={(e) => upd(i, { ...w, name: e.target.value })} aria-label="Nome do treino" className="h-9 min-w-0 flex-1 rounded-md bg-background px-2 text-sm font-medium ring-1 ring-line" /><Button variant="ghost" size="icon" aria-label="Descartar treino" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 /></Button></div>
            <ul className="mt-2 space-y-1.5">{w.exercises.map((e, k) => { const set = (p: Partial<typeof e>) => upd(i, { ...w, exercises: w.exercises.map((x, m) => (m === k ? { ...x, ...p } : x)) }); return <li key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5 sm:grid-cols-[minmax(0,1fr)_52px_52px_64px_auto]">
              <input value={e.name} onChange={(ev) => set({ name: ev.target.value })} aria-label="Exercício" className="col-span-4 h-8 min-w-0 rounded-md bg-background px-2 text-xs ring-1 ring-line sm:col-span-1" />
              <input value={e.sets ?? ""} placeholder={spreadsheet && !e.sets ? "Revisar" : undefined} aria-invalid={spreadsheet && !(e.sets && Number.isInteger(e.sets) && e.sets > 0)} onChange={(ev) => set({ sets: spreadsheet && !ev.target.value ? null : Number(ev.target.value) || 0 })} aria-label="Séries" inputMode="numeric" className="h-8 rounded-md bg-background px-2 text-xs ring-1 ring-line aria-invalid:ring-destructive" />
              <input value={e.reps ?? ""} placeholder={spreadsheet && !e.reps ? "Revisar" : undefined} aria-invalid={spreadsheet && !(e.reps && Number.isInteger(e.reps) && e.reps > 0)} onChange={(ev) => set({ reps: spreadsheet && !ev.target.value ? null : Number(ev.target.value) || 0 })} aria-label="Repetições" inputMode="numeric" className="h-8 rounded-md bg-background px-2 text-xs ring-1 ring-line aria-invalid:ring-destructive" />
              <input value={e.loadKg ?? ""} placeholder="kg" onChange={(ev) => set({ loadKg: Number(ev.target.value.replace(",", ".")) || null })} aria-label="Carga" inputMode="decimal" className="h-8 rounded-md bg-background px-2 text-xs ring-1 ring-line" />
              <Button variant="ghost" size="icon" className="size-8" aria-label="Descartar exercício" onClick={() => upd(i, { ...w, exercises: w.exercises.filter((_, m) => m !== k) })}><X /></Button>
            </li>; })}</ul>
          </div>)}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={reset}>Enviar outro arquivo</Button><Button disabled={items.length === 0 || (spreadsheet && !spreadsheetValid(items))} onClick={confirm}>Salvar no plano</Button></div>
        </div>}
    </DialogContent>
  </Dialog>;
}
