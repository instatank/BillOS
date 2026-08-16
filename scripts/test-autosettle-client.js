// Same rule, client side: pulls the real helpers out of index.html and
// checks the client sweep agrees with the Cloud Function.
process.env.TZ = 'Asia/Kolkata';
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const mod = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];

function grab(name, kind = 'function') {
  const re = kind === 'function'
    ? new RegExp(`\\n  function ${name}\\([\\s\\S]*?\\n  \\}`)
    : new RegExp(`\\n  const ${name} = [^\\n]*`);
  const m = mod.match(re);
  if (!m) throw new Error('could not extract ' + name);
  return m[0];
}

const src = [
  grab('PERIODIC_FREQS', 'const'),
  grab('startOfDay'),
  grab('dateFromBill'),
  grab('addMonthsClamped'),
  grab('advanceNextDue'),
  grab('autoSettleDueDate'),
].join('\n');

const api = new Function(src + `
  return { autoSettleDueDate, advanceNextDue, startOfDay };
`)();

let fails = 0;
function eq(label, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { console.log('FAIL', label, '→ got', g, 'want', w); fails++; }
  else console.log('ok  ', label, g);
}

// Firestore Timestamp stand-in: bills anchor nextDue at 09:00 IST.
const ts = (y, m, d) => ({ toDate: () => new Date(Date.UTC(y, m - 1, d, 3, 30)) });
const iso = (dt) => dt ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` : null;

// Freeze "today" at 17 Aug 2026 IST.
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...a) { return a.length ? new RealDate(...a) : new RealDate(RealDate.UTC(2026, 7, 17, 6, 0)); }
  static now() { return RealDate.UTC(2026, 7, 17, 6, 0); }
};

const auto = (over = {}) => Object.assign({
  paymentMode: 'auto-renew', status: 'active', freq: 'monthly', nextDue: ts(2026, 8, 16), amount: 499,
}, over);

eq('due yesterday → settles', iso(api.autoSettleDueDate(auto())), '2026-08-16');
eq('due today → not yet', api.autoSettleDueDate(auto({ nextDue: ts(2026, 8, 17) })), null);
eq('due tomorrow → not yet', api.autoSettleDueDate(auto({ nextDue: ts(2026, 8, 18) })), null);
eq('manual → never', api.autoSettleDueDate(auto({ paymentMode: 'manual' })), null);
eq('paused → never', api.autoSettleDueDate(auto({ status: 'paused' })), null);
eq('cancelled → never', api.autoSettleDueDate(auto({ status: 'cancelled' })), null);
eq('one_time → never', api.autoSettleDueDate(auto({ freq: 'one_time' })), null);
eq('no due date → never', api.autoSettleDueDate(auto({ nextDue: null })), null);
eq('legacy ISO nextDue still works client-side', iso(api.autoSettleDueDate(auto({ nextDue: '2026-08-16' }))), '2026-08-16');

// Catch-up loop, transcribed from settleAutoRenewBill.
function catchUp(bill) {
  const dueDate = api.autoSettleDueDate(bill);
  if (!dueDate) return null;
  const freq = bill.freq || bill.frequency || 'monthly';
  const todayStart = api.startOfDay(new Date());
  let cur = dueDate, settledFor = null, cycles = 0;
  while (api.startOfDay(cur) < todayStart && cycles < 60) {
    const next = api.advanceNextDue(cur, freq);
    if (!next) break;
    settledFor = cur; cur = next; cycles++;
  }
  return settledFor ? { settledFor: iso(settledFor), next: iso(cur), cycles } : null;
}

eq('one cycle', catchUp(auto()), { settledFor: '2026-08-16', next: '2026-09-16', cycles: 1 });
eq('stale 3 months → catches up (matches function)',
  catchUp(auto({ nextDue: ts(2026, 5, 10) })), { settledFor: '2026-08-10', next: '2026-09-10', cycles: 4 });
eq('weekly', catchUp(auto({ freq: 'weekly', nextDue: ts(2026, 8, 1) })),
  { settledFor: '2026-08-15', next: '2026-08-22', cycles: 3 });
eq('yearly not yet due this year', catchUp(auto({ freq: 'yearly', nextDue: ts(2026, 12, 1) })), null);

// Idempotence: re-running on the post-settle state must be a no-op.
const after = auto({ nextDue: ts(2026, 9, 16) });
eq('settled bill is inert', catchUp(after), null);

console.log(fails ? `\n${fails} FAILURES` : '\nall assertions passed');
process.exit(fails ? 1 : 0);
