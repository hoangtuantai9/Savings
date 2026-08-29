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
 *
 * At 25 because a new journey was asked for by name: both tracks and the box back to their first
 * milestone, the locks cleared, the verdicts they were owed cleared, and the box's own clock cleared
 * with them so it is standing there for the new climb. The books are not part of it — see
 * BOOKS_WIPE_AT below, which has deliberately stayed where it was.
 *
 * It sat at 22 through the re-cut at 23 and the box being cut loose at 24. Re-cutting a sheet or
 * changing what a ladder does is not by itself a reason to send a climb back to step 1; only being
 * asked is.
 */
const JOURNEY_RESET_AT = 25;

/**
 * The version at which the books themselves were emptied, and the only thing in the app that can
 * take a saved step back off the history without a cross being answered.
 *
 * Kept apart from JOURNEY_RESET_AT on purpose, and now seven versions behind it: every ladder has
 * just been sent back to its first milestone for the second time, and neither time did anybody ask
 * for the money to go with it. A journey reset means "this climb is over"; a wipe means "there was
 * no climb" — and only one of those should ever be carried by a reset. Staying at 18 while the reset
 * above has moved twice is exactly what that separation is for: a reset that quietly took the books
 * with it would be the one mistake they cannot come back from.
 *
 * Move this only on an instruction to empty the books by name.
 */
const BOOKS_WIPE_AT = 18;

/**
 * The version at which USD's designed wait came down from twenty-five minutes to twenty-four, and
 * the reason that one minute needed a version of its own.
 *
 * A wait is only ever lengthened where it is read — see migrate() below — so lowering the floor in
 * plans.js does nothing on its own: a set of books carrying the old twenty-five would go on
 * carrying it for ever, and the change would only ever reach a browser that had never opened the
 * app. This moves exactly the old figure down to the new one, once. A wait somebody lengthened on
 * purpose is theirs, and is left where they put it.
 */
const USD_WAIT_RECUT_AT = 20;
const OLD_USD_LOCK = 25;

/** A fresh, unclimbed set of ladders. Only load() ever needs one. */
function blank() {
  return {
    version: VERSION,
    vnd: plans.vnd(),
    usd: plans.usd(),
    box: plans.box(),
    journeys: 0,
    vndDone: 0,
    usdDone: 0,
    boxDone: 0,
    // When the box comes back, or null for "it is there now". Its own clock and nobody else's: the
    // box is away for its wait after being opened and is standing there again once the time is up.
    // Persisted, so closing the tab neither skips the wait nor loses a box that is due.
    boxUnlockAt: null,
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
 * Puts a saved file onto the ladders as they actually are. All three are rebuilt from plans.js
 * every time, whatever the file claims they were: nothing about a ladder is editable any more, so a file
 * that disagrees with the spreadsheet is a file that has been got at, not a file to be honoured.
 *
 * The one thing carried across is each track's wait, and only ever lengthened — a stored zero would
 * otherwise buy a ladder with no waits and no verdicts, which is the loophole the options panel has
 * just been shut on. The single exception is the minute USD lost at USD_WAIT_RECUT_AT, which has to
 * come down or never arrive at all.
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
  // The one wait this function will shorten, and only from the exact figure it used to be.
  const usdStored = Number(s.usd?.cooldown);
  const usdWait = (s.version ?? 0) < USD_WAIT_RECUT_AT && usdStored === OLD_USD_LOCK
    ? lockFloor('USD')
    : wait('USD');

  s.vnd = plans.vnd(wait('VND'));
  s.usd = plans.usd(usdWait);
  s.box = plans.box();

  // A new journey. Every ladder goes back to its first milestone — both tracks and the box — and
  // every clock with them: the waits, the verdicts they were owed, and the box standing on the menu
  // waiting to be opened. All of it belonged to a climb that is over.
  //
  // The books are not touched, the same way they are not touched by a wrap: the steps were saved
  // and the money is real, so the new pass adds to the old one rather than replacing it. `journeys`
  // is not touched either — it counts ladders finished, and this pass was not finished.
  if ((s.version ?? 0) < JOURNEY_RESET_AT) {
    for (const c of ['vnd', 'usd']) {
      s[c + 'Done'] = 0;
      s[c + 'UnlockAt'] = null;
      s[c + 'AwaitingVerdict'] = false;
    }
    s.boxDone = 0;
    s.boxUnlockAt = null;
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
  s.boxDone = clamp(s.boxDone, 0, count(s.box));

  // A wait longer than the box's own is not a wait the box could have started — the figure has come
  // down since it was stamped. Trim it rather than making somebody sit out a cadence that no longer
  // exists, which also puts a stop to any nonsense date arriving over sync from a machine whose
  // clock is wrong.
  if (s.boxUnlockAt) {
    const most = Date.now() + s.box.cooldown * 60000;
    if (new Date(s.boxUnlockAt).getTime() > most) s.boxUnlockAt = new Date(most).toISOString();
  }

  // Whether the box is standing there is worked out from its clock every time it is asked for, so
  // these two are the shape it used to be kept in and nothing reads them any more. A file written
  // before VERSION 24 still carries them; they go the same way the bonus keys did.
  delete s.boxLive;
  delete s.boxGrantedAt;

  // The two bonus ladders are gone, and so are the keys they were kept under. A file written before
  // VERSION 20 still carries them, and this is the reader every file comes through, so they are
  // dropped here rather than handed back to the disk and pushed on to every other device. Not
  // version-gated: there is no version at which they should exist again. The history is untouched —
  // a bonus step that was banked was money, and money stays in the books.
  for (const k of ['Bonus', 'BonusDone', 'BonusReadyAt', 'BonusDay', 'BonusToday']) {
    delete s['vnd' + k];
    delete s['usd' + k];
  }

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

/**
 * The box, as one object the views can read without knowing the keys.
 *
 * Whether it is standing there is not stored — it is read off its own clock every time, which is
 * what makes it impossible for the flag and the wait to disagree. It is there when its wait is up
 * and there is something left in the column, and nowhere otherwise. No verdict: its wait is time it
 * spends away rather than time you have to hold out through, so there is nothing to own up to.
 */
export function box(s) {
  const done = s.boxDone;
  const unlockAt = s.boxUnlockAt ? new Date(s.boxUnlockAt) : null;
  return { plan: s.box, done, unlockAt, live: done < count(s.box) && remaining(unlockAt) === 0 };
}

export const setTrack = (s, currency, patch) => Object.assign(s, prefixed(lower(currency), patch));

function prefixed(prefix, patch) {
  const out = {};
  for (const [k, v] of Object.entries(patch)) out[prefix + k[0].toUpperCase() + k.slice(1)] = v;
  return out;
}

// ---- the books --------------------------------------------------------------------------------

/**
 * Totals across every pass of the ladders. History survives a wrap; the milestones do not — and it
 * survived the bonus ladders going away too, so a row banked off column C or D is still counted
 * here.
 */
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
