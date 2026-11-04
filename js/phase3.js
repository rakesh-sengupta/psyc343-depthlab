// =====================================================================
//  Phase 3 : Motion (motion parallax, accretion/deletion, kinetic depth)
// =====================================================================
const P3 = {};
P3.shapes = ["square", "circle", "triangle", "cross"];

// 3A: a shape made only of relative motion (and a frozen frame of the same thing)
P3.motionShapeTrial = (shape, still) => DL.canvasTrial({
  w: 360, h: 360, cssw: 380,
  animate: (ctx, t, cv, tr) => DL.stim.motionShape(ctx, t, tr, still),
  prompt: still ? "This one is a single frozen frame. What shape do you see?" : "What shape do you see?",
  choices: ["Square", "Circle", "Triangle", "Cross", "No shape"],
  button_layout: "flex",
  enableAfter: still ? 0 : 1000,
  data: { task: "motion_shape", shape, still },
  finish: (d) => { d.reported = ["square", "circle", "triangle", "cross", "none"][d.response]; d.correct_shape = d.reported === shape; }
});

// 3B: accretion and deletion at a moving edge
P3.occlusionTrial = (shape, cond) => DL.canvasTrial({
  w: 360, h: 360, cssw: 380,
  animate: (ctx, t, cv, tr) => DL.stim.kineticOcclusion(ctx, t, tr),
  prompt: "Is the shape an <b>object in front</b> of the dots, or a <b>hole</b> through which you see dots behind?",
  choices: ["Object in front", "Hole (behind)"],
  enableAfter: 1500,
  data: { task: "accretion", shape, cond },
  finish: (d) => { d.said = d.response === 0 ? "object" : "hole"; d.correct = d.said === cond; }
});

// 3C: kinetic depth effect (rotating cylinder), with and without a size/brightness cue
P3.cylinderTrial = (omega, cue) => DL.canvasTrial({
  w: 360, h: 360, cssw: 380,
  animate: (ctx, t, cv, tr) => DL.stim.cylinder(ctx, t, tr),
  prompt: "This is a transparent rotating drum covered in dots. Which way is its <b>front</b> surface (the side nearer to you) moving?",
  choices: ["&larr; Left", "Right &rarr;"],
  enableAfter: 1500,
  data: { task: "kde", omega, cue },
  finish: (d) => { d.said = d.response === 0 ? "left" : "right"; d.cue_dir = omega > 0 ? "right" : "left"; d.follows_cue = d.said === d.cue_dir; }
});

P3.summary = () => {
  const ms = DL.task("motion_shape"), ac = DL.task("accretion"), kd = DL.task("kde");
  const mov = ms.filter(r => !r.still), st = ms.filter(r => r.still);
  const amb = kd.filter(r => !r.cue), cue = kd.filter(r => r.cue);
  return {
    p3_moving_correct: DL.pct(mov.filter(r => r.correct_shape).length, mov.length),
    p3_still_correct: DL.pct(st.filter(r => r.correct_shape).length, st.length),
    p3_object_correct: DL.pct(ac.filter(r => r.cond === "object" && r.correct).length, ac.filter(r => r.cond === "object").length),
    p3_hole_correct: DL.pct(ac.filter(r => r.cond === "hole" && r.correct).length, ac.filter(r => r.cond === "hole").length),
    p3_ambig_right: DL.pct(amb.filter(r => r.said === "right").length, amb.length),
    p3_ambig_match: DL.pct(amb.filter(r => r.follows_cue).length, amb.length),
    p3_cue_match: DL.pct(cue.filter(r => r.follows_cue).length, cue.length)
  };
};

P3.results = () => {
  const s = P3.summary();
  return `<h3>1. Shapes made of motion</h3>
  ${DL.bars([{ label: "moving", value: s.p3_moving_correct }, { label: "frozen frame", value: s.p3_still_correct, cls: "conf" }],
    { title: "% shapes named correctly", ref: 20, refLabel: "guessing", w: 320 })}
  <h3>2. Object or hole?</h3>
  ${DL.bars([{ label: "edge moved with|the inside dots", value: s.p3_object_correct }, { label: "edge moved with|the outside dots", value: s.p3_hole_correct }],
    { title: "% answers that match the physics", ref: 50, refLabel: "chance", w: 340 })}
  <h3>3. The rotating drum</h3>
  ${DL.bars([{ label: "dots all|the same", value: s.p3_ambig_match }, { label: "near dots bigger|and darker", value: s.p3_cue_match }],
    { title: "% answers matching the drum's real rotation", ref: 50, refLabel: "chance", w: 340 })}
  <p class="cap">With identical dots the drum's motion tells you its shape, but not which side is in front. Your answers were therefore free to flip.
   A pictorial cue settles it.</p>`;
};

P3.timeline = () => {
  const tl = [];
  tl.push(DL.info(`<h2>Phase 3: motion</h2><p>Keep one eye closed if you like. In this phase every picture is made of identical dots.
    Anything you see in depth comes from <b>how the dots move</b>.</p><p class="small">About 6 minutes.</p>`, "Begin"));
  tl.push(DL.predict({ id: "p3a", text: "One eye, head still, a screen of random dots. Can motion alone make you see a shape and its depth?",
    options: ["Yes, both the shape and its depth", "The shape, but not its depth", "Neither"] }));

  tl.push(DL.info(`<h3>Part A: shapes made of motion</h3><p>Name the shape, or say there is none.</p>`, "Start"));
  DL.shuffle([...P3.shapes.map(s => ({ s, still: false })), ...DL.shuffle(P3.shapes).slice(0, 3).map(s => ({ s, still: true }))])
    .forEach(o => tl.push(P3.motionShapeTrial(o.s, o.still)));

  tl.push(DL.info(`<h3>Part B: object or hole?</h3><p>A shape slides left and right. Decide whether it is a solid object in front of the
    dots, or a hole cut in a dotted sheet with more dots behind it. Watch the <b>edges</b>.</p>`, "Start"));
  DL.shuffle([
    { s: "square", c: "object" }, { s: "circle", c: "object" }, { s: "triangle", c: "object" }, { s: "cross", c: "object" },
    { s: "square", c: "hole" }, { s: "circle", c: "hole" }, { s: "triangle", c: "hole" }, { s: "cross", c: "hole" }
  ]).forEach(o => tl.push(P3.occlusionTrial(o.s, o.c)));

  tl.push(DL.info(`<h3>Part C: the rotating drum</h3><p>Look for a few seconds. If the drum seems to change direction, report what you see
    when you press the button.</p>`, "Start"));
  DL.shuffle([[1.1, false], [-1.1, false], [1.1, false], [-1.1, false]]).forEach(([w, c]) => tl.push(P3.cylinderTrial(w, c)));
  DL.shuffle([[1.1, true], [-1.1, true], [1.1, true], [-1.1, true]]).forEach(([w, c]) => tl.push(P3.cylinderTrial(w, c)));

  tl.push(DL.info(`<h3>Three quick questions</h3>`, "Go"));
  [
    { id: "p3q1", text: "You move your head to the <b>right</b> while looking at a lamp-post. A tree <b>nearer</b> than the lamp-post seems to move…",
      options: ["left, against your movement", "right, with your movement", "not at all", "upwards"],
      answer: 0,
      explain: "That is motion parallax. Things nearer than where you are looking slide against your movement; things farther away slide with it, and more slowly the farther they are. The direction gives depth order; the speed gives amount. To read it, the brain must also know how <i>you</i> moved (from the eye-movement and head-movement signals)." },
    { id: "p3q2", text: "When the edge of a shape <b>covers and uncovers</b> the dots on one side, those covered dots belong to…",
      options: ["the surface behind", "the surface in front", "neither: it is a flicker", "whichever surface is bigger"],
      answer: 0,
      explain: () => { const s = P3.summary(); return `Accretion and deletion: a near surface hides and reveals texture on the far surface at its edge (Kaplan, 1969). It works with one eye and no other cue. You matched the physics on ${s.p3_object_correct}% of 'object' and ${s.p3_hole_correct}% of 'hole' trials.`; } },
    { id: "p3q3", text: "With identical dots the drum looked solid and round, but its direction kept flipping. What does this show?",
      options: ["Motion gave the shape; a different cue was needed to say which side was in front", "Motion gives no depth information at all", "The drum really changed direction", "Your eyes were tired"],
      answer: 0,
      explain: () => { const s = P3.summary(); return `This is the kinetic depth effect (Wallach &amp; O'Connell, 1953). With flat (orthographic) projection the motion is identical for both rotation directions. Your answers matched the true rotation ${s.p3_ambig_match}% of the time with identical dots, and ${s.p3_cue_match}% when near dots were bigger and darker. Cues are <b>combined</b>: each one fills in what the other lacks.`; } }
  ].forEach(q => tl.push(DL.quiz(q)));

  tl.push(DL.saveTrial(P3.summary));
  tl.push(DL.endScreen(P3.results, "Look up at the slides."));
  return tl;
};
