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

1. **Regenerate the three tables in `js/plans.js`** from the CSV. Four columns,
   no header, of which **A, B and D are read**: A = VND, B = USD, D = the box.
   Column C is not read by anything and has no ladder — leave it in the file and
   skip it. A blank trailing cell means that column is shorter than the file, not
   that the value is zero: A and B run to 209, D to 190. VND is kept in thousands
   (`25,00` = 25.000 ₫) and stored ×1000; B and D are plain dollars. Comma is the
   decimal separator. Parse in hundredths as integers — floats lose the last
   digit on figures like `1028,62`.
2. **Verify before claiming anything.** Import the rewritten `plans.js` and
   compare every value against the CSV. Never eyeball it.
3. **Bump `VERSION`** in `js/plans.js`, past any number already committed *or
   already sitting in the working tree* — a version a saved document may already
   carry is a version that fires nothing. `VND_REPEG.version` moves only when
   `JOURNEY_RESET_AT` does, and to the same number: it exists so that an old
   `state.js` in a browser cache does a *subset* of the reset, and bumped past
   the reset it would instead send books that have already been through one back
   to step 1 a second time.
4. **Update the figures in `README.md`**: both red/amber/green tables, the run
   count and ratio per column, the totals, and the opening milestones. Never
   hand-write a band edge. Two functions in `plans.js` work them out, and which
   one a column needs depends on the column:
   - `bandEnds()` for A and B, where a band ends at a step **lower than the one
     before it** — the round number a run starts over at.
   - `decadeEnds()` for D, which never goes down at all. Its bands end where the
     column first **crosses a bar**: the first step to ask for a dollar, then the
     first to ask for ten. A column with no boundary in it at all would otherwise
     wear one colour for its whole length and never be promoted once.

   If a re-cut gives column D a step that goes down, say so — it should probably
   move to `bandEnds()` like the other two, and that is the user's call.
5. **Commit and push**, per the section above.

## The three constants that move something without it being climbed

All three live in `js/state.js`, next to the code that reads them, and all are
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
- `USD_WAIT_RECUT_AT` — moves a stored USD wait down to the new floor, and the
  only place in the app where a wait ever gets shorter. `migrate()` otherwise
  only ever lengthens one, so lowering `USD_LOCK` in `plans.js` on its own
  reaches a browser that has never opened the app and nobody else. It moves
  **exactly** the old floor to the new one: a wait somebody lengthened on
  purpose is theirs. Change it only when the designed wait itself changes, and
  keep `OLD_USD_LOCK` next to it pointing at the figure being retired.

All three fire once per set of books — `migrate()` stamps the version on the
way out — and all three run inside `normalise()`, so a document arriving over
sync from a stale device is put through them before it is weighed against
anything.

## House style

Comments and commit messages here read as prose, not as changelogs: plain
English sentences explaining *why*, in the voice of the surrounding code. Match
it. The README is the long-form version of the same thing and is expected to
stay true — if a change makes a sentence in it wrong, fix the sentence in the
same commit.
