/* Configurarea aplicației – singurul fișier care se modifică la instalare */
"use strict";

const CONFIG = {
  laborator: 2,
  titluLab: "Compresibilitatea lichidului de frână și efectul aerului din circuit",
  disciplina: "Mecanica fluidelor",
  program: "Autovehicule Rutiere, anul II",

  // Adresa aplicației web Google Apps Script (Deploy → Web app → URL care se termină în /exec).
  // Lăsată goală, aplicația rulează în mod demonstrativ: fără prezență și fără trimiterea referatului.
  endpoint: "",

  // Domeniul de e-mail acceptat pentru studenți (gol = orice adresă Google).
  domeniuEmail: "",

  // Variantele individuale ale bulei de aer (varianta b)
  bula: { dMin: 5, dMax: 11, pasD: 0.5, nMin: 1, nMax: 4, VmaxCm3: 1.2 },

  // Cerințe minime pentru referat
  referat: { minConcluzii: 250, minDurataMin: 8 }
};
