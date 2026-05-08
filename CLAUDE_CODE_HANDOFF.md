# BillOS — Claude Code Handoff

You are Claude Code. Implement the BillOS MVP Shell using the design direction
locked in `BillOS Prototype.html` (the **Stack** variant). The repo already has
the Firebase + auth scaffold (see `index.html`, `CLAUDE.md`, `PRD.md`,
`MVP-SHELL-prompt.md`, the SOP). Do not relitigate scope — just build the
chosen design against the existing scaffold.

## What's been decided

- **Visual direction:** Stack (rich card feed). Light mode is the default
  daytime palette (cream + deep green); dark mode flips to deep olive + lime.
  Both modes use the same IA, components, copy.
- **IA:** No tab bar in V1. One screen — the Stack feed — is home. Filter
  chips at the top swap the visible set. The card itself is the primary
  surface; tapping opens detail.
- **Add bill:** Full-screen modal (slide-up takeover). Single screen with all
  fields visible. Save returns to the feed with the new card on top.
- **Onboarding:** Sign in with Google → Set up household (create or join with
  6-digit invite code) → Stack. 2-member cap per the PRD.
- **Sample data shape:** see `billos-data.jsx` — keep these field names
  (`id, name, amount, freq, cat, owner, nextDue, status, notes`).

## Visual tokens to lift

Pull tokens from `billos-themes.jsx` → `pocketStackLight` (default) and
`pocketStack` (dark). Map them into your CSS custom-properties or token file.

```
LIGHT (default)            DARK
bg:        #f4f6ed         #1a1f12
bgElev1:   #ffffff         #252b1a
bgElev2:   #fafbf3         #2c3322
border:    #e3e7d6         #3a432a
borderSoft #ebeedf         #2f3823
text:      #1a1f12         #f4f6ed
textDim:   #5e6b50         #a4b095
textMuted: #8a957a         #7a8770

accent:        #3a6f1e     #c8ff4e   (bright lime in dark)
accentInk:     #f4f6ed     #1a1f12
accentSoft:    #d6e8b8     #2a3a1a
accentBorder:  #a4c47a     #5a7a2a

danger: #b03a2c / #ff7a6e
warn:   #a17126 / #ffb46e
success:#3a6f1e / #9bf0b3

radius: 14   radiusSm: 10   radiusLg: 20   radiusCard: 18

fontBody:    "Geist", -apple-system, system-ui, sans-serif
fontDisplay: "Bricolage Grotesque", "Geist", system-ui, sans-serif
fontNum:     "Bricolage Grotesque", "Geist", system-ui, sans-serif

Category colours (light / dark):
  utilities     #3a6ea5 / #7eb6ff
  subscriptions #7c4fb0 / #d1a3ff
  credit_cards  #a86a1f / #ffb46e
  people        #3a6f1e / #9bf0b3
  other         #6f6a55 / #aab2c2
```

## Screens to build (V1)

### 1. SignedOut
- Centered: small lime "₹" mark, BillOS wordmark, one-line tagline.
- Single big button: **Sign in with Google** (Firebase `signInWithPopup`).
- See `billos-screens.jsx` → `SignedOutScreen` for the layout.

### 2. HouseholdChoice (post sign-in, no household yet)
- Two large card buttons: **Create household** / **Join household**.
- Footer note: "Households are limited to 2 members in V1."
- See `HouseholdChoiceScreen`.

### 3. HouseholdCreated / Join screens
- After Create: show 6-digit invite code, copy button, "Continue to bills".
- After Join: enter code → success → Continue.
- See `HouseholdCreatedScreen` / `JoinScreen`.

### 4. Stack (home — THE primary surface)
- Header: "Stack" wordmark (Bricolage), N bills · ₹X this cycle. ≡ menu icon
  (drawer/settings stub) and **+** add icon, both pill-shaped.
- **Filter chip row** (horizontal scroll): All / Mine / Mom / Shared / then
  category chips: Utilities / Subs / Cards / Staff. Active chip = filled
  accent with `accentInk` text. Filtering is client-side over the Firestore
  subscription.
- **Card feed** (vertical stack, gap 10px, padding 12px):
  Each card has 3 sections separated by a dashed `borderSoft` rule:
  - **Top row:** category chip (icon + tinted bg) · `CATEGORY · FREQ` (uppercase
    11px, dim) · due pill (`today` / `tomorrow` / `in Nd`). Pill goes accent-
    coloured when ≤3 days, otherwise muted.
  - **Main row:** name (Bricolage 19px 600) and amount (Bricolage 20px 700,
    Indian comma grouping — see `indianGroup()` helper).
  - **Footer:** initial badge (18px circle, first letter of payer) · payer
    name · "next DD MMM YYYY".
- Tap card → Detail. Long-press card → reserved (hold for V2).

### 5. AddBill (full-screen modal)
- Slide-up takeover. Header bar: Cancel · "New bill" · Save.
- All fields on one screen, scrollable: Name · Amount (₹ prefix, live INR
  preview) · Frequency (3-button segmented: monthly/yearly/quarterly) ·
  Category (5 stacked option rows with chip + name + check on selected) ·
  Who pays (3-button: Me/Shared/Mom) · Next due (date picker).
- Validation: Name + Amount > 0 + Frequency required to enable Save.
- Save button: full-width primary at bottom of scroll, label
  `Save · ₹X monthly`.

### 6. Detail
- Back chevron + "Bills" + Edit (top right).
- Hero: category chip · name · amount (48px display) · freq + next due text.
- Status badges: Paused / Cancelled with tinted backgrounds.
- Card with KV rows: Category, Frequency, Next due, Who pays, Notes (if any),
  Added by + date.
- Actions: Pause/Reactivate (soft button) · Cancel bill (danger).
  Footer note explaining cancel keeps history.

## Behaviour rules (binding)

- **Indian comma grouping** for all amounts: `12,000` `1,70,675`. Use
  `Intl.NumberFormat('en-IN')` or copy `indianGroup()` from `billos-data.jsx`.
- **Date format:** `08 May 2026`. Helper in `billos-data.jsx` → `fmtDate()`.
- **Currency:** ₹ only (V1 is INR-only).
- **5 categories, locked:** utilities, subscriptions, credit_cards, people,
  other. Display label for `people` is "Household Staff".
- **Frequencies:** monthly, yearly, quarterly. (Weekly, custom → V2.)
- **Status:** active, paused, cancelled. Cancelled bills hidden by default
  but reachable via filter (post-V1, can stub in V1).
- **Real-time sync:** all reads via `onSnapshot` on
  `households/{householdId}/bills`. No optimistic UI in V1 — let server be
  truth. Add bill → write to Firestore → snapshot updates the feed.
- **Mom test:** every tap target ≥ 44pt. No tooltips, no hover-reveal, no
  keyboard shortcuts in V1.

## Files in this project for reference

| File | Purpose |
|---|---|
| `BillOS Prototype.html` | The clickable hi-fi spec. Tap into Stack · Light or Stack · Dark. |
| `billos-themes.jsx` | All design tokens. `pocketStackLight` + `pocketStack`. |
| `billos-data.jsx` | Sample data, categories, helpers (`indianGroup`, `fmtDate`, `fmtINR`, `daysFromToday`, `dueBucket`). |
| `billos-atoms.jsx` | `Pressable`, `Btn`, `AppBar`, `BillRow`, `CatBadge`, `AmountText`, `Icon` set. |
| `billos-variants.jsx` | The Stack home screen reference impl (`StackHome`). |
| `billos-list-detail.jsx` | The full add-bill form (`AddBillForm`) and detail screen — copy these almost verbatim. |
| `billos-screens.jsx` | Onboarding screens (signed-out, household choice, etc.). |

You don't need to recreate the React JSX as React — port the structure and
styles to the existing `index.html` + plain JS / framework chosen in the
scaffold. Use the JSX as the visual contract.

## Out of scope for this pass

Per PRD, do **not** build: renewal warnings, the Today tab, calendar view,
spend analytics, payment marking, push notifications, exports. Those are
Phase 2.

## Acceptance

A user can: sign in with Google → create or join a 2-person household → see
the shared bill feed update in real time → add a bill that appears
immediately on the other device → tap to view detail → edit / pause /
cancel. All amounts in Indian comma grouping. All dates in DD MMM YYYY.
Mom can complete every flow without help.
