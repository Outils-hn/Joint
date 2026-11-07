// Joint : affichage et saisie. Les calculs sont dans core.js.
import { MATERIAUX, POINTS_FIXES, POINTS_PIECE, AMBIANCES, calculer, piece, nombre, fmt, resume, resumePiece } from "./core.js";

const $ = (id) => document.getElementById(id);
const CLE = "joint.reglages";
const APPLIS = [
  ["Access", "Annuaire fournisseurs", "#C2255C"], ["Check", "Notes & tâches", "#4338CA"], ["Format", "Débit de panneaux", "#FF4D00"],
  ["Index", "Fiches techniques", "#6D4AFF"], ["Joint", "Espace entre deux éléments", "#0B7285"], ["Linear", "Mise en barre", "#2B50FF"],
  ["Masse", "Poids des éléments", "#9A4A3A"], ["Strate", "Épaisseurs d'isolation", "#D4A20B"], ["Trame", "Répartition de perçages", "#0E9F6E"],
];

// Cas de depart : l'exemple de tous les jours, 2 tubes alu de 4 m en plein soleil
const DEFAUT = {
  mode: "deux", uPt: "gauche",
  gMat: "alu", gCoef: "", gLong: "4000", gPt: "loin",
  dMat: "alu", dCoef: "", dLong: "4000", dPt: "loin",
  amb: "soleil", tMin: "-20", tPose: "20", tMax: "80", jeu: "2", prevu: "",
};
let s = { ...DEFAUT };
try {
  const lu = JSON.parse(localStorage.getItem(CLE) ?? "null");
  if (lu && typeof lu === "object") for (const k of Object.keys(DEFAUT)) if (typeof lu[k] === "string") s[k] = lu[k];
  if (!MATERIAUX[s.gMat]) s.gMat = DEFAUT.gMat;
  if (!(MATERIAUX[s.dMat] || s.dMat === "paroi")) s.dMat = DEFAUT.dMat;
  if (s.mode !== "deux" && s.mode !== "une") s.mode = "deux";
  if (!POINTS_PIECE[s.uPt]) s.uPt = DEFAUT.uPt;
  if (!POINTS_FIXES[s.gPt]) s.gPt = DEFAUT.gPt;
  if (!POINTS_FIXES[s.dPt]) s.dPt = DEFAUT.dPt;
  if (!AMBIANCES[s.amb] && s.amb !== "perso") s.amb = "perso";
} catch (e) { /* stockage bloque : on part des valeurs par defaut */ }
const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(s)); } catch (e) { /* ignore */ } };

const degre = (t) => `${fmt(t, 0).replace("-", "−")} °C`;
const mm = (n, d = 1) => `${fmt(n, d)} mm`;

// ---------- Menu des applis ----------
$("appsList").innerHTML = `<div class="apps-label">Mes outils</div>
  <a href="https://outils-hn.github.io/"><span class="sw" style="background:conic-gradient(#C2255C 0 25%,#6D4AFF 0 50%,#0E9F6E 0 75%,#FF4D00 0)"></span><span class="nm">Accueil</span><span class="rl">Toutes les applis, idées &amp; bugs</span></a>
  <div class="apps-sep" role="separator"></div>` +
  APPLIS.map(([nom, role, c]) => `<a href="https://outils-hn.github.io/${nom}/"${nom === "Joint" ? ' aria-current="page"' : ""}><span class="sw" style="background:${c}"></span><span class="nm">${nom}</span><span class="rl">${role.replace("&", "&amp;")}</span>${nom === "Joint" ? '<span class="ck" aria-hidden="true">✓</span>' : ""}</a>`).join("");
document.addEventListener("click", (e) => { const m = $("appsMenu"); if (m.open && !m.contains(e.target)) m.open = false; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("appsMenu").open) { $("appsMenu").open = false; $("appsMenu").querySelector("summary").focus(); } });

// ---------- Theme clair / sombre (reglage commun aux applis) ----------
const ICONES = {
  light: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
};
function themeActuel() {
  try { const t = localStorage.getItem("outils-theme"); if (t === "light" || t === "dark") return t; } catch (e) { /* ignore */ }
  return matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function appliquerTheme(k) {
  document.documentElement.dataset.theme = k;
  try { localStorage.setItem("outils-theme", k); } catch (e) { /* ignore */ }
  const nom = k === "dark" ? "Thème sombre" : "Thème clair";
  $("themeBtn").innerHTML = ICONES[k]; $("themeBtn").title = nom; $("themeBtn").setAttribute("aria-label", `${nom} (cliquer pour changer)`);
}
$("themeBtn").addEventListener("click", () => appliquerTheme(themeActuel() === "dark" ? "light" : "dark"));
appliquerTheme(themeActuel());

// ---------- Choix : menus et champs ----------
const NOM_MAT = Object.fromEntries(Object.entries(MATERIAUX).map(([k, v]) => [k, v.nom]));
const AMB_NOMS = { soleil: "Extérieur au soleil", ombre: "Extérieur à l'ombre", int: "Intérieur", perso: "Personnalisé" };
const optionsMat = (avecParoi) => Object.entries(MATERIAUX).map(([k, v]) => `<option value="${k}">${v.nom === "Autre" ? "Autre…" : v.nom}</option>`).join("") + (avecParoi ? '<option value="paroi">Paroi fixe</option>' : "");
$("gMat").innerHTML = optionsMat(false);
$("dMat").innerHTML = optionsMat(true);
$("amb").innerHTML = ["soleil", "ombre", "int", "perso"].map((k) => `<option value="${k}">${AMB_NOMS[k]}</option>`).join("");

const CHAMPS = ["gCoef", "gLong", "dCoef", "dLong", "tMin", "tPose", "tMax", "jeu", "prevu"];
for (const cle of CHAMPS) {
  $(cle).addEventListener("input", () => {
    s[cle] = $(cle).value;
    // Modifier le mini ou le maxi a la main : la situation devient « personnalisee » si elle ne correspond plus
    if (cle === "tMin" || cle === "tMax") {
      const trouve = Object.entries(AMBIANCES).find(([, v]) => v.tmin === nombre(s.tMin) && v.tmax === nombre(s.tMax));
      s.amb = trouve ? trouve[0] : "perso";
    }
    maj();
  });
}
$("gMat").addEventListener("change", () => { s.gMat = $("gMat").value; maj(); });
$("dMat").addEventListener("change", () => { s.dMat = $("dMat").value; maj(); });
$("amb").addEventListener("change", () => {
  s.amb = $("amb").value;
  if (AMBIANCES[s.amb]) { s.tMin = String(AMBIANCES[s.amb].tmin); s.tMax = String(AMBIANCES[s.amb].tmax); }
  maj();
});
document.querySelectorAll(".modes button").forEach((b) => b.addEventListener("click", () => { s.mode = b.dataset.mode; maj(); }));

// L'unite (mm, °C) est ecrite juste apres la valeur saisie : un texte invisible reprend la valeur pour pousser l'unite derriere elle
function majUnites() {
  document.querySelectorAll(".unit").forEach((box) => {
    const input = box.querySelector("input"), u = box.querySelector(".u");
    u.textContent = "";
    if (input.value === "") return;
    const i = document.createElement("i"); i.textContent = input.value;
    u.append(i, ` ${box.dataset.u}`);
  });
}
function majChamps() { for (const cle of CHAMPS) if ($(cle).value !== s[cle]) $(cle).value = s[cle]; }

// ---------- Dessin des deux barres et des points fixes ----------
const NOMS_PT = { loin: "à l'autre bout", centre: "au centre", joint: "côté joint" };
function point(pos, actif, nom, onClick) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "dot"; b.style.left = `${pos}%`;
  b.setAttribute("aria-pressed", String(actif)); b.setAttribute("aria-label", nom); b.title = nom;
  b.innerHTML = "<span></span>"; b.addEventListener("click", onClick);
  return b;
}
function barre(classe, points) {
  const w = document.createElement("div"); w.className = `barwrap ${classe}`;
  w.innerHTML = '<div class="bar"></div>';
  points.forEach((p) => w.append(p));
  return w;
}
function dessinerDeux(gapMm, paroi) {
  const gapW = Math.max(16, Math.min(90, Math.round(gapMm * 6)));
  $("spacer").style.width = `${gapW}px`;
  const g = barre("g", [["loin", 0], ["centre", 50], ["joint", 100]].map(([k, pos]) => point(pos, s.gPt === k, `Élément de gauche : point fixe ${NOMS_PT[k]}`, () => { s.gPt = k; maj(); })));
  const gap = document.createElement("div"); gap.className = "gapbox"; gap.style.width = `${gapW}px`;
  gap.innerHTML = `<div class="hatch"></div><div class="gv">${fmt(gapMm)} mm</div>`;
  const d = barre(`d${paroi ? " paroi" : ""}`, paroi ? [] : [["joint", 0], ["centre", 50], ["loin", 100]].map(([k, pos]) => point(pos, s.dPt === k, `Élément de droite : point fixe ${NOMS_PT[k]}`, () => { s.dPt = k; maj(); })));
  $("draw").replaceChildren(g, gap, d);
  $("fixes").innerHTML = `<span>● Gauche : <b>${NOMS_PT[s.gPt]}</b></span>` + (paroi ? "" : `<span>● Droite : <b>${NOMS_PT[s.dPt]}</b></span>`);
}
function dessinerUne() {
  const b = barre("solo", [["gauche", 0, "à gauche"], ["centre", 50, "au centre"], ["droite", 100, "à droite"]].map(([k, pos, nom]) => point(pos, s.uPt === k, `Point fixe ${nom}`, () => { s.uPt = k; maj(); })));
  $("draw").replaceChildren(b);
  $("fixes").innerHTML = `<span>● Point fixe : <b>${POINTS_PIECE[s.uPt].nom}</b></span>`;
}

// ---------- Les trois etats ----------
function etatsDeux(e, r) {
  const px = (mm) => Math.max(3, Math.min(110, Math.round(mm * 4)));
  const ligne = (titre, gap) => `<div class="etat"><span class="t">${titre}</span><div class="piste"><div class="b1"></div><div class="gp" style="width:${px(gap)}px"></div><div class="b2${e.d.paroi ? " paroi" : ""}"></div></div><b class="v">${mm(gap)}</b></div>`;
  $("etats").innerHTML = ligne(`Froid ${degre(e.tmin)}`, r.espaceFroid) + ligne(`Pose ${degre(e.tpose)}`, r.espacePose) + ligne(`Chaud ${degre(e.tmax)}`, r.espaceChaud);
  $("legende").textContent = "Hachures = l'espace entre les deux éléments (dessin à l'échelle pour l'espace seulement).";
}
function etatsUne(e, r) {
  const X0 = 14, X1 = 86;
  const maxi = Math.max(r.allongement, r.raccourcissement, 0.01);
  const k = Math.min(3, 12 / maxi); // % de largeur par mm, volontairement exagere
  const fx = { gauche: X0, centre: 50, droite: X1 }[s.uPt];
  const ligne = (titre, dG, dD, txt) => `<div class="etat"><span class="t">${titre}</span><div class="une"><div class="ref" style="left:${X0}%;width:${X1 - X0}%"></div><div class="piece" style="left:${X0 - dG * k}%;width:${X1 - X0 + (dG + dD) * k}%"></div><span class="fx" style="left:${fx}%"></span></div><b class="v">${txt}</b></div>`;
  const signe = (n) => (n > 0.005 ? "+" : n < -0.005 ? "−" : "");
  $("etats").innerHTML =
    ligne(`Froid ${degre(e.tmin)}`, r.froidG, r.froidD, `−${fmt(r.raccourcissement)} mm`) +
    ligne(`Pose ${degre(e.tpose)}`, 0, 0, "0 mm") +
    ligne(`Chaud ${degre(e.tmax)}`, r.chaudG, r.chaudD, `${signe(r.allongement)}${fmt(r.allongement)} mm`);
  $("legende").textContent = "● point fixe · tirets = la pièce à la pose · écart exagéré pour qu'on le voie.";
}

// ---------- Mise a jour ----------
let dernier = null;
function elementDe(cote) {
  const mat = s[cote + "Mat"];
  if (mat === "paroi") return { paroi: true };
  const coef = mat === "autre" ? nombre(s[cote + "Coef"]) : MATERIAUX[mat].coef;
  return { coef, longueur: nombre(s[cote + "Long"]), point: cote === "g" ? s.gPt : s.dPt };
}
function majCoef(cote) {
  const mat = s[cote + "Mat"], txt = $(cote + "CoefTxt");
  $(cote + "Coef").closest(".unit").classList.toggle("hidden", mat !== "autre");
  txt.classList.toggle("hidden", mat === "autre" || mat === "paroi");
  txt.textContent = mat === "autre" || mat === "paroi" ? "" : `Coefficient : ${MATERIAUX[mat].coef} µm/m·°C`;
}
function maj() {
  sauver();
  const une = s.mode === "une";
  document.querySelectorAll(".modes button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === s.mode)));
  $("gMat").value = s.gMat; $("dMat").value = s.dMat; $("amb").value = AMBIANCES[s.amb] ? s.amb : "perso";
  majChamps();
  majUnites();
  // Ce qui change entre les deux calculs
  $("hElem").textContent = une ? "La pièce" : "Les deux éléments";
  $("lblG").textContent = une ? "Matériau et longueur" : "Gauche";
  $("colG").classList.toggle("solo", une);
  $("colD").classList.toggle("hidden", une);
  $("spacer").classList.toggle("hidden", une);
  $("verif").classList.toggle("hidden", une);
  $("jeuBox").classList.toggle("hidden", une);
  $("dLongBox").classList.toggle("hidden", s.dMat === "paroi");
  majCoef("g"); majCoef("d");
  $("ambNote").textContent = { int: "Local chauffé ou tempéré.", ombre: "À l'abri du soleil direct.", soleil: "Élément sombre en plein soleil : jusqu'à environ 80 °C.", perso: "" }[s.amb] ?? "";
  const verdict = $("verdict");
  verdict.classList.add("hidden");
  const t = { tmin: nombre(s.tMin), tpose: nombre(s.tPose), tmax: nombre(s.tMax) };

  if (une) {
    const e = { e: elementDe("g"), ...t };
    e.e.point = s.uPt;
    const r = piece(e);
    dernier = r && { une: true, e, r };
    $("copyBtn").disabled = !r;
    $("rKicker").textContent = r ? `Allongement de ${degre(t.tpose)} à ${degre(t.tmax)}` : "Dilatation de la pièce";
    if (!r) { $("rBig").textContent = "—"; $("rWhy").textContent = "Renseigne la longueur (en mm) et les températures."; $("rWarn").classList.add("hidden"); $("etats").innerHTML = ""; dessinerUne(); return; }
    $("rBig").innerHTML = `+${fmt(r.allongement)} <small>mm</small>`;
    const bout = s.uPt === "centre" ? "de chaque côté" : "à l'extrémité libre";
    $("rWhy").textContent = `En froid (${degre(t.tmin)}), elle se raccourcit de ${mm(r.raccourcissement)}. Course totale : ${mm(r.course)}. Trous oblongs : prévoir ${mm(r.courseBout)} ${bout}, plus le diamètre de la vis.`;
    $("rWarn").classList.toggle("hidden", !r.incoherent);
    if (r.incoherent) $("rWarn").textContent = "La température de pose devrait être comprise entre le mini et le maxi.";
    dessinerUne(); etatsUne(t, r);
    return;
  }

  const e = { g: elementDe("g"), d: elementDe("d"), ...t, jeu: nombre(s.jeu), prevu: nombre(s.prevu) };
  const r = calculer(e);
  dernier = r && { e, r };
  $("copyBtn").disabled = !r;
  $("rKicker").textContent = r ? `Espace à laisser à la pose (${degre(t.tpose)})` : "Espace à laisser à la pose";
  if (!r) {
    $("rBig").textContent = "—"; $("rWhy").textContent = "Renseigne les longueurs (en mm) et les températures."; $("rWarn").classList.add("hidden");
    $("etats").innerHTML = ""; dessinerDeux(8, !!e.d.paroi);
    return;
  }
  $("rBig").innerHTML = `${fmt(r.espacePose)} <small>mm</small>`;
  $("rWhy").textContent = r.avance > 0.005
    ? `En chaud (${degre(t.tmax)}), les éléments avancent de ${mm(r.avance)} vers le joint : il reste ${mm(e.jeu)}.`
    : `Rien n'avance vers le joint : on laisse simplement l'espace minimal voulu (${mm(e.jeu)}).`;
  $("rWarn").classList.toggle("hidden", !r.incoherent);
  if (r.incoherent) $("rWarn").textContent = "La température de pose devrait être comprise entre le mini et le maxi.";
  if (r.verdict) {
    const v = r.verdict;
    verdict.className = `verdict ${v.etat}`;
    verdict.innerHTML = v.etat === "ok"
      ? `<b>C'est bon.</b> Avec ${mm(v.prevu)}, il reste ${mm(v.resteChaud)} en chaud (${degre(t.tmax)}) et l'espace s'ouvre à ${mm(v.ouvertureFroid)} en froid (${degre(t.tmin)}).`
      : v.etat === "juste"
        ? `<b>Un peu juste.</b> Il ne reste que ${mm(v.resteChaud)} en chaud, moins que les ${mm(e.jeu)} voulus. Il faudrait ${mm(r.espacePose)}.`
        : `<b>Trop serré.</b> En chaud, les éléments se touchent : il manque ${mm(v.manque)} (il faut ${mm(r.espacePose)}).`;
  }
  dessinerDeux(r.espacePose, !!e.d.paroi);
  etatsDeux(e, r);
}

// ---------- Copie du resume ----------
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2200); }
$("copyBtn").addEventListener("click", async () => {
  if (!dernier) return;
  const txt = dernier.une
    ? resumePiece(dernier.e, dernier.r, NOM_MAT[s.gMat])
    : resume(dernier.e, dernier.r, { g: NOM_MAT[s.gMat], d: NOM_MAT[s.dMat] ?? "" });
  try { await navigator.clipboard.writeText(txt); toast("Résumé copié"); }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Résumé copié"); } catch (e2) { toast("Copie impossible"); }
    ta.remove();
  }
});
$("aboutBtn").addEventListener("click", () => toast("Joint v1.1 · conçu et développé par Hugo N."));
$("coefsBody").innerHTML = Object.values(MATERIAUX).filter((m) => m.coef).map((m) => `<tr><td>${m.nom}</td><td>${m.coef}</td></tr>`).join("");

maj();
