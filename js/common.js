// =====================================================================
//  Depth Lab : shared helpers (login, canvas trials, quiz, charts, saving)
// =====================================================================
const CFG = window.DEPTHLAB_CONFIG;
const DL = {
  state: { name: "", roll: "", phase: null, saveStatus: [] },
  raf: null
};

// ---------------------------------------------------------------- utils
DL.shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
DL.repeat = (arr, n) => Array.from({ length: n }, () => arr.map(o => Object.assign({}, o))).flat();
DL.pct = (k, n) => (n ? Math.round(100 * k / n) : null);
DL.mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
DL.esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
DL.norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
DL.store = {
  get(k) { try { return localStorage.getItem("depthlab_" + k) || ""; } catch (e) { return ""; } },
  set(k, v) { try { localStorage.setItem("depthlab_" + k, v); } catch (e) { /* private mode */ } }
};
DL.phaseData = () => jsPsych.data.get().filter({ phase: DL.state.phase });
DL.task = (t) => DL.phaseData().filter({ task: t }).values();

// ------------------------------------------------------------- buttons
DL.btn = (cls) => (choice) => `<button class="jspsych-btn ${cls || ""}">${choice}</button>`;

// Screen with text and a single "continue" button.
DL.info = (html, label, extra) => Object.assign({
  type: jsPsychHtmlButtonResponse,
  stimulus: html,
  choices: [label || "Continue"],
  data: { task: "info" }
}, extra || {});

// --------------------------------------------------------- canvas trial
// opts: {w,h, draw(ctx,cv,trial) | animate(ctx,t,cv,trial), prompt, choices, data,
//        enableAfter (ms), pixelated, pointer(cv) }
DL.canvasTrial = (opts) => ({
  type: jsPsychHtmlButtonResponse,
  stimulus: () => {
    const v = (x, d) => (typeof x === "function" ? x() : (x == null ? d : x));
    const w = v(opts.w, 600), h = v(opts.h, 400), cssw = v(opts.cssw, w);
    return `<div class="stage"><canvas id="dlcv" width="${w}" height="${h}"
      class="${v(opts.pixelated, false) ? "pixelated" : ""}" style="max-width:${cssw}px"></canvas></div>
      <div class="prompt">${v(opts.prompt, "")}</div>`;
  },
  choices: opts.choices,
  button_layout: opts.button_layout || "grid",
  button_html: opts.button_html || DL.btn(),
  enable_button_after: opts.enableAfter || 0,
  data: opts.data || {},
  on_load: () => {
    const cv = document.getElementById("dlcv");
    const ctx = cv.getContext("2d");
    const trial = Object.assign({}, opts.data || {});   // scratch copy: caches here never reach the data file
    if (opts.pointer) opts.pointer(cv, trial);
    if (opts.animate) {
      const t0 = performance.now();
      const frame = (now) => { opts.animate(ctx, (now - t0) / 1000, cv, trial); DL.raf = requestAnimationFrame(frame); };
      DL.raf = requestAnimationFrame(frame);
    } else if (opts.draw) {
      opts.draw(ctx, cv, trial);
    }
  },
  on_finish: (data) => {
    if (DL.raf) cancelAnimationFrame(DL.raf);
    DL.raf = null;
    if (opts.finish) opts.finish(data);
  }
});

// ------------------------------------------------------- quiz questions
// q = {id, text, options:[...], answer: index, explain: string|function}
DL.quiz = (q) => {
  const ask = {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => `<div class="qbox"><div class="qtag">Quiz</div><p class="qtext">${typeof q.text === "function" ? q.text() : q.text}</p></div>`,
    choices: q.options,
    button_layout: "flex",
    button_html: DL.btn("opt"),
    data: { task: "quiz", qid: q.id, answer: q.answer },
    on_finish: (d) => { d.correct = d.response === q.answer; d.chosen = q.options[d.response]; }
  };
  const feedback = {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => {
      const last = jsPsych.data.get().last(1).values()[0];
      const ok = last.correct;
      const ex = typeof q.explain === "function" ? q.explain() : q.explain;
      return `<div class="qbox ${ok ? "good" : "bad"}"><div class="qtag">${ok ? "Correct" : "Not quite"}</div>
        <p class="qtext">${typeof q.text === "function" ? q.text() : q.text}</p>
        <p><b>Answer:</b> ${q.options[q.answer]}</p><p class="explain">${ex}</p></div>`;
    },
    choices: ["Next"],
    data: { task: "quiz_feedback", qid: q.id }
  };
  return { timeline: [ask, feedback] };
};

// Ungraded prediction: recorded, compared with the data later.
DL.predict = (q) => ({
  type: jsPsychHtmlButtonResponse,
  stimulus: `<div class="qbox predict"><div class="qtag">Predict first (not graded)</div><p class="qtext">${q.text}</p></div>`,
  choices: q.options,
  button_layout: "flex",
  button_html: DL.btn("opt"),
  data: { task: "prediction", qid: q.id },
  on_finish: (d) => { d.chosen = q.options[d.response]; }
});
DL.predictionOf = (qid) => {
  const r = DL.phaseData().filter({ task: "prediction", qid }).values()[0];
  return r ? r.chosen : "(no answer)";
};

// ------------------------------------------------------------- charts
// Simple inline SVG bar chart. bars: [{label, value (0..max), note}], opts {max, unit, ref, refLabel, title}
DL.bars = (bars, opts) => {
  opts = Object.assign({ max: 100, unit: "%", w: 520, h: 210 }, opts || {});
  const padL = 40, padB = 46, padT = 26, W = opts.w, H = opts.h;
  const n = bars.length, bw = (W - padL - 10) / n;
  const y = (v) => padT + (H - padT - padB) * (1 - v / opts.max);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px">`;
  if (opts.title) s += `<text x="${W / 2}" y="14" text-anchor="middle" class="ct">${opts.title}</text>`;
  [0, 0.5, 1].forEach(f => {
    const v = opts.max * f;
    s += `<line x1="${padL}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" class="grid"/>
          <text x="${padL - 4}" y="${y(v) + 4}" text-anchor="end" class="ax">${Math.round(v)}${opts.unit}</text>`;
  });
  if (opts.ref != null) s += `<line x1="${padL}" x2="${W - 6}" y1="${y(opts.ref)}" y2="${y(opts.ref)}" class="ref"/>
      <text x="${W - 8}" y="${y(opts.ref) - 4}" text-anchor="end" class="reft">${opts.refLabel || ""}</text>`;
  bars.forEach((b, i) => {
    const x = padL + i * bw + bw * 0.18, w = bw * 0.64;
    if (b.value == null) {
      s += `<text x="${x + w / 2}" y="${y(opts.max * 0.1)}" text-anchor="middle" class="ax">n/a</text>`;
    } else {
      s += `<rect x="${x}" y="${y(b.value)}" width="${w}" height="${y(0) - y(b.value)}" class="bar ${b.cls || ""}"/>
            <text x="${x + w / 2}" y="${y(b.value) - 4}" text-anchor="middle" class="val">${Math.round(b.value)}${opts.unit}</text>`;
    }
    const lines = String(b.label).split("|");
    lines.forEach((ln, k) => { s += `<text x="${x + w / 2}" y="${H - padB + 16 + 12 * k}" text-anchor="middle" class="lab">${ln}</text>`; });
  });
  return s + "</svg>";
};

// --------------------------------------------------------------- login
DL.loginTrial = () => {
  let attempt = 0;
  const form = {
    type: jsPsychSurveyHtmlForm,
    preamble: () => `<h1>Depth Lab</h1><p class="sub">${CFG.course} &middot; Session 9</p>
      ${attempt > 0 ? `<p class="err">That unlock code was not recognised. Check the slide and try again.</p>` : ""}
      ${CFG.debug ? `<p class="small">Instructor test mode. Codes: ${Object.entries(CFG.codes).map(([k, v]) => `${k} = ${v}`).join(" &middot; ")}</p>` : ""}`,
    html: () => `
      <div class="form">
        <label>Full name<input name="name" required autocomplete="name" value="${DL.esc(DL.store.get("name"))}"></label>
        <label>Roll number<input name="roll" required value="${DL.esc(DL.store.get("roll"))}"></label>
        <label>Unlock code (on the slide)<input name="code" required autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
        <label class="check"><input type="checkbox" name="ok" required> I understand that my answers are recorded for class discussion and
          participation, and that the demos are not a test of my eyesight.</label>
      </div>`,
    button_label: "Start",
    data: { task: "login" },
    on_finish: (d) => {
      attempt++;
      const r = d.response;
      const code = DL.norm(r.code);
      const phase = Object.keys(CFG.codes).find(k => DL.norm(CFG.codes[k]) === code);
      d.code_ok = !!phase;
      if (phase) {
        DL.state.name = String(r.name).trim();
        DL.state.roll = String(r.roll).trim();
        DL.state.phase = Number(phase);
        DL.store.set("name", DL.state.name);
        DL.store.set("roll", DL.state.roll);
        jsPsych.data.addProperties({
          name: DL.state.name, roll: DL.state.roll, phase: DL.state.phase,
          session: CFG.session, started: new Date().toISOString(),
          screen_w: screen.width, screen_h: screen.height,
          touch: ("ontouchstart" in window) ? 1 : 0
        });
        d.phase = DL.state.phase;
      }
    }
  };
  return { timeline: [form], loop_function: (data) => !data.values()[0].code_ok };
};

// --------------------------------------------------------------- saving
DL.fileStem = () => {
  const clean = (s) => String(s).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${CFG.session}_P${DL.state.phase}_${clean(DL.state.roll)}_${clean(DL.state.name)}_${ts}`;
};

DL.saveTrial = (summaryFn) => ({
  type: jsPsychCallFunction,
  async: true,
  func: (done) => {
    const stem = DL.fileStem();
    DL.state.stem = stem;
    const csv = DL.phaseData().csv();
    const summary = Object.assign({
      session: CFG.session, phase: DL.state.phase, name: DL.state.name, roll: DL.state.roll,
      finished: new Date().toISOString(),
      quiz_correct: DL.task("quiz").filter(r => r.correct).length,
      quiz_total: DL.task("quiz").length
    }, summaryFn ? summaryFn() : {});
    DL.state.summary = summary;
    const jobs = [];
    if (CFG.datapipe_id) {
      jobs.push(jsPsychPipe.saveData(CFG.datapipe_id, stem + ".csv", csv)
        .then(r => ({ where: "OSF (DataPipe)", ok: r && !r.error, msg: r && r.error ? String(r.error) : "" }))
        .catch(e => ({ where: "OSF (DataPipe)", ok: false, msg: String(e) })));
    }
    if (CFG.sheets_url) {
      // no-cors: the request is sent but the reply cannot be read, so success is assumed if no network error.
      jobs.push(fetch(CFG.sheets_url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(summary) })
        .then(() => ({ where: "Google Sheet", ok: true, msg: "" }))
        .catch(e => ({ where: "Google Sheet", ok: false, msg: String(e) })));
    }
    const timeout = new Promise(res => setTimeout(() => res([{ where: "upload", ok: false, msg: "timed out" }]), 15000));
    Promise.race([Promise.all(jobs), timeout]).then(res => {
      DL.state.saveStatus = res;
      done({ task: "save", save_status: JSON.stringify(res) });
    });
  }
});

DL.saveStatusHtml = () => {
  const st = DL.state.saveStatus || [];
  if (!st.length) return `<p class="warn">Nothing was uploaded automatically. <b>Download your data</b> below and upload the file to Canvas.</p>`;
  const bad = st.filter(s => !s.ok);
  if (!bad.length) return `<p class="ok">Your answers were saved (${st.map(s => s.where).join(" and ")}).</p>`;
  return `<p class="warn">Saving failed (${bad.map(s => s.where + (s.msg ? ": " + DL.esc(s.msg) : "")).join("; ")}).
          <b>Download your data</b> below and upload the file to Canvas.</p>`;
};

// Final screen of a phase: personal results + download button + "look up".
DL.endScreen = (resultsHtml, nextText) => ({
  timeline: [DL._endTrial(resultsHtml, nextText)],
  loop_function: (data) => data.values()[0].response === 0
});
DL._endTrial = (resultsHtml, nextText) => ({
  type: jsPsychHtmlButtonResponse,
  stimulus: () => `<div class="results">
      <h2>Phase ${DL.state.phase} done, ${DL.esc(DL.state.name.split(" ")[0])}</h2>
      ${DL.saveStatusHtml()}
      <p class="score">Quiz: ${DL.state.summary.quiz_correct} / ${DL.state.summary.quiz_total}</p>
      ${resultsHtml()}
      <p class="next">${nextText}</p>
    </div>`,
  choices: ["Download my data (CSV)", "Finish"],
  button_html: (c, i) => `<button class="jspsych-btn ${i === 0 ? "dl" : ""}">${c}</button>`,
  data: { task: "end" },
  on_finish: (d) => { if (d.response === 0) DL.download(); },
  // keep the screen up after a download
});
DL.download = () => {
  const csv = DL.phaseData().csv();
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (DL.state.stem || DL.fileStem()) + ".csv";
  document.body.appendChild(a); a.click(); a.remove();
};
