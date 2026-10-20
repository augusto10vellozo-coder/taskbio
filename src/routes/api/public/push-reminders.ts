import { createFileRoute } from "@tanstack/react-router";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { dueDayComplete, dueLeagueMove, dueStreakMilestone, dueWeeklySummary, dueDayClose, dueLeagueOpen, dueMealReminders, dueReminders, dueSettingsReminders, dueStreakRisk, inQuietHours, readNotifPrefs, wallClockMs } from "@/lib/push-reminders";
import { VAPID_PUBLIC_KEY } from "@/lib/push-config";
import { canDeliver, deliveryResult, reminderLayer, transientFailure } from "@/lib/push-delivery";
import { mealSummary } from "@/lib/meal-summary";
import { MEALS } from "@/lib/trilha-data";
import type { Block, Meal } from "@/lib/trilha-data";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/push-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        if (!token) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: secret } = await supabaseAdmin.from("push_cron_token").select("token").eq("id", 1).maybeSingle();
        if (!secret || !safeEqual(token, secret.token)) return new Response("Unauthorized", { status: 401 });

        const privateKey = process.env["VAPID_PRIVATE_KEY"];
        if (!privateKey) return new Response("Server configuration error", { status: 500 });
        const vapid = { subject: "mailto:contatotaskbio@gmail.com", publicKey: VAPID_PUBLIC_KEY, privateKey };

        const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth, timezone").eq("active", true);
        if (!subs?.length) return Response.json({ sent: 0 });
        const userIds = [...new Set(subs.map((s) => s.user_id))];
        const { data: rows } = await supabaseAdmin.from("user_data").select("user_id, plan, meals, settings").in("user_id", userIds);
        const executionNow = new Date();
        const { data: pendingJobs, error: jobsError } = await supabaseAdmin.from("push_delivery_jobs").select("*").eq("status", "pending").lt("attempts", 3).in("subscription_id", subs.map(s => s.id));
        if (jobsError) return new Response("Delivery storage unavailable", { status: 503 });
        const now = executionNow;
        const todaySp = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const lastWeekStart = (() => { const d = new Date(`${todaySp}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - d.getUTCDay() - 7); return d.toISOString().slice(0, 10); })();
        const thisWeekStart = (() => { const d = new Date(`${todaySp}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); })();
        const checkLeague = now.getUTCMinutes() % 15 === 0;
        const [{ data: xpRows }, { data: freezeRows }, { data: winRows }, { data: profileRows }, { data: posRows }] = await Promise.all([
          supabaseAdmin.from("xp_events").select("user_id, points").in("user_id", userIds).eq("day", todaySp),
          supabaseAdmin.from("streak_freezes").select("user_id, day").in("user_id", userIds),
          supabaseAdmin.from("league_wins").select("user_id").in("user_id", userIds),
          supabaseAdmin.from("profiles").select("id, display_name").in("id", userIds),
          supabaseAdmin.from("league_positions").select("user_id, position").in("user_id", userIds).eq("week_start", thisWeekStart),
        ]);
        const nameBy = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]));
        const posBy = new Map((posRows ?? []).map((p) => [p.user_id, p.position]));
        const todayXp = new Map<string, number>();
        for (const e of xpRows ?? []) todayXp.set(e.user_id, (todayXp.get(e.user_id) ?? 0) + e.points);
        const freezesBy = new Map<string, string[]>();
        for (const f of freezeRows ?? []) freezesBy.set(f.user_id, [...(freezesBy.get(f.user_id) ?? []), f.day]);
        const winsBy = new Map<string, number>();
        for (const w of winRows ?? []) winsBy.set(w.user_id, (winsBy.get(w.user_id) ?? 0) + 1);
        let sent = 0;

        for (const row of rows ?? []) {
          const userSubs = subs.filter((s) => s.user_id === row.user_id);
          const tz = userSubs[0]?.timezone ?? "America/Sao_Paulo";
          const settings = row.settings && typeof row.settings === "object" && !Array.isArray(row.settings) ? row.settings as Record<string, unknown> : {};
          const prefs = readNotifPrefs(settings);
          const frozenDays = freezesBy.get(row.user_id) ?? [];
          const freezesAvailable = Math.max(0, (winsBy.get(row.user_id) ?? 0) - frozenDays.length);
          const scheduled: { key: string; title: string; body: string; url: string; tag?: string; bonus?: number }[] = [];
          const userMeals = [...MEALS, ...(Array.isArray(row.meals) ? row.meals as unknown as Meal[] : [])];
          const getMeal = (id?: string) => userMeals.find((m) => m.id === id);
          const instants = [executionNow, ...Array.from(new Set((pendingJobs ?? []).filter(j => j.user_id === row.user_id && j.day === new Date(wallClockMs(executionNow, tz)).toISOString().slice(0, 10)).map(j => j.due_at))).map(d => new Date(d))];
          for (const now of instants) {
          if (!inQuietHours(wallClockMs(now, tz))) {
            const habitInput = { plan: row.plan, habitLog: settings["habitLog"], habits: settings["habits"], frozenDays };
            if (prefs.streak) {
              scheduled.push(...dueStreakRisk({ ...habitInput, freezesAvailable, name: nameBy.get(row.user_id) ?? "" }, tz, now));
              scheduled.push(...dueStreakMilestone({ ...habitInput, todayXp: todayXp.get(row.user_id) ?? 0 }, tz, now));
            }
            if (prefs.dayClose) scheduled.push(...dueDayComplete(row.plan, tz, now));
            if (prefs.weekly) scheduled.push(...dueWeeklySummary({ plan: row.plan, habitLog: settings["habitLog"], kcalFor: (blocks) => mealSummary(blocks as Block[], getMeal).kcal }, tz, now));
            if (prefs.dayClose) scheduled.push(...dueDayClose(row.plan, todayXp.get(row.user_id) ?? 0, tz, now));
            if (prefs.meals) scheduled.push(...dueMealReminders(row.plan, tz, now));
            if (prefs.league) {
              // Query only when the layer is due; use the exact same group and ranking as the app.
              if (dueLeagueOpen(1, tz, now).length) {
                const { data: ranked, error } = await supabaseAdmin.rpc("league_week_for", { _start: lastWeekStart, _user_id: row.user_id });
                if (!error && ranked && ranked.length >= 2) {
                  const pos = ranked.findIndex((r) => r.user_id === row.user_id) + 1;
                  if (pos > 0) scheduled.push(...dueLeagueOpen(pos, tz, now));
                }
              }
              if (checkLeague) {
                const { data: ranked } = await supabaseAdmin.rpc("league_week_for", { _start: thisWeekStart, _user_id: row.user_id });
                if (ranked && ranked.length >= 2 && (ranked[0]?.week_xp ?? 0) > 0) {
                  const idx = ranked.findIndex((r) => r.user_id === row.user_id);
                  if (idx >= 0) {
                    const pos = idx + 1;
                    const prev = posBy.get(row.user_id) ?? null;
                    const leader = pos > 1 ? { name: (ranked[0]?.display_name ?? ""), xpGap: (ranked[0]?.week_xp ?? 0) - (ranked[idx]?.week_xp ?? 0) } : null;
                    scheduled.push(...dueLeagueMove(prev, pos, leader, tz, now));
                    if (prev !== pos) await supabaseAdmin.from("league_positions").upsert({ user_id: row.user_id, week_start: thisWeekStart, position: pos, updated_at: now.toISOString() });
                  }
                }
              }
            }
          }
          scheduled.push(...dueReminders(row.plan, tz, now, prefs), ...dueSettingsReminders(row.settings, tz, now, prefs));
          }
          const unique = new Map(scheduled.map(r => [r.key, r]));
          const localDay = new Date(wallClockMs(executionNow, tz)).toISOString().slice(0, 10);
          for (const reminder of unique.values()) {
            const blockId = reminder.key.split("|")[1];
            const blocks = Object.values(row.plan as Record<string, Block[]>).flat();
            const layer = reminderLayer(reminder.key, blocks.some(b => b.id === blockId && b.kind === "treino"));
            // Preserve the existing bonus independently of device retries (XP ref is unique).
            if (reminder.bonus && canDeliver(layer, prefs, tz, executionNow)) await supabaseAdmin.from("xp_events").upsert({ user_id: row.user_id, kind: "bonus", ref: `bonus:${reminder.key}`, day: todaySp, points: reminder.bonus }, { onConflict: "user_id,kind,ref", ignoreDuplicates: true });
            const body = reminder.body ? `${reminder.url === "/financas" ? "💰" : reminder.url === "/saude" ? "💊" : "📅"} ${reminder.title} · ${reminder.body}` : reminder.title;
            const tag = reminder.tag ?? `agenda-${reminder.key}`;
            for (const sub of userSubs) {
              if (!canDeliver(layer, prefs, sub.timezone, executionNow)) continue;
              const pending = (pendingJobs ?? []).find(j => j.subscription_id === sub.id && j.reminder_key === reminder.key);
              if (pending && pending.day !== localDay) continue;
              const { error: enqueueError } = await supabaseAdmin.from("push_delivery_jobs").upsert({ user_id: row.user_id, subscription_id: sub.id, reminder_key: reminder.key, layer, day: localDay, due_at: pending?.due_at ?? executionNow.toISOString() }, { onConflict: "subscription_id,reminder_key", ignoreDuplicates: true });
              if (enqueueError) continue;
              const { data: job } = await supabaseAdmin.from("push_delivery_jobs").select("*").eq("subscription_id", sub.id).eq("reminder_key", reminder.key).single();
              if (!job) continue;
              const { data: claimed } = await supabaseAdmin.rpc("claim_push_delivery", { _id: job.id });
              if (!claimed) continue;
              let status: number | undefined;
              try {
                const payload = await buildPushPayload(
                  { data: JSON.stringify({ title: "TaskBio", body, url: reminder.url, tag }), options: { ttl: 900, urgency: "high" } },
                  { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } }, vapid,
                );
                const res = await fetch(sub.endpoint, { ...payload, signal: AbortSignal.timeout(5000) });
                status = res.status;
              } catch { /* Technical failure only; never log subscription credentials or payload. */ }
              const result = deliveryResult(status);
              const reason = result === "invalid" ? "expired_subscription" : result === "failed" ? (status === undefined ? "network_timeout" : `http_${status}`) : null;
              const { error: logError } = await supabaseAdmin.from("push_delivery_attempts").insert({ user_id: row.user_id, subscription_id: sub.id, reminder_key: reminder.key, layer, attempted_at: executionNow.toISOString(), result, http_status: status ?? null, reason });
              if (logError) console.error("Push telemetry write failed");
              await supabaseAdmin.from("push_delivery_jobs").update({ status: result === "failed" && transientFailure(status) && job.attempts + 1 < 3 ? "pending" : result, lease_until: null }).eq("id", job.id);
              if (result === "invalid") await supabaseAdmin.from("push_subscriptions").update({ active: false, inactive_reason: reason }).eq("id", sub.id);
              if (result === "delivered") {
                sent++;
                await supabaseAdmin.from("push_sent").upsert({ user_id: row.user_id, reminder_key: reminder.key }, { onConflict: "user_id,reminder_key", ignoreDuplicates: true });
              }
            }
          }
        }
        await supabaseAdmin.from("push_sent").delete().lt("sent_at", new Date(Date.now() - 3 * 86400000).toISOString());
        return Response.json({ sent });
      },
    },
  },
});
