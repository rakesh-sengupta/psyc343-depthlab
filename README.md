# Depth Lab — PSYC343 *Vision: Ways of Seeing*, Session 9

A four-phase, in-class experiment-quiz on depth perception, built with jsPsych 8.
Students take part in short classic experiments, see their own results, and answer
quiz questions with feedback. The Session 9 slides act as the guide: each phase
opens with an **unlock code** on a slide.

| Phase | Code | Topic | What students do |
|---|---|---|---|
| 1 | `HORIZON` | Pictorial cues | which-is-nearer (size, height, occlusion, two cue conflicts); bump or dent (shading, 8 light directions); ball in a box (cast shadows) |
| 2 | `JULESZ` | Two eyes | pen test (both eyes vs one eye); eye dominance; red–cyan random-dot stereograms (shape + in front / behind), with a free-fusion option |
| 3 | `PARALLAX` | Motion | shapes defined only by motion; accretion/deletion (object or hole); rotating dot drum with and without a depth cue |
| 4 | `PONZO` | Size and distance | match ball sizes in a corridor vs blank background; final 5-question quiz |

Each phase: name + roll number + code → a prediction (ungraded) → trials → **graded quiz** with
immediate feedback → **personal results page** with charts and the student's score so far → data saved →
"look up at the slides". Name and roll number are remembered on the device between phases.

## Automatic grading

The class and the quiz run together. 15 graded questions (Phase 1: 4, Phase 2: 3, Phase 3: 3, Phase 4: 5),
one mark each, scaled to 10 marks. Only quiz questions are graded; predictions and experiment answers never are.
Answer options are shuffled per student. Only the first attempt at each phase counts.

- **During class**: each answer is marked at once with an explanation; each results page shows the
  student's provisional total (phases done on that device).
- **Official grade**: computed automatically in the Google Sheet (`apps-script/Code.gs`, tab `Grades`,
  rebuilt after every finished phase). Students look it up at **`grade.html`** with roll number + name.
- **Release time**: Sheet tab `Settings` → `release_from` (blank = immediately; or e.g. `2026-11-06 18:00`).
  Also there: `out_of`, optional letter `bands` (e.g. `90:A,80:A-,70:B,60:C,50:D,0:F`) and `override`
  for manual corrections (e.g. `KREA1003=+1`). Keep `grading` in `js/config.js` consistent with it.
- The analysis script computes the same gradebook from the full trial data as an independent check.
- The grade page answers only when roll number and name match. That keeps casual look-ups out but is not
  strong security; Canvas remains the record of grades.

## Put it online (GitHub Pages, ~10 minutes)

1. Create a new public repository, e.g. `psyc343-depthlab`.
2. Upload **the contents of this folder** (`index.html`, `gallery.html`, `css/`, `js/`, `lib/`, …) to the repository root.
3. Settings → Pages → *Deploy from a branch* → `main` / root → Save.
4. After a minute the lab is at `https://<your-username>.github.io/psyc343-depthlab/`.
   Put that address in `\labURL` in the slides' preamble and recompile (it also makes the QR codes).

All libraries are in `lib/` (jsPsych 8.2.1 and plugins), so nothing loads from a CDN during class. The only outside service is your own Apps Script.

## Where the data go: one Google Apps Script

Everything goes to **one Google Sheet with an Apps Script web app** (`apps-script/Code.gs`), owned by you:

1. Make a Google Sheet (e.g. *PSYC343 S09 Depth Lab*) → Extensions → Apps Script → paste `apps-script/Code.gs` → Save.
2. Run the function **`setup`** once and accept the permissions (Sheets + Drive). It creates the `Settings`
   and `Grades` tabs and a Drive folder **PSYC343 S09 Depth Lab data** (its link is written into `Settings`).
3. Deploy → New deployment → *Web app* → Execute as **Me**, access **Anyone** → copy the URL ending in `/exec`
   into `js/config.js` (`sheets_url`). After any later code change: Manage deployments → edit → *New version*.

Each time a student finishes a phase, one request delivers:

| What | Where |
|---|---|
| full trial-by-trial CSV (`S09_P<phase>_<roll>_<name>_<timestamp>.csv`) | the Drive data folder |
| one summary row (results, quiz marks, link to the CSV) | tab `Phase 1` … `Phase 4` (live class results) |
| the quiz marks | tab `Grades`, rebuilt automatically (see *Automatic grading*) |

The script replies, so the student's results page says **"saved to the class records"** only when the save is
confirmed. If the network fails, the lab keeps the submission on the device and **re-sends it automatically**
the next time the lab or the grade page is opened; each submission has an id, so a re-sent copy is never stored
twice. Students can also always **download their own CSV** from the results page (keep it as a receipt).

## Before class

- Open `index.html?debug=1`: the login page then lists the codes. Run each phase once and check that a row
  appears in the Sheet, a CSV in the Drive folder, and your line in `Grades`. Then delete your test rows,
  files and line (or use a roll number like `TEST`).
- `gallery.html` shows every stimulus (animated ones loop). Use it on the projector if a student's
  device fails.
- Red–cyan glasses, **red over the left eye**. Phase 2 checks orientation and leakage first.
- Ask students to bring two pens (one with a cap). Night mode / blue-light filters off.

## After class

Download the Drive data folder (right-click → Download gives a zip; unzip it), then

```
python3 ../analysis/class_summary.py <folder-with-the-CSV-files>
```

writes `slides/img/class-*.png` (recompile the slides: the schematic graphs become the class's data)
and `depthlab_gradebook.csv` (quiz score per phase per roll number). If a student did a phase twice,
the first (in-class) attempt is used.

## Data columns (main ones)

`name, roll, phase, task, rt, response` on every row, plus by task:
`nearer` (cond, cue_near, alt_near, chose, follows_cue) · `shading` (light_deg, bump) ·
`shadow` (cond, back) · `pens` (both, one) · `dominance` (eye) · `glasses_check` (saw) ·
`rds` (shape, disparity_sign, mode, reported, correct_shape, saw_shape) · `rds_depth` (said, correct) ·
`motion_shape` (shape, still, reported, correct_shape) · `accretion` (cond, said, correct) ·
`kde` (omega, cue, said, follows_cue) · `size_match` (context, ref, start, setting) ·
`prediction` (qid, chosen) · `quiz` (qid, answer = index of the correct option as written, option_order = order shown, chosen_index, correct).

## Privacy

Files contain names and roll numbers. Keep the Sheet and the Drive folder private (do not share their links) and share only figures.
Classroom data used for teaching do not need ethics review; using them for research does (IRB).
The demos are not eye tests; the slides say so too.
