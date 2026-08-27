# Savings

A web app for running two savings ladders side by side — **VND** and **USD** — while keeping the numbers out of sight.

The screen shows you the amount due right now and a tick to confirm you saved it — no totals, and no schedule. The
menu shows how many steps you have cleared, and nothing about what they cost. Tick it and the gem locks — 18 minutes
for VND, 24 for USD — before the next amount exists, and when that lock runs out the gem asks whether you actually
held out. Say no and the step comes back off the ladder. Sit a USD wait out and a gold box rises between the two
cards with something in it; there is no box the rest of the time, and no gap where one would go.

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
| **Click the box** | Into what a survived wait paid out — when there is one |
| **Escape** or **BACK** | Out to the menu |
| **Right-click a card** | That track's options |
| **Ctrl/⌘ + H** | History and totals |
| **Ctrl/⌘ + L** | Sign in, so every device shares one set of books |

Installed as a PWA it gets its own window and its own icon, with no address bar — on a desktop and on a phone alike.
A tab, though, can be buried under another tab: if the amount due is meant to stay in front of you, install it rather
than bookmarking it.

## Flow

Everything is built on a diamond — a gem for each currency, and the app icon is one brilliant-cut stone split down
the middle, gold for VND and mint for USD. Every rim is drawn in a white gradient, brightest at the top vertex and
picking a sheen back up at the bottom, so a gem reads as cut glass rather than an outline.

**Main menu** — the screen is split into two cards, VND on the left and USD on the right, with the box between them
when there is one to be had, and nothing else: no logo, no title, no numbers. Each card is a lit panel with a light travelling its border in the track's tier colour, and
holds the gem with its step count and the currency name. There is no button: **the gem is the button**. Open, it
wears its full tier colour, twinkles, and takes a band of light across its face every few seconds — click anywhere on
the card to go in. Locked, the same stone is mixed towards a cold blue until the light has gone out of it, the bloom
behind it fades to nothing, the sparks and the glint stop, the pointer goes back to an arrow and the countdown is cut
into the middle of the face in a pale tint of the track's own colour. A closed card cannot be opened at all — only
right-click, which reaches this track's settings whether it is locked or not.

**The count is cut into the stone.** Each gem carries the number of steps that track has cleared, in dark ink on the
face — 41 means forty-one banked and the forty-second on offer. Amounts remain off this screen entirely: the number
says how far, never how much.

**The card winds up as a promotion comes into range.** Over the last five steps of a colour band the bloom behind the
gem brightens and swells, its beat quickens from two and a half seconds to under one, and the light travelling the
card's border speeds up to match — all of it scaling with how close you are, and hitting full tilt on the step whose
tick actually changes the colour. The last band counts down to the end of the ladder the same way.

**Pick one** — the menu rushes past the camera while that currency's screen zooms in behind it, tilting the last few
degrees into place, with the amount already counting up on its face.

| Stage | What you see |
|---|---|
| **Revealed** | The amount, counting up from zero, and a round tick |
| **Saved** | A shockwave, five diamonds flying outward, an accent flash and a big tick |
| **Waiting** | A padlock, a big `17:58` countdown, and a glowing head riding the draining edge |
| **Verdict** | A tick and a cross, side by side |
| **Done** | A crown in the track's colour, with a full burst once every step is saved |

The box's own screen has two faces and neither is on that list: **closed** — the box, three question marks and a tick,
no figure at all — and **opened**, where the lid comes off and the amount counts up under it.

The burst runs for about 1.8 s before the gem settles into the countdown. Not a word of explanation on any of these
faces: a countdown under a padlock, or a tick beside a cross on a gem that has just finished counting down, each say
what they are on their own. `BACK` zooms out to the menu.

**The lock has to be survived, and then owned up to.** When the timer expires the gem flashes, bounces on an elastic
spring and asks: **tick** if you held out, **cross** if you did not. Nothing else moves until it is answered — the
answer is written down the moment a step is banked, so closing the tab is not a way around the question. On the menu
a track waiting to be judged looks exactly like a ready one; which of the two it is, is its own screen's to say.

**The clock reaching zero is announced, not just noted.** On the menu that currency's gem **shivers five times and
goes still** — five flicks, each a little smaller than the last — and only when it settles does the gem light up and
let you in. The bloom behind it stays where it is. A lock that expired while the tab was closed is not news, so
opening onto one is quiet.

**Tick — held out.** The whole window dims and one word is struck across it: `UNLOCKED`, flown in oversized and
spread apart, snapping home in the tier's colour with a diamond shockwave and a shower of sparks. Crossing into a new
tier gets twice the sparks and a longer hold. The word is all there is — no amount, no currency, no step number.

**Cross — did not hold out.** The step is taken straight back off the ladder: the shockwave falls inward instead of
outward, the gem sags on its spring, and the amount leaves the history with it. The track returns to the milestone
below and accumulates that one again.

The rim traces the diamond twice: dimly for progress through the plan, brightly for the lock draining away — both
drawn by dashing an exact fraction of the perimeter, so the head sits precisely where the time says it should.
Progress is only ever shown as geometry; no numbers escape except the one amount you are working on.

The two tracks are fully independent. Save VND today and leave USD alone; each has its own schedule and its own lock.

## Milestones and colour

Each ladder is a list of exact milestones, transcribed from the source spreadsheet, and is split into three colour
bands. A track wears the colour of the band its current step falls in — rim, amount, tick, burst and its card on the
menu all move together, so crossing into a new band is a visible promotion rather than a number you have to look up.

| | 🔴 Red | 🟡 Amber | 🟢 Green |
|---|---|---|---|
| **VND** — 185 steps | 1–35 · `20,000 ₫` → `510,950 ₫` | 36–59 · `400,000 ₫` → `3,581,720 ₫` | 60–185 · peaks at `7,400,250 ₫` |
| **USD** — 185 steps | 1–71 · `$0.30` → `$62.99` | 72–88 · `$30.00` → `$102.78` | 89–185 · peaks at `$319.68` |

The sheet keeps column A in thousands, so the VND figures are stored ×1000 and the app shows plain đồng.

Each column is really a stack of runs — seven in VND at ×1.10, seven in USD at ×1.08 — each starting over at a round
number. The first two get a colour of their own; every run from the third on is green, so the top of the ladder reads
as one long climb rather than a dozen separate ones. The bands are read off the ladder rather than written down: the
first two runs end where they end, and everything past them is green. VND totals `354,199,980 ₫` and USD totals
`$15,533.49` across all 185 steps.

The two coloured bands sit early in column A: red is thirty-five steps from `20,000 ₫` to `510,950 ₫` — the longest
run in the column — and amber twenty-four from `400,000 ₫` to `3,581,720 ₫`. Between them they take up thirty-two
per cent of the ladder, so a VND climb turns green inside its first third and stays there. Column B is weighted the
other way: its red run alone is seventy-one steps, the longest run in the sheet, and amber past it only seventeen —
forty-eight per cent of the column before it goes green.

Column A finishes on its own highest figure, `7,400,250 ₫`, rather than being cut off part-way through a climb — its
last three runs all reach it. Column B does not: its highest step is `$319.68` at 172, and the last run restarts at
`$100.00` and reaches only `$251.82` by 185 — thirteen steps where the runs around it have nineteen and twenty-two,
so it stops short of the peak behind it.
Inside a run every step asks for more than the one before it; the only figure that ever goes down is the first of a
new run, which is what marks the boundary. Column B does that plainly at step 72, dropping from `$62.99` back to
`$30.00`.

**One run the bands cannot see.** Column B also starts over at step 68 — `$48.20` is followed by a round `$50.00` —
but it starts over *upward*, and `bandEnds()` only knows a boundary by a step that goes down. The app therefore reads
steps 1–71 as one red run rather than ending red at 67. Nothing is mis-transcribed; the ladder asks for exactly what
the sheet says at every step. It is only where the colour changes that differs from how the sheet looks to a reader.
If red is meant to end at 67, the sheet has to say so the way every other boundary does — by going down.

### Column C is not read

The sheet carries one more column the app has no ladder for. Until VERSION 20 columns C and D were a bonus each,
drawn as an ice-blue stone that turned up beside a gem on a clock nobody could see; the stone is gone, column D has
come back as the box below, and **nothing reads column C at all.** The keys the bonuses were kept under are dropped
from every document that comes through `migrate()` rather than being handed back to the disk and pushed on to the
other devices.

**What was banked off them stays banked.** Those steps were real money, so their rows stay in the history and in that
currency's total, still labelled `bonus` in the `Kind` column — the books are a record of what happened, not a view
of the app as it stands today. A cross answered on a track walks past those rows, and the totals under **Ctrl+H**
still count them.

Leaving column C in the sheet costs nothing: the generator reads A, B and D, and never looks at C.

## The box

Column D is a third ladder — 185 steps of dollars at a flat ×1.05, from thirty cents to well over two thousand — and
it is the one thing in the app you cannot go and get. **It is not on the menu until a USD wait has been sat out.**

| | Steps | From → to | All steps come to |
|---|---|---|---|
| **Column D** — the box | 185, one single run | `$0.30` → `$2,376.58` | `$49,902.14` |

**Its runs are its decades.** Every other column in the sheet says where its bands end by having a step go *down* —
that is the only thing `bandEnds()` knows how to read. Column D never goes down once in 185 steps, so read that way
it would wear one colour the whole climb and never once be promoted. What it does instead is cross a bar: the step
that first asks for a dollar ends the first band, the step that first asks for ten ends the second, and everything
above that is green. `decadeEnds()` works that out from the figures for the same reason `bandEnds()` does — so that
re-cutting the sheet moves the colours without anybody having to remember to.

| | 🔴 Red | 🟡 Amber | 🟢 Green |
|---|---|---|---|
| **Box** — 185 steps | 1–25 · `$0.30` → `$0.97` | 26–72 · `$1.02` → `$9.58` | 73–185 · `$10.06` → `$2,376.58` |

**A gold box, drawn the way the gems are.** One 2:1 isometric cube, three faces, light fixed at upper left: the same
rule the diamond is cut by, in the one other shape that rule makes sense in. Laid over it is a heavy gold bevelled
frame, a panel sunk into each face, and a question mark painted across all three. The frame is gold whatever the state
of the ladder, because a box is treasure; the **panels** take the band colour, so colour goes on meaning the one thing
it means in this app — how far you have come. On the menu the step count is stamped on the lid; on the box's own screen
the lid goes back to its question mark.

It does not sit still the way a stone does. It bobs, a gleam crosses the gold every few seconds, stars twinkle around
it out of step with each other, and a warm haze behind it breathes. Arriving, it springs in past its size with a ring
of gold and a dozen stars.

**A closed box does not say what is in it.** Every other screen in the app shows the amount due the moment you open it;
this one shows a box with three question marks on it and a tick, and no figure anywhere. Press the tick and **the lid
comes off**, the stars come out of the opening, and the amount counts up underneath it — the reveal is the whole reason
those faces carry a mark instead of a number. It is the one screen where you commit before you know, which is fair
enough: you have already done the only thing it asks, which was to sit through the wait.

### What earns one

**A USD wait reaching zero**, and that is the whole rule. Not a hidden clock, not an allowance, not chance: the box is
what sitting through a wait pays out, so the only way to see one is to have sat through one.

- **One wait, one box.** The payout is stamped with the expiry of the lock that earned it, so a wait pays out once.
  Opening the app onto a lock that ran out yesterday cannot mint a second box, and neither can two tabs noticing the
  same zero. Answering the verdict clears the lock, so the next box waits for the next wait.
- **It is USD's**, because column D is dollars. A VND wait running out pays out nothing.
- **It outlives the verdict, unless the verdict goes against you.** The box arrives when the clock hits zero, before
  the gem asks whether you held out. Answer **tick** and it stays until you open it. Answer **cross** and it goes with
  the step: a wait you have just owned up to not surviving did not earn anything.
- **No lock and no verdict of its own.** Ticking a box starts no wait and asks no question — the wait it belonged to
  has already been sat through, and asking again would be asking the same question twice.
- **It goes once it is banked**, and the next one comes with the next wait. Nothing accumulates.
- **A box on a finished ladder is a box with nothing in it**: once all 185 steps are banked, no wait pays out again.
- **Its own numbering, the same books.** The box counts its own 185 steps, but the money is real, so it lands in the
  history and in the USD total, labelled `box` rather than `step`. A cross answered on a track walks past those rows.

### Where it stands

**Between the two cards** — and *only* when there is one. No gap is held open for it while it is away: an empty socket
announces that something is coming just as surely as a countdown would, so the row is two cards and nothing else.

When a box is earned, the two cards **part to let it in**. Where it stands is measured before and after it joins the
row, and each card is then run from where it was to where it now is over about half a second, so the movement reads as
the room opening up rather than as a layout that jumped. The cards close again behind it the same way. Each card has a
hover state of its own, so that glide deliberately leaves nothing behind on them — see `slideFrom()` in `js/fx.js`.

## The journey comes round again

There is no dead end at the top. Once **both tracks are finished** — VND and USD, with no verdict still owed — the app
holds the finished screens for about three seconds, so the crown and its burst land as an ending, then strikes one word
across the window: `AGAIN`. Both tracks go back to their first milestone, both locks are cleared, the box goes back to
step 1 with them, and the climb starts over from `20,000 ₫` and `$0.30`.

The box is not part of the condition. It only ever advances when a wait has been sat through, so waiting for its 185
steps before a wrap could hold the top of the ladder shut indefinitely — the two tracks are what finish a journey.

**The books are not touched.** History and the totals survive the wrap — the steps were saved and the money is real,
so a second pass adds to the first rather than replacing it. Only the milestones start over. Nothing inside the app
wipes the history at all any more — `Ctrl+R` went back to the browser, where it means reload. The books outlive the
wrap and they outlive a journey reset; the only thing that empties them is a line written into the source on purpose,
under [Emptying the books](#emptying-the-books).

The tables live in `js/plans.js`. Edit them there and bump `VERSION`; the next load adopts the new ladder, keeps each
track's lock setting and clamps progress to the new length. It currently reads `22`.

### Starting a new journey from the source

A version bump can carry a one-off **reset**, and it is the only thing in the app that can move a track without it
being climbed. `JOURNEY_RESET_AT` in `js/state.js` names a version; any document written before that version has
every ladder sent back to its first milestone — both tracks and the box — and every clock with them: the waits, the
verdicts they were owed, and any box standing on the menu waiting to be opened. All of it belonged to a climb that is
over. It currently reads `22` — the version carrying the 185-step sheet, because a fresh start on the new ladder was
asked for along with it.

It sat at `19` for three versions before that, and deliberately: dropping the bonus columns, taking a minute off the
USD wait and giving column D a box of its own are none of them reasons to send a climb back to step 1. **Re-cutting the
sheet is not by itself a reason either** — a new ladder and a new journey are two separate decisions, and this version
carries both only because both were asked for.

It fires **once per set of books, not once per load**: the version stamped on the way out of `migrate()` is what stops
it firing again, and a document already at that version is left where it stands. A fresh set of books is untouched by
it — it starts at step 1 anyway.

**The books are not touched**, the same way a wrap does not touch them: history and the totals survive, so the new pass
adds to the old one rather than replacing it. `journeys` is not touched either — it counts ladders *finished*, and a
reset is not a finish. Each track's lock setting survives as well; only where it stands is moved — unless a wipe has
been asked for by name, which is the next section and a different constant.

Two things to get right when writing one:

**Peg it to the version that carries it, and bump `VERSION` in the same breath.** A reset written against a version the
app has *already* been published under is a no-op: `migrate()` stamps the version on its way out, so a set of books
that had merely been opened is already at that number and reads as "reset done".

**Do not reach into `plans.js` for it.** The figure lives in `state.js`, next to the code that reads it. Two
generations of this folder can sit mixed in a browser's HTTP cache for as long as the cache lasts, and a module that
asks `plans.js` for a name it has not got yet takes the whole graph down — a white window, not a stale one. That is
what `VND_REPEG` is still doing in `plans.js`: nothing, except being findable by a `state.js` that a browser has
not let go of yet. It has to mirror `JOURNEY_RESET_AT` rather than `VERSION`, for the same reason: bumped past the
reset it would send a set of books that has already been through one back to step 1 a second time, from a cache
nobody can see into. Delete it once the caches have turned over.

The reset is deliberately not reachable from the app: it is a line in the source, applied by the code that reads a
save, not a button. Every document the app believes goes through that reader — including one arriving over sync. A
phone that had not been opened since the change used to be able to push its copy back over the new one and take the
reset with it; winning the revision count does not make a document right.

### Emptying the books

`BOOKS_WIPE_AT`, also in `js/state.js`, is the one figure that can take money already banked back off the history.
Any document written before the version it names has its history emptied, its totals with it, and `journeys` set back
to zero. It currently reads `18`, four versions behind `VERSION` now: version 18 emptied the books because that was asked for,
and nothing since has touched them — the re-cut at 19 sent both ladders back to step 1, 20 dropped the bonus columns,
21 added the box, and the re-cut at 22 sent every ladder back to step 1 again on a new 185-step sheet. Anything banked
since version 18 stays banked, and the totals under **Ctrl+H** still carry all of it.

**It is a separate constant on purpose, and it stays behind when `JOURNEY_RESET_AT` moves.** A journey reset
says *this climb is over*; a wipe says *there was no climb*. Only the first of those should be inherited by the next
re-cut of the sheet, and folding them into one number is the single mistake the books cannot come back from. If you
are re-cutting the ladder and nobody has asked for a wipe, move `JOURNEY_RESET_AT` and leave this one alone.

Like the reset, it fires once per set of books — the version stamped on the way out of `migrate()` stops it — and it
runs inside the same reader, so a device that has not been opened since cannot push the old history back in: its
document is emptied on arrival, before it is weighed against anything.

There is still no way to do this from inside the app, and no plan to add one.

## Options

Nothing shows on screen at all — the menu is two cards and nothing else. Everything is reachable without cluttering
it: **right-click a card** for that track's options, **Ctrl+H** for the books, **Ctrl+L** for the shared books. There
is no start-over key — `Ctrl+R` went back to the browser, where it means reload.

**Lock after ticking a step** — minutes to wait before the next amount unlocks, and the only thing in the app that
can be configured at all. VND starts at `18` and USD at `24`, deliberately different so the two ladders never fall
into step and hand you both questions at once.

> It can be made **longer, never shorter**, and there is no off. Those two numbers are the floor, enforced when a save
> is read as well as when the box is saved — a wait that can be turned down to nothing takes the verdict with it, and
> then there is nothing left to have survived.

**The one wait that came down.** USD was designed around 25 minutes and is now designed around 24. Because a stored
wait is only ever lengthened where it is read, lowering the floor in `plans.js` would have reached a new browser and
nobody else: a set of books already carrying `25` would have carried it for ever. `USD_WAIT_RECUT_AT` in
`js/state.js` is what actually moves it, and it moves **exactly** the old figure to the new one, once. A wait you
lengthened on purpose — an hour, a day, a week — is yours, and is left where you put it.

**The milestones are not editable.** Not the list, not a multiplier, not one figure of one step — they are generated
from the spreadsheet and rebuilt from it every time a save is read, so a file that disagrees with the sheet is
corrected rather than believed. To change a ladder, change `DataSavingFinal.csv` and regenerate.

**Nor is there an undo.** A step banked is banked and a wait started is waited. The one thing that can take a step
back off a ladder is answering **cross** when the gem asks whether you held out — which costs you that step, as it
should.

## History

**Ctrl+H** reveals every saved step **and the running totals**, so the app asks for confirmation before opening it —
that number is the thing you are trying not to think about. Export to CSV from there if you want it in Excel.

The `Kind` column says what a row was: a `step` off one of the two tracks, a `box` off column D, or a `bonus` off one
of the columns the app used to draw. All three were real money and all three keep the name they were saved under.

**There is no way to start over.** Nothing in the app sets a track to a step of your choosing, and nothing wipes the
books — not a button, not a shortcut. A ladder that can be sent back to step 1 on a whim is a ladder that never has to
be climbed, and a step that can be jumped to is a step nobody saved for. The only wipe the app performs is its own, at
the top of both tracks, after the crown and the burst.

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
js/plans.js              the three ladders, and how to read one
js/state.js              what is remembered, and the one place it is written
js/gem.js                the diamond and the box: geometry, cuts and colour
js/fx.js                 movement, bursts, and the words struck across the window
js/menu.js               two cards
js/focus.js              one currency's own screen and the box's, and their faces
js/panels.js             options, the books, and the questions asked first
js/app.js                the rules, and the clock that drives them
```
