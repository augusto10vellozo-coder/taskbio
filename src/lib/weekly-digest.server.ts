import type { WeekStats } from "./weekly-digest";

const BRAND = "#1E4D3B";
const INK = "#1C1B19";
const STEEL = "#6B6862";

const card = (row: string) =>
  `<td width="25%" style="padding:0 4px;"><div style="background:#F4F3EF;border-radius:12px;padding:14px 10px;text-align:center;">${row}</div></td>`;

const number = (value: number, label: string) =>
  `<div style="font-size:26px;font-weight:700;color:${BRAND};line-height:1.1;">${value}</div><div style="font-size:11px;color:${STEEL};margin-top:4px;">${label}</div>`;

/** Plain HTML with inline styles so it survives Gmail and Outlook. */
export function weeklyDigestHtml(input: { name: string; stats: WeekStats; xp: number; weekLabel: string; siteUrl: string }) {
  const { name, stats, xp, weekLabel, siteUrl } = input;
  const hello = name ? `${name}, ` : "";
  const headline = stats.daysActive >= 5 ? "Semana forte." : stats.daysActive >= 2 ? "Boa semana." : "Uma nova semana começa.";

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#F4F3EF;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EF;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;overflow:hidden;">
          <tr><td style="background:${BRAND};padding:20px 28px;">
            <span style="color:#FFFFFF;font-size:18px;font-weight:700;">TaskBio</span>
            <span style="color:#BFD6C8;font-size:12px;display:block;margin-top:2px;">organização de vida saudável</span>
          </td></tr>
          <tr><td style="padding:30px 28px 6px 28px;">
            <h1 style="margin:0 0 6px 0;font-size:22px;line-height:1.3;color:${INK};">${headline}</h1>
            <p style="margin:0 0 22px 0;font-size:15px;line-height:1.6;color:#4A4742;">${hello}sua semana de ${weekLabel} no TaskBio.</p>
          </td></tr>
          <tr><td style="padding:0 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              ${card(number(stats.daysActive, "dias ativos"))}
              ${card(number(stats.workouts, "treinos"))}
              ${card(number(stats.habits, "hábitos"))}
              ${card(number(stats.meals, "refeições"))}
            </tr></table>
          </td></tr>
          <tr><td style="padding:22px 28px 4px 28px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#4A4742;">
              Você concluiu <strong>${stats.done} de ${stats.planned}</strong> itens planejados e somou <strong>${xp} XP</strong> na semana.
            </p>
          </td></tr>
          <tr><td style="padding:22px 28px 8px 28px;">
            <a href="${siteUrl}/progresso" style="display:inline-block;background:${BRAND};color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">Ver meu progresso</a>
          </td></tr>
          <tr><td style="padding:20px 28px 28px 28px;border-top:1px solid #E7E5DF;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:${STEEL};">
              Este resumo é enviado aos domingos para quem tem a opção ativa.
              <a href="${siteUrl}/perfil" style="color:${BRAND};">Desativar no perfil</a>.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Sends one digest through Resend. Returns false when the provider rejects it. */
export async function sendWeeklyDigest(input: {
  to: string;
  name: string;
  stats: WeekStats;
  xp: number;
  weekLabel: string;
  siteUrl: string;
}): Promise<{ ok: boolean; detail?: string }> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return { ok: false, detail: "missing RESEND_API_KEY" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "TaskBio <resumo@taskbio.com.br>",
      to: [input.to],
      subject: `Sua semana: ${input.stats.daysActive} ${input.stats.daysActive === 1 ? "dia ativo" : "dias ativos"} no TaskBio`,
      html: weeklyDigestHtml(input),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false, detail: detail.slice(0, 200) };
  }
  return { ok: true };
}
