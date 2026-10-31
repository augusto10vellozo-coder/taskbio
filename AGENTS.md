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

Subdirectories have their own AGENTS.md (workout rules live in src/AGENTS.md); read them before changing files there.

Ads stay inactive until an approved AdSense ID and consent exist, and use the centralized display-mode guard: regular browser tabs only, blocked in installed PWA/iOS/native containers. Public info routes need no login so reviewers can inspect without user data.

Public analytics uses opt-in browser consent and stores only event type, known public path, optional ad slot and timestamp; admin-only RLS protects reports. Content reviews run only from an authenticated server-verified admin function; the AI key stays server-only. Why: no visitor identity/health data, no unauthorized spending.

Agenda/Alimentação share dated blocks and atomic same-ID confirmation/undo without XP; meal-planning owns timestamps and recorded-state selectors. Legacy merges keep food-bearing IDs; plannedMeal retains its snapshot. Copy resets execution; shopping reads pending snapshots only on explicit generation, tracking origin. Food totals use meal-summary; absent nutrition stays unknown and fixes never change stored data. Why: preserves predictions, single records and manual carts.

`/rotina` is the Rotina module hub (groups Corpo/Mente/Casa); the bottom nav has 4 fixed items (Hoje, Rotina, Progresso, Perfil) and module URLs highlight the Rotina tab. Home-screen install uses a manifest without caching to avoid stale deployments.

Navigation uses the registry-driven fixed BottomNav below the desktop-header breakpoint; sync and consent overlays sit above it so every module stays reachable without obstructed controls.

Module screens use the shared ModuleHeader for their primary title and history-back control with a direct-entry fallback to Modules; back navigation belongs to the screen, never the global brand header.

Visible copy stays pt-BR; auth failures use the shared pt-BR message helper, never raw backend text.
- Optional app modules are declared in src/lib/modules.ts; nav, home shortcuts and settings read that registry so new modules need no refactor.
- Agenda dates stick at top 0 and compact on scroll; measured height protects form scrolling and the FAB stays above BottomNav. Shared summaries and two-confirmation WeekActions remain unchanged.
- Agenda push uses push-sw.js without caching and the five-minute cron with DB-only bearer auth; foreground/login silently renews device subscriptions. Why: closed apps receive reminders without stale app caches.
- League score is the weekly mean of daily completion from the server-only day_plan_counts (active modules, stored data; the browser never sends counts); legacy xp_events rows are flagged and replaced by one opening-balance event. Weekly wins (% then routine streak; full ties share) and the day-complete bonus (user_data trigger) are recorded only by claim_league_awards into read-only tables; the league grants no freezes; titles/trophy/badges derive from src/lib/xp.ts. Membership uses accepted-friend groups via league_week_for; league_week scopes auth.uid(), cron uses service-only access. Missing self uses owner profile/XP reads outside ranked rows/awards. Why: rewards cannot be forged by the browser; private self-visibility, unchanged competition.
- Notification rules stay in push-reminders.ts; service-only delivery jobs/attempts track acceptance per subscription with atomic daily layer budgets and same-day retries rebuilt from original due instants, never persisted message content. All layers obey local quiet hours and synced notifPrefs (including exams); legacy timers are disabled. Bonus XP remains unique by user/ref. Why: delivery failures cannot masquerade as success or duplicate XP.
- Reading/study use synced trackers and daily-locked service XP RPCs by session. Reading completes Agenda blocks atomically. StudyTimerProvider above Outlet persists account deadlines; normalization remaps history. dueSettingsReminders handles exams.
- Habits keep weekly caps/serialized XP reversals; server freeze ledger/trigger and Brasília midnight job own gains/uses/refunds and notices, never habitLog/XP/global streak/league. Why: protect individual streaks only.
- Progress/Saúde share cached progress_entries; owner RPC updates daily weight, duplicates stay archived. Dose helpers serve UI/cron by date/time without XP.
- XP is decided server-side (Brasília day) and written only via the grant_xp/revoke_xp DB functions (idempotent by ref, daily cap, bonus/opening exempt); a trigger rejects other xp_events writes. Weights live in src/lib/xp.ts, mirrored in habit/reading/study RPCs. Others' league data comes only from SECURITY DEFINER functions, never health data. Why: one tamper-proof ledger without health leaks.
- Theming: all colors are CSS tokens in src/styles.css scoped by :root/[data-theme="light"] and .dark/[data-theme="dark"]; components never use literal colors. ThemeProvider (src/lib/theme-context.tsx) sets the .dark class and data-theme, persists to localStorage "trilha:theme" and profiles.preferences.theme via src/lib/theme-preference.ts; an inline script in __root.tsx applies the stored theme before first paint. First-access choice lives in src/components/ThemeOnboarding.tsx, shown once when no theme is stored. Why: theme swaps change token values only, and the saved theme applies without flashing.
