import { test } from "node:test";
import assert from "node:assert/strict";
import { nombre, fmt, variation, jointSimple } from "../js/core.js";

const proche = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.005, `${msg ?? ""} ${a} ≠ ${b}`);

test("un tube alu de 4 m grandit de 5,52 mm de 20 a 80 °C", () => proche(variation(23, 4000, 60), 5.52));

test("nombre et fmt", () => {
  assert.equal(nombre("1 200,5"), 1200.5);
  assert.equal(nombre("1'200"), 1200);
  assert.ok(Number.isNaN(nombre("")));
  assert.equal(fmt(8.28), "8,3");
  assert.equal(fmt(-0.01), "0,0");
  assert.equal(fmt(9, 0), "9");
});

test("joint : 3 m d'alu au soleil = +4,14 mm, joint de 4,14 arrondi a 5 mm (piece fixee au milieu)", () => {
  const r = jointSimple({ coef: 23, longueur: 3000, tmin: -20, tmax: 80 });
  proche(r.dilatation, 4.14); proche(r.raccourcissement, 2.76); proche(r.avance, 2.07); proche(r.brut, 4.14); assert.equal(r.joint, 5);
});

test("joint : pas d'arrondi vers le haut quand le calcul tombe juste, jamais negatif", () => {
  assert.equal(jointSimple({ coef: 10, longueur: 2000, tmin: -20, tmax: 70 }).joint, 1); // 2 x 0,5 x 1,0 = 1,0 exactement
  assert.equal(jointSimple({ coef: 23, longueur: 3000, tmin: -20, tmax: 20 }).joint, 0);
});

test("trou oblong : vis au milieu, la plus grande des deux courses de chaque cote", () => {
  const r = jointSimple({ coef: 23, longueur: 6000, tmin: -20, tmax: 80 });
  proche(r.dilatation, 8.28); proche(r.raccourcissement, 5.52); proche(r.demi, 4.14); proche(r.trouBrut, 8.28); assert.equal(r.trou, 9);
  // interieur 0/40 : 20 °C d'ecart dans les deux sens, donc 2,76 mm de chaque cote
  proche(jointSimple({ coef: 23, longueur: 12000, tmin: 0, tmax: 40 }).cote, 2.76);
});

test("trou oblong : avec un reglage de pose de ± 20 mm", () => {
  const r = jointSimple({ coef: 23, longueur: 3000, tmin: -20, tmax: 80, reglage: 20 });
  proche(r.cote, 22.07); proche(r.trouBrut, 44.14); assert.equal(r.trou, 45);
  assert.equal(jointSimple({ coef: 23, longueur: 3000, tmin: -20, tmax: 80, reglage: NaN }).trou, 5);
  assert.equal(jointSimple({ coef: 23, longueur: 3000, tmin: -20, tmax: 80, reglage: -5 }).trou, 5);
});

test("donnees manquantes : pas de calcul", () => {
  assert.equal(jointSimple({ coef: 23, longueur: NaN, tmin: -20, tmax: 80 }), null);
  assert.equal(jointSimple({ coef: 23, longueur: 0, tmin: -20, tmax: 80 }), null);
});

test("pose a une autre temperature : 3 m d'alu au soleil = 5 mm a 20 °C, 6 mm a 5 °C, 4 mm a 30 °C", () => {
  const b = { coef: 23, longueur: 3000, tmin: -20, tmax: 80 };
  assert.equal(jointSimple({ ...b, tpose: 20 }).joint, 5);
  assert.equal(jointSimple({ ...b, tpose: 5 }).joint, 6);
  assert.equal(jointSimple({ ...b, tpose: 30 }).joint, 4);
  assert.equal(jointSimple({ ...b, tmax: 25, tpose: 30 }).joint, 0); // interieur : jamais negatif
});

test("lecture commune des nombres : suisse, francais, anglais, ambigus refuses", () => {
  assert.equal(nombre("1.250,5"), 1250.5); assert.equal(nombre("1,250.5"), 1250.5);
  assert.equal(nombre("1'250,5"), 1250.5); assert.equal(nombre("1 250"), 1250); assert.equal(nombre("12,5"), 12.5);
  for (const s of ["1e3", "0x1F", "12..5", "1,2,3", "1.250,5,2", "", "abc", "Infinity"]) assert.ok(Number.isNaN(nombre(s)), s);
  assert.equal(nombre("1.200"), 1.2); // un point seul reste une decimale
});

test("affichage commun : apostrophe suisse pour les milliers, jamais de -0", () => {
  assert.equal(fmt(1234.5, 1), "1'234,5"); assert.equal(fmt(1234567, 0), "1'234'567"); assert.equal(fmt(-1234.5, 1), "-1'234,5");
  assert.equal(fmt(999, 0), "999"); assert.equal(fmt(-0.001, 2), "0,00"); assert.equal(fmt(0, 1), "0,0");
});
