# Session handoff — BillBud

Read this + `CLAUDE.md` + `SYNC.md` first thing in a new session.

## Where things stand (Phase 1 + 2 shipped, SW v0.4.25)

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
  clients evict the old shell. Currently `v0.4.25`. Bump on every ship.
- **Recent dev workflow**: work was done on feature branch
  `claude/trusting-albattani-8qgpvj` and shipped by **fast-forwarding it onto
  `claude/design-system`** (`git push origin <feature>:claude/design-system`).
  Both branches are in sync at `v0.4.24`. (Committing straight to
  `claude/design-system` works too — either is fine.)
- **No build/lint step.** The whole app is one inline `<script type="module">`.
  Syntax-check before shipping by extracting it and running `node --check`
  (see any recent commit's flow).

## Receipts & AI extraction (Phase 1 + 2 — SHIPPED & live)

Both phases are built, shipped, and the user is actively testing. Full design
docs: **`PHASE_1.md`** (attachments) and **`PHASE_2.md`** (AI extraction, incl.
the exact extraction prompt). Setup that is already DONE: Storage rules
deployed; `ANTHROPIC_API_KEY` set in Vercel env.

- **Phase 1 — receipts.** One receipt (image or PDF) per bill. Single
  "Upload receipt / bill" button in the Add/Edit modal → native picker
  (camera/library/files). Images compress to 1600px JPEG client-side; PDFs
  stored as-is. Storage path `households/{hid}/bills/{billId}/{attId}.{ext}`;
  bill doc carries `attachments[]` (0–1 items; array shape leaves room for
  multi later). Detail view shows the receipt + tap-to-open full-screen viewer
  (image overlay; PDF → new tab on desktop, embedded Google viewer + "Open ↗"
  on iOS; safe-area inset so the ✕ clears the notch). Feed cards show a
  paperclip when a bill has a receipt. Tap-to-open also works from the Edit
  modal. Rules in `storage.rules` (household membership via cross-service
  `firestore.get`) — **deploy separately**: `firebase deploy --only storage`
  (Vercel does NOT deploy them).
- **Phase 2 — AI extraction.** "✨ AI Auto Extract" (glowy accent button) on an
  attached receipt → Vercel serverless function **`api/extract.js`** (Claude
  **Sonnet 4.6**, vision + structured output; JSON schema matches the app's
  `cat`/`freq`/`currency` enums) → pre-fills the form. The function verifies
  the caller's Firebase ID token (RS256 vs Google `securetoken` certs, no
  `firebase-admin`) and host-allowlists the Storage URL (anti-SSRF). Blank
  fields auto-fill; a field that conflicts with a manual entry opens a
  comparison sheet (tickboxes; default = **Use AI extraction**, flip to **Keep
  original**). PDFs are rendered to a single **page-1 ~1500px image**
  client-side via pdf.js (CDN, lazy-loaded) so a multi-page statement costs ~1
  image, not N pages (this was a real cost bug — fixed). Cost ≈ ₹0.5–1/scan.
- **Key gotcha fixed this session — optimistic writes.** Firestore offline
  persistence makes `await setDoc/updateDoc` resolve only on the *server ack*,
  which can stall; the local cache applies the write instantly (feed updates
  via `onSnapshot`). Awaiting it froze the receipt slot at "Uploading 100%" and
  hung the bill save at "Saving…". Fix: **never block UI on a write promise** —
  update the UI immediately, persist in the background, `.catch` → toast. See
  `onAttachPicked`, `onAttachRemove`, `submitAddBill`. (Mark Paid keeps its
  transaction — it genuinely needs the server round-trip.)

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
  (right) — with a month-scoped substat (count + per-currency totals of the active bills landing in the viewed month) on its own full-width line
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
- **Bill reminders (push)** — opt-in per device via a "Bill reminders"
  toggle in the ≡ menu (only shown where web push works → on iOS, the
  installed PWA on 16.4+). On: asks notification permission, fetches an FCM
  token, stores it at `/households/{hid}/reminderDevices/{token}`
  (`{ uid, ua, updatedAt }`); a `localStorage['billbud:reminders']` flag
  re-registers the token on every load. `firebase-messaging-sw.js` (at site
  root, auto-registered by the FCM SDK at its own sub-scope — doesn't touch
  `sw.js`) shows background notifications. The send side is a v2 scheduled
  Cloud Function `sendBillReminders` (`functions/index.js`), `0 8 * * *`
  `Asia/Kolkata`: per household, finds active bills due within ~48h or
  overdue → one digest push per device ("2 bills due soon · ₹4,300" /
  "1 overdue + 1 due soon · …"), prunes dead tokens, sends nothing if
  nothing's due. Tapping a notification opens the app. Deployed by the
  `Deploy Firebase` GitHub Action (`.github/workflows/firebase-deploy.yml`)
  on push to `claude/design-system` — uses the `FIREBASE_SERVICE_ACCOUNT`
  repo secret; deploys `functions` + `firestore:rules`. **Not yet live /
  not yet tested** at time of writing — see "Next up" #2.

## Next up / open ideas (not started)

### Phase 2 follow-ups (current priority — pick up here)

0a. **Finish testing extraction & tune the prompt.** The user is mid-testing
   AI Auto Extract across real bills (electricity, broadband, credit-card PDF,
   staff salary, etc.). If a field or bill type reads weak, tune `SYSTEM_PROMPT`
   in `api/extract.js` and keep `PHASE_2.md` in sync. Also confirm per-scan cost
   dropped after the page-1 PDF fix (Anthropic console → Usage).
0b. **(Optional) PDF re-extract CORS edge case.** Re-extracting a PDF that was
   attached in a *previous* session (no local File in memory) falls back to
   fetching the Storage URL; if the bucket blocks cross-origin fetch it drops to
   the full-PDF (pricier) path. The common flow (attach → extract same session)
   always uses the cheap page-1 path. To cover the edge case, set a Firebase
   Storage CORS config allowing the app origin (`gsutil cors set`).
0c. **FIXED (2026-07-02) — Optimistic Pause/Cancel/Reactivate.** `billUpdate`
   no longer `await`s its single-field `updateDoc`: the write is issued in the
   background, the open detail repaints instantly via the bills `onSnapshot`
   (local cache), and only genuine sync failures surface via `.catch` → toast —
   same pattern as `submitAddBill`/`onAttachPicked`. (Mark Paid stays awaited —
   transaction.) SW bumped to v0.4.25. Still owed: verify on the phone.

### Older open ideas (pre-Phase-1)

1. **PWA polish** — icons are wired up (`/icons/icon-{192,512}.png`,
   `icon-maskable-512.png`, `apple-touch-icon-180.png`, `/favicon.png`,
   `/icons/icon.svg`) but they're a *temporary* in-house mark (the green
   "B"+sprout) — AA has a real design to drop in later (`icons/icon-source.png`
   → re-export all sizes, crop the white border, regen maskable, bump SW).
   Still to do: tighten the SW caching strategy, verify install-to-home-screen
   on iOS. (This was original "sub-task 7".)
2. **Reminders** — built (see "Bill reminders (push)" above) but **needs
   first-deploy verification**: (a) the in-app "due soon" surfacing idea
   was dropped — bill cards already show relative due-pills + red/yellow
   urgency, so a separate section added nothing; (b) the push side ships
   when this lands on `claude/design-system` — confirm the `Deploy Firebase`
   GitHub Action goes green (the default `firebase-adminsdk` SA may need
   extra IAM roles for function deploys; the Action log will say which —
   grant via Google Cloud Console → IAM, GUI), then on the iPhone (installed
   PWA) flip the ≡ menu "Bill reminders" toggle on, allow notifications, and
   check a push arrives at the next 08:00 IST (or trigger the function once
   from the Firebase console / `workflow_dispatch` to test sooner).
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
