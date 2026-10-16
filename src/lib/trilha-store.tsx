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
import { emptyHealth, emptyTrackers, type Trackers, type Habit, type HabitLog, type HealthLog, type MonthGoal } from "./engagement";
import type { ModuleSettings } from "./modules";
import { foodName } from "./meal-summary";
import type { ExerciseLogEntry } from "./training";
import type { Food } from "./food-db";
import { emitBlockXp, emitXp, foodItemCount } from "./xp-client";
import { emptyFinance, type FinanceState } from "./finance";
import { defaultNotifPrefs, type NotifPrefs } from "./push-reminders";

export type TaskBioState = {
  plan: Plan;
  workouts: Workout[];
  meals: Meal[];
  goal: string | null;
  preferredModality: string | null;
  workoutHistory: WorkoutHistoryEntry[];
  shoppingItems: ShoppingItem[];
  weeklyGoals: { workouts: number; mealDays: number; restDays: number };
  habits: Habit[];
  habitLog: HabitLog;
  monthGoals: MonthGoal[];
  health: HealthLog;
  modules: ModuleSettings;
  exerciseLog: ExerciseLogEntry[];
  customFoods: Food[];
  finance: FinanceState;
  trackers: Trackers;
  notifPrefs: NotifPrefs;
};

type Store = TaskBioState & {
  ready: boolean;
  hydrate: (state: Partial<TaskBioState>) => void;
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
  setWeeklyGoals: (goals: TaskBioState["weeklyGoals"]) => void;
  replaceDays: (days: Record<string, Block[]>) => void;
  clearWeek: (keys: string[]) => void;
  addExerciseLog: (entry: Omit<ExerciseLogEntry, "id">) => void;
  updateWorkout: (workout: Workout) => void;
  addHabit: (name: string) => void;
  removeHabit: (id: string) => void;
  toggleHabitStreak: (id: string) => void;
  toggleHabit: (date: string, id: string) => void;
  saveMonthGoal: (goal: MonthGoal) => void;
  removeMonthGoal: (id: string) => void;
  setHealth: (fn: (h: HealthLog) => HealthLog) => void;
  setModule: (id: keyof ModuleSettings, on: boolean) => void;
  getWorkout: (id?: string) => Workout | undefined;
  getMeal: (id?: string) => Meal | undefined;
  addCustomFood: (food: Food) => void;
  setFinance: (fn: (f: FinanceState) => FinanceState) => void;
  setTrackers: (fn: (t: Trackers) => Trackers) => void;
  setNotifPref: (key: keyof NotifPrefs, on: boolean) => void;
};

const initialState: TaskBioState = {
  plan: EMPTY_PLAN,
  workouts: [],
  meals: MEALS,
  goal: null,
  preferredModality: null,
  workoutHistory: [],
  shoppingItems: [],
  weeklyGoals: { workouts: 3, mealDays: 5, restDays: 2 },
  habits: [],
  habitLog: {},
  monthGoals: [],
  health: emptyHealth,
  modules: {},
  exerciseLog: [],
  customFoods: [],
  finance: emptyFinance,
  trackers: emptyTrackers,
  notifPrefs: defaultNotifPrefs,
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

export function TaskBioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TaskBioState>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<TaskBioState>;
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

  const displayMeals = useMemo(() => state.meals.map((meal) => ({ ...meal, name: foodName(meal.name), items: foodName(meal.items), ingredients: meal.ingredients.map((item) => ({ ...item, name: foodName(item.name) })) })), [state.meals]);
  const displayPlan = useMemo(() => Object.fromEntries(Object.entries(state.plan).map(([date, blocks]) => [date, blocks.map((b) => b.kind === "refeicao" ? { ...b, title: foodName(b.title) } : b)])), [state.plan]);
  const displayShoppingItems = useMemo(() => state.shoppingItems.map((item) => ({ ...item, name: foodName(item.name) })), [state.shoppingItems]);
  const value = useMemo<Store>(
    () => ({
      ...state,
      meals: displayMeals,
      plan: displayPlan,
      shoppingItems: displayShoppingItems,
      ready,
      hydrate: (nextState) => setState((current) => ({
        ...current,
        ...nextState,
        ...(nextState.plan ? { plan: normalizePlan(nextState.plan) } : {}),
      })),
      toggleBlock: (day, blockId) => {
        const target = (state.plan[day] ?? []).find((b) => b.id === blockId);
        if (target && (target.kind !== "refeicao" || foodItemCount(target) === 0)) emitBlockXp(day, target, !target.done);
        setState((s) => ({
          ...s,
          plan: {
            ...s.plan,
            [day]: (s.plan[day] ?? []).map((b) => (b.id === blockId ? { ...b, done: !b.done } : b)),
          },
        }));
      },
      removeBlock: (day, blockId) => {
        const target = (state.plan[day] ?? []).find((b) => b.id === blockId);
        if (target) { emitBlockXp(day, target, false); emitXp({ kind: "photo", ref: blockId, date: day, on: false }); }
        setState((s) => ({
          ...s,
          plan: { ...s.plan, [day]: (s.plan[day] ?? []).filter((b) => b.id !== blockId) },
        }));
      },
      addBlock: (day, block) => {
        const stamp = Date.now();
        const firstId = `b-${stamp}-${day}`;
        if (block.kind === "refeicao" && foodItemCount(block) > 0) emitXp({ kind: "meal", ref: firstId, date: day, on: true, foodItems: foodItemCount(block) });
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
                  { ...block, id: `b-${stamp}-${targetDate}`, done: false },
                ]);
              }
              cursor = addDays(cursor, 1);
            } while (repeating && !isAfter(cursor, end));
            return next;
          })(),
        }));
      },
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
      setWeeklyGoals: (weeklyGoals) => setState((s) => ({ ...s, weeklyGoals })),
      replaceDays: (days) => setState((s) => ({ ...s, plan: { ...s.plan, ...days } })),
      clearWeek: (keys) => setState((s) => ({ ...s, plan: Object.fromEntries(Object.entries(s.plan).filter(([key]) => !keys.includes(key))) })),
      addCustomFood: (food) => setState((s) => ({ ...s, customFoods: [food, ...(s.customFoods ?? []).filter((f) => f.id !== food.id)].slice(0, 500) })),
      addExerciseLog: (entry) => setState((s) => ({ ...s, exerciseLog: [{ ...entry, id: `x-${Date.now()}` }, ...(s.exerciseLog ?? [])].slice(0, 2000) })),
      updateWorkout: (workout) => setState((s) => ({ ...s, workouts: s.workouts.map((w) => w.id === workout.id ? workout : w) })),
      addHabit: (name) => setState((s) => ({ ...s, habits: [...s.habits, { id: `h-${Date.now()}`, name, createdAt: new Date().toISOString() }] })),
      toggleHabitStreak: (id) => setState((s) => ({ ...s, habits: s.habits.map((h) => h.id === id ? { ...h, countsForStreak: h.countsForStreak === false } : h) })),
      removeHabit: (id) => setState((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) })),
      toggleHabit: (date, id) => {
        emitXp({ kind: "habit", ref: `${id}:${date}`, date, on: !(state.habitLog[date] ?? []).includes(id) });
        setState((s) => {
        const cur = s.habitLog[date] ?? [];
        const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
        return { ...s, habitLog: { ...s.habitLog, [date]: next } };
      });
      },
      saveMonthGoal: (goal) => setState((s) => ({ ...s, monthGoals: s.monthGoals.some((g) => g.id === goal.id) ? s.monthGoals.map((g) => g.id === goal.id ? goal : g) : [...s.monthGoals, goal] })),
      removeMonthGoal: (id) => setState((s) => ({ ...s, monthGoals: s.monthGoals.filter((g) => g.id !== id) })),
      setHealth: (fn) => setState((s) => ({ ...s, health: fn({ ...emptyHealth, ...s.health }) })),
      setFinance: (fn) => setState((s) => ({ ...s, finance: fn({ ...emptyFinance, ...s.finance }) })),
      setTrackers: (fn) => setState((s) => ({ ...s, trackers: fn({ ...emptyTrackers, ...s.trackers }) })),
      setNotifPref: (key, on) => setState((s) => ({ ...s, notifPrefs: { ...defaultNotifPrefs, ...s.notifPrefs, [key]: on } })),
      setModule: (id, on) => setState((s) => ({ ...s, modules: { ...s.modules, [id]: on } })),
      getWorkout: (id) => state.workouts.find((w) => w.id === id),
      getMeal: (id) => displayMeals.find((m) => m.id === id),
    }),
    [ready, state, displayMeals, displayPlan, displayShoppingItems],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTaskBio() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useTaskBio precisa estar dentro de TaskBioProvider");
  return ctx;
}
