# CLAUDE.md — BillOS

Project context for Claude Code sessions. Source of truth for *how* we build, not *what* we build (that's the PRD).

## Read-first
- `PRODUCT_BUILD_SOP.md` — build philosophy, mistakes-to-avoid, decision principles
- `BillOS_PRD.md` — V1 product vision and scope
- `BillOS_MVP_Shell_Prompt.md` — Phase 3 build plan (the 7 sub-tasks)

## Stack (locked for MVP Shell)
- Single `index.html` with inline CSS/JS — no build step, no frameworks
- Firebase Auth (Google) + Firestore via CDN modules
- PWA via `manifest.json` + `sw.js`
- Vercel for hosting

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
- [ ] 2. Auth flow — full signed-in/signed-out UI states, sign-out, persistence
- [ ] 3. Household creation + invite (6-digit code, 24h expiry, max 2 members)
- [ ] 4. Add bill form (3 required + 2 optional)
- [ ] 5. List view (real-time, sorted by `nextDue`, filters)
- [ ] 6. Detail view (edit, pause, cancel, reactivate)
- [ ] 7. PWA polish + Vercel deploy (icons, caching, live URL)
