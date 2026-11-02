import { createFileRoute } from "@tanstack/react-router";
import { brasiliaDay } from "@/lib/xp";
import { hasActivity, previousWeek, weekStats } from "@/lib/weekly-digest";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Weekly e-mail digest, triggered by cron. Same bearer token as the reminder job.
 * Sends only to people who opted in, had activity in the week and were not sent yet.
 */
export const Route = createFileRoute("/api/public/weekly-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: secret } = await supabaseAdmin.from("push_cron_token").select("token").eq("id", 1).maybeSingle();
        if (!secret || !safeEqual(token, secret.token)) return new Response("Unauthorized", { status: 401 });

        const week = previousWeek(brasiliaDay(new Date()));
        const weekLabel = `${week.start.slice(8, 10)}/${week.start.slice(5, 7)} a ${week.end.slice(8, 10)}/${week.end.slice(5, 7)}`;

        // weekly_digest_sent is newer than the generated Database types.
        const digest = supabaseAdmin as unknown as {
          from: (table: string) => {
            select: (columns: string) => {
              eq: (column: string, value: string) => Promise<{ data: { user_id: string }[] | null; error: { message: string } | null }>;
            };
            insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
          };
        };

        const [{ data: rows }, { data: points }, { data: already }] = await Promise.all([
          supabaseAdmin.from("user_data").select("user_id, plan, settings"),
          supabaseAdmin.from("xp_events").select("user_id, points").gte("day", week.start).lte("day", week.end).eq("legacy", false),
          digest.from("weekly_digest_sent").select("user_id").eq("week_start", week.start),
        ]);

        const xpByUser = new Map<string, number>();
        for (const event of points ?? []) {
          xpByUser.set(event.user_id, (xpByUser.get(event.user_id) ?? 0) + Number(event.points));
        }
        const sentBefore = new Set((already ?? []).map((row) => row.user_id));

        const recipients = new Map<string, { email: string; name: string }>();
        for (let page = 1; page <= 20; page++) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) break;
          const users = data?.users ?? [];
          for (const user of users) {
            if (!user.email) continue;
            const display = typeof user.user_metadata?.["display_name"] === "string" ? String(user.user_metadata["display_name"]) : "";
            recipients.set(user.id, { email: user.email, name: display.split(" ")[0] ?? "" });
          }
          if (users.length < 1000) break;
        }

        const { sendWeeklyDigest } = await import("@/lib/weekly-digest.server");
        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (const row of rows ?? []) {
          const target = recipients.get(row.user_id);
          if (!target || sentBefore.has(row.user_id)) { skipped += 1; continue; }

          const settings = (row.settings ?? {}) as { notifPrefs?: Record<string, boolean> };
          const prefs = settings.notifPrefs ?? {};
          if (prefs["master"] === false || prefs["weekly"] === false) { skipped += 1; continue; }

          const stats = weekStats(row.plan, row.settings, week.keys);
          if (!hasActivity(stats)) { skipped += 1; continue; }

          const result = await sendWeeklyDigest({
            to: target.email,
            name: target.name,
            stats,
            xp: Math.round(xpByUser.get(row.user_id) ?? 0),
            weekLabel,
            siteUrl: "https://taskbio.com.br",
          });

          if (!result.ok) {
            failed += 1;
            console.error("[weekly-digest] send failed:", result.detail ?? "unknown");
            continue;
          }

          const { error } = await digest.from("weekly_digest_sent").insert({ user_id: row.user_id, week_start: week.start });
          if (error) console.error("[weekly-digest] ledger insert failed:", error.message);
          sent += 1;
        }

        return Response.json({ week: week.start, sent, skipped, failed });
      },
    },
  },
});
