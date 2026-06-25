# Phase 1 — Bill attachments (one receipt per bill)

Attach a photo or PDF of a bill for quick reference. Single receipt per
bill, shared across the household. Foundation for Phase 2 (AI extraction
reads this same image). Based on the DayOS attachments guide, adapted for
BillBud's shared-household + field-merge sync model.

## Status — built, pending real-device verification

- [x] 1. Storage rules (household-membership) + SDK wiring + `attachments:[]` on create
- [x] 2. Upload pipeline (compress, resumable+progress, replace/clear, blob cleanup)
- [x] 3. Capture UI in Add/Edit modal (camera / upload, progress, replace, remove)
- [x] 4. Detail-view receipt row + full-screen preview (image overlay; PDF iOS routing)
- [x] 5. Cache hygiene — `no-cache` on HTML, SW `VERSION` bump (rest of §12 already present)

Remaining: cross-user + **real-iPhone-PWA** verification (test gate below), then
merge `claude/trusting-albattani-8qgpvj` → `claude/design-system` to ship.
Optional polish deferred: a paperclip badge on feed cards; a visible UI build
version string.

## Scope (agreed)

- **Types:** images (JPEG/PNG/HEIC) **+ PDF**. No Office/iWork/zip — those
  were the iOS-preview pain in DayOS; PDFs never were.
- **Count:** **one attachment per bill**, replaced if you add another.
  Stored as `attachments[]` (0–1 items) so we can lift the cap later
  without a data migration.
- **Delete:** lightweight — `confirm()` → remove + delete blob. No
  Trash/TTL sweep. Blob also cleaned up when a bill is hard-deleted.

## Data model

`attachments[]` on the bill doc (0 or 1 entry in V1):

```
{
  id,          // uuid
  kind,        // 'image' | 'file'  (PDF = file w/ mime application/pdf)
  url,         // download URL (tokenized, publicly fetchable)
  storagePath, // households/{hid}/bills/{billId}/{id}.{ext}  — for deletion
  title,       // defaults to original filename
  mime, size, ext,
  createdAt,   // ISO
  createdBy,   // uid — "added by" matters in a shared household
}
```

## Sync — the §9 gate (audited, passes)

BillBud is safe by construction, for a different reason than DayOS:

- Every write to an **existing** bill is `updateDoc` (field merge) or a
  transaction patch — `index.html` edit (:3037), pause/cancel (:3189),
  pay (`runTransaction`), undo (:3478). `updateDoc` cannot drop a field
  it doesn't name, so none of these touch `attachments`.
- The only whole-object write is `setDoc` on a **new** ref at create
  (:3040) — include `attachments: []` there.
- Sync is `onSnapshot` (server truth reflected), not a field-enumerating
  merge — so the DayOS "merge drops unknown field" risk does not exist.

**No sync code changes needed.** Attachment writes go through their own
targeted `updateDoc({ attachments, ...auditMeta() })` (replace the
1-element array), never bundled into the edit field-diff.

Concurrency: single-slot replace = last-write-wins by design ("latest
receipt"), which is the intended behavior. `arrayUnion` only becomes
relevant if we lift to multiple attachments later.

## Storage path + rules (shared household)

- **Path:** `households/{hid}/bills/{billId}/{attId}.{ext}` — both members
  read/write.
- **Rules** (deploy separately — `firebase deploy --only storage`; Vercel
  does NOT deploy these):

```
match /households/{hid}/{allPaths=**} {
  allow read, write: if request.auth != null
    && request.auth.uid in
       firestore.get(/databases/(default)/documents/households/$(hid)).data.members
    && request.resource.size < 15 * 1024 * 1024;
}
```

Cross-service rule (Storage reads Firestore membership) — mirrors the
existing bill Firestore rules. Verify with a real upload before any UI.

## Capture → store → render

- **Capture** lives **inline inside the Add/Edit Bill modal** as an
  "Attachment" section (Take photo · Photo library · Attach PDF), each a
  hidden `<input>` reconfigured per choice
  (`capture="environment"` for camera). NOT a separate action-sheet —
  avoids the "nested sheet tears down the editor" trap; BillBud has one
  full-screen modal already.
- **Images:** compress client-side before upload — `createImageBitmap`
  with EXIF orientation, downscale to 1600px / JPEG q0.82. HEIC →
  try/catch fallback to uploading the original. (1600px also keeps bill
  text legible for Phase 2 AI extraction.)
- **PDF:** uploaded as-is, `contentType: application/pdf`, stored
  **inline** (never `Content-Disposition: attachment` — blanks iOS).
- **Upload:** resumable with an inline progress row; client size cap 10 MB.
- **Render:** thumbnail (image) / row with PDF icon + filename + size in
  the **detail** view; ✕ to remove (confirm).

## Open / preview (scoped down by the image+PDF-only decision)

- **Image** → in-app `<img>` overlay (works everywhere).
- **PDF on desktop/Android** → open in a new tab (native render).
- **PDF on iOS** (incl. installed PWA) → in-app viewer-iframe overlay
  (`docs.google.com/viewer?embedded=true&url=ENCODED`) **+ an "Open ↗"
  top-level fallback** (Safari renders PDF natively at top level).

iOS detection (iPadOS masquerades as Mac):
`/iPad|iPhone|iPod/.test(ua) || (maxTouchPoints > 1 && /Macintosh/.test(ua))`

## Build order (one commit each)

1. **Storage rules + data model** — deploy household-membership rules,
   `getStorage` via CDN, `attachments: []` on create. Verify one real
   upload before UI. *(Riskiest infra piece.)*
2. **Upload pipeline** — compression, resumable + progress, size cap,
   `updateDoc({attachments})` write, old-blob cleanup on replace.
3. **Capture UI** in Add/Edit modal + remove (confirm).
4. **Detail rendering** + open/preview viewer (image overlay; PDF routing).
5. **iOS hygiene** — no-cache headers in `vercel.json`, visible version
   string, real-iPhone-PWA test.

## Test gate (extends SYNC.md cross-user verification)

- Reload test: attach, hard refresh, still there.
- Cross-user: A attaches → B sees it within 2s (onSnapshot).
- Replace: attach over an existing one → old blob deleted, no orphan.
- Bill hard-delete: attachment blob cleaned up.
- **Real iPhone, installed PWA** — not just desktop Safari: image overlay
  opens; PDF opens via viewer + "Open ↗" works.
- DevTools console open throughout; watch for `permission-denied`
  (usually = Storage rules not deployed).
