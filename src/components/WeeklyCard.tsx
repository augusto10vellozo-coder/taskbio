import { useState } from "react";
import { Crown, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { LeagueMember } from "@/lib/use-league";

type Data = { me: LeagueMember | null; position: number; friends: number; days: boolean[]; label: string; champion?: boolean };

/** Draws the shareable weekly summary. Only XP, streak, position and marked days — never health data. */
function draw(d: Data) {
  const c = document.createElement("canvas");
  c.width = 1080; c.height = 1350;
  const g = c.getContext("2d")!;
  const mint = "#7FE0C2", coral = "#FF7A59";
  g.fillStyle = "#1A1A1A"; g.fillRect(0, 0, 1080, 1350);
  const gold = mint; // champion accent uses mint on dark card
  if (d.champion) {
    g.strokeStyle = gold; g.lineWidth = 12; g.strokeRect(30, 30, 1020, 1290);
    g.fillStyle = gold; g.beginPath(); // crown
    ([[820, 190], [820, 110], [870, 150], [910, 90], [950, 150], [1000, 110], [1000, 190]] as const).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath(); g.fill();
  }
  g.fillStyle = d.champion ? gold : "#FFFFFF"; g.font = "600 44px Manrope, sans-serif"; g.fillText(d.champion ? "Campeão da semana" : "Minha semana no TaskBio", 80, 150);
  g.fillStyle = "#9CA3AF"; g.font = "32px Manrope, sans-serif"; g.fillText(d.label, 80, 205);
  const stat = (y: number, label: string, value: string, color: string) => {
    g.fillStyle = "#9CA3AF"; g.font = "30px Manrope, sans-serif"; g.fillText(label, 80, y);
    g.fillStyle = color; g.font = "700 110px Manrope, sans-serif"; g.fillText(value, 80, y + 115);
  };
  stat(330, "Conclusão da semana", d.me?.week_pct == null ? "—" : `${Math.round(d.me.week_pct * 100)}%`, mint);
  stat(560, "Sequência", `${d.me?.streak ?? 0} dias`, coral);
  stat(790, "Posição na liga", d.friends > 1 && d.position ? `${d.position}º de ${d.friends}` : "—", d.champion ? gold : "#FFFFFF");
  g.fillStyle = "#9CA3AF"; g.font = "30px Manrope, sans-serif"; g.fillText("Dias marcados", 80, 1030);
  ["D", "S", "T", "Q", "Q", "S", "S"].forEach((l, i) => {
    const x = 80 + i * 132;
    g.fillStyle = d.days[i] ? mint : "#2E2E2E"; g.beginPath(); g.roundRect(x, 1060, 110, 110, 22); g.fill();
    g.fillStyle = d.days[i] ? "#1A1A1A" : "#9CA3AF"; g.font = "600 34px Manrope, sans-serif"; g.fillText(l, x + 43, 1128);
  });
  g.fillStyle = mint; g.font = "700 36px Manrope, sans-serif"; g.fillText("TaskBio", 80, 1280);
  g.fillStyle = "#9CA3AF"; g.font = "32px Manrope, sans-serif"; g.fillText("taskbio.com.br", 760, 1280);
  return c;
}

export function WeeklyCard(props: Data) {
  const [busy, setBusy] = useState(false);
  async function share() {
    setBusy(true);
    try {
      const blob = await new Promise<Blob | null>((r) => draw(props).toBlob(r, "image/png"));
      if (!blob) throw new Error();
      const file = new File([blob], "taskbio-semana.png", { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: props.champion ? "Fui campeão da semana no TaskBio 🏆 — taskbio.com.br" : "Minha semana no TaskBio — taskbio.com.br" }).catch(() => undefined);
      else toast.success("Imagem baixada");
    } catch { toast.error("Não foi possível gerar o card."); }
    finally { setBusy(false); }
  }
  return (
    <section className={`rounded-lg bg-card p-4 ring-1 ${props.champion ? "ring-2 ring-brand" : "ring-line"}`}>
      <p className="text-xs font-medium text-steel">{props.champion ? <span className="mr-1 inline-flex items-center gap-1 font-semibold text-brand"><Crown className="size-3.5" /> Campeão da semana ·</span> : null}Card da semana passada · {props.label}</p>
      <p className="mt-1 text-sm">{props.me?.week_pct == null ? "—" : `${Math.round(props.me.week_pct * 100)}%`} de conclusão · sequência {props.me?.streak ?? 0} · {props.days.filter(Boolean).length} dias marcados{props.friends > 1 && props.position ? ` · ${props.position}º na liga` : ""}</p>
      <Button className="mt-3" size="sm" onClick={share} disabled={busy}><Share2 /> Compartilhar</Button>
    </section>
  );
}
