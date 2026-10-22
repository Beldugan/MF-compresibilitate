/* Conținutul didactic – Lucrarea 2 (din Îndrumarul de laborator Mecanica fluidelor, 2026) */
"use strict";

const FR = (a, b) => `<span class="fr"><span>${a}</span><span>${b}</span></span>`;
const EC = (expr, nr) => `<div class="ec"><span>${expr}</span>${nr ? `<span class="nr">(${nr})</span>` : ""}</div>`;
const F = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace(".", ",") : "—");
const FE = (x, d = 2) => { // notație științifică ×10^n
  if (!Number.isFinite(x) || x === 0) return F(x, d);
  const e = Math.floor(Math.log10(Math.abs(x)));
  return `${F(x / Math.pow(10, e), d)}·10<sup>${e}</sup>`;
};

/* ---------------- TEORIE ---------------- */
const HTML_TEORIE = `
<h2>Lucrarea 2. Compresibilitatea lichidului de frână și efectul aerului din circuit</h2>
<p class="nota">Durata: 2 ore · Locul: laboratorul de mecanica fluidelor · Echipe de 3–4 studenți</p>
<figure><img src="img/stand.jpg" alt="Piezometru cu piston filetat, manometru, roată de manevră și ecran de protecție; detaliu cu lichid fără aer și cu bulă de aer" loading="lazy"></figure>
<ol class="cuprins">
  <li><a href="#t-nssm">Norme specifice NSSM</a></li>
  <li><a href="#t-scop">2.1. Scopul lucrării</a></li>
  <li><a href="#t-teorie">2.2. Noțiuni teoretice</a></li>
  <li><a href="#t-aparatura">2.3. Aparatură și echipamente</a></li>
  <li><a href="#t-mod">2.4. Modul de lucru</a></li>
  <li><a href="#t-prel">2.6. Prelucrarea datelor</a></li>
  <li><a href="#t-interp">2.7. Interpretarea rezultatelor</a></li>
  <li><a href="#t-relev">2.8. Relevanță practică</a></li>
</ol>

<div class="nssm" id="t-nssm">
<h3>Norme specifice de securitate și sănătate în muncă (NSSM)</h3>
<ul>
<li>Presiunea din piezometru nu depășește <b>100 bar</b>; manometrul are domeniul de 160 bar, iar încercarea se face cu ecranul de protecție coborât și cu ochelari de protecție.</li>
<li>Racordurile se strâng și se desfac numai după descărcarea presiunii (pistonul retras până la 0 bar pe manometru).</li>
<li>Lichidul de frână este toxic la înghițire, iritant pentru ochi și distruge vopseaua: se lucrează cu mănuși de nitril și ochelari; în caz de contact cu ochii se clătește 15 minute cu apă.</li>
<li>Lichidul de frână este higroscopic: recipientul se închide imediat după folosire; lichidul folosit nu se reintroduce în recipientul original și se colectează ca deșeu periculos.</li>
<li>Roata de manevră se rotește lent, fără șocuri; dacă presiunea crește brusc sau apare o scurgere, se oprește încercarea și se anunță cadrul didactic.</li>
</ul>
</div>

<h3 id="t-scop">2.1. Scopul lucrării</h3>
<p>Determinarea modulului de elasticitate (a compresibilității) unui lichid de frână și evidențierea efectului pe care îl are o cantitate mică de aer în circuit asupra volumului absorbit – adică asupra cursei pedalei de frână. Se calculează și viteza de propagare a undelor de presiune, importantă pentru circuitele ABS și pentru rampa common-rail.</p>

<h3 id="t-teorie">2.2. Noțiuni teoretice</h3>
<p>Lichidele sunt puțin compresibile, dar nu incompresibile. La creșterea presiunii cu Δp, un volum V<sub>0</sub> de lichid se micșorează cu ΔV. Compresibilitatea β și modulul de elasticitate K (inversul ei) se definesc prin:</p>
${EC(`β = −${FR("1", "V<sub>0</sub>")}·${FR("ΔV", "Δp")} &nbsp;&nbsp;[1/Pa]`, "2.1")}
${EC(`K = ${FR("1", "β")} = −V<sub>0</sub>·${FR("Δp", "ΔV")} &nbsp;&nbsp;[Pa]`, "2.2")}
<p>Valori orientative la 20 °C: apă 2,2 GPa, ulei mineral 1,4…1,8 GPa, lichid de frână pe bază de glicoli (DOT 3, DOT 4, DOT 5.1) 1,5…2,0 GPa, motorină ≈ 1,5 GPa (K crește cu presiunea). Aerul, la presiunea atmosferică, are K = p ≈ 0,1 MPa în compresie izotermă – de circa 15 000 de ori mai compresibil decât lichidul.</p>
<p>Piezometrul (Fig. 2.1) este un cilindru de oțel cu pereți groși, umplut cu lichid, în care un piston filetat este împins cu roata de manevră. La n rotații, cu pasul s și diametrul pistonului d, volumul dislocat este:</p>
<figure><img src="img/fig2_1.jpg" alt="Fig. 2.1 Piezometrul cu piston filetat" loading="lazy"><figcaption>Fig. 2.1. Piezometrul cu piston filetat pentru determinarea compresibilității</figcaption></figure>
${EC(`ΔV = n·${FR("π·d<sup>2</sup>", "4")}·s`, "2.3")}
<p>Cilindrul se dilată și el sub presiune, astfel că se măsoară un modul aparent K<sub>m</sub> mai mic decât modulul real. Pentru un cilindru cu diametrul interior D, grosimea peretelui e și modulul de elasticitate al materialului E (oțel: 210 GPa), corecția este:</p>
${EC(`${FR("1", "K")} = ${FR("1", "K<sub>m</sub>")} − ${FR("D", "E·e")}`, "2.4")}
<p>Aceeași relație explică de ce furtunurile flexibile de frână și de servodirecție au un „modul echivalent” mult mai mic decât al lichidului: peretele de cauciuc se dilată și absoarbe volum.</p>
<p>Dacă în lichid există o bulă de aer cu volumul V<sub>a0</sub> la presiunea absolută p<sub>0</sub>, aceasta se comprimă izoterm (p·V = const.). Volumul absorbit de bulă până la presiunea absolută p este:</p>
${EC(`ΔV<sub>a</sub> = V<sub>a0</sub>·(1 − ${FR("p<sub>0</sub>", "p")})`, "2.5")}
<p>Bula absoarbe aproape tot volumul său la presiuni mici (jumătate din el până la 1 bar suprapresiune), deci pistonul – și pedala de frână – parcurge o cursă mare fără ca presiunea să crească (Fig. 2.2). Acesta este fenomenul de „pedală moale” după o aerisire incompletă sau la fierberea lichidului de frână (bulele de vapori au același efect).</p>
<figure><img src="img/fig2_2.png" alt="Fig. 2.2 Curba presiune – volum" loading="lazy"><figcaption>Fig. 2.2. Curba presiune – volum pentru lichidul fără aer și cu o bulă de aer de 0,5 cm³</figcaption></figure>
<p>Modulul de elasticitate determină și viteza de propagare a undelor de presiune în lichid (celeritatea):</p>
${EC(`a = √(K/ρ)`, "")}
<p>Pentru motorină, a = √(1,5·10<sup>9</sup>/830) ≈ 1340 m/s: la închiderea unui injector, unda de presiune parcurge rampa și conducta de înaltă presiune în câteva zecimi de milisecundă și influențează injecțiile următoare. Tot compresibilitatea explică de ce, la 2000 bar, motorina își micșorează volumul cu aproape 10 % și de ce pompa de înaltă presiune consumă energie pentru comprimare.</p>
<p>Lichidul de frână pe bază de glicoli absoarbe apă din aer (higroscopicitate); apa scade punctul de fierbere și favorizează apariția bulelor de vapori la frânări repetate. Standardul FMVSS 116 impune valorile minime din Tabelul 2.1; lichidul se înlocuiește la 2 ani sau când conținutul de apă depășește ≈ 3 %.</p>
<p><b>Tabelul 2.1.</b> Cerințe minime pentru lichidele de frână (FMVSS 116)</p>
<div class="tabel-scroll"><table class="tabel">
<tr><th>Clasa</th><th>Bază</th><th>Punct de fierbere uscat, min. [°C]</th><th>Punct de fierbere umed, min. [°C]</th><th>ν la −40 °C, max. [mm²/s]</th></tr>
<tr><td>DOT 3</td><td>glicoli</td><td>205</td><td>140</td><td>1500</td></tr>
<tr><td>DOT 4</td><td>glicoli și esteri borici</td><td>230</td><td>155</td><td>1800</td></tr>
<tr><td>DOT 5.1</td><td>glicoli și esteri borici</td><td>260</td><td>180</td><td>900</td></tr>
<tr><td>DOT 5</td><td>siliconică</td><td>260</td><td>180</td><td>900</td></tr>
</table></div>

<h3 id="t-aparatura">2.3. Aparatură și echipamente</h3>
<ul>
<li>Piezometru cu piston filetat (d = 10 mm, pas s = 1 mm), cilindru de oțel D = 20 mm, e = 5 mm, volum util ≈ 50 cm³</li>
<li>Manometru 0…160 bar, clasa 1 (sau traductor de presiune cu afișaj)</li>
<li>Lichid de frână DOT 4 (recipient nou), seringă de 1 cm³ pentru introducerea bulei de aer</li>
<li>Termometru, ecran de protecție transparent, ochelari și mănuși de nitril</li>
<li>Recipient pentru colectarea lichidului uzat</li>
</ul>

<h3 id="t-mod">2.4. Modul de lucru</h3>
<ol>
<li>Se verifică umplerea completă a piezometrului cu lichid fără bule (aerisire prin șurubul de aerisire, cu pistonul retras) și se notează volumul V<sub>0</sub> și temperatura lichidului.</li>
<li>Se aduce presiunea la zero, se marchează poziția roții de manevră și se coboară ecranul de protecție.</li>
<li>Se rotește roata în trepte și se citește numărul de rotații pentru presiunile de 20, 40, 60, 80 și 100 bar (Tabelul 2.2).</li>
<li>Se descarcă treptat presiunea, citind din nou rotațiile la aceleași presiuni, pentru a verifica reversibilitatea (histerezisul).</li>
<li>Varianta b: după descărcarea completă, se introduce cu seringa o bulă de aer de 0,5 cm³ și se repetă măsurătorile, citind suplimentar și presiunile de 1, 2 și 5 bar.</li>
<li>Se descarcă presiunea, se golește piezometrul, se aerisește și se curăță conform indicațiilor cadrului didactic.</li>
</ol>
<p class="nota">În simulator: bifați ochelarii și ecranul, apăsați „Aerisește piezometrul”, apoi rotiți roata până la fiecare presiune și apăsați „Înregistrează”. Pentru varianta b, descărcați la 0 bar și apăsați „Introdu bula cu seringa”.</p>

<h3 id="t-prel">2.6. Prelucrarea datelor</h3>
<p>Se calculează volumul dislocat pentru fiecare treaptă, modulul aparent K<sub>m</sub> (cel mai bine din panta dreptei p–ΔV obținută prin regresie liniară), modulul corectat K și compresibilitatea β. Pentru varianta b se separă volumul absorbit de aer și se compară cu relația izotermă. Se trasează curbele p(ΔV) pentru cele două variante. Toate aceste calcule se fac automat în fila <a href="#" data-mergi="det">Determinări</a>.</p>

<h3 id="t-interp">2.7. Interpretarea rezultatelor</h3>
<ul>
<li>Valoarea K obținută se compară cu intervalul 1,5…2,0 GPa pentru lichidele pe bază de glicoli; o valoare mult mai mică arată aer rămas în piezometru.</li>
<li>Curba de încărcare și cea de descărcare trebuie să fie apropiate; diferențe mari indică scurgeri la etanșarea pistonului.</li>
<li>Se discută efectul corecției pentru deformarea cilindrului (≈ 3 %) și de ce furtunurile de cauciuc ar avea o influență mult mai mare.</li>
<li>Se explică forma curbei cu aer: la presiuni mici panta este aproape nulă (bula se comprimă), apoi curba devine paralelă cu cea a lichidului.</li>
</ul>

<h3 id="t-relev">2.8. Relevanță practică</h3>
<p>Compresibilitatea explică cursa pedalei și timpul de răspuns al frânei: sistemele electrohidraulice (de exemplu frâna integrată cu recuperare de energie la vehiculele electrice) și ABS/ESC calculează volumul necesar pentru a atinge presiunea dorită și sunt sensibile la aerul din circuit. La injecția common-rail, modulul de elasticitate al motorinei intervine în calculul volumului rampei, al undelor de presiune și al debitului pompei de înaltă presiune.</p>
`;

/* ---------------- EXEMPLU ȘI PROBLEME ---------------- */
function htmlProbleme() {
  const Ar = volRot(10, 1);                     // cm³/rot
  // P2 – bula de 0,5 cm³
  const cfgA = { V0: 50, K: 1.68, D: 20, e: 5, E: 210, Vaer: 0 };
  const cfgB = { ...cfgA, Vaer: 0.5 };
  const n20a = volumAbsorbit(cfgA, 20) / Ar, n20b = volumAbsorbit(cfgB, 20) / Ar;
  const n100a = volumAbsorbit(cfgA, 100) / Ar, n100b = volumAbsorbit(cfgB, 100) / Ar;
  // P3 – celeritate, lovitură de berbec
  const a3 = celeritate(1.7, 1050), t3 = 3 / a3 * 1000, dp3 = 1050 * a3 * 2 / 1e5;
  // P4 – peretele cilindrului
  const km5 = KmDinK(1.68, 20, 5, 210), km2 = KmDinK(1.68, 20, 2, 210), kmAl = KmDinK(1.68, 20, 5, 70);
  // P5 – pedala
  const Am = Math.PI * 22.22 ** 2 / 4, dVa5 = volAer(1, 40), sm5 = dVa5 * 1000 / Am, sp5 = sm5 * 4;
  // P6 – common-rail
  const c6lin = 2000e5 / 1.5e9 * 100, c6exp = comprimareRelativa(1.5, 0, 2000) * 100, c6var = comprimareRelativa(1.5, 5, 2000) * 100;
  // P7 – furtunuri
  const dVf = 4 * 0.35 * 0.5, dVl = 40 * 100e5 / 1.7e9, Kech = 40e-6 * 100e5 / ((dVf + dVl) * 1e-6) / 1e9;
  // P8 – scurgere
  const dVs = 0.45 * Ar;

  return `
<h2>Exemplu rezolvat (§2.6)</h2>
<p>V<sub>0</sub> = 50,0 cm³, d = 10 mm, s = 1 mm. La 100 bar s-au măsurat n = 3,90 rotații; cilindrul are D = 20 mm și e = 5 mm (oțel, E = 210 GPa).</p>
${EC(`ΔV = 3,90·${FR("π·10<sup>2</sup>", "4")}·1 = 306 mm³ = 0,306 cm³`, "2.6")}
${EC(`K<sub>m</sub> = ${FR("50,0·10<sup>−6</sup>·100·10<sup>5</sup>", "0,306·10<sup>−6</sup>")} = 1,63 GPa`, "2.7")}
${EC(`${FR("D", "E·e")} = ${FR("0,020", "210·10<sup>9</sup>·0,005")} = 1,90·10<sup>−11</sup> 1/Pa`, "2.8")}
${EC(`K = ${FR("1", `${FR("1", "1,63·10<sup>9</sup>")} − 1,90·10<sup>−11</sup>`)} = 1,68 GPa`, "2.9")}
${EC(`β = ${FR("1", "K")} = 5,9·10<sup>−10</sup> 1/Pa &nbsp;⇒&nbsp; la 100 bar lichidul își micșorează volumul cu 0,59 %`, "2.10")}
<p>Cu bula de aer de 0,5 cm³ (p<sub>0</sub> = 1 bar absolut), până la 20 bar suprapresiune (21 bar absolut):</p>
${EC(`ΔV<sub>a</sub> = 0,5·(1 − ${FR("1", "21")}) = 0,476 cm³`, "2.11")}
${EC(`n<sub>a</sub> = ${FR("0,476", "0,0785")} = 6,1 rotații suplimentare`, "2.12")}
<p>Pentru a ajunge la 100 bar, lichidul fără aer are nevoie de 3,9 rotații, iar cel cu bula de aer de ≈ 10,2 rotații. O bulă de numai 1 % din volum mărește de peste două ori volumul absorbit – la vehicul, cursa pedalei.</p>
<div class="rand-butoane">
  <button type="button" data-scenariu="exA">Încarcă în simulator: lichid fără aer, 100 bar</button>
  <button type="button" data-scenariu="exB">Încarcă în simulator: bulă de 0,5 cm³, 20 bar</button>
</div>

<h2 style="margin-top:1.6rem">Probleme propuse</h2>

<div class="problema"><h3>Problema 1. Rotațiile necesare cu și fără aer</h3>
<p>Pentru piezometrul din exemplu (K = 1,68 GPa), calculați numărul de rotații până la 20 bar și 100 bar, fără aer și cu o bulă de 0,5 cm³. Ce fracțiune din cursă „se pierde” în bulă la 100 bar?</p>
<details class="sol"><summary>Rezolvare</summary>
<p>Volumul pe rotație: π·10²/4·1 = 78,54 mm³ = ${F(Ar, 4)} cm³. Volumul absorbit de lichid (cu corecția cilindrului): ΔV = V<sub>0</sub>·p/K<sub>m</sub>, cu K<sub>m</sub> = ${F(km5, 3)} GPa. Volumul bulei: relația (2.5).</p>
<div class="tabel-scroll"><table class="tabel"><tr><th>p [bar]</th><th>n fără aer</th><th>n cu bulă 0,5 cm³</th></tr>
<tr><td>20</td><td>${F(n20a)}</td><td>${F(n20b)}</td></tr>
<tr><td>100</td><td>${F(n100a)}</td><td>${F(n100b)}</td></tr></table></div>
<p>La 100 bar bula absoarbe ${F(volAer(0.5, 100), 3)} cm³, adică ${F(volAer(0.5, 100) / (n100b * Ar) * 100, 0)} % din volumul dislocat de piston.</p>
<button type="button" data-scenariu="exB100">Verifică în simulator (bulă, 100 bar)</button>
</details></div>

<div class="problema"><h3>Problema 2. Celeritatea și lovitura de berbec în circuitul ABS</h3>
<p>Lichid de frână: K = 1,7 GPa, ρ = 1050 kg/m³. (a) Calculați viteza undei de presiune. (b) În cât timp parcurge unda o conductă de 3 m? (c) Electrovalva ABS oprește brusc o curgere cu viteza de 2 m/s – ce suprapresiune apare (relația lui Joukowski Δp = ρ·a·Δv)?</p>
<details class="sol"><summary>Rezolvare</summary>
<p>(a) a = √(1,7·10<sup>9</sup>/1050) = <b>${F(a3, 0)} m/s</b>. (b) t = L/a = 3/${F(a3, 0)} = <b>${F(t3, 2)} ms</b>. (c) Δp = 1050·${F(a3, 0)}·2 = ${F(dp3 * 1e5 / 1e6, 2)} MPa ≈ <b>${F(dp3, 0)} bar</b> – de aceea modulatoarele ABS au acumulatoare și amortizoare de pulsații.</p>
</details></div>

<div class="problema"><h3>Problema 3. Cât contează peretele cilindrului?</h3>
<p>Lichidul are K = 1,68 GPa, D = 20 mm. Calculați modulul aparent K<sub>m</sub> măsurat cu un cilindru de oțel cu e = 5 mm, cu un cilindru de oțel cu e = 2 mm și cu un cilindru de aluminiu (E = 70 GPa) cu e = 5 mm.</p>
<details class="sol"><summary>Rezolvare</summary>
<p>Din (2.4): K<sub>m</sub> = 1/(1/K + D/(E·e)).</p>
<div class="tabel-scroll"><table class="tabel"><tr><th>Cilindru</th><th>D/(E·e) [1/Pa]</th><th>K<sub>m</sub> [GPa]</th><th>Eroare fără corecție</th></tr>
<tr><td>oțel, e = 5 mm</td><td>${FE(corectieCil(20, 5, 210))}</td><td>${F(km5, 3)}</td><td>${F((1 - km5 / 1.68) * 100, 1)} %</td></tr>
<tr><td>oțel, e = 2 mm</td><td>${FE(corectieCil(20, 2, 210))}</td><td>${F(km2, 3)}</td><td>${F((1 - km2 / 1.68) * 100, 1)} %</td></tr>
<tr><td>aluminiu, e = 5 mm</td><td>${FE(corectieCil(20, 5, 70))}</td><td>${F(kmAl, 3)}</td><td>${F((1 - kmAl / 1.68) * 100, 1)} %</td></tr></table></div>
<p>Încercați în simulator: modificați e sau E în „Lichid și stand” și urmăriți K<sub>m</sub> din calculul în timp real.</p>
</details></div>

<div class="problema"><h3>Problema 4. Aerul din circuit și cursa pedalei</h3>
<p>Pompa centrală are d<sub>m</sub> = 22,22 mm, raportul pedalei i<sub>p</sub> = 4 (Lucrarea 3). După o aerisire incompletă a rămas 1 cm³ de aer. Cu cât crește cursa pedalei până la 40 bar?</p>
<details class="sol"><summary>Rezolvare</summary>
<p>A<sub>m</sub> = π·22,22²/4 = ${F(Am, 1)} mm². ΔV<sub>a</sub> = 1·(1 − 1/41) = ${F(dVa5, 3)} cm³. Cursa suplimentară a pistonului: s<sub>m</sub> = ${F(dVa5 * 1000, 0)}/${F(Am, 1)} = ${F(sm5, 2)} mm; la pedală: ${F(sm5, 2)}·4 = <b>${F(sp5, 1)} mm</b>. Șoferul simte o pedală „moale”, care coboară ≈ 1 cm înainte să frâneze.</p>
<button type="button" data-mergi="auto">Deschide calculatorul de pedală</button>
</details></div>

<div class="problema"><h3>Problema 5. Motorina la 2000 bar</h3>
<p>Pentru motorină K<sub>0</sub> = 1,5 GPa. Calculați micșorarea relativă a volumului la 2000 bar: (a) liniar, ΔV/V = p/K; (b) cu K constant, integrat; (c) cu K = K<sub>0</sub> + K′·p, K′ = 5.</p>
<details class="sol"><summary>Rezolvare</summary>
<p>(a) 200·10<sup>6</sup>/1,5·10<sup>9</sup> = ${F(c6lin, 1)} %. (b) 1 − e<sup>−p/K</sup> = ${F(c6exp, 1)} %. (c) 1 − (1 + K′p/K<sub>0</sub>)<sup>−1/K′</sup> = <b>${F(c6var, 1)} %</b> – „aproape 10 %”, cum arată îndrumarul. Modulul crește cu presiunea, deci relația liniară supraestimează comprimarea.</p>
</details></div>

<div class="problema"><h3>Problema 6. Modulul echivalent al unui circuit cu furtunuri</h3>
<p>Un circuit de frânare conține 40 cm³ de lichid (K = 1,7 GPa) sub presiune și 4 furtunuri de 0,35 m, fiecare absorbind 0,5 cm³/m la 100 bar. Calculați volumul absorbit la 100 bar și modulul echivalent al circuitului.</p>
<details class="sol"><summary>Rezolvare</summary>
<p>Lichid: 40·10⁷/1,7·10⁹ = ${F(dVl, 3)} cm³. Furtunuri: 4·0,35·0,5 = ${F(dVf, 2)} cm³ – de ${F(dVf / dVl, 1)} ori mai mult decât lichidul. K<sub>ech</sub> = V·Δp/ΔV = <b>${F(Kech, 2)} GPa</b>. De aceea la sport se folosesc furtunuri cu tresă metalică (expansiune mică).</p>
<button type="button" data-scenariu="furtun">Încarcă situația „furtun racordat” în simulator</button>
</details></div>

<div class="problema"><h3>Problema 7. Diagnostic: histerezis mare</h3>
<p>La încărcare s-au citit 3,90 rotații la 100 bar, iar la descărcare manometrul a ajuns la 0 bar când roata mai avea 0,45 rotații până la poziția inițială. Ce s-a întâmplat și ce volum s-a pierdut?</p>
<details class="sol"><summary>Rezolvare</summary>
<p>Presiunea a scăzut la zero înainte ca pistonul să revină: lichidul a ieșit pe lângă etanșarea pistonului. Volumul pierdut: 0,45·${F(Ar, 4)} = <b>${F(dVs, 3)} cm³</b>. Determinarea se repetă după înlocuirea garniturii; curba de descărcare nu se folosește la calculul lui K.</p>
<button type="button" data-scenariu="scurgere">Încarcă situația „scurgere” în simulator</button>
</details></div>
`;
}

/* ---------------- ÎNTREBĂRI DE VERIFICARE ---------------- */
const INTREBARI = [
  ["Definiți compresibilitatea și modulul de elasticitate al unui lichid; care sunt unitățile lor?",
   `Compresibilitatea β = −(1/V<sub>0</sub>)·ΔV/Δp este micșorarea relativă a volumului la creșterea presiunii cu o unitate, în 1/Pa. Modulul de elasticitate K = 1/β = −V<sub>0</sub>·Δp/ΔV, în Pa (practic GPa). Pentru lichidul de frână K ≈ 1,5…2,0 GPa, β ≈ 5…6,7·10<sup>−10</sup> 1/Pa.`],
  ["De ce aerul din circuitul de frânare produce „pedala moale”?",
   `Aerul are K = p ≈ 0,1 MPa la presiunea atmosferică, de ~15 000 de ori mai mic decât al lichidului. Bula se comprimă izoterm și absoarbe aproape tot volumul ei la presiuni mici (jumătate până la 1 bar), deci pedala coboară fără ca presiunea să crească; abia după comprimarea bulei presiunea urcă. Efectul este același cu bulele de vapori la fierberea lichidului.`],
  ["De ce lichidul de frână se schimbă periodic, chiar dacă nivelul lui este corect?",
   `Lichidul pe bază de glicoli este higroscopic: absoarbe apă din aer prin furtunuri și prin capacul rezervorului. Apa scade punctul de fierbere (DOT 4: 230 °C uscat → 155 °C umed), iar la frânări repetate apar bule de vapori (pedală moale, „fading”); apa produce și coroziune. De aceea lichidul se înlocuiește la 2 ani sau când conținutul de apă depășește ≈ 3 %.`],
  ["Calculați viteza de propagare a undei de presiune în lichidul de frână (K = 1,7 GPa, ρ = 1050 kg/m³).",
   `a = √(K/ρ) = √(1,7·10<sup>9</sup>/1050) ≈ <b>1272 m/s</b>.`],
  ["Cum influențează elasticitatea furtunurilor de frână valoarea măsurată a modulului de elasticitate?",
   `Peretele de cauciuc se dilată sub presiune și absoarbe volum, ca un termen D/(E·e) foarte mare în relația (2.4) (E al cauciucului este de mii de ori mai mic decât al oțelului). Modulul „echivalent” măsurat scade mult sub cel al lichidului – de câteva ori, după lungimea furtunului – deci cursa pedalei crește. În simulator: situația „furtun flexibil racordat”.`]
];

/* ---------------- TEST RAPID ---------------- */
const TEST = [
  { q: "Ce mărime se citește direct pe piezometru pentru a obține ΔV?", o: ["presiunea", "numărul de rotații ale roții de manevră", "temperatura", "diametrul cilindrului"], c: 1,
    e: "ΔV = n·πd²/4·s: se citește numărul de rotații n; d și s sunt constante ale standului." },
  { q: "Un student obține K = 0,9 GPa pentru DOT 4. Cea mai probabilă cauză este:", o: ["cilindrul se dilată", "a rămas aer în piezometru", "temperatura e prea mică", "manometrul are clasa 1"], c: 1,
    e: "Corecția cilindrului este de doar ≈ 3 %. O valoare mult sub 1,5 GPa indică aer rămas (aerisire incompletă)." },
  { q: "Corecția pentru deformarea cilindrului face ca modulul real K să fie:", o: ["mai mic decât K_m", "mai mare decât K_m", "egal cu K_m", "nul"], c: 1,
    e: "Cilindrul se dilată și „ajută” la absorbția de volum, deci K_m < K: 1/K = 1/K_m − D/(E·e)." },
  { q: "O bulă de 0,5 cm³ (la 1 bar abs.) absoarbe până la 1 bar suprapresiune:", o: ["0,05 cm³", "0,25 cm³", "0,48 cm³", "0,5 cm³"], c: 1,
    e: "ΔV_a = 0,5·(1 − 1/2) = 0,25 cm³ – jumătate din volumul bulei la doar 1 bar." },
  { q: "Curbele de încărcare și descărcare nu se suprapun, descărcarea ajunge la 0 bar mai devreme. Diagnosticul:", o: ["aer în lichid", "scurgere la etanșarea pistonului", "manometru defect", "lichid prea vâscos"], c: 1,
    e: "Lichidul pierdut pe lângă piston face ca presiunea să scadă la zero înainte de revenirea roții (§2.7)." },
  { q: "La 100 bar, lichidul de frână cu K = 1,7 GPa își micșorează volumul cu aproximativ:", o: ["0,06 %", "0,6 %", "6 %", "10 %"], c: 1,
    e: "ΔV/V = p/K = 10⁷/1,7·10⁹ ≈ 0,59 %." },
  { q: "Celeritatea undelor de presiune în motorină (K = 1,5 GPa, ρ = 830 kg/m³) este:", o: ["≈ 340 m/s", "≈ 1340 m/s", "≈ 4500 m/s", "≈ 13 400 m/s"], c: 1,
    e: "a = √(1,5·10⁹/830) ≈ 1344 m/s." },
  { q: "Lichidul DOT 5 (siliconic) față de DOT 4:", o: ["este higroscopic", "are modul de elasticitate mai mic (mai compresibil)", "se amestecă fără restricții cu DOT 4", "are punct de fierbere mai mic"], c: 1,
    e: "Lichidele siliconice sunt nehigroscopice, dar mai compresibile (K ≈ 1 GPa) și nu se amestecă cu cele pe bază de glicoli." }
];
