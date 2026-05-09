# BillBud sync model

How writes propagate between two members of a household, and the rules we
follow to keep them consistent. Audit this before changing any
`updateDoc` / `setDoc` / `runTransaction` call on bills.

## Architecture

- **One Firestore project**, one Firestore database, served via the
  modular SDK on the CDN (no build step).
- **Per-household isolation**: bills live at
  `/households/{hid}/bills/{billId}`. Security rules require the caller
  be in `/households/{hid}.members`.
- **Real-time** via `onSnapshot`. Both `subscribeToHousehold(uid)` and
  `subscribeToBills(hid)` are live subscriptions — the UI re-renders
  automatically when the other member edits something. No tab-focus
  pull, no manual refresh.
- **Persistent local cache** with multi-tab manager
  (`initializeFirestore` + `persistentLocalCache` +
  `persistentMultipleTabManager`). Side effects:
  - First snapshot fires from cache instantly on load.
  - Writes queue locally if offline; sync resumes when online.
  - `snap.metadata.hasPendingWrites` tells us if a local write hasn't
    reached the server yet (we don't surface this in UI yet, but the
    plumbing is there for V2).
  - Two open tabs of the same browser stay consistent.
  - Falls back to memory cache (no offline) if IndexedDB is unavailable
    (private mode, storage disabled). Console logs which mode is active.

## Soft-delete policy (no tombstones needed)

Bills are **never** hard-deleted. Cancellation sets `status='cancelled'`,
which is itself a tombstone marker — the bill stays in Firestore, drops
out of the active feed, and remains reachable for reactivation or
history. So the "remote-merge resurrects deletions" failure mode from
DayOS doesn't apply here.

Households also can't be deleted (`allow delete: if false` in rules).
The only doc class that *is* deleted is `/inviteCodes/{code}`, and only
inside the join transaction or regenerate batch — atomic with the
membership change, so no orphaning race.

## Concurrency rules

### Edits — field-level diff

`submitAddBill()` in edit mode sends only fields the user actually
changed (compared against the snapshot taken when the modal opened).
This prevents the "Alice and Bob edit different fields concurrently,
last writer overwrites the other's untouched field" race.

If the user opens Edit and saves without changing anything, we skip the
write entirely.

### Mark Paid — transaction

`pay.submit` uses `runTransaction`. Inside the transaction we
re-read the bill, then compute the patch from fresh server state:

- `nextDue` advance is computed from `fresh.nextDue`, not from the
  stale value loaded into the modal. If Alice already advanced May → Jun
  while Bob's pay sheet was open, Bob's submit advances Jun → Jul, not
  May → Jun again.
- `status: 'active'` reactivation only fires if the *fresh* status is
  `paused`. So Alice cancelling while Bob's modal is open is respected:
  Bob's submit sees `cancelled`, throws "This bill was cancelled by
  another member. Reactivate it before marking paid", and the cancel
  stands.

Undo (toast) snapshots the *fresh* pre-write state inside the same
transaction, so Undo restores to a coherent "before this payment" state
even if the user is on a stale local snapshot.

Undo itself is a plain `updateDoc` — best-effort. Window is 5 seconds.
If a remote change happens during that window, Undo overwrites it. With
a 2-member household and a 5-second window, this is acceptable. Document
this if we open it up to larger groups later.

### Pause / Cancel / Reactivate

Plain `updateDoc` with `{ status, ...auditMeta() }`. Idempotent and
single-field, so no transaction needed. Edits don't touch `status`, so
a concurrent pause-while-edit doesn't conflict.

## Audit trail

Every bill mutation goes through `auditMeta()`, which stamps:

- `updatedAt: serverTimestamp()`
- `lastModifiedBy: currentUser.uid`

Plus `createdAt` and `createdBy` on initial creation. No events
sub-collection yet — V2 if we need a full audit log.

## Cross-user verification (the actual gate)

Before declaring a sync-touching change "done":

1. **Reload test** (single-user, single-device): make a change, hard
   refresh, confirm the change is still there. Catches bugs in
   `subscribeToBills` initial snapshot.
2. **Cross-device test** (single-user, two devices): edit on phone,
   confirm desktop browser updates within 2s without refresh. Catches
   bugs in `onSnapshot` re-subscription.
3. **Cross-user test** (two users in the same household, two browsers):
   - **Sequential**: A creates a bill → B sees it within 2s. A marks
     paid → B sees the new `nextDue` and toast-equivalent state within
     2s.
   - **Concurrent edit**: A edits name, B edits amount, both within
     ~1s. Both fields land correctly (field-level diff working).
   - **Concurrent state-change**: A cancels bill, B opens pay sheet
     and submits. B should get the "cancelled by another member" error
     toast, not silently resurrect the bill.
   - **Concurrent pay**: A and B both tap Mark Paid for the same
     monthly bill within a few seconds. Final state: `nextDue` advanced
     exactly one period (not two), one of the two notes wins. No
     duplicate advance.

Browser DevTools console must be open during these tests. A silent
permission-denied or a `ReferenceError` swallowed by an `await` chain
is invisible from the UI alone (lesson #1 from DayOS). Watch for:

- `[firestore] persistent multi-tab cache enabled` on load
- `[bills] edit patch (changed fields only)` when saving an edit
- `[pay] submit start (tx)` and `[pay] transaction committed` when
  marking paid
- Any `permission-denied` or unhandled error

## Things explicitly out of scope for V1

- Presence indicators ("Alice is editing this") — needs heartbeats +
  TTL or RTDB `onDisconnect`. V2.
- CRDT for free-text fields — last-write-wins is acceptable for the 2
  text fields we have (bill name, lastPaidNote) at 2-member scale.
- Per-payment ledger (`/bills/{id}/payments/{eventId}` subcollection) —
  currently we keep only the most recent payment on the bill itself.
  V2 ("Payment history per bill" item).
- Firestore emulator-based rules tests — relying on manual cross-user
  verification for now. If rule complexity grows, set up the emulator.
