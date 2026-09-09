# LEARNINGS — BillBud friction ledger

One card per friction, appended by `/wrap`. Format + method:
`/home/user/time-tracker/playbook/LEARNING_METHOD.md` (repo `instatank/time-tracker`,
path `playbook/LEARNING_METHOD.md`). The two arrowed founder fields are the learning —
a session never fills them for you.

### 2026-05-14 — Bill save + receipt upload froze waiting for server ack
- What happened: the receipt slot stuck at "Uploading 100%" and the bill save hung on
  "Saving…" — the UI was awaiting Firestore's *server* acknowledgment, which can stall,
  while the local cache had already saved the data instantly.
- Concept: local truth vs server truth (PLAYBOOK L1) — with offline persistence, never
  block UI on a write promise; issue the write, update the UI immediately, surface only
  genuine failures via `.catch` → toast. Exception: real transactions (Mark Paid) stay
  awaited.
- In my words: (pending — answer at next wrap)
- Where else: (pending — answer at next wrap)
- Quiz question: "You add a 'pause bill' button that awaits `updateDoc` before updating
  the sheet — what happens on a weak connection?" (Answer: it hangs even though the
  pause already saved locally — issue the write, update the UI immediately, toast only
  on a real failure.)
- Internalized: no

> **Note (2026-07-02):** the concept predicted its third instance before it fired in
> production — Pause/Cancel/Reactivate (`billUpdate`) still `await`ed their single-field
> `updateDoc`. Diagnosed via the "where else does this pattern exist?" transfer question
> and fixed on 2026-07-02 (SW v0.4.25) before any user hit it.

### 2026-08-16 — A new automatic rule can make an *existing* automatic job start lying
- What happened: building auto-settle for auto-renew bills, the obvious design was to
  do it in the app — settle overdue auto-renew bills whenever you open BillBud. That
  works for what you *see*. But BillBud already has a job that runs without you: the
  08:00 reminder push. If auto-settle only ran when the app was open, that push would
  cheerfully tell you "1 bill overdue" about a bill the system was about to mark paid
  itself. The fix was to make the settle a scheduled Cloud Function too, and to
  deliberately run it at 00:15 — *before* the 08:00 push — so the reminder always reads
  a settled world. The in-app sweep stayed, but as the fast path, not the truth.
- Concept: automation has an order of operations. When you add a rule that changes data
  on its own, the question isn't just "is my rule correct?" — it's "who else reads this
  data without me, and do they now read it at the wrong moment?" Two automatic things
  touching the same records are a schedule, not two features, and the schedule has to be
  decided on purpose.
- In my words: (pending — answer at next wrap)
- Where else: (pending — answer at next wrap)
- Quiz question: "Suppose we later add a weekly Sunday-night email summarising what you
  spent. Auto-settle runs daily at 00:15. What do you have to check before shipping the
  email?" (Answer: whether the email runs before or after that day's auto-settle — if it
  runs first, it reports a stale world, e.g. bills shown as unpaid that the system settles
  minutes later. Pick the order deliberately rather than letting the two land wherever.)
- Internalized: no

### 2026-09-09 — The handoff doc was true when written, and false by the time it was read
- What happened: `SESSION_HANDOFF.md` opened this session saying production was
  `v0.4.25` and that the auto-renew auto-settle work was **unshipped**, sitting on a
  feature branch waiting to be fast-forwarded. Both were wrong. That work had reached
  production weeks earlier, carried in on a merge commit (`e586c03`) made from a
  *different* branch by a *different* session. Nobody edited the handoff to lie — the
  sentence was accurate on 16 Aug, when the previous `/wrap` wrote it. It went stale
  because someone shipped, and shipping doesn't edit prose. Cost this time was small
  (a couple of `git merge-base` checks). The expensive version is a session that
  believes it, "ships" the already-shipped work, and reports a deploy that changed
  nothing — or worse, one that reads "production is v0.4.25" and reasons about a bug
  against code that hasn't been live for a month.
- Concept: a document that asserts *current deploy state* is a cache, and it has no
  invalidation. Every other fact in a handoff ("the gate is `scripts/check.sh`", "the
  production branch is `claude/design-system`") stays true until someone deliberately
  changes it. Facts about *what is live right now* stop being true through actions
  taken somewhere else entirely, by people not reading the doc. So those facts get
  re-derived, never trusted — and the cheapest honest source is the deployed artifact
  itself (fetch the live `/sw.js`, read its `VERSION`), not the repo, because the repo
  only tells you what *should* be live. Prose about deploy state should also say how it
  was checked, so the next reader knows whether it was verified or copied forward.
- In my words: (pending — answer at next wrap)
- Where else: (pending — answer at next wrap)
- Quiz question: "The handoff says 'reminder pushes go out at 08:00 IST' and also
  'production is at v0.4.27'. A month passes. Which of those two sentences do you
  re-check before trusting it, and how would you check it in under a minute?"
  (Answer: the version one — the 08:00 schedule only changes if someone deliberately
  edits that rule, but what's live changes every time anyone ships from anywhere.
  Check it by opening the live site's `/sw.js` and reading `VERSION`, which is the
  deployed artifact rather than the repo's opinion of it.)
- Internalized: no
