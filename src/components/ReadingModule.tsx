import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Flame, Loader2, Plus, Quote as QuoteIcon, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleHeader } from "@/components/ModuleHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { lastDays, type Book, type BookStatus } from "@/lib/engagement";
import { bookPercent, DEFAULT_READING_GOAL, linkLegacySessions, READING_STATUS_LABEL, readingStreak, searchBooks, type BookResult } from "@/lib/reading";
import { emitXp } from "@/lib/xp-client";

const input = "h-10 min-w-0 rounded-md bg-background px-3 text-sm ring-1 ring-line";

export function Cover({ book, className = "h-24 w-16" }: { book: Pick<Book, "title" | "cover">; className?: string }) {
  if (book.cover) return <img src={book.cover} alt={`Capa de ${book.title}`} loading="lazy" className={`${className} shrink-0 rounded object-cover ring-1 ring-line`} />;
  const ini = book.title.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return <div aria-hidden className={`${className} grid shrink-0 place-items-center rounded bg-gradient-to-br from-brand/30 to-accent/30 font-display text-lg font-semibold ring-1 ring-line`}>{ini || "?"}</div>;
}

export function ReadingModule() {
  const { trackers, setTrackers } = useTaskBio();
  const books = trackers.books ?? [];
  const sessions = trackers.leitura ?? [];
  const goal = trackers.readingGoal ?? DEFAULT_READING_GOAL;
  const [today, setToday] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookStatus>("lendo");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BookResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [m, setM] = useState({ title: "", author: "", pages: "" });
  const [sel, setSel] = useState({ bookId: "", minutes: "", pages: "" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [rateId, setRateId] = useState<string | null>(null);
  useEffect(() => setToday(toDateKey(new Date())), []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) { setResults(null); setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      searchBooks(term, ctrl.signal).then((r) => { setResults(r); setLoading(false); }).catch((e) => { if (e.name !== "AbortError") { setResults([]); setLoading(false); } });
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const reading = books.filter((b) => b.status === "lendo");
  useEffect(() => { if (!sel.bookId && reading[0]) setSel((s) => ({ ...s, bookId: reading[0]!.id })); }, [reading, sel.bookId]);
  const streak = useMemo(() => readingStreak(sessions, new Date()), [sessions]);
  if (!today) return <main className="mx-auto max-w-4xl px-5 pt-8"><div className="h-60 animate-pulse rounded-lg bg-mist" /></main>;

  const week = lastDays(new Date(), 7);
  const weekMin = sessions.filter((e) => week.includes(e.date)).reduce((n, e) => n + e.minutes, 0);
  const todayMin = sessions.filter((e) => e.date === today).reduce((n, e) => n + e.minutes, 0);

  const addBook = (r: BookResult, status: BookStatus = "lendo") => {
    const book: Book = { id: `bk-${Date.now()}`, title: r.title.trim(), author: r.author.trim(), totalPages: r.totalPages, cover: r.cover, pagesRead: 0, status, quotes: [], createdAt: new Date().toISOString() };
    setTrackers((t) => ({ ...t, books: [book, ...(t.books ?? [])], leitura: linkLegacySessions(t.leitura, book) }));
    setQ(""); setResults(null); setFilter(status); setSel((s) => ({ ...s, bookId: book.id }));
    toast.success(`“${book.title}” adicionado`);
  };
  const patch = (id: string, fn: (b: Book) => Book) => setTrackers((t) => ({ ...t, books: (t.books ?? []).map((b) => (b.id === id ? fn(b) : b)) }));
  const titleOf = (id?: string) => books.find((b) => b.id === id)?.title;
  const open = books.find((b) => b.id === openId);

  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 sm:px-8">
      <ModuleHeader title="Leitura" />
      <div className="-mt-1 flex flex-wrap items-center gap-2 pb-5 text-sm text-steel">
        <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 font-medium text-foreground ring-1 ring-line"><Flame className="size-4 text-accent" /> {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}</span>
        <span>Seu tempo de leitura</span>
      </div>

      <section aria-labelledby="sessao" className="rounded-lg bg-card p-4 ring-1 ring-line">
        <h2 id="sessao" className="font-display text-lg font-semibold">Registrar sessão</h2>
        {reading.length === 0 ? <p className="mt-2 text-sm text-steel">Adicione seu primeiro livro pra registrar a leitura.</p> : (
          <form className="mt-3 grid grid-cols-2 gap-2" onSubmit={(e) => {
            e.preventDefault();
            const mins = Math.round(Number(sel.minutes));
            const book = books.find((b) => b.id === sel.bookId);
            if (!book) { toast.error("Escolha o livro"); return; }
            if (!(mins > 0)) { toast.error("Informe os minutos"); return; }
            const pg = Math.max(0, Math.round(Number(sel.pages) || 0));
            const id = `s-${Date.now()}`;
            setTrackers((t) => ({ ...t, leitura: [{ id, date: today, minutes: mins, title: book.title, bookId: book.id, ...(pg ? { pages: pg } : {}) }, ...t.leitura], books: (t.books ?? []).map((b) => b.id === book.id ? { ...b, pagesRead: b.totalPages ? Math.min(b.totalPages, b.pagesRead + pg) : b.pagesRead + pg } : b) }));
            emitXp({ kind: "reading", ref: id, date: today, on: true });
            setSel((s) => ({ ...s, minutes: "", pages: "" }));
            toast.success("Sessão registrada · +5 XP");
          }}>
            <select aria-label="Livro" value={sel.bookId} onChange={(e) => setSel((s) => ({ ...s, bookId: e.target.value }))} className={`${input} col-span-2`}>
              {reading.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <input type="number" min="1" aria-label="Minutos" placeholder="Minutos" value={sel.minutes} onChange={(e) => setSel((s) => ({ ...s, minutes: e.target.value }))} className={input} />
            <input type="number" min="0" aria-label="Páginas lidas" placeholder="Páginas (opcional)" value={sel.pages} onChange={(e) => setSel((s) => ({ ...s, pages: e.target.value }))} className={input} />
            <Button className="col-span-2 h-10"><Plus /> Registrar</Button>
          </form>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Hoje" value={`${todayMin} min`} />
        <section className="rounded-lg bg-card p-4 ring-1 ring-line">
          <p className="text-xs font-medium text-steel">Meta semanal</p>
          <p className="mt-1 font-display text-2xl font-semibold">{weekMin}<span className="text-sm font-normal text-steel"> / {goal} min</span></p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist"><div className="h-full bg-brand" style={{ width: `${Math.min(100, (weekMin / Math.max(1, goal)) * 100)}%` }} /></div>
          <label className="mt-2 flex items-center gap-2 text-xs text-steel">Meta <input type="number" min="10" step="10" aria-label="Meta semanal em minutos" value={goal} onChange={(e) => { const v = Math.round(Number(e.target.value)); if (v > 0) setTrackers((t) => ({ ...t, readingGoal: v })); }} className="h-8 w-20 rounded bg-background px-2 ring-1 ring-line" /> min</label>
        </section>
      </div>

      <section aria-labelledby="livros" className="mt-6">
        <h2 id="livros" className="font-display text-lg font-semibold">Meus Livros</h2>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel" />
          <input type="search" aria-label="Buscar livro" placeholder="Buscar livro..." value={q} onChange={(e) => setQ(e.target.value)} className={`${input} w-full pl-9`} />
        </div>
        {loading && <p className="mt-3 flex items-center gap-2 text-sm text-steel"><Loader2 className="size-4 animate-spin" /> Buscando…</p>}
        {!loading && results && results.length === 0 && <p className="mt-3 text-sm text-steel">Não achamos esse livro. Tente outro título ou adicione você mesmo.</p>}
        {!loading && results && results.length > 0 && (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {results.map((r, i) => (
              <li key={`${r.title}-${i}`}><button type="button" onClick={() => addBook(r)} className="flex w-full gap-3 rounded-lg bg-card p-3 text-left ring-1 ring-line transition hover:ring-brand">
                <Cover book={r} className="h-20 w-14" />
                <span className="min-w-0"><span className="block font-medium [overflow-wrap:anywhere]">{r.title}</span><span className="block text-xs text-steel">{r.author || "Autor desconhecido"}</span><span className="block text-xs text-steel">{r.totalPages ? `${r.totalPages} páginas` : "Páginas não informadas"}</span></span>
              </button></li>
            ))}
          </ul>
        )}
        <button type="button" className="mt-2 text-sm font-medium text-brand underline-offset-4 hover:underline" onClick={() => setManual((v) => !v)}>Não encontrou? Adicionar manualmente</button>
        {manual && (
          <form className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-card p-4 ring-1 ring-line" onSubmit={(e) => { e.preventDefault(); if (!m.title.trim()) { toast.error("Informe o título"); return; } const p = Math.round(Number(m.pages)); addBook({ title: m.title, author: m.author, totalPages: p > 0 ? p : undefined }); setM({ title: "", author: "", pages: "" }); setManual(false); }}>
            <input aria-label="Título do livro" placeholder="Título" value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} className={`${input} col-span-2`} />
            <input aria-label="Autor" placeholder="Autor" value={m.author} onChange={(e) => setM({ ...m, author: e.target.value })} className={input} />
            <input type="number" min="1" aria-label="Total de páginas" placeholder="Páginas (opcional)" value={m.pages} onChange={(e) => setM({ ...m, pages: e.target.value })} className={input} />
            <Button className="col-span-2 h-10"><Plus /> Adicionar livro</Button>
          </form>
        )}

        <div role="tablist" aria-label="Filtrar por status" className="mt-4 flex gap-2">
          {(["lendo", "concluido", "quero"] as BookStatus[]).map((s) => (
            <button key={s} role="tab" aria-selected={filter === s} onClick={() => setFilter(s)} className={`h-9 rounded-full px-4 text-sm font-medium ring-1 ring-line ${filter === s ? "bg-primary text-primary-foreground" : "bg-card"}`}>{READING_STATUS_LABEL[s]} ({books.filter((b) => b.status === s).length})</button>
          ))}
        </div>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {books.filter((b) => b.status === filter).length === 0 && <li className="rounded-lg bg-card p-6 text-center text-sm text-steel ring-1 ring-line sm:col-span-2">Nenhum livro aqui ainda.</li>}
          {books.filter((b) => b.status === filter).map((b) => { const pct = bookPercent(b); return (
            <li key={b.id}><button type="button" onClick={() => setOpenId(b.id)} className="flex w-full gap-3 rounded-lg bg-card p-3 text-left ring-1 ring-line hover:ring-brand">
              <Cover book={b} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium [overflow-wrap:anywhere]">{b.title}</span>
                <span className="block text-xs text-steel">{b.author || "Autor desconhecido"}</span>
                {b.rating ? <span className="mt-1 flex" aria-label={`Nota ${b.rating} de 5`}>{Array.from({ length: b.rating }, (_, i) => <Star key={i} className="size-3.5 fill-accent text-accent" />)}</span> : null}
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-mist"><span className="block h-full bg-brand" style={{ width: `${pct ?? 0}%` }} /></span>
                <span className="mt-1 block text-xs text-steel">{pct === null ? `${b.pagesRead} páginas lidas` : `${pct}% · ${b.pagesRead}/${b.totalPages} págs.`}</span>
              </span>
            </button></li>
          ); })}
        </ul>
      </section>

      <section aria-labelledby="hist" className="mt-6">
        <h2 id="hist" className="font-display text-lg font-semibold">Histórico</h2>
        <ul className="mt-3 divide-y divide-line rounded-lg bg-card px-4 ring-1 ring-line">{sessions.length === 0 ? <li className="py-6 text-center text-sm text-steel">Nenhuma sessão ainda.</li> : sessions.slice(0, 30).map((e) => <li key={e.id} className="flex items-center gap-3 py-2 text-sm"><span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{titleOf(e.bookId) ?? (e.title || "Leitura")} <span className="text-xs text-steel">· {e.date.split("-").reverse().join("/")}{e.pages ? ` · ${e.pages} págs.` : ""}</span></span><span className="shrink-0 font-medium">{e.minutes} min</span><Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Remover sessão" onClick={() => { emitXp({ kind: "reading", ref: e.id, date: e.date, on: false }); setTrackers((t) => ({ ...t, leitura: t.leitura.filter((x) => x.id !== e.id) })); }}><Trash2 /></Button></li>)}</ul>
      </section>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && <BookDetail book={open} onPatch={(fn) => patch(open.id, fn)} onFinish={() => { patch(open.id, (b) => ({ ...b, status: "concluido", pagesRead: b.totalPages ?? b.pagesRead })); setOpenId(null); setRateId(open.id); setFilter("concluido"); }} onRemove={() => { setTrackers((t) => ({ ...t, books: (t.books ?? []).filter((b) => b.id !== open.id) })); setOpenId(null); }} />}
      </Dialog>
      <Dialog open={!!rateId} onOpenChange={(o) => !o && setRateId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Livro concluído! 🎉</DialogTitle><DialogDescription>Quer dar uma nota? É opcional.</DialogDescription></DialogHeader>
          <div className="flex justify-center gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} aria-label={`${n} estrela${n > 1 ? "s" : ""}`} className="grid size-11 place-items-center" onClick={() => { if (rateId) patch(rateId, (b) => ({ ...b, rating: n })); setRateId(null); toast.success("Nota salva"); }}><Star className="size-7 text-accent hover:fill-accent" /></button>)}</div>
          <Button variant="ghost" onClick={() => setRateId(null)}>Agora não</Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function BookDetail({ book, onPatch, onFinish, onRemove }: { book: Book; onPatch: (fn: (b: Book) => Book) => void; onFinish: () => void; onRemove: () => void }) {
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle className="pr-6 [overflow-wrap:anywhere]">{book.title}</DialogTitle><DialogDescription>{book.author || "Autor desconhecido"}{book.totalPages ? ` · ${book.totalPages} páginas` : ""}</DialogDescription></DialogHeader>
      <div className="flex gap-3"><Cover book={book} /><div className="flex flex-1 flex-col gap-2">
        <label className="text-xs text-steel">Status
          <select value={book.status} onChange={(e) => onPatch((b) => ({ ...b, status: e.target.value as BookStatus }))} className={`${input} mt-1 w-full`}>{(["lendo", "concluido", "quero"] as BookStatus[]).map((s) => <option key={s} value={s}>{READING_STATUS_LABEL[s]}</option>)}</select>
        </label>
        {book.status !== "concluido" && <Button onClick={onFinish}><Check /> Concluí este livro</Button>}
      </div></div>
      <section>
        <h3 className="flex items-center gap-2 font-medium"><QuoteIcon className="size-4" /> Citações</h3>
        <form className="mt-2 grid grid-cols-[1fr_6rem] gap-2" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; const p = Math.round(Number(page)); onPatch((b) => ({ ...b, quotes: [{ id: `q-${Date.now()}`, text: text.trim(), ...(p > 0 ? { page: p } : {}) }, ...(b.quotes ?? [])] })); setText(""); setPage(""); toast.success("Citação salva"); }}>
          <textarea aria-label="Trecho" placeholder="Trecho favorito" value={text} onChange={(e) => setText(e.target.value)} className="col-span-2 min-h-20 rounded-md bg-background p-3 text-sm ring-1 ring-line" />
          <input type="number" min="1" aria-label="Página" placeholder="Página" value={page} onChange={(e) => setPage(e.target.value)} className={input} />
          <Button variant="secondary" className="h-10"><Plus /> Salvar</Button>
        </form>
        <ul className="mt-3 space-y-2">{(book.quotes ?? []).length === 0 ? <li className="text-sm text-steel">Nenhuma citação ainda.</li> : book.quotes.map((qt) => <li key={qt.id} className="flex gap-2 rounded-md bg-background p-3 text-sm ring-1 ring-line"><blockquote className="flex-1 italic [overflow-wrap:anywhere]">“{qt.text}”{qt.page ? <span className="not-italic text-xs text-steel"> — p. {qt.page}</span> : null}</blockquote><Button variant="ghost" size="icon" className="size-7" aria-label="Remover citação" onClick={() => onPatch((b) => ({ ...b, quotes: b.quotes.filter((x) => x.id !== qt.id) }))}><Trash2 /></Button></li>)}</ul>
      </section>
      <Button variant="ghost" className="text-destructive" onClick={onRemove}><Trash2 /> Remover livro</Button>
      <BookOpen className="hidden" />
    </DialogContent>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <section className="rounded-lg bg-card p-4 ring-1 ring-line"><p className="text-xs font-medium text-steel">{label}</p><p className="mt-1 font-display text-2xl font-semibold">{value}</p></section>;
}
