# Phase 2 — AI extraction & auto-fill (Sonnet 4.6)

Snap/attach a bill → Claude reads it → the Add Bill form is pre-filled
(name, amount, currency, category, frequency, due date) → the user reviews
and saves. Builds directly on Phase 1: the receipt is already uploaded, so
extraction reads the exact image we stored.

## The one architectural fact

**The Anthropic API key cannot live in the browser** — shipping it in
`index.html` would let anyone read and spend it. So Phase 2 introduces our
**first backend**: a single Vercel serverless function at `/api/extract`
that holds the key as an env var and calls Claude. The frontend stays the
same no-build static `index.html`; we just add one API route.

```
[Phase 1 receipt, already in Storage]
        │  POST { url, kind, idToken }
        ▼
/api/extract  (Vercel function — holds ANTHROPIC_API_KEY)
   1. verify the caller's Firebase ID token (only our users)
   2. confirm url belongs to our Storage bucket (anti-SSRF)
   3. call Claude Sonnet 4.6 (vision + structured output) with the prompt
        │  ← validated JSON { name, amount, currency, category, frequency, dueDate, confidence, notes }
        ▼
[Add Bill form pre-filled → user reviews → Save (existing Phase 1 path)]
```

## Model & cost

`claude-sonnet-4-6` (chosen). Per scan: image ~1,000–1,600 tok + prompt
~600 tok in, ~150 tok out. At $3/$15 per 1M → **~₹0.55–0.75 per scan**.
Thinking disabled + `effort: "low"` (extraction is direct and the schema
constrains the output) keeps it fast and cheap; bump effort only if messy
bills read poorly. Even at thousands of scans this is rupees, not a real
cost lever — the API spend is not the constraint.

## The serverless function — `/api/extract.js`

Raw `fetch` to the Anthropic API (no SDK / npm dependency — keeps the
no-build ethos; Vercel's Node runtime has global `fetch`). Responsibilities:

1. **Auth.** Require an `Authorization: Bearer <Firebase ID token>` header.
   Verify it locally (RS256 against Google's `securetoken` public certs,
   cached; check `aud` / `iss` == our project `billos-edd54`, `exp`). No
   `firebase-admin` dependency. Reject → 401. This bounds abuse to our
   signed-in household users.
2. **Anti-SSRF.** Accept `url` only if its host is our Storage bucket
   (`firebasestorage.googleapis.com` / `*.firebasestorage.app` for
   `billos-edd54`). Reject arbitrary URLs.
3. **Claude call.** Build an `image` block (kind `image`) or `document`
   block (kind `file`/PDF) with `source: { type: "url", url }`, send the
   prompt + schema below, parse the structured JSON, return it.
4. **Errors.** Map Anthropic 4xx/5xx to a clean `{ error }`; never leak the
   key. Reasonable timeout.

Image source is the **URL** (Claude fetches the tokenized Storage URL — it's
public), so the client doesn't re-upload bytes.

## The extraction prompt (source of truth)

**System prompt:**

```
You are a bill data extractor for an Indian household bill-tracking app. You
are given an image or PDF of a bill, invoice, receipt, statement, or payment
screenshot. Extract the key fields and return them via the structured output
schema. Return data only — no prose.

Fields:
- name: The biller/service name a person would recognize — e.g. "BSES
  Rajdhani", "Airtel Broadband", "Netflix", "HDFC Credit Card", "Maid
  salary". Short (≤ 40 chars). Prefer the brand/provider over a long legal
  entity name.
- amount: The total amount payable, as a plain number — no currency symbol,
  no commas, no spaces. Indian bills group digits like ₹1,00,000 → return
  100000. On a credit-card statement use the total amount due (not the
  minimum due). Use decimals only for genuine paise/cents.
- currency: "INR" for ₹ / Rs / INR or any clearly-Indian bill; "USD" only if
  the bill is clearly in US dollars. When unsure, default to "INR".
- category, exactly one of:
    utilities      — electricity, water, gas, broadband/internet, mobile/DTH,
                     society maintenance
    subscriptions  — streaming, software/SaaS, memberships, OTT, apps
    credit_cards   — credit-card statements/bills
    people         — payments to household staff (maid, cook, driver, guard,
                     nanny)
    other          — anything that doesn't fit the above
- frequency, exactly one of: monthly | weekly | quarterly | yearly |
  one_time. Infer from the bill ("monthly rental", "annual subscription",
  quarterly cycle). For a recurring bill with no clear period use "monthly";
  for a one-off invoice/receipt use "one_time".
- dueDate: the payment due date as YYYY-MM-DD. If only a day/month shows,
  infer the most likely upcoming year. If there is genuinely no due date
  (e.g. a paid receipt), return "". Never invent a date. Indian bills use
  DD/MM/YYYY and the Asia/Kolkata timezone — read ambiguous dates that way.
- confidence: "high" if the key fields are clearly legible; "medium" if some
  were inferred; "low" if the image is unclear or this may not be a bill.
- notes: optional, ≤ 60 chars — only a genuinely useful detail like an
  account/consumer number's last 4 digits or the billing month. Else "".

If this is not a bill or you cannot read it, set confidence "low" and return
best guesses (or "" where you truly have nothing).
```

**User message:** the image/document block + `"Extract this bill's details."`

**Structured-output schema** (`output_config.format`):

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "name":       { "type": "string" },
    "amount":     { "type": "number" },
    "currency":   { "type": "string", "enum": ["INR", "USD"] },
    "category":   { "type": "string", "enum": ["utilities","subscriptions","credit_cards","people","other"] },
    "frequency":  { "type": "string", "enum": ["monthly","weekly","quarterly","yearly","one_time"] },
    "dueDate":    { "type": "string" },
    "confidence": { "type": "string", "enum": ["high","medium","low"] },
    "notes":      { "type": "string" }
  },
  "required": ["name","amount","currency","category","frequency","dueDate","confidence","notes"]
}
```

(All fields required + `additionalProperties:false` per structured-output
rules; `dueDate`/`notes` use `""` rather than null to avoid union types.
Enums match the app's exact `cat` / `freq` / `currency` values.)

**Request shape (raw HTTP from the function):**

```
POST https://api.anthropic.com/v1/messages
  x-api-key: $ANTHROPIC_API_KEY
  anthropic-version: 2023-06-01
  content-type: application/json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "thinking": { "type": "disabled" },
  "output_config": { "effort": "low", "format": { "type": "json_schema", "schema": <schema above> } },
  "system": "<system prompt above>",
  "messages": [{ "role": "user", "content": [
    { "type": "image",    "source": { "type": "url", "url": "<image url>" } },   // kind image
    // OR for PDF:
    { "type": "document", "source": { "type": "url", "url": "<pdf url>" } },     // kind file
    { "type": "text", "text": "Extract this bill's details." }
  ]}]
}
```

Structured output guarantees the first content block is valid JSON matching
the schema — parse `content[0].text`.

## Client UX

- After a receipt is attached (Phase 1 filled state), show an
  **"✨ Auto-fill from receipt"** button in the attachment slot. User-
  initiated, so we never spend API on an attach the user didn't intend.
- Tap → loading state → POST to `/api/extract` with the receipt `url` +
  `kind` + the user's Firebase ID token → populate the form.
- **Population policy: fill blank fields only.** Never clobber a value the
  user already typed. (For a new bill, all fields are blank → fills
  everything; for an edit, fills only the gaps.) Then re-paint the form and
  toast "Filled from receipt — review and save."
- **Low confidence / not-a-bill:** if `confidence == "low"`, don't auto-fill
  silently — show a gentle note ("Couldn't read this clearly — please check
  the fields") and still offer the best-guess values for the blank fields.
- Always ends at the existing review-and-Save step — extraction never
  writes a bill on its own.

## Security

- ID-token verification (above) — only our authenticated users hit the
  endpoint.
- Anti-SSRF host allowlist on `url`.
- API key only in Vercel env (never in the repo or client).
- Soft per-user cap (fast-follow): a simple daily limit if abuse appears.
  Not needed for V1 at two users.

## Build order (one sub-task each, confirm between)

1. `/api/extract.js` — function with ID-token verify + SSRF guard + the
   Claude call + schema. Set `ANTHROPIC_API_KEY` in Vercel. Verify with a
   curl/console call before any UI.
2. Client — "Auto-fill from receipt" button, the fetch, fill-blank-only
   population, loading/error/low-confidence states.
3. Polish + test on real Indian bills (electricity, broadband, credit card,
   a staff-salary note, a PDF), then ship.

## Required actions on AA's part

1. **Add `ANTHROPIC_API_KEY` in Vercel** → Project → Settings → Environment
   Variables (Production + Preview). This is the gate for sub-task 1.
2. Confirm the two UX calls above (auto-fill *button* vs auto-run; fill-blank
   -only) — recommendations noted; happy to change.

## Test gate

- A clear electricity bill → fields sensible, amount numeric (no ₹/commas),
  category `utilities`, correct due date.
- Credit-card statement → uses total due, category `credit_cards`.
- A PDF bill → extracts the same as an image.
- A blurry/non-bill image → `confidence: low`, no silent garbage.
- Cost check: confirm ~₹0.5–0.75/scan in the Anthropic console.
- Auto-fill never overwrites a field the user already typed.
