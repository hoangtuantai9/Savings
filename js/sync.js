// One set of books across every machine.
//
// The state is a single JSON document in one row of one table, keyed by whoever signed in. Saving
// pushes it; a change made anywhere else arrives over a websocket and is adopted. No library — the
// REST and Realtime endpoints are both plain HTTP and WebSocket, and pulling in a bundler for two
// fetches would cost more than it is worth.
//
// Conflicts: every write carries a revision number one higher than the one it was made from. A
// document arriving with a higher revision wins outright. Two devices that wrote from the same
// revision are compared on the length of their history first — a step banked is a fact, and the
// device that knows about more of them has seen more — and on the clock only to break a tie.

import { SUPABASE, configured } from './config.js';

const TABLE = 'savings_state';
const PUSH_DELAY = 900;          // a tick fires several saves; let them settle into one round trip

let session = null;              // { access_token, refresh_token, user: { id } }
let socket = null;
let pushTimer = null;
let pending = null;
let onRemote = () => {};
let status = 'off';              // off | signed-out | live | offline

export const syncStatus = () => status;

/** Who the shared books belong to on this device, for the panel to show. */
export const account = () => session?.user?.email ?? null;

const headers = (extra = {}) => ({
  apikey: SUPABASE.anonKey,
  Authorization: `Bearer ${session?.access_token ?? SUPABASE.anonKey}`,
  'Content-Type': 'application/json',
  ...extra
});

// ---- signing in ---------------------------------------------------------------------------------

const SESSION_KEY = 'savings.session';

function remember(next) {
  session = next;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* private mode: the session simply will not outlive the tab */ }
}

async function auth(path, body) {
  const res = await fetch(`${SUPABASE.url}/auth/v1/${path}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || 'sign-in failed');
  return data;
}

export async function signIn(email, password) {
  remember(await auth('token?grant_type=password', { email, password }));
  return start();
}

export async function signUp(email, password) {
  const data = await auth('signup', { email, password });
  // A project with email confirmation on returns no session until the link is clicked.
  if (data.access_token) { remember(data); return start(); }
  return { confirm: true };
}

export function signOut() {
  remember(null);
  socket?.close();
  socket = null;
  status = 'signed-out';
}

/** Refreshes an expired token rather than dropping the user back to a sign-in box. */
async function refresh() {
  if (!session?.refresh_token) return false;
  try {
    remember(await auth('token?grant_type=refresh_token', { refresh_token: session.refresh_token }));
    return true;
  } catch { remember(null); return false; }
}

// ---- the row ------------------------------------------------------------------------------------

async function rest(path, init = {}, retry = true) {
  const res = await fetch(`${SUPABASE.url}/rest/v1/${path}`, { ...init, headers: headers(init.head) });
  if (res.status === 401 && retry && await refresh()) return rest(path, init, false);
  return res;
}

/** The document as this device last knew it, or null if the row has never been written. */
export async function pull() {
  if (!session) return null;
  const res = await rest(`${TABLE}?select=doc,rev&user_id=eq.${session.user.id}`);
  if (!res.ok) { status = 'offline'; return null; }
  const rows = await res.json();
  status = 'live';
  return rows[0] ? { ...rows[0].doc, rev: rows[0].rev } : null;
}

async function upsert(state) {
  if (!session) return;
  const rev = (state.rev ?? 0) + 1;
  const body = JSON.stringify({ user_id: session.user.id, doc: { ...state, rev }, rev });
  const res = await rest(TABLE, {
    method: 'POST', body, head: { Prefer: 'resolution=merge-duplicates,return=minimal' }
  });
  if (res.ok) { state.rev = rev; status = 'live'; }
  else status = 'offline';
}

/** Called after every local write. Coalesced, so a burst of saves is one round trip. */
export function push(state) {
  if (!configured() || !session) return;
  pending = state;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { const s = pending; pending = null; if (s) upsert(s); }, PUSH_DELAY);
}

/**
 * Which of two documents to keep. A higher revision wins; from the same revision, the one that
 * knows about more banked steps does; and only then the clock.
 */
export function pick(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  if ((remote.rev ?? 0) !== (local.rev ?? 0)) return (remote.rev ?? 0) > (local.rev ?? 0) ? remote : local;
  if (remote.history.length !== local.history.length) {
    return remote.history.length > local.history.length ? remote : local;
  }
  return (remote.savedAt ?? 0) > (local.savedAt ?? 0) ? remote : local;
}

// ---- listening ----------------------------------------------------------------------------------

/** Realtime: the row changing anywhere else arrives here within a second or so. */
function listen() {
  socket?.close();
  const url = SUPABASE.url.replace(/^http/, 'ws') + `/realtime/v1/websocket?apikey=${SUPABASE.anonKey}&vsn=1.0.0`;
  socket = new WebSocket(url);

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({
      topic: 'realtime:savings', event: 'phx_join', ref: '1',
      payload: {
        config: {
          broadcast: { self: false },
          postgres_changes: [{ event: '*', schema: 'public', table: TABLE,
                               filter: `user_id=eq.${session.user.id}` }]
        },
        access_token: session.access_token
      }
    }));
    status = 'live';
  });

  // Supabase drops a socket that has gone quiet, so it has to be kept warm.
  const beat = setInterval(() => {
    if (socket?.readyState === 1) {
      socket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: '0' }));
    }
  }, 25000);

  socket.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    const row = msg?.payload?.data?.record;
    if (row?.doc) onRemote({ ...row.doc, rev: row.rev });
  });

  socket.addEventListener('close', () => {
    clearInterval(beat);
    if (status !== 'signed-out') { status = 'offline'; setTimeout(() => session && listen(), 4000); }
  });
}

async function start() {
  listen();
  return pull();
}

/**
 * Wakes the whole thing up. `apply` is handed any document that arrives from elsewhere; the caller
 * decides what to do with it. Returns whatever the server already had, or null.
 */
export async function init(apply) {
  onRemote = apply;
  if (!configured()) { status = 'off'; return null; }

  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) session = JSON.parse(saved);
  } catch { /* nothing worth recovering */ }

  if (!session) { status = 'signed-out'; return null; }
  if (!(await refresh())) { status = 'signed-out'; return null; }
  return start();
}
