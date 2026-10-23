/* Lucrarea 2 – Compresibilitatea lichidului de frână · laborator virtual */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const CHEIE = "mf-lab2-v1";

const TINTE_A = [20, 40, 60, 80, 100];
const TINTE_B = [1, 2, 5, 20, 60, 100];
const AER_NEAERISIT = 0.25;   // cm³ de aer până la aerisire
const AER_ASCUNS = 0.06;      // cm³ rămași la „aerisire incompletă”
const CF_FURTUN = 0.004;      // cm³/bar – furtun 0,4 m (≈ 0,4 cm³ la 100 bar)
const DEBIT_SCURGERE = 0.002; // cm³/s la 100 bar

/* ------------------------------------------------------------------ stare */
const sim = {
  fluid: "DOT4", Kproba: 1.5 + Math.random() * 0.5,
  V0: 50, T: 20, d: 10, s: 1, D: 20, e: 5, E: 210,
  mano: "analog", erori: true, defect: "none", rapid: false,
  aerisit: false, Vinj: 0, n: 0, Vleak: 0, dBula: 10, nBule: 1, Klot: null,
  tintaN: null, tine: 0, dir: 0,
  pAfis: 0, ultimP: 0,
  errOff: (Math.random() * 2 - 1) * 0.8, errGain: (Math.random() * 2 - 1) * 0.006,
  log: []
};

function detGol() {
  const a = {}; TINTE_A.forEach(p => a[p] = { inc: "", desc: "" });
  const b = {}; TINTE_B.forEach(p => b[p] = "");
  return { V0: 50, d: 10, s: 1, D: 20, e: 5, E: 210, rho: 1050, T: 20, lichid: "DOT 4", Va0: 0.5, a, b };
}
let det = detGol();
let ref = { concluzii: "", raspunsuri: {}, trimis: null };

function salveaza() {
  try { localStorage.setItem(CHEIE, JSON.stringify({ det, ref, log: sim.log.slice(-300) })); } catch (e) { /* stocare indisponibilă */ }
}
function incarca() {
  try {
    const s = JSON.parse(localStorage.getItem(CHEIE) || "null");
    if (s && s.det) { det = Object.assign(detGol(), s.det); }
    if (s && s.ref) ref = Object.assign(ref, s.ref);
    if (s && Array.isArray(s.log)) sim.log = s.log;
  } catch (e) { /* ignorat */ }
}

/* ------------------------------------------------------------------ model curent */
function Kreal() { if (MOD.eval && sim.Klot) return sim.Klot; return sim.fluid === "PROBA" ? sim.Kproba : FLUIDE[sim.fluid].K; }
function aerTotal() {
  let v = sim.Vinj;
  if (!sim.aerisit) v += AER_NEAERISIT;
  else if (sim.defect === "aerRamas") v += AER_ASCUNS;
  return v;
}
function cfg() {
  return { V0: sim.V0, K: Kreal(), D: sim.D, e: sim.e, E: sim.E, Vaer: aerTotal(), Cf: sim.defect === "furtun" ? CF_FURTUN : 0 };
}
function Ar() { return volRot(sim.d, sim.s); }
function presiune() { return presiuneDinVolum(cfg(), sim.n * Ar() - sim.Vleak); }
function citire(p) {
  if (!sim.erori) return sim.mano === "digital" ? Math.round(p * 10) / 10 : Math.round(p * 2) / 2;
  let r = p <= 0.05 ? 0 : p * (1 + sim.errGain) + sim.errOff * Math.min(1, p / 5);
  if (sim.mano === "digital") r = Math.round((r + (Math.random() - 0.5) * 0.08) * 10) / 10;
  else r = Math.round(r * 2) / 2;
  return Math.max(0, r);
}

/* ------------------------------------------------------------------ utilitare */
const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace(".", ",") : "—");
const num = v => { const x = parseFloat(String(v).replace(",", ".")); return Number.isFinite(x) ? x : NaN; };
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function mesaj(text, tip = "", auto = false) {
  const a = $("#avertizare");
  if (auto) a.dataset.auto = "1"; else delete a.dataset.auto;
  if (!text) { a.hidden = true; return; }
  a.hidden = false; a.textContent = text; a.className = "avertizare" + (tip ? " " + tip : "");
}
let mesajTimer = null, mesajPana = 0;
function mesajTemporar(text, tip = "") {
  mesaj(text, tip); clearTimeout(mesajTimer); mesajPana = Date.now() + 4000;
  mesajTimer = setTimeout(() => { mesaj(""); }, 4000);
}

/* ------------------------------------------------------------------ taburi */
function arataTab(id) {
  $$("#taburi button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === id ? "true" : "false"));
  $$(".tab").forEach(t => t.classList.toggle("activ", t.id === "tab-" + id));
  if (id === "det") calcDet();
  if (id === "auto") calcAuto();
  if (id === "referat") genReferat();
  if (id === "sim") deseneazaLive();
  try { localStorage.setItem(CHEIE + "-tab", id); } catch (e) { }
  window.scrollTo({ top: 0 });
}

/* ================================================================== comenzi */
function poateIncarca() {
  if (!$("#ck-ochelari").checked || !$("#ck-ecran").checked) {
    mesajTemporar("NSSM: purtați ochelari și mănuși și coborâți ecranul înainte de a pune lichidul sub presiune.", "pericol");
    return false;
  }
  return true;
}
function roteste(dn) {
  if (dn > 0) {
    if (!poateIncarca()) { sim.tine = 0; sim.tintaN = null; return; }
    if (sim.ultimP >= 160) { mesajTemporar("Manometrul este la capătul scalei – opriți și descărcați!", "pericol"); sim.tine = 0; sim.tintaN = null; return; }
  }
  sim.n = Math.max(0, sim.n + dn);
  if (Math.abs(dn) > 1e-6) sim.dir = Math.sign(dn);
}

function setareDinFormular() {
  const geoVeche = [sim.fluid, sim.V0, sim.d, sim.D, sim.e].join("|");
  sim.fluid = $("#in-fluid").value;
  ["V0", "T", "d", "s", "D", "e", "E"].forEach(k => { const v = num($("#in-" + k).value); if (Number.isFinite(v) && v > 0) sim[k] = v; else if (k === "T" && Number.isFinite(v)) sim[k] = v; });
  sim.mano = $("#in-mano").value;
  sim.erori = $("#ck-erori").checked;
  const defVechi = sim.defect;
  sim.defect = $("#in-defect").value;
  sim.rapid = $("#ck-rapid").checked;
  if (defVechi !== sim.defect && sim.defect !== "none") mesajTemporar("Situație activată. Descărcați, aerisiți și refaceți determinările.", "");
  if (SV.g && geoVeche !== [sim.fluid, sim.V0, sim.d, sim.D, sim.e].join("|")) construiesteSVG();
  // sincronizează datele de lucru
  Object.assign(det, { V0: sim.V0, d: sim.d, s: sim.s, D: sim.D, e: sim.e, E: sim.E, T: sim.T, rho: FLUIDE[sim.fluid].rho, lichid: FLUIDE[sim.fluid].nume });
  scrieDateLucru();
  salveaza();
}

function aeriseste() {
  if (sim.ultimP > 0.5) { mesajTemporar("Racordurile se desfac numai după descărcarea presiunii (0 bar)!", "pericol"); return; }
  sim.aerisit = true; sim.Vinj = 0; sim.n = 0; sim.Vleak = 0; sim.dir = 0; sim.tintaN = null; SV.picaturi = [];
  animaAerisire();
  mesajTemporar("Piezometru aerisit și completat; poziția roții a fost marcată (n = 0). Varianta a.", "");
  $("#msg-inreg").textContent = "";
}
/* varianta individuală a bulei: diametrul și numărul de bule, între limite */
function variantaBula() {
  const B = CONFIG.bula;
  let d = clamp(Math.round(num($("#in-db").value) / B.pasD) * B.pasD || 10, B.dMin, B.dMax);
  let nb = clamp(Math.round(num($("#in-nb").value)) || 1, B.nMin, B.nMax);
  let V = nb * Math.PI * d ** 3 / 6 / 1000;
  while (V > B.VmaxCm3 + 1e-9 && d > B.dMin) { d -= B.pasD; V = nb * Math.PI * d ** 3 / 6 / 1000; }
  return { d, nb, V };
}
function scrieNotaBula() {
  const v = variantaBula(), B = CONFIG.bula;
  $("#nota-bula").innerHTML = `V<sub>a0</sub> = n·π·d<sub>b</sub>³/6 = ${v.nb}·π·${fmt(v.d, 1)}³/6 = <b>${fmt(v.V * 1000, 0)} mm³ = ${fmt(v.V, 3)} cm³</b> · limite: d<sub>b</sub> = ${B.dMin}…${B.dMax} mm, ${B.nMin}…${B.nMax} bule, V<sub>a0</sub> ≤ ${fmt(B.VmaxCm3, 1)} cm³`;
}
function bulaBlocata() { return MOD.eval && TINTE_B.some(p => det.b[p] !== ""); }
function introduBula() {
  if (sim.ultimP > 0.5) { mesajTemporar("Bula se introduce numai la 0 bar (presiune descărcată)!", "pericol"); return; }
  if (bulaBlocata() && (Math.abs(det.Va0 - variantaBula().V) > 1e-6)) { mesajTemporar("Ați început deja varianta b cu altă bulă. Goliți tabelele pentru a schimba varianta.", "pericol"); return; }
  const v = variantaBula();
  $("#in-db").value = v.d; $("#in-nb").value = v.nb;
  sim.dBula = v.d; sim.nBule = v.nb;
  sim.Vinj = v.V; sim.n = 0; sim.Vleak = 0; sim.dir = 0; sim.tintaN = null; SV.picaturi = [];
  animaSeringa();
  det.Va0 = +v.V.toFixed(4); det.dBula = v.d; det.nBule = v.nb; $("#det-Va0").value = det.Va0;
  mesajTemporar(`${v.nb === 1 ? "O bulă" : v.nb + " bule"} de Ø${fmt(v.d, 1)} mm (V_a0 = ${fmt(v.V, 3)} cm³) introdus${v.nb === 1 ? "ă" : "e"}; roata re-marcată (n = 0). Varianta b.`, "");
  salveaza();
}
/* sensul (încărcare/descărcare) după presiunea maximă atinsă – micile corecții înapoi nu schimbă sensul */
function sensCurent() { return sim.ultimP < (sim.pVarf || 0) - 2.5 ? "desc" : "inc"; }
function nPentruP(pt) { return (volumAbsorbit(cfg(), pt) + sim.Vleak) / Ar(); }
function pRealPentruCitire(pt) { // presiunea reală la care manometrul (cu eroarea lui) indică pt
  if (!sim.erori || pt <= 0) return pt;
  return pt >= 5 ? (pt - sim.errOff) / (1 + sim.errGain) : pt / (1 + sim.errGain + sim.errOff / 5);
}
function mergiLaTinta() {
  if (MOD.eval) return;
  const v = $("#sel-tinta").value;
  const pt = num(v);
  if (pt > 0 && !poateIncarca()) return;
  if (pt > 100) mesajTemporar("Atenție: NSSM limitează presiunea la 100 bar.", "pericol");
  sim.tintaN = pt <= 0 ? 0 : nPentruP(pRealPentruCitire(pt));
}

function inregistreaza(e) {
  if (MOD.eval && (!e || !e.isTrusted || navigator.webdriver)) { INTEG.netrusted++; salveazaInteg(); mesajTemporar("Citirea trebuie înregistrată de student, din aplicație.", "pericol"); return; }
  if (MOD.eval && (sim.tine || sim.tintaN !== null)) { mesajTemporar("Opriți roata și așteptați stabilizarea acului înainte de citire.", "pericol"); return; }
  const p = citire(sim.ultimP);
  const n = Math.round(sim.n * 100) / 100;
  const varB = sim.Vinj > 0;
  const dir = sensCurent();
  sim.log.push({ t: new Date().toISOString(), ms: MOD.eval && STUDENT ? Date.now() - Date.parse(STUDENT.start) : 0, var: varB ? "b" : "a", dir, p, n, aerisit: sim.aerisit, Vinj: +sim.Vinj.toFixed(4) });
  if (MOD.eval) { INTEG.inregistrari++; salveazaInteg(); }
  const tinte = varB ? TINTE_B : TINTE_A;
  let best = null;
  tinte.forEach(t => { const tol = Math.min(2.5, Math.max(0.3, 0.06 * t)); if (Math.abs(p - t) <= tol && (best === null || Math.abs(p - t) < Math.abs(p - best))) best = t; });
  const msg = $("#msg-inreg");
  if (best === null) {
    msg.textContent = `Citire salvată (p = ${fmt(p, 1)} bar, n = ${fmt(n)} rot), dar nu corespunde unei trepte din tabel (${tinte.join(", ")} bar).`;
  } else if (varB) {
    if (dir === "desc") msg.textContent = "Varianta b se citește la încărcare. Citirea a fost salvată doar în jurnal.";
    else { det.b[best] = n; msg.textContent = `Tabelul 2.3: p = ${best} bar → n = ${fmt(n)} rot.`; }
  } else {
    det.a[best][dir] = n;
    msg.textContent = `Tabelul 2.2: p = ${best} bar, ${dir === "inc" ? "încărcare" : "descărcare"} → n = ${fmt(n)} rot.`;
  }
  Object.assign(det, { V0: sim.V0, d: sim.d, s: sim.s, D: sim.D, e: sim.e, E: sim.E, T: sim.T, rho: FLUIDE[sim.fluid].rho, lichid: FLUIDE[sim.fluid].nume });
  scrieDateLucru(); construiesteTabele(); salveaza(); deseneazaLive();
}

/* ================================================================== bucla de animație */
let tPrec = performance.now();
function bucla(t) {
  const dt = Math.min(0.1, (t - tPrec) / 1000); tPrec = t;
  if (sim.tine) roteste(sim.tine * 0.6 * dt);
  if (sim.tintaN !== null) {
    const d = sim.tintaN - sim.n, pas = 1.8 * dt;
    if (Math.abs(d) <= pas) { roteste(d); sim.tintaN = null; } else roteste(Math.sign(d) * pas);
  }
  let p = presiune();
  if (sim.defect === "scurgere" && p > 0) {
    sim.Vleak += DEBIT_SCURGERE * (p / 100) * dt * (sim.rapid ? 10 : 1);
    p = presiune();
  }
  sim.ultimP = p;
  if (p < 0.3) sim.pVarf = 0; else if (p > (sim.pVarf || 0)) sim.pVarf = p;
  const pg = p <= 0.05 ? 0 : p * (1 + (sim.erori ? sim.errGain : 0)) + (sim.erori ? sim.errOff * Math.min(1, p / 5) : 0);
  // acul manometrului: sistem masă–arc–amortizor (ușoară depășire, ca la un manometru real)
  const ac = SV.ac, h = dt / 4;
  for (let i = 0; i < 4; i++) { ac.v += (260 * (pg - ac.p) - 22 * ac.v) * h; ac.p += ac.v * h; }
  actualizeazaSVG(p, ac.p, dt);
  actualizeazaAfisaje(p);
  if ($("#tab-auto").classList.contains("activ")) actualizeazaPedala(dt);
  requestAnimationFrame(bucla);
}

let ultimLive = 0, ultimFormule = 0;
function actualizeazaAfisaje(p) {
  const now = performance.now();
  if (now - ultimFormule < 120) return;
  ultimFormule = now;
  $("#af-p").textContent = fmt(citire(p), 1);
  $("#af-n").textContent = fmt(sim.n, 2);
  $("#af-dv").textContent = fmt(sim.n * Ar(), 3);
  $("#af-bula").textContent = sim.Vinj > 0 ? fmt(sim.Vinj * P_ATM / (P_ATM + p), 3) : (!sim.aerisit ? "bule!" : "—");
  const sd = $("#stare-dir");
  if (p < 0.3) { sd.textContent = "repaus (0 bar)"; sd.className = "eticheta"; }
  else if (sensCurent() === "inc") { sd.textContent = "încărcare ↑"; sd.className = "eticheta inc"; }
  else { sd.textContent = "descărcare ↓"; sd.className = "eticheta desc"; }
  $("#stare-var").textContent = sim.Vinj > 0 ? `varianta b – bulă ${fmt(sim.Vinj, 2)} cm³` : (sim.aerisit ? "varianta a – fără aer" : "neaerisit – aerisiți întâi!");
  const av = $("#avertizare");
  if (Date.now() > mesajPana) {
    if (p > 160) mesaj("Peste capătul scalei! Descărcați imediat.", "pericol", true);
    else if (p > 100.5) mesaj("Depășit 100 bar – limita NSSM a lucrării.", "pericol", true);
    else if (av.dataset.auto) mesaj("");
  }
  formuleVii(p);
  if (now - ultimLive > 200) { ultimLive = now; deseneazaLive(p); }
}

function formuleVii(p) {
  const c = cfg(), ar = Ar(), dV = sim.n * ar;
  const corr = corectieCil(sim.D, sim.e, sim.E);
  const Km = p > 0.5 ? sim.V0 * p * 1e5 / dV / 1e9 : NaN;
  const Kc = KDinKm(Km, sim.D, sim.e, sim.E);
  const proba = sim.fluid === "PROBA";
  const Kref = proba ? NaN : Kreal();
  const items = [
    ["Volumul dislocat (2.3)", `ΔV = n·πd²/4·s = ${fmt(sim.n)}·π·${fmt(sim.d, 1)}²/4·${fmt(sim.s, 2)} = <span class="rez">${fmt(dV * 1000, 1)} mm³ = ${fmt(dV, 4)} cm³</span>`],
    ["Volum pe rotație", `πd²/4·s = <span class="rez">${fmt(ar, 4)} cm³/rot</span>`],
    ["Modul aparent (2.2), fără separarea aerului", `K<sub>m</sub> = V₀·p/ΔV = ${fmt(sim.V0, 1)}·${fmt(p, 1)}·10⁵/${fmt(dV, 4)} = <span class="rez">${fmt(Km, 3)} GPa</span>`],
    ["Corecția cilindrului (2.8)", `D/(E·e) = ${fmt(sim.D, 0)}/(${fmt(sim.E, 0)}·10⁹·${fmt(sim.e, 1)}) = <span class="rez">${fmt(corr * 1e11, 2)}·10⁻¹¹ 1/Pa</span>`],
    ["Modul corectat (2.4)", `K = 1/(1/K<sub>m</sub> − D/(E·e)) = <span class="rez">${fmt(Kc, 3)} GPa</span>`],
    ["Compresibilitate", `β = 1/K = <span class="rez">${Number.isFinite(Kc) ? fmt(1 / Kc * 10, 2) + "·10⁻¹⁰ 1/Pa" : "—"}</span>`],
    ["Celeritate", `a = √(K/ρ) = √(${proba ? "K" : fmt(Kref, 2) + "·10⁹"}/${FLUIDE[sim.fluid].rho}) = <span class="rez">${proba ? "de determinat" : fmt(celeritate(Kref, FLUIDE[sim.fluid].rho), 0) + " m/s"}</span>`],
    ["Bula de aer (2.5), p abs. = " + fmt(p + 1, 1) + " bar", sim.Vinj > 0 ? `ΔV<sub>a</sub> = ${fmt(sim.Vinj, 2)}·(1 − 1/${fmt(p + 1, 1)}) = <span class="rez">${fmt(volAer(sim.Vinj, p), 3)} cm³</span> · rot. suplim. = ${fmt(volAer(sim.Vinj, p) / ar, 2)}` : "fără bulă introdusă"]
  ];
  if (!proba) items.push(["Valoarea de referință a lichidului", `K = ${fmt(Kref, 2)} GPa · K<sub>m</sub> așteptat = <span class="rez">${fmt(KmDinK(Kref, sim.D, sim.e, sim.E), 3)} GPa</span>`]);
  $("#formule-vii").innerHTML = items.map(([t, f]) => `<div class="formula"><span class="titlu">${t}</span>${f}</div>`).join("");
}

/* ================================================================== grafice */
function paleta(forteazaLuminos) {
  if (forteazaLuminos) return { text: "#1c2430", sec: "#5b6575", grila: "#e6e9ee", fundal: "#ffffff", s: ["#1f5f9e", "#c0492b", "#2e8b57", "#8a5a9e"] };
  return { text: css("--text"), sec: css("--text-sec"), grila: css("--grila"), fundal: css("--suprafata"), s: [css("--serie-0"), css("--serie-1"), css("--serie-2"), css("--serie-3")] };
}
function niceMax(v) { if (!(v > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); const m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e; }
function deseneazaGrafic(cv, o, luminos) {
  const dpr = window.devicePixelRatio || 1;
  // înălțimea de proiect se citește o singură dată (atributul height se schimbă la redimensionarea pentru ecrane HiDPI)
  if (!cv.dataset.h) cv.dataset.h = parseInt(cv.getAttribute("height"), 10) || 300;
  const W = cv.clientWidth || 600, H = +cv.dataset.h;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + "px";
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const P = paleta(luminos);
  g.fillStyle = P.fundal; g.fillRect(0, 0, W, H);
  const m = { l: 52, r: 14, t: 12, b: 40 };
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const xm = o.xmax, ym = o.ymax;
  const X = x => m.l + x / xm * w, Y = y => m.t + h - y / ym * h;
  g.font = "11px system-ui, sans-serif"; g.lineWidth = 1;
  const nx = 5, ny = 5;
  for (let i = 0; i <= nx; i++) {
    const v = xm * i / nx; g.strokeStyle = P.grila; g.beginPath(); g.moveTo(X(v), m.t); g.lineTo(X(v), m.t + h); g.stroke();
    g.fillStyle = P.sec; g.textAlign = "center"; g.fillText(fmt(v, xm < 1 ? 2 : xm < 10 ? 1 : 0), X(v), m.t + h + 15);
  }
  for (let i = 0; i <= ny; i++) {
    const v = ym * i / ny; g.strokeStyle = P.grila; g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(m.l + w, Y(v)); g.stroke();
    g.fillStyle = P.sec; g.textAlign = "right"; g.fillText(fmt(v, ym < 10 ? 1 : 0), m.l - 6, Y(v) + 4);
  }
  g.fillStyle = P.text; g.textAlign = "center"; g.fillText(o.xlab, m.l + w / 2, H - 6);
  g.save(); g.translate(13, m.t + h / 2); g.rotate(-Math.PI / 2); g.fillText(o.ylab, 0, 0); g.restore();
  g.save(); g.beginPath(); g.rect(m.l, m.t, w, h); g.clip();
  o.serii.forEach(s => {
    const col = s.culoare != null ? (typeof s.culoare === "number" ? P.s[s.culoare] : s.culoare) : P.s[0];
    g.strokeStyle = col; g.fillStyle = col;
    if (s.tip === "linie") {
      g.lineWidth = s.gros || 2; g.setLineDash(s.punctat ? [6, 4] : []);
      g.beginPath(); s.pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); g.setLineDash([]);
    } else {
      s.pts.forEach(([x, y]) => {
        g.beginPath(); g.arc(X(x), Y(y), s.r || 4.5, 0, 2 * Math.PI);
        if (s.gol) { g.lineWidth = 1.8; g.stroke(); } else g.fill();
      });
    }
  });
  g.restore();
}

function curbaTeoretica(c, pmax, pas = 0.5) {
  const pts = [];
  for (let p = 0; p <= pmax + 1e-9; p += (p < 10 ? 0.1 : pas)) pts.push([volumAbsorbit(c, p), p]);
  return pts;
}

function deseneazaLive(pArg) {
  const cv = $("#cv-live");
  if (!cv || !cv.offsetParent) return;
  const p = pArg ?? sim.ultimP;
  const ar = Ar();
  const c0 = { ...cfg(), Vaer: 0, Cf: 0 };
  const cAct = cfg();
  const pMax = 110;
  const xMax = niceMax(Math.max(volumAbsorbit(c0, pMax) * 1.15, sim.n * ar * 1.1, sim.Vinj > 0 ? volumAbsorbit(cAct, pMax) * 1.05 : 0, 0.2));
  const serii = [{ tip: "linie", pts: curbaTeoretica(c0, pMax), culoare: 0, punctat: true }];
  if (aerTotal() > 0 || cAct.Cf) serii.push({ tip: "linie", pts: curbaTeoretica(cAct, pMax), culoare: 1, punctat: true });
  const logA = sim.log.filter(l => l.var === "a"), logB = sim.log.filter(l => l.var === "b");
  serii.push({ tip: "pct", pts: logA.filter(l => l.dir === "inc").map(l => [l.n * ar, l.p]), culoare: 0, r: 3.5 });
  serii.push({ tip: "pct", pts: logA.filter(l => l.dir === "desc").map(l => [l.n * ar, l.p]), culoare: 0, gol: true, r: 6 });
  serii.push({ tip: "pct", pts: logB.map(l => [l.n * ar, l.p]), culoare: 1, r: 3.5 });
  serii.push({ tip: "pct", pts: [[sim.n * ar, citire(p)]], culoare: 2, r: 6 });
  deseneazaGrafic(cv, { xmax: xMax, ymax: 120, xlab: "ΔV dislocat de piston [cm³]", ylab: "p [bar]", serii });
}

/* ================================================================== determinări */
function scrieDateLucru() {
  const campuri = [["V0", "V₀ [cm³]"], ["d", "d piston [mm]"], ["s", "pas s [mm]"], ["D", "D cilindru [mm]"], ["e", "e perete [mm]"], ["E", "E [GPa]"], ["rho", "ρ lichid [kg/m³]"], ["T", "t [°C]"]];
  const cont = $("#date-lucru");
  if (!cont.children.length) {
    cont.innerHTML = campuri.map(([k, l]) => `<label class="camp">${l}<input type="number" step="any" data-det="${k}"></label>`).join("") +
      `<label class="camp" style="grid-column: span 2">Lichidul<input type="text" data-det="lichid"></label>`;
    $$("[data-det]", cont).forEach(i => i.addEventListener("input", () => {
      const k = i.dataset.det; det[k] = k === "lichid" ? i.value : num(i.value); calcDet(); salveaza();
    }));
  }
  $$("[data-det]", cont).forEach(i => { if (document.activeElement !== i) i.value = det[i.dataset.det] ?? ""; });
}

function construiesteTabele() {
  const t22 = $("#tab22");
  t22.innerHTML = `<thead><tr><th>p [bar]</th><th>n la încărcare [rot]</th><th>n la descărcare [rot]</th><th>ΔV [cm³]</th><th>K<sub>m</sub> [GPa]</th><th>K corectat [GPa]</th><th>Diferență încărcare–descărcare [cm³]</th></tr></thead><tbody>` +
    TINTE_A.map(p => `<tr data-p="${p}"><td><b>${p}</b></td><td><input inputmode="decimal" data-a="${p}" data-k="inc" value="${det.a[p].inc}"${MOD.eval ? " readonly" : ""}></td><td><input inputmode="decimal" data-a="${p}" data-k="desc" value="${det.a[p].desc}"${MOD.eval ? " readonly" : ""}></td><td class="calc"></td><td class="calc"></td><td class="calc"></td><td class="calc"></td></tr>`).join("") + "</tbody>";
  const t23 = $("#tab23");
  t23.innerHTML = `<thead><tr><th>p [bar]</th><th>n [rot]</th><th>ΔV total [cm³]</th><th>ΔV lichid [cm³]</th><th>ΔV aer [cm³]</th><th>ΔV<sub>a</sub> calculat [cm³]</th><th>Abatere</th></tr></thead><tbody>` +
    TINTE_B.map(p => `<tr data-p="${p}"><td><b>${p}</b></td><td><input inputmode="decimal" data-b="${p}" value="${det.b[p]}"${MOD.eval ? " readonly" : ""}></td><td class="calc"></td><td class="calc"></td><td class="calc"></td><td class="calc"></td><td class="calc"></td></tr>`).join("") + "</tbody>";
  $$("input[data-a]", t22).forEach(i => i.addEventListener("input", () => { det.a[i.dataset.a][i.dataset.k] = i.value.trim(); calcDet(); salveaza(); }));
  $$("input[data-b]", t23).forEach(i => i.addEventListener("input", () => { det.b[i.dataset.b] = i.value.trim(); calcDet(); salveaza(); }));
  calcDet();
}

let REZ = {};
function calcDet() {
  const ar = volRot(det.d, det.s);
  const corr = corectieCil(det.D, det.e, det.E);
  const xs = [0], ys = [0], ptsInc = [], ptsDesc = [];
  // tabel 2.2
  $$("#tab22 tbody tr").forEach(tr => {
    const p = +tr.dataset.p, ni = num(det.a[p].inc), nd = num(det.a[p].desc);
    const td = tr.querySelectorAll("td.calc");
    if (Number.isFinite(ni) && ni > 0) {
      const dV = ni * ar, Km = det.V0 * p * 1e5 / dV / 1e9, K = KDinKm(Km, det.D, det.e, det.E);
      td[0].textContent = fmt(dV, 4); td[1].textContent = fmt(Km, 3); td[2].textContent = fmt(K, 3);
      td[2].classList.toggle("rau", !(K >= 1.0 && K <= 2.6));
      xs.push(dV); ys.push(p); ptsInc.push([dV, p]);
    } else { td[0].textContent = td[1].textContent = td[2].textContent = ""; td[2].classList.remove("rau"); }
    if (Number.isFinite(nd) && nd >= 0 && det.a[p].desc !== "") ptsDesc.push([nd * ar, p]);
    td[3].textContent = Number.isFinite(ni) && Number.isFinite(nd) && det.a[p].desc !== "" ? fmt((ni - nd) * ar, 4) : "";
  });
  const reg = xs.length >= 3 ? regresie(xs, ys) : null;
  let KmR = NaN, KR = NaN;
  if (reg && reg.b > 0) { KmR = det.V0 * reg.b * 1e5 / 1e9; KR = KDinKm(KmR, det.D, det.e, det.E); }
  // valoarea folosită pentru separarea aerului
  const KmSep = Number.isFinite(KmR) ? KmR : (ptsInc.length ? det.V0 * ptsInc[ptsInc.length - 1][1] * 1e5 / ptsInc[ptsInc.length - 1][0] / 1e9 : KmDinK(1.68, det.D, det.e, det.E));
  // tabel 2.3
  const Va0 = num($("#det-Va0").value);
  det.Va0 = Va0;
  let sNum = 0, sDen = 0; const ptsB = [];
  $$("#tab23 tbody tr").forEach(tr => {
    const p = +tr.dataset.p, n = num(det.b[p]);
    const td = tr.querySelectorAll("td.calc");
    if (Number.isFinite(n) && n > 0) {
      const tot = n * ar, liq = det.V0 * p * 1e5 / (KmSep * 1e9), aer = tot - liq, calc = Number.isFinite(Va0) ? volAer(Va0, p) : NaN;
      td[0].textContent = fmt(tot, 4); td[1].textContent = fmt(liq, 4); td[2].textContent = fmt(aer, 4); td[3].textContent = fmt(calc, 4);
      td[4].textContent = Number.isFinite(calc) && calc > 0 ? fmt((aer - calc) / calc * 100, 1) + " %" : "";
      const f = 1 - 1 / (1 + p); sNum += aer * f; sDen += f * f;
      ptsB.push([tot, p]);
    } else td.forEach(t => t.textContent = "");
  });
  const VaEst = sDen > 0 ? sNum / sDen : NaN;
  // histerezis
  let hMax = 0; TINTE_A.forEach(p => { const ni = num(det.a[p].inc), nd = num(det.a[p].desc); if (Number.isFinite(ni) && Number.isFinite(nd) && det.a[p].desc !== "") hMax = Math.max(hMax, Math.abs(ni - nd) * ar); });
  const dV100 = ptsInc.length ? ptsInc[ptsInc.length - 1][0] : NaN;
  const n100a = num(det.a[100].inc), n100b = num(det.b[100]), n20b = num(det.b[20]);
  const aer20 = Number.isFinite(n20b) ? n20b * ar - det.V0 * 20 * 1e5 / (KmSep * 1e9) : NaN;
  REZ = { ar, reg, KmR, KR, corr, VaEst, Va0, hMax, KmSep, ptsInc, ptsDesc, ptsB, dV100, n100a, n100b, aer20 };
  scrieRezultate();
  deseneazaDet();
}

function scrieRezultate() {
  const r = REZ;
  const rows = [
    ["Volum pe rotație πd²/4·s", fmt(r.ar, 4) + " cm³"],
    ["Panta dreptei p–ΔV (regresie, cu originea)", r.reg ? fmt(r.reg.b, 1) + " bar/cm³ · R² = " + fmt(r.reg.r2, 4) : "min. 2 trepte"],
    ["Modul aparent K<sub>m</sub> = V₀·panta", fmt(r.KmR, 3) + " GPa"],
    ["Corecția cilindrului D/(E·e)", fmt(r.corr * 1e11, 2) + "·10⁻¹¹ 1/Pa"],
    ["Modul corectat K", "<span style='color:var(--accent)'>" + fmt(r.KR, 3) + " GPa</span>"],
    ["Compresibilitatea β = 1/K", Number.isFinite(r.KR) ? fmt(10 / r.KR, 2) + "·10⁻¹⁰ 1/Pa" : "—"],
    ["Efectul corecției (K − K<sub>m</sub>)/K", Number.isFinite(r.KR) ? fmt((r.KR - r.KmR) / r.KR * 100, 1) + " %" : "—"],
    ["Micșorarea volumului la 100 bar", Number.isFinite(r.KR) ? fmt(100e5 / (r.KR * 1e9) * 100, 2) + " %" : "—"],
    ["Celeritatea a = √(K/ρ)", Number.isFinite(r.KR) ? fmt(celeritate(r.KR, det.rho), 0) + " m/s" : "—"],
    ["Histerezis maxim (încărcare–descărcare)", r.hMax > 0 ? fmt(r.hMax, 4) + " cm³" : "—"],
    ["Volumul bulei estimat din măsurători", Number.isFinite(r.VaEst) ? fmt(r.VaEst, 3) + " cm³ (introdus: " + fmt(r.Va0, 2) + ")" : "—"]
  ];
  let verdict = "";
  if (Number.isFinite(r.KR)) {
    const glicol = /DOT ?(3|4|5\.1)|necunoscut/i.test(det.lichid || "DOT 4");
    const ok = glicol ? r.KR >= 1.5 && r.KR <= 2.0 : true;
    if (!ok && r.KR < 1.5) verdict = `<div class="verdict atentie">K = ${fmt(r.KR, 2)} GPa este sub intervalul 1,5…2,0 GPa al lichidelor pe bază de glicoli: verificați dacă a rămas aer în piezometru sau dacă în circuit există un element elastic (furtun) – §2.7.</div>`;
    else if (!ok) verdict = `<div class="verdict atentie">K = ${fmt(r.KR, 2)} GPa este peste intervalul obișnuit; verificați citirile și datele standului.</div>`;
    else verdict = `<div class="verdict ok">K = ${fmt(r.KR, 2)} GPa ${glicol ? "se încadrează în intervalul 1,5…2,0 GPa pentru lichidele pe bază de glicoli" : "a fost determinat"}.</div>`;
    if (r.hMax > 0.01) verdict += `<div class="verdict atentie">Curbele de încărcare și descărcare diferă cu ${fmt(r.hMax, 3)} cm³ – indiciu de scurgere la etanșarea pistonului.</div>`;
  }
  $("#rezultate").innerHTML = rows.map(([a, b]) => `<div class="rezultat"><span>${a}</span><b>${b}</b></div>`).join("") + verdict;
}

function serieDet() {
  const r = REZ, serii = [];
  const xMaxDate = Math.max(0.1, ...r.ptsInc.map(p => p[0]), ...r.ptsDesc.map(p => p[0]), ...r.ptsB.map(p => p[0]));
  if (r.reg) serii.push({ tip: "linie", pts: [[0, r.reg.a], [(110 - r.reg.a) / r.reg.b, 110]], culoare: 0, punctat: true });
  if (Number.isFinite(r.Va0) && r.Va0 > 0) {
    const pts = []; for (let p = 0; p <= 110; p += p < 10 ? 0.1 : 1) pts.push([det.V0 * p * 1e5 / (r.KmSep * 1e9) + volAer(r.Va0, p), p]);
    serii.push({ tip: "linie", pts, culoare: 1, punctat: true });
  }
  serii.push({ tip: "pct", pts: r.ptsInc, culoare: 0 });
  serii.push({ tip: "pct", pts: r.ptsDesc, culoare: 0, gol: true, r: 7.5 });
  serii.push({ tip: "pct", pts: r.ptsB, culoare: 1 });
  return { xmax: niceMax(xMaxDate * 1.1), ymax: 120, xlab: "ΔV [cm³]", ylab: "p [bar]", serii };
}
function deseneazaDet() {
  const cv = $("#cv-det");
  if (cv.offsetParent) deseneazaGrafic(cv, serieDet());
  $("#leg-det").innerHTML = `<span><i class="pct" style="background:var(--serie-0)"></i>varianta a – încărcare</span><span><i class="pct" style="border:2px solid var(--serie-0)"></i>varianta a – descărcare</span><span><i style="background:var(--serie-0)"></i>regresie liniară</span><span><i class="pct" style="background:var(--serie-1)"></i>varianta b – cu bulă</span><span><i style="background:var(--serie-1)"></i>teoretic (lichid + bulă izotermă)</span>`;
}

function completeazaExemplu() {
  if (MOD.eval) return;
  det = detGol();
  const c = { V0: 50, K: 1.68, D: 20, e: 5, E: 210, Vaer: 0 }, ar = volRot(10, 1);
  TINTE_A.forEach(p => { const n = volumAbsorbit(c, p) / ar; det.a[p].inc = n.toFixed(2); det.a[p].desc = n.toFixed(2); });
  det.a[100].inc = "3.90"; det.a[100].desc = "3.90";
  const cb = { ...c, Vaer: 0.5 };
  TINTE_B.forEach(p => { det.b[p] = (volumAbsorbit(cb, p) / ar).toFixed(2); });
  det.lichid = "Lichid de frână DOT 4 (exemplul din îndrumar)";
  $("#det-Va0").value = 0.5;
  scrieDateLucru(); construiesteTabele(); salveaza();
}

/* ================================================================== aplicații la autovehicul */
const PED = [["dm", "d pompă centrală [mm]", 22.22], ["ip", "raportul pedalei i<sub>p</sub>", 4], ["Vc", "lichid sub presiune [cm³]", 40], ["Kl", "K lichid [GPa]", 1.7],
  ["nf", "număr de furtunuri", 4], ["Lf", "lungime furtun [m]", 0.35], ["ef", "expansiune furtun [cm³/m la 100 bar]", 0.5], ["Vj", "jocuri plăcuțe [cm³]", 1.2],
  ["Vet", "deformare etriere la 100 bar [cm³]", 0.8], ["Va", "aer rămas V<sub>a0</sub> [cm³]", 1.0], ["pt", "presiunea țintă [bar]", 80], ["smax", "cursa max. a pompei [mm]", 36], ["sm0", "cursa moartă a pompei [mm]", 1.5]];
const UNDA = [["K", "K [GPa]", 1.7], ["rho", "ρ [kg/m³]", 1050], ["L", "lungimea conductei [m]", 3], ["dv", "variația vitezei Δv [m/s]", 2]];
const CR = [["K0", "K₀ motorină [GPa]", 1.5], ["Kp", "K′ (creșterea cu presiunea)", 5], ["p", "presiunea în rampă [bar]", 2000], ["rho", "ρ₀ [kg/m³]", 830]];
function campuriCalc(cont, lista, fn) {
  cont.innerHTML = lista.map(([k, l, v]) => `<label class="camp">${l}<input type="number" step="any" data-k="${k}" value="${v}"></label>`).join("");
  $$("input", cont).forEach(i => i.addEventListener("input", fn));
}
const val = (cont) => Object.fromEntries($$("input", cont).map(i => [i.dataset.k, num(i.value)]));

function valPedala() { const c = $("#pedala-in"); return c && c.children.length ? val(c) : null; }
function volumePedala(v, p, faraAer) {
  const lich = v.Vc * p * 1e5 / (v.Kl * 1e9);
  const furt = v.nf * v.Lf * v.ef * p / 100;
  const joc = p > 0 ? v.Vj * Math.min(1, p / 2) : 0; // jocurile se preiau la presiuni mici
  const et = v.Vet * p / 100;
  const aer = faraAer ? 0 : volAer(v.Va, p);
  return { lich, furt, joc, et, aer, tot: lich + furt + joc + et + aer };
}
/* cursa pistonului pompei [mm]: cursa moartă (orificiul de compensare) + volumul dislocat / aria pompei */
function cursaPompa(v, p, faraAer) {
  const Am = Math.PI * v.dm * v.dm / 4;
  return (p > 0 ? (v.sm0 || 0) * Math.min(1, p / 0.3) : 0) + volumePedala(v, p, faraAer).tot * 1000 / Am;
}
function calcAuto() {
  const v = val($("#pedala-in"));
  const Am = Math.PI * v.dm * v.dm / 4;
  const cu = volumePedala(v, v.pt, false), fara = volumePedala(v, v.pt, true);
  const sm = cursaPompa(v, v.pt, false), smF = cursaPompa(v, v.pt, true);
  const pct = sm / v.smax * 100;
  const comp = [["lichid", cu.lich, "var(--serie-0)"], ["furtunuri", cu.furt, "var(--serie-3)"], ["jocuri plăcuțe", cu.joc, "var(--serie-2)"], ["etriere", cu.et, "var(--text-sec)"], ["aer", cu.aer, "var(--serie-1)"]];
  $("#pedala-rez").innerHTML = `
    <div class="rezultat"><span>Aria pompei centrale A<sub>m</sub></span><b>${fmt(Am, 1)} mm²</b></div>
    <div class="rezultat"><span>Volum necesar la ${fmt(v.pt, 0)} bar – fără aer</span><b>${fmt(fara.tot, 2)} cm³</b></div>
    <div class="rezultat"><span>Volum necesar la ${fmt(v.pt, 0)} bar – cu aer</span><b>${fmt(cu.tot, 2)} cm³</b></div>
    <div class="rezultat"><span>Cursa pistonului pompei (fără / cu aer)</span><b>${fmt(smF, 1)} / ${fmt(sm, 1)} mm</b></div>
    <div class="rezultat"><span>Cursa pedalei (fără / cu aer)</span><b>${fmt(smF * v.ip, 0)} / ${fmt(sm * v.ip, 0)} mm</b></div>
    <div class="rezultat"><span>Din cursa disponibilă a pompei</span><b>${fmt(pct, 0)} %</b></div>
    <div class="verdict ${pct > 70 ? "atentie" : "ok"}">${pct > 100 ? "Pedala ajunge la podea înainte de presiunea țintă – frâna nu mai realizează decelerația cerută." : pct > 70 ? "Pedală „moale”: rezerva de cursă este mică; circuitul trebuie aerisit." : "Rezervă de cursă suficientă."}</div>`;
  $("#pedala-bare").innerHTML = `<p class="nota" style="margin-top:.8rem">Repartiția volumului absorbit la ${fmt(v.pt, 0)} bar:</p><div class="bara-stiva">${comp.map(([n, x, c]) => `<div title="${n}: ${fmt(x, 2)} cm³" style="width:${x / cu.tot * 100}%;background:${c}"></div>`).join("")}</div>
    <div class="legenda">${comp.map(([n, x, c]) => `<span><i class="pct" style="background:${c}"></i>${n} ${fmt(x, 2)} cm³</span>`).join("")}</div>`;
  const ptsF = [], ptsC = [];
  for (let p = 0; p <= Math.max(120, v.pt); p += p < 10 ? 0.25 : 2) { ptsF.push([cursaPompa(v, p, true) * v.ip, p]); ptsC.push([cursaPompa(v, p, false) * v.ip, p]); }
  const xmax = niceMax(Math.max(v.smax * v.ip, ptsC[ptsC.length - 1][0]) * 1.05);
  const cv = $("#cv-pedala");
  if (cv.offsetParent) deseneazaGrafic(cv, { xmax, ymax: Math.ceil(Math.max(120, v.pt) * 1.05 / 20) * 20, xlab: "cursa pedalei [mm]", ylab: "p [bar]", serii: [
    { tip: "linie", pts: ptsF, culoare: 0 }, { tip: "linie", pts: ptsC, culoare: 1 },
    { tip: "linie", pts: [[v.smax * v.ip, 0], [v.smax * v.ip, 1e4]], culoare: css("--text-sec"), punctat: true, gros: 1.5 }] });
  $("#leg-pedala").innerHTML = `<span><i style="background:var(--serie-0)"></i>fără aer</span><span><i style="background:var(--serie-1)"></i>cu ${fmt(v.Va, 2)} cm³ de aer</span><span><i style="background:var(--text-sec)"></i>capătul cursei pompei</span>`;

  const u = val($("#unda-in"));
  const a = celeritate(u.K, u.rho);
  $("#unda-rez").innerHTML = `<div class="rezultat"><span>Celeritatea a = √(K/ρ)</span><b>${fmt(a, 0)} m/s</b></div>
    <div class="rezultat"><span>Timpul de parcurs t = L/a</span><b>${fmt(u.L / a * 1000, 2)} ms</b></div>
    <div class="rezultat"><span>Perioada oscilației în conductă 4L/a</span><b>${fmt(4 * u.L / a * 1000, 2)} ms</b></div>
    <div class="rezultat"><span>Suprapresiunea Joukowski Δp = ρ·a·Δv</span><b>${fmt(u.rho * a * u.dv / 1e5, 1)} bar</b></div>
    <p class="nota">Cu K = 1,5 GPa și ρ = 830 kg/m³ (motorină) obțineți ≈ 1340 m/s, valoarea din îndrumar.</p>`;

  const c = val($("#cr-in"));
  const cLin = c.p * 1e5 / (c.K0 * 1e9) * 100, cVar = comprimareRelativa(c.K0, c.Kp, c.p) * 100;
  const Kp = c.K0 + c.Kp * c.p * 1e5 / 1e9, rhoP = c.rho / (1 - cVar / 100);
  // lucrul de comprimare pe litru (integrare numerică ∫p dV)
  let W = 0, N = 400; for (let i = 0; i < N; i++) { const p1 = c.p * i / N, p2 = c.p * (i + 1) / N; W += (p1 + p2) / 2 * 1e5 * (comprimareRelativa(c.K0, c.Kp, p2) - comprimareRelativa(c.K0, c.Kp, p1)) * 1e-3; }
  $("#cr-rez").innerHTML = `<div class="rezultat"><span>Micșorarea volumului – liniar p/K₀</span><b>${fmt(cLin, 1)} %</b></div>
    <div class="rezultat"><span>Micșorarea volumului – cu K = K₀ + K′·p</span><b>${fmt(cVar, 1)} %</b></div>
    <div class="rezultat"><span>Modulul la presiunea din rampă</span><b>${fmt(Kp, 2)} GPa</b></div>
    <div class="rezultat"><span>Densitatea la presiunea din rampă</span><b>${fmt(rhoP, 0)} kg/m³</b></div>
    <div class="rezultat"><span>Celeritatea la presiunea din rampă</span><b>${fmt(Math.sqrt(Kp * 1e9 / rhoP), 0)} m/s</b></div>
    <div class="rezultat"><span>Lucrul de comprimare pe litru de motorină</span><b>${fmt(W, 0)} J/L</b></div>
    <p class="nota">Lucrul de comprimare nu se recuperează integral la injecție – o parte din puterea absorbită de pompa de înaltă presiune.</p>`;
}

/* ================================================================== verificare */
function construiesteVerificare() {
  $("#intrebari").innerHTML = INTREBARI.map(([q, r], i) => `<p><b>${i + 1}.</b> ${q}</p><details class="sol"><summary>Răspuns</summary><p>${r}</p></details>`).join("");
  let scor = 0, raspunse = 0;
  $("#test").innerHTML = TEST.map((t, i) => `<div class="q" data-i="${i}"><p>${i + 1}. ${t.q}</p><div class="opt">${t.o.map((o, j) => `<button type="button" data-j="${j}">${o}</button>`).join("")}</div><div class="expl" hidden></div></div>`).join("");
  $$("#test .q").forEach(q => {
    const t = TEST[+q.dataset.i];
    $$("button", q).forEach(b => b.addEventListener("click", () => {
      if (q.dataset.gata) return;
      q.dataset.gata = 1; raspunse++;
      const j = +b.dataset.j;
      if (j === t.c) { b.classList.add("corect"); scor++; } else { b.classList.add("gresit"); $$("button", q)[t.c].classList.add("corect"); }
      const ex = $(".expl", q); ex.hidden = false; ex.innerHTML = (j === t.c ? "<b>Corect.</b> " : "<b>Greșit.</b> ") + t.e;
      $("#test-scor").textContent = `Scor: ${scor} / ${raspunse}` + (raspunse === TEST.length ? ` (din ${TEST.length} întrebări)` : "");
    }));
  });
}

/* ================================================================== referat, CSV */
function tabelStatic(id) {
  const t = $(id).cloneNode(true);
  $$("input", t).forEach(i => { const td = i.parentElement; td.textContent = i.value ? i.value.replace(".", ",") : ""; });
  t.removeAttribute("id");
  return t.outerHTML;
}
/* întrebări individuale – răspunsurile depind de datele fiecărui student */
function intrebariIndividuale() {
  const Am = Math.PI * 22.22 ** 2 / 4, Va = det.Va0 || 0;
  return [
    { id: "q1", u: "cm³", d: 3, val: REZ.aer20, text: `Din Tabelul 2.3 al vostru: ce volum a absorbit aerul (ΔV aer) până la <b>20 bar</b>?`, textSimplu: "Volumul absorbit de aer până la 20 bar (Tabelul 2.3)" },
    { id: "q2", u: "rot", d: 2, val: REZ.n100b - REZ.n100a, text: `Câte rotații <b>în plus</b> față de lichidul fără aer au fost necesare până la 100 bar, cu bula voastră?`, textSimplu: "Rotații suplimentare până la 100 bar" },
    { id: "q3", u: "m/s", d: 0, val: Number.isFinite(REZ.KR) ? celeritate(REZ.KR, 1050) : NaN, text: `Celeritatea undei de presiune în lichidul vostru, cu K determinat de voi și ρ = 1050 kg/m³:`, textSimplu: "Celeritatea a = √(K/ρ) cu K determinat" },
    { id: "q4", u: "mm", d: 1, val: Va * (1 - 1 / 41) * 1000 / Am * 4, text: `Dacă aerul vostru (V<sub>a0</sub> = ${fmt(Va, 3)} cm³) ar rămâne în circuitul de frânare (pompă Ø22,22 mm, i<sub>p</sub> = 4), cu cât ar crește cursa pedalei până la 40 bar?`, textSimplu: `Creșterea cursei pedalei la 40 bar cu V_a0 = ${Va.toFixed(3)} cm³` }
  ];
}
function construiesteFormReferat() {
  const qs = intrebariIndividuale();
  $("#ref-intrebari").innerHTML = qs.map((q, i) => `<div class="q-ind"><p>${i + 1}. ${q.text}</p><label class="inline-r"><input type="text" inputmode="decimal" data-q="${q.id}" maxlength="12" value="${esc(ref.raspunsuri[q.id] || "")}"> <span>${q.u}</span></label></div>`).join("");
  $$("#ref-intrebari input[data-q]").forEach(i => pazaTastare(i, v => { ref.raspunsuri[i.dataset.q] = v; salveaza(); }));
}
function actualizeazaTexteIntrebari() {
  const qs = intrebariIndividuale();
  $$("#ref-intrebari .q-ind").forEach((d, i) => { const p = d.querySelector("p"); const t = `${i + 1}. ${qs[i].text}`; if (p.innerHTML !== t) p.innerHTML = t; });
}
function verificaReferatComplet() {
  const lipsa = [];
  const na = TINTE_A.filter(p => det.a[p].inc !== "").length, nb = TINTE_B.filter(p => det.b[p] !== "").length;
  if (na < 5) lipsa.push(`Tabelul 2.2: ${na}/5 trepte la încărcare`);
  if (TINTE_A.filter(p => det.a[p].desc !== "").length < 3) lipsa.push("Tabelul 2.2: cel puțin 3 citiri la descărcare");
  if (nb < 6) lipsa.push(`Tabelul 2.3: ${nb}/6 trepte`);
  $$("#ref-intrebari input[data-q]").forEach((i, k) => { if (!Number.isFinite(num(i.value))) lipsa.push(`răspunsul la întrebarea ${k + 1}`); });
  const lc = $("#ref-concluzii").value.trim().length;
  if (lc < CONFIG.referat.minConcluzii) lipsa.push(`concluziile: ${lc}/${CONFIG.referat.minConcluzii} caractere`);
  return lipsa;
}
function genReferat() {
  calcDet();
  actualizeazaTexteIntrebari();
  const img = graficPNG();
  const qs = intrebariIndividuale();
  const idt = MOD.eval && STUDENT
    ? `<b>Student:</b> ${esc(STUDENT.nume)} (${esc(STUDENT.email)})<br><b>Grupa:</b> ${esc(STUDENT.grupa)} &nbsp; <b>Data:</b> ${new Date(STUDENT.start).toLocaleDateString("ro-RO")} &nbsp; <b>Început:</b> ${new Date(STUDENT.start).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`
    : `<span class="filigran">MOD DEMONSTRATIV – referat nevalidat (fără prezență și fără cod de sesiune)</span>`;
  const varTxt = det.dBula ? `${det.nBule} ${det.nBule === 1 ? "bulă" : "bule"} Ø${fmt(det.dBula, 1)} mm, ` : "";
  $("#contor-concluzii").textContent = `${$("#ref-concluzii").value.trim().length} / ${CONFIG.referat.minConcluzii} caractere minim`;
  $("#referat").innerHTML = `
  <div class="antet-ref">Universitatea „Ovidius” din Constanța · FIMIM · ${CONFIG.program}<br>${CONFIG.disciplina} – laborator</div>
  <h1>Referat – Lucrarea ${CONFIG.laborator}. ${CONFIG.titluLab}</h1>
  <p>${idt}</p>
  <h3>1. Scopul lucrării</h3>
  <p>Determinarea modulului de elasticitate al unui lichid de frână cu piezometrul cu piston filetat și evidențierea efectului aerului asupra volumului absorbit (cursa pedalei).</p>
  <h3>2. Relații de calcul</h3>
  <p>ΔV = n·πd²/4·s; &nbsp; K<sub>m</sub> = V₀·Δp/ΔV; &nbsp; 1/K = 1/K<sub>m</sub> − D/(E·e); &nbsp; β = 1/K; &nbsp; V<sub>a0</sub> = n<sub>b</sub>·πd<sub>b</sub>³/6; &nbsp; ΔV<sub>a</sub> = V<sub>a0</sub>(1 − p₀/p); &nbsp; a = √(K/ρ).</p>
  <h3>3. Date ale standului și varianta individuală</h3>
  <p>V₀ = ${fmt(det.V0, 1)} cm³; d = ${fmt(det.d, 1)} mm; s = ${fmt(det.s, 2)} mm; D = ${fmt(det.D, 0)} mm; e = ${fmt(det.e, 1)} mm; E = ${fmt(det.E, 0)} GPa; ρ = ${fmt(det.rho, 0)} kg/m³; aer introdus: ${varTxt}V<sub>a0</sub> = ${fmt(det.Va0, 3)} cm³.</p>
  <h3>4. Determinări</h3>
  <p><b>Tabelul 2.2.</b> Lichidul fără aer</p>${tabelStatic("#tab22")}
  <p><b>Tabelul 2.3.</b> Lichidul cu aer</p>${tabelStatic("#tab23")}
  <h3>5. Curbele p(ΔV)</h3>
  <img src="${img}" alt="Curbele presiune – volum">
  <h3>6. Rezultate</h3>
  ${$("#rezultate").innerHTML}
  <h3>7. Întrebări individuale</h3>
  ${qs.map((q, i) => `<p>${i + 1}. ${q.text}<br><b>Răspuns:</b> ${esc(ref.raspunsuri[q.id] || "…")} ${q.u}</p>`).join("")}
  <h3>8. Concluzii</h3>
  <p>${esc(ref.concluzii).replace(/\n/g, "<br>") || "…"}</p>`;
}

function exportCSV() {
  const ar = volRot(det.d, det.s);
  const L = [];
  L.push("Lucrarea 2 - Compresibilitatea lichidului de frana");
  L.push(`V0 [cm3];${det.V0};d [mm];${det.d};s [mm];${det.s};D [mm];${det.D};e [mm];${det.e};E [GPa];${det.E};rho;${det.rho}`);
  L.push(""); L.push("Tabelul 2.2;p [bar];n incarcare;n descarcare;dV [cm3];Km [GPa];K [GPa]");
  TINTE_A.forEach(p => { const n = num(det.a[p].inc); const dV = n * ar; const Km = det.V0 * p * 1e5 / dV / 1e9; L.push(`;${p};${det.a[p].inc};${det.a[p].desc};${Number.isFinite(dV) ? dV.toFixed(4) : ""};${Number.isFinite(Km) ? Km.toFixed(3) : ""};${Number.isFinite(Km) ? KDinKm(Km, det.D, det.e, det.E).toFixed(3) : ""}`); });
  L.push(""); L.push(`Tabelul 2.3;Va0 [cm3];${det.Va0}`); L.push(";p [bar];n;dV total [cm3]");
  TINTE_B.forEach(p => { const n = num(det.b[p]); L.push(`;${p};${det.b[p]};${Number.isFinite(n) ? (n * ar).toFixed(4) : ""}`); });
  L.push(""); L.push(`Rezultate;Km regresie [GPa];${Number.isFinite(REZ.KmR) ? REZ.KmR.toFixed(3) : ""};K [GPa];${Number.isFinite(REZ.KR) ? REZ.KR.toFixed(3) : ""}`);
  L.push(""); L.push("Jurnal citiri;moment;varianta;sens;p [bar];n [rot]");
  sim.log.forEach(l => L.push(`;${l.t};${l.var};${l.dir};${l.p};${l.n}`));
  const blob = new Blob(["﻿" + L.join("\r\n").replace(/(\d)\.(\d)/g, "$1,$2")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "lucrarea2_compresibilitate.csv"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ================================================================== scenarii */
function scenariu(id) {
  if (MOD.eval) { mesajTemporar("Scenariile sunt dezactivate în timpul lucrării individuale.", "pericol"); return; }
  $("#ck-ochelari").checked = true; $("#ck-ecran").checked = true;
  $("#in-fluid").value = "DOT4"; ["V0:50", "d:10", "s:1", "D:20", "e:5", "E:210"].forEach(x => { const [k, v] = x.split(":"); $("#in-" + k).value = v; });
  $("#ck-erori").checked = false;
  $("#in-defect").value = (id === "furtun" || id === "scurgere") ? id : "none";
  setareDinFormular();
  sim.aerisit = true; sim.Vleak = 0; sim.n = 0; sim.dir = 1; SV.picaturi = [];
  sim.Vinj = (id === "exB" || id === "exB100") ? 0.5 : 0;
  $("#in-db").value = 10; $("#in-nb").value = 1;
  sim.Vinj = (id === "exB" || id === "exB100") ? 0.5 : 0; sim.dBula = 9.85; sim.nBule = 1;
  const tinta = id === "exB" ? 20 : 100;
  sim.tintaN = nPentruP(tinta);
  arataTab("sim");
  mesajTemporar(id === "exA" ? "Exemplul rezolvat: n ≈ 3,90 rot la 100 bar (erori de măsurare dezactivate)." :
    id === "exB" ? "Bulă de 0,5 cm³: urmăriți câte rotații sunt necesare până la 20 bar." :
    id === "exB100" ? "Bulă de 0,5 cm³ până la 100 bar: ≈ 10,2 rotații." :
    id === "furtun" ? "Furtun racordat: modulul echivalent scade mult sub cel al lichidului." :
    "Scurgere la etanșare: țineți presiunea și urmăriți manometrul, apoi descărcați.", "");
}

/* ================================================================== inițializare */
function init() {
  incarca();
  const sf = $("#in-fluid");
  sf.innerHTML = Object.entries(FLUIDE).map(([k, f]) => `<option value="${k}">${f.nume}</option>`).join("");
  sf.value = "DOT4";
  $("#sel-tinta").innerHTML = [0, 1, 2, 5, 20, 40, 60, 80, 100].map(p => `<option value="${p}">${p === 0 ? "0 bar (descarcă)" : p + " bar"}</option>`).join("");
  $("#sel-tinta").value = "20";
  construiesteSVG();
  $("#teorie").innerHTML = HTML_TEORIE;
  $("#probleme").innerHTML = htmlProbleme();
  campuriCalc($("#pedala-in"), PED, calcAuto);
  campuriCalc($("#unda-in"), UNDA, calcAuto);
  campuriCalc($("#cr-in"), CR, calcAuto);
  construiesteVerificare();
  construiestePedala();
  $("#sl-frana").addEventListener("input", e => { FRANA.auto = null; FRANA.Ft = num(e.target.value); });
  $("#btn-frana").addEventListener("click", () => { FRANA.auto = 0; });
  $("#det-Va0").value = det.Va0;
  scrieDateLucru(); construiesteTabele();

  $$("#taburi button").forEach(b => b.addEventListener("click", () => arataTab(b.dataset.tab)));
  document.addEventListener("click", e => {
    const m = e.target.closest("[data-mergi]"); if (m) { e.preventDefault(); arataTab(m.dataset.mergi); }
    const s = e.target.closest("[data-scenariu]"); if (s) scenariu(s.dataset.scenariu);
  });
  $$(".roata-butoane button").forEach(b => b.addEventListener("click", () => { sim.tintaN = null; roteste(num(b.dataset.dn)); }));
  const tine = (btn, dir) => {
    const on = e => { e.preventDefault(); sim.tintaN = null; sim.tine = dir; btn.classList.add("apasat"); };
    const off = () => { if (sim.tine === dir) sim.tine = 0; btn.classList.remove("apasat"); };
    btn.addEventListener("pointerdown", on); btn.addEventListener("pointerup", off); btn.addEventListener("pointerleave", off); btn.addEventListener("pointercancel", off);
  };
  tine($("#btn-tine-inc"), 1); tine($("#btn-tine-desc"), -1);
  document.addEventListener("keydown", e => {
    if (!$("#tab-sim").classList.contains("activ") || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); sim.tintaN = null; roteste((e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 0.01 : 0.1)); }
    if (e.key === "Enter") inregistreaza(e);
  });
  $("#btn-tinta").addEventListener("click", mergiLaTinta);
  $("#btn-inreg").addEventListener("click", inregistreaza);
  $("#btn-aerisire").addEventListener("click", aeriseste);
  $("#btn-bula").addEventListener("click", introduBula);
  $$(".sim-comenzi input, .sim-comenzi select").forEach(i => { if (!["in-db", "in-nb"].includes(i.id)) i.addEventListener("change", setareDinFormular); });
  $("#det-Va0").addEventListener("input", () => { calcDet(); salveaza(); });
  $("#btn-exemplu-tab").addEventListener("click", completeazaExemplu);
  $("#btn-golire").addEventListener("click", () => { if (confirmGolire()) { det = Object.assign(detGol(), { V0: det.V0, d: det.d, s: det.s, D: det.D, e: det.e, E: det.E, rho: det.rho, T: det.T, lichid: det.lichid }); if (MOD.eval) sim.log.push({ t: new Date().toISOString(), ms: Date.now() - Date.parse(STUDENT.start), var: "-", dir: "golire", p: 0, n: 0 }); else sim.log = []; scrieDateLucru(); construiesteTabele(); salveaza(); } });
  const conc = $("#ref-concluzii"); conc.value = ref.concluzii || "";
  pazaTastare(conc, v => { ref.concluzii = v; salveaza(); $("#contor-concluzii").textContent = `${v.trim().length} / ${CONFIG.referat.minConcluzii} caractere minim`; clearTimeout(genReferat.t); genReferat.t = setTimeout(genReferat, 600); });
  construiesteFormReferat();
  $("#hp-ai").addEventListener("input", () => { INTEG.honeypot = true; salveazaInteg(); });
  $("#btn-trimite").addEventListener("click", trimiteReferat);
  ["#ref-intrebari", "#referat"].forEach(id => $(id).addEventListener("copy", e => { if (MOD.eval) { e.preventDefault(); } }));
  ["#in-db", "#in-nb"].forEach(id => $(id).addEventListener("input", scrieNotaBula));
  scrieNotaBula();
  $("#btn-print").addEventListener("click", () => { arataTab("referat"); setTimeout(() => window.print(), 300); });
  $("#btn-print2").addEventListener("click", () => window.print());
  $("#btn-csv").addEventListener("click", exportCSV);
  window.addEventListener("resize", () => { deseneazaLive(); deseneazaDet(); if ($("#tab-auto").classList.contains("activ")) calcAuto(); });
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { deseneazaLive(); deseneazaDet(); });

  incarcaStudent();
  setareDinFormular();
  if (MOD.eval) aplicaModEvaluare();
  construiesteTabele();
  if (ref.trimis && ref.trimis.url) { $("#ref-stare").className = "verdict ok"; $("#ref-stare").innerHTML = `Referat trimis la ${new Date(ref.trimis.la).toLocaleString("ro-RO")}. <a href="${ref.trimis.url}" target="_blank" rel="noopener">Documentul Google</a>`; }
  let tab = "sim"; try { tab = localStorage.getItem(CHEIE + "-tab") || "sim"; } catch (e) { }
  arataTab(tab);
  mesaj("Începeți cu pregătirea NSSM și aerisirea piezometrului.", "");
  requestAnimationFrame(bucla);
}
let golireArmat = 0;
function confirmGolire() {
  const b = $("#btn-golire");
  if (Date.now() - golireArmat < 3000) { b.textContent = "Golește tabelele"; golireArmat = 0; return true; }
  golireArmat = Date.now(); b.textContent = "Apăsați din nou pentru confirmare";
  setTimeout(() => { b.textContent = "Golește tabelele"; }, 3000);
  return false;
}
document.addEventListener("DOMContentLoaded", init);
