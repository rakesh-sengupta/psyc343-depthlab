// =====================================================================
//  Phase 4 : Size and distance; putting the cues together
// =====================================================================
const P4 = {};

P4.sizeTrial = (context, ref) => {
  const start = Math.round(70 + Math.random() * 60);
  return {
    type: jsPsychHtmlSliderResponse,
    stimulus: `<div class="stage"><canvas id="dlcv" width="600" height="420" style="max-width:600px"></canvas></div>
      <div class="prompt">Drag the slider until the ball marked <b>adjust me</b> is the <b>same size on the screen</b> as the other one,
      as if you were going to measure both with a ruler.</div>`,
    min: 50, max: 150, step: 1, slider_start: start, slider_width: Math.min(420, Math.round(window.innerWidth * 0.85)),
    labels: ["smaller", "bigger"], require_movement: true, button_label: "They are the same size",
    data: { task: "size_match", context, ref, start },
    on_load: () => {
      const cv = document.getElementById("dlcv"), ctx = cv.getContext("2d");
      const sl = document.getElementById("jspsych-html-slider-response-response");
      const tr = { context, ref };
      const draw = () => DL.stim.corridor(ctx, tr, Number(sl.value));
      sl.addEventListener("input", draw); draw();
    },
    on_finish: (d) => { d.setting = Number(d.response); }   // % of the reference ball's screen size
  };
};

P4.summary = () => {
  const r = DL.task("size_match");
  const m = (c, ref) => { const v = DL.mean(r.filter(x => x.context === c && x.ref === ref).map(x => x.setting)); return v == null ? null : Math.round(v * 10) / 10; };
  return {
    p4_corridor_far: m("corridor", "near"),     // comparison is the FAR ball
    p4_blank_far: m("blank", "near"),
    p4_corridor_near: m("corridor", "far"),     // comparison is the NEAR ball
    p4_blank_near: m("blank", "far")
  };
};

P4.results = () => {
  const s = P4.summary();
  return `<h3>1. Your size settings</h3>
  ${DL.bars([
    { label: "far ball|corridor", value: s.p4_corridor_far },
    { label: "far ball|blank", value: s.p4_blank_far, cls: "conf" },
    { label: "near ball|corridor", value: s.p4_corridor_near },
    { label: "near ball|blank", value: s.p4_blank_near, cls: "conf" }
  ], { title: "the size you set, as % of the other ball", max: 150, ref: 100, refLabel: "true match", unit: "%" })}
  <p class="cap">Below 100% means you had to make the ball <i>smaller</i> to make it look equal: it looked bigger than it was.
  In the corridor, the far ball looks bigger; on a blank background the effect should mostly vanish.</p>`;
};

P4.timeline = () => {
  const tl = [];
  tl.push(DL.info(`<h2>Phase 4: size, distance, and putting cues together</h2>
    <p>If two things make the same-sized image in your eye, and one seems farther away, how big does it look?</p>
    <p class="small">About 6 minutes, then a final quiz.</p>`, "Begin"));
  tl.push(DL.predict({ id: "p4a", text: "Two balls make <b>identical images</b>. One is drawn far down a corridor. It will look…",
    options: ["bigger than the near one", "smaller than the near one", "the same"] }));
  tl.push(DL.info(`<h3>Part A: make them match</h3><p>Use the slider to resize one ball. Match their size <b>on the screen</b>,
    not the size you think they would be in a real corridor.</p>`, "Start"));
  DL.shuffle(DL.repeat([
    { c: "corridor", r: "near" }, { c: "blank", r: "near" }, { c: "corridor", r: "far" }, { c: "blank", r: "far" }
  ], 2)).forEach(o => tl.push(P4.sizeTrial(o.c, o.r)));

  tl.push(DL.info(`<h3>Final quiz: the whole session</h3><p>Five questions on everything from today.</p>`, "Go"));
  [
    { id: "p4q1", text: () => { const s = P4.summary(); return `In the corridor you set the far ball to about <b>${s.p4_corridor_far ?? "?"}%</b> of the near one to make them look equal. Why does a far ball with the same image look bigger?`; },
      options: ["The brain scales perceived size by perceived distance", "Far objects are blurred, and blur adds size", "The far ball was drawn bigger", "The corridor's lines bend the ball"],
      answer: 0,
      explain: "Same image size + greater perceived distance = bigger object (size&ndash;distance invariance). The perspective lines make the top ball 'far', so it looks big. In a brain-imaging study, a ball that looked bigger in a corridor took up more of primary visual cortex (V1), even though the image was the same (Murray, Boyaci &amp; Kersten, 2006)." },
    { id: "p4q2", text: "Which depth cues stop being useful beyond about <b>2 metres</b>?",
      options: ["Accommodation and convergence (the eyes' focus and angle)", "Occlusion", "Relative size", "Texture gradients"],
      answer: 0,
      explain: "Focusing (accommodation) and turning the eyes in (convergence) change hardly at all beyond arm's length to a couple of metres. Binocular disparity is strong at near and middle distances; occlusion and relative size work at every distance (Cutting &amp; Vishton, 1995)." },
    { id: "p4q3", text: "A phone app turns a single photo into a 3D depth map (for example, the network <i>Depth Anything</i>, 2024). Which kinds of cue can it possibly use?",
      options: ["Only pictorial cues (size, height, texture, shading, occlusion…)", "Binocular disparity", "Motion parallax", "Accommodation"],
      answer: 0,
      explain: "One photo means one viewpoint, no motion and no focus information: only the pictorial cues are left. These networks learn them from millions of images, which is also why a cleverly built Ames room or a forced-perspective photo can fool them, as it fools us." },
    { id: "p4q4", text: "Infants on the <b>visual cliff</b> (a glass floor over a drop) start avoiding the 'deep' side reliably…",
      options: ["after they have some experience of crawling", "at birth", "only once they can talk", "never: they always cross"],
      answer: 0,
      explain: "Very young infants notice the depth (their heart rate changes), but wariness of the drop grows with locomotor experience (Gibson &amp; Walk, 1960; Campos and colleagues). Perceiving depth and knowing what it means for action are not the same thing." },
    { id: "p4q5", text: "The best summary of today: depth perception is…",
      options: ["the combination of many imperfect cues, each resting on an assumption about the world", "read directly off the retinal image", "only stereopsis; the other cues are illusions", "learned entirely from touch"],
      answer: 0,
      explain: "Every cue you met rests on a hidden assumption (light from above, objects on a ground plane, a rigid world, two eyes 6 cm apart). Each is unreliable alone; together they are robust. Where the assumptions fail, you get illusions, and those illusions are evidence about the assumptions." }
  ].forEach(q => tl.push(DL.quiz(q)));

  tl.push(DL.saveTrial(P4.summary));
  tl.push(DL.endScreen(P4.results, "That is the last phase. Look up at the slides."));
  return tl;
};
