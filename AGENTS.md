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

## Architecture rules
- AI calls live in `src/lib/ai.server.ts` (server-only) and are exposed via auth-protected server functions in `src/lib/ai.functions.ts` — keeps the AI key and prompts off the browser.
- AI prompts must forbid inventing missing details (use [placeholders] / null) — product requirement for accuracy.
- Signed-in pages live under `src/routes/_authenticated/` and share `AppShell` — one gate and one nav for the whole app.
- User data tables (tasks, emails, meeting_summaries) are row-scoped to `auth.uid()` via RLS — data stays private per account.
