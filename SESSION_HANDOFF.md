# Session handoff — BillBud

Read this + `CLAUDE.md` + `SYNC.md` first thing in a new session.

## Where things stand (last updated mid-build, SW v0.4.9)

- **Product**: BillBud (was "BillOS" — old name frozen in `BillOS_PRD.md`,
  `BillOS_MVP_Shell_Prompt.md`, `billos-*.jsx`, `BillOS Prototype.html`).
- **Working & production branch**: `claude/design-system`. It IS the GitHub
  default branch, so every push auto-deploys to Vercel production. Just
  commit + push to ship. (The other branch `claude/product-build-sop-xaE1E`
  is a frozen comparison branch — ignore it.)
- **Stack**: single `index.html` (inline CSS/JS, no build), Firebase Auth
  (Google) + Firestore via CDN modules, PWA (`manifest.json` + `sw.js`),
  hosted on Vercel.
- **Sandbox note**: this environment can only push to `claude/*` branches —
  it cannot push `main` or use the Vercel CLI. Production deploys happen
  via the GitHub→Vercel git integration on push.
- **SW cache**: bump `VERSION` in `sw.js` on every shippable change so
  clients evict the old shell. Currently `v0.4.9`. Use `v0.4.10`, etc.

## What's built

All 7 MVP sub-tasks done, then a big design-system integration, then a lot
of iteration. Highlights:

- **Auth**: Google sign-in, persistence, friendly errors.
- **Households**: create/join, 6-digit invite code (24h expiry, regenerate,
  copy/share), 2-member cap, real-time listener, Firestore rules in
  `firestore.rules`.
- **Bills**: add (name, amount, currency [INR/USD toggle on the ₹/$ prefix],
  frequency, category, owner, payment mode [auto-renew/manual], next due,
  notes). Field names: `freq`/`cat` (reads fall back to legacy
  `frequency`/`category`). Multi-currency: `currency` field, `fmtMoney()` /
  `moneyHtml()` everywhere; never sum across currencies.
- **Bills home ("Bills")**: month-scoped feed. Header row is a 3-track grid
  — `Bills` (left) · `‹ Mon ›` stepper (screen-centered) · `[≡] [big +]`
  (right) — with the recurring-totals substat on its own full-width line
  just below it (so it never clips, whatever the currency mix). No bottom
  border on the header. Month label = 3-letter abbrev (year appended only
  when not the current year), tappable to jump to today, accent when
  off-month. Below the header: search row
  (`[🔍] [chip strip: All/Mine/<other>/Shared + 5 cats]`),
  then the centered status segment (Active/Paused/Cancelled), then the
  month-summary card, a divider, the feed, and "Recently paid".
  (A list/calendar view toggle + calendar-grid view existed briefly —
  removed 11 May 2026; list is the only home view. See git history if it
  needs reviving.)
- **Feed (list mode)**: sections — `Overdue` (pinned, red, always, for
  active/paused tabs), `<Month>` (the viewed month's bills), `No due date`
  (only when viewing the current month), and `Coming up · early <NextMonth>`
  (only in the last 3 days of the current month — spillover of next month's
  first 7 days).
- **Search**: tap 🔍 → expand-to-input overlay (input always mounted,
  synchronous focus for mobile keyboard, capture-phase outside-click +
  setTimeout(0) + exempt-list — the dayOS/partyspark pattern). Search is a
  GLOBAL find: ignores the status tab and the viewed month, shows all
  matches flat ("Search results (N)"), paused dimmed / cancelled struck.
- **Bill detail** (tap a card): hero (cat chip · name · amount · freq/next
  · status pill) + KV card (category, frequency, next due, who pays,
  payment mode, last paid, notes, added) + actions row:
  `Mark paid` (full-width primary) then `[Pause | Cancel | Delete]`
  (equal-width; Delete is filled red, does a hard `deleteDoc` behind a
  `confirm()`; Cancel is soft = `status='cancelled'`). `Edit` (pencil) in
  the top-right header reopens the add-bill sheet pre-populated.
- **Pay flow**: bottom-sheet — date paid (default today) + freeform "how
  paid?" note + outcome (periodic → advance `nextDue` one period from the
  *fresh* server value; one-time → remove/keep choice). Runs in a Firestore
  transaction (reads fresh state, respects a concurrent cancel, no double-
  advance). On success: both sheets close, you land on the feed, a toast
  confirms with an Undo (5s, restores the snapshotted pre-state).
- **Recently paid** + **month-summary card**: both scoped to the viewed
  month. Summary headline lists per-currency totals; the category bar +
  legend cover the primary currency, other currencies get an "Other (USD)"
  legend line. Summary card has a mint "PAID" label + blue-tinted border
  (the glow box-shadow was removed per feedback).
- **Sync hardening** (see `SYNC.md`): persistent local cache + multi-tab
  manager; field-level edit diff; transactional Mark Paid; `auditMeta()`
  (`updatedAt` + `lastModifiedBy`) on every bill mutation; idempotent bills
  listener (`subscribedBillsHid` guard); no hard-delete except the explicit
  Delete action; comprehensive sign-out reset.

## Next up / open ideas (not started)

1. **PWA polish** — real app icons (`/icons/icon-192.png`, `icon-512.png`
   are placeholders), tighten the SW caching strategy, verify install-to-
   home-screen. (This was original "sub-task 7".)
2. **Reminders** — upcoming-due summary + push notifications for bills due
   in 1–3 days.
3. **Settings menu** — edit household name, leave household, manage your
   display name (no way to do any of these yet; the ≡ menu only has sign
   out + household name + member pills).
4. **Payment history per bill** — currently only the most-recent payment is
   stored (`lastPaidAt`/`lastPaidNote`/`lastPaidAmount` on the bill doc).
   A `bills/{id}/payments/{eventId}` subcollection would give a real ledger
   — and would auto-upgrade the month-summary and recently-paid sections to
   true sums (right now "paid this month" = "bills whose most-recent payment
   landed this month").
5. **Calendar phase 3** — per-month "₹X due / ₹Y paid" strip in the nav;
   other polish.
6. **USD bill cleanup for the user** — they have some subscriptions in USD;
   edit each one and flip the ₹→$ toggle in the add-bill sheet.

## Known caveats / non-bugs

- Date handling assumes IST users (dates anchored at 09:00 IST on write;
  read back in browser-local time). Documented in `CLAUDE.md`.
- Pay tx 15s timeout: if the timeout wins the race, the underlying Firestore
  write may still commit on the server; `onSnapshot` reconciles it.
- The console has intentional `[firestore]` / `[bills]` / `[pay]` logs —
  they're the only way to spot a silent permission-denied or a swallowed
  error during cross-user testing. Leave them until cross-user testing is
  signed off.
- `renderStackHeader` is a near-alias for `renderMonthNav` + the substat;
  kept as a wrapper so its many call sites don't all need touching.

## How to verify a sync-touching change

See the "Cross-user verification" section in `SYNC.md`: reload test →
cross-device test → cross-user test (sequential / concurrent edit /
cancel-vs-pay / concurrent pay), DevTools console open throughout.
