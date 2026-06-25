// BillBud — Phase 2: bill extraction endpoint (Vercel serverless function).
//
// POST /api/extract  { url, kind }   Authorization: Bearer <Firebase ID token>
//   - verifies the caller's Firebase ID token (RS256 vs Google securetoken
//     certs) so only our signed-in users can spend the API key
//   - only accepts a Storage URL from our own bucket (anti-SSRF)
//   - calls Claude Sonnet 4.6 (vision + structured output) and returns the
//     validated fields: { name, amount, currency, category, frequency,
//     dueDate, confidence, notes }
//
// No npm deps: built-in `crypto` + global `fetch` (Vercel Node runtime).
// The ANTHROPIC_API_KEY lives only in Vercel env vars, never in the client.

const crypto = require('crypto');

const PROJECT_ID = 'billos-edd54';
const STORAGE_HOSTS = new Set(['firebasestorage.googleapis.com', 'storage.googleapis.com']);

const SYSTEM_PROMPT = `You are a bill data extractor for an Indian household bill-tracking app. You are given an image or PDF of a bill, invoice, receipt, statement, or payment screenshot. Extract the key fields and return them via the structured output schema. Return data only — no prose.

Fields:
- name: the biller/service name a person would recognize — e.g. "BSES Rajdhani", "Airtel Broadband", "Netflix", "HDFC Credit Card", "Maid salary". Short (≤ 40 chars). Prefer the brand/provider over a long legal entity name.
- amount: the total amount payable, as a plain number — no currency symbol, no commas, no spaces. Indian bills group digits like ₹1,00,000 → return 100000. On a credit-card statement use the total amount due (not the minimum due). Use decimals only for genuine paise/cents.
- currency: "INR" for ₹ / Rs / INR or any clearly-Indian bill; "USD" only if the bill is clearly in US dollars. When unsure, default to "INR".
- category, exactly one of:
    utilities      — electricity, water, gas, broadband/internet, mobile/DTH, society maintenance
    subscriptions  — streaming, software/SaaS, memberships, OTT, apps
    credit_cards   — credit-card statements/bills
    people         — payments to household staff (maid, cook, driver, guard, nanny)
    other          — anything that doesn't fit the above
- frequency, exactly one of: monthly | weekly | quarterly | yearly | one_time. Infer from the bill ("monthly rental", "annual subscription", quarterly cycle). For a recurring bill with no clear period use "monthly"; for a one-off invoice/receipt use "one_time".
- dueDate: the payment due date as YYYY-MM-DD. If only a day/month shows, infer the most likely upcoming year. If there is genuinely no due date (e.g. a paid receipt), return "". Never invent a date. Indian bills use DD/MM/YYYY and the Asia/Kolkata timezone — read ambiguous dates that way.
- confidence: "high" if the key fields are clearly legible; "medium" if some were inferred; "low" if the image is unclear or this may not be a bill.
- notes: optional, ≤ 60 chars — only a genuinely useful detail like an account/consumer number's last 4 digits or the billing month. Else "".

If this is not a bill or you cannot read it, set confidence "low" and return best guesses (or "" where you truly have nothing).`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name:       { type: 'string' },
    amount:     { type: 'number' },
    currency:   { type: 'string', enum: ['INR', 'USD'] },
    category:   { type: 'string', enum: ['utilities', 'subscriptions', 'credit_cards', 'people', 'other'] },
    frequency:  { type: 'string', enum: ['monthly', 'weekly', 'quarterly', 'yearly', 'one_time'] },
    dueDate:    { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes:      { type: 'string' },
  },
  required: ['name', 'amount', 'currency', 'category', 'frequency', 'dueDate', 'confidence', 'notes'],
};

// ── Firebase ID-token verification (no firebase-admin) ────────────────
let certCache = { certs: null, exp: 0 };
async function googleCerts() {
  const now = Date.now();
  if (certCache.certs && now < certCache.exp) return certCache.certs;
  const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if (!res.ok) throw new Error('certs fetch failed');
  const certs = await res.json();
  const m = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
  certCache = { certs, exp: now + (m ? parseInt(m[1], 10) * 1000 : 3600 * 1000) };
  return certs;
}
function b64url(str) { return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }
async function verifyIdToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed');
  const header = JSON.parse(b64url(parts[0]).toString('utf8'));
  const payload = JSON.parse(b64url(parts[1]).toString('utf8'));
  if (header.alg !== 'RS256' || !header.kid) throw new Error('bad header');
  const cert = (await googleCerts())[header.kid];
  if (!cert) throw new Error('unknown kid');
  const v = crypto.createVerify('RSA-SHA256');
  v.update(parts[0] + '.' + parts[1]); v.end();
  if (!v.verify(cert, b64url(parts[2]))) throw new Error('bad signature');
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('expired');
  if (payload.aud !== PROJECT_ID) throw new Error('bad aud');
  if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) throw new Error('bad iss');
  if (!payload.sub) throw new Error('no sub');
  return payload;
}

function isAllowedStorageUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && STORAGE_HOSTS.has(url.hostname) && url.pathname.includes(PROJECT_ID);
  } catch { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }
  try {
    const authz = req.headers.authorization || '';
    const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!token) { res.status(401).json({ error: 'missing token' }); return; }
    try { await verifyIdToken(token); }
    catch { res.status(401).json({ error: 'invalid token' }); return; }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { url, kind } = body;
    if (!url || !isAllowedStorageUrl(url)) { res.status(400).json({ error: 'invalid url' }); return; }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'server not configured' }); return; }

    const sourceBlock = kind === 'file'
      ? { type: 'document', source: { type: 'url', url } }
      : { type: 'image', source: { type: 'url', url } };

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: [sourceBlock, { type: 'text', text: "Extract this bill's details." }] }],
      }),
    });

    if (!anthropicRes.ok) {
      console.error('[extract] anthropic error', anthropicRes.status, await anthropicRes.text());
      res.status(502).json({ error: 'extraction failed' });
      return;
    }
    const data = await anthropicRes.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) { res.status(502).json({ error: 'no extraction' }); return; }
    let parsed;
    try { parsed = JSON.parse(textBlock.text); }
    catch { res.status(502).json({ error: 'bad extraction format' }); return; }

    res.status(200).json({ ok: true, data: parsed });
  } catch (e) {
    console.error('[extract] error', e);
    res.status(500).json({ error: 'server error' });
  }
};
