# CLAUDE.md — BillBud

Project context for Claude Code sessions. Source of truth for *how* we build, not *what* we build (that's the PRD).

The product was previously named BillOS. References to that name in the historical product docs (`BillOS_PRD.md`, `BillOS_MVP_Shell_Prompt.md`) and reference design files (`billos-*.jsx`) have not been renamed — they're frozen artefacts.

## Read-first
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
