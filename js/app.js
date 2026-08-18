// The rules, and the clock that drives them.
//
// Everything that changes the ladders happens here and is written down immediately: the answer to
// the verdict is on disk the moment a step is banked, so closing the tab is not a way around the
// question.

import { plans, count, amountAt, VERSION } from './plans.js';
import * as store from './state.js';
import { track, bonus, remaining, setTrack, setBonus, totals } from './state.js';
import { accentOf, alpha, ICE } from './gem.js';
import { proclaim, after, money } from './fx.js';
import { createMenu } from './menu.js';
import { createFocus } from './focus.js';
import { historyPanel, settingsPanel, confirmPanel } from './panels.js';

let state = store.load();
let busy = false;                 // a celebration is playing; the rules hold still until it ends

const room = document.getElementById('room');
const blooms = { VND: document.getElementById('bloom-vnd'), USD: document.getElementById('bloom-usd') };

const menu = createMenu({
  onOpen: currency => enter(currency, false),
  onBonus: currency => enter(currency, true),
  onSettings: currency => openSettings(currency)
});
room.appendChild(menu.root);

const focus = createFocus({
  onBack: () => leaveFocus(),
  onTick: (currency, isBonus) => tick(currency, isBonus),
  onVerdict: (currency, held) => answer(currency, held),
  onOpenBonus: currency => enter(currency, true)
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

async function enter(currency, asBonus) {
  if (busy) return;
  const b = bonus(state, currency);
  if (asBonus && (b.done >= count(b.plan) || remaining(b.readyAt) > 0)) return;
  busy = true;
  menu.leave();
  await focus.open(state, currency, asBonus);
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

/** Banks the amount on offer. A bonus starts no wait and asks no question. */
async function tick(currency, isBonus) {
  if (busy) return;
  const line = isBonus ? bonus(state, currency) : track(state, currency);
  const total = count(line.plan);
  if (line.done >= total) return;
  if (!isBonus && (remaining(track(state, currency).unlockAt) > 0 || track(state, currency).awaitingVerdict)) return;

  const amount = amountAt(line.plan, line.done);
  const beforeTier = accentOf(currency, line.plan, line.done);

  state.history.push({
    currency, index: line.done, amount, at: new Date().toISOString(), bonus: !!isBonus
  });

  if (isBonus) {
    // Its own numbering, the same books — and the stone goes away for its own hidden while.
    setBonus(state, currency, {
      done: line.done + 1,
      readyAt: new Date(Date.now() + line.plan.cooldown * 60000).toISOString()
    });
  } else {
    const mins = line.plan.cooldown;
    setTrack(state, currency, {
      done: line.done + 1,
      unlockAt: mins > 0 ? new Date(Date.now() + mins * 60000).toISOString() : null,
      awaitingVerdict: mins > 0
    });
  }
  save();

  busy = true;
  const now = isBonus ? bonus(state, currency) : track(state, currency);
  await focus.celebrateSave(beforeTier, now.done >= total);
  busy = false;

  render();
  if (isBonus) { focus.revealed = false; focus.paint(); }
  checkWrap();
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
    after(hold, () => { busy = false; focus.revealed = false; focus.paint(); render(); });
    focus.revealed = false;
    focus.paint();
  } else {
    busy = true;
    await focus.celebrateUndo(accentOf(currency, t.plan, Math.max(0, t.done - 1)));
    rollBack(currency);
    busy = false;
    focus.revealed = false;
    focus.paint();
    render();
  }
}

/**
 * Takes one main step back off a track: the amount leaves the history with it, the lock is cleared
 * and the track returns to the milestone below. Bonus rows are walked past — they belong to a
 * different ladder.
 */
function rollBack(currency) {
  const t = track(state, currency);
  for (let i = state.history.length - 1; i >= 0; i--) {
    const e = state.history[i];
    if (e.currency === currency && !e.bonus) { state.history.splice(i, 1); break; }
  }
  setTrack(state, currency, {
    done: Math.max(0, t.done - 1), unlockAt: null, awaitingVerdict: false
  });
  save();
}

/**
 * Once all four ladders are finished — and with no verdict still owed — the app holds the finished
 * screens for about three seconds, so the crown and its burst land as an ending, then strikes one
 * word across the window and starts the climb over. The books are not touched.
 */
function checkWrap() {
  const all = ['VND', 'USD'].every(c => {
    const t = track(state, c), b = bonus(state, c);
    return t.done >= count(t.plan) && b.done >= count(b.plan) && !t.awaitingVerdict;
  });
  if (!all) return;

  busy = true;
  after(3000, () => {
    // Undoing a step during the pause calls the wrap off.
    const still = ['VND', 'USD'].every(c => track(state, c).done >= count(track(state, c).plan));
    if (!still) { busy = false; return; }

    state.journeys++;
    for (const c of ['VND', 'USD']) {
      setTrack(state, c, { done: 0, unlockAt: null, awaitingVerdict: false });
      setBonus(state, c, { done: 0, readyAt: null });
    }
    save();
    const hold = proclaim('AGAIN', accentOf('VND', state.vnd, 0), true);
    after(hold, () => {
      busy = false;
      focus.revealed = false;
      if (focus.isOpen()) focus.paint();
      render();
    });
  });
}

// ---- options, books, reset -----------------------------------------------------------------------

function openSettings(currency) {
  settingsPanel(state, currency, {
    apply: (cur, plan) => {
      const key = cur === 'VND' ? 'vnd' : 'usd';
      state[key] = plan;
      const done = Math.min(track(state, cur).done, count(plan));
      setTrack(state, cur, { done });
      save();
      render();
    },
    onUndo: cur => { rollBack(cur); render(); if (focus.isOpen()) focus.paint(); }
  });
}

function openHistory() {
  confirmPanel('History',
    'This shows every saved step and the running totals — the number the app otherwise keeps out of sight.',
    'Show me', () => historyPanel(state));
}

function resetAll() {
  confirmPanel('Start over',
    'Both ladders go back to step 1, the locks are cleared and the history is wiped. There is no undo.',
    'Reset everything', () => {
      state = store.blank();
      save();
      render();
    });
}

// ---- the clock -----------------------------------------------------------------------------------

// What each track's lock looked like a moment ago, so the app can tell a lock running out now from
// one that had already run out when the page was opened. The first is news; the second is not.
const ticking = {
  VND: remaining(track(state, 'VND').unlockAt) > 0,
  USD: remaining(track(state, 'USD').unlockAt) > 0
};
const bonusHidden = {
  VND: remaining(bonus(state, 'VND').readyAt) > 0,
  USD: remaining(bonus(state, 'USD').readyAt) > 0
};

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
      if (focus.isOpen() && focus.currency === currency && !focus.onBonus) {
        focus.render(state);
        focus.askVerdict(accentOf(currency, t.plan, t.done));
      } else {
        menu.announce(currency);
      }
    } else if (live) {
      ticking[currency] = true;
      dirty = true;                       // the countdown on the face has a second to lose
    }

    const hidden = remaining(bonus(state, currency).readyAt) > 0;
    if (hidden !== bonusHidden[currency]) { bonusHidden[currency] = hidden; dirty = true; }
  }

  if (dirty) render();
}, 250);

// ---- keys ----------------------------------------------------------------------------------------

addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.key.toLowerCase() === 'h') { e.preventDefault(); openHistory(); }
  else if (ctrl && e.key.toLowerCase() === 'r') { e.preventDefault(); resetAll(); }
  else if (e.key === 'Escape' && focus.isOpen()) leaveFocus();
});

// Another tab of the same browser writing the file: adopt it rather than fight it.
store.watchOtherTabs(next => { state = next; render(); });

menu.enter();
render();

// Kept off the window in the desktop app and kept off it here: nothing on screen reads the totals.
if (location.hash === '#books') openHistory();
