# Savings

A web app for running two savings ladders side by side — **VND** and **USD** — while keeping the numbers out of sight.

The screen shows you the amount due right now and a tick to confirm you saved it — no totals, and no schedule. The
menu shows how many steps you have cleared, and nothing about what they cost. Tick it and the gem locks — 18 minutes
for VND, 25 for USD — before the next amount exists, and when that lock runs out the gem asks whether you actually
held out. Say no and the step comes back off the ladder. Now and then a second, colder stone turns up beside a gem
with its own amount on it — each currency has one; there is no telling when, because the clock behind it is never
shown.

It runs in any modern browser, on Windows, macOS, Android and iOS, from one address.

## Run

Open `index.html` through a web server — the app is ES modules, which browsers refuse to load from `file://`:

```bash
npx serve .          # or: python -m http.server
```

Then open the address it prints. There is no build step, no bundler and no dependencies: what is in this folder is
what runs.

**On a phone**, open the same address and use *Add to Home Screen*. It installs as a standalone app — its own icon,
no browser chrome — through `manifest.webmanifest`.

## Publishing

The whole app is static files, so GitHub Pages serves it as-is:

1. Push this repository to GitHub.
2. **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. It appears at `https://<user>.github.io/<repo>/` a minute later.

Cloudflare Pages, Netlify and Vercel all work the same way, and any of them can serve a private repository for free
if you would rather the code were not public.

## Getting at it

Everything is a click or a key; nothing is a menu.

| | |
|---|---|
| **Click a card** | Into that currency's screen |
| **Click the ice stone** | Into its bonus, whether the card behind it is open or shut |
| **Escape** or **BACK** | Out to the menu |
| **Right-click a card** | That track's options |
| **Ctrl/⌘ + H** | History and totals |
| **Ctrl/⌘ + L** | Sign in, so every device shares one set of books |
| **Ctrl/⌘ + R** | Start both ladders over |

Installed as a PWA it gets its own window and its own icon, with no address bar — on a desktop and on a phone alike.
A tab, though, can be buried under another tab: if the amount due is meant to stay in front of you, install it rather
than bookmarking it.

## Flow

Everything is built on a diamond — a gem for each currency, and the app icon is one brilliant-cut stone split down
the middle, gold for VND and mint for USD. Every rim is drawn in a white gradient, brightest at the top vertex and
picking a sheen back up at the bottom, so a gem reads as cut glass rather than an outline.

**Main menu** — the screen is split into two cards, VND on the left and USD on the right, and nothing else: no logo,
no title, no numbers. Each card is a lit panel with a light travelling its border in the track's tier colour, and
holds the gem with its step count and the currency name. There is no button: **the gem is the button**. Open, it
wears its full tier colour, twinkles, and takes a band of light across its face every few seconds — click anywhere on
the card to go in. Locked, the same stone is mixed towards a cold blue until the light has gone out of it, the bloom
behind it fades to nothing, the sparks and the glint stop, the pointer goes back to an arrow and the countdown is cut
into the middle of the face in a pale tint of the track's own colour. A closed card cannot be opened at all — only
right-click, which reaches this track's settings whether it is locked or not.

**The count is cut into the stone.** Each gem carries the number of steps that track has cleared, in dark ink on the
face — 41 means forty-one banked and the forty-second on offer. Only the main ladder counts here; the bonus keeps its
own tally and stays out of it. Amounts remain off this screen entirely: the number says how far, never how much.

**The card winds up as a promotion comes into range.** Over the last five steps of a colour band the bloom behind the
gem brightens and swells, its beat quickens from two and a half seconds to under one, and the light travelling the
card's border speeds up to match — all of it scaling with how close you are, and hitting full tilt on the step whose
tick actually changes the colour. The last band counts down to the end of the ladder the same way.

**Pick one** — the menu rushes past the camera while that currency's screen zooms in behind it, tilting the last few
degrees into place. The gem lands closed, then opens on its own.

| Stage | What you see |
|---|---|
| **Sealed** | The currency name |
| **Revealed** | The amount, counting up from zero, and a round tick |
| **Saved** | A shockwave, five diamonds flying outward, an accent flash and a big tick |
| **Waiting** | A padlock, a big `17:58` countdown, and a glowing head riding the draining edge |
| **Verdict** | A tick and a cross, side by side |
| **Done** | A crown in the track's colour, with a full burst once every step is saved |

The burst runs for about 1.8 s before the gem settles into the countdown. Not a word of explanation on any of these
faces: a countdown under a padlock, or a tick beside a cross on a gem that has just finished counting down, each say
what they are on their own. `BACK` zooms out to the menu.

**The lock has to be survived, and then owned up to.** When the timer expires the gem flashes, bounces on an elastic
spring and asks: **tick** if you held out, **cross** if you did not. Nothing else moves until it is answered — the
answer is written down the moment a step is banked, so closing the tab is not a way around the question. On the menu
a track waiting to be judged looks exactly like a ready one; which of the two it is, is its own screen's to say.

**The clock reaching zero is announced, not just noted.** On the menu that currency's main gem **shivers five times
and goes still** — five flicks, each a little smaller than the last — and only when it settles does the gem light up
and let you in. The shiver belongs to the main stone alone: the bloom behind it stays where it is, and the bonus
stone keeps its own clock and announces nothing. A lock that expired while the tab was closed is not news, so opening
onto one is quiet.

**Tick — held out.** The whole window dims and one word is struck across it: `UNLOCKED`, flown in oversized and
spread apart, snapping home in the tier's colour with a diamond shockwave and a shower of sparks. Crossing into a new
tier gets twice the sparks and a longer hold. The word is all there is — no amount, no currency, no step number.

**Cross — did not hold out.** The step is taken straight back off the ladder: the shockwave falls inward instead of
outward, the gem sags on its spring, and the amount leaves the history with it. The track returns to the milestone
below and accumulates that one again.

The rim traces the diamond twice: dimly for progress through the plan, brightly for the lock draining away — both
drawn by dashing an exact fraction of the perimeter, so the head sits precisely where the time says it should.
Progress is only ever shown as geometry; no numbers escape except the one amount you are working on.

Tapping a revealed gem flips it shut again without ticking it.

The two tracks are fully independent. Save VND today and leave USD alone; each has its own schedule and its own lock.

## Milestones and colour

Each ladder is a list of exact milestones, transcribed from the source spreadsheet, and is split into three colour
bands. A track wears the colour of the band its current step falls in — rim, amount, tick, burst and its card on the
menu all move together, so crossing into a new band is a visible promotion rather than a number you have to look up.

| | 🔴 Red | 🟡 Amber | 🟢 Green |
|---|---|---|---|
| **VND** — 206 steps | 1–21 · `17,900 ₫` → `292,960 ₫` | 22–31 · `150,000 ₫` → `527,680 ₫` | 32–206 · peaks at `8,070,950 ₫` |
| **USD** — 206 steps | 1–54 · `$0.20` → `$31.25` | 55–75 · `$15.00` → `$100.91` | 76–206 · peaks at `$407.01` |

The sheet keeps column A in thousands, so the VND figures are stored ×1000 and the app shows plain đồng.

Each column is really a stack of runs — twelve in VND at ×1.15, nine in USD at ×1.10 — each starting over at a round
number. The first two get a colour of their own; every run from the third on is green, so the top of the ladder reads
as one long climb rather than a dozen separate ones. VND totals `372,680,940 ₫` and USD totals `$20,037.40` across
all 206 steps.

The VND amber band is deliberately the short one: its run stops after ten steps at `527,680 ₫`, and green then opens
by dropping all the way back to `19,000 ₫` and taking thirty-six steps to climb out of it — the longest run in the
sheet, and the gentlest.

Two rough edges in the sheet are worth knowing about, and the app carries both rather than tidying either away.
Column B's last run is cut short at seventeen steps, so the USD ladder ends mid-climb on `$229.75` rather than at the
top of a run. And one pair of column A is transposed — `4,614.59` typed above `4,012.69` at rows 201/202 — so step 202
asks for less than step 201: the one place in either ladder where the next amount is smaller than the last. The sheet
is the authority, so it is taken as written; say the word and the pair goes back the other way.

## The bonus stones

Columns C and D of the sheet are a second ladder each, both at ×1.20 — one behind VND, one behind USD.

| | Steps | From → to | All steps come to |
|---|---|---|---|
| **Column C** — VND | 100, in 6 runs | `17,900 ₫` → peaks at `1,925,880 ₫` | `62,474,870 ₫` |
| **Column D** — USD | 104, in 7 runs | `$0.05` → peaks at `$74.90` | `$1,916.85` |

Neither sits anywhere on screen waiting to be used. **It shows up, or it does not** — an ice-blue stone appears
beside that currency's gem on the menu and out past the rim on the coin's own screen. Tap it and that column opens.

Behind each is a hidden clock, and a hidden allowance. Taking a bonus step puts that stone away for **45 minutes**, and
a stone may only be taken **twice in a day**; the second take of the day sends it away until tomorrow rather than
until the hour is up. Each currency keeps its own tally, so VND having had its two goes says nothing about USD.

Neither the clock nor the tally is drawn anywhere: no countdown, no padlock, no dimmed socket where the stone would
be, and no count of what is left today. An empty socket would give the game away just as surely as a clock would, and
a counter would give away the one thing the hour cannot — whether it is worth waiting at all.

Both wear the same ice-blue, and they wear it precisely because red, amber and green all mean *this is how far you
have come* — a bonus means nothing of the sort. Three more things follow from a bonus not being a normal step:

- **No lock and no verdict.** Ticking one does not start that track's wait and does not ask whether you held out —
  asking would announce that the hidden clock had just run out.
- **It comes through the lock.** A stone can turn up while its track is mid-countdown. The clocks are unrelated.
- **Its own numbering, the same books.** Each bonus counts independently of the main 206, but the money is real, so
  it lands in the history and in that currency's total, labelled `bonus` rather than `step`. `Undo last step` walks
  past bonus rows — they belong to a different ladder.

Once a bonus ladder is finished its stone simply never returns. No announcement.

## The journey comes round again

There is no dead end at the top. Once **all four ladders are finished** — VND and USD, main and bonus, with no
verdict still owed — the app holds the finished screens for about three seconds, so the crown and its burst land as
an ending, then strikes one word across the window: `AGAIN`. Every track goes back to its first milestone, both locks
and both hidden bonus clocks are cleared, and the climb starts over from `17,900 ₫` and `$0.20`.

**The books are not touched.** History and the totals survive the wrap — the steps were saved and the money is real,
so a second pass adds to the first rather than replacing it. Only the milestones start over. `Ctrl+R` is still the
one thing that wipes the history itself.

The tables live in `js/plans.js`. Edit them there and bump `VERSION`; the next load adopts the new ladder, keeps each
track's lock setting and clamps progress to the new length.

## Options

Nothing shows on screen at all — the menu is two cards and nothing else. Everything is reachable without cluttering
it: **right-click a card** for that track's options, **Ctrl+H** for the books, **Ctrl+R** to start over.

**Standing on step** — where the track is on its ladder: the step it is about to ask you for. Under the box it says
what that step costs and how many are banked behind it, because "step 5" on its own cannot tell you whether five have
been saved or four have. Moving a track by hand clears whatever it was waiting on — the lock and the question both
belonged to a step that is no longer in front of you — and leaves the history alone, since the money in it was really
saved.

**Lock after ticking a step** — minutes to wait before the next amount unlocks. VND starts at `18` and USD at `25`,
deliberately different so the two ladders never fall into step and hand you both questions at once. Presets for
1 hour / 1 day / 1 week, and `0` disables the lock. Setting it to `0` also removes the verdict: with no wait to
survive there is nothing to be asked about.

**Schedule by multiplier** — first amount · multiplier per step · total steps · rounding. Step *n* =
`first × multiplier^(n-1)`, rounded. This is only a fallback: both tracks ship with an explicit milestone list, and a
list always wins over the formula.

**Or paste your own list** — one number per line, which overrides the formula entirely. Number input is lenient:
`50,000`, `50.000`, `1234567` and `0.30` all parse the way you would expect.

> Rewriting the list drops the colour bands with it — they describe the milestones they were written for, so a
> hand-edited ladder falls back to one colour per currency. Leave the box alone and the bands stay.

> If your spreadsheet is denominated in **thousands** (`57.50` meaning 57,500 ₫), multiply by 1000 before pasting.

The preview under the box shows the first three amounts of the resulting schedule, live, so you can check the paste
landed correctly.

**Ticked by mistake?** — the same panel has `Undo last step`, which rolls that track back one step and clears its
lock. It lives here rather than on the coin so a stray click cannot undo your progress.

## History

**Ctrl+H** reveals every saved step **and the running totals**, so the app asks for confirmation before opening it —
that number is the thing you are trying not to think about. Export to CSV from there if you want it in Excel.

**Ctrl+R** returns both tracks to step 1, clears the locks and wipes history. It asks first. The same thing sits at
the far left of either track's options, for when a keyboard shortcut is not to hand — a reset should take deliberate
effort to reach, not be impossible to find.

## Data

Everything lives in your browser's `localStorage`, under `savings.data`. Two tabs of the same browser stay in step:
whichever one writes, the other adopts it. To move a set of books to another browser by hand, copy that entry across:

```js
copy(localStorage.getItem('savings.data'))            // in the console of the browser that has them
localStorage.setItem('savings.data', '<paste>')       // in the console of the one that wants them
```

To have every device stay in step on its own instead, see **Syncing** below.

## Syncing

Leave `js/config.js` empty and that is the whole story: one browser, one set of books, nothing leaving the machine.
Fill it in and every device signed into the same account shares one ladder — tick a step on Windows and the phone has
moved on to the next amount before you have put it down.

**1. Make the table.** In the Supabase SQL editor:

```sql
create table savings_state (
  user_id    uuid primary key references auth.users on delete cascade,
  doc        jsonb not null,
  rev        bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table savings_state enable row level security;

-- Each account reaches its own row and no other. Without this, the anon key in the page would be
-- enough for anyone to read your books.
create policy "own row" on savings_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- So a change on one device reaches the others rather than waiting to be asked for.
alter publication supabase_realtime add table savings_state;
```

**2. Point the app at it.** In `js/config.js`, paste the project URL and the anon key from **Project Settings → API**.
The anon key belongs in the page — it is not a password. The policy above is what keeps the books private.

**3. Sign in.** `Ctrl+L` on any device. Create the account once; sign into it everywhere else. The device that
creates it carries its ladders up; the rest adopt what is already there.

**How two devices are reconciled.** Every write carries a revision one higher than the one it was made from. A
document arriving with a higher revision wins outright. Two devices that wrote from the same revision are compared on
how many steps their history knows about — a banked step is a fact, and the device that has seen more of them is
ahead — and on the clock only to break a tie. A device that was offline pushes as soon as it is back.

## Layout

```
index.html               the room, and nothing else
manifest.webmanifest     what makes it installable
icon.svg                 the split stone
css/app.css              every colour, every idle
js/config.js             where the books are kept, if anywhere but this browser
js/sync.js               one set of books across every machine
js/plans.js              the four ladders, and how to read one
js/state.js              what is remembered, and the one place it is written
js/gem.js                the diamond: geometry, cuts and colour
js/fx.js                 movement, bursts, and the words struck across the window
js/menu.js               two cards
js/focus.js              one currency's own screen, and its six faces
js/panels.js             options, the books, and the questions asked first
js/app.js                the rules, and the clock that drives them
```
