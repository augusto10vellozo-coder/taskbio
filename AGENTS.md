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

The legacy `/rotina` address redirects to the main agenda at `/`; this keeps old links and saved browser addresses working.
