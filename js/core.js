// Joint : calculs sans affichage (testes par « node --test »).
// Principe : une piece de longueur L change de longueur de coef × L × ecart de temperature.

/** Coefficients de dilatation usuels, en 10^-6 par kelvin (= µm par metre et par °C). Valeurs courantes, a confirmer avec les regles du bureau. */
export const MATERIAUX = {
  alu: { nom: "Alu", coef: 23 },
  acier: { nom: "Acier", coef: 12 },
  inox: { nom: "Inox", coef: 16 },
  verre: { nom: "Verre", coef: 9 },
};

/** Temperatures extremes selon l'endroit ou la piece est posee (pose a 20 °C). */
export const AMBIANCES = {
  int: { nom: "Intérieur", tmin: 0, tmax: 40 },
  ombre: { nom: "Extérieur à l'ombre", tmin: -20, tmax: 40 },
  soleil: { nom: "Extérieur au soleil", tmin: -20, tmax: 80 },
};

/** Lit un nombre ecrit a la francaise (virgule, espaces, apostrophe suisse). NaN si vide ou illisible. */
export function nombre(s) {
  const t = String(s ?? "").replace(/[\s'’]/g, "").replace(",", ".");
  return t === "" ? NaN : Number(t);
}

/** Affiche un nombre avec une virgule et un nombre fixe de decimales (jamais « -0,0 »). */
export function fmt(n, d = 1) {
  const t = (Math.abs(n) < 0.5 * 10 ** -d ? 0 : n).toFixed(d).replace(".", ",");
  return t;
}

/** Variation de longueur en mm : coef (µm/m/°C) × longueur (mm) × ecart (°C). */
export const variation = (coef, longueurMm, ecart) => coef * 1e-6 * longueurMm * ecart;

/**
 * Une piece : de combien elle dilate, quel joint entre deux pieces identiques, quel trou oblong si elle est vissee.
 * Cas le plus defavorable : chaque piece avance vers le joint de toute sa dilatation (point fixe a l'autre bout).
 * Trou oblong : vis au milieu, meme place de chaque cote = la plus grande des deux courses (chaud / froid) + le reglage de pose voulu de chaque cote.
 * Joint et trou sont arrondis au mm superieur.
 */
export function jointSimple({ coef, longueur, tpose = 20, tmin, tmax, reglage = 0 }) {
  if (![coef, longueur, tpose, tmin, tmax].every(Number.isFinite) || longueur <= 0) return null;
  const reg = Number.isFinite(reglage) && reglage > 0 ? reglage : 0;
  const dilatation = variation(coef, longueur, Math.max(0, tmax - tpose));
  const raccourcissement = variation(coef, longueur, Math.max(0, tpose - tmin));
  const brut = 2 * dilatation;
  const demi = Math.max(dilatation, raccourcissement);
  const arrondi = (x) => Math.max(0, Math.ceil(x - 1e-9));
  return { dilatation, raccourcissement, brut, joint: arrondi(brut), demi, reglage: reg, cote: demi + reg, trouBrut: 2 * (demi + reg), trou: arrondi(2 * (demi + reg)) };
}
