import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTaskBio } from "@/lib/trilha-store";
import { toDateKey } from "@/lib/calendar-utils";
import { nextReviewStage, reinforcementDate } from "@/lib/review";
import type { Block } from "@/lib/trilha-data";

export type ReviewTarget = { date: string; block: Block };

const topicOf = (block: Block) => block.title.replace(/^Revisão:\s*/i, "");

/** Recordar → conferir → veredito. O veredito muda o futuro, não só risca a tarefa. */
export function ReviewSheet({ review, onClose }: { review: ReviewTarget | null; onClose: () => void }) {
  const { trackers, plan, completeReview } = useTaskBio();
  const [step, setStep] = useState<"recall" | "check" | "done">("recall");
  const [verdict, setVerdict] = useState<"lembrei" | "esqueci" | null>(null);

  useEffect(() => {
    setStep("recall");
    setVerdict(null);
  }, [review?.block.id]);

  if (!review) return null;
  const { date, block } = review;
  const learned = trackers.estudos?.find((session) => session.id === block.reviewOf)?.learned?.trim() ?? "";
  const subject = trackers.subjects?.find((item) => item.id === block.subjectId);
  const nextStage = nextReviewStage(block.reviewStage);
  const nextDate = nextStage
    ? Object.entries(plan).find(([, blocks]) => blocks.some((item) => item.id === `rev:${block.reviewOf}:${nextStage}`))?.[0] ?? null
    : null;
  const reinforcedOn = reinforcementDate(date);

  const answer = (value: "lembrei" | "esqueci") => {
    setVerdict(value);
    completeReview(date, block.id, value);
    setStep("done");
  };

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-md">
      {step === "recall" && <>
        <DialogHeader>
          <DialogTitle className="pr-6">{topicOf(block)}</DialogTitle>
          <DialogDescription>{subject ? subject.name : "Revisão"}{block.reviewReinforcement ? " · reforço" : ""}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-steel">Sem olhar, tente lembrar o que você estudou sobre este tópico. Só depois veja suas anotações.</p>
        <Button className="w-full" onClick={() => setStep("check")}>Já tentei lembrar</Button>
      </>}

      {step === "check" && <>
        <DialogHeader>
          <DialogTitle className="pr-6">{topicOf(block)}</DialogTitle>
          <DialogDescription>O que você anotou na sessão</DialogDescription>
        </DialogHeader>
        {learned
          ? <p className="rounded-lg bg-mist p-3 text-sm">{learned}</p>
          : <p className="rounded-lg bg-mist p-3 text-sm text-steel">Você não anotou nada nesta sessão. Na próxima, escreva uma frase do que aprendeu — é isso que você vai revisar.</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => answer("lembrei")}>Lembrei</Button>
          <Button variant="outline" onClick={() => answer("esqueci")}>Esqueci</Button>
        </div>
      </>}

      {step === "done" && <>
        <DialogHeader>
          <DialogTitle className="pr-6">{verdict === "lembrei" ? "Boa, segue o plano" : "Vamos reforçar"}</DialogTitle>
          <DialogDescription>{topicOf(block)}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-steel">{verdict === "lembrei"
          ? nextDate ? `Próxima revisão: ${format(parseISO(nextDate), "d 'de' MMMM", { locale: ptBR })}.` : "Escada concluída para este tópico."
          : `Reforço amanhã, ${format(parseISO(reinforcedOn), "d 'de' MMMM", { locale: ptBR })}.`}</p>
        <Button className="w-full" onClick={onClose}>Concluir</Button>
      </>}
    </DialogContent>
  </Dialog>;
}

/** Cartão da home: a dívida de revisão aparece sozinha, sem gamificação. */
export function ReviewCard() {
  const { plan } = useTaskBio();
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const today = toDateKey(new Date());
  const due = Object.entries(plan)
    .flatMap(([date, blocks]) => blocks.filter((block) => block.review && !block.done && date <= today).map((block) => ({ date, block })))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (due.length === 0) return null;
  const overdue = due.filter((item) => item.date < today).length;
  const todayCount = due.length - overdue;

  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card p-3 ring-1 ring-line">
      <div>
        <p className="text-sm font-semibold">Revisões</p>
        <p className="text-xs text-steel">{todayCount} hoje{overdue > 0 ? ` · ${overdue} vencida${overdue > 1 ? "s" : ""}` : ""}</p>
      </div>
      <Button size="sm" className="h-11" onClick={() => setTarget(due[0] ?? null)}>Revisar</Button>
    </div>
    <ReviewSheet review={target} onClose={() => setTarget(null)} />
  </>;
}
