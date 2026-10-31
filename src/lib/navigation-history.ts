/** Per-running-app ledger: browser history outside this visit is never a parent. */
export type AppHistoryEntry = {
  key: string;
  index: number;
  pathname: string;
  tab?: boolean | undefined;
};

type EntryRecord = { entry: AppHistoryEntry; parent?: string | undefined; values: Map<string, unknown> };

export class NavigationHistory {
  private records = new Map<string, EntryRecord>();
  private current: AppHistoryEntry;

  constructor(initial: AppHistoryEntry) {
    this.current = initial;
    this.records.set(initial.key, { entry: initial, values: new Map() });
  }

  visit(next: AppHistoryEntry, action: string) {
    const previous = this.current;
    const previousRecord = this.records.get(previous.key);
    if (action === "PUSH" || action === "REPLACE") {
      const sameScreen = next.pathname === previous.pathname;
      const parent = next.tab ? undefined : action === "REPLACE" || sameScreen
        ? previousRecord?.parent : previous.key;
      this.records.set(next.key, {
        entry: next,
        parent,
        values: action === "REPLACE" || sameScreen ? previousRecord?.values ?? new Map() : new Map(),
      });
    }
    this.current = next;
  }

  canReturn(key: string) {
    const record = this.records.get(key);
    const parent = record?.parent ? this.records.get(record.parent) : undefined;
    return Boolean(record && parent && !record.entry.tab && parent.entry.index === record.entry.index - 1);
  }

  read<T>(key: string, field: string, fallback: () => T): T {
    const values = this.records.get(key)?.values;
    return values?.has(field) ? values.get(field) as T : fallback();
  }

  write<T>(key: string, field: string, value: T) {
    this.records.get(key)?.values.set(field, value);
  }
}