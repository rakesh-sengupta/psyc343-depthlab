// =====================================================================
//  Phase 2 : Two eyes (binocular disparity and stereopsis)
// =====================================================================
const P2 = { mode: "anaglyph" };   // "anaglyph" | "free" | "none"
P2.shapes = ["square", "circle", "triangle", "cross"];
P2.shapeLabels = ["Square", "Circle", "Triangle", "Cross", "No shape / flat"];

P2.rdsTrial = (shape, sign) => {
  const free = () => P2.mode === "free";
  return DL.canvasTrial({
    w: () => (free() ? 640 : 300), h: () => (free() ? 330 : 300), cssw: () => (free() ? 560 : 420), pixelated: true,
    draw: (ctx) => {
      const { L, R } = DL.stim.makeRDS(shape, sign, 2);    // sign 0: a flat dotted plane, no hidden shape
      if (free()) DL.stim.drawCrossFuse(ctx, L, R); else DL.stim.drawAnaglyph(ctx, L, R);
    },
    prompt: () => (free() ? "Cross your eyes until the two red dots become three; look at the middle picture. What shape is floating there?"
                          : "Glasses on (red on the <b>left</b> eye). What shape do you see?"),
    choices: P2.shapeLabels,
    button_layout: "flex",
    data: { task: "rds", shape, disparity_sign: sign },
    finish: (d) => {
      d.mode = P2.mode;
      d.reported = ["square", "circle", "triangle", "cross", "none"][d.response];
      d.saw_shape = d.reported !== "none"; d.correct_shape = sign === 0 ? !d.saw_shape : d.reported === shape;
    }
  });
};
P2.depthQ = (sign) => ({
  timeline: [{
    type: jsPsychHtmlButtonResponse,
    stimulus: "<p class='qtext'>Was that shape <b>in front of</b> the dotted background, or <b>behind</b> it (like a hole)?</p>",
    choices: ["In front", "Behind", "Not sure"],
    data: { task: "rds_depth", disparity_sign: sign },
    on_finish: (d) => { d.mode = P2.mode; d.said = ["front", "behind", "unsure"][d.response]; d.correct = (d.said === "front" && sign > 0) || (d.said === "behind" && sign < 0); }
  }],
  conditional_function: () => { const last = jsPsych.data.get().last(1).values()[0]; return last.task === "rds" && last.saw_shape; }
});

P2.summary = () => {
  const pens = DL.task("pens")[0] || {}, dom = DL.task("dominance")[0] || {}, chk = DL.task("glasses_check")[0] || {};
  const rds = DL.task("rds"), depth = DL.task("rds_depth").filter(r => r.disparity_sign !== 0);
  const st = rds.filter(r => r.disparity_sign !== 0), ctl = rds.filter(r => r.disparity_sign === 0);
  return {
    p2_mode: P2.mode,
    p2_pens_both: pens.both != null ? pens.both : null, p2_pens_one: pens.one != null ? pens.one : null,
    p2_dominant: dom.eye || null, p2_glasses_check: chk.saw || null,
    p2_stereo_correct: DL.pct(st.filter(r => r.correct_shape).length, st.length),
    p2_control_saw_shape: DL.pct(ctl.filter(r => r.saw_shape).length, ctl.length),
    p2_depth_correct: DL.pct(depth.filter(r => r.correct).length, depth.length),
    p2_front_correct: DL.pct(depth.filter(r => r.disparity_sign > 0 && r.correct).length, depth.filter(r => r.disparity_sign > 0).length),
    p2_behind_correct: DL.pct(depth.filter(r => r.disparity_sign < 0 && r.correct).length, depth.filter(r => r.disparity_sign < 0).length)
  };
};

P2.results = () => {
  const s = P2.summary();
  let h = `<h3>1. The pen test</h3>
    ${DL.bars([{ label: "both eyes", value: s.p2_pens_both }, { label: "one eye", value: s.p2_pens_one }],
      { title: "hits out of 10", max: 10, unit: "", w: 300 })}
    <p class="cap">Dominant eye: <b>${DL.esc(s.p2_dominant || "?")}</b>. You did one-eye trials second, after practice, so any two-eye advantage you found is an underestimate.</p>`;
  if (P2.mode !== "none") {
    h += `<h3>2. Random-dot stereograms</h3>
    ${DL.bars([
      { label: "hidden shape:|named correctly", value: s.p2_stereo_correct },
      { label: "flat picture:|'saw' a shape", value: s.p2_control_saw_shape, cls: "conf" }
    ], { title: "random-dot pictures", ref: 20, refLabel: "guessing (1 in 5)", w: 360 })}
    ${DL.bars([{ label: "crossed|disparity", value: s.p2_front_correct }, { label: "uncrossed|disparity", value: s.p2_behind_correct }],
      { title: "% correct: in front vs behind", w: 360 })}
    <p class="cap">If the stereo bar is low, check the glasses and the screen first. This is a classroom demo, not an eye test:
    many people need a minute or two before random-dot shapes appear.</p>`;
  }
  return h;
};

P2.timeline = () => {
  const tl = [];
  tl.push(DL.info(`<h2>Phase 2: two eyes</h2>
    <p>Your eyes are about 6&nbsp;cm apart, so each one gets a slightly different view of the world. Does the brain use the difference?</p>
    <p class="small">About 8 minutes. You need: two pens (one with a cap), and red&ndash;cyan 3D glasses if you have them.</p>`, "Begin"));
  tl.push(DL.predict({ id: "p2a", text: "Roughly what fraction of adults cannot see depth from the difference between the two eyes' images?",
    options: ["Less than 1 in 100", "About 1 in 15", "About 1 in 4", "About half"] }));

  // ---- off-screen: pen test and eye dominance
  tl.push(DL.info(`<h3>Part A: the pen test (off screen)</h3>
    <ol class="steps"><li>Hold a pen cap upright in one hand at about arm's length.</li>
    <li>Hold a pen in the other hand. Bring it in <b>from the side</b>, in one quick movement, and try to put it into the cap. No slow adjusting.</li>
    <li>Do <b>10 tries with both eyes open</b>. Count the hits.</li>
    <li>Then do <b>10 tries with one eye closed</b>. Count the hits.</li></ol>`, "I have done both"));
  tl.push({
    type: jsPsychSurveyHtmlForm,
    preamble: "<h3>Your pen-test scores</h3>",
    html: `<div class="form"><label>Hits with both eyes (0&ndash;10)<input name="both" type="number" min="0" max="10" required></label>
           <label>Hits with one eye (0&ndash;10)<input name="one" type="number" min="0" max="10" required></label></div>`,
    data: { task: "pens" },
    on_finish: (d) => { d.both = Number(d.response.both); d.one = Number(d.response.one); }
  });
  tl.push(DL.info(`<h3>Which eye is in charge?</h3><ol class="steps">
    <li>Stretch out your arms and make a small triangle with your thumbs and forefingers.</li>
    <li>With both eyes open, frame something far away (a clock, a door handle) inside the triangle.</li>
    <li>Close your left eye, then your right. With one of them the object stays inside the triangle: that is your <b>sighting-dominant</b> eye.</li></ol>`, "Done"));
  tl.push({
    type: jsPsychHtmlButtonResponse, stimulus: "<p class='qtext'>Which eye kept the object inside the triangle?</p>",
    choices: ["Right eye", "Left eye", "Can't tell"], data: { task: "dominance" },
    on_finish: (d) => { d.eye = ["right", "left", "unclear"][d.response]; }
  });

  // ---- glasses or not
  tl.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `<h3>Part B: hidden shapes</h3><p>Do you have red&ndash;cyan 3D glasses?</p>`,
    choices: ["Yes, red-cyan glasses", "No glasses: let me try free-fusing (cross-eyed)", "No glasses: skip this part"],
    data: { task: "mode" },
    on_finish: (d) => { P2.mode = ["anaglyph", "free", "none"][d.response]; d.mode = P2.mode; }
  });
  tl.push({
    timeline: [DL.canvasTrial({
      w: 500, h: 230, draw: (ctx) => DL.stim.glassesCheck(ctx),
      prompt: "Put the glasses on with <b>red over your LEFT eye</b>. Now close your <b>right</b> eye. Which word can you read?",
      choices: ["LEFT", "RIGHT", "Both words"], data: { task: "glasses_check" },
      finish: (d) => { d.saw = ["left", "right", "both"][d.response]; }
    }), {
      type: jsPsychHtmlButtonResponse,
      stimulus: () => {
        const s = jsPsych.data.get().last(1).values()[0].saw;
        if (s === "left") return "<p class='ok'>Good: each eye now gets its own image.</p>";
        if (s === "right") return "<p class='warn'>Your glasses are the wrong way round. Turn them so that <b>red is over the left eye</b>, then continue.</p>";
        return "<p class='warn'>Some of each image is leaking through (common on bright laptop screens). Lower the screen brightness a little and continue.</p>";
      },
      choices: ["Continue"], data: { task: "info" }
    }],
    conditional_function: () => P2.mode === "anaglyph"
  });
  tl.push({
    timeline: [DL.info(`<p>You will see random dots. Some pictures hide a shape; some do not.
      Take your time: random-dot shapes can take several seconds to appear. If you see nothing, say so: that is data too.</p>`, "Start")],
    conditional_function: () => P2.mode !== "none"
  });
  const rdsList = DL.shuffle([
    ...P2.shapes.map(s => ({ s, sign: 1 })), ...P2.shapes.map(s => ({ s, sign: -1 })),
    ...DL.shuffle(P2.shapes).slice(0, 3).map(s => ({ s, sign: 0 }))
  ]);
  rdsList.forEach(o => tl.push({ timeline: [P2.rdsTrial(o.s, o.sign), P2.depthQ(o.sign)], conditional_function: () => P2.mode !== "none" }));
  // note: rdsTrial reads P2.mode at stimulus time, so the chosen mode is used

  tl.push(DL.info(`<h3>Three quick questions</h3>`, "Go"));
  [
    { id: "p2q1", text: "In a random-dot stereogram, what does each eye's image show <b>on its own</b>?",
      options: ["Only random dots: the shape exists only in the difference between the two images", "A faint outline of the shape", "The shape, but flat", "The shape, but blurred"],
      answer: 0,
      explain: () => { const s = P2.summary(); return `That was the point of Julesz's (1960) stereograms: no edges, no outline, no familiar object, yet a shape in depth. You named the hidden shapes correctly ${s.p2_stereo_correct ?? "n/a"}% of the time (guessing gives 20%). Take the glasses off and the same pictures are just speckle.`; } },
    { id: "p2q2", text: "A shape whose image in the <b>left</b> eye is shifted to the <b>right</b> (relative to the right eye's image) appears…",
      options: ["in front of the background (crossed disparity)", "behind the background (uncrossed disparity)", "at the same depth", "to flicker"],
      answer: 0,
      explain: "Lines of sight to a point nearer than where you are fixating cross over: crossed disparity means nearer, uncrossed means farther. The sign of the disparity gives the direction of depth; its size gives the amount." },
    { id: "p2q3", text: "Why did Julesz's random-dot stereograms matter for theories of vision?",
      options: ["They showed the two eyes' images can be matched before any object is recognised", "They proved depth needs familiar objects", "They showed one eye is enough for stereo", "They showed colour carries depth"],
      answer: 0,
      explain: "Before 1960 many thought you first recognise the object in each eye, then compare. In a random-dot stereogram there is nothing to recognise: matching happens early, on tiny local features. That is the <b>correspondence problem</b>, which Marr and Poggio later tried to solve with simple rules." }
  ].forEach(q => tl.push(DL.quiz(q)));

  tl.push(DL.saveTrial(P2.summary));
  tl.push(DL.endScreen(P2.results, "Look up at the slides."));
  return tl;
};
