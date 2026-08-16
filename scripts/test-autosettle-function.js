// Pulls the pure helpers straight out of functions/index.js and exercises
// the date math / eligibility rule. Not a shipped test — a one-off gate.
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '..', 'functions', 'index.js'), 'utf8');
const start = src.indexOf('const IST_OFFSET_MS');
const end = src.indexOf('exports.autoSettleAutoRenew');
if (start < 0 || end < 0) throw new Error('markers not found');
const block = src.slice(start, end);

const ctx = {};
const fn = new Function(block + `
  return { istYMD, ymdToMillis, istStartOfTodayMillis, advanceYMD, autoSettleEligible, catchUpFrom, PERIODIC_FREQS };
`);
Object.assign(ctx, fn());

let fails = 0;
function eq(label, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { console.log('FAIL', label, '→ got', g, 'want', w); fails++; }
  else console.log('ok  ', label, g);
}

const IST = 5.5 * 3600 * 1000;
// A bill due on YYYY-MM-DD is stored at 09:00 IST (03:30 UTC).
const dueMs = (y, m, d) => Date.UTC(y, m - 1, d, 3, 30);
// Start of a given IST day, as a UTC instant.
const dayStart = (y, m, d) => Date.UTC(y, m - 1, d) - IST;
const ts = (ms) => ({ toMillis: () => ms });

// ── istYMD reads the IST calendar date, whatever the anchor ──────────
eq('istYMD 09:00 IST anchor', ctx.istYMD(dueMs(2026, 8, 16)), { y: 2026, m: 7, d: 16 });
eq('istYMD midnight IST anchor (legacy)', ctx.istYMD(Date.UTC(2026, 7, 15, 18, 30)), { y: 2026, m: 7, d: 16 });
eq('istYMD 23:50 IST (UTC is still prev day)', ctx.istYMD(Date.UTC(2026, 7, 16, 18, 20)), { y: 2026, m: 7, d: 16 });

// ── eligibility: only the day AFTER the due date ─────────────────────
const auto = (over = {}) => Object.assign({
  paymentMode: 'auto-renew', status: 'active', freq: 'monthly',
  nextDue: ts(dueMs(2026, 8, 16)), amount: 499,
}, over);
const today16 = dayStart(2026, 8, 16);
const today17 = dayStart(2026, 8, 17);

eq('due today → not yet', ctx.autoSettleEligible(auto(), today16), false);
eq('due yesterday → settles', ctx.autoSettleEligible(auto(), today17), true);
eq('manual mode → never', ctx.autoSettleEligible(auto({ paymentMode: 'manual' }), today17), false);
eq('no mode set → never', ctx.autoSettleEligible(auto({ paymentMode: undefined }), today17), false);
eq('paused → never', ctx.autoSettleEligible(auto({ status: 'paused' }), today17), false);
eq('cancelled → never', ctx.autoSettleEligible(auto({ status: 'cancelled' }), today17), false);
eq('one_time → never', ctx.autoSettleEligible(auto({ freq: 'one_time' }), today17), false);
eq('legacy frequency field', ctx.autoSettleEligible({ paymentMode: 'auto-renew', status: 'active', frequency: 'monthly', nextDue: ts(dueMs(2026, 8, 16)) }, today17), true);
eq('no due date → never', ctx.autoSettleEligible(auto({ nextDue: null }), today17), false);
eq('ISO-string legacy nextDue → never (needs a Timestamp)', ctx.autoSettleEligible(auto({ nextDue: '2026-08-16' }), today17), false);
eq('legacy midnight-IST anchor, due today → not yet',
  ctx.autoSettleEligible(auto({ nextDue: ts(Date.UTC(2026, 7, 15, 18, 30)) }), today16), false);

// ── catch-up walk ────────────────────────────────────────────────────
const c1 = ctx.catchUpFrom(dueMs(2026, 8, 16), 'monthly', today17);
eq('one cycle: settles 16 Aug, next 16 Sep', [c1.settledFor, c1.next, c1.cycles],
  [{ y: 2026, m: 7, d: 16 }, { y: 2026, m: 8, d: 16 }, 1]);

// Missed several months (function down / app unopened): due 10 May, today
// 17 Aug → settles May, Jun, Jul, Aug and lands on 10 Sep.
const c2 = ctx.catchUpFrom(dueMs(2026, 5, 10), 'monthly', dayStart(2026, 8, 17));
eq('catch-up: last settled 10 Aug, next 10 Sep, 4 cycles',
  [c2.settledFor, c2.next, c2.cycles], [{ y: 2026, m: 7, d: 10 }, { y: 2026, m: 8, d: 10 }, 4]);

// Month-end clamping (31 Jan monthly → 28 Feb), matching the client.
const c3 = ctx.catchUpFrom(dueMs(2026, 1, 31), 'monthly', dayStart(2026, 2, 1));
eq('31 Jan → 28 Feb (clamped)', [c3.settledFor, c3.next], [{ y: 2026, m: 0, d: 31 }, { y: 2026, m: 1, d: 28 }]);

// Leap year.
const c4 = ctx.catchUpFrom(dueMs(2024, 1, 30), 'monthly', dayStart(2024, 2, 1));
eq('30 Jan 2024 → 29 Feb 2024', c4.next, { y: 2024, m: 1, d: 29 });

// Year rollover + other frequencies.
eq('weekly 28 Dec → 4 Jan', ctx.advanceYMD({ y: 2026, m: 11, d: 28 }, 'weekly'), { y: 2027, m: 0, d: 4 });
eq('quarterly 30 Nov → 28 Feb', ctx.advanceYMD({ y: 2026, m: 10, d: 30 }, 'quarterly'), { y: 2027, m: 1, d: 28 });
eq('yearly 29 Feb 2024 → 28 Feb 2025', ctx.advanceYMD({ y: 2024, m: 1, d: 29 }, 'yearly'), { y: 2025, m: 1, d: 28 });
eq('one_time has no next', ctx.advanceYMD({ y: 2026, m: 1, d: 1 }, 'one_time'), null);

// Cap holds and still makes progress.
const c5 = ctx.catchUpFrom(dueMs(2020, 1, 1), 'weekly', dayStart(2026, 8, 17));
eq('weekly, 6 years stale → capped at 60 cycles', c5.cycles, 60);

// A settled bill is never eligible again the same day (idempotence).
const settled = auto({ nextDue: ts(ctx.ymdToMillis(c1.next)) });
eq('after settling, not eligible again', ctx.autoSettleEligible(settled, today17), false);

console.log(fails ? `\n${fails} FAILURES` : '\nall assertions passed');
process.exit(fails ? 1 : 0);
