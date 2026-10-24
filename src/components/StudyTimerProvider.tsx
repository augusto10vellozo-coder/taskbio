import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { recordXp } from "@/lib/social.functions";
import { brasiliaDay } from "@/lib/xp";
import { XP_EVENT } from "@/lib/xp-client";
import { elapsedStudyMinutes, pauseStudyRun, type StudyRun } from "@/lib/study";
import type { SessionEntry } from "@/lib/engagement";

type TimerState = { run: StudyRun | null; now: number; start: (subjectId: string, title: string, learned: string, focus: number, pause: number) => void; pause: () => void; stop: () => void; record: (session: SessionEntry) => Promise<void> };
const Context = createContext<TimerState | null>(null);
export function StudyTimerProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { setTrackers } = useTaskBio();
  const award = useServerFn(recordXp);
  const [run, setRun] = useState<StudyRun | null>(null);
  const [now, setNow] = useState(0);
  const current = useRef(run); current.current = run;
  const key = `taskbio:study-timer:${user?.id ?? "local"}`;
  const ready = useRef("");
  const update = (r: StudyRun | null) => { current.current = r; setRun(r); try { if (r) localStorage.setItem(key, JSON.stringify(r)); else localStorage.removeItem(key); } catch { /* storage unavailable */ } };
  useEffect(() => {
    if (loading) return;
    ready.current = key; setRun(null); current.current = null;
    try { const raw = localStorage.getItem(key); if (raw) { const r = JSON.parse(raw) as StudyRun; if (r.id && r.subjectId && Number.isFinite(r.endsAt) && r.focus > 0 && r.pause > 0 && ["foco", "pausa"].includes(r.phase)) { setRun(r); current.current = r; } } } catch { /* invalid local state */ }
    setNow(Date.now());
  }, [key, loading]);
  const record = async (session: SessionEntry) => {
    if (session.minutes < 1) return;
    setTrackers(t => t.estudos.some(s => s.id === session.id) ? t : ({ ...t, estudos: [session, ...t.estudos] }));
    if (!user) { toast.success(`Sessão registrada: ${session.minutes} min de ${session.title}`); return; }
    try {
      const result = await award({ data: { kind: "study", ref: session.id, date: session.date, on: true } });
      window.dispatchEvent(new CustomEvent(XP_EVENT, { detail: result }));
      toast.success(`Sessão registrada: ${session.minutes} min de ${session.title}${result.points ? ` · +${result.points} XP` : ""}`);
      if (!result.points && session.date === brasiliaDay(new Date())) toast("XP do dia de estudo já registrado");
    } catch { toast.error("Sessão salva; não foi possível atualizar o XP agora."); }
  };
  useEffect(() => {
    const check = () => {
      const n = Date.now(); setNow(n);
      const r = current.current;
      if (loading || ready.current !== key || !r || r.paused !== undefined || n < r.endsAt) return;
      if (r.phase === "foco") {
        const next: StudyRun = { ...r, phase: "pausa", startedAt: r.endsAt, endsAt: r.endsAt + r.pause * 60000 };
        update(n >= next.endsAt ? null : next);
        void record({ id: r.id, date: brasiliaDay(new Date(r.endsAt)), minutes: r.focus, subjectId: r.subjectId, title: r.title, ...(r.learned ? { learned: r.learned } : {}) });
      } else { update(null); toast("Pausa encerrada. Pronto para mais um foco?"); }
    };
    check(); const timer = window.setInterval(check, 500);
    document.addEventListener("visibilitychange", check);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [key, loading, user, award, setTrackers]);
  return <Context.Provider value={{ run, now, record,
    start: (subjectId, title, learned, focus, pause) => { if (current.current) return; const n = Date.now(); update({ id: `study-${crypto.randomUUID()}`, phase: "foco", subjectId, title, learned, focus, pause, startedAt: n, endsAt: n + focus * 60000 }); },
    pause: () => { const r = current.current; if (r) update(pauseStudyRun(r, Date.now())); },
    stop: () => { const r = current.current; if (!r) return; update(null); const minutes = elapsedStudyMinutes(r, Date.now()); if (r.phase === "foco" && minutes >= 1) void record({ id: r.id, date: brasiliaDay(new Date()), minutes, subjectId: r.subjectId, title: r.title, ...(r.learned ? { learned: r.learned } : {}) }); else if (r.phase === "foco") toast("Sessão com menos de 1 minuto não foi registrada"); },
  }}>{children}</Context.Provider>;
}
export function useStudyTimer() { const value = useContext(Context); if (!value) throw new Error("Timer de estudos indisponível"); return value; }