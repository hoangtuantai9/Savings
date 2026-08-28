// The rules, and the clock that drives them.
//
// Everything that changes the ladders happens here and is written down immediately: the answer to
// the verdict is on disk the moment a step is banked, so closing the tab is not a way around the
// question.

import { count, amountAt } from './plans.js';
import * as store from './state.js';
import { track, box, remaining, setTrack } from './state.js';
import { accentOf, alpha } from './gem.js';
import { proclaim, after } from './fx.js';
import { createMenu } from './menu.js';
import { createFocus } from './focus.js';
import { historyPanel, settingsPanel, confirmPanel, syncPanel } from './panels.js';
import * as sync from './sync.js';

let state = store.load();
let busy = false;                 // a celebration is playing; the rules hold still until it ends

const room = document.getElementById('room');
const blooms = { VND: document.getElementById('bloom-vnd'), USD: document.getElementById('bloom-usd') };

const menu = createMenu({
  onOpen: currency => enter(currency),
  onBox: () => enterBox(),
  onSettings: currency => openSettings(currency)
});
room.appendChild(menu.root);

const focus = createFocus({
  onBack: () => leaveFocus(),
  onTick: currency => tick(currency),
  onVerdict: (currency, held) => answer(currency, held),
  onTickBox: () => tickBox()
});
room.appendChild(focus.root);

const save = () => store.save(state);

// ---- drawing ----------------------------------------------------------------------------------

function render() {
  menu.render(state);
  if (focus.isOpen()) focus.render(state);

  // The room is lit from the left and right by two soft blooms carrying each track's tier colour,
  // so both ladders starting red means the room starts red, and it warms as they are climbed.
  for (const currency of ['VND', 'USD']) {
    const t = track(state, currency);
    blooms[currency].style.background =
      `radial-gradient(closest-side, ${alpha(accentOf(currency, t.plan, t.done), 0.30)}, transparent)`;
  }
}

// ---- moving between the two screens -------------------------------------------------------------

async function enter(currency) {
  if (busy) return;
  busy = true;
  menu.leave();
  await focus.open(state, currency);
  busy = false;
}

/** The box's own screen. Nothing to check but that there is a box and something left in it. */
async function enterBox() {
  if (busy) return;
  const b = box(state);
  if (!b.live || b.done >= count(b.plan)) return;
  busy = true;
  menu.leave();
  await focus.open(state, 'USD', true);
  busy = false;
}

async function leaveFocus() {
  if (busy) return;
  busy = true;
  await focus.close();
  menu.back();
  render();
  busy = false;
}

// ---- the rules ----------------------------------------------------------------------------------

/** Banks the amount on offer, and starts the wait that has to be survived for it. */
async function tick(currency) {
  if (busy) return;
  const line = track(state, currency);
  const total = count(line.plan);
  if (line.done >= total) return;
  if (remaining(line.unlockAt) > 0 || line.awaitingVerdict) return;

  const amount = amountAt(line.plan, line.done);
  const beforeTier = accentOf(currency, line.plan, line.done);

  state.history.push({ currency, index: line.done, amount, at: new Date().toISOString() });

  const mins = line.plan.cooldown;
  setTrack(state, currency, {
    done: line.done + 1,
    unlockAt: mins > 0 ? new Date(Date.now() + mins * 60000).toISOString() : null,
    awaitingVerdict: mins > 0
  });
  save();

  busy = true;
  await focus.celebrateSave(beforeTier, track(state, currency).done >= total);
  busy = false;

  render();
  checkWrap();
}

/**
 * Banks what was in the box, and sends it away for its own wait.
 *
 * It asks no question on the way out. The tracks ask because their wait is time you have to hold
 * out through and somebody has to say whether you did; the box's wait is only time it spends away,
 * and there is nothing to own up to.
 */
async function tickBox() {
  if (busy) return;
  const b = box(state);
  if (!b.live || b.done >= count(b.plan)) return;

  const amount = amountAt(b.plan, b.done);
  // The colour it was wearing when it was opened, not the one the next box will wear: this burst
  // belongs to the step being banked.
  const accent = accentOf('USD', b.plan, b.done);

  state.history.push({
    currency: 'USD', index: b.done, amount, at: new Date().toISOString(), box: true
  });
  const mins = b.plan.cooldown;
  state.boxDone = b.done + 1;
  state.boxUnlockAt = mins > 0 ? new Date(Date.now() + mins * 60000).toISOString() : null;
  save();

  busy = true;
  await focus.celebrateBox(amount, accent);
  busy = false;

  await leaveFocus();
}

/** Tick — held out. Cross — did not: the step goes straight back off the ladder. */
async function answer(currency, held) {
  if (busy) return;
  const t = track(state, currency);
  if (!t.awaitingVerdict) return;

  if (held) {
    setTrack(state, currency, { awaitingVerdict: false, unlockAt: null });
    save();
    render();
    // Crossing into a new tier gets twice the sparks and a longer hold.
    const before = accentOf(currency, t.plan, Math.max(0, t.done - 1));
    const nowColour = accentOf(currency, t.plan, t.done);
    busy = true;
    const hold = proclaim('UNLOCKED', nowColour, before !== nowColour);
    after(hold, () => { busy = false; focus.paint(); render(); });
    focus.paint();
  } else {
    busy = true;
    await focus.celebrateUndo(accentOf(currency, t.plan, Math.max(0, t.done - 1)));
    rollBack(currency);
    busy = false;
    focus.paint();
    render();
  }
}

/**
 * Takes one step back off a track: the amount leaves the history with it, the lock is cleared and
 * the track returns to the milestone below.
 *
 * A row banked off the box is walked past, and so is one left behind by the old bonus columns.
 * Both are money that was really saved; a cross answered here has to take this track's own step
 * rather than the nearest thing to it.
 *
 */
function rollBack(currency) {
  const t = track(state, currency);
  for (let i = state.history.length - 1; i >= 0; i--) {
    const e = state.history[i];
    if (e.currency === currency && !e.bonus && !e.box) { state.history.splice(i, 1); break; }
  }
  setTrack(state, currency, {
    done: Math.max(0, t.done - 1), unlockAt: null, awaitingVerdict: false
  });
  save();
}

/**
 * Once both tracks are finished — and with no verdict still owed — the app holds the finished
 * screens for about three seconds, so the crown and its burst land as an ending, then strikes one
 * word across the window and starts the climb over. The books are not touched.
 */
function checkWrap() {
  const all = ['VND', 'USD'].every(c => {
    const t = track(state, c);
    return t.done >= count(t.plan) && !t.awaitingVerdict;
  });
  if (!all) return;

  busy = true;
  after(3000, () => {
    // Undoing a step during the pause calls the wrap off.
    const still = ['VND', 'USD'].every(c => track(state, c).done >= count(track(state, c).plan));
    if (!still) { busy = false; return; }

    state.journeys++;
    for (const c of ['VND', 'USD']) setTrack(state, c, { done: 0, unlockAt: null, awaitingVerdict: false });
    // The box goes back to its first milestone with them, and its clock with it.
    state.boxDone = 0;
    state.boxUnlockAt = null;
    save();
    const hold = proclaim('AGAIN', accentOf('VND', state.vnd, 0), true);
    after(hold, () => {
      busy = false;
      if (focus.isOpen()) focus.paint();
      render();
    });
  });
}

// ---- options, books, reset -----------------------------------------------------------------------

function openSettings(currency) {
  settingsPanel(state, currency, {
    // The only thing an option can change is how long the wait is. The ladder comes from the sheet
    // and where a track stands on it is climbed, so neither is reachable from here.
    apply: (cur, mins) => {
      state[cur === 'VND' ? 'vnd' : 'usd'].cooldown = mins;
      save();
      render();
    }
  });
}

function openHistory() {
  confirmPanel('History',
    'This shows every saved step and the running totals — the number the app otherwise keeps out of sight.',
    'Show me', () => historyPanel(state));
}

// There is no way to start over from inside the app, and that is the point: a ladder you can send
// back to step 1 on a whim is a ladder that never has to be climbed. The only wipe left is the one
// the app performs itself, at the top of both ladders, after the crown and the burst.

// ---- the clock -----------------------------------------------------------------------------------

// What each track's lock looked like a moment ago, so the app can tell a lock running out now from
// one that had already run out when the page was opened. The first is news; the second is not.
const ticking = {
  VND: remaining(track(state, 'VND').unlockAt) > 0,
  USD: remaining(track(state, 'USD').unlockAt) > 0
};

// And whether the box was standing there a moment ago, so that its own clock coming round is drawn
// the moment it does. It is announced by nothing: the box turning up is the announcement.
let boxWasLive = box(state).live;
setInterval(() => {
  if (busy) return;
  let dirty = false;

  for (const currency of ['VND', 'USD']) {
    const t = track(state, currency);
    const live = remaining(t.unlockAt) > 0;

    if (ticking[currency] && !live) {
      // The clock reaching zero is announced, not just noted.
      ticking[currency] = false;
      dirty = true;
      if (focus.isOpen() && focus.currency === currency) {
        focus.render(state);
        focus.askVerdict(accentOf(currency, t.plan, t.done));
      } else {
        menu.announce(currency);
      }
    } else if (live) {
      ticking[currency] = true;
      dirty = true;                       // the countdown on the face has a second to lose
    }
  }

  const boxLive = box(state).live;
  if (boxLive !== boxWasLive) { boxWasLive = boxLive; dirty = true; }

  if (dirty) render();
}, 250);

// ---- keys ----------------------------------------------------------------------------------------

addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  const ctrl = e.ctrlKey || e.metaKey;

  // Ctrl+R is left to the browser, where it means reload. It used to open the reset.
  if (ctrl && e.key.toLowerCase() === 'h') { e.preventDefault(); openHistory(); }
  else if (ctrl && e.key.toLowerCase() === 'l') { e.preventDefault(); openSync(); }
  else if (e.key === 'Escape' && focus.isOpen()) leaveFocus();
});

// Another tab of the same browser writing the file: adopt it rather than fight it.
store.watchOtherTabs(next => { state = next; render(); });

// ---- the same books, on another machine ------------------------------------------------------

/**
 * A document arriving from elsewhere. It is put onto the ladders as they actually are before it is
 * weighed against this device's copy — a machine that has not been opened since the sheet was
 * re-cut is carrying an out-of-date column, and winning the revision count does not make it right.
 * It is only ever adopted between moments — a burst mid-flight would swap the ladder out from under
 * a celebration — and only if it is the one to keep.
 */
function adopt(remote) {
  const kept = sync.pick(state, store.normalise(remote));
  if (kept === state) return;
  const take = () => { state = kept; store.save(state); render(); if (focus.isOpen()) focus.paint(); };
  busy ? after(600, () => (busy ? after(1200, take) : take())) : take();
}

sync.init(adopt).then(remote => { if (remote) adopt(remote); });

function openSync() {
  syncPanel({
    status: sync.syncStatus(),
    email: sync.account(),
    onSignIn: async (email, password) => { const r = await sync.signIn(email, password); if (r) adopt(r); },
    onSignUp: async (email, password) => {
      const r = await sync.signUp(email, password);
      if (r?.confirm) throw new Error('Check your inbox, then sign in.');
      // A brand new account starts empty, so this device's ladders are what fills it.
      store.save(state);
    },
    onSignOut: () => sync.signOut()
  });
}

menu.enter();
render();

// Nothing on screen ever reads the totals; this is the one way in, and it asks first.
if (location.hash === '#books') openHistory();
