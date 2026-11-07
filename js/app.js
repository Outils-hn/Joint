// Joint : affichage et saisie. Les calculs sont dans core.js.
import { MATERIAUX, AMBIANCES, jointSimple, nombre, fmt } from "./core.js";

const $ = (id) => document.getElementById(id);
const CLE = "joint.reglages";
const APPLIS = [
  ["Access", "Annuaire fournisseurs", "#C2255C"], ["Check", "Notes & tâches", "#4338CA"], ["Format", "Débit de panneaux", "#FF4D00"],
  ["Index", "Fiches techniques", "#6D4AFF"], ["Joint", "Dilatation et joints", "#0B7285"], ["Linear", "Mise en barre", "#2B50FF"],
  ["Masse", "Poids des éléments", "#9A4A3A"], ["Strate", "Épaisseurs d'isolation", "#D4A20B"], ["Trame", "Répartition de perçages", "#0E9F6E"],
];

// Cas de depart : 3 m d'alu en plein soleil
const DEFAUT = { sMat: "alu", sLong: "3000", sAmb: "soleil", sReg: "" };
let s = { ...DEFAUT };
try {
  const lu = JSON.parse(localStorage.getItem(CLE) ?? "null");
  if (lu && typeof lu === "object") for (const k of Object.keys(DEFAUT)) if (typeof lu[k] === "string") s[k] = lu[k];
  if (!MATERIAUX[s.sMat]) s.sMat = DEFAUT.sMat;
  if (!AMBIANCES[s.sAmb]) s.sAmb = DEFAUT.sAmb;
} catch (e) { /* stockage bloque : on part des valeurs par defaut */ }
const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(s)); } catch (e) { /* ignore */ } };

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
const AMB_NOMS = Object.fromEntries(Object.entries(AMBIANCES).map(([k, v]) => [k, v.nom]));

// Menu de choix maison (plus joli que le menu du navigateur) : bouton + liste de choix avec une pastille de couleur
const SELECTS = {
  sMat: { get: () => s.sMat, set: (k) => { s.sMat = k; }, opts: () => Object.keys(MATERIAUX).map((k) => ({ k, nom: MATERIAUX[k].nom, meta: `${MATERIAUX[k].coef} × 10⁻⁶`, sw: `sw-${k}` })) },
};
function fermerMenus(sauf) {
  document.querySelectorAll(".sel-pop").forEach((p) => {
    if (p.parentElement === sauf) return;
    p.classList.add("hidden"); p.parentElement.querySelector(".sel-btn").setAttribute("aria-expanded", "false");
  });
}
function majSelect(id) {
  const box = $(id), def = SELECTS[id], cur = def.get(), liste = def.opts();
  const o = liste.find((x) => x.k === cur) ?? liste[0];
  box.querySelector(".sw").className = `sw ${o.sw}`;
  box.querySelector(".sel-t").textContent = o.nom;
  const pop = box.querySelector(".sel-pop");
  pop.innerHTML = liste.map((x) => `${x.sep ? '<div class="sep"></div>' : ""}<button type="button" role="option" data-k="${x.k}" aria-selected="${x.k === cur}"><span class="sw ${x.sw}"></span>${x.nom}<span class="m">${x.meta}</span></button>`).join("");
}
for (const id of Object.keys(SELECTS)) {
  const box = $(id), btn = box.querySelector(".sel-btn"), pop = box.querySelector(".sel-pop");
  btn.addEventListener("click", () => {
    const ouvrir = pop.classList.contains("hidden");
    fermerMenus(ouvrir ? box : null);
    pop.classList.toggle("hidden", !ouvrir); btn.setAttribute("aria-expanded", String(ouvrir));
    if (ouvrir) (pop.querySelector('[aria-selected="true"]') ?? pop.querySelector("button"))?.focus();
  });
  pop.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-k]"); if (!b) return;
    SELECTS[id].set(b.dataset.k); fermerMenus(null); btn.focus(); maj();
  });
  pop.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const bs = [...pop.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
    bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length].focus();
  });
}
document.addEventListener("click", (e) => { if (!e.target.closest(".sel")) fermerMenus(null); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fermerMenus(null); });

const CHAMPS = ["sLong", "sReg"];
for (const cle of CHAMPS) $(cle).addEventListener("input", () => { s[cle] = $(cle).value; maj(); });
function majChamps() { for (const cle of CHAMPS) if ($(cle).value !== s[cle]) $(cle).value = s[cle]; }

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
// ---------- Ecran : la piece, sa dilatation, le joint, le trou oblong ----------
$("sAmb").innerHTML = Object.keys(AMBIANCES).reverse().map((k) => `<button type="button" role="radio" data-k="${k}">${AMB_NOMS[k]}</button>`).join("");
$("sAmb").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (b) { s.sAmb = b.dataset.k; maj(); } });
let dernier = null;
function maj() {
  sauver();
  majSelect("sMat"); majChamps(); majUnites();
  document.querySelectorAll("#sAmb button").forEach((b) => { const on = b.dataset.k === s.sAmb; b.setAttribute("aria-checked", String(on)); b.classList.toggle("on", on); });
  const amb = AMBIANCES[s.sAmb];
  $("sHyp").innerHTML = `Hypothèse : la température monte jusqu'à <b>${amb.tmax} °C</b> (et descend à ${amb.tmin} °C), la pièce étant posée à 20 °C.`;
  const r = jointSimple({ coef: MATERIAUX[s.sMat].coef, longueur: nombre(s.sLong), tmin: amb.tmin, tmax: amb.tmax, reglage: nombre(s.sReg) });
  dernier = r;
  $("sCopy").disabled = !r;
  if (!r) {
    for (const id of ["sDil", "sJoint", "sTrou"]) $(id).textContent = "—";
    $("sWhy").textContent = "Renseigne la longueur de la pièce (en mm).";
    $("sTrouWhy").textContent = ""; $("sDraw").innerHTML = ""; $("sSlot").innerHTML = "";
    return;
  }
  $("sDil").innerHTML = `+${fmt(r.dilatation)} <small>mm</small>`;
  $("sJoint").innerHTML = `${fmt(r.joint, 0)} <small>mm</small>`;
  $("sWhy").textContent = `Calcul exact : ${mm(r.brut)}. Les deux pièces avancent l'une vers l'autre de ${mm(r.dilatation)} chacune (cas le plus défavorable). Arrondi au mm supérieur.`;
  $("sDraw").innerHTML = `<div class="b1"></div><div class="gj" style="width:${Math.max(16, Math.min(90, r.joint * 4))}px"></div><div class="b2"></div>`;
  $("sTrou").innerHTML = `${fmt(r.trou, 0)} <small>mm + Ø de la vis</small>`;
  $("sSlot").innerHTML = `<span class="h">${mm(r.cote)}</span><span class="screw"></span><span class="h">${mm(r.cote)}</span>`;
  $("sTrouWhy").textContent = `Vis au milieu du trou : ${mm(r.cote)} de chaque côté. Dilatation ${mm(r.trouBrut - 2 * r.reglage)}${r.reglage > 0 ? ` + réglage 2 × ${mm(r.reglage, 0)}` : ""}. Arrondi au mm supérieur. Cas le plus défavorable : la pièce est fixée à l'autre bout.`;
}
$("sCopy").addEventListener("click", () => {
  if (!dernier) return;
  const amb = AMBIANCES[s.sAmb];
  copier([
    `Dilatation : ${NOM_MAT[s.sMat]} ${fmt(nombre(s.sLong), 0)} mm, ${amb.nom.toLowerCase()} (de ${amb.tmin} à ${amb.tmax} °C, pose à 20 °C)`,
    `Dilatation de chaque pièce : +${fmt(dernier.dilatation)} mm`,
    `Joint à prévoir entre deux pièces : ${fmt(dernier.joint, 0)} mm (calcul exact ${fmt(dernier.brut)} mm, arrondi au mm supérieur)`,
    `Trou oblong si la pièce est vissée : ${fmt(dernier.trou, 0)} mm + Ø de la vis, vis au milieu${dernier.reglage > 0 ? ` (dont réglage de pose ± ${fmt(dernier.reglage, 0)} mm)` : ""}`,
  ].join("\n"));
});

// ---------- Copie ----------
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2200); }
async function copier(txt) {
  try { await navigator.clipboard.writeText(txt); toast("Résumé copié"); }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Résumé copié"); } catch (e2) { toast("Copie impossible"); }
    ta.remove();
  }
}
$("aboutBtn").addEventListener("click", () => toast("Joint v2.2 · conçu et développé par Hugo N."));

maj();
