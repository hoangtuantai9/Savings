// The things that are deliberately not on screen: each track's options, the books, and the two
// questions the app asks before it does something you cannot take back.
//
// Nothing here shows on the menu — it is two cards and nothing else. Options are a right-click on
// a card and history is Ctrl+H. Nothing in here can move a track to a step of your choosing and
// nothing can wipe the books — deliberately, so the ladder cannot be talked out of a wait.

import { lockFloor } from './plans.js';
import { totals } from './state.js';
import { money } from './fx.js';

/**
 * What a saved row was. Three kinds have put money into these books over the app's life: a plain
 * step off one of the two tracks, a box off the sheet's third column, and — until VERSION 20 dropped
 * them — a bonus off the two columns the sheet used to carry behind the main pair. The books are a record of what happened rather than a view of the app as it
 * stands today, so every row keeps the name it was saved under.
 */
const kindOf = e => (e.box ? 'box' : e.bonus ? 'bonus' : 'step');

const $ = (sel, root = document) => root.querySelector(sel);

/** A modal built from one template, so every panel in the app opens and closes the same way. */
function panel(title) {
  const back = document.createElement('div');
  back.className = 'panel-back';
  const box = document.createElement('div');
  box.className = 'panel';
  box.innerHTML = `<h2>${title}</h2><div class="panel-body"></div><div class="panel-foot"></div>`;
  back.appendChild(box);
  document.body.appendChild(back);

  const close = () => {
    back.classList.remove('up');
    setTimeout(() => back.remove(), 220);
  };
  back.addEventListener('click', e => { if (e.target === back) close(); });
  addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); removeEventListener('keydown', esc); }
  });
  requestAnimationFrame(() => back.classList.add('up'));

  return { back, box, body: $('.panel-body', box), foot: $('.panel-foot', box), close };
}

const button = (label, kind = '') => {
  const b = document.createElement('button');
  b.className = `btn ${kind}`;
  b.textContent = label;
  return b;
};

/** Asks first. Used by the reset and by history, which is the one screen that shows a total. */
export function confirmPanel(title, message, confirmLabel, onYes) {
  const p = panel(title);
  p.body.innerHTML = `<p class="panel-note">${message}</p>`;
  const yes = button(confirmLabel, 'danger');
  const no = button('Cancel');
  yes.addEventListener('click', () => { p.close(); onYes(); });
  no.addEventListener('click', p.close);
  p.foot.append(no, yes);
}

/**
 * Every saved step and the running totals — the number you are trying not to think about, which is
 * why the app asks before opening this at all.
 */
export function historyPanel(state) {
  const p = panel('History');
  const { vnd, usd } = totals(state);

  const rows = state.history.slice().reverse().map(e => `
    <tr>
      <td>${new Date(e.at).toLocaleString()}</td>
      <td>${e.currency}</td>
      <td class="num">${e.index + 1}</td>
      <td class="num">${money(e.currency, e.amount)}</td>
      <td>${kindOf(e)}</td>
    </tr>`).join('');

  p.body.innerHTML = `
    <div class="totals">
      <div><span>VND</span><b>${money('VND', vnd)}</b></div>
      <div><span>USD</span><b>${money('USD', usd)}</b></div>
      <div><span>Journeys</span><b>${state.journeys}</b></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>When</th><th>Track</th><th class="num">Step</th><th class="num">Amount</th><th>Kind</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="empty">Nothing saved yet.</td></tr>'}</tbody>
      </table>
    </div>`;

  const csv = button('Export CSV');
  csv.addEventListener('click', () => exportCsv(state));
  const close = button('Close');
  close.addEventListener('click', p.close);
  p.foot.append(csv, close);
}

function exportCsv(state) {
  const lines = ['when,currency,step,amount,kind'];
  for (const e of state.history) {
    lines.push([new Date(e.at).toISOString(), e.currency, e.index + 1, e.amount, kindOf(e)].join(','));
  }
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'savings-history.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * The way in to the shared books. Kept off every screen and reachable only by Ctrl+L, for the same
 * reason the totals are: the menu is two cards and nothing else.
 */
export function syncPanel({ status, email, onSignIn, onSignUp, onSignOut }) {
  const p = panel('Sync');

  if (status === 'off') {
    p.body.innerHTML = `<p class="panel-note">No backend is configured, so this browser keeps its own
      books. Fill in <code>js/config.js</code> with a Supabase project URL and anon key, and every
      device pointed at it shares one ladder.</p>`;
    const close = button('Close');
    close.addEventListener('click', p.close);
    p.foot.append(close);
    return;
  }

  if (status !== 'signed-out') {
    p.body.innerHTML = `<div class="totals">
        <div><span>Signed in</span><b>${email ?? '—'}</b></div>
        <div><span>State</span><b>${status === 'live' ? 'in step' : 'offline — will catch up'}</b></div>
      </div>
      <p class="panel-note">Every device signed in here shares one set of ladders. A step banked on
      one moves the others within a second or so.</p>`;
    const out = button('Sign out', 'danger');
    out.addEventListener('click', () => { p.close(); onSignOut(); });
    const close = button('Close');
    close.addEventListener('click', p.close);
    p.foot.append(out, close);
    return;
  }

  p.body.innerHTML = `
    <label class="field"><span>Email</span><input type="email" id="email" autocomplete="username"></label>
    <label class="field"><span>Password</span><input type="password" id="password" autocomplete="current-password"></label>
    <p class="panel-note" id="sync-msg">Use the same account on every machine. The first time on a new
    account, create it — the ladders you have climbed here are carried up to it.</p>`;

  const say = m => { $('#sync-msg', p.body).textContent = m; };
  const creds = () => [$('#email', p.body).value.trim(), $('#password', p.body).value];

  const run = async (fn, label) => {
    const [email, password] = creds();
    if (!email || !password) return say('Both fields, please.');
    say(label);
    try { await fn(email, password); p.close(); }
    catch (e) { say(e.message); }
  };

  const create = button('Create account');
  create.addEventListener('click', () => run(onSignUp, 'Creating…'));
  const enter = button('Sign in', 'primary');
  enter.addEventListener('click', () => run(onSignIn, 'Signing in…'));
  p.foot.append(create, enter);
}

/**
 * One track's options: the length of its wait, and nothing else. Each track's is its own — changing
 * one never touches the other. `apply` receives the new number of minutes.
 */
export function settingsPanel(state, currency, { apply }) {
  const key = currency === 'VND' ? 'vnd' : 'usd';
  const floor = lockFloor(currency);
  const p = panel(`${currency} options`);

  p.body.innerHTML = `
    <label class="field">
      <span>Lock after ticking a step</span>
      <div class="row">
        <input type="number" min="${floor}" step="1" id="cooldown"
               value="${Math.max(floor, state[key].cooldown)}">
        <span class="unit">minutes</span>
      </div>
      <div class="presets">
        <button type="button" data-mins="${floor}">${floor} — as designed</button>
        <button type="button" data-mins="60">1 hour</button>
        <button type="button" data-mins="1440">1 day</button>
        <button type="button" data-mins="10080">1 week</button>
      </div>
      <p class="hint">The wait can be made longer, never shorter — ${floor} minutes is the floor for
      ${currency}, and there is no off. A wait that can be turned down to nothing takes the verdict with
      it, and then there is nothing left to have survived.</p>
    </label>

    <p class="panel-note">The milestones themselves are not editable, here or anywhere in the app: they
    come from the spreadsheet, and where a track stands on them is climbed rather than set.</p>`;

  const read = () => Math.max(floor, Math.round(Number($('#cooldown', p.body).value) || floor));
  for (const b of p.body.querySelectorAll('.presets button')) {
    b.addEventListener('click', () => { $('#cooldown', p.body).value = b.dataset.mins; });
  }

  const cancel = button('Cancel');
  cancel.addEventListener('click', p.close);
  const save = button('Save', 'primary');
  save.addEventListener('click', () => { apply(currency, read()); p.close(); });
  p.foot.append(cancel, save);
}
