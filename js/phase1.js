// =====================================================================
//  Phase 1 : Pictorial cues (one eye, one flat screen)
// =====================================================================
const P1 = {};
const BLUE = "#2f6fd6", ORANGE = "#e67e22";

// -------- 1A: which is nearer?  cue = the object each cue says is nearer
P1.nearSpecs = () => {
  const out = [];
  const add = (cond, n, build) => { for (let i = 0; i < n; i++) out.push(Object.assign({ cond }, build(Math.random() < 0.5))); };
  // size only: same ground contact, different image size
  add("size", 5, (sw) => {
    const big = { kind: "ball", base: 300, r: 36 }, small = { kind: "ball", base: 300, r: 22 };
    return P1.pair(sw ? big : small, sw ? small : big, sw ? "A" : "B", null, true);
  });
  // height in the field only: same image size, different ground contact
  add("height", 5, (sw) => {
    const low = { kind: "ball", base: 380, r: 26 }, high = { kind: "ball", base: 228, r: 26 };
    return P1.pair(sw ? low : high, sw ? high : low, sw ? "A" : "B", null, true);
  });
  // occlusion only: same size cards, plain background
  add("occlusion", 5, (sw) => P1.cards(110, 110, sw));
  // conflict: bigger but higher vs smaller but lower.  cue = object SIZE says is nearer
  add("size_vs_height", 5, (sw) => {
    const big = { kind: "ball", base: 232, r: 38 }, small = { kind: "ball", base: 372, r: 20 };
    return P1.pair(sw ? big : small, sw ? small : big, sw ? "A" : "B", sw ? "B" : "A", true);
  });
  // conflict: smaller card in front of bigger card.  cue = object OCCLUSION says is nearer
  add("occ_vs_size", 5, (sw) => P1.cards(72, 132, sw, true));
  return DL.shuffle(out);
};
// left object = A (blue), right = B (orange)
P1.pair = (left, right, cueNear, altNear, ground) => {
  left = Object.assign({}, left, { x: 190, col: BLUE, label: "A" });
  right = Object.assign({}, right, { x: 450, col: ORANGE, label: "B" });
  const objs = [left, right].sort((a, b) => a.base - b.base);        // far first
  return { spec: { ground, objs }, cue_near: cueNear, alt_near: altNear };
};
// Two overlapping cards; the occluder is the cue-near one. If small, the occluder is the smaller card.
P1.cards = (sOcc, sBack, occOnLeft, conflict) => {
  const L = { kind: "card", x: 262, y: 200, col: BLUE, label: "A", labelX: 222 };
  const R = { kind: "card", x: 352, y: 218, col: ORANGE, label: "B", labelX: 400 };
  const occ = occOnLeft ? L : R, back = occOnLeft ? R : L;
  occ.s = sOcc; back.s = sBack;
  return { spec: { ground: false, objs: [back, occ] }, cue_near: occ.label, alt_near: conflict ? back.label : null };
};

P1.nearTrial = (sp) => DL.canvasTrial({
  w: 640, h: 420,
  draw: (ctx) => DL.stim.scene(ctx, sp.spec),
  prompt: "Which one is <b>nearer</b> to you?",
  choices: ["A is nearer", "B is nearer"],
  data: { task: "nearer", cond: sp.cond, cue_near: sp.cue_near, alt_near: sp.alt_near },
  finish: (d) => { d.chose = d.response === 0 ? "A" : "B"; d.follows_cue = d.chose === d.cue_near; }
});

// -------- 1B: bump or dent?
P1.angles = [0, 45, 90, 135, 180, 225, 270, 315];
P1.shadeTrial = (theta) => DL.canvasTrial({
  w: 360, h: 360, cssw: 320,
  draw: (ctx) => DL.stim.shadedDisc(ctx, theta),
  prompt: "Does it look like a <b>bump</b> (sticking out towards you) or a <b>dent</b> (going in)?",
  choices: ["Bump", "Dent"],
  data: { task: "shading", light_deg: theta },
  finish: (d) => { d.bump = d.response === 0; }
});

// -------- 1C: ball in a box
P1.shadowTrial = (cond) => DL.canvasTrial({
  w: 600, h: 400,
  animate: (ctx, t) => DL.stim.ballBox(ctx, t, cond),
  prompt: "Watch the blue ball. How did it move?",
  choices: ["It moved <b>back</b> along the floor", "It <b>rose up</b> off the floor"],
  enableAfter: 2600,
  data: { task: "shadow", cond },
  finish: (d) => { d.back = d.response === 0; }
});

// ------------------------------------------------------------ summary
P1.summary = () => {
  const near = DL.task("nearer"), sh = DL.task("shading"), sd = DL.task("shadow");
  const agree = (c) => { const r = near.filter(x => x.cond === c); return DL.pct(r.filter(x => x.follows_cue).length, r.length); };
  const bumpAt = (angs) => { const r = sh.filter(x => angs.includes(x.light_deg)); return DL.pct(r.filter(x => x.bump).length, r.length); };
  const back = (c) => { const r = sd.filter(x => x.cond === c); return DL.pct(r.filter(x => x.back).length, r.length); };
  const s = {
    p1_size_agree: agree("size"), p1_height_agree: agree("height"), p1_occ_agree: agree("occlusion"),
    p1_size_beats_height: agree("size_vs_height"), p1_occ_beats_size: agree("occ_vs_size"),
    p1_bump_top: bumpAt([45, 90, 135]), p1_bump_bottom: bumpAt([225, 270, 315]),
    p1_bump_left: bumpAt([180]), p1_bump_right: bumpAt([0]),
    p1_back_attached: back("attached"), p1_back_horizontal: back("horizontal")
  };
  P1.angles.forEach(a => { s["p1_bump_" + a] = bumpAt([a]); });
  return s;
};

P1.results = () => {
  const s = P1.summary();
  const angOrder = [[90, "top"], [135, "top|left"], [180, "left"], [225, "bottom|left"], [270, "bottom"], [315, "bottom|right"], [0, "right"], [45, "top|right"]];
  return `
  <h3>1. Which object looked nearer?</h3>
  ${DL.bars([
    { label: "size|alone", value: s.p1_size_agree },
    { label: "height|alone", value: s.p1_height_agree },
    { label: "occlusion|alone", value: s.p1_occ_agree },
    { label: "size beat|height", value: s.p1_size_beats_height, cls: "conf" },
    { label: "occlusion|beat size", value: s.p1_occ_beats_size, cls: "conf" }
  ], { title: "% of trials where you followed the cue", ref: 50, refLabel: "chance" })}
  <p class="cap">Your prediction was: <i>${DL.esc(DL.predictionOf("p1a"))}</i>. The two orange bars are the conflict trials.</p>
  <h3>2. Bump or dent?</h3>
  ${DL.bars(angOrder.map(([a, l]) => ({ label: l, value: s["p1_bump_" + a] })),
    { title: "% 'bump' answers by where the bright side was", ref: 50, refLabel: "50%" })}
  <h3>3. The ball in the box</h3>
  ${DL.bars([
    { label: "shadow stuck|to the ball", value: s.p1_back_attached },
    { label: "shadow slid|sideways", value: s.p1_back_horizontal }
  ], { title: "% 'moved back along the floor'", w: 340 })}`;
};

// ----------------------------------------------------------- timeline
P1.timeline = () => {
  const tl = [];
  tl.push(DL.info(`<h2>Phase 1: one eye, one flat screen</h2>
    <p>Your screen is flat. Every picture on it is the same distance from your eye. Yet some things will look near and some far.</p>
    <p>Close one eye if you like: nothing in this phase needs two.</p>
    <p class="small">About 6 minutes. Answer quickly: your first impression is the data.</p>`, "Begin"));

  tl.push(DL.predict({ id: "p1a", text: "When two depth cues disagree, which do you think your visual system will follow?",
    options: ["Relative size (bigger = nearer)", "Height in the picture (lower = nearer)", "Neither: I will just guess"] }));
  tl.push(DL.info(`<h3>Part A: which is nearer?</h3><p>You will see two objects, <b>A</b> (blue) and <b>B</b> (orange).
    Say which one looks <b>nearer to you</b>. There are no right answers: just say what you see.</p>`, "Start"));
  P1.nearSpecs().forEach(sp => tl.push(P1.nearTrial(sp)));

  tl.push(DL.predict({ id: "p1b", text: "A grey disc is <b>lighter at the top</b> and darker at the bottom. What will it look like?",
    options: ["A bump", "A dent", "Flat"] }));
  tl.push(DL.info(`<h3>Part B: bump or dent?</h3><p>Each disc is a flat patch of grey shades. Say whether it looks like a
    <b>bump</b> or a <b>dent</b>. Keep your head upright.</p>`, "Start"));
  DL.shuffle(DL.repeat(P1.angles.map(a => ({ a })), 3)).forEach(o => tl.push(P1.shadeTrial(o.a)));

  tl.push(DL.canvasTrial({ w: 600, h: 300, draw: (ctx) => DL.stim.discArray(ctx, false),
    prompt: "A quick look: most of these look like bumps, a few like dents. Find the dents.", choices: ["Now turn it upside down"], data: { task: "demo" } }));
  tl.push(DL.canvasTrial({ w: 600, h: 300, draw: (ctx) => DL.stim.discArray(ctx, true),
    prompt: "Same picture, rotated 180°. Nothing else changed.", choices: ["Continue"], data: { task: "demo" } }));

  tl.push(DL.info(`<h3>Part C: the ball in the box</h3><p>A blue ball moves inside a box. Watch it at least once, then say
    how it moved. The animation repeats.</p>`, "Start"));
  DL.shuffle(["attached", "attached", "attached", "horizontal", "horizontal", "horizontal"]).forEach(c => tl.push(P1.shadowTrial(c)));

  tl.push(DL.info(`<h3>Four quick questions</h3><p>Use what you just saw.</p>`, "Go"));
  [
    { id: "p1q1", text: "Occlusion (one thing covering another) tells you…",
      options: ["which surface is in front, but not how far apart they are", "the distance to each object in metres", "nothing, unless both eyes are open", "only about moving objects"],
      answer: 0,
      explain: () => `Occlusion is the most reliable cue at every distance, but it is only <b>ordinal</b>: it gives order, not amount. In your conflict trials the occluding card won ${P1.summary().p1_occ_beats_size}% of the time, even though it was the smaller one.` },
    { id: "p1q2", text: "Why did discs that were bright at the <b>top</b> tend to look like bumps?",
      options: ["The visual system assumes light comes from above", "Brighter regions are physically closer to the eye", "Cones are denser in the upper retina", "Bumps are more common than dents"],
      answer: 0,
      explain: () => { const s = P1.summary(); return `The disc is ambiguous: a bump lit from above and a dent lit from below give the same image. Your brain settles it with a prior: one light, above you. You said "bump" ${s.p1_bump_top}% of the time when the bright side was up and ${s.p1_bump_bottom}% when it was down. Turning the picture upside down flips them all.`; } },
    { id: "p1q3", text: "In the box, the ball's image followed <b>exactly the same path</b> on every trial. What changed what you saw?",
      options: ["The path of its shadow", "The ball shrank as it moved", "Its speed", "Its colour"],
      answer: 0,
      explain: () => { const s = P1.summary(); return `Only the shadow changed. A shadow that stays attached says "on the floor, moving away"; a shadow that slides sideways says "rising at the same distance". You reported "moved back" on ${s.p1_back_attached}% of attached-shadow trials and ${s.p1_back_horizontal}% of sliding-shadow trials (Kersten, Mamassian & Knill, 1997).`; } },
    { id: "p1q4", text: "\"Lower in the picture means nearer\" works only when…",
      options: ["objects rest on a ground plane below eye level", "you use both eyes", "the objects are moving", "the objects are the same colour"],
      answer: 0,
      explain: "Height in the field is a ground-plane cue: things on the floor that are farther away sit closer to the horizon. For birds or ceiling lamps, above eye level, the rule reverses." }
  ].forEach(q => tl.push(DL.quiz(q)));

  tl.push(DL.saveTrial(P1.summary));
  tl.push(DL.endScreen(P1.results, "Look up at the slides. We will compare the class results."));
  return tl;
};
