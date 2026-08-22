# Working in this folder

## Nothing is live until it is pushed

There is no build step and no CI. GitHub Pages serves the `main` branch of
`origin` exactly as it stands, so **the working tree on this machine is not the
site**. A change that is only edited, or only committed, has changed nothing the
user can see.

Any task that touches what the app does is therefore not finished until:

```
git add -A && git commit && git push origin main
git rev-list --left-right --count origin/main...HEAD   # must print: 0  0
```

Before reporting a change as done, check that number, and check the pushed file
rather than the local one:

```
git show origin/main:js/plans.js | grep 'VERSION = '
```

This has already gone wrong once: three turns of "reset is installed and
tested" while `origin/main` still served the old ladder. Tests passing on the
working tree prove nothing about the site.

Then tell the user to **hard-reload** (`Ctrl+Shift+R`). Pages takes a minute or
two to rebuild, and the browser holds the old `js/*.js` in cache; a normal
reload can still serve it.

## Re-cutting the ladders from the sheet

`DataSavingFinal.csv` is the source of truth. When the user says they have
updated it, do this whole chain without being asked for each step:

1. **Regenerate the four tables in `js/plans.js`** from the CSV. Four columns,
   no header: A = VND main, B = USD main, C = VND bonus, D = USD bonus. A blank
   trailing cell means that column is shorter than the file, not that the value
   is zero. VND is kept in thousands (`25,00` = 25.000 ₫) and stored ×1000;
   comma is the decimal separator. Parse in hundredths as integers — floats lose
   the last digit on figures like `1028,62`.
2. **Verify before claiming anything.** Import the rewritten `plans.js` and
   compare every value against the CSV. Never eyeball it.
3. **Bump `VERSION`** in `js/plans.js`, and `VND_REPEG.version` with it. Bump
   past any number already committed *or already sitting in the working tree* —
   a version a saved document may already carry is a version that fires nothing.
4. **Update the figures in `README.md`**: the red/amber/green table, the run
   count and ratio per column, the totals, and the opening milestones. Run
   boundaries are read off the data (a value lower than the one before it), and
   `bandEnds()` finds the colours on its own — do not hand-write band edges.
5. **Commit and push**, per the section above.

## The two constants that move a track without it being climbed

Both live in `js/state.js`, next to the code that reads them, and both are
deliberately unreachable from the app.

- `JOURNEY_RESET_AT` — sends every ladder back to its first milestone. Move it
  only when a reset has actually been asked for. Re-cutting the sheet is not by
  itself a reason to reset; ask.
- `BOOKS_WIPE_AT` — empties the history, the totals and the journey count. This
  is the one irreversible thing in the app. Move it **only** on an explicit
  instruction to wipe the books, confirm before doing it, and **leave it behind
  when `JOURNEY_RESET_AT` next moves**. A journey reset means *this climb is
  over*; a wipe means *there was no climb*. Folding them into one number is the
  single mistake the books cannot come back from.

Both fire once per set of books — `migrate()` stamps the version on the way out
— and both run inside `normalise()`, so a document arriving over sync from a
stale device is put through them before it is weighed against anything.

## House style

Comments and commit messages here read as prose, not as changelogs: plain
English sentences explaining *why*, in the voice of the surrounding code. Match
it. The README is the long-form version of the same thing and is expected to
stay true — if a change makes a sentence in it wrong, fix the sentence in the
same commit.
