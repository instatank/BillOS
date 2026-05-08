// billos-data.jsx — sample bills, formatters, category config, icons.
// Pure data + helpers + small icon components. No theme dependencies.

// ─── Categories (5 locked, per PRD) ────────────────────────────────
const BILLOS_CATEGORIES = {
  utilities:     { id: 'utilities',     label: 'Utilities',     short: 'Utility',  dusk: '#5aa9ff', linen: '#3a6ea5', voyage: '#3b82f6' },
  subscriptions: { id: 'subscriptions', label: 'Subscriptions', short: 'Subs',     dusk: '#b58cff', linen: '#7c5fb0', voyage: '#a855f7' },
  credit_cards:  { id: 'credit_cards',  label: 'Credit Cards',  short: 'Card',     dusk: '#f0b057', linen: '#b07a30', voyage: '#f59e0b' },
  people:        { id: 'people',        label: 'Household Staff', short: 'People', dusk: '#6fd28a', linen: '#4f8a5c', voyage: '#22c55e' },
  other:         { id: 'other',         label: 'Other',         short: 'Other',    dusk: '#8a93a0', linen: '#7a6f60', voyage: '#64748b' },
};
const CAT_ORDER = ['utilities', 'subscriptions', 'credit_cards', 'people', 'other'];

// ─── Today (anchor for relative due dates) ─────────────────────────
const BILLOS_TODAY = new Date('2026-05-08T09:00:00+05:30');

// ─── Sample bills (Delhi household, AA + Mom) ──────────────────────
// Dates relative to BILLOS_TODAY — chosen to populate "Due soon", "This month", "Later".
const BILLOS_SEED_BILLS = [
  // utilities
  { id: 'b01', name: 'IGL Piped Gas',           amount: 1150,  freq: 'monthly',   cat: 'utilities',     owner: 'shared', nextDue: '2026-05-09', status: 'active', notes: 'Auto-debit from HDFC' },
  { id: 'b02', name: 'Society Maintenance',     amount: 6500,  freq: 'monthly',   cat: 'utilities',     owner: 'shared', nextDue: '2026-05-10', status: 'active' },
  { id: 'b03', name: 'BSES Rajdhani',           amount: 4280,  freq: 'monthly',   cat: 'utilities',     owner: 'shared', nextDue: '2026-05-12', status: 'active', notes: 'Power bill' },
  { id: 'b04', name: 'Tata Play DTH',           amount: 450,   freq: 'monthly',   cat: 'utilities',     owner: 'mom',    nextDue: '2026-05-14', status: 'active' },
  { id: 'b05', name: 'ACT Fibernet',            amount: 1499,  freq: 'monthly',   cat: 'utilities',     owner: 'aa',     nextDue: '2026-05-18', status: 'active' },
  { id: 'b06', name: 'Airtel Postpaid',         amount: 599,   freq: 'monthly',   cat: 'utilities',     owner: 'aa',     nextDue: '2026-05-22', status: 'active' },
  { id: 'b07', name: 'Delhi Jal Board',         amount: 680,   freq: 'quarterly', cat: 'utilities',     owner: 'shared', nextDue: '2026-06-02', status: 'active' },
  // subscriptions
  { id: 'b08', name: 'Netflix Premium',         amount: 649,   freq: 'monthly',   cat: 'subscriptions', owner: 'shared', nextDue: '2026-05-11', status: 'active' },
  { id: 'b09', name: 'Spotify Family',          amount: 179,   freq: 'monthly',   cat: 'subscriptions', owner: 'aa',     nextDue: '2026-05-19', status: 'active' },
  { id: 'b10', name: 'iCloud+ 200GB',           amount: 219,   freq: 'monthly',   cat: 'subscriptions', owner: 'aa',     nextDue: '2026-05-26', status: 'active' },
  { id: 'b11', name: 'Claude Pro',              amount: 1650,  freq: 'monthly',   cat: 'subscriptions', owner: 'aa',     nextDue: '2026-05-28', status: 'active' },
  { id: 'b12', name: 'Amazon Prime',            amount: 1499,  freq: 'yearly',    cat: 'subscriptions', owner: 'aa',     nextDue: '2026-09-04', status: 'active' },
  // credit cards
  { id: 'b13', name: 'HDFC Regalia',            amount: 38400, freq: 'monthly',   cat: 'credit_cards',  owner: 'aa',     nextDue: '2026-05-13', status: 'active', notes: 'Statement on the 5th' },
  { id: 'b14', name: 'Axis Magnus',             amount: 52100, freq: 'monthly',   cat: 'credit_cards',  owner: 'aa',     nextDue: '2026-05-21', status: 'active' },
  { id: 'b15', name: 'Amex Platinum',           amount: 18500, freq: 'monthly',   cat: 'credit_cards',  owner: 'mom',    nextDue: '2026-05-25', status: 'active' },
  // people
  { id: 'b16', name: 'Sushila ji (cook)',       amount: 12000, freq: 'monthly',   cat: 'people',        owner: 'shared', nextDue: '2026-05-31', status: 'active' },
  { id: 'b17', name: 'Ramesh (housekeeper)',    amount: 8000,  freq: 'monthly',   cat: 'people',        owner: 'shared', nextDue: '2026-05-31', status: 'active' },
  { id: 'b18', name: 'Suresh (driver)',         amount: 22000, freq: 'monthly',   cat: 'people',        owner: 'shared', nextDue: '2026-05-31', status: 'active' },
  { id: 'b19', name: 'Hari (gardener)',         amount: 2500,  freq: 'monthly',   cat: 'people',        owner: 'shared', nextDue: '2026-05-31', status: 'active' },
  // other (insurance, tax)
  { id: 'b20', name: 'Property Tax',            amount: 15200, freq: 'yearly',    cat: 'other',         owner: 'shared', nextDue: '2026-06-30', status: 'active' },
  { id: 'b21', name: 'LIC Premium',             amount: 24000, freq: 'yearly',    cat: 'other',         owner: 'mom',    nextDue: '2026-08-14', status: 'active' },
  { id: 'b22', name: 'Acko Car Insurance',      amount: 18400, freq: 'yearly',    cat: 'other',         owner: 'aa',     nextDue: '2026-11-02', status: 'active' },
  // an old paused one, to demonstrate state
  { id: 'b23', name: 'YouTube Premium',         amount: 189,   freq: 'monthly',   cat: 'subscriptions', owner: 'aa',     nextDue: '2026-05-30', status: 'paused', notes: 'Paused while travelling' },
];

const BILLOS_HOUSEHOLD = {
  name: 'Safdarjung Household',
  members: [
    { uid: 'aa',  displayName: 'Akshay',   short: 'A', emoji: '☕' },
    { uid: 'mom', displayName: 'Mom',      short: 'M', emoji: '🌿' },
  ],
  inviteCode: '4 7 2  9 1 8',
  inviteCodeRaw: '472918',
  inviteExpiresInHours: 23,
};

// ─── Formatters ────────────────────────────────────────────────────
// Indian comma grouping: 1,00,000 (lakhs/crores).
function indianGroup(n) {
  const s = Math.round(Math.abs(n)).toString();
  if (s.length <= 3) return (n < 0 ? '-' : '') + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const restGrouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + restGrouped + ',' + last3;
}
function fmtINR(n, opts = {}) {
  const sym = opts.symbol === false ? '' : '₹';
  return sym + indianGroup(n);
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00+05:30');
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtDateShort(iso) {
  const d = new Date(iso + 'T00:00:00+05:30');
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
// Days between today (BILLOS_TODAY) and an iso date — positive = future.
function daysFromToday(iso) {
  const d = new Date(iso + 'T00:00:00+05:30');
  const t = new Date(BILLOS_TODAY); t.setHours(0,0,0,0);
  return Math.round((d - t) / (1000 * 60 * 60 * 24));
}
function dueLabel(iso) {
  const n = daysFromToday(iso);
  if (n < -1) return `${-n} days late`;
  if (n === -1) return 'Yesterday';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n <= 6) return `in ${n} days`;
  if (n <= 13) return `in ${n} days`;
  if (n <= 30) return fmtDateShort(iso);
  return fmtDateShort(iso);
}
function dueBucket(iso) {
  const n = daysFromToday(iso);
  if (n < 0) return 'overdue';
  if (n <= 7) return 'this_week';
  if (n <= 31) return 'this_month';
  return 'later';
}
const FREQ_LABEL = { weekly: 'every week', monthly: 'every month', quarterly: 'every 3 months', yearly: 'every year', one_time: 'one time' };

// ─── Category icons ────────────────────────────────────────────────
function CatIcon({ cat, size = 16, color = 'currentColor', strokeWidth = 1.8 }) {
  const s = { width: size, height: size, display: 'block' };
  const props = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (cat) {
    case 'utilities':
      return (
        <svg viewBox="0 0 24 24" style={s} {...props}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      );
    case 'subscriptions':
      return (
        <svg viewBox="0 0 24 24" style={s} {...props}>
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 4v5h-5" />
        </svg>
      );
    case 'credit_cards':
      return (
        <svg viewBox="0 0 24 24" style={s} {...props}>
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M2.5 10h19" />
          <path d="M6 15.5h4" />
        </svg>
      );
    case 'people':
      return (
        <svg viewBox="0 0 24 24" style={s} {...props}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3.7 4.2-5.5 7-5.5s5.5 1.8 7 5.5" />
        </svg>
      );
    case 'other':
    default:
      return (
        <svg viewBox="0 0 24 24" style={s} {...props}>
          <circle cx="6"  cy="6"  r="1.5" fill={color} stroke="none" />
          <circle cx="12" cy="6"  r="1.5" fill={color} stroke="none" />
          <circle cx="18" cy="6"  r="1.5" fill={color} stroke="none" />
          <circle cx="6"  cy="12" r="1.5" fill={color} stroke="none" />
          <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
          <circle cx="18" cy="12" r="1.5" fill={color} stroke="none" />
          <circle cx="6"  cy="18" r="1.5" fill={color} stroke="none" />
          <circle cx="12" cy="18" r="1.5" fill={color} stroke="none" />
          <circle cx="18" cy="18" r="1.5" fill={color} stroke="none" />
        </svg>
      );
  }
}

// Frequency cycle pill content
const FREQS = [
  { id: 'weekly',    label: 'Weekly' },
  { id: 'monthly',   label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly',    label: 'Yearly' },
  { id: 'one_time',  label: 'One time' },
];

Object.assign(window, {
  BILLOS_CATEGORIES, CAT_ORDER, BILLOS_TODAY, BILLOS_SEED_BILLS, BILLOS_HOUSEHOLD,
  indianGroup, fmtINR, fmtDate, fmtDateShort, daysFromToday, dueLabel, dueBucket,
  FREQ_LABEL, FREQS, CatIcon,
});
