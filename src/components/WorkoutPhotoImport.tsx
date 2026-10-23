import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { interpretWorkoutPhoto } from "@/lib/plan-photo.functions";
import { mergePhotoWorkouts, separatePhotoNotes, photoToValidation, PHOTO_UNREADABLE, validatePhoto, type PhotoWorkout } from "@/lib/plan-photo";
import type { ImportedWorkout } from "@/lib/training";

type Photo = { id: number; name: string; blob: Blob; url: string };

export function WorkoutPhotoImport({ onContinue, onCancel }: { onContinue: (items: ImportedWorkout[]) => void; onCancel: () => void }) {
  const interpret = useServerFn(interpretWorkoutPhoto);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [items, setItems] = useState<PhotoWorkout[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  const active = useRef(true);
  const lock = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; urls.current.forEach(URL.revokeObjectURL); }; }, []);

  async function read(next: Photo[]) {
    setStatus("Lendo sua planilha…");
    const { readPlanPhotos } = await import("@/lib/plan-photo-browser");
    const pages = await readPlanPhotos(next.map(p => p.blob), (index, progress) => {
      if (active.current) setStatus(`Lendo sua planilha… Foto ${index + 1} de ${next.length} · ${Math.round(progress * 100)}%`);
    });
    if (!active.current) return;
    if (!pages.some(p => p.text.trim().length > 10)) throw new Error(PHOTO_UNREADABLE);
    const text = pages.map((p, i) => `FOTO ${i + 1} (${p.uncertain ? "OCR com dúvidas: marque todos os exercícios para revisar" : "OCR"}):\n${p.text}`).join("\n\n");
    if (text.length > 40000) throw new Error("Estas fotos têm muito texto. Envie menos imagens por vez.");
    setStatus("Organizando os exercícios…");
    const result = await interpret({ data: { text } });
    if (!active.current) return;
    if (result.error || !result.data?.readable) throw new Error(result.error ?? PHOTO_UNREADABLE);
    const parsed = separatePhotoNotes(mergePhotoWorkouts([result.data.workouts]));
    // An uncertain OCR batch always requires explicit human confirmation.
    if (pages.some(p => p.uncertain)) parsed.forEach(w => w.exercises.forEach(e => { e.review = true; }));
    setItems(parsed); setStale(false);
  }

  async function upload(files: File[]) {
    if (lock.current || !files.length) return;
    const invalid = files.map(validatePhoto).find(Boolean);
    if (invalid) { setError(invalid); return; }
    lock.current = true; setBusy(true); setError(null); setStatus("Preparando suas fotos…");
    try {
      const { preparePlanPhoto } = await import("@/lib/plan-photo-browser");
      const prepared: Photo[] = [];
      for (const file of files) {
        const blob = await preparePlanPhoto(file);
        const url = URL.createObjectURL(blob); urls.current.push(url);
        prepared.push({ id: Date.now() + prepared.length, name: file.name, blob, url });
      }
      if (!active.current) return;
      setPhotos(prepared); setStale(true);
      await read(prepared);
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : PHOTO_UNREADABLE); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }

  async function reread() {
    if (lock.current || !photos.length) return;
    lock.current = true; setBusy(true); setError(null);
    try { await read(photos); }
    catch (e) { if (active.current) setError(e instanceof Error ? e.message : PHOTO_UNREADABLE); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }

  const update = (wi: number, ei: number, field: "sets" | "reps" | "loadKg", value: string) => {
    const number = value.trim() === "" ? null : Number(value.replace(",", "."));
    setItems(all => all.map((w, i) => i !== wi ? w : { ...w, exercises: w.exercises.map((e, j) => j !== ei ? e : { ...e, [field]: number !== null && Number.isFinite(number) ? number : null }) }));
  };
  const ready = photoToValidation(items);

  return <div className="space-y-4">
    <input ref={gallery} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" aria-label="Fotos do plano" disabled={busy} onChange={e => { void upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    <input ref={camera} type="file" accept="image/*,.heic,.heif" capture="environment" className="sr-only" aria-label="Câmera do plano" disabled={busy} onChange={e => { void upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    {busy && <div role="status" aria-live="polite" className="flex items-center gap-3 py-5 text-sm text-steel"><LoaderCircle className="size-6 shrink-0 animate-spin motion-reduce:animate-none text-brand" />{status}</div>}
    {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {photos.length > 0 && <ol className="flex gap-2 overflow-x-auto pb-2">{photos.map((photo, index) => <li key={photo.id} className="w-24 shrink-0">
      <img src={photo.url} alt={`Foto ${index + 1} do plano`} className="aspect-square w-full rounded-md object-contain bg-mist" />
      <div className="mt-1 flex items-center justify-between"><span className="text-xs text-steel">Foto {index + 1}</span><Button size="icon" variant="ghost" className="size-8" disabled={busy} aria-label={`Remover foto ${index + 1}`} onClick={() => { setPhotos(all => all.filter(p => p.id !== photo.id)); setStale(true); }}><Trash2 /></Button></div>
    </li>)}</ol>}
    {items.length > 0 && <>
      <p className="font-medium">Encontrei {items.reduce((sum, w) => sum + w.exercises.length, 0)} exercícios em {items.length} treinos</p>
      {items.map((workout, wi) => <section key={wi} className="space-y-3 border-t border-line pt-3">
        <h3 className="text-sm font-semibold">{workout.name}{workout.day ? ` · ${workout.day}` : ""}</h3>
        {workout.notes?.map((note, index) => <p key={index} className="text-sm text-steel">{note}</p>)}
        {workout.exercises.map((exercise, ei) => <div key={ei} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm">{exercise.name}</span>{exercise.review && <span className="text-xs font-semibold text-gold">revisar</span>}</div>
          <div className="grid grid-cols-3 gap-2">{([['sets', 'Séries'], ['reps', 'Repetições'], ['loadKg', 'Carga (kg)']] as const).map(([field, label]) => <label key={field} className="min-w-0 text-xs text-steel">{label}
            <input aria-label={`${label} de ${exercise.name}`} inputMode={field === 'loadKg' ? 'decimal' : 'numeric'} placeholder={field === 'loadKg' ? 'opcional' : undefined} value={exercise[field] ?? ""} disabled={busy} onChange={e => update(wi, ei, field, e.target.value)} className={`mt-1 h-9 w-full min-w-0 rounded-md bg-background px-2 text-sm text-ink ring-1 ${field !== 'loadKg' && exercise[field] === null ? 'ring-gold' : 'ring-line'}`} />
            {field !== 'loadKg' && exercise[field] === null && <span className="mt-1 block text-gold">revisar</span>}
          </label>)}</div>
          {exercise.review && <Button size="sm" variant="outline" disabled={busy} onClick={() => setItems(all => all.map((w, i) => i !== wi ? w : { ...w, exercises: w.exercises.map((e, j) => j !== ei ? e : { ...e, review: false }) }))}>Conferi este exercício</Button>}
        </div>)}
      </section>)}
    </>}
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy} onClick={() => gallery.current?.click()}><ImagePlus />{items.length ? "Enviar outra foto" : "Escolher fotos ou prints"}</Button>
      {!items.length && <Button variant="outline" disabled={busy} onClick={() => camera.current?.click()}><Camera />Tirar foto</Button>}
      {stale && photos.length > 0 && <Button variant="outline" disabled={busy} onClick={() => void reread()}>Reler fotos</Button>}
      <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      {items.length > 0 && <Button disabled={busy || stale || !ready} onClick={() => { if (ready) onContinue(ready); }}>Continuar</Button>}
    </div>
    {items.length > 0 && !ready && <p className="text-xs text-steel">Confira os campos marcados para continuar. A carga é opcional.</p>}
  </div>;
}