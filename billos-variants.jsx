// billos-variants.jsx — three structural home/list variants:
// Today (calm), Calendar (time-aware), Stack (rich card feed).
// Each receives the same props as ListScreen and is selected by theme.variant.

const { useState: $vu, useMemo: $vm } = React;

// ─────────────────────────────────────────────────────────────────
// Shared helper: today's bills + tomorrow's + later
// ─────────────────────────────────────────────────────────────────
function partitionByDay(bills) {
  const today = [], tomorrow = [], thisWeek = [], later = [];
  for (const b of bills) {
    if (b.status !== 'active') continue;
    const d = daysFromToday(b.nextDue);
    if (d <= 0) today.push(b);
    else if (d === 1) tomorrow.push(b);
    else if (d <= 7) thisWeek.push(b);
    else later.push(b);
  }
  return { today, tomorrow, thisWeek, later };
}

// ─────────────────────────────────────────────────────────────────
// VARIANT A: TODAY — single-focus, big-tap, calmest. No nav.
// ─────────────────────────────────────────────────────────────────
function TodayHome({ theme, bills, household, onOpenBill, onAdd, onSignOut }) {
  const { today, tomorrow, thisWeek, later } = $vm(() => partitionByDay(bills), [bills]);
  const dueSoon = [...today, ...tomorrow, ...thisWeek];
  const totalSoon = dueSoon.reduce((s, b) => s + b.amount, 0);
  const heroBill = dueSoon[0]; // the one bill that wants attention now

  return (
    <div style={{ minHeight: '100%', background: theme.bg, paddingBottom: 40 }}>
      {/* tiny top header — no chrome */}
      <div style={{ padding: '50px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: theme.textDim, fontFamily: theme.fontBody, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{fmtDate(BILLOS_TODAY.toISOString().slice(0, 10))}</div>
        <Pressable onPress={onAdd} style={{
          padding: '8px 14px', borderRadius: 999,
          background: theme.accent, color: theme.accentInk,
          fontSize: 14, fontWeight: 600, fontFamily: theme.fontBody,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>{Icon.plus(theme.accentInk, 16)} New</Pressable>
      </div>

      {/* HERO — one bill, gigantic */}
      <div style={{ padding: '14px 20px 24px' }}>
        <div style={{ fontSize: 13, color: theme.textDim, fontFamily: theme.fontBody, marginBottom: 8 }}>
          {today.length > 0 ? 'Due today' : tomorrow.length > 0 ? 'Due tomorrow' : 'Next up'}
        </div>
        {heroBill ? (
          <Pressable onPress={() => onOpenBill(heroBill.id)} style={{
            padding: '24px 22px',
            background: theme.bgElev1,
            border: `1px solid ${theme.borderSoft}`,
            borderRadius: theme.radiusLg + 4,
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <CatBadge theme={theme} cat={heroBill.cat} treatment="chip" size="lg" />
            <div style={{ fontFamily: theme.fontDisplay, fontSize: 30, fontWeight: 600, color: theme.text, letterSpacing: -0.6, lineHeight: 1.1 }}>
              {heroBill.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <AmountText theme={theme} amount={heroBill.amount} size={42} weight={700} />
              <div style={{ fontSize: 14, color: theme.textDim, fontFamily: theme.fontBody }}>
                · {fmtDate(heroBill.nextDue)}
              </div>
            </div>
          </Pressable>
        ) : (
          <div style={{ padding: 30, textAlign: 'center', color: theme.textDim, fontFamily: theme.fontBody }}>Nothing due — calm week.</div>
        )}
      </div>

      {/* Up next — short list */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 13, color: theme.textDim, fontFamily: theme.fontBody, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 }}>
          Up next · {fmtINR(totalSoon)} this week
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dueSoon.slice(1, 6).map(b => (
            <Pressable key={b.id} onPress={() => onOpenBill(b.id)} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 18px',
              background: theme.bgElev1,
              border: `1px solid ${theme.borderSoft}`,
              borderRadius: theme.radius,
            }}>
              <CatBadge theme={theme} cat={b.cat} treatment="chip" size="md" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600, color: theme.text, fontFamily: theme.fontBody }}>{b.name}</div>
                <div style={{ fontSize: 13, color: theme.textDim, marginTop: 2, fontFamily: theme.fontBody }}>{daysFromToday(b.nextDue) === 0 ? 'today' : daysFromToday(b.nextDue) === 1 ? 'tomorrow' : `in ${daysFromToday(b.nextDue)} days`}</div>
              </div>
              <AmountText theme={theme} amount={b.amount} size={18} weight={700} />
            </Pressable>
          ))}
        </div>
      </div>

      {/* "see all" footer */}
      <div style={{ padding: '24px 20px 0' }}>
        <Pressable onPress={() => {}} style={{
          padding: '14px 16px', textAlign: 'center',
          fontSize: 14, fontWeight: 600, color: theme.textDim, fontFamily: theme.fontBody,
        }}>See all {bills.filter(b => b.status === 'active').length} bills →</Pressable>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// VARIANT B: CALENDAR — month grid hero, tap a date, tab bar
// ─────────────────────────────────────────────────────────────────
function CalendarHome({ theme, bills, household, onOpenBill, onAdd }) {
  const today = BILLOS_TODAY;
  const [selectedDate, setSelectedDate] = $vu(today.toISOString().slice(0, 10));

  // build a map of date string → bills
  const byDate = $vm(() => {
    const m = {};
    for (const b of bills.filter(b => b.status === 'active')) {
      (m[b.nextDue] ||= []).push(b);
    }
    return m;
  }, [bills]);

  // current month grid
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0 sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = today.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const selectedBills = byDate[selectedDate] || [];
  const selDay = parseInt(selectedDate.slice(8, 10), 10);
  const totalThisMonth = bills.filter(b => b.status === 'active' && b.nextDue.startsWith(selectedDate.slice(0, 7))).reduce((s, b) => s + b.amount, 0);

  return (
    <div style={{ minHeight: '100%', background: theme.bg, paddingBottom: 80 }}>
      {/* compact header */}
      <div style={{ padding: '50px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: theme.textDim, fontFamily: theme.fontBody, fontWeight: 700 }}>BillOS</div>
          <div style={{ fontFamily: theme.fontDisplay, fontSize: 24, fontWeight: 600, color: theme.text, letterSpacing: -0.3 }}>{monthName}</div>
        </div>
        <Pressable onPress={onAdd} style={{
          width: 40, height: 40, borderRadius: 20,
          background: theme.accent, color: theme.accentInk,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.plus(theme.accentInk, 20)}</Pressable>
      </div>

      {/* calendar grid */}
      <div style={{ padding: '8px 12px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 11, color: theme.textDim, fontFamily: theme.fontBody, fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayBills = byDate[dateStr] || [];
            const isToday = d === today.getDate();
            const isSel = dateStr === selectedDate;
            return (
              <Pressable key={i} onPress={() => setSelectedDate(dateStr)} style={{
                aspectRatio: '1 / 1', borderRadius: 10,
                background: isSel ? theme.accent : (isToday ? theme.accentSoft : 'transparent'),
                border: isSel ? `1px solid ${theme.accent}` : (isToday ? `1px solid ${theme.accentBorder}` : '1px solid transparent'),
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                padding: 4,
              }}>
                <div style={{
                  fontSize: 14, fontFamily: theme.fontNum, fontWeight: isToday || isSel ? 700 : 500,
                  color: isSel ? theme.accentInk : (isToday ? theme.accent : theme.text),
                }}>{d}</div>
                {dayBills.length > 0 && (
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    {dayBills.slice(0, 3).map((b, j) => (
                      <div key={j} style={{ width: 4, height: 4, borderRadius: 2, background: isSel ? theme.accentInk : theme.catColor[b.cat] }} />
                    ))}
                  </div>
                )}
              </Pressable>
            );
          })}
        </div>
      </div>

      {/* selected day */}
      <div style={{ padding: '24px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: theme.fontDisplay, fontSize: 20, fontWeight: 600, color: theme.text }}>
            {fmtDate(selectedDate)}
          </div>
          <div style={{ fontSize: 12, color: theme.textDim, fontFamily: theme.fontBody, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            {selectedBills.length === 0 ? 'Nothing due' : `${selectedBills.length} ${selectedBills.length === 1 ? 'bill' : 'bills'}`}
          </div>
        </div>
        {selectedBills.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', background: theme.bgElev1, border: `1px solid ${theme.borderSoft}`, borderRadius: theme.radiusCard, color: theme.textDim, fontFamily: theme.fontBody, fontSize: 14 }}>
            No bills due on this day.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {selectedBills.map(b => (
            <Pressable key={b.id} onPress={() => onOpenBill(b.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              background: theme.bgElev1,
              border: `1px solid ${theme.borderSoft}`,
              borderRadius: theme.radius,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: theme.catColor[b.cat] }} />
              <div style={{ flex: 1, fontSize: 15, fontWeight: 500, color: theme.text, fontFamily: theme.fontBody }}>{b.name}</div>
              <div style={{ fontSize: 15, fontFamily: theme.fontNum, fontWeight: 600, color: theme.text }}>{fmtINR(b.amount)}</div>
            </Pressable>
          ))}
        </div>
      </div>

      {/* bottom tab bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '8px 8px 22px',
        background: theme.bgElev1,
        borderTop: `1px solid ${theme.borderSoft}`,
        display: 'flex', justifyContent: 'space-around',
      }}>
        {[
          { id: 'cal',  label: 'Calendar', active: true },
          { id: 'list', label: 'List' },
          { id: 'set',  label: 'Settings' },
        ].map(t => (
          <div key={t.id} style={{
            flex: 1, padding: '8px 0', textAlign: 'center',
            fontSize: 11, fontWeight: 600, fontFamily: theme.fontBody,
            color: t.active ? theme.accent : theme.textDim,
          }}>
            <div style={{ width: 22, height: 22, margin: '0 auto 2px', borderRadius: 6, background: t.active ? theme.accentSoft : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.active ? theme.accent : theme.textDim, fontSize: 12 }}>
              {t.id === 'cal' ? '▣' : t.id === 'list' ? '≡' : '⋯'}
            </div>
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// VARIANT C: STACK — rich card feed, top filter chips, modal add
// ─────────────────────────────────────────────────────────────────
function StackHome({ theme, bills, household, onOpenBill, onAdd }) {
  const [filter, setFilter] = $vu('all');
  const visible = $vm(() => bills
    .filter(b => b.status === 'active')
    .filter(b => filter === 'all' ? true :
                 filter === 'mine' ? b.owner === 'aa' :
                 filter === 'mom'  ? b.owner === 'mom' :
                 filter === 'shared' ? b.owner === 'shared' :
                 b.cat === filter)
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue)),
    [bills, filter]);

  const total = visible.reduce((s, b) => s + b.amount, 0);

  const chips = [
    { id: 'all', label: 'All' },
    { id: 'mine', label: 'Mine' },
    { id: 'mom', label: 'Mom' },
    { id: 'shared', label: 'Shared' },
    { id: 'utilities', label: 'Utilities' },
    { id: 'subscriptions', label: 'Subs' },
    { id: 'credit_cards', label: 'Cards' },
    { id: 'people', label: 'Staff' },
  ];

  const ownerLabel = (o) => o === 'aa' ? 'Akshay' : o === 'mom' ? 'Mom' : 'Shared';

  return (
    <div style={{ minHeight: '100%', background: theme.bg, paddingBottom: 30 }}>
      {/* dense header */}
      <div style={{ padding: '50px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${theme.borderSoft}` }}>
        <div>
          <div style={{ fontFamily: theme.fontDisplay, fontSize: 26, fontWeight: 700, color: theme.text, letterSpacing: -0.5, lineHeight: 1 }}>Stack</div>
          <div style={{ fontSize: 12, color: theme.textDim, fontFamily: theme.fontBody, marginTop: 4 }}>{visible.length} bills · {fmtINR(total)} this cycle</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Pressable onPress={() => {}} style={{ width: 36, height: 36, borderRadius: 18, background: theme.bgElev1, border: `1px solid ${theme.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.text, fontSize: 16 }}>≡</Pressable>
          <Pressable onPress={onAdd} style={{ width: 36, height: 36, borderRadius: 18, background: theme.accent, color: theme.accentInk, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.plus(theme.accentInk, 18)}</Pressable>
        </div>
      </div>

      {/* filter chips - horizontal scroll */}
      <div style={{ padding: '12px 0', overflow: 'auto' }}>
        <div style={{ display: 'inline-flex', gap: 8, padding: '0 16px', whiteSpace: 'nowrap' }}>
          {chips.map(c => {
            const active = filter === c.id;
            return (
              <Pressable key={c.id} onPress={() => setFilter(c.id)} style={{
                padding: '7px 14px', borderRadius: 999,
                background: active ? theme.accent : theme.bgElev1,
                color: active ? theme.accentInk : theme.text,
                border: `1px solid ${active ? theme.accent : theme.borderSoft}`,
                fontSize: 13, fontWeight: 600, fontFamily: theme.fontBody,
              }}>{c.label}</Pressable>
            );
          })}
        </div>
      </div>

      {/* rich card feed */}
      <div style={{ padding: '4px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(b => {
          const days = daysFromToday(b.nextDue);
          const due = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days}d`;
          return (
            <Pressable key={b.id} onPress={() => onOpenBill(b.id)} style={{
              padding: '14px 16px',
              background: theme.bgElev1,
              border: `1px solid ${theme.borderSoft}`,
              borderRadius: theme.radiusCard,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {/* top row: cat chip + freq badge + due */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CatBadge theme={theme} cat={b.cat} treatment="chip" size="sm" />
                <div style={{ flex: 1, fontSize: 11, color: theme.textDim, fontFamily: theme.fontBody, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  {BILLOS_CATEGORIES[b.cat].label} · {FREQ_LABEL[b.freq]}
                </div>
                <div style={{
                  padding: '3px 9px', borderRadius: 999,
                  background: days <= 3 ? theme.accent : theme.bgElev2,
                  color: days <= 3 ? theme.accentInk : theme.textDim,
                  fontSize: 11, fontWeight: 700, fontFamily: theme.fontBody,
                }}>{due}</div>
              </div>
              {/* main row */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontFamily: theme.fontDisplay, fontSize: 19, fontWeight: 600, color: theme.text, letterSpacing: -0.2 }}>{b.name}</div>
                <AmountText theme={theme} amount={b.amount} size={20} weight={700} />
              </div>
              {/* footer: who pays, last paid */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4, borderTop: `1px dashed ${theme.borderSoft}`, marginTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: theme.bgElev2, border: `1px solid ${theme.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: theme.textDim, fontFamily: theme.fontBody, fontWeight: 700 }}>
                    {ownerLabel(b.owner).slice(0, 1)}
                  </div>
                  <div style={{ fontSize: 12, color: theme.textDim, fontFamily: theme.fontBody }}>{ownerLabel(b.owner)}</div>
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.fontBody }}>· next {fmtDate(b.nextDue)}</div>
              </div>
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADD-BILL: WIZARD (one question per screen)
// ─────────────────────────────────────────────────────────────────
function AddBillWizard({ theme, onSave, onClose }) {
  const [step, setStep] = $vu(0);
  const [open, setOpen] = $vu(false);
  React.useEffect(() => { const r = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(r); }, []);
  const close = () => { setOpen(false); setTimeout(onClose, 240); };

  const [name, setName] = $vu('');
  const [amount, setAmount] = $vu('');
  const [freq, setFreq] = $vu('monthly');
  const [cat, setCat] = $vu('utilities');
  const [owner, setOwner] = $vu('shared');

  const steps = ['name', 'amount', 'category', 'who', 'review'];
  const canNext = (
    step === 0 ? name.trim().length :
    step === 1 ? parseInt(amount, 10) > 0 :
    true
  );
  const next = () => {
    if (step === steps.length - 1) {
      onSave({ id: 'new_' + Date.now(), name: name.trim(), amount: parseInt(amount, 10), freq, cat, owner, nextDue: BILLOS_TODAY.toISOString().slice(0, 10), status: 'active' });
      close();
    } else if (canNext) setStep(s => s + 1);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 90, background: theme.bg,
      transform: open ? 'translateY(0)' : 'translateY(40px)',
      opacity: open ? 1 : 0,
      transition: 'transform .26s cubic-bezier(.2,.8,.2,1), opacity .2s',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header with progress */}
      <div style={{ padding: '54px 18px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => step === 0 ? close() : setStep(s => s - 1)} style={{
          width: 38, height: 38, borderRadius: 19, background: theme.bgElev1, border: `1px solid ${theme.borderSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{step === 0 ? '✕' : Icon.back(theme.text)}</Pressable>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: theme.bgElev2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((step + 1) / steps.length) * 100}%`, background: theme.accent, transition: 'width .25s' }} />
        </div>
        <div style={{ fontSize: 12, color: theme.textDim, fontFamily: theme.fontBody, fontWeight: 600 }}>{step + 1}/{steps.length}</div>
      </div>

      <div style={{ flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {step === 0 && (
          <>
            <div style={{ fontFamily: theme.fontDisplay, fontSize: 28, fontWeight: 600, color: theme.text, letterSpacing: -0.5, lineHeight: 1.15 }}>What's the bill called?</div>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. BSES Rajdhani"
              style={{ padding: '16px 18px', fontSize: 22, fontFamily: theme.fontDisplay, fontWeight: 600, background: theme.bgElev1, border: `1px solid ${theme.borderSoft}`, borderRadius: theme.radius, color: theme.text, outline: 'none' }} />
          </>
        )}
        {step === 1 && (
          <>
            <div style={{ fontFamily: theme.fontDisplay, fontSize: 28, fontWeight: 600, color: theme.text, letterSpacing: -0.5, lineHeight: 1.15 }}>How much, and how often?</div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: theme.textDim, fontSize: 26, fontFamily: theme.fontDisplay }}>₹</span>
              <input autoFocus value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" inputMode="numeric"
                style={{ width: '100%', boxSizing: 'border-box', padding: '16px 18px 16px 44px', fontSize: 26, fontFamily: theme.fontNum, fontWeight: 700, background: theme.bgElev1, border: `1px solid ${theme.borderSoft}`, borderRadius: theme.radius, color: theme.text, outline: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {FREQS.map(f => (
                <Pressable key={f.id} onPress={() => setFreq(f.id)} style={{
                  padding: '14px 8px', borderRadius: theme.radiusSm,
                  background: freq === f.id ? theme.accent : theme.bgElev1, color: freq === f.id ? theme.accentInk : theme.text,
                  border: `1px solid ${freq === f.id ? theme.accent : theme.borderSoft}`, textAlign: 'center', fontSize: 14, fontWeight: 600,
                }}>{f.label}</Pressable>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div style={{ fontFamily: theme.fontDisplay, fontSize: 28, fontWeight: 600, color: theme.text, letterSpacing: -0.5, lineHeight: 1.15 }}>What kind of bill?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CAT_ORDER.map(c => (
                <Pressable key={c} onPress={() => setCat(c)} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px', borderRadius: theme.radius,
                  background: cat === c ? theme.accentSoft : theme.bgElev1,
                  border: `1px solid ${cat === c ? theme.accentBorder : theme.borderSoft}`,
                }}>
                  <CatBadge theme={theme} cat={c} treatment="chip" size="md" />
                  <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: theme.text, fontFamily: theme.fontBody }}>{BILLOS_CATEGORIES[c].label}</div>
                  {cat === c && Icon.check(theme.accent, 18)}
                </Pressable>
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div style={{ fontFamily: theme.fontDisplay, fontSize: 28, fontWeight: 600, color: theme.text, letterSpacing: -0.5, lineHeight: 1.15 }}>Who pays this one?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[{ id: 'aa', label: 'Me' }, { id: 'shared', label: 'Both of us' }, { id: 'mom', label: 'Mom' }].map(o => (
                <Pressable key={o.id} onPress={() => setOwner(o.id)} style={{
                  padding: '20px 18px', borderRadius: theme.radius,
                  background: owner === o.id ? theme.accent : theme.bgElev1,
                  color: owner === o.id ? theme.accentInk : theme.text,
                  border: `1px solid ${owner === o.id ? theme.accent : theme.borderSoft}`,
                  fontSize: 18, fontWeight: 600, fontFamily: theme.fontBody, textAlign: 'center',
                }}>{o.label}</Pressable>
              ))}
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <div style={{ fontFamily: theme.fontDisplay, fontSize: 28, fontWeight: 600, color: theme.text, letterSpacing: -0.5, lineHeight: 1.15 }}>Look right?</div>
            <div style={{ background: theme.bgElev1, border: `1px solid ${theme.borderSoft}`, borderRadius: theme.radiusCard, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <CatBadge theme={theme} cat={cat} treatment="chip" size="md" />
              <div style={{ fontFamily: theme.fontDisplay, fontSize: 22, fontWeight: 600, color: theme.text }}>{name}</div>
              <AmountText theme={theme} amount={parseInt(amount, 10) || 0} size={32} weight={700} />
              <div style={{ fontSize: 13, color: theme.textDim, fontFamily: theme.fontBody }}>{FREQ_LABEL[freq]} · {owner === 'aa' ? 'You pay' : owner === 'mom' ? 'Mom pays' : 'Shared'}</div>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '12px 22px 30px' }}>
        <Btn theme={theme} kind="primary" full onPress={next} disabled={!canNext}>
          {step === steps.length - 1 ? 'Save bill' : 'Next'}
        </Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Dispatcher: pick the right home screen by theme.variant
// ─────────────────────────────────────────────────────────────────
function VariantHome(props) {
  switch (props.theme.variant) {
    case 'today':    return <TodayHome {...props} />;
    case 'calendar': return <CalendarHome {...props} />;
    case 'stack':    return <StackHome {...props} />;
    default:         return <ListScreen {...props} />;
  }
}
function VariantAdd(props) {
  if (props.theme.addPattern === 'wizard') return <AddBillWizard {...props} />;
  // sheet/modal — reuse existing AddBillSheet
  return <AddBillSheet {...props} presentation={props.theme.addPattern || 'sheet'} />;
}

Object.assign(window, { TodayHome, CalendarHome, StackHome, VariantHome, AddBillWizard, VariantAdd });
