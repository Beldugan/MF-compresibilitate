/* Sesiunea studentului, prezența, integritatea lucrului și trimiterea referatului */
"use strict";

const CHEIE_ST = "mf-lab2-student-v1";
const MOD = { eval: false };
let STUDENT = null; // {nume, email, grupa, token, start, seed, cod}

/* ---------- generator determinist (identic cu cel din Apps Script) */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function parametriDinSeed(seed) {
  const r = mulberry32(seed);
  return { errOff: (r() * 2 - 1) * 0.8, errGain: (r() * 2 - 1) * 0.006, Klot: 1.68 * (1 + (r() * 2 - 1) * 0.04) };
}

/* ---------- jurnalul de integritate */
const INTEG = {
  tastari: 0, caractere: 0, lipiri: 0, respinse: 0, programatic: 0, netrusted: 0,
  intervale: [], ultimaTasta: 0, ascunsNr: 0, ascunsMs: 0, ascunsDe: 0,
  honeypot: false, webdriver: !!navigator.webdriver, inregistrari: 0, mutariMouse: 0
};
function salveazaInteg() { try { localStorage.setItem(CHEIE_ST + "-integ", JSON.stringify(INTEG)); } catch (e) { } }
function incarcaInteg() { try { Object.assign(INTEG, JSON.parse(localStorage.getItem(CHEIE_ST + "-integ") || "{}"), { webdriver: !!navigator.webdriver }); } catch (e) { } }

document.addEventListener("visibilitychange", () => {
  if (!MOD.eval) return;
  if (document.hidden) { INTEG.ascunsNr++; INTEG.ascunsDe = Date.now(); }
  else if (INTEG.ascunsDe) { INTEG.ascunsMs += Date.now() - INTEG.ascunsDe; INTEG.ascunsDe = 0; }
  salveazaInteg();
});
document.addEventListener("pointermove", e => { if (e.isTrusted) INTEG.mutariMouse++; }, { passive: true });

/* Protecție la tastare: fără lipire, fără text introdus de scripturi, fără inserări în bloc */
const TIPURI_PERMISE = new Set(["insertText", "insertCompositionText", "insertReplacementText", "deleteContentBackward", "deleteContentForward", "deleteWordBackward", "deleteWordForward", "deleteSoftLineBackward", "deleteHardLineBackward", "insertLineBreak", "insertParagraph", "historyUndo", "historyRedo", "deleteByCut"]);
function avertizeazaRef(text) {
  const s = $("#ref-stare"); if (!s) return;
  s.className = "verdict atentie"; s.textContent = text;
  clearTimeout(avertizeazaRef.t); avertizeazaRef.t = setTimeout(() => { if (s.textContent === text) { s.textContent = ""; s.className = ""; } }, 5000);
}
function pazaTastare(el, laSchimbare) {
  el.setAttribute("autocomplete", "off");
  el.setAttribute("autocorrect", "off");
  el.setAttribute("data-gramm", "false");
  el.setAttribute("data-lt-active", "false");
  let bun = el.value;
  const blocheaza = (e, motiv) => { e.preventDefault(); INTEG.lipiri++; salveazaInteg(); avertizeazaRef(motiv); };
  el.addEventListener("paste", e => blocheaza(e, "Lipirea textului nu este permisă: scrieți răspunsul cu propriile cuvinte."));
  el.addEventListener("drop", e => blocheaza(e, "Nu se pot trage texte în acest câmp."));
  el.addEventListener("beforeinput", e => {
    const lung = (e.data || "").length;
    const lim = e.inputType === "insertText" ? 2 : 25;
    if (!e.isTrusted || !TIPURI_PERMISE.has(e.inputType) || lung > lim) {
      e.preventDefault(); INTEG.respinse++; if (!e.isTrusted) INTEG.netrusted++; salveazaInteg();
    }
  });
  el.addEventListener("input", e => {
    if (!e.isTrusted) { el.value = bun; INTEG.netrusted++; INTEG.respinse++; return; }
    const delta = el.value.length - bun.length;
    if (delta > 25) { el.value = bun; INTEG.respinse++; salveazaInteg(); return; }
    if (delta > 0) INTEG.caractere += delta;
    bun = el.value;
    salveazaInteg();
    if (laSchimbare) laSchimbare(bun);
  });
  el.addEventListener("keydown", e => {
    if (!e.isTrusted) { INTEG.netrusted++; return; }
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      INTEG.tastari++;
      const now = performance.now();
      if (INTEG.ultimaTasta && now - INTEG.ultimaTasta < 4000) { INTEG.intervale.push(Math.round(now - INTEG.ultimaTasta)); if (INTEG.intervale.length > 3000) INTEG.intervale.shift(); }
      INTEG.ultimaTasta = now;
    }
  });
  // valoare schimbată de un script (fără evenimente) → revenire
  setInterval(() => { if (el.value !== bun) { el.value = bun; INTEG.programatic++; salveazaInteg(); avertizeazaRef("Textul a fost modificat din afara tastaturii și a fost anulat."); } }, 700);
  el.valoareBuna = () => bun;
  el.seteaza = v => { bun = v; el.value = v; };
}

function analizaIntegritate(textTotal) {
  const motive = [], note = [];
  const iv = INTEG.intervale.slice().sort((a, b) => a - b);
  const med = iv.length ? iv[Math.floor(iv.length / 2)] : 0;
  const medie = iv.length ? iv.reduce((s, x) => s + x, 0) / iv.length : 0;
  const cv = iv.length > 1 ? Math.sqrt(iv.reduce((s, x) => s + (x - medie) ** 2, 0) / iv.length) / medie : 1;
  if (INTEG.webdriver) motive.push("browser automatizat (webdriver)");
  if (INTEG.honeypot) motive.push("câmpul-capcană pentru asistenți automați a fost completat");
  if (INTEG.programatic > 0) motive.push(`text modificat de scripturi (${INTEG.programatic}×)`);
  if (INTEG.netrusted > 0) motive.push(`evenimente sintetice (${INTEG.netrusted})`);
  if (INTEG.respinse > 5) motive.push(`inserări de text în bloc respinse (${INTEG.respinse})`);
  if (iv.length >= 80 && med < 45) motive.push(`tastare anormal de rapidă (median ${med} ms între taste)`);
  if (iv.length >= 80 && cv < 0.3) motive.push(`ritm de tastare anormal de uniform (CV = ${cv.toFixed(2)})`);
  if (textTotal > 50 && INTEG.caractere < 0.8 * textTotal) motive.push("textul final este mai lung decât textul tastat");
  if (INTEG.lipiri > 0) note.push(`încercări de lipire blocate: ${INTEG.lipiri}`);
  if (INTEG.ascunsNr > 0) note.push(`a părăsit pagina de ${INTEG.ascunsNr} ori (${Math.round(INTEG.ascunsMs / 60000)} min)`);
  if (STUDENT && sim.log.length) {
    const durata = (sim.log[sim.log.length - 1].ms || 0) / 60000;
    if (durata < CONFIG.referat.minDurataMin) motive.push(`determinări efectuate în doar ${durata.toFixed(1)} min`);
  }
  return { status: motive.length ? "DE VERIFICAT" : "OK", motive, note, med, cv: +cv.toFixed(2), tastari: INTEG.tastari, caractere: INTEG.caractere, mouse: INTEG.mutariMouse };
}

/* ---------- comunicarea cu Apps Script */
async function apelServer(params, corp) {
  if (!CONFIG.endpoint) throw new Error("Aplicația nu este conectată la registrul de prezență (CONFIG.endpoint).");
  let r;
  if (corp) r = await fetch(CONFIG.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(corp) });
  else r = await fetch(CONFIG.endpoint + "?" + new URLSearchParams(params).toString());
  const j = await r.json();
  if (!j.ok) throw new Error(j.eroare || "Eroare la server.");
  return j;
}

/* ---------- bara studentului */
function salveazaStudent() { try { localStorage.setItem(CHEIE_ST, JSON.stringify(STUDENT)); } catch (e) { } }
function incarcaStudent() {
  try { STUDENT = JSON.parse(localStorage.getItem(CHEIE_ST) || "null"); } catch (e) { STUDENT = null; }
  if (STUDENT && STUDENT.token) { MOD.eval = true; aplicaModEvaluare(); }
  incarcaInteg();
  randeazaBaraStudent();
}
function randeazaBaraStudent() {
  const b = $("#bara-student");
  if (MOD.eval && STUDENT) {
    const ora = new Date(STUDENT.start).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    b.innerHTML = `<div class="st-info"><b>${esc(STUDENT.nume)}</b> · ${esc(STUDENT.grupa)} · ${esc(STUDENT.email)}<br><span class="ok-txt">✓ Prezență înregistrată la ${ora}</span> · lucrare individuală – datele voastre sunt unice</div>
      <button type="button" id="btn-iesire">Ieșire</button>`;
    $("#btn-iesire").addEventListener("click", iesire);
    return;
  }
  b.innerHTML = `<div class="st-form">
    <label class="camp">Nume și prenume<input id="st-nume" autocomplete="name" maxlength="80"></label>
    <label class="camp">E-mail (contul din Google Classroom)<input id="st-email" type="email" autocomplete="email" maxlength="100"></label>
    <label class="camp">Grupa / subgrupa<input id="st-grupa" placeholder="AR II, sgr. 1" maxlength="40"></label>
    <label class="camp">Codul sesiunii (afișat de cadrul didactic)<input id="st-cod" maxlength="8" style="text-transform:uppercase;letter-spacing:.15em" autocomplete="off"></label>
    <button type="button" class="primar" id="btn-start">Începe laboratorul</button>
  </div><p class="nota" id="st-msg">${CONFIG.endpoint ? "Introduceți datele și codul afișat în laborator. Prezența se înregistrează automat." : "Mod demonstrativ: aplicația nu este conectată la registrul de prezență; referatul nu poate fi trimis."}</p>`;
  $("#btn-start").addEventListener("click", startLab);
}
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function startLab(e) {
  const msg = $("#st-msg");
  if (!e.isTrusted || navigator.webdriver) { msg.textContent = "Aplicația trebuie folosită direct de student, nu printr-un program automat."; return; }
  const nume = $("#st-nume").value.trim().replace(/\s+/g, " "), email = $("#st-email").value.trim().toLowerCase(), grupa = $("#st-grupa").value.trim(), cod = $("#st-cod").value.trim().toUpperCase();
  if (nume.split(" ").length < 2) { msg.textContent = "Scrieți numele complet (nume și prenume)."; return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || (CONFIG.domeniuEmail && !email.endsWith("@" + CONFIG.domeniuEmail))) { msg.textContent = `Adresa de e-mail nu este validă${CONFIG.domeniuEmail ? " (trebuie să fie @" + CONFIG.domeniuEmail + ")" : ""}.`; return; }
  if (!grupa) { msg.textContent = "Completați grupa."; return; }
  if (cod.length < 6) { msg.textContent = "Introduceți codul sesiunii, afișat de cadrul didactic."; return; }
  msg.textContent = "Se verifică codul…";
  try {
    const j = await apelServer({ action: "start", lab: CONFIG.laborator, nume, email, grupa, cod });
    STUDENT = { nume, email, grupa, cod, token: j.token, start: j.start, seed: j.seed };
    salveazaStudent();
    // lucrare nouă, curată
    det = detGol(); sim.log = []; ref.concluzii = ""; ref.raspunsuri = {};
    Object.keys(INTEG).forEach(k => { if (typeof INTEG[k] === "number") INTEG[k] = 0; });
    INTEG.intervale = []; INTEG.honeypot = false; INTEG.webdriver = !!navigator.webdriver;
    salveaza(); salveazaInteg();
    MOD.eval = true;
    aplicaModEvaluare();
    randeazaBaraStudent();
    construiesteTabele();
    mesajTemporar("Laborator început. Parcurgeți pregătirea NSSM și aerisirea.", "");
  } catch (err) { msg.textContent = err.message; }
}
function iesire() {
  const b = $("#btn-iesire");
  if (b.dataset.armat !== "1") { b.dataset.armat = "1"; b.textContent = "Confirmați ieșirea (datele locale se șterg)"; setTimeout(() => { b.dataset.armat = ""; b.textContent = "Ieșire"; }, 3500); return; }
  try { localStorage.removeItem(CHEIE_ST); localStorage.removeItem(CHEIE_ST + "-integ"); localStorage.removeItem(CHEIE); } catch (e) { }
  location.reload();
}

/* Modul de evaluare: parametrii individuali, standul blocat, fără scurtături */
function aplicaModEvaluare() {
  document.body.classList.add("mod-eval");
  const pr = parametriDinSeed(STUDENT.seed);
  Object.assign(sim, { errOff: pr.errOff, errGain: pr.errGain, Klot: pr.Klot, erori: true, defect: "none", fluid: "DOT4", mano: "analog", V0: 50, d: 10, s: 1, D: 20, e: 5, E: 210, T: 20 });
  const set = (id, v) => { const el = $(id); if (el) { if (el.type === "checkbox") el.checked = v; else el.value = v; el.disabled = true; } };
  set("#in-fluid", "DOT4"); set("#in-V0", 50); set("#in-d", 10); set("#in-s", 1); set("#in-D", 20); set("#in-e", 5); set("#in-E", 210); set("#in-T", 20);
  set("#in-mano", "analog"); set("#ck-erori", true); set("#in-defect", "none"); set("#ck-rapid", false);
  const va = $("#det-Va0"); if (va) va.readOnly = true;
  $$("[data-det]").forEach(i => i.readOnly = true);
  $$("[data-scenariu]").forEach(b => { b.disabled = true; b.title = "Indisponibil în timpul lucrării individuale"; });
  ["#btn-exemplu-tab"].forEach(id => { const b = $(id); if (b) { b.disabled = true; b.title = "Indisponibil în timpul lucrării individuale"; } });
  if (typeof construiesteSVG === "function" && SV.g) construiesteSVG();
}

/* ---------- trimiterea referatului */
function graficPNG() {
  const cv = document.createElement("canvas"); cv.setAttribute("height", 340);
  cv.style.width = "720px"; cv.style.position = "absolute"; cv.style.left = "-9999px";
  document.body.appendChild(cv); deseneazaGrafic(cv, serieDet(), true);
  const d = cv.toDataURL("image/png"); cv.remove(); return d;
}
async function trimiteReferat(e) {
  const st = $("#ref-stare");
  if (!e.isTrusted || navigator.webdriver) { INTEG.netrusted++; st.className = "verdict atentie"; st.textContent = "Trimiterea trebuie făcută de student."; return; }
  if (!MOD.eval) { st.className = "verdict atentie"; st.textContent = "Referatul se poate trimite numai după „Începe laboratorul” (cu codul sesiunii)."; return; }
  const conc = $("#ref-concluzii");
  if (conc.value !== conc.valoareBuna()) { conc.value = conc.valoareBuna(); INTEG.programatic++; }
  const lipsa = verificaReferatComplet();
  if (lipsa.length) { st.className = "verdict atentie"; st.innerHTML = "Referatul nu este complet:<br>• " + lipsa.join("<br>• "); return; }
  const raspunsuri = {};
  $$("#ref-intrebari input[data-q]").forEach(i => { raspunsuri[i.dataset.q] = i.valoareBuna ? i.valoareBuna() : i.value; });
  const textTotal = conc.valoareBuna().length + Object.values(raspunsuri).join("").length;
  const integ = analizaIntegritate(textTotal);
  if (INTEG.webdriver) { st.className = "verdict atentie"; st.textContent = "Trimitere blocată: browser automatizat."; return; }
  const btn = $("#btn-trimite"); btn.disabled = true; st.className = "verdict"; st.textContent = "Se trimite referatul…";
  const payload = {
    action: "trimite", lab: CONFIG.laborator, versiuneApp: "2.0",
    student: { nume: STUDENT.nume, email: STUDENT.email, grupa: STUDENT.grupa }, token: STUDENT.token, start: STUDENT.start,
    varianta: { dBula: sim.dBula, nBule: sim.nBule, Va0: det.Va0 },
    tabele: { a: det.a, b: det.b }, log: sim.log,
    rezultate: { Km: REZ.KmR, K: REZ.KR, r2: REZ.reg ? REZ.reg.r2 : null, VaEst: REZ.VaEst },
    intrebari: intrebariIndividuale().map(q => ({ id: q.id, text: q.textSimplu, unitate: q.u })),
    raspunsuri, concluzii: conc.valoareBuna(), integritate: integ, grafic: graficPNG(),
    trimisLa: new Date().toISOString()
  };
  try {
    const j = await apelServer(null, payload);
    ref.trimis = { la: payload.trimisLa, url: j.docUrl };
    salveaza();
    st.className = "verdict ok";
    st.innerHTML = `Referatul a fost trimis și salvat (${new Date().toLocaleString("ro-RO")}). <a href="${j.docUrl}" target="_blank" rel="noopener">Deschide documentul Google</a>.<br>Predați-l acum în Google Classroom, la tema Lucrării ${CONFIG.laborator}:`;
    arataShareClassroom(j.docUrl);
  } catch (err) { st.className = "verdict atentie"; st.textContent = "Trimiterea a eșuat: " + err.message; }
  btn.disabled = false;
}
function arataShareClassroom(url) {
  const c = $("#share-classroom"); c.innerHTML = ""; c.hidden = false;
  const randeaza = () => { try { window.gapi.sharetoclassroom.render(c, { url, size: 48, title: `Referat L${CONFIG.laborator} – ${STUDENT.nume}`, body: CONFIG.titluLab, itemtype: "assignment" }); } catch (e) { c.innerHTML = `<a href="https://classroom.google.com/" target="_blank" rel="noopener">Deschide Google Classroom</a> și atașați documentul din Drive.`; } };
  if (window.gapi && window.gapi.sharetoclassroom) return randeaza();
  const s = document.createElement("script"); s.src = "https://apis.google.com/js/platform.js"; s.async = true;
  s.onload = () => { if (window.gapi && gapi.load) gapi.load("sharetoclassroom", randeaza); else randeaza(); };
  s.onerror = () => { c.innerHTML = `<a href="https://classroom.google.com/" target="_blank" rel="noopener">Deschide Google Classroom</a> și atașați documentul (îl găsiți în Drive, „Partajate cu mine”).`; };
  document.head.appendChild(s);
}
