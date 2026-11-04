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

Each phase: name + roll number + code → a prediction (ungraded) → trials → scored quiz with
feedback → **personal results page** with charts → data saved → "look up at the slides".
Name and roll number are remembered on the device between phases.

## Put it online (GitHub Pages, ~10 minutes)

1. Create a new public repository, e.g. `psyc343-depthlab`.
2. Upload **the contents of this folder** (`index.html`, `gallery.html`, `css/`, `js/`, `lib/`, …) to the repository root.
3. Settings → Pages → *Deploy from a branch* → `main` / root → Save.
4. After a minute the lab is at `https://<your-username>.github.io/psyc343-depthlab/`.
   Put that address in `\labURL` in the slides' preamble and recompile (it also makes the QR codes).

All libraries are in `lib/` (jsPsych 8.2.1 and plugins), so nothing loads from a CDN during class.

## Where the data go

Edit `js/config.js`:

- **`datapipe_id`** (recommended). Go to <https://pipe.jspsych.org>, sign in with an OSF account,
  link a **private** OSF project, create an experiment, switch *data collection* on, and paste the
  12-character ID. Every finished phase writes one CSV per student to OSF, named
  `S09_P<phase>_<roll>_<name>_<timestamp>.csv`.
- **`sheets_url`** (optional, live view). Make a Google Sheet → Extensions → Apps Script → paste
  `apps-script/Code.gs` → Deploy as web app (execute as *me*, access *anyone*) → paste the `/exec` URL.
  Each finished phase adds one summary row (quiz score + key results) to a tab per phase, so you can
  show class results live after each phase.
- Students can always click **Download my data (CSV)** on the results page. If neither option above is
  set, that is the only copy: ask them to upload the file to Canvas.

## Before class

- Open `index.html?debug=1`: the login page then lists the codes. Run each phase once and check a file
  appears on OSF / a row in the Sheet.
- `gallery.html` shows every stimulus (animated ones loop). Use it on the projector if a student's
  device fails.
- Red–cyan glasses, **red over the left eye**. Phase 2 checks orientation and leakage first.
- Ask students to bring two pens (one with a cap). Night mode / blue-light filters off.

## After class

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
`prediction` (qid, chosen) · `quiz` (qid, answer, response, correct).

## Privacy

Files contain names and roll numbers. Keep the OSF project private and share only figures.
Classroom data used for teaching do not need ethics review; using them for research does (IRB).
The demos are not eye tests; the slides say so too.
