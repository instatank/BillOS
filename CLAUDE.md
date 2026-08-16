# CLAUDE.md — BillBud

Project context for Claude Code sessions. Source of truth for *how* we build, not *what* we build (that's the PRD).

The product was previously named BillOS. References to that name in the historical product docs (`BillOS_PRD.md`, `BillOS_MVP_Shell_Prompt.md`) and reference design files (`billos-*.jsx`) have not been renamed — they're frozen artefacts.

## Shared playbook (cross-project — read at session start)

The single source of truth for global working rules, transferable lessons, and the
ship / sync / deploy / verify SOPs is the **`playbook/` folder of the
`instatank/time-tracker` repo**. Every session: read `playbook/PLAYBOOK.md` —
locally at `/home/user/time-tracker/playbook/PLAYBOOK.md` if that repo is cloned,
else fetch it via the GitHub tools (`get_file_contents`, repo `instatank/time-tracker`,
path `playbook/PLAYBOOK.md`). Before ending a session that shipped commits, run the
**`/wrap`** skill (a Stop hook nudges once if forgotten) — it reconciles
`SESSION_HANDOFF.md` against reality, appends friction cards to `LEARNINGS.md`, and
asks the founder the two learning questions from `playbook/LEARNING_METHOD.md`.
The pre-push ritual is the **`/ship`** skill.

## Read-first
- `SESSION_HANDOFF.md` — current state of the build + what's next. Read this FIRST.
- `PRODUCT_BUILD_SOP.md` — build philosophy, mistakes-to-avoid, decision principles
- `BillOS_PRD.md` — V1 product vision and scope
- `BillOS_MVP_Shell_Prompt.md` — Phase 3 build plan (the 7 sub-tasks)
- `SYNC.md` — sync model, concurrency rules, cross-user test gate. Read before touching any bill write.

## Stack (locked for MVP Shell)
- Single `index.html` with inline CSS/JS — no build step, no frameworks
- Firebase Auth (Google) + Firestore via CDN modules
- PWA via `manifest.json` + `sw.js`
- Vercel for hosting

## Deployment
- Production branch: `claude/design-system` (GitHub default branch).
  Vercel deploys this as production automatically on every push — no
  manual promote step. To ship a change, just commit + push to this
  branch.
- The other working branch `claude/product-build-sop-xaE1E` is a
  historical/comparison branch and is NOT deployed.
- If Vercel still shows new commits as "Preview" after a default-branch
  switch on GitHub, disconnect and reconnect the Git integration in
  Vercel (Settings → Git → Disconnect, then re-link the repo) — Vercel
  caches the production branch at connect time and only re-reads it on
  re-connect.

## Hard rules
- Do NOT exceed MVP Shell scope. Out-of-scope ideas → write to `PHASE_2.md` and keep moving.
- One sub-task at a time. Confirm with AA before starting the next.
- Read source first when unsure — don't assume structures.
- Mom test before marking a sub-task done: could a non-technical user do this without help?
- Commit after each sub-task with a clear message; push to the branch.

## India conventions (non-negotiable)
- Currency `₹`, Indian comma grouping (`₹1,00,000`)
- Dates: `DD MMM YYYY`
- Timezone: `Asia/Kolkata`

## Wrap-up rituals
- `summarize takeaways` — quick: what was built, what's next
- `wrap and teach` — deep: write learnings to `LEARNINGS.md` (created when first invoked)
- Always commit and push at session end

## Calendar
- Month-scoped feed + month stepper in the header (‹ Mon › + tap-to-jump-to-today), pinned Overdue section, "No due date" section in the current month, month-end spillover ("Coming up · early <NextMonth>").
- A list/calendar view toggle + calendar-grid view existed briefly but was removed (11 May 2026) — the grid layout didn't earn its keep. List is the only home view now. Could revisit later; see git history for the implementation.

## Sub-task progress
- [x] 1. Scaffold — `index.html`, `manifest.json`, `sw.js`, dark theme, Firebase init via CDN
- [x] 2. Auth flow — Google sign-in popup, signed-in card (avatar/name/email), sign-out, persistence, friendly error banner
- [x] 3. Household creation + invite — create/join, 6-digit code, 24h expiry, regenerate, copy/share, real-time listener, Firestore rules
- [x] 4. Add bill form — 3 required (name, amount, frequency) + 2 optional (category, next due), validation, IST date anchoring, Firestore write
- [x] 5. List view — Stack feed, filter chips, real-time onSnapshot, light/dark theming via prefers-color-scheme, full-screen Add Bill modal
- [x] 6. Detail view — hero + KV card + pause/cancel/reactivate actions; tap card opens detail; Edit re-uses Add Bill modal pre-populated
- [ ] 7. PWA polish + Vercel deploy (icons, caching, live URL)

## Design system (integrated 8 May 2026)
- Source of truth: `BillOS Prototype.html` and the `billos-*.jsx` reference files at the repo root (untouched).
- Stack direction: rich card feed home, no tab bar, full-screen modal for add bill, modal for detail.
- Light is daytime default (cream + deep green); dark flips to deep olive + lime via `prefers-color-scheme`.
- Fonts: Bricolage Grotesque for display/numbers, Geist for body — loaded from Google Fonts.
- Field names migrated: `freq` (not `frequency`), `cat` (not `category`). Reads include backward-compat fallback for sub-task 4 bills.

## Attachments & AI extraction (Phase 1 + 2 — shipped)
- **Receipts (Phase 1).** One receipt (image or PDF) per bill. Firebase Storage at `households/{hid}/bills/{billId}/{attId}.{ext}`; bill doc carries `attachments[]` (0–1 items). Rules in `storage.rules` (household membership) — **deploy separately** with `firebase deploy --only storage` (Vercel does NOT deploy them). Full design + iOS gotchas: `PHASE_1.md`.
- **AI extraction (Phase 2).** "AI Auto Extract" reads the receipt and pre-fills the Add/Edit form via the Vercel serverless function `api/extract.js` (Claude **Sonnet 4.6**, vision + structured output). API key lives in Vercel env `ANTHROPIC_API_KEY` — **never in the client**. Blank fields auto-fill; conflicts open a comparison sheet (default = use AI). PDFs are rendered to a single page-1 image client-side (pdf.js from CDN) to cap cost. Full design + the exact extraction prompt: `PHASE_2.md`.

## Auto-renew auto-settle (shipped)
- Bills on payment mode **auto-renew** stay on the line-up right up to the due
  date (that window is the point — it's when you pause/cancel/change them), then
  get **marked paid by the system the day after** and rolled to the next cycle.
  Manual bills are untouched; payment mode *is* the opt-out.
- `lastPaidAt` is stamped with the **due date**, not the settle date, so a bill
  due 31 Aug still lands in August's totals. Auto-settled payments carry
  `lastPaidAuto: true` (detail view says "Auto-paid by BillBud"; manual Mark
  Paid writes `false`).
- Two writers run the same rule and must stay in sync: the client sweep in
  `index.html` (`runAutoSettleSweep`) and the scheduled Cloud Function
  `autoSettleAutoRenew` (`functions/index.js`, 00:15 IST — ahead of the 08:00
  reminder push so an auto-renew bill never pushes as "overdue"). Both settle in
  a transaction that re-checks eligibility against fresh state, so a concurrent
  pause/cancel/manual-pay wins and nothing double-advances. Details in `SYNC.md`.

## Engineering conventions (current)
- **Deploy:** production branch `claude/design-system` (Vercel auto-deploys on push). Recent work develops on a feature branch and ships by fast-forwarding it onto `claude/design-system` (`git push origin <feature>:claude/design-system`).
- **Service worker:** bump `VERSION` in `sw.js` on every shippable change so installed PWAs evict the old shell (currently `v0.4.26`).
- **No build/lint step:** the app is one inline `<script type="module">`. Syntax-check before shipping by extracting it and running `node --check`.
- **Optimistic writes (important):** with Firestore offline persistence, `await setDoc/updateDoc` resolves only on the *server ack*, which can lag/stall — meanwhile the local cache applies the write instantly and the feed updates via `onSnapshot`. So **do NOT block UI (closing a modal, clearing a loading state) on a write promise.** Issue the write, update the UI immediately, surface only genuine failures (`.catch` → toast). This bit us twice (receipt "Uploading 100%", bill "Saving…"); the fixed pattern lives in `onAttachPicked`, `onAttachRemove`, `submitAddBill`, and (since v0.4.25) `billUpdate` (Pause/Cancel/Reactivate). **Exception:** Mark Paid uses a transaction that genuinely needs the server round-trip — leave it awaited.
