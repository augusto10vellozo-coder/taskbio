import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, FileText, Plus, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { reviewPublicContent } from "@/lib/content-review.functions";
import { ModuleHeader } from "@/components/ModuleHeader";
import { ProductMetrics } from "@/components/ProductMetrics";
type ContentReviewResult = { summary: string; scores: { clarity: number; utility: number; suitability: number }; strengths: string[]; improvements: Array<{ priority: string; page: string; action: string; reason: string }>; risks: string[] };

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [
    { title: "Equipe — Conteúdo e métricas | TaskBio" },
    { name: "description", content: "Área restrita da equipe TaskBio para revisão editorial e métricas das páginas públicas." },
    { property: "og:title", content: "Equipe — Conteúdo e métricas | TaskBio" },
    { property: "og:description", content: "Revisão de conteúdo e acompanhamento de visitas públicas pela equipe TaskBio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TeamPage,
});

type PageInput = { path: string; title: string; content: string };
type EventRow = { page_path: string; event_type: string; ad_slot: string | null; created_at: string };
type ReviewRow = { id: string; created_at: string; pages: unknown; result: unknown; criteria: string };
const paths = ["/", "/sobre", "/contato", "/privacidade", "/termos"];
const initialPages: PageInput[] = [{ path: "/sobre", title: "Sobre o TaskBio", content: "" }];

function TeamPage() {
  const { user } = Route.useRouteContext();
  const review = useServerFn(reviewPublicContent);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [pages, setPages] = useState<PageInput[]>(initialPages);
  const [criteria, setCriteria] = useState("Texto claro e útil para visitantes adultos; sem prometer resultados de saúde; sem prescrição individual; linguagem acessível, informações honestas, contato e privacidade fáceis de encontrar.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ContentReviewResult | null>(null);
  const [history, setHistory] = useState<ReviewRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    let active = true;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => {
      if (active) setAllowed(data?.role === "admin");
    });
    return () => { active = false; };
  }, [user.id]);

  useEffect(() => {
    if (!allowed) return;
    void supabase.from("content_reviews").select("id, created_at, pages, result, criteria").order("created_at", { ascending: false }).limit(15).then(({ data }) => setHistory((data ?? []) as ReviewRow[]));
  }, [allowed, result]);

  useEffect(() => {
    if (!allowed) return;
    const since = new Date(Date.now() - Number(period) * 86400000).toISOString();
    void supabase.from("public_events").select("page_path, event_type, ad_slot, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(10000).then(({ data }) => setEvents((data ?? []) as EventRow[]));
  }, [allowed, period]);

  function updatePage(index: number, key: keyof PageInput, value: string) {
    setPages((current) => current.map((item, position) => position === index ? { ...item, [key]: value } : item));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(""); setBusy(true);
    try {
      const response = await review({ data: { pages, criteria } });
      if (response.error) setError(response.error);
      else setResult(response.data);
    } catch { setError("Não foi possível iniciar a avaliação. Verifique a conexão e tente novamente."); }
    finally { setBusy(false); }
  }

  if (allowed === null) return <main className="mx-auto max-w-5xl px-5 py-12"><p className="text-steel">Verificando acesso…</p></main>;
  if (!allowed) return <main className="mx-auto max-w-3xl px-5 pb-16"><ModuleHeader title="Equipe" /><div className="pt-8 text-center"><h2 className="font-display text-2xl font-semibold">Área reservada à equipe</h2><p className="mt-3 text-steel">Sua conta não tem acesso a este painel.</p><Button asChild variant="outline" className="mt-6"><Link to="/">Voltar ao TaskBio</Link></Button></div></main>;

  const rows = paths.map((path) => ({ path, visits: events.filter((row) => row.page_path === path && row.event_type === "page_view").length, clicks: events.filter((row) => row.page_path === path && row.event_type === "ad_click").length }));
  const totalVisits = rows.reduce((sum, row) => sum + row.visits, 0);
  const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);

  return <main className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
    <ModuleHeader title="Equipe" /><h2 className="font-display text-lg font-semibold">Conteúdo e audiência</h2>
    <Tabs defaultValue="review" className="mt-8">
      <TabsList className="w-full justify-start sm:w-auto"><TabsTrigger value="review"><FileText className="mr-2 size-4" />Revisão de conteúdo</TabsTrigger><TabsTrigger value="metrics"><Activity className="mr-2 size-4" />Métricas</TabsTrigger><TabsTrigger value="product"><TrendingUp className="mr-2 size-4" />Produto</TabsTrigger></TabsList>
      <TabsContent value="review" className="mt-8">
        <form onSubmit={submit} className="space-y-6">
          <div><label htmlFor="criteria" className="text-sm font-semibold">Critérios editoriais</label><Textarea id="criteria" required minLength={20} maxLength={4000} value={criteria} onChange={(event) => setCriteria(event.target.value)} className="mt-2 min-h-28 bg-card" /></div>
          <div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Páginas públicas</h2><Button type="button" variant="outline" size="sm" disabled={pages.length >= 8} onClick={() => setPages((current) => [...current, { path: "/", title: "", content: "" }])}><Plus />Adicionar página</Button></div>
          {pages.map((page, index) => <div key={index} className="space-y-3 border-t border-line pt-5">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold">Página {index + 1}</span>{pages.length > 1 && <Button type="button" size="icon" variant="ghost" title="Remover página" aria-label="Remover página" onClick={() => setPages((current) => current.filter((_, position) => position !== index))}><Trash2 /></Button>}</div>
            <div className="grid gap-3 sm:grid-cols-[12rem_1fr]"><label className="text-sm">Endereço<select value={page.path} onChange={(event) => updatePage(index, "path", event.target.value)} className="mt-1 block h-9 w-full rounded-md border border-input bg-card px-3">{paths.map((path) => <option key={path} value={path}>{path}</option>)}</select></label><label className="text-sm">Título<Input required maxLength={120} value={page.title} onChange={(event) => updatePage(index, "title", event.target.value)} className="mt-1 bg-card" /></label></div>
            <label className="block text-sm">Conteúdo para avaliação<Textarea required minLength={20} maxLength={12000} value={page.content} onChange={(event) => updatePage(index, "content", event.target.value)} placeholder="Cole aqui o texto da página pública…" className="mt-1 min-h-40 bg-card" /></label>
          </div>)}
          <Button disabled={busy} type="submit"><Sparkles />{busy ? "Avaliando…" : "Avaliar conteúdo"}</Button>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
        {result && <ReviewResult result={result} />}
        {history.length > 0 && <section className="mt-12 border-t border-line pt-6"><h2 className="font-display text-xl font-semibold">Avaliações anteriores</h2><div className="mt-4 space-y-2">{history.map((item) => <Button key={item.id} variant="outline" className="h-auto w-full justify-between whitespace-normal py-3 text-left" onClick={() => { setResult(item.result as ContentReviewResult); setCriteria(item.criteria); if (Array.isArray(item.pages)) setPages(item.pages as PageInput[]); }}><span>{new Date(item.created_at).toLocaleDateString("pt-BR")} · {Array.isArray(item.pages) ? item.pages.length : 0} página(s)</span><span>Ver resultado</span></Button>)}</div></section>}
      </TabsContent>
      <TabsContent value="metrics" className="mt-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-display text-2xl font-semibold">Visitas às páginas públicas</h2><p className="mt-1 text-sm text-steel">Somente eventos de visitantes que aceitaram métricas. Sem identificação pessoal.</p></div><label className="text-sm">Período<select value={period} onChange={(event) => setPeriod(event.target.value)} className="ml-2 rounded-md border border-input bg-card px-3 py-2"><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select></label></div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2"><div className="border-t-2 border-brand pt-4"><p className="text-sm text-steel">Visitas consentidas</p><p className="mt-1 font-display text-4xl font-semibold">{totalVisits}</p></div><div className="border-t-2 border-good pt-4"><p className="text-sm text-steel">Cliques em anúncios</p><p className="mt-1 font-display text-4xl font-semibold">{totalClicks}</p></div></div>
        <div className="mt-8 overflow-x-auto"><table className="w-full min-w-96 text-left text-sm"><thead className="border-b border-line text-steel"><tr><th className="py-3">Página</th><th className="py-3 text-right">Visitas</th><th className="py-3 text-right">Cliques</th></tr></thead><tbody>{rows.map((row) => <tr key={row.path} className="border-b border-line"><td className="py-3">{row.path}</td><td className="py-3 text-right">{row.visits}</td><td className="py-3 text-right">{row.clicks}</td></tr>)}</tbody></table></div>
        <p className="mt-5 text-xs text-steel">Anúncios ainda não estão ativos. O painel mostra no máximo os 10.000 eventos mais recentes do período selecionado.</p>
      </TabsContent>
      <TabsContent value="product" className="mt-8"><ProductMetrics /></TabsContent>
    </Tabs>
  </main>;
}

function ReviewResult({ result }: { result: ContentReviewResult }) {
  return <section aria-live="polite" className="mt-10 border-t border-line pt-7"><h2 className="font-display text-2xl font-semibold">Resultado da avaliação</h2><p className="mt-3 text-sm leading-6 text-steel">{result.summary}</p>
    <div className="mt-6 grid grid-cols-3 gap-3">{([ ["Clareza", result.scores.clarity], ["Utilidade", result.scores.utility], ["Adequação", result.scores.suitability] ] as const).map(([label, score]) => <div key={label} className="border-t-2 border-brand pt-3"><p className="text-xs text-steel">{label}</p><p className="font-display text-2xl font-semibold">{score}<span className="text-sm font-normal text-steel">/100</span></p></div>)}</div>
    <div className="mt-8 grid gap-8 sm:grid-cols-2"><div><h3 className="font-semibold">Pontos fortes</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-steel">{result.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul></div><div><h3 className="font-semibold">Pontos de atenção</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-steel">{result.risks.map((item, index) => <li key={index}>{item}</li>)}</ul></div></div>
    <h3 className="mt-8 font-semibold">Melhorias recomendadas</h3><ol className="mt-3 divide-y divide-line">{result.improvements.map((item, index) => <li key={index} className="py-4"><p className="text-xs font-semibold uppercase text-brand-deep">{item.priority} · {item.page}</p><p className="mt-1 text-sm font-medium">{item.action}</p><p className="mt-1 text-sm text-steel">{item.reason}</p></li>)}</ol>
  </section>;
}