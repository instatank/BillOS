// billos-app.jsx — root component for one BillOS prototype instance.
// Owns the state machine: signedOut -> householdChoice -> created/joined -> list.
// Uses ios-frame's IOSDevice as the device chrome.

const { useState: _us, useEffect: _ef, useMemo: _mo, useRef: _rf, useCallback: _cb } = React;

function BillOSApp({ theme, density = 'comfortable', addBillPattern = 'sheet', onResetExternal, initialScreen = 'signedOut', initialShowAdd = false, initialActiveBillId = null }) {
  // Initial screen — when running as full prototype, start signed-out so the
  // user walks through the onboarding flow. When pinned to a specific screen
  // (canvas preview), use the prop.
  const [screen, setScreen] = _us(initialScreen);
  const [bills, setBills] = _us(BILLOS_SEED_BILLS);
  const [activeBillId, setActiveBillId] = _us(initialActiveBillId);
  const [showAdd, setShowAdd] = _us(initialShowAdd);
  const [createMode, setCreateMode] = _us('create'); // 'create' | 'join'

  // expose external reset hook (for tweaks panel "restart flow" buttons)
  _ef(() => {
    if (onResetExternal) onResetExternal({
      reset: () => { setScreen(initialScreen); setActiveBillId(initialActiveBillId); setShowAdd(initialShowAdd); setBills(BILLOS_SEED_BILLS); },
    });
  }, [onResetExternal]);

  const onSignIn = () => setScreen('householdChoice');
  const onCreate = () => { setCreateMode('create'); setScreen('householdCreated'); };
  const onJoin   = () => { setCreateMode('join');   setScreen('joinForm'); };
  const onJoined = () => setScreen('joinedSuccess');
  const onContinueToList = () => setScreen('list');

  const activeBill = activeBillId ? bills.find(b => b.id === activeBillId) : null;

  const updateBill = (id, patch) => setBills(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b));
  const addBill = (b) => setBills(bs => [b, ...bs]);

  const screenContent = (() => {
    switch (screen) {
      case 'signedOut':
        return <SignedOutScreen theme={theme} onSignIn={onSignIn} />;
      case 'householdChoice':
        return <HouseholdChoiceScreen theme={theme} onCreate={onCreate} onJoin={onJoin} signOut={() => setScreen('signedOut')} />;
      case 'householdCreated':
        return <HouseholdCreatedScreen theme={theme} onContinue={onContinueToList} onBack={() => setScreen('householdChoice')} />;
      case 'joinForm':
        return <JoinScreen theme={theme} onJoined={onJoined} onBack={() => setScreen('householdChoice')} />;
      case 'joinedSuccess':
        return <JoinedScreen theme={theme} onContinue={onContinueToList} />;
      case 'list':
        return (
          <VariantHome
            theme={theme}
            bills={bills}
            household={BILLOS_HOUSEHOLD}
            density={density}
            onOpenBill={(id) => { setActiveBillId(id); setScreen('detail'); }}
            onAdd={() => setShowAdd(true)}
            onSignOut={() => setScreen('signedOut')}
          />
        );
      case 'detail':
        return (
          <DetailScreen
            theme={theme}
            bill={activeBill}
            household={BILLOS_HOUSEHOLD}
            onBack={() => setScreen('list')}
            onUpdate={updateBill}
          />
        );
      default:
        return null;
    }
  })();

  // Outer wrapper inside the iOS device. Position: relative so add-bill
  // sheet can absolute-position over the screen.
  return (
    <div style={{
      position: 'relative',
      height: '100%',
      minHeight: '100%',
      background: theme.bg,
      color: theme.text,
      fontFamily: theme.fontBody,
      WebkitFontSmoothing: 'antialiased',
      overflow: 'hidden',
    }}>
      {screenContent}
      {showAdd && screen === 'list' && (
        <VariantAdd
          theme={theme}
          onSave={addBill}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

// Wrapper that puts the app into an iOS device frame and adds a tiny
// "restart flow" floating control on the device, plus a label tag.
function BillOSPrototype({ theme, density, addBillPattern, initialScreen, initialShowAdd, initialActiveBillId, hideRestart, deviceWidth = 402, deviceHeight = 874 }) {
  const resetHookRef = _rf(null);
  const [version, setVersion] = _us(0);

  // hard-reset by remounting the app — easy way to wipe internal state.
  const restart = () => setVersion(v => v + 1);

  // status bar dark/light depends on theme mode but also on the current
  // bg of the screen — use theme.statusBarDark.
  return (
    <div style={{ position: 'relative' }}>
      <IOSDevice width={deviceWidth} height={deviceHeight} dark={theme.statusBarDark}>
        <BillOSApp
          key={version}
          theme={theme}
          density={density}
          addBillPattern={addBillPattern}
          initialScreen={initialScreen}
          initialShowAdd={initialShowAdd}
          initialActiveBillId={initialActiveBillId}
          onResetExternal={(api) => { resetHookRef.current = api; }}
        />
      </IOSDevice>

      {!hideRestart && <div style={{
        position: 'absolute', top: 14, left: -42,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <Pressable onPress={restart} ariaLabel="Restart flow" style={{
          width: 32, height: 32, borderRadius: 16,
          background: '#2a251f', color: '#f0eee9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          fontSize: 11, fontWeight: 600,
          fontFamily: '-apple-system, system-ui, sans-serif',
        }} title="Restart flow from sign-in">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Pressable>
      </div>}
    </div>
  );
}

window.BillOSApp = BillOSApp;
window.BillOSPrototype = BillOSPrototype;
