// =====================================================================
//  Depth Lab : stimulus drawing (all on <canvas>, no image files)
// =====================================================================
DL.stim = {};

// ----------------------------------------------------------- primitives
DL.stim.sphere = (ctx, x, cy, r, col) => {
  const g = ctx.createRadialGradient(x - r * 0.35, cy - r * 0.4, r * 0.08, x, cy, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.25, col);
  g.addColorStop(1, DL.stim.shade(col, 0.45));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, cy, r, 0, 2 * Math.PI); ctx.fill();
};
DL.stim.shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
};
// A ball resting on the ground: contact shadow at baseY, sphere above it.
DL.stim.ball = (ctx, x, baseY, r, col) => {
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.beginPath(); ctx.ellipse(x + r * 0.15, baseY, r * 0.95, r * 0.22, 0, 0, 2 * Math.PI); ctx.fill();
  DL.stim.sphere(ctx, x, baseY - r, r, col);
};
DL.stim.card = (ctx, x, y, s, col) => {
  ctx.fillStyle = col; ctx.strokeStyle = "#333"; ctx.lineWidth = 2;
  ctx.fillRect(x - s / 2, y - s / 2, s, s); ctx.strokeRect(x - s / 2, y - s / 2, s, s);
};

// Sky + textured ground plane with a horizon (linear perspective, texture gradient).
DL.stim.ground = (ctx, W, H, hy) => {
  let g = ctx.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, "#bcd6ec"); g.addColorStop(1, "#eef4f8");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy);
  g = ctx.createLinearGradient(0, hy, 0, H);
  g.addColorStop(0, "#cdbf9f"); g.addColorStop(1, "#9c8558");
  ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
  ctx.strokeStyle = "rgba(60,45,20,0.35)"; ctx.lineWidth = 1;
  for (let k = -14; k <= 14; k++) {             // converging lines
    ctx.beginPath(); ctx.moveTo(W / 2, hy); ctx.lineTo(W / 2 + k * W * 0.22, H); ctx.stroke();
  }
  for (let k = 0; k < 22; k++) {                // compressing cross-lines
    const y = hy + (H - hy) / (1 + 0.42 * k);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
};

// --------------------------------------------- phase 1A: which is nearer?
// spec = {ground:bool, objs:[{kind:'ball'|'card', x, base|y, r|s, col}] } drawn in order (last on top)
DL.stim.scene = (ctx, spec) => {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  if (spec.ground) DL.stim.ground(ctx, W, H, 150);
  else { ctx.fillStyle = "#e8e8e8"; ctx.fillRect(0, 0, W, H); }
  spec.objs.forEach(o => {
    if (o.kind === "ball") DL.stim.ball(ctx, o.x, o.base, o.r, o.col);
    else DL.stim.card(ctx, o.x, o.y, o.s, o.col);
  });
  // labels A / B under the objects
  ctx.font = "bold 22px system-ui, sans-serif"; ctx.textAlign = "center";
  spec.objs.forEach(o => {
    const ly = o.kind === "ball" ? Math.min(H - 8, o.base + 30) : o.y + o.s / 2 + 26;
    ctx.fillStyle = "#111"; ctx.fillText(o.label, o.labelX != null ? o.labelX : o.x, ly);
  });
};

// ----------------------------------------- phase 1B: shape from shading
// theta = direction of the BRIGHT side, degrees, 90 = top, 180 = left.
DL.stim.shadedDisc = (ctx, theta) => {
  const W = ctx.canvas.width, H = ctx.canvas.height, r = Math.min(W, H) * 0.24;
  ctx.fillStyle = "rgb(128,128,128)"; ctx.fillRect(0, 0, W, H);
  const a = theta * Math.PI / 180, dx = Math.cos(a) * r, dy = -Math.sin(a) * r;
  const g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
  g.addColorStop(0, "rgb(40,40,40)"); g.addColorStop(1, "rgb(216,216,216)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, 2 * Math.PI); ctx.fill();
};
// Demo array: bumps and dents mixed (rotate by 180 to swap them).
DL.stim.discArray = (ctx, flip) => {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.fillStyle = "rgb(128,128,128)"; ctx.fillRect(0, 0, W, H);
  const r = 24, pattern = [90, 90, 270, 90, 90, 90, 270, 90, 270, 90, 90, 90, 90, 270, 90, 90, 90, 90, 270, 90];
  pattern.forEach((th, i) => {
    const x = 60 + (i % 5) * 120, y = 42 + Math.floor(i / 5) * 72;
    const a = (th + (flip ? 180 : 0)) * Math.PI / 180, dx = Math.cos(a) * r, dy = -Math.sin(a) * r;
    const g = ctx.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
    g.addColorStop(0, "rgb(40,40,40)"); g.addColorStop(1, "rgb(216,216,216)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
  });
};

// ----------------------------------- phase 1C: ball in a box (Kersten et al., 1997)
DL.stim.ballBox = (ctx, t, cond) => {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  // room
  ctx.fillStyle = "#d9d4c7"; ctx.fillRect(0, 0, W, H);                      // side walls
  ctx.fillStyle = "#ece8de"; ctx.fillRect(170, 60, 260, 170);               // back wall
  ctx.fillStyle = "#b7ad97";                                                  // floor
  ctx.beginPath(); ctx.moveTo(170, 230); ctx.lineTo(430, 230); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1;
  for (let k = 0; k <= 8; k++) { const xb = 170 + k * 260 / 8, xf = k * W / 8; ctx.beginPath(); ctx.moveTo(xb, 230); ctx.lineTo(xf, H); ctx.stroke(); }
  for (let k = 1; k < 7; k++) { const f = 1 - 1 / (1 + 0.35 * k * k / 2), y = 230 + (H - 230) * f, xl = 170 * (1 - f), xr = 430 + (W - 430) * f; ctx.beginPath(); ctx.moveTo(xl, y); ctx.lineTo(xr, y); ctx.stroke(); }
  ctx.strokeStyle = "#8d8676"; ctx.lineWidth = 2;
  [[0, 0, 170, 60], [W, 0, 430, 60], [0, H, 170, 230], [W, H, 430, 230]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
  ctx.strokeRect(170, 60, 260, 170);
  // motion: identical ball path in both conditions; only the shadow differs
  const cyc = 3.4, p0 = (t % cyc) / 2.4, p = Math.min(1, p0), e = p * p * (3 - 2 * p);
  const r = 18, x0 = 200, y0 = 345, x1 = 385, y1 = 214;
  const bx = x0 + (x1 - x0) * e, by = y0 + (y1 - y0) * e;
  const sy = cond === "attached" ? by + r + 2 : y0 + r + 2;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(bx + 6, sy, r * 1.05, r * 0.32, 0, 0, 2 * Math.PI); ctx.fill();
  DL.stim.sphere(ctx, bx, by, r, "#2f6fd6");
};

// ------------------------------------------------ phase 2: stereograms
DL.stim.N = 100;      // dots per side
DL.stim.CELL = 3;     // canvas pixels per dot
DL.stim.inShape = (shape, x, y, c, s) => {   // x,y relative to centre c; s = scale (half-size)
  const u = (x - c) / s, v = (y - c) / s;
  switch (shape) {
    case "square": return Math.abs(u) <= 0.82 && Math.abs(v) <= 0.82;
    case "circle": return u * u + v * v <= 0.92 * 0.92;
    case "triangle": return v <= 0.8 && v >= -1.0 + 0 && Math.abs(u) <= (v + 1.0) * 0.55;
    case "cross": return (Math.abs(u) <= 0.95 && Math.abs(v) <= 0.3) || (Math.abs(v) <= 0.95 && Math.abs(u) <= 0.3);
  }
  return false;
};
// Build left/right eye dot matrices.
// The whole background carries a small uncrossed disparity (bg), so the two eyes' images differ
// everywhere: without glasses the anaglyph is uniformly speckled red/cyan and shows no shape.
// sign: +1 shape nearer than the background (more crossed), -1 farther, 0 no shape (flat plane).
DL.stim.makeRDS = (shape, sign, h, bg) => {
  const N = DL.stim.N, c = N / 2, s = 25, rnd = () => (Math.random() < 0.5 ? 1 : 0);
  bg = bg == null ? -3 : bg;
  const pad = 12, M = N + 2 * pad;
  const Bg = Array.from({ length: N }, () => Array.from({ length: M }, rnd));
  const Bf = Array.from({ length: N }, () => Array.from({ length: M }, rnd));
  const sh = bg + sign * h;                       // shape's half-disparity
  const eye = (k) => Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) =>
    sign !== 0 && DL.stim.inShape(shape, x - k * sh, y, c, s) ? Bf[y][x - k * sh + pad] : Bg[y][x - k * bg + pad]));
  return { L: eye(1), R: eye(-1) };               // positive shift in the left eye = crossed
};
DL.stim.drawAnaglyph = (ctx, L, R) => {
  const N = DL.stim.N, C = DL.stim.CELL, img = ctx.createImageData(N * C, N * C);
  for (let y = 0; y < N * C; y++) for (let x = 0; x < N * C; x++) {
    const i = 4 * (y * N * C + x), l = L[(y / C) | 0][(x / C) | 0], r = R[(y / C) | 0][(x / C) | 0];
    img.data[i] = l ? 255 : 0; img.data[i + 1] = r ? 255 : 0; img.data[i + 2] = r ? 255 : 0; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
};
// Free (cross-eyed) fusion: the RIGHT eye's image goes on the LEFT.
DL.stim.drawCrossFuse = (ctx, L, R) => {
  const N = DL.stim.N, C = DL.stim.CELL, gap = 40;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  [[R, 0], [L, N * C + gap]].forEach(([M, ox]) => {
    ctx.fillStyle = "#000";
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (M[y][x]) ctx.fillRect(ox + x * C, y * C, C, C);
  });
  ctx.fillStyle = "#c00";
  ctx.beginPath(); ctx.arc(N * C / 2, N * C + 14, 5, 0, 7); ctx.arc(N * C + gap + N * C / 2, N * C + 14, 5, 0, 7); ctx.fill();
};
DL.stim.glassesCheck = (ctx) => {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.font = "bold 64px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillStyle = "rgb(255,0,0)"; ctx.fillText("LEFT", W / 2, 90);
  ctx.fillStyle = "rgb(0,255,255)"; ctx.fillText("RIGHT", W / 2, 185);
};

// ---------------------------------------------- phase 3: motion stimuli
DL.stim.dots = (n, W, H) => Array.from({ length: n }, () => [Math.random() * W, Math.random() * H]);
DL.stim.drawDots = (ctx, dots, off, test, size, col) => {
  const W = ctx.canvas.width;
  ctx.fillStyle = col || "#111";
  for (const [x0, y] of dots) {
    let x = (x0 + off) % W; if (x < 0) x += W;
    if (test(x, y)) ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
};
// Shape defined only by relative motion (both edges static: shape is visible but its depth order is not).
DL.stim.motionShape = (ctx, t, tr, still) => {
  const W = ctx.canvas.width, H = ctx.canvas.height, c = W / 2;
  if (!tr._f) { tr._f = DL.stim.dots(1700, W, H); tr._g = DL.stim.dots(1700, W, H); }
  const off = still ? 0 : 9 * Math.sin(2 * Math.PI * t / 1.4);
  ctx.fillStyle = "#e6e6e6"; ctx.fillRect(0, 0, W, H);
  const ins = (x, y) => DL.stim.inShape(tr.shape, x, y, c, 92);
  DL.stim.drawDots(ctx, tr._f, off, ins, 3);
  DL.stim.drawDots(ctx, tr._g, -off, (x, y) => !ins(x, y), 3);
};
// Accretion/deletion: the layer whose texture moves WITH the edge is the near one.
DL.stim.kineticOcclusion = (ctx, t, tr) => {
  const W = ctx.canvas.width, H = ctx.canvas.height, c = W / 2;
  if (!tr._f) { tr._f = DL.stim.dots(1700, W, H); tr._g = DL.stim.dots(1700, W, H); }
  const off = 16 * Math.sin(2 * Math.PI * t / 2.0);
  ctx.fillStyle = "#e6e6e6"; ctx.fillRect(0, 0, W, H);
  const ins = (x, y) => DL.stim.inShape(tr.shape, x - off, y, c, 88);
  if (tr.cond === "object") {          // inside texture travels with the edge; outside is static
    DL.stim.drawDots(ctx, tr._f, off, ins, 3);
    DL.stim.drawDots(ctx, tr._g, 0, (x, y) => !ins(x, y), 3);
  } else {                             // hole: outside texture travels with the edge; inside is static
    DL.stim.drawDots(ctx, tr._f, 0, ins, 3);
    DL.stim.drawDots(ctx, tr._g, off, (x, y) => !ins(x, y), 3);
  }
};
// Kinetic depth effect: dots on a rotating cylinder, orthographic projection.
DL.stim.cylinder = (ctx, t, tr) => {
  const W = ctx.canvas.width, H = ctx.canvas.height, R = 115;
  if (!tr._pts) tr._pts = Array.from({ length: 280 }, () => [Math.random() * 2 * Math.PI, (Math.random() * 2 - 1) * 125]);
  ctx.fillStyle = "#e6e6e6"; ctx.fillRect(0, 0, W, H);
  const pts = tr._pts.map(([ph, y]) => { const a = ph + tr.omega * t; return [R * Math.sin(a), y, R * Math.cos(a)]; });
  if (tr.cue) pts.sort((p, q) => p[2] - q[2]);
  for (const [x, y, z] of pts) {
    let size = 3.2, col = "#222";
    if (tr.cue) { const f = (z + R) / (2 * R); size = 1.6 + 3.6 * f; const g = Math.round(150 - 140 * f); col = `rgb(${g},${g},${g})`; }
    ctx.fillStyle = col; ctx.fillRect(W / 2 + x - size / 2, H / 2 + y - size / 2, size, size);
  }
};

// ---------------------------------------------- phase 4: corridor (Ponzo)
DL.stim.corridor = (ctx, tr, scale) => {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  if (tr.context === "corridor") {
    const bx0 = 255, bx1 = 345, by0 = 95, by1 = 160;           // far wall
    ctx.fillStyle = "#cfc8b8"; ctx.fillRect(0, 0, W, H);           // walls
    ctx.fillStyle = "#e9e4d8"; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    ctx.fillStyle = "#a99d84";                                       // floor
    ctx.beginPath(); ctx.moveTo(bx0, by1); ctx.lineTo(bx1, by1); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ddd7ca";                                       // ceiling
    ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(bx1, by0); ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.2;
    for (let k = 0; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(bx0 + k * (bx1 - bx0) / 6, by1); ctx.lineTo(k * W / 6, H); ctx.stroke(); }
    for (let k = 1; k < 9; k++) {
      const f = 1 - 1 / (1 + 0.16 * k * k), y = by1 + (H - by1) * f;
      ctx.beginPath(); ctx.moveTo(bx0 * (1 - f), y); ctx.lineTo(bx1 + (W - bx1) * f, y); ctx.stroke();
      const yc = by0 * (1 - f);                                       // ceiling beams
      ctx.beginPath(); ctx.moveTo(bx0 * (1 - f), yc); ctx.lineTo(bx1 + (W - bx1) * f, yc); ctx.stroke();
    }
    ctx.strokeStyle = "#7b725f"; ctx.lineWidth = 2;
    [[0, 0, bx0, by0], [W, 0, bx1, by0], [0, H, bx0, by1], [W, H, bx1, by1]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
  } else {
    ctx.fillStyle = "#d6d6d6"; ctx.fillRect(0, 0, W, H);
  }
  const rRef = 40;
  const near = { x: 215, base: 395 }, far = { x: 330, base: 205 };
  const refAt = tr.ref === "near" ? near : far, cmpAt = tr.ref === "near" ? far : near;
  const rC = rRef * scale / 100;
  DL.stim.sphere(ctx, refAt.x, refAt.base - rRef, rRef, "#c0392b");
  DL.stim.sphere(ctx, cmpAt.x, cmpAt.base - rC, rC, "#c0392b");
  ctx.font = "bold 16px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#111";
  ctx.fillText("adjust me", cmpAt.x, cmpAt.base - 2 * rC - 10);
};
