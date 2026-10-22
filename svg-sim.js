/* Desenarea realistă și animațiile piezometrului (SVG) + animația sistemului de frânare */
"use strict";

const SVGNS = "http://www.w3.org/2000/svg";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function mk(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function hexRgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function shade(h, f) { return "#" + hexRgb(h).map(v => clamp(Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f), 0, 255).toString(16).padStart(2, "0")).join(""); }

/* ID-uri unice pe fiecare desen (două SVG-uri în aceeași pagină) */
function prefixeazaId(svg, pre) {
  const ids = [...svg.querySelectorAll("[id]")].map(e => e.id);
  svg.querySelectorAll("[id]").forEach(e => { e.id = pre + e.id; });
  const atr = ["fill", "stroke", "filter", "marker-end", "clip-path"];
  svg.querySelectorAll("*").forEach(e => atr.forEach(a => {
    const v = e.getAttribute(a); if (v && v.startsWith("url(#")) { const id = v.slice(5, -1); if (ids.includes(id)) e.setAttribute(a, `url(#${pre}${id})`); }
  }));
}
function urlP(pre, id) { return `url(#${pre}${id})`; }
/* gradienți comuni */
const STOP = {
  otel: [[0, "#4f565e"], [0.1, "#8e969f"], [0.26, "#dfe3e7"], [0.38, "#ffffff"], [0.5, "#c4cad1"], [0.72, "#848d97"], [0.9, "#5b626b"], [1, "#3c4248"]],
  crom: [[0, "#3b4148"], [0.18, "#c9cfd5"], [0.32, "#ffffff"], [0.46, "#8c949d"], [0.62, "#d6dbe0"], [0.82, "#6f7780"], [1, "#30353b"]],
  interior: [[0, "#24282d"], [0.22, "#5d656e"], [0.5, "#9aa3ac"], [0.78, "#5d656e"], [1, "#24282d"]],
  albastru: [[0, "#6d93d1"], [0.18, "#4a71b3"], [0.55, "#284a85"], [1, "#132848"]],
  alama: [[0, "#fff0c0"], [0.25, "#e2b553"], [0.6, "#a87b22"], [1, "#5f430f"]],
  cauciuc: [[0, "#5a5d62"], [0.35, "#2a2c30"], [1, "#0d0e10"]],
  rosu: [[0, "#ff8a80"], [0.3, "#d32f2f"], [1, "#7f1010"]]
};
function grad(defs, id, stops, o = {}) {
  const g = mk(o.radial ? "radialGradient" : "linearGradient", Object.assign({ id }, o.radial ? { cx: o.cx ?? 0.5, cy: o.cy ?? 0.5, r: o.r ?? 0.5, fx: o.fx ?? o.cx ?? 0.5, fy: o.fy ?? o.cy ?? 0.5 } : { x1: o.x1 ?? 0, y1: o.y1 ?? 0, x2: o.x2 ?? 0, y2: o.y2 ?? 1 }), defs);
  stops.forEach(s => mk("stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] ?? 1 }, g));
  return g;
}
function filtre(defs) {
  const f1 = mk("filter", { id: "fUmbra", x: "-10%", y: "-10%", width: "125%", height: "140%" }, defs);
  mk("feDropShadow", { dx: 0, dy: 6, stdDeviation: 5, "flood-color": "#000", "flood-opacity": 0.28 }, f1);
  const f2 = mk("filter", { id: "fBlur6" }, defs); mk("feGaussianBlur", { stdDeviation: 6 }, f2);
  const f3 = mk("filter", { id: "fBlur1" }, defs); mk("feGaussianBlur", { stdDeviation: 1.2 }, f3);
  const f4 = mk("filter", { id: "fBlur2", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs); mk("feGaussianBlur", { stdDeviation: 2 }, f4);
  // textură periată pentru fețele secționate
  const p = mk("pattern", { id: "pPeriat", width: 90, height: 5, patternUnits: "userSpaceOnUse" }, defs);
  mk("rect", { width: 90, height: 5, fill: "#c5cbd1" }, p);
  mk("line", { x1: 0, y1: 1, x2: 90, y2: 1.2, stroke: "#dde1e5", "stroke-width": 0.8 }, p);
  mk("line", { x1: 0, y1: 3.4, x2: 90, y2: 3.2, stroke: "#aeb5bd", "stroke-width": 0.6 }, p);
  // hașură pentru secțiune (ușoară)
  const h = mk("pattern", { id: "pHasura", width: 8, height: 8, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  mk("line", { x1: 0, y1: 0, x2: 0, y2: 8, stroke: "#8f979f", "stroke-width": 0.7, opacity: 0.45 }, h);
}
function surub(parent, x, y, r = 5.5) { // cap hexagonal văzut din față
  const pts = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; pts.push(`${x + r * Math.cos(a)},${y + r * Math.sin(a)}`); }
  mk("polygon", { points: pts.join(" "), fill: "url(#gOtelR)", stroke: "#4b5259", "stroke-width": 0.6 }, parent);
  mk("circle", { cx: x, cy: y, r: r * 0.45, fill: "none", stroke: "#6b737c", "stroke-width": 0.6 }, parent);
}

/* ======================================================================= PIEZOMETRU */
const SV = { g: null, el: {}, anim: { aerisire: null, seringa: null, ecran: 0, t: 0 }, buleNeaer: [], picaturi: [], ac: { p: 0, v: 0 } };

function construiesteSVG() {
  const svg = document.getElementById("svg-piezo");
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 900 400");
  const L = sim.V0 * 1000 / (Math.PI * sim.D * sim.D / 4); // lungimea camerei [mm]
  const g = SV.g = { XS: 130, XD: 610, YA: 222 };
  g.PX = 480 / L;
  g.rB = clamp(sim.D / 2 * 4.5, 28, 58);
  g.w = clamp(sim.e * 4.5, 9, 34);
  g.rR = clamp(sim.d / 2 * 4.5, 8, g.rB - 10);
  g.YS = g.YA - g.rB; g.YJ = g.YA + g.rB; g.YO1 = g.YS - g.w; g.YO2 = g.YJ + g.w;
  g.rF = g.rB + g.w + 14;
  g.tip0 = g.XD - 12 - 15 * g.PX; // vârful pistonului la n = 0 (15 mm în cameră)
  g.xGl = g.XD + 36;               // fața flanșei drepte
  g.xNut = g.xGl + 30;             // capătul piuliței-presetupă
  g.xCol = g.XD + 196;             // gulerul gradat (la n = 0)
  g.xRoata = g.XD + 246;           // roata (la n = 0)
  g.rS = g.rR * 0.82;              // raza filetului
  g.xAer = g.XS + 40;              // șurubul de aerisire
  g.xMano = 380;
  const E = SV.el;

  const defs = mk("defs", {}, svg);
  grad(defs, "gOtel", STOP.otel);
  grad(defs, "gOtelR", STOP.otel, { x1: 0, y1: 0, x2: 1, y2: 1 });
  grad(defs, "gCrom", STOP.crom);
  grad(defs, "gInterior", STOP.interior);
  grad(defs, "gAlbastru", STOP.albastru);
  grad(defs, "gAlbastruO", STOP.albastru, { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gAlama", STOP.alama);
  grad(defs, "gAlamaO", STOP.alama, { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gCauciuc", STOP.cauciuc);
  grad(defs, "gRosu", STOP.rosu, { radial: true, cx: 0.4, cy: 0.35, r: 0.7 });
  const c = FLUIDE[sim.fluid].culoare;
  grad(defs, "gLichid", [[0, shade(c, 1.35), 0.72], [0.18, shade(c, 1.12), 0.78], [0.55, c, 0.84], [1, shade(c, 0.62), 0.92]]);
  grad(defs, "gLuciu", [[0, "#fff", 0.55], [1, "#fff", 0]]);
  grad(defs, "gBula", [[0, "#ffffff", 1], [0.28, "#ffffff", 0.65], [0.72, "#e8f0f7", 0.25], [0.92, "#9fb0c2", 0.55], [1, "#5d6b7a", 0.9]], { radial: true, cx: 0.5, cy: 0.5, r: 0.5, fx: 0.36, fy: 0.3 });
  grad(defs, "gCadran", [[0, "#ffffff"], [0.75, "#f7f7f4"], [1, "#dfe2e5"]], { radial: true, cx: 0.45, cy: 0.4, r: 0.65 });
  grad(defs, "gRama", [[0, "#ffffff"], [0.3, "#c8ced5"], [0.55, "#6f7882"], [0.8, "#d9dee3"], [1, "#59616a"]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  grad(defs, "gSticla", [[0, "#ffffff", 0.75], [0.45, "#ffffff", 0.12], [1, "#ffffff", 0]], { x1: 0, y1: 0, x2: 0.7, y2: 1 });
  grad(defs, "gEcran", [[0, "#d8ecff", 0.22], [0.5, "#ffffff", 0.06], [1, "#cfe6ff", 0.16]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  grad(defs, "gSeringa", [[0, "#ffffff", 0.75], [0.5, "#e9f3fb", 0.35], [1, "#b9c9d8", 0.7]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  filtre(defs);
  const clip = mk("clipPath", { id: "cpFilet" }, defs);
  E.clipFilet = mk("rect", { x: g.xNut, y: g.YA - g.rS - 2, width: g.xCol - g.xNut, height: 2 * g.rS + 4 }, clip);

  /* umbra la sol + placa de bază */
  mk("ellipse", { cx: 470, cy: 356, rx: 420, ry: 9, fill: "#000", opacity: 0.22, filter: "url(#fBlur6)" }, svg);
  mk("rect", { x: 56, y: 338, width: 830, height: 17, rx: 3, fill: "url(#gAlbastru)" }, svg);
  mk("line", { x1: 60, y1: 339.2, x2: 882, y2: 339.2, stroke: "#9fbbe8", "stroke-width": 1, opacity: 0.7 }, svg);
  [78, 470, 864].forEach(x => surub(svg, x, 346.5, 4.5));
  E.balta = mk("ellipse", { cx: g.xGl + 15, cy: 339, rx: 0, ry: 2.5, fill: shade(c, 0.85), opacity: 0.75 }, svg);

  /* furtun (opțional) */
  E.furtun = mk("g", {}, svg);
  const dF = `M${g.XS + 70} ${g.YO2 + 4} C ${g.XS + 70} ${g.YO2 + 44}, ${g.XS - 40} ${g.YO2 + 50}, ${g.XS - 78} ${g.YO2 + 22} C ${g.XS - 104} ${g.YO2}, ${g.XS - 100} ${g.YA - 30}, ${g.XS - 78} ${g.YA - 44}`;
  E.furtunBaza = mk("path", { d: dF, fill: "none", stroke: "#141518", "stroke-width": 13, "stroke-linecap": "round" }, E.furtun);
  E.furtunTesut = mk("path", { d: dF, fill: "none", stroke: "#3b3e44", "stroke-width": 11, "stroke-dasharray": "2 3", opacity: 0.7 }, E.furtun);
  E.furtunLuciu = mk("path", { d: dF, fill: "none", stroke: "#8a9099", "stroke-width": 2.2, opacity: 0.55, transform: "translate(-2,-3)" }, E.furtun);
  mk("rect", { x: g.XS + 62, y: g.YO2 - 2, width: 16, height: 16, rx: 2, fill: "url(#gOtelR)" }, E.furtun);
  mk("rect", { x: g.XS - 86, y: g.YA - 58, width: 16, height: 18, rx: 2, fill: "url(#gOtelR)" }, E.furtun);
  mk("rect", { x: g.XS - 90, y: g.YA - 64, width: 24, height: 8, rx: 2, fill: "url(#gAlama)" }, E.furtun);

  /* suporturi */
  [g.XS + 58, g.XD - 58].forEach(xc => {
    const R = g.rB + g.w;
    mk("path", { d: `M${xc - 30} 338 L${xc - 24} ${g.YO2 + 3} A ${R} ${R} 0 0 0 ${xc + 24} ${g.YO2 + 3} L${xc + 30} 338 Z`, fill: "url(#gAlbastruO)" }, svg);
    mk("line", { x1: xc - 23, y1: g.YO2 + 5, x2: xc - 28, y2: 336, stroke: "#9fbbe8", "stroke-width": 1, opacity: 0.6 }, svg);
    surub(svg, xc - 18, 330, 3.6); surub(svg, xc + 18, 330, 3.6);
  });

  /* ============ corpul piezometrului (cu umbră) */
  const ap = mk("g", { filter: "url(#fUmbra)" }, svg);
  // flanșa stângă + șuruburi
  mk("rect", { x: g.XS - 46, y: g.YA - g.rF + 10, width: 12, height: 14, fill: "url(#gOtel)" }, ap);
  mk("rect", { x: g.XS - 46, y: g.YA + g.rF - 24, width: 12, height: 14, fill: "url(#gOtel)" }, ap);
  mk("rect", { x: g.XS - 34, y: g.YA - g.rF, width: 34, height: 2 * g.rF, rx: 4, fill: "url(#gOtel)" }, ap);
  mk("line", { x1: g.XS - 1, y1: g.YA - g.rF + 2, x2: g.XS - 1, y2: g.YA + g.rF - 2, stroke: "#3c4248", "stroke-width": 1.2, opacity: 0.6 }, ap);
  surub(ap, g.XS - 17, g.YA - g.rF + 13, 6); surub(ap, g.XS - 17, g.YA + g.rF - 13, 6);
  // tubul exterior
  mk("rect", { x: g.XS, y: g.YO1, width: g.XD - g.XS, height: g.YO2 - g.YO1, fill: "url(#gOtel)" }, ap);
  // fereastra secționată
  const xc1 = g.XS + 12, xc2 = g.XD - 12, wc = xc2 - xc1;
  mk("rect", { x: xc1, y: g.YO1, width: wc, height: g.w, fill: "url(#pPeriat)" }, ap);
  mk("rect", { x: xc1, y: g.YO1, width: wc, height: g.w, fill: "url(#pHasura)" }, ap);
  mk("rect", { x: xc1, y: g.YJ, width: wc, height: g.w, fill: "url(#pPeriat)" }, ap);
  mk("rect", { x: xc1, y: g.YJ, width: wc, height: g.w, fill: "url(#pHasura)" }, ap);
  mk("line", { x1: xc1, y1: g.YO1 + 0.6, x2: xc2, y2: g.YO1 + 0.6, stroke: "#fff", "stroke-width": 1.2, opacity: 0.9 }, ap);
  mk("line", { x1: xc1, y1: g.YO2 - 0.6, x2: xc2, y2: g.YO2 - 0.6, stroke: "#5a6168", "stroke-width": 1.2 }, ap);
  mk("rect", { x: xc1, y: g.YS, width: wc, height: 2 * g.rB, fill: "url(#gInterior)" }, ap);
  // canale (port manometru, port aerisire, port furtun)
  mk("rect", { x: g.xMano - 4, y: g.YO1, width: 8, height: g.w + 1, fill: "#2b3036" }, ap);
  mk("rect", { x: g.xAer - 3, y: g.YO1, width: 6, height: g.w + 1, fill: "#2b3036" }, ap);
  E.portFurtun = mk("rect", { x: g.XS + 66, y: g.YJ - 1, width: 8, height: g.w + 1, fill: "#2b3036" }, ap);
  // lichidul
  E.lichid = mk("rect", { x: xc1, y: g.YS, width: wc, height: 2 * g.rB, fill: "url(#gLichid)" }, ap);
  mk("rect", { x: xc1, y: g.YS + 3, width: wc, height: g.rB * 0.42, fill: "url(#gLuciu)", opacity: 0.55, filter: "url(#fBlur1)" }, ap);
  E.caustice = mk("g", { opacity: 0.22 }, ap);
  E.c1 = mk("path", { fill: "none", stroke: "#fff8d8", "stroke-width": 1.4 }, E.caustice);
  E.c2 = mk("path", { fill: "none", stroke: "#fff8d8", "stroke-width": 1 }, E.caustice);
  E.sageti = mk("g", {}, ap);
  E.bule = mk("g", {}, ap);
  E.etLichid = mk("text", { x: xc1 + 8, y: g.YJ - 22, "font-size": 12, fill: "#2f2306", "font-weight": 600 }, ap);
  E.etLichid2 = mk("text", { x: xc1 + 8, y: g.YJ - 8, "font-size": 11.5, fill: "#2f2306" }, ap);
  // margini de tăietură (curbură)
  [xc1, xc2].forEach((x, i) => mk("path", { d: `M${x} ${g.YO1} A 7 ${(g.YO2 - g.YO1) / 2} 0 0 ${i ? 1 : 0} ${x} ${g.YO2}`, fill: "none", stroke: "#000", "stroke-width": 1.4, opacity: 0.35 }, ap));

  // pistonul / tija (partea interioară) – mobilă
  E.mobilInt = mk("g", {}, ap);
  mk("rect", { x: g.tip0, y: g.YA - g.rR, width: g.xNut - g.tip0 + 4, height: 2 * g.rR, fill: "url(#gCrom)" }, E.mobilInt);
  mk("ellipse", { cx: g.tip0, cy: g.YA, rx: 3.5, ry: g.rR, fill: "#c8ced4", stroke: "#6f7780", "stroke-width": 0.8 }, E.mobilInt);
  mk("line", { x1: g.tip0 + 3, y1: g.YA - g.rR + 1, x2: g.tip0 + 3, y2: g.YA + g.rR - 1, stroke: "#fff", "stroke-width": 0.8, opacity: 0.8 }, E.mobilInt);

  // inelul necret din dreapta + garnitura O-ring
  mk("rect", { x: xc2, y: g.YO1, width: 12, height: g.YO2 - g.YO1, fill: "url(#gOtel)" }, ap);
  mk("rect", { x: xc2 - 3, y: g.YA - g.rR - 4, width: 6, height: 4, rx: 2, fill: "#1f5b4d" }, ap);
  mk("rect", { x: xc2 - 3, y: g.YA + g.rR, width: 6, height: 4, rx: 2, fill: "#1f5b4d" }, ap);
  mk("rect", { x: g.XS, y: g.YO1, width: 12, height: g.YO2 - g.YO1, fill: "url(#gOtel)" }, ap);
  // flanșa dreaptă
  mk("rect", { x: g.XD, y: g.YA - g.rF, width: 36, height: 2 * g.rF, rx: 4, fill: "url(#gOtel)" }, ap);
  mk("rect", { x: g.XD + 36, y: g.YA - g.rF + 10, width: 10, height: 14, fill: "url(#gOtel)" }, ap);
  mk("rect", { x: g.XD + 36, y: g.YA + g.rF - 24, width: 10, height: 14, fill: "url(#gOtel)" }, ap);
  surub(ap, g.XD + 18, g.YA - g.rF + 13, 6); surub(ap, g.XD + 18, g.YA + g.rF - 13, 6);
  // piulița-presetupă (alamă, hexagonală)
  const hN = g.rR + 12;
  mk("rect", { x: g.xGl, y: g.YA - hN, width: 30, height: 2 * hN, rx: 2, fill: "url(#gAlama)" }, ap);
  mk("line", { x1: g.xGl, y1: g.YA - hN * 0.5, x2: g.xGl + 30, y2: g.YA - hN * 0.5, stroke: "#fff3c4", "stroke-width": 1, opacity: 0.7 }, ap);
  mk("line", { x1: g.xGl, y1: g.YA + hN * 0.5, x2: g.xGl + 30, y2: g.YA + hN * 0.5, stroke: "#5f430f", "stroke-width": 1, opacity: 0.6 }, ap);
  E.scurgere = mk("g", {}, svg);

  // tija filetată exterioară (mobilă) – corpul
  E.mobilExt = mk("g", {}, svg);
  mk("rect", { x: g.xNut, y: g.YA - g.rS, width: g.xCol - g.xNut + 2, height: 2 * g.rS, fill: "url(#gCrom)" }, E.mobilExt);
  // filetul (static: la un șurub care se înșurubează într-o piuliță fixă, spirele par să stea pe loc)
  const fil = mk("g", { "clip-path": "url(#cpFilet)" }, svg);
  const pas = Math.max(2.2, sim.s * g.PX);
  for (let x = g.xNut - 40; x < g.xCol + 60; x += pas) {
    mk("line", { x1: x, y1: g.YA - g.rS, x2: x + pas * 0.55, y2: g.YA + g.rS, stroke: "#2f353b", "stroke-width": 0.9, opacity: 0.55 }, fil);
    mk("line", { x1: x + 0.9, y1: g.YA - g.rS, x2: x + 0.9 + pas * 0.55, y2: g.YA + g.rS, stroke: "#ffffff", "stroke-width": 0.6, opacity: 0.55 }, fil);
  }
  mk("rect", { x: g.xNut - 40, y: g.YA - g.rS, width: 400, height: 3, fill: "#fff", opacity: 0.25 }, fil);
  // gulerul gradat + roata – desenate dinamic
  E.roata = mk("g", {}, svg);

  /* șurub de aerisire (cu capac animat) */
  mk("rect", { x: g.xAer - 7, y: g.YO1 - 16, width: 14, height: 16, fill: "url(#gOtelR)" }, svg);
  mk("rect", { x: g.xAer - 10, y: g.YO1 - 24, width: 20, height: 9, rx: 1.5, fill: "url(#gAlamaO)" }, svg);
  E.capAer = mk("g", {}, svg);
  mk("rect", { x: g.xAer - 7, y: g.YO1 - 38, width: 14, height: 14, rx: 2, fill: "url(#gOtelR)" }, E.capAer);
  for (let x = g.xAer - 6; x < g.xAer + 7; x += 2) mk("line", { x1: x, y1: g.YO1 - 37, x2: x, y2: g.YO1 - 25, stroke: "#59616a", "stroke-width": 0.7 }, E.capAer);
  E.aerisire = mk("g", {}, svg);

  /* manometrul */
  const MX = g.xMano, MR = 50, MY = g.YO1 - MR - 40;
  SV.mano = { MX, MY, MR };
  mk("rect", { x: MX - 4, y: MY + MR - 2, width: 8, height: g.YO1 - (MY + MR) + 2, fill: "url(#gAlamaO)" }, svg);
  mk("rect", { x: MX - 10, y: g.YO1 - 18, width: 20, height: 12, rx: 1.5, fill: "url(#gAlamaO)" }, svg);
  mk("rect", { x: MX - 7, y: MY + MR - 4, width: 14, height: 10, rx: 1.5, fill: "url(#gAlamaO)" }, svg);
  const gm = mk("g", { filter: "url(#fUmbra)" }, svg);
  mk("circle", { cx: MX, cy: MY, r: MR + 7, fill: "url(#gRama)" }, gm);
  mk("circle", { cx: MX, cy: MY, r: MR + 2.5, fill: "#8d959e" }, gm);
  mk("circle", { cx: MX, cy: MY, r: MR, fill: "url(#gCadran)" }, gm);
  const ang = p => (-135 + 270 * p / 160) * Math.PI / 180; // 0 = sus
  const P = (r, p) => [MX + r * Math.sin(ang(p)), MY - r * Math.cos(ang(p))];
  // zona roșie peste 100 bar
  { const [x1, y1] = P(MR - 7, 100), [x2, y2] = P(MR - 7, 160); mk("path", { d: `M${x1} ${y1} A ${MR - 7} ${MR - 7} 0 0 1 ${x2} ${y2}`, fill: "none", stroke: "#d32f2f", "stroke-width": 4.5 }, gm); }
  for (let p = 0; p <= 160; p += 2) {
    const maj = p % 20 === 0, med = p % 10 === 0;
    const [x1, y1] = P(MR - 3, p), [x2, y2] = P(MR - 3 - (maj ? 9 : med ? 6.5 : 3.5), p);
    mk("line", { x1, y1, x2, y2, stroke: "#1b1b1b", "stroke-width": maj ? 1.5 : 0.7 }, gm);
    if (maj) { const [xt, yt] = P(MR - 19, p); const t = mk("text", { x: xt, y: yt + 3.5, "font-size": 9, "text-anchor": "middle", fill: "#1b1b1b", "font-weight": 600 }, gm); t.textContent = p; }
  }
  const t1 = mk("text", { x: MX, y: MY + 20, "font-size": 9, "text-anchor": "middle", fill: "#333", "font-weight": 700 }, gm); t1.textContent = "bar";
  const t2 = mk("text", { x: MX, y: MY + 31, "font-size": 6.5, "text-anchor": "middle", fill: "#666" }, gm); t2.textContent = "cl. 1,0 · EN 837-1";
  E.acUmbra = mk("g", { opacity: 0.28, filter: "url(#fBlur1)" }, gm);
  E.ac = mk("g", {}, gm);
  [E.acUmbra, E.ac].forEach((grp, i) => {
    mk("polygon", { points: `0,${-(MR - 8)} -2.6,4 -1.6,11 1.6,11 2.6,4`, fill: i ? "#c62828" : "#000" }, grp);
    if (i) mk("line", { x1: 0, y1: -(MR - 10), x2: 0, y2: 0, stroke: "#ff8a80", "stroke-width": 0.6, opacity: 0.7 }, grp);
  });
  mk("circle", { cx: MX, cy: MY, r: 5, fill: "url(#gOtelR)", stroke: "#444", "stroke-width": 0.6 }, gm);
  mk("path", { d: `M${MX - MR + 4} ${MY - 6} A ${MR - 4} ${MR - 4} 0 0 1 ${MX + 18} ${MY - MR + 6} Q ${MX - 8} ${MY - 26} ${MX - MR + 4} ${MY - 6} Z`, fill: "url(#gSticla)" }, gm);

  /* ecranul de protecție (policarbonat) */
  E.ecran = mk("g", {}, svg);
  mk("rect", { x: 60, y: 118, width: 8, height: 220, rx: 2, fill: "url(#gOtelR)" }, E.ecran);
  mk("rect", { x: 712, y: 118, width: 8, height: 220, rx: 2, fill: "url(#gOtelR)" }, E.ecran);
  mk("rect", { x: 66, y: 122, width: 648, height: 206, rx: 5, fill: "url(#gEcran)", stroke: "rgba(170,205,240,.75)", "stroke-width": 1.6 }, E.ecran);
  mk("path", { d: "M90 128 L150 128 L80 322 L70 322 Z", fill: "#fff", opacity: 0.12 }, E.ecran);
  mk("path", { d: "M170 128 L188 128 L118 322 L110 322 Z", fill: "#fff", opacity: 0.08 }, E.ecran);
  mk("path", { d: "M600 128 L640 128 L590 322 L560 322 Z", fill: "#fff", opacity: 0.08 }, E.ecran);
  const te = mk("text", { x: 704, y: 138, "font-size": 10.5, "text-anchor": "end", fill: "#4d7fb8" }, E.ecran); te.textContent = "ecran de protecție (policarbonat)";

  /* seringa (animație) */
  E.seringa = mk("g", { opacity: 0 }, svg);
  const sx = g.xAer, sy0 = g.YO1 - 30; // vârful acului
  mk("line", { x1: sx, y1: sy0, x2: sx, y2: sy0 - 22, stroke: "#9aa3ac", "stroke-width": 1.4 }, E.seringa);
  mk("rect", { x: sx - 4, y: sy0 - 28, width: 8, height: 7, rx: 1, fill: "#2c7a9b", opacity: 0.85 }, E.seringa);
  mk("rect", { x: sx - 9, y: sy0 - 92, width: 18, height: 64, rx: 3, fill: "url(#gSeringa)", stroke: "#8aa0b6", "stroke-width": 0.8 }, E.seringa);
  for (let k = 0; k <= 10; k++) mk("line", { x1: sx - 9, y1: sy0 - 34 - k * 5.4, x2: sx - (k % 5 ? 5 : 2), y2: sy0 - 34 - k * 5.4, stroke: "#36424f", "stroke-width": 0.6 }, E.seringa);
  mk("rect", { x: sx - 14, y: sy0 - 95, width: 28, height: 4, rx: 1.5, fill: "#e6edf3", stroke: "#8aa0b6", "stroke-width": 0.6 }, E.seringa);
  E.piston = mk("g", {}, E.seringa);
  mk("rect", { x: sx - 2.5, y: sy0 - 126, width: 5, height: 40, fill: "#f3f6f9", stroke: "#9fb0c0", "stroke-width": 0.6 }, E.piston);
  mk("rect", { x: sx - 8, y: sy0 - 90, width: 16, height: 6, rx: 1, fill: "#2b2f35" }, E.piston);
  mk("rect", { x: sx - 11, y: sy0 - 130, width: 22, height: 5, rx: 2, fill: "#f3f6f9", stroke: "#9fb0c0", "stroke-width": 0.6 }, E.piston);

  /* vederea frontală a roții (cadran) */
  const RX = 790, RY = 72, RR = 46;
  SV.roataF = { RX, RY, RR };
  mk("circle", { cx: RX, cy: RY, r: RR + 18, fill: "var(--suprafata-2)", stroke: "var(--linie)" }, svg);
  E.roataF = mk("g", { style: "cursor:grab" }, svg);
  mk("circle", { cx: RX, cy: RY, r: RR + 9, fill: "none", stroke: "url(#gRama)", "stroke-width": 14 }, E.roataF);
  for (let k = 0; k < 100; k++) {
    const a = -k / 100 * 2 * Math.PI, l = k % 10 === 0 ? 8 : k % 5 === 0 ? 6 : 3.5;
    const r1 = RR + 15.5, r2 = r1 - l;
    mk("line", { x1: RX + r1 * Math.sin(a), y1: RY - r1 * Math.cos(a), x2: RX + r2 * Math.sin(a), y2: RY - r2 * Math.cos(a), stroke: "#20252b", "stroke-width": k % 10 ? 0.6 : 1.1 }, E.roataF);
    if (k % 10 === 0) { const rt = RR + 4; const t = mk("text", { x: RX + rt * Math.sin(a), y: RY - rt * Math.cos(a) + 2.4, "font-size": 6.5, "text-anchor": "middle", fill: "#20252b", transform: `rotate(${a * 180 / Math.PI} ${RX + rt * Math.sin(a)} ${RY - rt * Math.cos(a)})` }, E.roataF); t.textContent = k; }
  }
  mk("circle", { cx: RX, cy: RY, r: RR - 9, fill: "none", stroke: "#0e1d36", "stroke-width": 9, opacity: 0.6, transform: "translate(1.5,2)" }, E.roataF);
  mk("circle", { cx: RX, cy: RY, r: RR - 9, fill: "none", stroke: "url(#gAlbastru)", "stroke-width": 8 }, E.roataF);
  mk("circle", { cx: RX, cy: RY, r: RR - 11, fill: "none", stroke: "#a9c3ee", "stroke-width": 1, opacity: 0.6 }, E.roataF);
  for (let k = 0; k < 3; k++) {
    const a = k * 2 * Math.PI / 3;
    const cs = Math.cos(a), sn = Math.sin(a);
    const pt = (r, off) => `${RX + r * sn + off * cs},${RY - r * cs + off * sn}`;
    mk("path", { d: `M${pt(8, -4)} Q${pt(20, -8)} ${pt(RR - 12, -3.5)} L${pt(RR - 12, 3.5)} Q${pt(20, 2)} ${pt(8, 4)} Z`, fill: "url(#gAlbastru)", stroke: "#132848", "stroke-width": 0.6 }, E.roataF);
  }
  mk("circle", { cx: RX, cy: RY, r: 9, fill: "url(#gOtelR)", stroke: "#3c4248", "stroke-width": 0.8 }, E.roataF);
  mk("circle", { cx: RX, cy: RY, r: 3, fill: "#3c4248" }, E.roataF);
  mk("circle", { cx: RX + (RR - 9) * Math.sin(2.1), cy: RY - (RR - 9) * Math.cos(2.1), r: 5.5, fill: "url(#gRosu)", stroke: "#4a0a0a", "stroke-width": 0.6 }, E.roataF);
  mk("circle", { cx: RX, cy: RY, r: RR + 18, fill: "transparent" }, E.roataF);
  mk("polygon", { points: `${RX - 5},${RY - RR - 22} ${RX + 5},${RY - RR - 22} ${RX},${RY - RR - 13}`, fill: "#d32f2f" }, svg);
  const tf1 = mk("text", { x: RX - RR - 24, y: RY + 2, "font-size": 10.5, "text-anchor": "end", fill: "var(--text-sec)" }, svg); tf1.textContent = "vedere";
  const tf2 = mk("text", { x: RX - RR - 24, y: RY + 15, "font-size": 10.5, "text-anchor": "end", fill: "var(--text-sec)" }, svg); tf2.textContent = "din dreapta";
  const tf3 = mk("text", { x: RX - RR - 24, y: RY + 28, "font-size": 10.5, "text-anchor": "end", fill: "var(--text-sec)" }, svg); tf3.textContent = "(trageți)";

  /* etichete cu linii de indicație */
  E.etichete = mk("g", { "font-size": 11.5, fill: "var(--text-sec)" }, svg);
  const et = (x, y, t, x2, y2, anchor = "start") => {
    mk("line", { x1: x2, y1: y2, x2: anchor === "end" ? x + 3 : x - 3, y2: y - 4, stroke: "var(--text-sec)", "stroke-width": 0.8 }, E.etichete);
    mk("circle", { cx: x2, cy: y2, r: 2, fill: "var(--text-sec)" }, E.etichete);
    const e = mk("text", { x, y, "text-anchor": anchor }, E.etichete); e.textContent = t; return e;
  };
  et(MX + 72, 34, "manometru 0…160 bar", MX + MR + 6, MY - 12);
  et(g.xAer - 36, 98, "șurub de aerisire", g.xAer, g.YO1 - 32, "end");
  E.etCil = et(140, 380, "", g.XS + 18, g.YO2 - 4);
  E.etPiston = mk("text", { x: g.xNut + 4, y: g.YA + g.rS + 24, "font-size": 11.5 }, E.etichete);
  const tr = mk("text", { x: g.xRoata - 6, y: 326, "font-size": 11.5, "text-anchor": "middle" }, E.etichete); tr.textContent = "roată de manevră";
  E.cursa = mk("text", { x: g.xNut + 4, y: g.YA + g.rS + 40, "font-size": 11, fill: "var(--text-sec)" }, svg);

  // tragere de roată (în vederea frontală)
  let trag = null;
  const unghi = ev => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return Math.atan2(q.y - RY, q.x - RX); };
  E.roataF.addEventListener("pointerdown", ev => { trag = unghi(ev); E.roataF.setPointerCapture(ev.pointerId); E.roataF.style.cursor = "grabbing"; ev.preventDefault(); });
  E.roataF.addEventListener("pointermove", ev => { if (trag === null) return; const a = unghi(ev); let d = a - trag; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; trag = a; sim.tintaN = null; roteste(d / (2 * Math.PI)); });
  const stop = () => { trag = null; E.roataF.style.cursor = "grab"; };
  E.roataF.addEventListener("pointerup", stop); E.roataF.addEventListener("pointercancel", stop);

  prefixeazaId(svg, "pz-");
  SV.buleNeaer = [];
  for (let i = 0; i < 11; i++) SV.buleNeaer.push({ x: xc1 + 30 + Math.random() * (wc - 140), r: 0.5 + Math.random() * 0.9, ph: Math.random() * 6 });
  SV.anim.ecran = document.getElementById("ck-ecran").checked ? 1 : 0;
}

/* ---- roata laterală, gulerul gradat (dinamic, cu perspectivă) */
function roataLaterala(dx, th) {
  const g = SV.g;
  const xc = g.xCol - dx, xw = g.xRoata - dx, Rc = g.rR + 13, R = 78, rx = 10;
  let s = "";
  // butucul gulerului + gulerul
  s += `<rect x="${xc - 2}" y="${g.YA - g.rS - 3}" width="6" height="${2 * g.rS + 6}" fill="url(#pz-gOtel)"/>`;
  s += `<rect x="${xc + 4}" y="${g.YA - Rc}" width="24" height="${2 * Rc}" rx="3" fill="url(#pz-gOtel)"/>`;
  for (let k = 0; k < 50; k++) {
    const a = th + k * 2 * Math.PI / 50;
    if (Math.sin(a) <= 0.05) continue;
    const y = g.YA - Rc * Math.cos(a), l = k % 10 === 0 ? 11 : k % 5 === 0 ? 8 : 5;
    s += `<line x1="${xc + 4}" y1="${y}" x2="${xc + 4 + l}" y2="${y}" stroke="#1d2227" stroke-width="${k % 10 ? 0.7 : 1.2}" opacity="${0.35 + 0.65 * Math.sin(a)}"/>`;
  }
  // tija spre roată + butuc
  s += `<rect x="${xc + 28}" y="${g.YA - g.rS}" width="${xw - xc - 28}" height="${2 * g.rS}" fill="url(#pz-gCrom)"/>`;
  // spițele din spate
  const spite = [];
  for (let k = 0; k < 5; k++) { const a = th + k * 2 * Math.PI / 5; spite.push({ a, z: Math.sin(a) }); }
  const spita = sp => {
    const y = g.YA - (R - 6) * Math.cos(sp.a), x = xw + rx * Math.sin(sp.a) * 0.9;
    const c = sp.z < 0 ? "#1c3560" : "url(#pz-gAlbastru)";
    return `<path d="M${xw - 2} ${g.YA - 5} Q ${(xw + x) / 2 + 3} ${(g.YA + y) / 2} ${x} ${y - 4} L ${x} ${y + 4} Q ${(xw + x) / 2 - 3} ${(g.YA + y) / 2} ${xw - 2} ${g.YA + 5} Z" fill="${c}" opacity="${sp.z < 0 ? 0.85 : 1}"/>`;
  };
  spite.filter(sp => sp.z < 0).forEach(sp => s += spita(sp));
  // mânerul, dacă e în spate
  const mY = g.YA - R * Math.cos(th), mX = xw + rx * Math.sin(th);
  const maner = `<rect x="${mX}" y="${mY - 5.5}" width="30" height="11" rx="5" fill="url(#pz-gCauciuc)"/><rect x="${mX - 3}" y="${mY - 3}" width="6" height="6" fill="url(#pz-gOtel)"/>`;
  if (Math.sin(th) < 0) s += maner;
  // janta (tor văzut aproape din profil)
  s += `<ellipse cx="${xw + 1.5}" cy="${g.YA + 2}" rx="${rx}" ry="${R}" fill="none" stroke="#0e1d36" stroke-width="10" opacity=".45"/>`;
  s += `<ellipse cx="${xw}" cy="${g.YA}" rx="${rx}" ry="${R}" fill="none" stroke="url(#pz-gAlbastruO)" stroke-width="9"/>`;
  s += `<ellipse cx="${xw - 2}" cy="${g.YA}" rx="${rx - 3}" ry="${R - 2}" fill="none" stroke="#b9d0f5" stroke-width="1" opacity=".55"/>`;
  s += `<rect x="${xw - 14}" y="${g.YA - 16}" width="22" height="32" rx="4" fill="url(#pz-gAlbastru)"/>`;
  s += `<rect x="${xw + 8}" y="${g.YA - 7}" width="9" height="14" rx="2" fill="url(#pz-gOtel)"/>`;
  spite.filter(sp => sp.z >= 0).forEach(sp => s += spita(sp));
  if (Math.sin(th) >= 0) s += maner;
  SV.el.roata.innerHTML = s;
}

/* ---- bulele de aer */
function bulaSVG(x, yTop, r, t, ph) {
  const w = 1 + 0.035 * Math.sin(t * 5 + ph), rx = r * 1.12 * w, ry = r * 0.9 / w; // turtită de peretele de sus
  const cy = yTop + ry + 0.5;
  return `<ellipse cx="${x}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#pz-gBula)" stroke="rgba(70,80,95,.55)" stroke-width="0.7"/>` +
    (r > 3 ? `<ellipse cx="${x - rx * 0.35}" cy="${cy - ry * 0.4}" rx="${rx * 0.28}" ry="${ry * 0.18}" fill="#fff" opacity=".9"/><path d="M${x - rx * 0.6} ${cy + ry * 0.45} Q ${x} ${cy + ry * 0.85} ${x + rx * 0.6} ${cy + ry * 0.45}" fill="none" stroke="#fff" stroke-width="0.8" opacity=".6"/>` : "");
}
const rPx = Vcm3 => Math.cbrt(3 * Vcm3 * 1000 / (4 * Math.PI)) * 4.5; // rază [px] la scara transversală

/* ======================================================================= actualizare la fiecare cadru */
function actualizeazaSVG(p, pAc, dt) {
  const g = SV.g, E = SV.el, A = SV.anim;
  A.t += dt;
  const t = A.t;
  const dx = sim.n * sim.s * g.PX;
  const th = sim.n * 2 * Math.PI;
  E.mobilInt.setAttribute("transform", `translate(${-dx},0)`);
  E.mobilExt.setAttribute("transform", `translate(${-dx},0)`);
  E.clipFilet.setAttribute("width", Math.max(0, g.xCol - dx - g.xNut));
  roataLaterala(dx, th);
  E.roataF.setAttribute("transform", `rotate(${(sim.n * 360) % 360} ${SV.roataF.RX} ${SV.roataF.RY})`);

  // acul manometrului (cu ușoară vibrație când se rotește roata)
  const vib = (sim.tine || sim.tintaN !== null) && p > 1 ? Math.sin(t * 47) * 0.25 : 0;
  const a = -135 + 270 * clamp(pAc + vib, -1.5, 166) / 160;
  E.ac.setAttribute("transform", `translate(${SV.mano.MX},${SV.mano.MY}) rotate(${a})`);
  E.acUmbra.setAttribute("transform", `translate(${SV.mano.MX + 1.8},${SV.mano.MY + 2.6}) rotate(${a})`);

  // caustice în lichid
  const xc1 = g.XS + 12, xc2 = g.XD - 12 - dx * 0, y1 = g.YS + g.rB * 0.55, y2 = g.YS + g.rB * 1.25;
  let d1 = `M${xc1} ${y1}`, d2 = `M${xc1} ${y2}`;
  for (let x = xc1; x <= xc2; x += 12) { d1 += ` L${x} ${y1 + 2.2 * Math.sin(x / 23 + t * 0.9)}`; d2 += ` L${x} ${y2 + 1.8 * Math.sin(x / 31 - t * 0.7)}`; }
  E.c1.setAttribute("d", d1); E.c2.setAttribute("d", d2);

  // forțele de presiune (legea lui Pascal)
  const arataS = document.getElementById("ck-sageti")?.checked !== false && p > 0.3;
  if (arataS) {
    const L = 8 + Math.min(1, p / 100) * (g.rB - 18);
    let s = "";
    [g.XS + 250, g.XS + 330, g.XS + 410].forEach(x => {
      if (x > g.tip0 - dx - 10) return;
      s += `<line x1="${x}" y1="${g.YA - 6}" x2="${x}" y2="${g.YA - 6 - L}" stroke="#5a3d00" stroke-width="1.6" opacity=".55" marker-end="url(#mS)"/>`;
      s += `<line x1="${x}" y1="${g.YA + 6}" x2="${x}" y2="${g.YA + 6 + L}" stroke="#5a3d00" stroke-width="1.6" opacity=".55" marker-end="url(#mS)"/>`;
    });
    const xt = g.tip0 - dx - 6;
    s += `<line x1="${xt}" y1="${g.YA}" x2="${xt - 6 - L * 0.7}" y2="${g.YA}" stroke="#5a3d00" stroke-width="1.6" opacity=".55" marker-end="url(#mS)"/>`;
    if (!document.getElementById("mS")) {
      const m = mk("marker", { id: "mS", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 4.5, markerHeight: 4.5, orient: "auto" }, document.querySelector("#svg-piezo defs"));
      mk("path", { d: "M0 0L10 5L0 10z", fill: "#5a3d00" }, m);
    }
    E.sageti.innerHTML = s;
  } else E.sageti.innerHTML = "";

  // bule
  let sb = "";
  const f = P_ATM / (P_ATM + Math.max(0, p));
  if (!sim.aerisit || A.aerisire) {
    const prog = A.aerisire ? clamp((performance.now() - A.aerisire) / 1800, 0, 1) : 0;
    SV.buleNeaer.forEach(b => {
      const x = b.x + (g.xAer - b.x) * prog * prog;
      const r = rPx(b.r * AER_NEAERISIT / 9 * f) * (1 - prog);
      if (r > 0.3) sb += bulaSVG(x + Math.sin(t * 2 + b.ph) * 0.6, g.YS, Math.max(0.9, r), t, b.ph);
    });
  }
  if (sim.Vinj > 0) {
    const nb = Math.max(1, sim.nBule || 1), Vb = sim.Vinj / nb;
    const arataE = document.getElementById("ck-etichete")?.checked !== false;
    let u = A.seringa ? (performance.now() - A.seringa) / 1000 : 9;
    if (u > 2.6 + 0.35 * nb) A.seringa = null;
    for (let i = 0; i < nb; i++) {
      const xf = g.XS + 95 + i * 62 + (i % 2) * 6;
      let x = xf, scale = 1;
      const ui = u - i * 0.35; // bulele intră una după alta
      if (ui < 0.6) scale = 0;
      else if (ui < 1.6) { scale = ui - 0.6; x = g.xAer; }
      else if (ui < 2.6) { const k = ui - 1.6; x = g.xAer + (xf - g.xAer) * (1 - Math.pow(1 - k, 3)); }
      const r = rPx(Vb * f) * Math.cbrt(scale);
      if (r > 0.2) sb += bulaSVG(x + Math.sin(t * 1.7 + i) * 0.5, g.YS, Math.max(1, r), t, i * 1.3);
    }
    if (arataE && u > 2.6) sb += `<text x="${g.XS + 95 + nb * 62 + 4}" y="${g.YS + rPx(Vb * f) + 6}" font-size="10.5" fill="#2f2306">${nb} × Ø${fmt(sim.dBula, 1)} mm → ${fmt(sim.Vinj * f, 3)} cm³</text>`;
  }
  E.bule.innerHTML = sb;

  // animația aerisirii (capac ridicat, bule și o picătură)
  if (A.aerisire) {
    const u = (performance.now() - A.aerisire) / 1000;
    const lift = u < 0.3 ? u / 0.3 : u < 2.0 ? 1 : u < 2.3 ? 1 - (u - 2.0) / 0.3 : 0;
    E.capAer.setAttribute("transform", `translate(0,${-9 * lift}) rotate(${-200 * lift} ${g.xAer} ${g.YO1 - 31})`);
    let s = "";
    if (u > 0.4 && u < 2.0) for (let i = 0; i < 6; i++) {
      const k = ((u - 0.4) * 1.6 + i / 6) % 1, y = g.YO1 - 30 - k * 46, rr = 1.6 + 2.2 * (1 - k);
      s += `<circle cx="${g.xAer + Math.sin(u * 7 + i) * 3}" cy="${y}" r="${rr}" fill="url(#pz-gBula)" stroke="rgba(70,80,95,.5)" stroke-width=".5" opacity="${1 - k}"/>`;
    }
    if (u > 1.4 && u < 2.2) { const k = (u - 1.4) / 0.8; s += `<ellipse cx="${g.xAer + 8}" cy="${g.YO1 - 26 + k * k * 24}" rx="2.2" ry="3.2" fill="${FLUIDE[sim.fluid].culoare}"/>`; }
    E.aerisire.innerHTML = s;
    if (u > 2.4) { A.aerisire = null; E.aerisire.innerHTML = ""; E.capAer.removeAttribute("transform"); }
  }

  // animația seringii
  if (A.seringa) {
    const u = (performance.now() - A.seringa) / 1000;
    const op = u < 0.3 ? u / 0.3 : u < 1.8 ? 1 : Math.max(0, 1 - (u - 1.8) / 0.4);
    E.seringa.setAttribute("opacity", op);
    E.piston.setAttribute("transform", `translate(0,${clamp((u - 0.5) / 1.1, 0, 1) * 52})`);
    const lift = u < 0.3 ? u / 0.3 : u < 1.8 ? 1 : Math.max(0, 1 - (u - 1.8) / 0.3);
    E.capAer.setAttribute("transform", `translate(-26,${-14 * lift})`);
    E.capAer.setAttribute("opacity", 1 - 0.0 * lift);
  } else if (!A.aerisire) { E.seringa.setAttribute("opacity", 0); E.capAer.removeAttribute("transform"); }

  // scurgerea: picătura se formează la presetupă, cade și formează o baltă
  const leak = sim.defect === "scurgere";
  let sl = "";
  if (leak && (p > 0.5 || SV.picaturi.length)) {
    const xg = g.xGl + 15, yg = g.YA + g.rR + 12;
    if (p > 0.5) {
      SV.picForm = (SV.picForm || 0) + dt * (p / 100) * (sim.rapid ? 6 : 1.2);
      if (SV.picForm >= 1) { SV.picaturi.push({ y: yg + 3, v: 0 }); SV.picForm = 0; }
      const r = 1 + 2.4 * (SV.picForm || 0);
      sl += `<path d="M${xg - r} ${yg + r * 0.6} Q ${xg} ${yg - r * 1.4} ${xg + r} ${yg + r * 0.6} A ${r} ${r} 0 0 1 ${xg - r} ${yg + r * 0.6} Z" fill="${FLUIDE[sim.fluid].culoare}" stroke="${shade(FLUIDE[sim.fluid].culoare, 0.6)}" stroke-width=".5"/>`;
      sl += `<path d="M${xg - 8} ${yg - 6} Q ${xg} ${yg + 2} ${xg + 8} ${yg - 6}" fill="none" stroke="${FLUIDE[sim.fluid].culoare}" stroke-width="2" opacity=".7"/>`;
    }
    SV.picaturi.forEach(d => { d.v += 900 * dt; d.y += d.v * dt; });
    SV.picaturi = SV.picaturi.filter(d => d.y < 336);
    SV.picaturi.forEach(d => sl += `<ellipse cx="${xg}" cy="${d.y}" rx="2.2" ry="3.4" fill="${FLUIDE[sim.fluid].culoare}" stroke="${shade(FLUIDE[sim.fluid].culoare, 0.6)}" stroke-width=".4"/>`);
  }
  E.scurgere.innerHTML = sl;
  E.balta.setAttribute("rx", leak || sim.Vleak > 0 ? clamp(4 + Math.sqrt(sim.Vleak) * 140, 0, 60) : 0);
  E.balta.setAttribute("fill", shade(FLUIDE[sim.fluid].culoare, 0.85));

  // furtunul se umflă cu presiunea (exagerat vizual)
  E.furtun.style.display = sim.defect === "furtun" ? "" : "none";
  E.portFurtun.style.display = sim.defect === "furtun" ? "" : "none";
  if (sim.defect === "furtun") { const w = 12 + 5 * Math.min(1, p / 100); E.furtunBaza.setAttribute("stroke-width", w + 1); E.furtunTesut.setAttribute("stroke-width", w - 1); }

  // ecranul coboară / urcă
  const tinta = document.getElementById("ck-ecran").checked ? 1 : 0;
  A.ecran += (tinta - A.ecran) * Math.min(1, dt * 5);
  const ease = A.ecran * A.ecran * (3 - 2 * A.ecran);
  E.ecran.setAttribute("transform", `translate(0,${-250 * (1 - ease)})`);
  E.ecran.setAttribute("opacity", 0.15 + 0.85 * ease);
  E.ecran.style.display = A.ecran < 0.01 ? "none" : "";

  // etichete
  const arataE = document.getElementById("ck-etichete")?.checked !== false;
  E.etichete.style.display = arataE ? "" : "none";
  E.cursa.style.display = arataE ? "" : "none";
  const c = cfg();
  E.etLichid.textContent = arataE ? FLUIDE[sim.fluid].nume.replace(" (de determinat)", "") : "";
  E.etLichid2.textContent = arataE ? `V₀ = ${fmt(sim.V0, 1)} cm³` + (p > 0.5 ? ` · ΔV/V₀ = ${fmt(p * 1e5 / (c.K * 1e9) * 100, 3)} %` : "") : "";
  E.etCil.textContent = `cilindru de oțel D = ${fmt(sim.D, 0)} mm, e = ${fmt(sim.e, 1)} mm`;
  E.etPiston.textContent = `piston Ø${String(+sim.d.toFixed(2)).replace(".", ",")} mm · pas ${String(+sim.s.toFixed(2)).replace(".", ",")} mm`;
  E.cursa.textContent = `cursa: ${fmt(sim.n * sim.s, 2)} mm`;
}

function animaAerisire() { SV.anim.aerisire = performance.now(); }
function animaSeringa() { SV.anim.seringa = performance.now(); }

/* ======================================================================= SISTEMUL DE FRÂNARE (fila Aplicații)
   Pedală suspendată cu pivot, furcă (clevis) și tijă de împingere rigidă; arc de revenire; contactor de stop;
   servofrână opțională; pompă centrală tandem (pistoane primar și secundar, arcuri, orificii de compensare);
   conductă cu punct înalt în care se adună aerul; etrier flotant pe disc ventilat (vedere frontală). */
const FRANA = { F: 0, Ft: 0, auto: null, th: 0, om: 6, el: null };
const PG = { P0: [168, 46], C0: [-4, 60], S0: [-3, 28], pad: [-40, 236], Ax: 120, Qx0: 282, kv: 0.75 };
function rotPt(pt, phi) { const c = Math.cos(phi), s = Math.sin(phi); return [PG.P0[0] + pt[0] * c + pt[1] * s, PG.P0[1] - pt[0] * s + pt[1] * c]; } // rotire în sens trigonometric (pedala spre perete)
function phiPentruCursa(sPx) {
  const Lr = Math.hypot(PG.Qx0 - rotPt(PG.C0, 0)[0], PG.Ax - rotPt(PG.C0, 0)[1]);
  const Q = [PG.Qx0 + sPx, PG.Ax];
  let a = 0, b = 1.0;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2, C = rotPt(PG.C0, m); if (Math.hypot(Q[0] - C[0], Q[1] - C[1]) > Lr) a = m; else b = m; }
  return (a + b) / 2;
}
function arcSpirala(x1, y1, x2, y2, n, amp) {
  const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
  let d = `M${x1} ${y1} L${x1 + ux * 6} ${y1 + uy * 6}`;
  const L2 = L - 12;
  for (let i = 0; i <= n * 2; i++) { const t = 6 + L2 * i / (n * 2), sgn = i === 0 || i === n * 2 ? 0 : (i % 2 ? 1 : -1); d += ` L${x1 + ux * t + nx * amp * sgn} ${y1 + uy * t + ny * amp * sgn}`; }
  return d + ` L${x2} ${y2}`;
}
function construiestePedala() {
  const svg = document.getElementById("svg-frana");
  if (!svg) return;
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 760 360");
  const defs = mk("defs", {}, svg);
  grad(defs, "gOtel", STOP.otel); grad(defs, "gOtelR", STOP.otel, { x1: 0, y1: 0, x2: 1, y2: 1 });
  grad(defs, "fCrom", STOP.crom); grad(defs, "fNegru", [[0, "#5b5f66"], [0.4, "#2a2d31"], [1, "#0f1012"]]);
  grad(defs, "fAlu", [[0, "#6f767e"], [0.18, "#c9ced3"], [0.35, "#f1f3f5"], [0.6, "#aab1b8"], [1, "#59606a"]]);
  grad(defs, "fLichid", [[0, "#efd27a", 0.9], [1, "#b88a1c", 0.95]]);
  grad(defs, "fRez", [[0, "#ffffff", 0.6], [0.5, "#f3f6f8", 0.35], [1, "#d6dde4", 0.55]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "fBula", [[0, "#ffffff", 1], [0.35, "#ffffff", 0.6], [0.85, "#cfdbe6", 0.35], [1, "#5d6b7a", 0.9]], { radial: true, fx: 0.36, fy: 0.3 });
  grad(defs, "fRosu", [[0, "#ff7a6b"], [0.45, "#c62828"], [1, "#6d0f0f"]], { x1: 0, y1: 0, x2: 0.4, y2: 1 });
  grad(defs, "fDisc", [[0, "#d7dbdf"], [0.55, "#a3a9b0"], [0.85, "#7c838b"], [1, "#5b6168"]], { radial: true, cx: 0.45, cy: 0.4, r: 0.6 });
  grad(defs, "fServo", [[0, "#3a3d42"], [0.3, "#6d7279"], [0.5, "#8d939a"], [0.75, "#4b4f55"], [1, "#25272b"]]);
  grad(defs, "fLampa", [[0, "#ffd0c8"], [0.4, "#ff3b2f"], [1, "#7a0d08"]], { radial: true, cx: 0.4, cy: 0.35, r: 0.7 });
  grad(defs, "gRama", [[0, "#ffffff"], [0.3, "#c8ced5"], [0.55, "#6f7882"], [0.8, "#d9dee3"], [1, "#59616a"]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  filtre(defs);
  const mS = mk("marker", { id: "fSag", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 4, markerHeight: 4, orient: "auto" }, defs); mk("path", { d: "M0 0L10 5L0 10z", fill: "#d32f2f" }, mS);
  const F = FRANA.el = {};
  const Y = PG.Ax;

  /* podeaua și peretele despărțitor */
  const phiMax = phiPentruCursa(36 * PG.kv * 1.03);
  const padMax = rotPt([PG.pad[0] + 10, PG.pad[1] + 12], phiMax);
  F.podea = mk("path", { d: `M0 338 L${padMax[0] - 70} 338 L${padMax[0] + 6} ${padMax[1] + 4} L268 250 L268 360 L0 360 Z`, fill: "#3b3f45" }, svg);
  mk("path", { d: `M0 338 L${padMax[0] - 70} 338 L${padMax[0] + 6} ${padMax[1] + 4} L268 250`, fill: "none", stroke: "#5e646c", "stroke-width": 3 }, svg);
  const tP = mk("text", { x: 12, y: 354, "font-size": 10, fill: "#c9ced4" }, svg); tP.textContent = "podea (covor)";
  mk("rect", { x: 256, y: 6, width: 12, height: 300, fill: "#2d2f33" }, svg); // izolație fonică
  for (let y = 10; y < 300; y += 7) mk("line", { x1: 257, y1: y, x2: 267, y2: y + 4, stroke: "#45484e", "stroke-width": 1 }, svg);
  mk("rect", { x: 268, y: 6, width: 10, height: 300, fill: "url(#gOtel)" }, svg);
  const tw = mk("text", { x: 273, y: 322, "font-size": 10, "text-anchor": "middle", fill: "var(--text-sec)" }, svg); tw.textContent = "perete";

  /* consola pedalierului */
  mk("path", { d: "M256 14 L132 14 L126 30 L148 70 L256 150 Z", fill: "url(#gOtelR)", stroke: "#4b5259", "stroke-width": 1 }, svg);
  mk("path", { d: "M256 14 L132 14 L126 30 L148 70 L256 150", fill: "none", stroke: "#fff", "stroke-width": 0.8, opacity: 0.5 }, svg);
  [[150, 24], [240, 24], [240, 132]].forEach(([x, y]) => surub(svg, x, y, 4));
  // lampa de stop (indicator) + contactorul
  mk("rect", { x: 20, y: 14, width: 92, height: 44, rx: 8, fill: "#1d1f23" }, svg);
  F.lampa = mk("circle", { cx: 40, cy: 36, r: 11, fill: "#4a1512" }, svg);
  F.lampaHalo = mk("circle", { cx: 40, cy: 36, r: 18, fill: "#ff3b2f", opacity: 0, filter: "url(#fBlur2)" }, svg);
  const tl = mk("text", { x: 58, y: 40, "font-size": 11, fill: "#d9dde2", "font-weight": 700 }, svg); tl.textContent = "STOP";
  mk("rect", { x: 112, y: 88, width: 26, height: 18, rx: 3, fill: "url(#fNegru)" }, svg);
  mk("path", { d: "M112 97 C 96 97, 92 70, 72 58", fill: "none", stroke: "#26292e", "stroke-width": 2.2 }, svg);
  F.plonjor = mk("rect", { x: 138, y: 94, width: 20, height: 6, rx: 2, fill: "url(#gOtel)" }, svg);
  const tc = mk("text", { x: 108, y: 120, "font-size": 9.5, "text-anchor": "end", fill: "var(--text-sec)" }, svg); tc.textContent = "contactor stop";

  /* arcul de revenire (dinamic) */
  F.arcRev = mk("path", { fill: "none", stroke: "#6b737c", "stroke-width": 2 }, svg);

  /* pedala (rotită dinamic în jurul pivotului) */
  F.pedala = mk("g", {}, svg);
  const [px, py] = PG.P0;
  mk("path", { d: `M${px - 6} ${py} C ${px - 3} ${py + 80}, ${px - 8} ${py + 160}, ${px - 40} ${py + 226}`, fill: "none", stroke: "#15171a", "stroke-width": 12, "stroke-linecap": "round" }, F.pedala);
  mk("path", { d: `M${px - 8} ${py + 4} C ${px - 5} ${py + 80}, ${px - 10} ${py + 160}, ${px - 42} ${py + 224}`, fill: "none", stroke: "#6b7078", "stroke-width": 2, opacity: 0.7 }, F.pedala);
  mk("rect", { x: px - 68, y: py + 228, width: 56, height: 17, rx: 6, fill: "url(#fNegru)", transform: `rotate(-24 ${px - 40} ${py + 236})` }, F.pedala);
  for (let i = 0; i < 5; i++) mk("line", { x1: px - 63 + i * 10, y1: py + 230, x2: px - 63 + i * 10, y2: py + 243, stroke: "#5a5f66", "stroke-width": 1.6, transform: `rotate(-24 ${px - 40} ${py + 236})` }, F.pedala);
  F.forta = mk("g", {}, F.pedala);
  // furca (clevis) pe pedală
  const C0w = rotPt(PG.C0, 0);
  mk("rect", { x: C0w[0] - 9, y: C0w[1] - 7, width: 18, height: 14, rx: 3, fill: "url(#gOtelR)" }, F.pedala);
  mk("circle", { cx: px, cy: py, r: 9, fill: "url(#gOtelR)", stroke: "#2f3439", "stroke-width": 1 }, svg); // pivot
  mk("circle", { cx: px, cy: py, r: 3, fill: "#2f3439" }, svg);
  F.tija = mk("line", { stroke: "url(#fCrom)", "stroke-width": 7, "stroke-linecap": "round" }, svg);
  F.bolt = mk("circle", { r: 4, fill: "#d9dde2", stroke: "#4b5259" }, svg);

  /* servofrâna / distanțierul */
  F.servo = mk("g", {}, svg);
  mk("rect", { x: 278, y: Y - 74, width: 74, height: 148, rx: 30, fill: "url(#fServo)" }, F.servo);
  mk("rect", { x: 312, y: Y - 76, width: 6, height: 152, rx: 3, fill: "#9aa1a8" }, F.servo);
  mk("path", { d: `M300 ${Y - 74} q -6 -18 12 -22 l 24 0`, fill: "none", stroke: "#1b1d20", "stroke-width": 7 }, F.servo);
  const ts = mk("text", { x: 315, y: Y + 92, "font-size": 10, "text-anchor": "middle", fill: "var(--text-sec)" }, F.servo); ts.textContent = "servofrână (vid)";
  F.distantier = mk("g", {}, svg);
  mk("rect", { x: 278, y: Y - 16, width: 74, height: 32, rx: 3, fill: "url(#gOtel)" }, F.distantier);
  mk("rect", { x: 346, y: Y - 34, width: 8, height: 68, rx: 2, fill: "url(#gOtel)" }, F.distantier);

  /* pompa centrală tandem (secțiune) */
  const M = F.M = { x: 352, x2: 590, r: 18, p1: 362, p1L: 34, c1: 64, p2L: 30, c2: 78 };
  M.p2 = M.p1 + M.p1L + M.c1; // poziția pistonului secundar
  mk("rect", { x: M.x, y: Y - 34, width: 10, height: 68, rx: 2, fill: "url(#fAlu)" }, svg); // flanșa
  mk("rect", { x: M.x + 10, y: Y - M.r - 9, width: M.x2 - M.x - 10, height: 2 * M.r + 18, rx: 8, fill: "url(#fAlu)" }, svg);
  mk("rect", { x: M.x + 12, y: Y - M.r, width: M.x2 - M.x - 22, height: 2 * M.r, fill: "#2f3439" }, svg);
  F.cam1 = mk("rect", { y: Y - M.r, height: 2 * M.r, fill: "url(#fLichid)" }, svg);
  F.cam2 = mk("rect", { y: Y - M.r, height: 2 * M.r, fill: "url(#fLichid)" }, svg);
  F.arc1 = mk("path", { fill: "none", stroke: "#7d848c", "stroke-width": 1.8 }, svg);
  F.arc2 = mk("path", { fill: "none", stroke: "#7d848c", "stroke-width": 1.8 }, svg);
  const piston = (L) => { const gp = mk("g", {}, svg); mk("rect", { x: 0, y: Y - M.r + 1, width: L, height: 2 * M.r - 2, rx: 2, fill: "url(#fCrom)" }, gp); mk("rect", { x: L - 6, y: Y - M.r, width: 6, height: 2 * M.r, rx: 2, fill: "#1f5b4d" }, gp); mk("rect", { x: 2, y: Y - M.r, width: 5, height: 2 * M.r, rx: 2, fill: "#1f5b4d" }, gp); return gp; };
  F.pist1 = piston(M.p1L); F.pist2 = piston(M.p2L);
  // orificiile de compensare + rezervorul
  M.oc1 = M.p1 + M.p1L + 4; M.oc2 = M.p2 + M.p2L + 4;
  [M.oc1, M.oc2].forEach(x => { mk("rect", { x: x - 2, y: Y - M.r - 9, width: 4, height: 10, fill: "url(#fLichid)" }, svg); mk("rect", { x: x - 6, y: Y - M.r - 22, width: 12, height: 14, fill: "url(#fAlu)" }, svg); mk("rect", { x: x - 3, y: Y - M.r - 22, width: 6, height: 14, fill: "url(#fLichid)" }, svg); });
  const rz = { x: M.oc1 - 24, x2: M.oc2 + 28, y: Y - M.r - 70, h: 50 };
  mk("rect", { x: rz.x, y: rz.y, width: rz.x2 - rz.x, height: rz.h, rx: 8, fill: "url(#fRez)", stroke: "#9aa7b4", "stroke-width": 1 }, svg);
  F.nivel = mk("rect", { x: rz.x + 2, y: rz.y + 16, width: rz.x2 - rz.x - 4, height: rz.h - 18, rx: 6, fill: "url(#fLichid)", opacity: 0.85 }, svg);
  mk("line", { x1: (rz.x + rz.x2) / 2, y1: rz.y + 4, x2: (rz.x + rz.x2) / 2, y2: rz.y + rz.h, stroke: "#9aa7b4", "stroke-width": 1 }, svg);
  mk("rect", { x: (rz.x + rz.x2) / 2 - 20, y: rz.y - 12, width: 40, height: 13, rx: 3, fill: "url(#fNegru)" }, svg);
  mk("path", { d: `M${(rz.x + rz.x2) / 2 + 20} ${rz.y - 6} C ${rz.x2 + 30} ${rz.y - 10}, ${rz.x2 + 40} ${rz.y - 40}, ${rz.x2 + 70} ${rz.y - 40}`, fill: "none", stroke: "#26292e", "stroke-width": 2 }, svg);
  [["MAX", 12], ["MIN", 34]].forEach(([t, dy]) => { mk("line", { x1: rz.x2 - 14, y1: rz.y + dy, x2: rz.x2 - 4, y2: rz.y + dy, stroke: "#333", "stroke-width": 1 }, svg); const e = mk("text", { x: rz.x2 + 4, y: rz.y + dy + 3, "font-size": 8, fill: "var(--text-sec)" }, svg); e.textContent = t; });
  const tm = mk("text", { x: M.x + 12, y: Y + 82, "font-size": 10, fill: "var(--text-sec)" }, svg); tm.textContent = "pompă centrală tandem Ø22,22";

  /* conductele */
  M.out1 = M.p1 + M.p1L + M.c1 - 14; M.out2 = M.x2 - 18;
  const D = { x: 688, y: 270, R: 64 }; F.D = D;
  const xe = D.x - 6, ye = D.y - D.R - 18; // intrarea în etrier
  const lin1 = `M${M.out1} ${Y + M.r + 9} L${M.out1} ${Y + 54} Q${M.out1} ${Y + 62} ${M.out1 + 8} ${Y + 62} L${M.out1 + 150} ${Y + 62} Q${M.out1 + 158} ${Y + 62} ${M.out1 + 158} ${Y + 54} L${M.out1 + 158} ${Y - 2} Q${M.out1 + 158} ${Y - 10} ${M.out1 + 166} ${Y - 10} L${xe - 8} ${Y - 10} Q${xe} ${Y - 10} ${xe} ${Y - 2} L${xe} ${ye}`;
  F.hp = { x1: M.out1 + 166, x2: xe - 8, y: Y - 10 };
  const lin2 = `M${M.out2} ${Y - M.r - 9} L${M.out2} ${Y - M.r - 30} Q${M.out2} ${Y - M.r - 38} ${M.out2 + 8} ${Y - M.r - 38} L756 ${Y - M.r - 38}`;
  [lin1, lin2].forEach(d => {
    mk("path", { d, fill: "none", stroke: "#2b2f35", "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    mk("path", { d, fill: "none", stroke: "#e2bd57", "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    mk("path", { d, fill: "none", stroke: "#fff", "stroke-width": 1, opacity: 0.4, transform: "translate(0,-1.5)" }, svg);
  });
  [M.out1, M.out2].forEach((x, i) => mk("rect", { x: x - 7, y: i ? Y - M.r - 16 : Y + M.r + 4, width: 14, height: 10, rx: 2, fill: "url(#gOtelR)" }, svg));
  const t2 = mk("text", { x: 754, y: Y - M.r - 46, "font-size": 9.5, "text-anchor": "end", fill: "var(--text-sec)" }, svg); t2.textContent = "→ circuitul 2 (diagonal)";
  F.bula = mk("ellipse", { cy: F.hp.y, ry: 2.4, fill: "url(#fBula)", stroke: "rgba(70,80,95,.6)", "stroke-width": 0.5 }, svg);
  F.etBula = mk("text", { y: F.hp.y - 9, "font-size": 10, "text-anchor": "middle", fill: "var(--text-sec)" }, svg);
  // manometru mic pe conductă
  const gx = M.out1 + 118, gy = Y + 62, gc = gy + 30;
  mk("rect", { x: gx - 3, y: gy + 4, width: 6, height: 10, fill: "url(#gOtelR)" }, svg);
  mk("circle", { cx: gx, cy: gc, r: 17, fill: "url(#gRama)" }, svg);
  mk("circle", { cx: gx, cy: gc, r: 14, fill: "#fbfbf8" }, svg);
  for (let p = 0; p <= 160; p += 20) { const a = (-135 + 270 * p / 160) * Math.PI / 180; mk("line", { x1: gx + 13 * Math.sin(a), y1: gc - 13 * Math.cos(a), x2: gx + 10 * Math.sin(a), y2: gc - 10 * Math.cos(a), stroke: "#222", "stroke-width": 0.8 }, svg); }
  F.acMic = mk("line", { x1: gx, y1: gc, x2: gx, y2: gc - 12, stroke: "#c62828", "stroke-width": 1.6, "stroke-linecap": "round" }, svg);
  mk("circle", { cx: gx, cy: gc, r: 2, fill: "#333" }, svg);
  F.acC = [gx, gc];

  /* discul ventilat (vedere frontală) + etrierul */
  F.disc = mk("g", {}, svg);
  mk("circle", { cx: D.x, cy: D.y, r: D.R, fill: "url(#fDisc)", stroke: "#4b5158", "stroke-width": 1 }, F.disc);
  mk("circle", { cx: D.x, cy: D.y, r: D.R - 22, fill: "none", stroke: "#8c939a", "stroke-width": 0.8 }, F.disc);
  for (let k = 0; k < 36; k++) { const a = k * Math.PI / 18, r = D.R - 11 + (k % 2) * 4; mk("circle", { cx: D.x + r * Math.cos(a), cy: D.y + r * Math.sin(a), r: 2.2, fill: "#3c4147" }, F.disc); }
  for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; mk("line", { x1: D.x + (D.R - 3) * Math.cos(a), y1: D.y + (D.R - 3) * Math.sin(a), x2: D.x + (D.R - 20) * Math.cos(a + 0.18), y2: D.y + (D.R - 20) * Math.sin(a + 0.18), stroke: "#7d848b", "stroke-width": 0.7, opacity: 0.7 }, F.disc); }
  mk("circle", { cx: D.x, cy: D.y, r: 36, fill: "#5d636a", stroke: "#3b4046", "stroke-width": 1.2 }, F.disc);
  for (let k = 0; k < 5; k++) { const a = k * 2 * Math.PI / 5; surub(F.disc, D.x + 22 * Math.cos(a), D.y + 22 * Math.sin(a), 5); }
  mk("circle", { cx: D.x, cy: D.y, r: 9, fill: "#2f3439" }, F.disc);
  // plăcuța vizibilă sub etrier + etrierul flotant
  F.placuta = mk("path", { d: `M${D.x - 30} ${D.y - D.R + 4} A ${D.R - 4} ${D.R - 4} 0 0 1 ${D.x + 30} ${D.y - D.R + 4} L ${D.x + 28} ${D.y - D.R + 20} A ${D.R - 20} ${D.R - 20} 0 0 0 ${D.x - 28} ${D.y - D.R + 20} Z`, fill: "#3b3530", opacity: 0.0 }, svg);
  mk("path", { d: `M${D.x - 42} ${D.y - D.R - 22} L${D.x + 42} ${D.y - D.R - 22} Q${D.x + 52} ${D.y - D.R - 22} ${D.x + 50} ${D.y - D.R - 8} L${D.x + 40} ${D.y - D.R + 22} Q${D.x} ${D.y - D.R + 12} ${D.x - 40} ${D.y - D.R + 22} L${D.x - 50} ${D.y - D.R - 8} Q${D.x - 52} ${D.y - D.R - 22} ${D.x - 42} ${D.y - D.R - 22} Z`, fill: "url(#fRosu)", stroke: "#4a0a0a", "stroke-width": 1 }, svg);
  const tb = mk("text", { x: D.x + 6, y: D.y - D.R - 4, "font-size": 10, "text-anchor": "middle", fill: "#fff", "font-weight": 700 }, svg); tb.textContent = "Ø54";
  surub(svg, D.x - 38, D.y - D.R - 12, 3.5); surub(svg, D.x + 38, D.y - D.R - 12, 3.5);
  F.etDisc = mk("text", { x: D.x, y: D.y + D.R + 14, "font-size": 10, "text-anchor": "middle", fill: "var(--text-sec)" }, svg);

  /* valorile afișate */
  F.tP = mk("text", { x: 292, y: Y + 128, "font-size": 13, fill: "var(--text)", "font-weight": 700 }, svg);
  F.tS = mk("text", { x: 292, y: Y + 146, "font-size": 11.5, fill: "var(--text-sec)" }, svg);
  F.tS2 = mk("text", { x: 292, y: Y + 162, "font-size": 11.5, fill: "var(--text-sec)" }, svg);
  F.tS3 = mk("text", { x: 292, y: Y + 178, "font-size": 11.5, fill: "var(--text-sec)" }, svg);
  F.tS4 = mk("text", { x: 292, y: Y + 194, "font-size": 10.5, fill: "var(--text-sec)" }, svg);
  prefixeazaId(svg, "fr-");
}

function actualizeazaPedala(dt) {
  const F = FRANA.el; if (!F) return;
  const v = valPedala(); if (!v) return;
  const cuAer = document.getElementById("ck-aer-frana")?.checked;
  const servo = document.getElementById("ck-servo")?.checked;
  const eta = 0.92, kS = servo ? 4.9 : 1, Am = Math.PI * v.dm * v.dm / 4;
  const pDinF = Fn => Fn * v.ip * eta * kS / Am * 10; // bar
  if (FRANA.auto !== null) {
    FRANA.auto += dt;
    const T = FRANA.auto, Fm = v.pt / 10 * Am / (v.ip * eta * kS);
    FRANA.Ft = T < 1.2 ? Fm * T / 1.2 : T < 2.6 ? Fm : T < 3.4 ? Fm * (1 - (T - 2.6) / 0.8) : 0;
    if (T > 3.6) FRANA.auto = null;
    const sl = document.getElementById("sl-frana"); if (sl) sl.value = FRANA.Ft;
  }
  FRANA.F += (FRANA.Ft - FRANA.F) * Math.min(1, dt * 9);
  let p = Math.max(0, pDinF(FRANA.F));
  let laPodea = false;
  if (cursaPompa(v, p, !cuAer) > v.smax) { // pedala la podea – presiunea nu mai crește
    let a = 0, b = p; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (cursaPompa(v, m, !cuAer) > v.smax) b = m; else a = m; }
    p = a; laPodea = true;
  }
  const sm = cursaPompa(v, p, !cuAer), sp = sm * v.ip;
  const sPx = sm * PG.kv;
  const phi = phiPentruCursa(sPx);
  const deg = -phi * 180 / Math.PI;
  F.pedala.setAttribute("transform", `rotate(${deg} ${PG.P0[0]} ${PG.P0[1]})`);
  const C = rotPt(PG.C0, phi);
  F.tija.setAttribute("x1", C[0]); F.tija.setAttribute("y1", C[1]); F.tija.setAttribute("x2", PG.Qx0 + sPx); F.tija.setAttribute("y2", PG.Ax);
  F.bolt.setAttribute("cx", C[0]); F.bolt.setAttribute("cy", C[1]);
  // arcul de revenire
  const S = rotPt(PG.S0, phi);
  F.arcRev.setAttribute("d", arcSpirala(236, 32, S[0], S[1], 9, 4));
  // contactorul de stop: plonjorul urmărește pedala 4 px, apoi se desprinde
  const ext = Math.min(4, sPx * 3);
  F.plonjor.setAttribute("width", 20 + ext);
  const stop = sp > 2;
  F.lampa.setAttribute("fill", stop ? "url(#fr-fLampa)" : "#4a1512");
  F.lampaHalo.setAttribute("opacity", stop ? 0.55 : 0);
  F.servo.style.display = servo ? "" : "none"; F.distantier.style.display = servo ? "none" : "";
  // pompa tandem: pistonul secundar se deplasează cu ~ jumătate din cursă (două circuite egale)
  const M = F.M, s1 = sPx, s2 = sm > (v.sm0 || 0) ? (sPx - (v.sm0 || 0) * PG.kv) * 0.5 : 0;
  F.pist1.setAttribute("transform", `translate(${M.p1 + s1},0)`);
  F.pist2.setAttribute("transform", `translate(${M.p2 + s2},0)`);
  const c1a = M.p1 + M.p1L + s1, c1b = M.p2 + s2, c2a = M.p2 + M.p2L + s2, c2b = M.x2 - 10;
  F.cam1.setAttribute("x", c1a); F.cam1.setAttribute("width", Math.max(0, c1b - c1a));
  F.cam2.setAttribute("x", c2a); F.cam2.setAttribute("width", Math.max(0, c2b - c2a));
  F.arc1.setAttribute("d", arcSpirala(c1a, PG.Ax, c1b, PG.Ax, 6, 11));
  F.arc2.setAttribute("d", arcSpirala(c2a, PG.Ax, c2b, PG.Ax, 7, 11));
  const f = 1 + Math.min(1, p / 100) * 0.0; F.cam1.setAttribute("opacity", 0.75 + 0.25 * Math.min(1, p / 60) * f); F.cam2.setAttribute("opacity", 0.75 + 0.25 * Math.min(1, p / 60));
  // bula de aer în punctul înalt (lungimea dopului de aer într-o conductă Ø4,75 mm)
  const Vb = cuAer ? v.Va * P_ATM / (P_ATM + p) : 0;
  const L = Vb > 0 ? clamp(Vb * 1000 / 17.7 * 0.8, 2.5, F.hp.x2 - F.hp.x1 - 4) : 0;
  const xc = (F.hp.x1 + F.hp.x2) / 2;
  F.bula.setAttribute("cx", xc); F.bula.setAttribute("rx", L / 2); F.bula.setAttribute("ry", L > 0 ? 2.4 : 0);
  F.etBula.setAttribute("x", xc); F.etBula.textContent = cuAer ? `aer: ${fmt(Vb, 3)} cm³` : "fără aer";
  // manometrul mic
  const a = (-135 + 270 * Math.min(165, p) / 160) * Math.PI / 180;
  F.acMic.setAttribute("x2", F.acC[0] + 11 * Math.sin(a)); F.acMic.setAttribute("y2", F.acC[1] - 11 * Math.cos(a));
  // discul se rotește și încetinește când plăcuțele strâng
  const omT = 6 * (1 - clamp((p - 2) / 25, 0, 1));
  FRANA.om += (omT - FRANA.om) * Math.min(1, dt * (omT < FRANA.om ? 2.5 : 0.6));
  FRANA.th += FRANA.om * dt;
  F.disc.setAttribute("transform", `rotate(${FRANA.th * 180 / Math.PI} ${F.D.x} ${F.D.y})`);
  F.placuta.setAttribute("opacity", p > 2 ? 0.75 : 0);
  F.etDisc.textContent = p > 2 ? "plăcuțele strâng discul" : "disc liber (jocul plăcuțelor)";
  // forța pe pedală (săgeată)
  const Fr = FRANA.F;
  F.forta.innerHTML = Fr > 5 ? `<line x1="${PG.P0[0] - 112 - Math.min(40, Fr / 15)}" y1="${PG.P0[1] + 246}" x2="${PG.P0[0] - 72}" y2="${PG.P0[1] + 238}" stroke="#d32f2f" stroke-width="3.4" marker-end="url(#fr-fSag)"/>` : "";
  F.tP.textContent = `F = ${fmt(Fr, 0)} N → p = ${fmt(p, 1)} bar`;
  F.tS.textContent = `pompa: ${fmt(sm, 1)} / ${fmt(v.smax, 0)} mm (moartă ${fmt(v.sm0 || 0, 1)} mm)`;
  F.tS2.textContent = `pedala: ${fmt(sp, 0)} mm · unghi ${fmt(phi * 180 / Math.PI, 1)}°`;
  F.tS3.textContent = laPodea ? "PEDALA LA PODEA – p nu mai crește!" : stop ? "contactor eliberat → stopuri aprinse" : "repaus · contactorul de stop apăsat";
  F.tS3.setAttribute("fill", laPodea ? "#d32f2f" : "var(--text-sec)");
  F.tS4.textContent = servo ? "cu servofrână (amplificare ×4,9, Lucrarea 3)" : "fără servofrână (randament 0,92)";
}
