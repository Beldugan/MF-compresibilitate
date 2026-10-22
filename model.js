/* Modelul fizic al piezometrului cu piston filetat – Lucrarea 2, Mecanica fluidelor
   Unități interne: volume în cm³, presiuni în bar (suprapresiune), module în GPa. */
"use strict";

const P_ATM = 1.0; // bar, presiunea absolută de referință (ca în îndrumar)

const FLUIDE = {
  DOT3:   { nume: "Lichid de frână DOT 3",            K: 1.72, rho: 1040, culoare: "#d9b44a" },
  DOT4:   { nume: "Lichid de frână DOT 4",            K: 1.68, rho: 1050, culoare: "#d4a93c" },
  DOT51:  { nume: "Lichid de frână DOT 5.1",          K: 1.78, rho: 1060, culoare: "#d8b65a" },
  DOT5:   { nume: "Lichid de frână DOT 5 (siliconic)", K: 1.10, rho: 960,  culoare: "#b58ac9" },
  APA:    { nume: "Apă (20 °C)",                     K: 2.20, rho: 998,  culoare: "#7fb6e0" },
  ULEI:   { nume: "Ulei mineral hidraulic",           K: 1.60, rho: 870,  culoare: "#c98f2a" },
  MOTORINA:{ nume: "Motorină",                        K: 1.50, rho: 830,  culoare: "#e3cf6a" },
  PROBA:  { nume: "Probă necunoscută (de determinat)", K: null, rho: 1050, culoare: "#c9a24e" }
};

/** Volumul dislocat la o rotație [cm³] */
function volRot(d_mm, s_mm) { return Math.PI * d_mm * d_mm / 4 * s_mm / 1000; }

/** Termenul de corecție al cilindrului D/(E·e) [1/Pa] */
function corectieCil(D_mm, e_mm, E_GPa) { return D_mm / (E_GPa * 1e9 * e_mm); }

/** Modulul aparent măsurat K_m [GPa] din modulul real K [GPa] */
function KmDinK(K, D, e, E) { return 1 / (1 / (K * 1e9) + corectieCil(D, e, E)) / 1e9; }

/** Modulul corectat K [GPa] din modulul aparent K_m [GPa] (rel. 2.4) */
function KDinKm(Km, D, e, E) {
  const inv = 1 / (Km * 1e9) - corectieCil(D, e, E);
  return inv > 0 ? 1 / inv / 1e9 : NaN;
}

/** Volumul absorbit de o bulă de aer (compresie izotermă, rel. 2.5) [cm³] */
function volAer(Va0, p_bar) { return Va0 * (1 - P_ATM / (P_ATM + Math.max(0, p_bar))); }

/** Volumul total absorbit de sistem la presiunea p [cm³]
   cfg: {V0, K, D, e, E, Vaer, Cf}  (Cf = complianța unui furtun, cm³/bar) */
function volumAbsorbit(cfg, p) {
  const Cm = 1 / (cfg.K * 1e9) + corectieCil(cfg.D, cfg.e, cfg.E); // 1/Pa
  return cfg.V0 * p * 1e5 * Cm + volAer(cfg.Vaer, p) + (cfg.Cf || 0) * p;
}

/** Presiunea [bar] pentru un volum dislocat dat [cm³] – inversare prin bisecție */
function presiuneDinVolum(cfg, dV) {
  if (dV <= 0) return 0;
  let a = 0, b = 50;
  while (volumAbsorbit(cfg, b) < dV && b < 1e6) b *= 2;
  for (let i = 0; i < 80; i++) {
    const m = (a + b) / 2;
    if (volumAbsorbit(cfg, m) < dV) a = m; else b = m;
  }
  return (a + b) / 2;
}

/** Celeritatea undelor de presiune a = √(K/ρ) [m/s] */
function celeritate(K_GPa, rho) { return Math.sqrt(K_GPa * 1e9 / rho); }

/** Regresie liniară y = a + b·x */
function regresie(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; syy += ys[i] * ys[i]; }
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-30) return null;
  const b = (n * sxy - sx * sy) / den, a = (sy - b * sx) / n;
  const r2den = (n * sxx - sx * sx) * (n * syy - sy * sy);
  const r2 = r2den > 0 ? Math.pow(n * sxy - sx * sy, 2) / r2den : 1;
  return { a, b, r2 };
}

/** Comprimarea relativă la presiune mare cu K(p) = K0 + K'·p  [-] */
function comprimareRelativa(K0_GPa, Kp, p_bar) {
  const p = p_bar * 1e5, K0 = K0_GPa * 1e9;
  if (Kp <= 0) return 1 - Math.exp(-p / K0);
  return 1 - Math.pow(1 + Kp * p / K0, -1 / Kp);
}
