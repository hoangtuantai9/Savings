// Everything the app remembers, and the one place it is written down.
//
// It lives in localStorage under one key. Every mutation goes through save(), which is the single
// seam the sync layer plugs into — one write path, one broadcast, so nothing can reach the disk
// without also being offered to the other machines.

import { plans, VERSION, count, lockFloor } from './plans.js';
import * as sync from './sync.js';

const KEY = 'savings.data';

/**
 * The version at which every ladder was sent back to its first milestone, and the only thing in the
 * app that can move a track without it being climbed.
 *
 * A number rather than an import, deliberately. Two generations of this folder can be mixed in a
 * browser's HTTP cache for as long as the cache lasts, and a module that asks plans.js for a name it
 * has not got yet takes the whole graph down with it — a white window rather than a stale one. This
 * file already asks plans.js only for names every generation of it has had, so the one figure that
 * changes with each reset lives here, next to the code that reads it.
 */
const JOURNEY_RESET_AT = 18;

/**
 * The version at which the books themselves were emptied, and the only thing in the app that can
 * take a saved step back off the history without a cross being answered.
 *
 * Kept apart from JOURNEY_RESET_AT on purpose, even though the two happen to name the same version
 * today. A journey reset means "this climb is over"; a wipe means "there was no climb" — and only
 * one of those should be inherited by the next re-cut of the sheet. Leaving this figure behind when
 * JOURNEY_RESET_AT next moves is the whole point: a reset that quietly took the money with it would
 * be the one mistake the books cannot come back from.
 *
 * Set to the version above only because it was asked for. If you are re-cutting the sheet and have
 * no such instruction, move JOURNEY_RESET_AT and leave this one where it stands.
 */
const BOOKS_WIPE_AT = 18;

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
 *
 * Where a track stands is carried across too, and is the one figure this function will move of its
 * own accord: see JOURNEY_RESET_AT above. Every document the app believes comes through here, so
 * that is the only place a reset has to be written down.
 *
 * The books are the exception to the exception. They normally survive everything — a wrap, a reset,
 * a re-cut sheet — and BOOKS_WIPE_AT is the one figure that can empty them. It is set only when a
 * clean sheet has actually been asked for, and it is deliberately not the same constant as the one
 * above, so that moving a journey reset can never take the money with it by accident.
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

  // A new journey. Every ladder goes back to its first milestone — both main tracks and both
  // bonuses — and every clock with them: the waits, the verdicts they were owed, the hidden bonus
  // clocks and today's bonus tally. All of it belonged to a climb that is over.
  //
  // The books are not touched, the same way they are not touched by a wrap: the steps were saved
  // and the money is real, so the new pass adds to the old one rather than replacing it. `journeys`
  // is not touched either — it counts ladders finished, and this pass was not finished.
  if ((s.version ?? 0) < JOURNEY_RESET_AT) {
    for (const c of ['vnd', 'usd']) {
      s[c + 'Done'] = 0;
      s[c + 'UnlockAt'] = null;
      s[c + 'AwaitingVerdict'] = false;
      s[c + 'BonusDone'] = 0;
      s[c + 'BonusReadyAt'] = null;
      s[c + 'BonusDay'] = null;
      s[c + 'BonusToday'] = 0;
    }
  }

  // A clean sheet, asked for by name: the history goes with the milestones, and the totals drawn
  // off it go to zero with them. `journeys` too — a count of ladders finished means nothing once
  // the record of finishing them is gone.
  //
  // This is the one place in the app where money already banked leaves the books, and it fires
  // once: the version stamped at the foot of this function is what stops it a second time. A
  // document arriving over sync from a machine that has not seen this version yet comes through
  // here before it is weighed against anything, so it cannot carry the old books back in.
  if ((s.version ?? 0) < BOOKS_WIPE_AT) {
    s.history = [];
    s.journeys = 0;
  }

  s.vndDone = clamp(s.vndDone, 0, count(s.vnd));
  s.usdDone = clamp(s.usdDone, 0, count(s.usd));
  s.vndBonusDone = clamp(s.vndBonusDone, 0, count(s.vndBonus));
  s.usdBonusDone = clamp(s.usdBonusDone, 0, count(s.usdBonus));
  s.version = VERSION;
  return s;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v || 0));

/**
 * A document from anywhere but this function's own output — another tab, or another machine over
 * sync — put onto the ladders as they actually are before anything is allowed to believe it.
 *
 * A remote document used to be adopted as it arrived, which meant a phone that had not been opened
 * since the sheet was re-cut could push its copy of the old column A back over the new one, and
 * take the re-peg with it. A saved file is not trusted; there is no reason a document that has been
 * over the wire should be.
 */
export const normalise = doc => migrate({ ...blank(), ...doc });

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalise(JSON.parse(raw));
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
      try { apply(normalise(JSON.parse(e.newValue))); } catch { /* ignore */ }
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
