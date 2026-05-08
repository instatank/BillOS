// billos-screens.jsx — full clickable screens for the BillOS prototype.
// Owns the in-app navigation state machine.

const { useState: _u, useEffect: _e, useRef: _r, useMemo: _m, useCallback: _c } = React;
// (Aliased so we can also import React hooks fresh per file w/o collisions.)

// ─────────────────────────────────────────────────────────────────
// SCREEN: Signed-out
// ─────────────────────────────────────────────────────────────────
function SignedOutScreen({ theme, onSignIn }) {
  return (
    <div style={{
      height: '100%', position: 'relative',
      display: 'flex', flexDirection: 'column',
      paddingTop: 62,
      background: theme.bg,
    }}>
      {/* Hero block */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'flex-start',
        padding: '0 28px',
      }}>
        <BillOSMark theme={theme} size={44} />
        <div style={{
          marginTop: 24,
          fontFamily: theme.fontDisplay,
          fontSize: 38, fontWeight: 700, lineHeight: 1.05, letterSpacing: -0.8,
          color: theme.text,
        }}>
          BillOS
        </div>
        <div style={{
          marginTop: 10,
          fontFamily: theme.fontBody,
          fontSize: 17, lineHeight: 1.4, color: theme.textDim,
          maxWidth: 280,
        }}>
          Your household's recurring outflows, in one calm place.
        </div>

        {/* tiny preview cards floating */}
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 10, alignSelf: 'stretch' }}>
          {[
            { name: 'BSES Rajdhani',  amount: 4280, cat: 'utilities', due: 'in 4 days' },
            { name: 'Sushila ji',     amount: 12000, cat: 'people',    due: 'in 23 days' },
            { name: 'Netflix',        amount: 649,  cat: 'subscriptions', due: 'Tomorrow' },
          ].map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              background: theme.bgElev1,
              border: `1px solid ${theme.borderSoft}`,
              borderRadius: theme.radiusCard,
              opacity: 1 - i * 0.18,
            }}>
              <CatBadge theme={theme} cat={b.cat} />
              <div style={{ flex: 1, fontSize: 14.5, color: theme.text, fontFamily: theme.fontBody, fontWeight: 500 }}>
                {b.name}
                <div style={{ fontSize: 12, color: theme.textDim, fontWeight: 400, marginTop: 1 }}>{b.due}</div>
              </div>
              <AmountText theme={theme} amount={b.amount} size={15} weight={600} />
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '16px 16px 50px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Btn theme={theme} kind="primary" full onPress={onSignIn} icon={Icon.google(18)}>
          Sign in with Google
        </Btn>
        <div style={{ textAlign: 'center', fontSize: 12, color: theme.textMuted, fontFamily: theme.fontBody }}>
          Real-time household sync · No ads · No bank access
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN: Household Choice (after sign-in, first time)
// ─────────────────────────────────────────────────────────────────
function HouseholdChoiceScreen({ theme, onCreate, onJoin, signOut }) {
  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', background: theme.bg }}>
      <AppBar theme={theme}
        leading={<Pressable onPress={signOut} style={{ color: theme.accent, fontSize: 15, fontFamily: theme.fontBody }}>Sign out</Pressable>}
        large title="Set up household"
        subtitle="Create a new household, or join one with an invite code."
      />
      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Pressable onPress={onCreate} style={{
          padding: '20px 20px', borderRadius: theme.radiusLg,
          background: theme.bgElev1, border: `1px solid ${theme.borderSoft}`,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: theme.fontDisplay, fontSize: 19, fontWeight: 600, color: theme.text }}>Create household</div>
            {Icon.chevron(theme.textDim)}
          </div>
          <div style={{ fontSize: 14, color: theme.textDim, fontFamily: theme.fontBody, lineHeight: 1.4 }}>
            Get a 6-digit invite code. Share it with one other person — your mom, partner, roommate.
          </div>
        </Pressable>

        <Pressable onPress={onJoin} style={{
          padding: '20px 20px', borderRadius: theme.radiusLg,
          background: theme.bgElev1, border: `1px solid ${theme.borderSoft}`,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: theme.fontDisplay, fontSize: 19, fontWeight: 600, color: theme.text }}>Join household</div>
            {Icon.chevron(theme.textDim)}
          </div>
          <div style={{ fontSize: 14, color: theme.textDim, fontFamily: theme.fontBody, lineHeight: 1.4 }}>
            Got a code from someone? Enter it to join their household.
          </div>
        </Pressable>

        <div style={{ marginTop: 'auto', padding: '12px 4px 24px', fontSize: 12, color: theme.textMuted, lineHeight: 1.5, fontFamily: theme.fontBody }}>
          Households are limited to 2 members in V1. Both members see the same bills in real time.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN: Household Created (show invite code)
// ─────────────────────────────────────────────────────────────────
function HouseholdCreatedScreen({ theme, onContinue, onBack }) {
  const [copied, setCopied] = _u(false);
  const code = BILLOS_HOUSEHOLD.inviteCodeRaw;

  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', background: theme.bg }}>
      <AppBar theme={theme}
        leading={<Pressable onPress={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.accent, fontFamily: theme.fontBody, fontSize: 15 }}>{Icon.back(theme.accent)}<span>Back</span></Pressable>}
      />
      <div style={{ flex: 1, padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'center' }}>
        <div style={{
          fontFamily: theme.fontDisplay, fontSize: 26, fontWeight: 700,
          color: theme.text, letterSpacing: -0.5,
        }}>Share this code</div>
        <div style={{ marginTop: 6, fontSize: 14, color: theme.textDim, fontFamily: theme.fontBody, maxWidth: 280, lineHeight: 1.45 }}>
          One other person can join your household with this code. Expires in {BILLOS_HOUSEHOLD.inviteExpiresInHours} hours.
        </div>

        <div style={{
          marginTop: 28,
          padding: '24px 18px',
          background: theme.bgElev1,
          border: `1px solid ${theme.borderSoft}`,
          borderRadius: theme.radiusLg,
          width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {code.split('').map((d, i) => (
              <div key={i} style={{
                width: 38, height: 52, borderRadius: theme.radiusSm + 2,
                background: theme.bgElev2,
                border: `1px solid ${theme.borderSoft}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: theme.fontDisplay, fontSize: 28, fontWeight: 700,
                color: theme.text, letterSpacing: -0.5,
                fontVariantNumeric: 'tabular-nums',
              }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Pressable onPress={() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: theme.accent, fontFamily: theme.fontBody, fontWeight: 600,
              padding: '6px 10px',
            }}>
              {copied ? Icon.check(theme.accent, 14) : Icon.copy(theme.accent)}
              <span>{copied ? 'Copied' : 'Copy code'}</span>
            </Pressable>
            <span style={{ width: 1, height: 14, background: theme.borderSoft }} />
            <Pressable style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: theme.accent, fontFamily: theme.fontBody, fontWeight: 600,
              padding: '6px 10px',
            }}>
              {Icon.share(theme.accent)}<span>Share</span>
            </Pressable>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 50px' }}>
        <Btn theme={theme} kind="primary" full onPress={onContinue}>Continue to bills</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN: Join (enter 6-digit code)
// ─────────────────────────────────────────────────────────────────
function JoinScreen({ theme, onJoined, onBack }) {
  const [code, setCode] = _u('');
  const correct = BILLOS_HOUSEHOLD.inviteCodeRaw;
  _e(() => {
    if (code.length === 6) {
      // simulate the join after a short delay
      const t = setTimeout(() => onJoined(), 700);
      return () => clearTimeout(t);
    }
  }, [code, onJoined]);
  const isWrong = code.length === 6 && code !== correct;

  const press = (n) => setCode((c) => (c.length < 6 ? c + n : c));
  const back = () => setCode((c) => c.slice(0, -1));

  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', background: theme.bg }}>
      <AppBar theme={theme}
        leading={<Pressable onPress={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.accent, fontFamily: theme.fontBody, fontSize: 15 }}>{Icon.back(theme.accent)}<span>Back</span></Pressable>}
      />
      <div style={{ flex: 1, padding: '4px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: theme.fontDisplay, fontSize: 26, fontWeight: 700, color: theme.text, letterSpacing: -0.5 }}>Enter invite code</div>
        <div style={{ marginTop: 6, fontSize: 14, color: theme.textDim, fontFamily: theme.fontBody, maxWidth: 280, lineHeight: 1.45 }}>
          Six digits, from whoever set up the household.
        </div>

        <div style={{ marginTop: 36, display: 'flex', gap: 8 }}>
          {[0,1,2,3,4,5].map((i) => {
            const d = code[i];
            const filled = d !== undefined;
            const active = !filled && i === code.length;
            return (
              <div key={i} style={{
                width: 40, height: 54, borderRadius: theme.radiusSm + 2,
                background: theme.bgElev1,
                border: `1.5px solid ${isWrong ? theme.danger : active ? theme.accent : theme.borderSoft}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: theme.fontDisplay, fontSize: 28, fontWeight: 700,
                color: theme.text, letterSpacing: -0.5,
                fontVariantNumeric: 'tabular-nums',
              }}>{d ?? ''}</div>
            );
          })}
        </div>

        <div style={{ marginTop: 14, height: 18, fontSize: 13, fontFamily: theme.fontBody }}>
          {isWrong ? <span style={{ color: theme.danger }}>That code didn't match. Try {correct}.</span> :
           code.length === 6 ? <span style={{ color: theme.success }}>Joining…</span> :
           <span style={{ color: theme.textMuted }}>Hint: try {correct}</span>}
        </div>

        {/* keypad */}
        <div style={{
          marginTop: 'auto', marginBottom: 24,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%', maxWidth: 320,
        }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => {
            const empty = k === '';
            const isBack = k === '⌫';
            return (
              <Pressable key={i} disabled={empty}
                onPress={() => empty ? null : isBack ? back() : press(k)}
                style={{
                  height: 56, borderRadius: theme.radius,
                  background: empty ? 'transparent' : theme.bgElev1,
                  border: empty ? 'none' : `1px solid ${theme.borderSoft}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: theme.fontDisplay, fontSize: 22, fontWeight: 600,
                  color: theme.text,
                }}>{k}</Pressable>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN: Just Joined (success)
// ─────────────────────────────────────────────────────────────────
function JoinedScreen({ theme, onContinue }) {
  _e(() => { const t = setTimeout(onContinue, 1400); return () => clearTimeout(t); }, [onContinue]);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: theme.bg, gap: 14 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 32,
        background: theme.success, color: theme.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{Icon.check(theme.bg, 28)}</div>
      <div style={{ fontFamily: theme.fontDisplay, fontSize: 22, fontWeight: 600, color: theme.text }}>Joined Safdarjung</div>
      <div style={{ fontSize: 14, color: theme.textDim, fontFamily: theme.fontBody }}>Syncing bills…</div>
    </div>
  );
}

Object.assign(window, {
  SignedOutScreen, HouseholdChoiceScreen, HouseholdCreatedScreen, JoinScreen, JoinedScreen,
});
