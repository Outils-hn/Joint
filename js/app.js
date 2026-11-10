// Joint : affichage et saisie. Les calculs sont dans core.js.
import { MATERIAUX, AMBIANCES, jointSimple, nombre, fmt } from "./core.js";

const $ = (id) => document.getElementById(id);
const CLE = "joint.reglages";
const APPLIS = [
  ["Check", "Notes & tâches", "#4338CA"],
  ["Index", "Fiches techniques", "#6D4AFF"],
  ["Access", "Annuaire fournisseurs", "#C2255C"],
  ["Trame", "Répartition de perçages", "#0E9F6E"],
  ["Linear", "Mise en barre", "#2B50FF"],
  ["Format", "Débit de panneaux", "#FF4D00"],
  ["Joint", "Dilatation et joints", "#0B7285"],
  ["Masse", "Poids des éléments", "#9A4A3A"],
  ["Membrane", "Étanchéité", "#B45309"],
  ["Strate", "Épaisseurs d'isolation", "#D4A20B"],
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
// Detail du calcul : 2 decimales, et les totaux sont refaits a partir des valeurs affichees (2,76 + 2,76 = 5,52 : l'addition tombe toujours juste a l'ecran)
const c2 = (n) => Math.round(n * 100) / 100;


// ---------- Menu des applis ----------
$("appsList").innerHTML = `<div class="apps-label">Mes outils</div>
  <a href="https://outils-hn.github.io/"><span class="sw" style="background:conic-gradient(#C2255C 0 25%,#6D4AFF 0 50%,#0E9F6E 0 75%,#FF4D00 0)"></span><span class="nm">Accueil</span><span class="rl">Toutes les applis, idées &amp; bugs</span></a>
  <div class="apps-sep" role="separator"></div>` +
  APPLIS.map(([nom, role, c]) => `<a href="https://outils-hn.github.io/${nom}/"${nom === "Joint" ? ' aria-current="page"' : ""}><span class="sw" style="background:${c}"></span><span class="nm">${nom}</span><span class="rl">${role.replace("&", "&amp;")}</span>${nom === "Joint" ? '<span class="ck" aria-hidden="true">✓</span>' : ""}</a>`).join("");
document.addEventListener("click", (e) => { const m = $("appsMenu"); if (m.open && !m.contains(e.target)) m.open = false; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("appsMenu").open) { $("appsMenu").open = false; $("appsMenu").querySelector("summary").focus(); } });

// ---------- Theme clair / sombre (reglage commun aux applis) ----------
const ICONES = {
  light: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12.23v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2.23 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
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
  for (const [id, cle] of [["sAmb", "sAmb"]]) document.querySelectorAll(`#${id} button`).forEach((b) => { const on = b.dataset.k === s[cle]; b.setAttribute("aria-checked", String(on)); b.classList.toggle("on", on); });
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
  $("sWhy").textContent = `Calcul exact : ${mm(2 * c2(r.avance), 2)}. Les deux pièces avancent l'une vers l'autre de ${mm(c2(r.avance), 2)} chacune (pièce fixée au milieu : la moitié de l'allongement). Arrondi au mm supérieur.`;
  $("sDraw").innerHTML = `<div class="b1"></div><div class="gj" style="width:${Math.max(16, Math.min(90, r.joint * 4))}px"></div><div class="b2"></div>`;
  $("sTrou").innerHTML = `${fmt(r.trou, 0)} <small>mm + Ø de la vis</small>`;
  $("sSlot").innerHTML = `<span class="h">${mm(c2(r.demi) + r.reglage, 2)}</span><span class="screw"></span><span class="h">${mm(c2(r.demi) + r.reglage, 2)}</span>`;
  $("sTrouWhy").textContent = `De chaque côté de la vis : ${mm(c2(r.demi), 2)} de course${r.reglage > 0 ? ` + ${mm(r.reglage, 0)} de réglage = ${mm(c2(r.demi) + r.reglage, 2)}` : ""}. Trou total : ${mm(2 * (c2(r.demi) + r.reglage), 2)}, arrondi à ${mm(r.trou, 0)} (+ Ø de la vis). Trou à chaque extrémité, la pièce étant fixée au milieu.`;
}
$("sCopy").addEventListener("click", () => {
  if (!dernier) return;
  const amb = AMBIANCES[s.sAmb];
  copier([
    `Dilatation : ${NOM_MAT[s.sMat]} ${fmt(nombre(s.sLong), 0)} mm, ${amb.nom.toLowerCase()} (de ${amb.tmin} à ${amb.tmax} °C, pose à 20 °C), pièce fixée au milieu`,
    `Dilatation de chaque pièce : +${fmt(dernier.dilatation)} mm (chaque bout avance de ${fmt(c2(dernier.avance), 2)} mm)`,
    `Joint à prévoir entre deux pièces : ${fmt(dernier.joint, 0)} mm (calcul exact ${fmt(2 * c2(dernier.avance), 2)} mm, arrondi au mm supérieur)`,
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
$("aboutBtn").addEventListener("click", () => $("dApropos").showModal());
$("daFermer").addEventListener("click", () => $("dApropos").close());
$("dApropos").addEventListener("click", (e) => { if (e.target === $("dApropos")) $("dApropos").close(); });

// ---------- Compte (meme connexion que les autres applis : Index, meme site) ----------
const SB_URL = "https://dtxgvwaqjmmffiiohika.supabase.co";
const SB_KEY = "sb_publishable_yEWGxFFSLTE1lJRXnFUmpg_dMwa6LxW";
const SESSION_KEY = "sb-dtxgvwaqjmmffiiohika-auth-token";
const lireSession = () => { try { const s = JSON.parse(localStorage.getItem(SESSION_KEY)); return s && s.access_token ? s : null; } catch (e) { return null; } };
const ecrireSession = (s) => { try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } };
function afficherCompte() {
  const s = lireSession();
  $("etatCompte").textContent = s ? (s.user?.email || "") : "Lecture seule";
  $("etatCompte").classList.toggle("on", !!s);
  $("compteBtn").textContent = s ? "Se déconnecter" : "Se connecter";
}
async function seConnecter(email, mdp) {
  try {
    const r = await fetch(SB_URL + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password: mdp }) });
    const j = await r.json();
    if (!r.ok) {
      const m = String(j.error_description || j.msg || "");
      return /invalid login/i.test(m) ? "Email ou mot de passe incorrect." : /confirm/i.test(m) ? "Adresse email pas encore confirmée : ouvre le lien reçu par email." : (m || "Connexion impossible.");
    }
    ecrireSession({ ...j, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600) }); return null;
  } catch (e) { return "Pas de connexion au serveur."; }
}
$("compteBtn").addEventListener("click", () => {
  if (lireSession()) { ecrireSession(null); toast("Déconnecté"); afficherCompte(); return; }
  $("formConnexion").reset(); $("cErreur").textContent = ""; $("dConnexion").showModal(); $("cEmail").focus();
});
$("formConnexion").addEventListener("submit", async (e) => {
  e.preventDefault();
  const bouton = $("cOk"); bouton.disabled = true;
  const err = !$("cEmail").value || !$("cMdp").value ? "Saisis l'email et le mot de passe." : await seConnecter($("cEmail").value, $("cMdp").value);
  bouton.disabled = false;
  if (err) { $("cErreur").textContent = err; return; }
  $("dConnexion").close(); afficherCompte();
});
$("cAnnuler").addEventListener("click", () => $("dConnexion").close());
window.addEventListener("storage", (e) => { if (e.key === SESSION_KEY) afficherCompte(); });

afficherCompte();
maj();

// Ctrl+K : ouvre la recherche de l'Accueil dans un autre onglet (on ne quitte pas ce qu'on est en train de faire)
document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); window.open("https://outils-hn.github.io/#recherche", "outils-accueil"); } });

// ---------- Touche « ? » : liste des raccourcis clavier ----------
(function raccourcisAide() {
  const lignes = [
    [["Ctrl", "K"], "Rechercher dans toutes les applis (ouvre l'Accueil)"],
    [["Échap"], "Fermer une fenêtre ou un menu"],
    [["Entrée"], "Valider la fenêtre ou le champ en cours"],
    [["Tab"], "Champ suivant (Maj + Tab : précédent)"],
    [["?"], "Afficher cette liste"],
  ];
  const kbd = (t) => `<kbd style="border:1px solid var(--line-strong,#d4d4cf);border-radius:4px;padding:1px 6px;font:12px ui-monospace,monospace;background:var(--sunk,#f3f3f0)">${t}</kbd>`;
  const d = document.createElement("dialog");
  d.id = "dRaccourcis";
  d.setAttribute("aria-labelledby", "dr-titre");
  d.innerHTML = `<div class="apropos" style="padding:20px"><h3 id="dr-titre" style="margin:0 0 10px">Raccourcis clavier</h3>${lignes.map(([t, x]) => `<div style="display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-top:1px solid var(--line,#e8e8e5)"><span>${x}</span><span style="display:flex;gap:4px;flex:none">${t.map(kbd).join("")}</span></div>`).join("")}<form method="dialog" style="margin-top:12px;text-align:right"><button class="btn">Fermer</button></form></div>`;
  document.body.appendChild(d);
  const menu = document.querySelector(".apps-menu");
  if (menu) {
    menu.insertAdjacentHTML("beforeend", `<div class="apps-sep" role="separator"></div><a href="#raccourcis" id="raccourcisBtn"><span class="sw ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10"/></svg></span><span class="nm">Raccourcis</span><span class="rl">Touches du clavier · ?</span></a>`);
    document.getElementById("raccourcisBtn").addEventListener("click", (e) => { e.preventDefault(); const m = document.getElementById("appsMenu") || menu.closest("details"); if (m) m.open = false; d.showModal(); });
  }
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || document.querySelector("dialog[open]")) return;
    e.preventDefault(); d.showModal();
  });
})();

// Bouton « Rechercher » du bandeau : meme recherche que Ctrl+K (ouvre l'Accueil dans un autre onglet)
document.getElementById("rechercheBtn")?.addEventListener("click", () => window.open("https://outils-hn.github.io/#recherche", "outils-accueil"));
