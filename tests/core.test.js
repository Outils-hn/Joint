import { test } from "node:test";
import assert from "node:assert/strict";
import { calculer, nombre, fmt, variation, MATERIAUX } from "../js/core.js";

const alu = (point, longueur = 4000) => ({ coef: MATERIAUX.alu.coef, longueur, point });
const T = { tmin: -20, tpose: 20, tmax: 80, jeu: 2 };
const proche = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.005, `${msg ?? ""} ${a} ≠ ${b}`);

test("un tube alu de 4 m grandit de 5,52 mm de 20 a 80 °C", () => proche(variation(23, 4000, 60), 5.52));

test("2 tubes alu de 4 m, points fixes a l'autre bout : 13,04 mm a la pose", () => {
  const r = calculer({ g: alu("loin"), d: alu("loin"), ...T });
  proche(r.avance, 11.04); proche(r.espacePose, 13.04); proche(r.espaceChaud, 2);
  proche(r.recul, 7.36); proche(r.espaceFroid, 20.4);
});

test("points fixes au centre : la moitie, soit 7,52 mm", () => {
  const r = calculer({ g: alu("centre"), d: alu("centre"), ...T });
  proche(r.espacePose, 7.52); proche(r.espaceFroid, 11.2);
});

test("point fixe cote joint : rien n'arrive dans le joint", () => {
  const r = calculer({ g: alu("joint"), d: alu("joint"), ...T });
  proche(r.espacePose, 2); proche(r.espaceFroid, 2);
});

test("contre une paroi fixe : seul l'element qui bouge compte", () => {
  const r = calculer({ g: alu("loin"), d: { paroi: true }, ...T });
  proche(r.espacePose, 7.52);
});

test("materiaux differents : alu + verre", () => {
  const verre = { coef: MATERIAUX.verre.coef, longueur: 2000, point: "loin" };
  const r = calculer({ g: alu("loin"), d: verre, ...T });
  proche(r.avance, 5.52 + 1.08);
});

test("temperature de pose plus chaude que le maxi : pas d'avance, signale incoherent si hors plage", () => {
  const r = calculer({ g: alu("loin"), d: alu("loin"), tmin: -20, tpose: 90, tmax: 80, jeu: 2 });
  proche(r.avance, 0); assert.equal(r.incoherent, true);
});

test("donnee manquante : pas de calcul", () => {
  assert.equal(calculer({ g: alu("loin", NaN), d: alu("loin"), ...T }), null);
  assert.equal(calculer({ g: alu("loin"), d: alu("loin"), ...T, jeu: NaN }), null);
  assert.equal(calculer({ g: alu("loin", 0), d: alu("loin"), ...T }), null);
});

test("verifier un espace prevu : 10 mm pour 2 tubes alu de 4 m", () => {
  let r = calculer({ g: alu("loin"), d: alu("loin"), ...T, prevu: 10 });
  assert.equal(r.verdict.etat, "touche"); proche(r.verdict.resteChaud, -1.04); proche(r.verdict.manque, 3.04);
  r = calculer({ g: alu("centre"), d: alu("centre"), ...T, prevu: 10 });
  assert.equal(r.verdict.etat, "ok"); proche(r.verdict.resteChaud, 4.48);
  r = calculer({ g: alu("loin"), d: alu("loin"), ...T, prevu: 12 });
  assert.equal(r.verdict.etat, "juste");
});

test("nombre et fmt", () => {
  assert.equal(nombre("4 000"), 4000); assert.equal(nombre("2,5"), 2.5); assert.equal(nombre("4'000"), 4000);
  assert.ok(Number.isNaN(nombre(""))); assert.ok(Number.isNaN(nombre("abc")));
  assert.equal(fmt(13.04), "13,0"); assert.equal(fmt(-0.02), "0,0"); assert.equal(fmt(7.5, 0), "8");
});
