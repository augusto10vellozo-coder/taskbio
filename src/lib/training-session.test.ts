import { describe, expect, it } from 'vitest';
import { changeSeries, exerciseSeries, sessionProgress } from './training-session';
import { toWorkout } from './training';
describe('series dated progress', () => {
  const w = toWorkout({ day: null, name: 'A', exercises: [{ name: 'Supino', sets: 4, reps: 12, loadKg: 20 }] }, [], 'w');
  it('two independent checks out of four are not completion', () => {
    const ex = w.exercises[0]; if (!ex) throw new Error('fixture');
    const updated = changeSeries(changeSeries(ex, '2026-10-23', 0, { done: true }), '2026-10-23', 2, { done: true });
    expect(sessionProgress({ ...w, exercises: [updated] }, '2026-10-23')).toEqual({ total: 4, done: 2, exercises: 0, complete: false });
    expect(exerciseSeries(updated, '2026-10-23').map(s => s.done)).toEqual([true, false, true, false]);
  });
  it('four checks complete the exercise and survive serialization only on that date', () => {
    let ex = w.exercises[0]; if (!ex) throw new Error('fixture');
    for (let i = 0; i < 4; i++) ex = changeSeries(ex, '2026-10-23', i, { done: true });
    const restored = JSON.parse(JSON.stringify(ex));
    expect(sessionProgress({ ...w, exercises: [restored] }, '2026-10-23').exercises).toBe(1);
    expect(sessionProgress({ ...w, exercises: [restored] }, '2026-10-24').done).toBe(0);
  });
  it('optional load overrides only that series', () => {
    const ex = w.exercises[0]; if (!ex) throw new Error('fixture');
    const updated = changeSeries(ex, '2026-10-23', 1, { done: true, loadKg: 25 });
    expect(exerciseSeries(updated, '2026-10-23')[1]?.loadKg).toBe(25);
    expect(exerciseSeries(updated, '2026-10-23')[0]?.loadKg ?? updated.loadKg).toBe(20);
    expect(changeSeries(updated, '2026-10-23', 1, { done: false }).doneSets).toBe(0);
  });
});
