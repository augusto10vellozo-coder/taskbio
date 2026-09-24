import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from "react";
import {
  EMPTY_PLAN,
  MEALS,
  WORKOUTS,
  type Block,
  type DayKey,
  type Meal,
  type Plan,
  type Workout,
  type WorkoutHistoryEntry,
} from "./trilha-data";

export type TrilhaState = {
  plan: Plan;
  workouts: Workout[];
  meals: Meal[];
  goal: string | null;
  workoutHistory: WorkoutHistoryEntry[];
};

type Store = TrilhaState & {
  ready: boolean;
  hydrate: (state: Partial<TrilhaState>) => void;
  toggleBlock: (day: DayKey, blockId: string) => void;
  removeBlock: (day: DayKey, blockId: string) => void;
  addBlock: (day: DayKey, block: Omit<Block, "id" | "done">) => void;
  updateBlock: (day: DayKey, blockId: string, block: Omit<Block, "id" | "done">) => void;
  setDoneSets: (workoutId: string, exerciseId: string, doneSets: number) => void;
  setExerciseLoad: (workoutId: string, exerciseId: string, loadKg: number) => void;
  completeWorkout: (entry: WorkoutHistoryEntry) => void;
  addWorkout: (workout: Workout) => void;
  setGoal: (goal: string) => void;
  getWorkout: (id?: string) => Workout | undefined;
  getMeal: (id?: string) => Meal | undefined;
};

const initialState: TrilhaState = {
  plan: EMPTY_PLAN,
  workouts: WORKOUTS,
  meals: MEALS,
  goal: null,
  workoutHistory: [],
};

const STORAGE_KEY = "trilha.state.v2";

// Route chunks can evaluate this module independently in production. Keeping the
// Context on globalThis guarantees that providers and consumers share one identity.
const contextKey = "__trilha_store_context__";
const globalContexts = globalThis as typeof globalThis & {
  [contextKey]?: Context<Store | null>;
};
const StoreContext = globalContexts[contextKey] ?? createContext<Store | null>(null);
globalContexts[contextKey] = StoreContext;

const sortBlocks = (blocks: Block[]) =>
  [...blocks].sort((a, b) => a.time.localeCompare(b.time));

export function TrilhaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TrilhaState>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as TrilhaState) });
    } catch {
      /* ignora estado inválido */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* armazenamento indisponível */
    }
  }, [ready, state]);

  const value = useMemo<Store>(
    () => ({
      ...state,
      ready,
      hydrate: (nextState) => setState((current) => ({ ...current, ...nextState })),
      toggleBlock: (day, blockId) =>
        setState((s) => ({
          ...s,
          plan: {
            ...s.plan,
            [day]: s.plan[day].map((b) => (b.id === blockId ? { ...b, done: !b.done } : b)),
          },
        })),
      removeBlock: (day, blockId) =>
        setState((s) => ({
          ...s,
          plan: { ...s.plan, [day]: s.plan[day].filter((b) => b.id !== blockId) },
        })),
      addBlock: (day, block) =>
        setState((s) => ({
          ...s,
          plan: (block.recurrence === "daily" || block.recurrence === "weekdays"
            ? (Object.keys(s.plan) as DayKey[]).reduce((next, targetDay) => {
                if (block.recurrence === "weekdays" && (targetDay === "sab" || targetDay === "dom")) return next;
                next[targetDay] = sortBlocks([...next[targetDay], { ...block, id: `b-${Date.now()}-${targetDay}`, done: false }]);
                return next;
              }, { ...s.plan })
            : { ...s.plan, [day]: sortBlocks([...s.plan[day], { ...block, id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, done: false }]) }),
        })),
      updateBlock: (day, blockId, block) => setState((s) => ({
        ...s,
        plan: { ...s.plan, [day]: sortBlocks(s.plan[day].map((item) => item.id === blockId ? { ...item, ...block } : item)) },
      })),
      setDoneSets: (workoutId, exerciseId, doneSets) =>
        setState((s) => ({
          ...s,
          workouts: s.workouts.map((w) =>
            w.id !== workoutId
              ? w
              : {
                  ...w,
                  exercises: w.exercises.map((e) => (e.id === exerciseId ? { ...e, doneSets } : e)),
                },
          ),
        })),
      setExerciseLoad: (workoutId, exerciseId, loadKg) =>
        setState((s) => ({
          ...s,
          workouts: s.workouts.map((workout) =>
            workout.id !== workoutId
              ? workout
              : {
                  ...workout,
                  exercises: workout.exercises.map((exercise) =>
                    exercise.id === exerciseId ? { ...exercise, loadKg } : exercise,
                  ),
                },
          ),
        })),
      completeWorkout: (entry) =>
        setState((s) => ({
          ...s,
          workoutHistory: [entry, ...s.workoutHistory].slice(0, 50),
          workouts: s.workouts.map((workout) =>
            workout.id === entry.workoutId
              ? { ...workout, exercises: workout.exercises.map((exercise) => ({ ...exercise, doneSets: 0 })) }
              : workout,
          ),
        })),
      addWorkout: (workout) => setState((s) => ({ ...s, workouts: [...s.workouts, workout] })),
      setGoal: (goal) => setState((s) => ({ ...s, goal })),
      getWorkout: (id) => state.workouts.find((w) => w.id === id),
      getMeal: (id) => state.meals.find((m) => m.id === id),
    }),
    [ready, state],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTrilha() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useTrilha precisa estar dentro de TrilhaProvider");
  return ctx;
}
