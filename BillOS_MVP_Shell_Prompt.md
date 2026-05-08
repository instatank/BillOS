# BillOS — MVP Shell Prompt for Claude Code
*Phase 3 output of Product Build SOP | First prompt to run in fresh Claude Code session*

> **How to use:** Save `PRODUCT_BUILD_SOP.md` and `BillOS_PRD.md` to project root first. Then paste this entire document as your first prompt in Claude Code. Confirm sub-tasks one at a time.

---

## Context for you, Claude Code

You are building **BillOS** — a household bill tracker PWA for AA and his mother. AA is a non-technical founder; UX simplicity is the binding constraint.

The full V1 vision lives in `BillOS_PRD.md`. The build philosophy lives in `PRODUCT_BUILD_SOP.md`. Read both before starting.

**This prompt is the MVP Shell only** (Phase 3 of the SOP). The smallest live URL that proves the foundation works. Most features come AFTER 1-2 weeks of daily use. Do not exceed scope. If you think a feature is missing, write it to `PHASE_2.md` and continue.

## Stack
- Single `index.html` file — all CSS and JS inline (matches DayOS pattern)
- Firebase Auth (Google Sign-In) + Firestore for sync
- No build step, no frameworks. Vanilla JS + Firebase SDK via CDN
- Vercel for hosting
- PWA: `manifest.json` + service worker + iPhone home screen install

## What MVP Shell includes (and nothing else)
1. **Project scaffold** — `index.html`, `manifest.json`, service worker, Firebase init, dark theme matching DayOS aesthetic
2. **Auth** — Google Sign-In via Firebase Auth, sign-out, auth state persistence
3. **Household creation + invite flow**
   - First user creates a household → 6-digit invite code generated
   - Second user enters code on landing → joins household
   - Max 2 members; invite expires in 24h with regenerate option
4. **Manual add bill** — single form, 3 required + 2 optional fields
5. **Unified list view** — sorted by `nextDue`, filter by category/owner/status
6. **Detail view** — edit any field, pause, cancel, reactivate
7. **Real-time multi-user sync** — Firestore listeners, both members see updates within 2s

## Explicitly OUT of MVP Shell (Phase 2+)
- Screenshot or photo AI parsing
- Calendar / timeline view
- Renewal warning badges
- Today tab / monthly summary
- Payment history sub-collection / mark-paid action
- Light mode
- Push notifications
- Anthropic API integration of any kind

## Data model

```
/households/{householdId}
  - createdAt: timestamp
  - createdBy: uid
  - members: [uid1, uid2]              // max 2 in V1
  - displayName: string                 // e.g., "Safdarjung Household"
  - inviteCode: string | null           // 6 digits, null after second member joins
  - inviteCodeExpiresAt: timestamp | null

/households/{householdId}/bills/{billId}
  - name: string                        // "Netflix", "MTNL Broadband", "Cook Salary"
  - amount: number                      // INR
  - frequency: enum                     // 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time'
  - category: enum                      // 'utilities' | 'subscriptions' | 'credit_cards' | 'people' | 'other'
  - owner: 'shared' | uid               // who pays it; informational only, doesn't restrict edits
  - nextDue: timestamp                  // user-entered for V1; derive logic comes in Phase 2
  - status: enum                        // 'active' | 'paused' | 'cancelled'
  - notes: string | null
  - createdAt: timestamp
  - createdBy: uid
  - updatedAt: timestamp
```

## Firestore security rules (write proper rules; sketch below)

```javascript
match /households/{hid} {
  allow read, write: if request.auth != null
                     && request.auth.uid in resource.data.members;
  // Special case: allow read by uid for join-by-code flow — implement carefully
}
match /households/{hid}/bills/{bid} {
  allow read, write: if request.auth != null
                     && request.auth.uid in get(/databases/$(database)/documents/households/$(hid)).data.members;
}
```

Validate these against Firestore rules best practices before deploying.

## Categories (locked to 5)
| Category | Color | Examples |
|---|---|---|
| `utilities` | blue | Electricity (BSES), water (DJB), gas (IGL), internet, mobile, DTH, society maintenance |
| `subscriptions` | purple | Netflix, Prime, Spotify, iCloud, ChatGPT, Claude, gym |
| `credit_cards` | amber | HDFC, Axis, Amex, ICICI |
| `people` | green | Cook salary, housekeeper, driver, gardener |
| `other` | grey | Insurance, property tax, rest |

## India conventions (non-negotiable)
- Currency: `₹` always, Indian comma grouping (`₹1,00,000` not `₹100,000`)
- Date display: `DD MMM YYYY` (e.g., `08 May 2026`)
- Timezone: `Asia/Kolkata`
- No GST/tax breakdown — total amount only

## Sub-task structure (CONFIRM EACH BEFORE MOVING ON)
1. **Scaffold** — `index.html`, `manifest.json`, service worker, dark theme CSS variables, Firebase SDK init via CDN
2. **Auth flow** — Google Sign-In button, signed-in/signed-out UI states, auth persistence
3. **Household creation + invite** — create flow, 6-digit code, join-by-code flow, member limit enforcement
4. **Add bill form** — 3 required + 2 optional fields, Firestore write, basic validation
5. **List view** — Firestore real-time listener, sorted by `nextDue`, category color dots, filter UI
6. **Detail view** — edit form, pause / cancel / reactivate actions
7. **PWA polish + Vercel deploy** — manifest icons, service worker caching, deploy live URL

After each sub-task: confirm with me, show what was built, wait for go-ahead before next.

## Acceptance criteria — ship MVP Shell when ALL pass
- [ ] AA signs in with Google on iPhone Safari
- [ ] AA creates a household, generates invite code, mom joins on her phone within 5 minutes
- [ ] Adding a bill manually takes ≤15 seconds end-to-end (timed)
- [ ] Both members see a new bill within 2 seconds of either adding it
- [ ] Pausing a bill changes its status visibly in the list (greyed out / sectioned)
- [ ] Cancelling a bill keeps it accessible via filter (not deleted)
- [ ] App is installable as PWA on iPhone home screen with proper icon
- [ ] Works offline for read; queues writes for next online sync
- [ ] No console errors on iPhone Safari or Mac Chrome
- [ ] No Firestore security rule violations in test scenarios

## Implementation notes / constraints
- **Single `index.html` file** — all CSS and JS inline. Match DayOS pattern.
- **No build step.** No frameworks. Vanilla JS + Firebase SDK via CDN.
- **Dark theme only** for now (light mode is a Phase 2 refactor — see SOP: architectural refactors before features).
- **Firestore reads/writes** through the connected user's session — no service account.
- **Do NOT add features outside the 7 sub-tasks above.** If something feels missing, write it to `PHASE_2.md` and keep moving.
- **Commit after each sub-task** with a clear message; push to repo.
- **Read source first** when uncertain about existing structures — don't assume (SOP lesson).
- **Mom test:** before declaring any sub-task done, ask "could a non-technical user do this without help?" If no, simplify before moving on.

## After MVP Shell ships
**Stop.** AA and mom will use the live URL daily for 1-2 weeks. Then we'll review real friction and write the Phase 2 prompt for: screenshot AI parsing, calendar view, renewal warnings, Today tab.

The SOP is explicit on this: build features before living with them is a named DayOS mistake. Don't repeat it on BillOS.

## Wrap-up rituals (define in CLAUDE.md at project root)
- `summarize takeaways` — quick session wrap with what was built and what's next
- `wrap and teach` — deep session wrap; write learnings to project log
- Always commit and push at session end
