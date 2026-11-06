// Joint : calculs sans affichage (testes par « node --test »).
// Principe : un element de longueur L change de longueur de coef × L × ecart de temperature.
// Seule la part qui avance VERS le joint compte : tout si le point fixe est a l'autre bout, la moitie s'il est au centre, rien s'il est cote joint.

/** Coefficients de dilatation usuels, en µm par metre et par °C (valeurs courantes, a confirmer avec les regles du bureau). */
export const MATERIAUX = {
  alu: { nom: "Alu", coef: 23 },
  acier: { nom: "Acier", coef: 12 },
  inox: { nom: "Inox", coef: 16 },
  verre: { nom: "Verre", coef: 9 },
  autre: { nom: "Autre", coef: null },
};

/** Part de la dilatation de l'element qui arrive dans le joint, selon l'endroit du point fixe. */
export const POINTS_FIXES = {
  loin: { nom: "À l'autre bout", part: 1 },
  centre: { nom: "Au centre", part: 0.5 },
  joint: { nom: "Côté joint", part: 0 },
};

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
 * Calcule les espaces. g et d : { coef, longueur (mm), point: "loin"|"centre"|"joint" }, d peut etre { paroi: true } (mur, beton : ne bouge pas).
 * Temperatures en °C ; jeu = espace a garder en chaud (mm) ; prevu = espace que la personne comptait laisser (mm, facultatif).
 * Renvoie null si une donnee manque ou est incoherente.
 */
export function calculer({ g, d, tmin, tpose, tmax, jeu, prevu = NaN }) {
  const valide = (e) => e.paroi || (e.coef >= 0 && e.longueur > 0 && POINTS_FIXES[e.point]);
  if (![tmin, tpose, tmax, jeu].every(Number.isFinite) || jeu < 0 || !valide(g) || !valide(d)) return null;
  const part = (e) => (e.paroi ? 0 : POINTS_FIXES[e.point].part);
  const bouge = (e, ecart) => (e.paroi ? 0 : part(e) * variation(e.coef, e.longueur, Math.max(0, ecart)));
  const avanceG = bouge(g, tmax - tpose), avanceD = bouge(d, tmax - tpose);
  const reculG = bouge(g, tpose - tmin), reculD = bouge(d, tpose - tmin);
  const avance = avanceG + avanceD, recul = reculG + reculD;
  const espacePose = avance + jeu;
  const res = {
    avanceG, avanceD, reculG, reculD, avance, recul,
    espacePose, espaceFroid: espacePose + recul, espaceChaud: jeu,
    incoherent: !(tmin <= tpose && tpose <= tmax),
    verdict: null,
  };
  if (Number.isFinite(prevu) && prevu >= 0) {
    const reste = prevu - avance;
    res.verdict = {
      prevu, resteChaud: reste, ouvertureFroid: prevu + recul,
      etat: reste >= jeu - 1e-9 ? "ok" : reste > 1e-9 ? "juste" : "touche",
      manque: Math.max(0, espacePose - prevu),
    };
  }
  return res;
}

/** Texte a coller dans une note ou un mail. */
export function resume({ g, d, tmin, tpose, tmax, jeu }, r, noms) {
  const el = (e, n) => (e.paroi ? "paroi fixe" : `${n} ${fmt(e.longueur, 0)} mm, point fixe ${POINTS_FIXES[e.point].nom.toLowerCase()}`);
  return [
    `Joint de dilatation : ${fmt(r.espacePose)} mm à la pose (${fmt(tpose, 0)} °C)`,
    `Élément 1 : ${el(g, noms.g)}`,
    `Élément 2 : ${el(d, noms.d)}`,
    `Températures : ${fmt(tmin, 0)} °C à ${fmt(tmax, 0)} °C, espace minimal en chaud ${fmt(jeu)} mm`,
    `En froid (${fmt(tmin, 0)} °C) : ${fmt(r.espaceFroid)} mm · en chaud (${fmt(tmax, 0)} °C) : ${fmt(r.espaceChaud)} mm`,
  ].join("\n");
}
