// Joint : affichage et saisie. Les calculs sont dans core.js.
import { MATERIAUX, POINTS_FIXES, AMBIANCES, calculer, nombre, fmt, resume } from "./core.js";

const $ = (id) => document.getElementById(id);
const CLE = "joint.reglages";
const APPLIS = [
  ["Access", "Annuaire fournisseurs", "#C2255C"], ["Check", "Notes & tâches", "#4338CA"], ["Format", "Débit de panneaux", "#FF4D00"],
  ["Index", "Fiches techniques", "#6D4AFF"], ["Joint", "Espace entre deux éléments", "#0B7285"], ["Linear", "Mise en barre", "#2B50FF"],
  ["Masse", "Poids des éléments", "#9A4A3A"], ["Strate", "Épaisseurs d'isolation", "#D4A20B"], ["Trame", "Répartition de perçages", "#0E9F6E"],
];

// Cas de depart : l'exemple de tous les jours, 2 tubes alu de 4 m en plein soleil
const DEFAUT = {
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

// ---------- Choix (pastilles) ----------
const MAT_G = Object.entries(MATERIAUX).map(([k, v]) => [k, v.nom]);
const MAT_D = [...MAT_G, ["paroi", "Paroi fixe"]];
const PTS = Object.entries(POINTS_FIXES).map(([k, v]) => [k, v.nom]);
const AMBS = [...Object.entries(AMBIANCES).map(([k, v]) => [k, v.nom]), ["perso", "Personnalisé"]];
const GROUPES = { "g-mat": ["gMat", MAT_G], "g-pt": ["gPt", PTS], "d-mat": ["dMat", MAT_D], "d-pt": ["dPt", PTS], amb: ["amb", AMBS] };
for (const [nom, [cle, liste]] of Object.entries(GROUPES)) {
  const bloc = document.querySelector(`[data-chips="${nom}"]`);
  bloc.innerHTML = liste.map(([k, l]) => `<button type="button" class="chip" data-k="${k}" aria-pressed="false">${l}</button>`).join("");
  bloc.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    s[cle] = b.dataset.k;
    if (cle === "amb" && AMBIANCES[s.amb]) { s.tMin = String(AMBIANCES[s.amb].tmin); s.tMax = String(AMBIANCES[s.amb].tmax); majChamps(); }
    maj();
  });
}

// ---------- Champs ----------
const CHAMPS = { gCoef: "gCoef", gLong: "gLong", dCoef: "dCoef", dLong: "dLong", tMin: "tMin", tPose: "tPose", tMax: "tMax", jeu: "jeu", prevu: "prevu" };
function majChamps() { for (const [cle, id] of Object.entries(CHAMPS)) if ($(id).value !== s[cle]) $(id).value = s[cle]; }
for (const [cle, id] of Object.entries(CHAMPS)) {
  $(id).addEventListener("input", () => {
    s[cle] = $(id).value;
    // Modifier le mini ou le maxi a la main : la situation devient « personnalisee » si elle ne correspond plus
    if (cle === "tMin" || cle === "tMax") {
      const a = AMBIANCES[s.amb];
      if (!a || nombre(s.tMin) !== a.tmin || nombre(s.tMax) !== a.tmax) {
        const trouve = Object.entries(AMBIANCES).find(([, v]) => v.tmin === nombre(s.tMin) && v.tmax === nombre(s.tMax));
        s.amb = trouve ? trouve[0] : "perso";
      }
    }
    maj();
  });
}

// ---------- Schema ----------
let numSchema = 0;
function barre(x1, x2, y, h, paroi, id) {
  const l = Math.max(0, x2 - x1);
  return paroi
    ? `<rect x="${x1}" y="${y}" width="${l}" height="${h}" fill="url(#hach-${id})" style="stroke:var(--elem)" stroke-width="1"/>`
    : `<rect x="${x1}" y="${y}" width="${l}" height="${h}" rx="3" style="fill:var(--elem)"/>`;
}
function pointFixe(cote, point, xi, xe) {
  // xi = bord cote joint, xe = bord exterieur ; renvoie la position du repere (ou rien)
  const x = point === "loin" ? (cote === "g" ? xe + 9 : xe - 9) : point === "centre" ? (xi + xe) / 2 : (cote === "g" ? xi - 9 : xi + 9);
  return `<circle cx="${x}" cy="37" r="5.5" style="fill:var(--ink);stroke:var(--surface)" stroke-width="2"/>`;
}
function rangee(titre, t, gap, ech, p, id) {
  const W = 600, cx = 300, y = 22, h = 30, w = Math.max(3, gap * ech);
  const xg = cx - w / 2, xd = cx + w / 2;
  const cote = w > 46 ? `<text x="${cx}" y="12" text-anchor="middle" font-size="13" font-weight="600" style="fill:var(--joint-ink)">${mm(gap)}</text>
      <path d="M${xg + 1} 17H${xd - 1}M${xg + 6} 14l-5 3 5 3M${xd - 6} 14l5 3-5 3" fill="none" style="stroke:var(--joint)" stroke-width="1.2"/>` : "";
  return `<div class="etat"><div class="etat-t"><span>${titre}</span><b>espace de ${mm(gap)}</b></div>
    <svg viewBox="0 0 ${W} 58" role="img" aria-label="${titre} : espace de ${mm(gap)}">
      ${barre(8, xg, y, h, false, id)}${barre(xd, W - 8, y, h, p.dParoi, id)}
      <rect x="${xg}" y="${y}" width="${w}" height="${h}" fill="url(#gap-${id})" style="stroke:var(--joint)" stroke-dasharray="3 3"/>
      ${pointFixe("g", p.gPt, xg, 8)}${p.dParoi ? "" : pointFixe("d", p.dPt, xd, W - 8)}
      ${cote}
    </svg></div>`;
}
function dessiner(r, p) {
  const id = ++numSchema;
  const ech = Math.min(14, 190 / Math.max(r.espaceFroid, 0.5));
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <pattern id="gap-${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" style="fill:var(--joint-soft)"/><path d="M0 0V8" style="stroke:var(--joint-line)" stroke-width="2"/></pattern>
    <pattern id="hach-${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" style="fill:var(--sunk)"/><path d="M0 0V7" style="stroke:var(--elem)" stroke-width="1.5"/></pattern></defs></svg>`;
  $("schema").innerHTML = defs
    + rangee(`Froid · ${degre(p.tmin)}`, p.tmin, r.espaceFroid, ech, p, id)
    + rangee(`À la pose · ${degre(p.tpose)}`, p.tpose, r.espacePose, ech, p, id)
    + rangee(`Chaud · ${degre(p.tmax)}`, p.tmax, r.espaceChaud, ech, p, id);
}

// ---------- Mise a jour ----------
let dernier = null;
function entrees() {
  const el = (cote) => {
    const mat = s[cote + "Mat"];
    if (mat === "paroi") return { paroi: true };
    const coef = mat === "autre" ? nombre(s[cote + "Coef"]) : MATERIAUX[mat].coef;
    return { coef, longueur: nombre(s[cote + "Long"]), point: s[cote + "Pt"] };
  };
  return { g: el("g"), d: el("d"), tmin: nombre(s.tMin), tpose: nombre(s.tPose), tmax: nombre(s.tMax), jeu: nombre(s.jeu), prevu: nombre(s.prevu) };
}
function maj() {
  sauver();
  // Pastilles
  for (const [nom, [cle]] of Object.entries(GROUPES))
    document.querySelectorAll(`[data-chips="${nom}"] .chip`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === s[cle])));
  // Champs qui apparaissent selon les choix
  document.querySelector('[data-for="g-coef"]').classList.toggle("hidden", s.gMat !== "autre");
  document.querySelector('[data-for="d-coef"]').classList.toggle("hidden", s.dMat !== "autre");
  document.querySelector(".elem-detail").classList.toggle("hidden", s.dMat === "paroi");
  document.querySelector(".paroi-note").classList.toggle("hidden", s.dMat !== "paroi");
  $("ambNote").textContent = { int: "Local chauffé ou tempéré.", ombre: "À l'abri du soleil direct : environ −20 à +40 °C.", soleil: "Élément sombre en plein soleil : jusqu'à environ 80 °C.", perso: "" }[s.amb] ?? "";

  const e = entrees(), r = calculer(e);
  dernier = r && { e, r };
  const verdict = $("verdict");
  if (!r) {
    $("rBig").textContent = "—"; $("rKicker").textContent = "Espace à laisser à la pose";
    $("rWhy").textContent = "Renseigne les longueurs (en mm) et les températures."; $("rWarn").classList.add("hidden");
    $("schema").innerHTML = ""; verdict.classList.add("hidden"); $("copyBtn").disabled = true;
    return;
  }
  $("copyBtn").disabled = false;
  $("rKicker").textContent = `Espace à laisser à la pose (${degre(e.tpose)})`;
  $("rBig").innerHTML = `${fmt(r.espacePose)} <small>mm</small>`;
  $("rWhy").textContent = r.avance > 0.005
    ? `En chaud (${degre(e.tmax)}), les éléments avancent de ${mm(r.avance)} vers le joint : il reste ${mm(e.jeu)}.`
    : `Rien n'avance vers le joint : on laisse simplement l'espace minimal voulu (${mm(e.jeu)}).`;
  $("rWarn").classList.toggle("hidden", !r.incoherent);
  if (r.incoherent) $("rWarn").textContent = "La température de pose devrait être comprise entre le mini et le maxi.";
  if (r.verdict) {
    const v = r.verdict;
    verdict.className = `verdict ${v.etat}`;
    verdict.innerHTML = v.etat === "ok"
      ? `<b>C'est bon.</b> Avec ${mm(v.prevu)}, il reste ${mm(v.resteChaud)} en chaud (${degre(e.tmax)}) et l'espace s'ouvre à ${mm(v.ouvertureFroid)} en froid (${degre(e.tmin)}).`
      : v.etat === "juste"
        ? `<b>Un peu juste.</b> Il ne reste que ${mm(v.resteChaud)} en chaud, moins que les ${mm(e.jeu)} voulus. Il faudrait ${mm(r.espacePose)}.`
        : `<b>Trop serré.</b> En chaud, les éléments se touchent : il manque ${mm(v.manque)} (il faut ${mm(r.espacePose)}).`;
  } else verdict.classList.add("hidden");
  dessiner(r, { tmin: e.tmin, tpose: e.tpose, tmax: e.tmax, gPt: e.g.point, dPt: e.d.point, dParoi: !!e.d.paroi });
}

// ---------- Copie du resume ----------
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2200); }
$("copyBtn").addEventListener("click", async () => {
  if (!dernier) return;
  const txt = resume(dernier.e, dernier.r, { g: MATERIAUX[s.gMat].nom, d: MATERIAUX[s.dMat]?.nom ?? "" });
  try { await navigator.clipboard.writeText(txt); toast("Résumé copié"); }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Résumé copié"); } catch (e2) { toast("Copie impossible"); }
    ta.remove();
  }
});
$("aboutBtn").addEventListener("click", () => toast("Joint v1.0 · conçu et développé par Hugo N."));

// Tableau des coefficients
$("coefsBody").innerHTML = Object.values(MATERIAUX).filter((m) => m.coef).map((m) => `<tr><td>${m.nom}</td><td>${m.coef}</td></tr>`).join("");

majChamps();
maj();
