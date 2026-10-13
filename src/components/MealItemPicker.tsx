import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { foodMacros, searchFoods, type Food } from "@/lib/food-db";
import type { Macros } from "@/lib/trilha-data";

export type MealItem = { foodId?: string; name: string; grams: number; portion: string; macros: Macros };

const num = (v: string) => { const n = Number(v.replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : 0; };
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function MealItemPicker({ customFoods, onAdd, onCreateFood }: { customFoods: Food[]; onAdd: (item: MealItem) => void; onCreateFood: (food: Food) => void }) {
  const [query, setQuery] = useState("");
  const [food, setFood] = useState<Food | null>(null);
  const [measure, setMeasure] = useState("g");
  const [qty, setQty] = useState("1");
  const [creating, setCreating] = useState(false);
  const [custom, setCustom] = useState({ kcal: "", prot: "", carb: "", gord: "" });
  const results = useMemo(() => (food ? [] : searchFoods(query, customFoods)), [query, customFoods, food]);

  const m = food?.measures.find((x) => x.label === measure);
  const grams = food ? (m ? m.grams * num(qty) : num(qty)) : 0;
  const preview = food ? foodMacros(food, grams) : null;

  function pick(f: Food) { setFood(f); setQuery(f.name); setMeasure(f.measures[0]?.label ?? "g"); setQty(f.measures[0] ? "1" : "100"); setCreating(false); }
  function reset() { setFood(null); setQuery(""); setQty("1"); setMeasure("g"); setCreating(false); setCustom({ kcal: "", prot: "", carb: "", gord: "" }); }
  function add() {
    if (!food || grams <= 0 || !preview) return;
    const portion = m ? `${fmt(num(qty))} × ${m.label.replace(/^1 /, "")} (${fmt(grams)} g)` : `${fmt(grams)} g`;
    onAdd({ foodId: food.id, name: food.name, grams, portion, macros: preview });
    reset();
  }
  function createFood() {
    const name = query.trim();
    if (!name || !custom.kcal) return;
    const f: Food = { id: `custom-${Date.now()}`, name, custom: true, measures: [], per100: { kcal: num(custom.kcal), prot: num(custom.prot), carb: num(custom.carb), gord: num(custom.gord) } };
    onCreateFood(f);
    pick(f);
  }

  return (
    <div className="rounded-lg bg-mist/50 p-3 ring-1 ring-line">
      <Label htmlFor="food-search">Adicionar alimento</Label>
      <Input id="food-search" className="mt-1.5" value={query} maxLength={80} autoComplete="off" placeholder="Digite: arroz, feijão, frango…" onChange={(e) => { setQuery(e.target.value); setFood(null); }} />
      {!food && query.trim() && (
        <ul className="mt-1 max-h-48 overflow-y-auto rounded-md bg-card ring-1 ring-line" role="listbox">
          {results.map((f) => (
            <li key={f.id}><button type="button" className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-mist" onClick={() => pick(f)}><span>{f.name}{f.custom ? " · meu" : ""}</span><span className="shrink-0 text-xs text-steel">{f.per100.kcal} kcal/100 g</span></button></li>
          ))}
          <li><button type="button" className="w-full px-3 py-2 text-left text-sm font-medium text-primary hover:bg-mist" onClick={() => setCreating(true)}>+ Criar “{query.trim()}” como alimento personalizado</button></li>
        </ul>
      )}
      {creating && !food && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <p className="col-span-full text-xs text-steel">Valores por 100 g (veja o rótulo).</p>
          {(["kcal", "prot", "carb", "gord"] as const).map((k) => (
            <div key={k}><Label htmlFor={`custom-${k}`} className="text-xs">{{ kcal: "Kcal", prot: "Proteínas (g)", carb: "Carboidratos (g)", gord: "Gorduras (g)" }[k]}</Label><Input id={`custom-${k}`} type="number" min="0" step="0.1" inputMode="decimal" value={custom[k]} onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value }))} /></div>
          ))}
          <Button type="button" size="sm" className="col-span-full" onClick={createFood} disabled={!custom.kcal}>Salvar alimento personalizado</Button>
        </div>
      )}
      {food && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div><Label htmlFor="food-measure" className="text-xs">Medida</Label>
            <select id="food-measure" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={measure} onChange={(e) => { setMeasure(e.target.value); setQty(e.target.value === "g" ? "100" : "1"); }}>
              {food.measures.map((x) => <option key={x.label} value={x.label}>{x.label} ({x.grams} g)</option>)}
              <option value="g">Gramas</option>
            </select></div>
          <div><Label htmlFor="food-qty" className="text-xs">{m ? "Quantidade" : "Gramas"}</Label><Input id="food-qty" className="mt-1" type="number" min="0" step={m ? "0.5" : "1"} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          {preview && <p className="col-span-2 text-xs text-steel" aria-live="polite"><strong className="text-foreground">{preview.kcal} kcal</strong> · P {fmt(preview.prot)}g · C {fmt(preview.carb)}g · G {fmt(preview.gord)}g · {fmt(grams)} g</p>}
          <Button type="button" size="sm" variant="outline" onClick={reset}>Cancelar</Button>
          <Button type="button" size="sm" onClick={add} disabled={grams <= 0}><Plus /> Adicionar item</Button>
        </div>
      )}
    </div>
  );
}
