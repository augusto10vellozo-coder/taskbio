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
  type Block,
  type Meal,
  type Plan,
  type ShoppingItem,
  type Workout,
  type WorkoutHistoryEntry,
} from "./trilha-data";
import { addDays, isAfter, isWeekend, parseISO } from "date-fns";
import { normalizePlan, toDateKey } from "./calendar-utils";

export type TrilhaState = {
  plan: Plan;
  workouts: Workout[];
  meals: Meal[];
  goal: string | null;
  preferredModality: string | null;
  workoutHistory: WorkoutHistoryEntry[];
  shoppingItems: ShoppingItem[];
};

type Store = TrilhaState & {
  ready: boolean;
  hydrate: (state: Partial<TrilhaState>) => void;
  toggleBlock: (date: string, blockId: string) => void;
  removeBlock: (date: string, blockId: string) => void;
  addBlock: (date: string, block: Omit<Block, "id" | "done">) => void;
  updateBlock: (date: string, blockId: string, block: Omit<Block, "id" | "done">) => void;
  setDoneSets: (workoutId: string, exerciseId: string, doneSets: number) => void;
  setExerciseLoad: (workoutId: string, exerciseId: string, loadKg: number) => void;
  completeWorkout: (entry: WorkoutHistoryEntry) => void;
  addWorkout: (workout: Workout) => void;
  removeWorkout: (workoutId: string) => void;
  setGoal: (goal: string) => void;
  setPreferredModality: (modality: string) => void;
  setShoppingItems: (items: ShoppingItem[]) => void;
  toggleShoppingItem: (id: string) => void;
  addShoppingItem: (item: Omit<ShoppingItem, "id" | "checked" | "manual">) => void;
  removeShoppingItem: (id: string) => void;
  getWorkout: (id?: string) => Workout | undefined;
  getMeal: (id?: string) => Meal | undefined;
};

const initialState: TrilhaState = {
  plan: EMPTY_PLAN,
  workouts: [],
  meals: MEALS,
  goal: null,
  preferredModality: null,
  workoutHistory: [],
  shoppingItems: [],
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
      if (raw) {
        const stored = JSON.parse(raw) as Partial<TrilhaState>;
        setState({ ...initialState, ...stored, plan: normalizePlan(stored.plan) });
      }
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
      hydrate: (nextState) => setState((current) => ({
        ...current,
        ...nextState,
        ...(nextState.plan ? { plan: normalizePlan(nextState.plan) } : {}),
      })),
      toggleBlock: (day, blockId) =>
        setState((s) => ({
          ...s,
          plan: {
            ...s.plan,
            [day]: (s.plan[day] ?? []).map((b) => (b.id === blockId ? { ...b, done: !b.done } : b)),
          },
        })),
      removeBlock: (day, blockId) =>
        setState((s) => ({
          ...s,
          plan: { ...s.plan, [day]: (s.plan[day] ?? []).filter((b) => b.id !== blockId) },
        })),
      addBlock: (day, block) =>
        setState((s) => ({
          ...s,
          plan: (() => {
            const next = { ...s.plan };
            const start = parseISO(day);
            const defaultEnd = addDays(start, 28);
            const end = block.recurrenceUntil ? parseISO(block.recurrenceUntil) : defaultEnd;
            const repeating = block.recurrence === "daily" || block.recurrence === "weekdays";
            let cursor = start;
            do {
              if (block.recurrence !== "weekdays" || !isWeekend(cursor)) {
                const targetDate = toDateKey(cursor);
                next[targetDate] = sortBlocks([
                  ...(next[targetDate] ?? []),
                  { ...block, id: `b-${Date.now()}-${targetDate}`, done: false },
                ]);
              }
              cursor = addDays(cursor, 1);
            } while (repeating && !isAfter(cursor, end));
            return next;
          })(),
        })),
      updateBlock: (day, blockId, block) => setState((s) => ({
        ...s,
        plan: { ...s.plan, [day]: sortBlocks((s.plan[day] ?? []).map((item) => item.id === blockId ? { ...item, ...block } : item)) },
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
      removeWorkout: (workoutId) => setState((s) => ({
        ...s,
        workouts: s.workouts.filter((workout) => workout.id !== workoutId),
      })),
      setGoal: (goal) => setState((s) => ({ ...s, goal })),
      setPreferredModality: (preferredModality) => setState((s) => ({ ...s, preferredModality })),
      setShoppingItems: (shoppingItems) => setState((s) => ({ ...s, shoppingItems })),
      toggleShoppingItem: (id) => setState((s) => ({
        ...s,
        shoppingItems: s.shoppingItems.map((item) => item.id === id ? { ...item, checked: !item.checked } : item),
      })),
      addShoppingItem: (item) => setState((s) => ({
        ...s,
        shoppingItems: [...s.shoppingItems, { ...item, id: `manual-${Date.now()}`, checked: false, manual: true }],
      })),
      removeShoppingItem: (id) => setState((s) => ({
        ...s,
        shoppingItems: s.shoppingItems.filter((item) => item.id !== id),
      })),
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
