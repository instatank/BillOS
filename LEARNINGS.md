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
