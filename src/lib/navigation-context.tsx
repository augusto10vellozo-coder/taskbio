import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type SetStateAction } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { NavigationHistory, type AppHistoryEntry } from "./navigation-history";

declare module "@tanstack/react-router" {
  interface HistoryState {
    taskbioTab?: boolean;
  }
}

const NavigationContext = createContext<NavigationHistory | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ledger = useRef<NavigationHistory | null>(null);

  useEffect(() => {
    const history = router.history;
    const entry = (): AppHistoryEntry => ({
      key: history.location.state.__TSR_key ?? "initial",
      index: history.location.state.__TSR_index,
      pathname: history.location.pathname,
      tab: history.location.state.taskbioTab,
    });
    // This ledger deliberately does not survive reloads or direct URL launches.
    const navigation = new NavigationHistory(entry());
    ledger.current = navigation;
    return history.subscribe(({ action }) => navigation.visit(entry(), action.type));
  }, [router]);

  // Share the ref itself via a tiny bridge, avoiding an extra hydration render.
  return <NavigationBridge ledger={ledger}>{children}</NavigationBridge>;
}

const LedgerContext = createContext<{ current: NavigationHistory | null } | null>(null);
function NavigationBridge({ ledger, children }: { ledger: { current: NavigationHistory | null }; children: ReactNode }) {
  return <LedgerContext.Provider value={ledger}>{children}</LedgerContext.Provider>;
}

export function useHierarchicalBack() {
  const ledger = useContext(LedgerContext);
  const location = useLocation();
  const router = useRouter();
  const key = location.state.__TSR_key ?? "initial";
  const canReturn = ledger?.current?.canReturn(key) ?? false;
  return { canReturn, back: () => { if (canReturn) router.history.back(); } };
}

/** Local selections belong to a browser entry, not to a new visit of a module. */
export function useEntryState<T>(field: string, initial: T | (() => T)) {
  const ledger = useContext(LedgerContext);
  const key = useLocation().state.__TSR_key ?? "initial";
  const [value, setValue] = useState<T>(() => {
    const fallback = () => typeof initial === "function" ? (initial as () => T)() : initial;
    return ledger?.current?.read(key, field, fallback) ?? fallback();
  });
  const update = (action: SetStateAction<T>) => {
    const next = typeof action === "function" ? (action as (previous: T) => T)(value) : action;
    ledger?.current?.write(key, field, next);
    setValue(next);
  };
  return [value, update] as const;
}