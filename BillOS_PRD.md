# BillOS — PRD
*Phase 2 output of Product Build SOP | v1.0 | 8 May 2026*

**Problem**: A 2-person Delhi household (AA + mother) tracks 30+ recurring outflows — utilities, OTT subs, credit cards, staff salaries, insurance — across mental notes, WhatsApp reminders, and scattered receipts. Annual subscriptions auto-renew before either notices. No single view exists for what's hitting the account this month, and no Indian app handles domestic staff salaries as a first-class outflow.

**User**: AA + mother. Both non-technical. iPhone-primary, Mac-secondary. Daily 30-second glance, weekly 5-min check. Mom's UX bar is the binding constraint — if she can't add a bill in 15 seconds, the app failed.

**Core Pillars**:

1. **Unified visibility** — every recurring outflow in one shared list
   - Bills, subs, credit cards, staff, insurance — all in one collection
   - Both members see same data, real-time Firestore sync
   - Five locked categories: Utilities, Subscriptions, Credit Cards, People, Other
   - Sort by next-due-date by default; filter by category, owner, status

2. **Renewal-warning safety net** — never get auto-charged without warning
   - 30 / 15 / 7 day badges for annual + quarterly bills
   - Visible on home screen, not buried in settings
   - Color-coded: amber → orange → red as renewal approaches

3. **Effortless entry** — adding a bill must take ≤15 seconds
   - Manual form: 3 required fields (name, amount, frequency)
   - Paste screenshot → AI parse → user confirms → save
   - Photo of paper bill → same flow
   - All three input methods feed the same data model

**MVP Scope** (Phase 1 — ship these only):
1. Auth + household creation + invite-by-code
2. Manual add bill (3 required fields, 5 categories)
3. Unified list view with filters
4. Real-time multi-user sync
5. Pause / cancel / reactivate (no deletion — keep history)

**Post-MVP** (Phase 2+, only after ≥1 week of daily MVP-Shell use):
- Screenshot/photo AI parsing (Anthropic API via Vercel proxy)
- Calendar/timeline view (next 30 days)
- Annual renewal warning badges (30/15/7 day logic)
- Today tab with monthly summary
- Payment history sub-collection per bill
- Mark-paid action
- Light mode (after CSS variable refactor)

**Design Principles**:
- Mobile-first; iPhone Safari is the primary surface
- Calm and intentional — not finance-app-busy (DayOS aesthetic)
- INR only, Indian comma grouping (`₹1,00,000`), `DD MMM YYYY` dates, Asia/Kolkata timezone
- Backend flexible (5 categories now, configurable later); frontend simple
- Mom-friendly: every screen navigable by a non-technical user without onboarding

**Non-Goals** (what this is NOT):
- Payment automation or initiation — ever
- Bank / UPI / credit card transaction integration
- Email or Gmail auto-scanning
- Spend trends, charts, recommendations
- Budget setting or limit alerts
- Expense tracking (groceries, dining) — different product
- Multi-currency
- More than 2 household members
- Bill negotiation or cancellation concierge services

**Open Questions** (decide before MVP Shell prompt):
- App name: `BillOS` (default, parallels DayOS) — confirm or change?
- Should `nextDue` be derived (computed from frequency + lastPaid) or stored explicitly? *Default: stored, recomputed on each payment to avoid edge-case bugs.*
- "People" category — bill model or recurring-entity-with-attendance model? *Default: simple bill in V1; attendance tracking in Phase 3.*
- Anthropic API cost (~₹2-5 per parse) — acceptable for personal use? *Default: yes; not in MVP Shell anyway.*
- Invite code expiry — 24h enough or extend to 7 days for mom's pace? *Default: 24h, with easy regenerate.*

**Success Criteria** (after 30 days of daily use):
- AA opens BillOS each morning instead of trying to remember bills
- Mom independently adds at least one bill without asking AA for help
- Zero annual subscriptions auto-renew without a 30+ day warning surfaced
- ≥80% of household recurring outflows captured in the app
- Both members agree the app is the source of truth, not memory or WhatsApp
