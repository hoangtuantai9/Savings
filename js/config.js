// Where the books are kept, if they are kept anywhere but this browser.
//
// Leave both fields empty and the app runs exactly as it does now: one browser, one set of books,
// nothing leaving the machine. Fill them in and every device pointed at the same project shares one
// ladder — tick a step on one machine and the phone has moved on before you have put it down.
//
// The anon key is meant to be public; it is not a password. What keeps the books private is Row
// Level Security on the table, which ties every row to the account that signed in. Turn that on
// before putting anything real in here — the SQL is in README.md under "Syncing".

export const SUPABASE = {
  url: 'https://nebhmyfqdeomkjicjnww.supabase.co',
  anonKey: 'sb_publishable_Ck_lE_14054vvkLBNOX95g_yMuxeULI'   // publishable key: public by design; RLS is what keeps the books private
};

export const configured = () => Boolean(SUPABASE.url && SUPABASE.anonKey);
