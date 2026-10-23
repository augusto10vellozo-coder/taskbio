export type RestState = { endsAt: number; pausedMs: number | null; sound: boolean };
export const REST_EVENT = 'taskbio-rest-change';
export const restKey = (userId?: string) => `taskbio.rest.v1:${userId ?? 'local'}`;
export const newRest = (now: number, sound = false): RestState => ({ endsAt: now + 60000, pausedMs: null, sound });
export const restRemaining = (state: RestState, now: number) => Math.max(0, state.pausedMs ?? state.endsAt - now);
export function pauseRest(state: RestState, now: number): RestState {
  return state.pausedMs === null ? { ...state, pausedMs: restRemaining(state, now) } : { ...state, pausedMs: null, endsAt: now + state.pausedMs };
}
export const extendRest = (state: RestState, now: number): RestState => state.pausedMs === null ? { ...state, endsAt: now + restRemaining(state, now) + 15000 } : { ...state, pausedMs: state.pausedMs + 15000 };
export function readRest(key: string): RestState | null {
  try { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return value && Number.isFinite(value.endsAt) && (value.pausedMs === null || Number.isFinite(value.pausedMs)) ? value : null; } catch { return null; }
}
export function writeRest(key: string, state: RestState | null) {
  try { if (state) localStorage.setItem(key, JSON.stringify(state)); else localStorage.removeItem(key); } catch { /* device storage unavailable */ }
  window.dispatchEvent(new Event(REST_EVENT));
}
export function startRest(key: string) { writeRest(key, newRest(Date.now(), readRest(key)?.sound ?? false)); }
