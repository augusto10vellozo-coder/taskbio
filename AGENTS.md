<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Ad monetization remains inactive until an approved AdSense publisher ID and privacy/consent setup are provided; public informational routes stay accessible without login so site reviewers can inspect the service without exposing user data.

Ad components must use the centralized display-mode guard: browser ads are allowed only in regular browser tabs and remain blocked in installed PWA, iOS home-screen, and native app containers. This prevents future web monetization from leaking into the app experience.

Public analytics uses opt-in browser consent and stores only event type, known public path, optional ad slot, and timestamp; admin-only RLS protects reports and editorial reviews. This avoids collecting visitor identity or health data.

Content reviews run only from an authenticated, server-verified admin function; the AI key and model call stay server-only to prevent unauthorized spending.

Agenda and Alimentação share dated blocks; legacy duplicates keep food-bearing IDs, while plannedMeal bypasses merging and retains its snapshot through same-ID consumption. Copy helpers reset execution atomically; shopping reads pending snapshots by period only on explicit generation and tracks origin separately. Why: preserves predictions, XP integrity and manual carts.

Food totals use the shared meal-summary resolver for catalog and manual blocks; missing nutrition stays unknown instead of being inferred, and display-only accent corrections preserve stored user data.

The legacy `/rotina` address redirects to the main agenda at `/`; this keeps old links and saved browser addresses working.

Home-screen installation uses a web app manifest without app-shell caching; this preserves installability without stale preview or deployment caches.

Navigation uses the registry-driven fixed BottomNav below the desktop-header breakpoint; sync and consent overlays sit above it so every enabled module stays reachable without obstructed controls.

Module screens use the shared ModuleHeader for their primary title and history-back control with a direct-entry fallback to Modules; back navigation belongs to the screen, never the global brand header.

All copy a visitor can see stays in Brazilian Portuguese, and authentication failures are surfaced through the shared pt-BR message helper instead of the backend's raw text, so no English reaches users on any screen.
- Optional app modules are declared in src/lib/modules.ts; nav, home shortcuts and settings read that registry so new modules need no refactor.
- Workout plan import extracts document text and photo OCR in lazy-loaded browser modules; only text reaches authenticated interpretation functions. Photo results keep nullable fields until corrected before entering the unchanged document validation, so images stay on-device and absent values are never defaulted.
- Photo review separates unquantified preparation/instruction rows into transient notes before marking uncertain exercises; the existing document validator receives exercises only. Why: notes must not create mandatory numeric fields or change PDF/storage behavior.
- Execution shares dated series stored inside synced workout exercises; the rest timer uses account-scoped local deadlines, while spreadsheet parsing is browser-only and nullable until the existing review. Why: independent checks survive reload, timers survive navigation, and imports never invent missing prescriptions.
- Workouts without templateId are models ("Meus treinos"); scheduling always copies the model with templateId so week edits never alter it, and progression links by exercise name. /atividades redirects to /treino?aba=explorar. Exercise performance is persisted independently on set registration in the synced exerciseLog; the resolver also reads legacy partial sets and sessions, never inferring execution from a planned exercise.
- Agenda summaries derive from the shared plan via agendaSummary; week clearing is isolated in WeekActions with two explicit confirmation steps so summaries cannot drift and accidental clicks cannot delete a week.
- Agenda push uses push-sw.js without caching and the existing five-minute cron with DB-only bearer authentication; foreground/login silently renews device subscriptions. Why: closed apps receive reminders without stale app caches.
- XP is awarded only by the recordXp server function (Brasília day, points decided server-side) into xp_events, which clients can read but not write; league/friend data for others is exposed only via SECURITY DEFINER functions returning XP and counts, never health data. Why: prevents point tampering and health-data leaks.
- League awards (weekly win, streak freezes) are recorded only by the claim_league_awards SECURITY DEFINER function into read-only tables; titles, trophy and monthly badges are derived from rankings/wins in src/lib/xp.ts. Why: rewards cannot be forged by the browser.
- League membership is the connected group of accepted friendships, resolved by league_week_for; league_week scopes it to auth.uid() and the push cron uses the service-only resolver. Why: every participant, award and notification must use the same ranking without granting access to private health records.
- Notification rules stay in push-reminders.ts; service-only delivery jobs/attempts track acceptance per subscription with atomic daily layer budgets and same-day retries rebuilt from original due instants, never persisted message content. All layers obey local quiet hours and synced notifPrefs (including exams); legacy timers are disabled. Bonus XP remains unique by user/ref. Why: delivery failures cannot masquerade as success or duplicate XP.
- Reading (books, quotes, goal) and study (subjects, exams, pomodoro) data live in the synced trackers payload; book search runs in the browser, legacy study titles migrate to subjects client-side, exam reminders come from dueSettingsReminders, and session XP uses recordXp kinds "reading"/"study". Why: one synced store and server-decided points.
