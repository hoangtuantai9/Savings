// The things that are deliberately not on screen: each track's options, the books, and the two
// questions the app asks before it does something you cannot take back.
//
// Nothing here shows on the menu — it is two cards and nothing else. Options are a right-click on
// a card, history is Ctrl+H, and a reset is Ctrl+R with no button anywhere.

import { count, amountAt } from './plans.js';
import { totals } from './state.js';
import { money } from './fx.js';

const $ = (sel, root = document) => root.querySelector(sel);

/**
 * Number input is lenient: 50,000 · 50.000 · 1234567 · 0.30 all parse the way you would expect.
 * A separator with exactly three digits behind it is grouping; anything else is a decimal point.
 */
function parseNumber(raw) {
  const s = String(raw).trim().replace(/[\s ₫$]/g, '');
  if (!s) return NaN;
  const last = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  if (last < 0) return Number(s);

  const tail = s.length - last - 1;
  const grouping = tail === 3;
  const cleaned = grouping
    ? s.replace(/[.,]/g, '')
    : s.slice(0, last).replace(/[.,]/g, '') + '.' + s.slice(last + 1);
  return Number(cleaned);
}

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
      <td>${e.bonus ? 'bonus' : 'step'}</td>
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
    lines.push([new Date(e.at).toISOString(), e.currency, e.index + 1, e.amount, e.bonus ? 'bonus' : 'step'].join(','));
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
 * One track's options. Each track's are its own — changing one never touches the other.
 * `apply` receives the new plan; `onUndo` rolls the track back one step and clears its lock.
 */
export function settingsPanel(state, currency, { apply, onUndo }) {
  const key = currency === 'VND' ? 'vnd' : 'usd';
  const plan = state[key];
  const p = panel(`${currency} options`);

  p.body.innerHTML = `
    <label class="field">
      <span>Standing on step</span>
      <div class="row">
        <input type="number" min="1" max="${count(plan)}" step="1" id="standing" value="${Math.min(state[key + 'Done'], count(plan) - 1) + 1}">
        <span class="unit">of ${count(plan)}</span>
      </div>
      <p class="hint" id="standing-hint"></p>
    </label>

    <label class="field">
      <span>Lock after ticking a step</span>
      <div class="row">
        <input type="number" min="0" step="1" id="cooldown" value="${plan.cooldown}">
        <span class="unit">minutes</span>
      </div>
      <div class="presets">
        <button type="button" data-mins="0">off</button>
        <button type="button" data-mins="60">1 hour</button>
        <button type="button" data-mins="1440">1 day</button>
        <button type="button" data-mins="10080">1 week</button>
      </div>
      <p class="hint">0 also removes the verdict: with no wait to survive there is nothing to be asked about.</p>
    </label>

    <div class="field">
      <span>Schedule by multiplier</span>
      <div class="row grid">
        <label>first<input type="text" id="start" value="${plan.start}"></label>
        <label>×<input type="text" id="ratio" value="${plan.ratio}"></label>
        <label>steps<input type="number" id="steps" min="1" value="${plan.steps}"></label>
        <label>round<input type="text" id="round" value="${plan.roundTo}"></label>
      </div>
      <p class="hint">Step <i>n</i> = first × multiplier<sup>n-1</sup>. A pasted list always wins over this.</p>
    </div>

    <label class="field">
      <span>Or paste your own list — one number per line</span>
      <textarea id="custom" rows="6" spellcheck="false">${plan.custom.join('\n')}</textarea>
      <p class="hint">Rewriting the list drops the colour bands with it — they describe the milestones they
      were written for. If your sheet is in thousands (57.50 meaning 57,500 ₫), multiply by 1000 first.</p>
    </label>

    <p class="preview" id="preview"></p>`;

  const el = id => $('#' + id, p.body);
  for (const b of p.body.querySelectorAll('.presets button')) {
    b.addEventListener('click', () => { el('cooldown').value = b.dataset.mins; });
  }

  const build = () => {
    const custom = el('custom').value.split(/\r?\n/).map(parseNumber).filter(n => Number.isFinite(n) && n > 0);
    const sameList = custom.length === plan.custom.length && custom.every((v, i) => v === plan.custom[i]);
    return {
      custom,
      // The bands describe the milestones they were written for, so a hand-edited ladder falls back
      // to one colour per currency. Leave the box alone and the bands stay.
      tierEnds: sameList ? plan.tierEnds.slice() : [],
      cooldown: Math.max(0, Math.round(Number(el('cooldown').value) || 0)),
      start: parseNumber(el('start').value) || plan.start,
      ratio: parseNumber(el('ratio').value) || plan.ratio,
      steps: Math.max(1, Math.round(Number(el('steps').value) || plan.steps)),
      roundTo: parseNumber(el('round').value) || 0
    };
  };

  const preview = () => {
    const next = build();
    const first = [0, 1, 2].map(i => money(currency, amountAt(next, i))).join('   ·   ');
    el('preview').textContent = `${count(next)} steps — ${first} …`;

    // Which step the track stands on, and therefore what it is about to ask for. Spelled out in
    // money, because "step 5" on its own cannot say whether five have been banked or four have.
    const standing = clampStep(el('standing').value, next);
    const banked = standing - 1;
    el('standing-hint').textContent =
      `${money(currency, amountAt(next, banked))} due next — ${banked} step${banked === 1 ? '' : 's'} banked before it.`;
  };

  const clampStep = (raw, plan) =>
    Math.min(Math.max(1, Math.round(Number(raw) || 1)), count(plan));
  preview();
  for (const node of p.body.querySelectorAll('input, textarea')) node.addEventListener('input', preview);

  const undo = button('Undo last step');
  undo.addEventListener('click', () => { p.close(); onUndo(currency); });
  const cancel = button('Cancel');
  cancel.addEventListener('click', p.close);
  const save = button('Save', 'primary');
  save.addEventListener('click', () => {
    const next = build();
    apply(currency, next, clampStep(el('standing').value, next));
    p.close();
  });
  p.foot.append(undo, cancel, save);
}
