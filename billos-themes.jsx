// billos-themes.jsx — three structural variants on the Pocket palette.
// Variants drive IA + row + add-flow. All three share the cream/sage/lime
// palette so visual identity is consistent — the difference is structural.

const BILLOS_THEMES = {
  // ─── Today — calm, mom-test priority, wizard add ────────────────
  pocketToday: {
    id: 'pocketToday',
    name: 'Today',
    tagline: 'Calm · one thing at a time · big tap targets',
    mode: 'light',
    variant: 'today',     // → drives ListScreen dispatch
    addPattern: 'wizard', // → multi-step add

    bg:        '#f4f6ed',
    bgElev1:   '#ffffff',
    bgElev2:   '#fafbf3',
    border:    '#e3e7d6',
    borderSoft:'#ebeedf',
    text:      '#1a1f12',
    textDim:   '#5e6b50',
    textMuted: '#8a957a',

    accent:        '#3a6f1e',
    accentInk:     '#f4f6ed',
    accentSoft:    '#d6e8b8',
    accentBorder:  '#a4c47a',
    accentBright:  '#c8ff4e',

    danger: '#b03a2c', warn: '#a17126', success: '#3a6f1e',

    catColor: { utilities: '#3a6ea5', subscriptions: '#7c4fb0', credit_cards: '#a86a1f', people: '#3a6f1e', other: '#6f6a5a' },
    catTint:  { utilities: '#dfe8f4', subscriptions: '#eadefa', credit_cards: '#f4e0c5', people: '#dbe8c5', other: '#ece8da' },

    radius: 18, radiusSm: 12, radiusLg: 24, radiusCard: 22,

    fontBody:    `"Geist", -apple-system, system-ui, sans-serif`,
    fontDisplay: `"Bricolage Grotesque", "Geist", system-ui, sans-serif`,
    fontNum:     `"Bricolage Grotesque", "Geist", system-ui, sans-serif`,

    catTreatment: 'chip', rowStyle: 'card', sectionLabelCase: 'normal',
    statusBarDark: false,
  },

  // ─── Calendar — time-aware, tab bar, sheet add ──────────────────
  pocketCal: {
    id: 'pocketCal',
    name: 'Calendar',
    tagline: 'Time-aware · tap a date · tab-bar nav',
    mode: 'light',
    variant: 'calendar',
    addPattern: 'sheet',

    bg:        '#fafbf3',
    bgElev1:   '#ffffff',
    bgElev2:   '#f4f6ed',
    border:    '#e3e7d6',
    borderSoft:'#ebeedf',
    text:      '#1a1f12',
    textDim:   '#5e6b50',
    textMuted: '#8a957a',

    accent:        '#3a6f1e',
    accentInk:     '#f4f6ed',
    accentSoft:    '#d6e8b8',
    accentBorder:  '#a4c47a',
    accentBright:  '#c8ff4e',

    danger: '#b03a2c', warn: '#a17126', success: '#3a6f1e',

    catColor: { utilities: '#3a6ea5', subscriptions: '#7c4fb0', credit_cards: '#a86a1f', people: '#3a6f1e', other: '#6f6a5a' },
    catTint:  { utilities: '#dfe8f4', subscriptions: '#eadefa', credit_cards: '#f4e0c5', people: '#dbe8c5', other: '#ece8da' },

    radius: 14, radiusSm: 10, radiusLg: 20, radiusCard: 16,

    fontBody:    `"Geist", -apple-system, system-ui, sans-serif`,
    fontDisplay: `"Bricolage Grotesque", "Geist", system-ui, sans-serif`,
    fontNum:     `"Geist Mono", "JetBrains Mono", ui-monospace, monospace`,

    catTreatment: 'dot', rowStyle: 'flat', sectionLabelCase: 'upper',
    statusBarDark: true,
  },

  // ─── Stack — rich card feed, drawer filters, modal add ──────────
  pocketStack: {
    id: 'pocketStack',
    name: 'Stack',
    tagline: 'Rich card feed · drawer filters · powerful',
    mode: 'light',
    variant: 'stack',
    addPattern: 'modal',

    bg:        '#1a1f12',     // dark card-on-dark for contrast
    bgElev1:   '#252b1a',
    bgElev2:   '#2c3322',
    border:    '#3a432a',
    borderSoft:'#2f3823',
    text:      '#f4f6ed',
    textDim:   '#a4b095',
    textMuted: '#7a8770',

    accent:        '#c8ff4e',  // bright lime in dark mode
    accentInk:     '#1a1f12',
    accentSoft:    '#2a3a1a',
    accentBorder:  '#5a7a2a',
    accentBright:  '#c8ff4e',

    danger: '#ff7a6e', warn: '#ffb46e', success: '#9bf0b3',

    catColor: { utilities: '#7eb6ff', subscriptions: '#d1a3ff', credit_cards: '#ffb46e', people: '#9bf0b3', other: '#aab2c2' },
    catTint:  { utilities: 'rgba(126,182,255,0.18)', subscriptions: 'rgba(209,163,255,0.18)', credit_cards: 'rgba(255,180,110,0.18)', people: 'rgba(155,240,179,0.18)', other: 'rgba(170,178,194,0.18)' },

    radius: 14, radiusSm: 10, radiusLg: 20, radiusCard: 18,

    fontBody:    `"Geist", -apple-system, system-ui, sans-serif`,
    fontDisplay: `"Bricolage Grotesque", "Geist", system-ui, sans-serif`,
    fontNum:     `"Bricolage Grotesque", "Geist", system-ui, sans-serif`,

    catTreatment: 'chip', rowStyle: 'card', sectionLabelCase: 'normal',
    statusBarDark: true,
  },
};

// ─── Stack — LIGHT mode (chosen direction). Same flow as pocketStack
//      but using the calm Today palette so it doubles as the daytime view.
BILLOS_THEMES.pocketStackLight = {
  ...BILLOS_THEMES.pocketStack,
  id: 'pocketStackLight',
  name: 'Stack · Light',
  tagline: 'Same flow, daytime palette',
  mode: 'light',

  bg:        '#f4f6ed',
  bgElev1:   '#ffffff',
  bgElev2:   '#fafbf3',
  border:    '#e3e7d6',
  borderSoft:'#ebeedf',
  text:      '#1a1f12',
  textDim:   '#5e6b50',
  textMuted: '#8a957a',

  accent:        '#3a6f1e',
  accentInk:     '#f4f6ed',
  accentSoft:    '#d6e8b8',
  accentBorder:  '#a4c47a',

  catColor: { utilities: '#3a6ea5', subscriptions: '#7c4fb0', credit_cards: '#a86a1f', people: '#3a6f1e', other: '#6f6a5a' },
  catTint:  { utilities: '#dfe8f4', subscriptions: '#eadefa', credit_cards: '#f4e0c5', people: '#dbe8c5', other: '#ece8da' },

  statusBarDark: false,
};

window.BILLOS_THEMES = BILLOS_THEMES;
