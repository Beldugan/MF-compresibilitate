# Lucrarea 2 – Compresibilitatea lichidului de frână și efectul aerului din circuit

Laborator virtual pentru **Mecanica fluidelor – AR II** (Îndrumar pentru lucrări practice de laborator, I. Omer, A.-M. Beldugan, Universitatea „Ovidius” din Constanța, FIMIM, 2026).
Rulează integral în browser, fără server și fără instalare.

- **Lucrare individuală:** studentul începe cu numele, e-mailul din Classroom și codul de sesiune afișat în sală (prezența se înregistrează automat); fiecare primește parametri secreți proprii (eroarea manometrului, lotul de lichid) și își alege varianta de aer: diametrul bulei (5…11 mm) și numărul de bule (1…4), max. 1 cm³ (seringa de 1 cm³).
- **Integritate:** în modul individual tabelele se completează numai din simulator, scenariile și „Du presiunea la” sunt dezactivate, lipirea și textul introdus de scripturi sunt blocate, iar tastarea, comutările de fereastră și câmpul-capcană pentru asistenți AI sunt raportate; serverul recalculează toate citirile.
- **Simulator:** piezometru cu piston filetat (secțiune realistă), manometru 0…160 bar cl. 1 cu ac amortizat, roată de manevră cu cadran gradat (se poate trage cu mouse-ul), aerisire, bulă introdusă cu seringa, ecran de protecție, NSSM; erori de măsurare realiste; situații de diagnosticat: aerisire incompletă, scurgere la etanșarea pistonului, furtun flexibil racordat.
- **Determinări:** Tabelele 2.2 și 2.3 – completate din simulator sau manual cu valorile de la stand; ΔV, K<sub>m</sub>, K corectat, regresie p–ΔV, β, celeritate, histerezis, volumul bulei estimat; graficul p(ΔV).
- **Teorie, exemplu rezolvat (§2.6) și 7 probleme** cu rezolvări și scenarii încărcabile în simulator.
- **Aplicații la autovehicul:** animația sistemului de frânare cu cinematică reală (pedală suspendată, furcă și tijă rigidă, arc de revenire, contactor de stop, servofrână opțională, pompă centrală tandem cu cursă moartă, conductă cu aer, disc ventilat și etrier; pedala se oprește la podea), cursa pedalei cu/fără aer, unde de presiune (ABS), motorina la 2000 bar.
- **Verificare:** întrebările §2.9 cu răspunsuri și test rapid.
- **Referat:** generat din datele studentului, cu 4 întrebări individuale și concluzii; se trimite ca document Google (prezență + referat în foaia profesorului) și se predă în Classroom cu „Share to Classroom”; tipărire/PDF și CSV.

Valorile implicite reproduc exemplul din îndrumar: n = 3,90 rot la 100 bar → K = 1,68 GPa; cu bula de 0,5 cm³ ≈ 10,2 rot.

## Publicare pe GitHub Pages

1. Creați depozitul public `mf-compresibilitate` în contul `beldugan` și încărcați în rădăcina lui fișierele `index.html`, `style.css`, `config.js`, `model.js`, `svg-sim.js`, `continut.js`, `student.js`, `app.js` și dosarul `img/` (cu `stand.jpg`, `fig2_1.jpg`, `fig2_2.png`).
2. Settings → Pages → Source: *Deploy from a branch*, ramura `main`, dosarul `/ (root)`.
3. Aplicația devine disponibilă la `https://beldugan.github.io/mf-compresibilitate/`.

## Prezență și trimiterea referatelor

Vedeți `GHID_INSTALARE.md` din dosarul `mf-compresibilitate-server` (Google Sheet + Apps Script). După publicarea scriptului, puneți adresa `/exec` în `config.js` → `endpoint`. Fără ea, aplicația rulează în mod demonstrativ.

> Aplicația s-a mutat în portalul comun: https://beldugan.github.io/autovehicule-rutiere/ (Mecanica fluidelor → Lucrarea 2).
