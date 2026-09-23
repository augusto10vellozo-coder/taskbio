import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  INITIAL_PLAN,
  MEALS,
  WORKOUTS,
  type Block,
  type DayKey,
  type Meal,
  type Plan,
  type Workout,
} from "./trilha-data";

type State = {
  plan: Plan;
  workouts: Workout[];
  meals: Meal[];
  goal: string | null;
};

type Store = State & {
  toggleBlock: (day: DayKey, blockId: string) => void;
  removeBlock: (day: DayKey, blockId: string) => void;
  addBlock: (day: DayKey, block: Omit<Block, "id" | "done">) => void;
  setDoneSets: (workoutId: string, exerciseId: string, doneSets: number) => void;
  addWorkout: (workout: Workout) => void;
  setGoal: (goal: string) => void;
  getWorkout: (id?: string) => Workout | undefined;
  getMeal: (id?: string) => Meal | undefined;
};

const initialState: State = {
  plan: INITIAL_PLAN,
  workouts: WORKOUTS,
  meals: MEALS,
  goal: null,
};

const STORAGE_KEY = "trilha.state.v1";

const StoreContext = createContext<Store | null>(null);

const sortBlocks = (blocks: Block[]) =>
  [...blocks].sort((a, b) => a.time.localeCompare(b.time));

export function TrilhaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as State) });
    } catch {
      /* ignora estado inválido */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* armazenamento indisponível */
    }
  }, [state]);

  const value = useMemo<Store>(
    () => ({
      ...state,
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
          plan: {
            ...s.plan,
            [day]: sortBlocks([
              ...s.plan[day],
              { ...block, id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, done: false },
            ]),
          },
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
      addWorkout: (workout) => setState((s) => ({ ...s, workouts: [...s.workouts, workout] })),
      setGoal: (goal) => setState((s) => ({ ...s, goal })),
      getWorkout: (id) => state.workouts.find((w) => w.id === id),
      getMeal: (id) => state.meals.find((m) => m.id === id),
    }),
    [state],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTrilha() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useTrilha precisa estar dentro de TrilhaProvider");
  return ctx;
}
