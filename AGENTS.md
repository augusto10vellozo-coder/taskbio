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

Manual food entries are stored as dated meal blocks inside the existing plan payload; this preserves offline use and account synchronization without a parallel food-log store.

Food totals use the shared meal-summary resolver for catalog and manual blocks; missing nutrition stays unknown instead of being inferred, and display-only accent corrections preserve stored user data.

The legacy `/rotina` address redirects to the main agenda at `/`; this keeps old links and saved browser addresses working.

Home-screen installation uses a web app manifest without app-shell caching; this preserves installability without stale preview or deployment caches.

Mobile navigation lives in a fixed bottom bar (src/components/BottomNav.tsx) with the first enabled modules plus a "Mais" menu, and AppHeader keeps desktop links plus a mobile back button; this keeps every main area reachable from any screen without a scrollable top bar.

All copy a visitor can see stays in Brazilian Portuguese, and authentication failures are surfaced through the shared pt-BR message helper instead of the backend's raw text, so no English reaches users on any screen.
- Optional app modules are declared in src/lib/modules.ts; nav, home shortcuts and settings read that registry so new modules need no refactor.
- Workout plan import extracts text in the browser (PDF/DOCX/XLSX/CSV) and sends only text to an authenticated server function that calls the AI model; files never leave the device.
- Workouts without templateId are models ("Meus treinos"); scheduling always copies the model with templateId so week edits never alter it, and progression links by exercise name. /atividades redirects to /treino?aba=explorar.
- Agenda summaries derive from the shared plan via agendaSummary; week clearing is isolated in WeekActions with two explicit confirmation steps so summaries cannot drift and accidental clicks cannot delete a week.
- Agenda push reminders: public/push-sw.js (no caching) + push_subscriptions; a per-minute pg_cron call to /api/public/push-reminders, authenticated by a DB-only token in push_cron_token, sends Web Push with VAPID (private key server secret). Why: reminders must reach closed apps, including iOS home-screen installs.
- XP is awarded only by the recordXp server function (Brasília day, points decided server-side) into xp_events, which clients can read but not write; league/friend data for others is exposed only via SECURITY DEFINER functions returning XP and counts, never health data. Why: prevents point tampering and health-data leaks.
- League awards (weekly win, streak freezes) are recorded only by the claim_league_awards SECURITY DEFINER function into read-only tables; titles, trophy and monthly badges are derived from rankings/wins in src/lib/xp.ts. Why: rewards cannot be forged by the browser.
