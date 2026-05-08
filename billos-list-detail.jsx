// billos-list-detail.jsx — list, add-bill sheet, detail screens.

const { useState: $u, useEffect: $e, useRef: $r, useMemo: $m } = React;

// ─────────────────────────────────────────────────────────────────
// Filter / segmented controls
// ─────────────────────────────────────────────────────────────────
function Segmented({ theme, value, options, onChange, tight }) {
  return (
    <div style={{
      display: 'inline-flex', gap: 0, padding: 3,
      background: theme.bgElev2, borderRadius: theme.radius,
      border: `1px solid ${theme.borderSoft}`,
    }}>
      {options.map(o => {
        const active = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={{
            padding: tight ? '5px 11px' : '7px 14px',
            borderRadius: theme.radiusSm,
            fontSize: 13, fontWeight: 500,
            color: active ? theme.text : theme.textDim,
            background: active ? theme.bgElev1 : 'transparent',
            fontFamily: theme.fontBody,
            boxShadow: active ? `0 1px 0 ${theme.borderSoft}` : 'none',
          }}>{o.label}</Pressable>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN: List View (the daily-glance home)
// ─────────────────────────────────────────────────────────────────
function ListScreen({ theme, bills, household, onOpenBill, onAdd, onSignOut, density }) {
  const [statusFilter, setStatusFilter] = $u('active'); // active | paused | cancelled
  const [ownerFilter, setOwnerFilter] = $u('all');     // all | aa | mom | shared
  const [showFilters, setShowFilters] = $u(false);

  const visible = $m(() => bills
    .filter(b => b.status === statusFilter)
    .filter(b => ownerFilter === 'all' ? true : b.owner === ownerFilter)
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue)),
    [bills, statusFilter, ownerFilter]);

  // build groups depending on density:
  //   compact / comfortable -> by due bucket (overdue, this_week, this_month, later) + people pulled out
  //   grouped               -> by date bucket only (no special section for people)
  const groups = $m(() => {
    if (density === 'grouped') {
      const buckets = { overdue: [], this_week: [], this_month: [], later: [] };
      for (const b of visible) buckets[dueBucket(b.nextDue)].push(b);
      return [
        { id: 'overdue',     label: 'Overdue',     items: buckets.overdue },
        { id: 'this_week',   label: 'Due this week', items: buckets.this_week },
        { id: 'this_month',  label: 'Later this month', items: buckets.this_month },
        { id: 'later',       label: 'Later',       items: buckets.later },
      ].filter(g => g.items.length);
    }
    // compact/comfortable: pull people out into its own section
    const dueSoon = visible.filter(b => b.cat !== 'people' && daysFromToday(b.nextDue) <= 7);
    const later   = visible.filter(b => b.cat !== 'people' && daysFromToday(b.nextDue) > 7);
    const people  = visible.filter(b => b.cat === 'people');
    return [
      { id: 'soon',   label: 'Due soon',         items: dueSoon },
      { id: 'later',  label: 'Later',            items: later },
      { id: 'people', label: 'Household staff',  items: people },
    ].filter(g => g.items.length);
  }, [visible, density]);

  const totalActiveMonthly = $m(() => bills
    .filter(b => b.status === 'active' && b.freq === 'monthly')
    .reduce((s, b) => s + b.amount, 0), [bills]);

  const ownerOptions = [
    { id: 'all',    label: 'All' },
    { id: 'aa',     label: 'Mine' },
    { id: 'mom',    label: 'Mom' },
    { id: 'shared', label: 'Shared' },
  ];
  const statusOptions = [
    { id: 'active',    label: 'Active' },
    { id: 'paused',    label: 'Paused' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div style={{ minHeight: '100%', position: 'relative', background: theme.bg }}>
      <AppBar theme={theme} large
        title="Bills"
        subtitle={`${household.members.map(m => m.displayName).join(' · ')}`}
        leading={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BillOSMark theme={theme} size={26} />
          </div>
        }
        trailing={
          <>
            <Pressable onPress={() => setShowFilters(s => !s)} style={{
              width: 38, height: 38, borderRadius: 20,
              background: showFilters ? theme.accentSoft : theme.bgElev1,
              border: `1px solid ${theme.borderSoft}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: showFilters ? theme.accent : theme.text,
            }}>{Icon.filter(showFilters ? theme.accent : theme.text)}</Pressable>
            <Pressable onPress={onAdd} style={{
              width: 38, height: 38, borderRadius: 20,
              background: theme.accent, color: theme.accentInk,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{Icon.plus(theme.accentInk, 20)}</Pressable>
          </>
        }
      />

      {/* monthly summary strip */}
      <div style={{ padding: '0 16px 4px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8,
          padding: '12px 14px',
          background: theme.bgElev1,
          border: `1px solid ${theme.borderSoft}`,
          borderRadius: theme.radiusCard,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: theme.textDim, letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: theme.fontBody, fontWeight: 600 }}>This month, recurring</div>
            <div style={{ marginTop: 2 }}>
              <AmountText theme={theme} amount={totalActiveMonthly} size={22} weight={700} />
              <span style={{ fontSize: 12, color: theme.textDim, marginLeft: 6, fontFamily: theme.fontBody }}>across {bills.filter(b => b.status === 'active' && b.freq === 'monthly').length} bills</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {CAT_ORDER.map(c => {
              const total = bills.filter(b => b.status === 'active' && b.freq === 'monthly' && b.cat === c).reduce((s, b) => s + b.amount, 0);
              if (!total) return null;
              const pct = total / totalActiveMonthly;
              return (
                <div key={c} title={`${BILLOS_CATEGORIES[c].label}: ${fmtINR(total)}`} style={{
                  width: Math.max(8, pct * 80),
                  height: 28, borderRadius: 5,
                  background: theme.catColor[c],
                  opacity: 0.9,
                }} />
              );
            })}
          </div>
        </div>
      </div>

      {/* filter bar */}
      {showFilters && (
        <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Segmented theme={theme} value={statusFilter} options={statusOptions} onChange={setStatusFilter} tight />
            <Segmented theme={theme} value={ownerFilter} options={ownerOptions} onChange={setOwnerFilter} tight />
          </div>
        </div>
      )}

      {/* body */}
      <div style={{ paddingBottom: 60 }}>
        {groups.length === 0 && (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: theme.textDim, fontFamily: theme.fontBody }}>
            No {statusFilter} bills{ownerFilter !== 'all' ? ` for ${ownerOptions.find(o => o.id === ownerFilter).label.toLowerCase()}` : ''}.
          </div>
        )}
        {groups.map(g => (
          <div key={g.id}>
            <SectionHeader theme={theme} label={g.label} count={g.items.length} />
            <div style={{ padding: theme.rowStyle === 'card' ? '0 12px' : '0' }}>
              {theme.rowStyle === 'flat' ? (
                <div style={{
                  background: theme.bgElev1,
                  margin: '0 12px',
                  borderRadius: theme.radiusCard,
                  border: `1px solid ${theme.borderSoft}`,
                  overflow: 'hidden',
                }}>
                  {g.items.map((b, i) => (
                    <div key={b.id} style={{ borderBottom: i < g.items.length - 1 ? `1px solid ${theme.borderSoft}` : 'none' }}>
                      <BillRow theme={theme} bill={b} onPress={() => onOpenBill(b.id)} density={density} />
                    </div>
                  ))}
                </div>
              ) : (
                g.items.map(b => <BillRow key={b.id} theme={theme} bill={b} onPress={() => onOpenBill(b.id)} density={density} />)
              )}
            </div>
          </div>
        ))}
        <div style={{ height: 30 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN: Add Bill (sheet or full modal)
// ─────────────────────────────────────────────────────────────────
function AddBillForm({ theme, onSave, onClose, presentation = 'sheet' }) {
  const [name, setName] = $u('');
  const [amount, setAmount] = $u('');
  const [freq, setFreq] = $u('monthly');
  const [cat, setCat] = $u('utilities');
  const [owner, setOwner] = $u('shared');
  const [nextDue, setNextDue] = $u(BILLOS_TODAY.toISOString().slice(0, 10));

  const valid = name.trim() && amount && parseInt(amount, 10) > 0;

  const FieldLabel = ({ children }) => (
    <div style={{ fontSize: 12, color: theme.textDim, fontWeight: 600, fontFamily: theme.fontBody, marginBottom: 6, letterSpacing: 0.2 }}>{children}</div>
  );
  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '14px 14px',
    fontSize: 17, fontFamily: theme.fontBody,
    background: theme.bgElev2,
    border: `1px solid ${theme.borderSoft}`,
    borderRadius: theme.radius,
    color: theme.text,
    outline: 'none',
  };

  const save = () => {
    if (!valid) return;
    onSave({
      id: 'new_' + Date.now(),
      name: name.trim(),
      amount: parseInt(amount, 10),
      freq, cat, owner, nextDue,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div style={{ background: theme.bg, color: theme.text, fontFamily: theme.fontBody, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: presentation === 'sheet' ? '12px 14px 10px' : '60px 14px 10px',
        borderBottom: `1px solid ${theme.borderSoft}`,
      }}>
        <Pressable onPress={onClose} style={{ color: theme.accent, fontSize: 15, padding: '6px 4px' }}>Cancel</Pressable>
        <div style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>New bill</div>
        <Pressable onPress={save} disabled={!valid} style={{ color: valid ? theme.accent : theme.textMuted, fontSize: 15, fontWeight: 600, padding: '6px 4px' }}>Save</Pressable>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 24px' }}>
        {/* Name */}
        <FieldLabel>Name <span style={{ color: theme.danger }}>*</span></FieldLabel>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. BSES Rajdhani"
          style={inputStyle}
        />

        {/* Amount */}
        <div style={{ height: 16 }} />
        <FieldLabel>Amount <span style={{ color: theme.danger }}>*</span></FieldLabel>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: theme.textDim, fontSize: 17 }}>₹</span>
          <input
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
            inputMode="numeric"
            style={{ ...inputStyle, paddingLeft: 30, fontVariantNumeric: 'tabular-nums', fontFamily: theme.fontNum, fontWeight: 600 }}
          />
          {amount && (
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: theme.textDim, fontSize: 13 }}>
              {fmtINR(parseInt(amount, 10) || 0)}
            </span>
          )}
        </div>

        {/* Frequency */}
        <div style={{ height: 16 }} />
        <FieldLabel>Frequency <span style={{ color: theme.danger }}>*</span></FieldLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {FREQS.map(f => {
            const active = freq === f.id;
            return (
              <Pressable key={f.id} onPress={() => setFreq(f.id)} style={{
                padding: '11px 8px', borderRadius: theme.radiusSm,
                background: active ? theme.accent : theme.bgElev2,
                color: active ? theme.accentInk : theme.text,
                border: `1px solid ${active ? theme.accent : theme.borderSoft}`,
                textAlign: 'center', fontSize: 13.5, fontWeight: 500,
              }}>{f.label}</Pressable>
            );
          })}
        </div>

        {/* Category */}
        <div style={{ height: 16 }} />
        <FieldLabel>Category</FieldLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {CAT_ORDER.map(c => {
            const active = cat === c;
            const meta = BILLOS_CATEGORIES[c];
            return (
              <Pressable key={c} onPress={() => setCat(c)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                borderRadius: theme.radius,
                background: active ? theme.accentSoft : theme.bgElev2,
                border: `1px solid ${active ? theme.accentBorder : theme.borderSoft}`,
              }}>
                <CatBadge theme={theme} cat={c} treatment="chip" size="sm" />
                <div style={{ flex: 1, fontSize: 14.5, color: theme.text, fontWeight: 500 }}>{meta.label}</div>
                {active && Icon.check(theme.accent, 16)}
              </Pressable>
            );
          })}
        </div>

        {/* Owner */}
        <div style={{ height: 16 }} />
        <FieldLabel>Who pays</FieldLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[{ id: 'aa', label: 'Me' }, { id: 'shared', label: 'Shared' }, { id: 'mom', label: 'Mom' }].map(o => {
            const active = owner === o.id;
            return (
              <Pressable key={o.id} onPress={() => setOwner(o.id)} style={{
                padding: '11px 8px', borderRadius: theme.radiusSm,
                background: active ? theme.accent : theme.bgElev2,
                color: active ? theme.accentInk : theme.text,
                border: `1px solid ${active ? theme.accent : theme.borderSoft}`,
                textAlign: 'center', fontSize: 13.5, fontWeight: 500,
              }}>{o.label}</Pressable>
            );
          })}
        </div>

        {/* Next due */}
        <div style={{ height: 16 }} />
        <FieldLabel>Next due</FieldLabel>
        <input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)}
          style={{ ...inputStyle, colorScheme: theme.mode === 'dark' ? 'dark' : 'light' }}
        />

        <div style={{ height: 22 }} />
        <Btn theme={theme} kind="primary" full onPress={save} disabled={!valid}>
          {valid ? `Save · ₹${indianGroup(parseInt(amount, 10) || 0)} ${freq}` : 'Add 3 required fields'}
        </Btn>
      </div>
    </div>
  );
}

function AddBillSheet({ theme, presentation, onSave, onClose }) {
  // sheet: animated slide-up overlay 80% height. modal: full takeover.
  const [open, setOpen] = $u(false);
  $e(() => { const r = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(r); }, []);
  const close = () => { setOpen(false); setTimeout(onClose, 240); };

  if (presentation === 'modal') {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 90,
        background: theme.bg,
        transform: open ? 'translateY(0)' : 'translateY(40px)',
        opacity: open ? 1 : 0,
        transition: 'transform .26s cubic-bezier(.2,.8,.2,1), opacity .2s',
      }}>
        <AddBillForm theme={theme} onSave={(b) => { onSave(b); close(); }} onClose={close} presentation="modal" />
      </div>
    );
  }

  // sheet
  return (
    <>
      <div onClick={close} style={{
        position: 'absolute', inset: 0, zIndex: 80,
        background: 'rgba(0,0,0,0.45)',
        opacity: open ? 1 : 0,
        transition: 'opacity .24s',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 90,
        height: '88%', background: theme.bg,
        borderTopLeftRadius: theme.radiusLg + 6,
        borderTopRightRadius: theme.radiusLg + 6,
        boxShadow: '0 -8px 30px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .28s cubic-bezier(.2,.8,.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* drag handle */}
        <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.borderSoft }} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <AddBillForm theme={theme} onSave={(b) => { onSave(b); close(); }} onClose={close} presentation="sheet" />
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN: Detail view
// ─────────────────────────────────────────────────────────────────
function DetailScreen({ theme, bill, onBack, onUpdate, household }) {
  const [editing, setEditing] = $u(false);
  const [draft, setDraft] = $u(bill);
  $e(() => setDraft(bill), [bill]);

  if (!bill) return null;
  const meta = BILLOS_CATEGORIES[bill.cat];
  const isPaused = bill.status === 'paused';
  const isCancelled = bill.status === 'cancelled';

  const ownerLabel = bill.owner === 'shared' ? 'Shared' : (household.members.find(m => m.uid === bill.owner)?.displayName || bill.owner);

  const KV = ({ label, value, action }) => (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '14px 16px',
      borderBottom: `1px solid ${theme.borderSoft}`,
      gap: 12,
    }}>
      <div style={{ flex: 1, fontSize: 14, color: theme.textDim, fontFamily: theme.fontBody }}>{label}</div>
      <div style={{ fontSize: 15, color: theme.text, fontFamily: theme.fontBody, fontWeight: 500 }}>{value}</div>
      {action}
    </div>
  );

  return (
    <div style={{ minHeight: '100%', position: 'relative', background: theme.bg }}>
      <AppBar theme={theme}
        leading={<Pressable onPress={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.accent, fontFamily: theme.fontBody, fontSize: 15 }}>{Icon.back(theme.accent)}<span>Bills</span></Pressable>}
        trailing={<Pressable onPress={() => setEditing(e => !e)} style={{ color: theme.accent, fontFamily: theme.fontBody, fontSize: 15, fontWeight: editing ? 600 : 500 }}>{editing ? 'Done' : 'Edit'}</Pressable>}
      />

      {/* Hero */}
      <div style={{ padding: '6px 22px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
        <CatBadge theme={theme} cat={bill.cat} treatment="chip" size="lg" />
        <div style={{ fontFamily: theme.fontDisplay, fontSize: 22, fontWeight: 600, color: theme.text, letterSpacing: -0.4, textDecoration: isCancelled ? 'line-through' : 'none' }}>
          {bill.name}
        </div>
        <div>
          <AmountText theme={theme} amount={bill.amount} size={48} weight={700} />
          <div style={{ marginTop: 4, fontSize: 13, color: theme.textDim, fontFamily: theme.fontBody }}>
            {FREQ_LABEL[bill.freq]} · next {fmtDate(bill.nextDue)}
          </div>
        </div>
        {isPaused && (
          <div style={{ padding: '4px 10px', borderRadius: 999, background: theme.warn + '22', color: theme.warn, fontSize: 12, fontWeight: 600 }}>Paused</div>
        )}
        {isCancelled && (
          <div style={{ padding: '4px 10px', borderRadius: 999, background: theme.danger + '22', color: theme.danger, fontSize: 12, fontWeight: 600 }}>Cancelled</div>
        )}
      </div>

      {/* Card with key/values */}
      <div style={{ padding: '0 12px' }}>
        <div style={{ background: theme.bgElev1, borderRadius: theme.radiusCard, border: `1px solid ${theme.borderSoft}`, overflow: 'hidden' }}>
          <KV label="Category" value={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <CatBadge theme={theme} cat={bill.cat} treatment="dot" />{meta.label}
            </span>
          } />
          <KV label="Frequency" value={FREQ_LABEL[bill.freq]} />
          <KV label="Next due" value={fmtDate(bill.nextDue)} />
          <KV label="Who pays" value={ownerLabel} />
          {bill.notes && (
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.borderSoft}` }}>
              <div style={{ fontSize: 12, color: theme.textDim, fontFamily: theme.fontBody, marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 14, color: theme.text, fontFamily: theme.fontBody, lineHeight: 1.45 }}>{bill.notes}</div>
            </div>
          )}
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: theme.textDim, fontFamily: theme.fontBody, marginBottom: 4 }}>Added by</div>
            <div style={{ fontSize: 14, color: theme.text, fontFamily: theme.fontBody }}>{household.members[0].displayName} · {fmtDate('2026-04-15')}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '20px 12px 36px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!isCancelled && (
          <Btn theme={theme} kind="soft" full
            icon={isPaused ? Icon.play(theme.text) : Icon.pause(theme.text)}
            onPress={() => onUpdate(bill.id, { status: isPaused ? 'active' : 'paused' })}>
            {isPaused ? 'Reactivate bill' : 'Pause bill'}
          </Btn>
        )}
        {!isCancelled ? (
          <Btn theme={theme} kind="danger" full onPress={() => onUpdate(bill.id, { status: 'cancelled' })}>
            Cancel bill
          </Btn>
        ) : (
          <Btn theme={theme} kind="soft" full onPress={() => onUpdate(bill.id, { status: 'active' })}>
            Reactivate bill
          </Btn>
        )}
        <div style={{ textAlign: 'center', fontSize: 11, color: theme.textMuted, marginTop: 6, fontFamily: theme.fontBody, lineHeight: 1.5, padding: '0 24px' }}>
          Cancelling keeps the bill in your history. Use the filter above to find cancelled bills later.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ListScreen, AddBillSheet, DetailScreen, Segmented,
});
