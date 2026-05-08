// billos-atoms.jsx — small themed primitives shared across screens.
// All take a `theme` prop (token dict from billos-themes.jsx).

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─── Pressable: tap-aware div with active-state opacity ───────────
function Pressable({ onPress, children, style, disabled, role = 'button', ariaLabel }) {
  const [down, setDown] = useState(false);
  return (
    <div
      role={role}
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      onMouseDown={() => !disabled && setDown(true)}
      onMouseUp={() => setDown(false)}
      onMouseLeave={() => setDown(false)}
      onClick={(e) => { if (!disabled && onPress) onPress(e); }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault(); onPress && onPress(e);
        }
      }}
      style={{
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
        transition: 'opacity .12s, transform .12s, background .12s',
        opacity: down ? 0.6 : 1,
        ...style,
      }}
    >{children}</div>
  );
}

// ─── Btn: primary / ghost / destructive ───────────────────────────
function Btn({ theme, kind = 'primary', children, onPress, full, style, icon, disabled }) {
  const base = {
    minHeight: 48,
    padding: '12px 18px',
    borderRadius: theme.radius,
    border: '1px solid transparent',
    fontFamily: theme.fontBody,
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: -0.1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: full ? '100%' : undefined,
    boxSizing: 'border-box',
  };
  const variants = {
    primary: {
      background: theme.accent, color: theme.accentInk, borderColor: theme.accent,
    },
    ghost: {
      background: 'transparent', color: theme.text, borderColor: theme.border,
    },
    soft: {
      background: theme.bgElev2, color: theme.text, borderColor: theme.borderSoft,
    },
    danger: {
      background: 'transparent', color: theme.danger, borderColor: theme.border,
    },
    plain: {
      background: 'transparent', color: theme.accent, borderColor: 'transparent',
      minHeight: 32, padding: '6px 8px',
    },
  };
  return (
    <Pressable onPress={disabled ? null : onPress} disabled={disabled} style={{ ...base, ...variants[kind], opacity: disabled ? 0.4 : undefined, ...style }}>
      {icon}
      {children}
    </Pressable>
  );
}

// ─── AmountText: ₹ + indianGroup, with theme num font ─────────────
function AmountText({ theme, amount, size = 18, weight = 600, dim, mono, prefix = '₹', style, suffix }) {
  return (
    <span style={{
      fontFamily: theme.fontNum,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: size > 28 ? -0.8 : -0.2,
      color: dim ? theme.textDim : theme.text,
      fontVariantNumeric: 'tabular-nums',
      ...style,
    }}>
      {prefix && <span style={{ opacity: 0.6, marginRight: 1 }}>{prefix}</span>}
      {indianGroup(amount)}
      {suffix && <span style={{ opacity: 0.6, marginLeft: 4, fontSize: size * 0.6 }}>{suffix}</span>}
    </span>
  );
}

// ─── CatBadge: dot | edge | chip — controlled by theme.catTreatment
function CatBadge({ theme, cat, treatment, size = 'md' }) {
  const t = treatment || theme.catTreatment;
  const color = theme.catColor[cat];
  const tint = theme.catTint[cat];
  if (t === 'dot') {
    const d = size === 'sm' ? 8 : size === 'lg' ? 12 : 10;
    return <span style={{ display: 'inline-block', width: d, height: d, borderRadius: '50%', background: color, flexShrink: 0 }} />;
  }
  if (t === 'edge') {
    return <span style={{ display: 'inline-block', width: 3, alignSelf: 'stretch', borderRadius: 2, background: color, flexShrink: 0 }} />;
  }
  // chip
  const dim = size === 'lg' ? 38 : size === 'sm' ? 28 : 34;
  const ic  = size === 'lg' ? 20 : size === 'sm' ? 14 : 18;
  return (
    <span style={{
      width: dim, height: dim, borderRadius: theme.radiusSm + 4,
      background: tint, color: color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <CatIcon cat={cat} size={ic} color={color} strokeWidth={2} />
    </span>
  );
}

// ─── BillRow — list row, themed by treatment ──────────────────────
function BillRow({ theme, bill, onPress, density = 'comfortable', showDateAbsolute }) {
  const due = dueLabel(bill.nextDue);
  const days = daysFromToday(bill.nextDue);
  const overdue = days < 0;
  const soon = days >= 0 && days <= 2;
  const dueColor = overdue ? theme.danger : soon ? theme.warn : theme.textDim;

  const t = theme.catTreatment;
  const compact = density === 'compact';
  const grouped = density === 'grouped';

  // shared inner content
  const main = (
    <>
      {t === 'dot' && <CatBadge theme={theme} cat={bill.cat} treatment="dot" size={compact ? 'sm' : 'md'} />}
      {t === 'chip' && <CatBadge theme={theme} cat={bill.cat} treatment="chip" size={compact ? 'sm' : 'md'} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: compact ? 0 : 2 }}>
        <div style={{
          fontSize: compact ? 14 : 15.5, fontWeight: 500,
          color: bill.status === 'paused' ? theme.textDim : theme.text,
          fontFamily: theme.fontBody,
          letterSpacing: -0.15,
          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
          textDecoration: bill.status === 'cancelled' ? 'line-through' : 'none',
        }}>{bill.name}</div>
        {!compact && (
          <div style={{ fontSize: 12.5, color: dueColor, fontFamily: theme.fontBody, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{showDateAbsolute ? fmtDateShort(bill.nextDue) : due}</span>
            {bill.status === 'paused' && <span style={{ color: theme.textMuted }}>· paused</span>}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <AmountText theme={theme} amount={bill.amount} size={compact ? 14.5 : 16} weight={600} />
        {compact && (
          <div style={{ fontSize: 11.5, color: dueColor, fontFamily: theme.fontBody }}>{due}</div>
        )}
      </div>
    </>
  );

  // wrappers per row style
  const padding = compact ? '10px 14px' : '13px 14px';
  if (theme.rowStyle === 'card') {
    return (
      <Pressable onPress={onPress} style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding,
        background: theme.bgElev1,
        border: `1px solid ${theme.borderSoft}`,
        borderRadius: theme.radiusCard,
        marginBottom: 6,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {t === 'edge' && <CatBadge theme={theme} cat={bill.cat} treatment="edge" />}
        {main}
      </Pressable>
    );
  }
  // flat row with bottom border
  return (
    <Pressable onPress={onPress} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding,
      borderBottom: `1px solid ${theme.borderSoft}`,
    }}>
      {main}
    </Pressable>
  );
}

// ─── SectionHeader for grouped lists ──────────────────────────────
function SectionHeader({ theme, label, count }) {
  const c = theme.sectionLabelCase;
  const txt = c === 'upper' ? label.toUpperCase() : label;
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '18px 16px 8px',
      fontFamily: theme.fontBody,
      fontSize: c === 'upper' ? 11 : 12,
      letterSpacing: c === 'upper' ? 0.8 : 0,
      color: theme.textDim,
      fontWeight: 600,
      fontVariant: c === 'small-caps' ? 'all-small-caps' : 'normal',
    }}>
      <span>{txt}</span>
      {typeof count === 'number' && <span style={{ color: theme.textMuted, fontWeight: 500 }}>{count}</span>}
    </div>
  );
}

// ─── Sticky top app bar (per-screen header) ───────────────────────
function AppBar({ theme, title, leading, trailing, large, subtitle }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: `linear-gradient(180deg, ${theme.bg} 0%, ${theme.bg} 75%, ${theme.bg}00 100%)`,
      paddingTop: 60,  // room under the iOS status bar (62px)
      paddingBottom: large ? 0 : 6,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 16px', minHeight: 44,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.text }}>{leading}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{trailing}</div>
      </div>
      {large && (
        <div style={{ padding: '6px 16px 14px' }}>
          <div style={{
            fontFamily: theme.fontDisplay,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: -0.6,
            color: theme.text,
            lineHeight: 1.05,
          }}>{title}</div>
          {subtitle && (
            <div style={{
              marginTop: 4,
              fontFamily: theme.fontBody,
              fontSize: 13,
              color: theme.textDim,
            }}>{subtitle}</div>
          )}
        </div>
      )}
      {!large && title && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 60,
          textAlign: 'center', pointerEvents: 'none',
          fontFamily: theme.fontBody, fontSize: 16, fontWeight: 600, color: theme.text,
        }}>{title}</div>
      )}
    </div>
  );
}

// ─── ChevronIcon, PlusIcon, BackIcon, etc. ────────────────────────
const Icon = {
  back: (color = 'currentColor') => (
    <svg width="11" height="18" viewBox="0 0 11 18" fill="none">
      <path d="M9.5 1L1.5 9l8 8" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevron: (color = 'currentColor') => (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M1 1l5 5-5 5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (color = 'currentColor', size = 18) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  ),
  filter: (color = 'currentColor') => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M6 12h12M10 18h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  close: (color = 'currentColor', size = 18) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 5l14 14M19 5L5 19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  check: (color = 'currentColor', size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 12l5 5L20 6" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  copy: (color = 'currentColor') => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="8" y="8" width="12" height="12" rx="2.5" stroke={color} strokeWidth="2"/>
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  share: (color = 'currentColor') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v13M8 7l4-4 4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  pause: (color = 'currentColor') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="5" width="4" height="14" rx="1" fill={color}/>
      <rect x="14" y="5" width="4" height="14" rx="1" fill={color}/>
    </svg>
  ),
  play: (color = 'currentColor') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 5l12 7-12 7V5z" fill={color}/>
    </svg>
  ),
  edit: (color = 'currentColor') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 20h4l10-10-4-4L4 16v4z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  search: (color = 'currentColor') => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6" stroke={color} strokeWidth="2"/>
      <path d="M16 16l4 4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  google: (size = 18) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  ),
};

// ─── Brand mark ──────────────────────────────────────────────────
function BillOSMark({ theme, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: theme.accent,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: theme.accentInk,
      fontFamily: theme.fontDisplay,
      fontWeight: 800,
      fontSize: size * 0.5,
      letterSpacing: -0.5,
    }}>₹</div>
  );
}

Object.assign(window, {
  Pressable, Btn, AmountText, CatBadge, BillRow, SectionHeader, AppBar, Icon, BillOSMark,
});
