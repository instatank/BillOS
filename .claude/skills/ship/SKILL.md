---
name: ship
description: BillBud pre-push ship ritual - run before every push that reaches users. Bumps the sw.js VERSION on every shippable change, runs the syntax gate, refuses to push red. Use when about to commit/push user-facing changes, or when the user says "ship it".
---

# /ship — BillBud

Repo-specific config for `playbook/SOP-ship.md` in instatank/time-tracker (read it for the why and the full ordering). Never push red.

1. `git status` + `git diff` — confirm the diff contains only the asked-for change (no bundled fixes).
2. **Cache bump:** on ANY shippable change → bump `const VERSION = "vX.Y.Z"` in `sw.js` by one patch, so installed PWAs evict the old shell. Skip only for docs-only changes.
3. **Gates:** `bash scripts/check.sh` (extracts the inline `<script type="module">` from `index.html` → `node --check`; also checks `sw.js`, `firebase-messaging-sw.js`, `api/*.js`, `functions/*.js`). All must pass.
4. **Silent-failure question** for any new write/scheduled/external path in the diff (PLAYBOOK Rule 4). Any bill write also means re-reading `SYNC.md`.
5. Commit (clear message, cache bump noted) and push.
6. **Deploy surfaces — BillBud specifics:**
   - **Production branch is `claude/design-system`, NOT `main`** (it is the GitHub default branch; Vercel auto-deploys every push to it). Feature work ships by fast-forwarding: `git push origin <feature>:claude/design-system`.
   - **Storage rules, Firestore rules/indexes, and Cloud Functions do NOT deploy via Vercel** — they ship via the `Deploy Firebase` GitHub Action on push to `claude/design-system` (triggered by changes to `functions/**`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`). Confirm the Action goes green.
   - **Vercel's git integration caches the production branch at connect time** — after a default-branch change, disconnect and reconnect the integration or new commits stay "Preview".
7. If user-facing: produce the verify-on-phone checklist (`playbook/SOP-verify-on-phone.md`). State which verification rung you reached; never claim the phone rung.
