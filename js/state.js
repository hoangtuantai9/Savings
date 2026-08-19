// Everything the app remembers, and the one place it is written down.
//
// It lives in localStorage under one key. Every mutation goes through save(), which is the single
// seam the sync layer plugs into — one write path, one broadcast, so nothing can reach the disk
// without also being offered to the other machines.

import { plans, VERSION, count, lockFloor } from './plans.js';
import * as sync from './sync.js';

const KEY = 'savings.data';

/** A fresh, unclimbed set of ladders. Only load() ever needs one. */
function blank() {
  return {
    version: VERSION,
    vnd: plans.vnd(),
    usd: plans.usd(),
    vndBonus: plans.vndBonus(),
    usdBonus: plans.usdBonus(),
    journeys: 0,
    vndDone: 0,
    usdDone: 0,
    vndBonusDone: 0,
    usdBonusDone: 0,
    // When each bonus is allowed back, or null for "right now". Never shown: the app draws the
    // stone or it draws nothing, and the gap between those two is the only thing that gives the
    // clock away.
    vndBonusReadyAt: null,
    usdBonusReadyAt: null,
    // The day each bonus was last taken, and how many times it has been taken on that day. Two a
    // day, per currency; the third does not come round until tomorrow.
    vndBonusDay: null,
    usdBonusDay: null,
    vndBonusToday: 0,
    usdBonusToday: 0,
    // When the lock expires. Persisted so closing the tab cannot skip the wait.
    vndUnlockAt: null,
    usdUnlockAt: null,
    // Raised when a step is banked and lowered only when the wait that followed it has been
    // judged. A track holding this flag is frozen — no next amount until it is answered.
    vndAwaitingVerdict: false,
    usdAwaitingVerdict: false,
    history: []
  };
}

/**
 * Puts a saved file onto the ladders as they actually are. All four are rebuilt from plans.js every
 * time, whatever the file claims they were: nothing about a ladder is editable any more, so a file
 * that disagrees with the spreadsheet is a file that has been got at, not a file to be honoured.
 *
 * The one thing carried across is each track's wait, and only ever lengthened — a stored zero would
 * otherwise buy a ladder with no waits and no verdicts, which is the loophole the options panel has
 * just been shut on.
 */
function migrate(s) {
  const wait = currency => {
    const stored = Number(s[currency === 'VND' ? 'vnd' : 'usd']?.cooldown);
    return Math.max(lockFloor(currency), Number.isFinite(stored) ? stored : 0);
  };
  s.vnd = plans.vnd(wait('VND'));
  s.usd = plans.usd(wait('USD'));
  s.vndBonus = plans.vndBonus();
  s.usdBonus = plans.usdBonus();

  s.vndDone = clamp(s.vndDone, 0, count(s.vnd));
  s.usdDone = clamp(s.usdDone, 0, count(s.usd));
  s.vndBonusDone = clamp(s.vndBonusDone, 0, count(s.vndBonus));
  s.usdBonusDone = clamp(s.usdBonusDone, 0, count(s.usdBonus));
  s.version = VERSION;
  return s;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v || 0));

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate({ ...blank(), ...JSON.parse(raw) });
  } catch {
    // Corrupt entry: keep a copy and start fresh rather than refusing to open.
    try { localStorage.setItem(KEY + '.bak', localStorage.getItem(KEY) ?? ''); } catch { /* full */ }
  }
  return migrate(blank());
}

export function save(state) {
  // Stamped on the way out: the tie-breaker when two devices wrote from the same revision.
  state.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* private mode or a full disk: the session still runs, it just will not survive */ }
  sync.push(state);
}

// Another tab of the same browser writing the file: adopt it rather than fight it. This is also
// what makes two windows on one machine agree, and the shape a real sync backend would take.
export function watchOtherTabs(apply) {
  addEventListener('storage', e => {
    if (e.key === KEY && e.newValue) {
      try { apply(migrate({ ...blank(), ...JSON.parse(e.newValue) })); } catch { /* ignore */ }
    }
  });
}

// ---- reading a track off the state ------------------------------------------------------------

const lower = c => (c === 'VND' ? 'vnd' : 'usd');

/** The main ladder of one currency, as one object the views can read without knowing the keys. */
export function track(s, currency) {
  const k = lower(currency);
  return {
    currency,
    plan: s[k],
    done: s[k + 'Done'],
    unlockAt: s[k + 'UnlockAt'] ? new Date(s[k + 'UnlockAt']) : null,
    awaitingVerdict: s[k + 'AwaitingVerdict']
  };
}

/** The calendar day, as the machine in front of you reckons it. */
export const today = () => new Date().toLocaleDateString('en-CA');   // YYYY-MM-DD, local

/** The bonus ladder of one currency. Its clock is unrelated to the main track's. */
export function bonus(s, currency) {
  const k = lower(currency) + 'Bonus';
  return {
    currency,
    plan: s[k],
    done: s[k + 'Done'],
    readyAt: s[k + 'ReadyAt'] ? new Date(s[k + 'ReadyAt']) : null,
    // Yesterday's tally is not today's: a stored count only counts if it was set today.
    takenToday: s[k + 'Day'] === today() ? (s[k + 'Today'] ?? 0) : 0
  };
}

export const setTrack = (s, currency, patch) => Object.assign(s, prefixed(lower(currency), patch));
export const setBonus = (s, currency, patch) => Object.assign(s, prefixed(lower(currency) + 'Bonus', patch));

function prefixed(prefix, patch) {
  const out = {};
  for (const [k, v] of Object.entries(patch)) out[prefix + k[0].toUpperCase() + k.slice(1)] = v;
  return out;
}

// ---- the books --------------------------------------------------------------------------------

/** Totals across every pass of the ladders. History survives a wrap; the milestones do not. */
export function totals(s) {
  let vnd = 0, usd = 0;
  for (const e of s.history) (e.currency === 'VND' ? (vnd += e.amount) : (usd += e.amount));
  return { vnd, usd };
}

/** Milliseconds left on a lock, or 0 if there is none. */
export function remaining(at) {
  if (!at) return 0;
  return Math.max(0, at.getTime() - Date.now());
}
