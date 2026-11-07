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

// Menus de choix maison (plus jolis que les menus du navigateur) : bouton + liste de choix avec une pastille de couleur
const MAT_META = (k) => (MATERIAUX[k]?.coef != null ? `${MATERIAUX[k].coef} × 10⁻⁶` : "");
const SELECTS = {
  gMat: { get: () => s.gMat, set: (k) => { s.gMat = k; }, opts: () => Object.keys(MATERIAUX).map((k) => ({ k, nom: k === "autre" ? "Autre…" : MATERIAUX[k].nom, meta: MAT_META(k), sw: `sw-${k}` })) },
  dMat: { get: () => s.dMat, set: (k) => { s.dMat = k; }, opts: () => [...Object.keys(MATERIAUX).map((k) => ({ k, nom: k === "autre" ? "Autre…" : MATERIAUX[k].nom, meta: MAT_META(k), sw: `sw-${k}` })), { k: "paroi", nom: "Paroi fixe (mur)", meta: "ne bouge pas", sw: "sw-paroi", sep: true }] },
  amb: { get: () => (AMBIANCES[s.amb] ? s.amb : "perso"), set: (k) => { s.amb = k; if (AMBIANCES[k]) { s.tMin = String(AMBIANCES[k].tmin); s.tMax = String(AMBIANCES[k].tmax); } },
    opts: () => ["soleil", "ombre", "int", "perso"].map((k) => ({ k, nom: AMB_NOMS[k], meta: AMBIANCES[k] ? `${AMBIANCES[k].tmin} / ${AMBIANCES[k].tmax} °C` : "", sw: `sw-${k}` })) },
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
  b.type = "button"; b.className = "dot";
  // les ronds des extremites sont rentres de 20 px : ils ne sont plus caches par la hachure ni coupes par le bord
  b.style.left = pos === 0 ? "20px" : pos === 100 ? "calc(100% - 20px)" : `${pos}%`;
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
  const gapW = Math.max(16, Math.min(window.innerWidth < 520 ? 56 : 90, Math.round(gapMm * 6)));
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


// ---------- Schema du trou oblong (une seule piece) ----------
// Schema de principe : les deux cotes ont une largeur mini pour que les textes ne se chevauchent jamais, quelles que soient les valeurs.
function dessinerOblong(r, t) {
  const W = 560, H = 238, dir = s.uPt === "droite" ? -1 : 1; // dir = sens du bout qui bouge (cote exterieur)
  const mx = (u) => (dir > 0 ? u : W - u);
  const anc = (a) => (dir > 0 ? a : a === "start" ? "end" : a === "end" ? "start" : a);
  const rect = (u1, u2, y, h, extra) => `<rect x="${Math.min(mx(u1), mx(u2))}" y="${y}" width="${Math.abs(u2 - u1)}" height="${h}" ${extra}/>`;
  const txt = (u, y, t, cls, a = "middle") => `<text x="${mx(u)}" y="${y}" text-anchor="${anc(a)}" class="${cls}">${t}</text>`;
  // cote : trait avec fleches aux deux bouts, et reperes pointilles jusqu'a yBas
  const cote = (u1, u2, y, yBas, couleur) => {
    const a = mx(u1), b = mx(u2), sg = Math.sign(b - a) || 1;
    return `<path d="M${a} ${y}H${b}M${a} ${y}l${7 * sg} -4.5M${a} ${y}l${7 * sg} 4.5M${b} ${y}l${-7 * sg} -4.5M${b} ${y}l${-7 * sg} 4.5" fill="none" class="${couleur}" stroke="currentColor" stroke-width="1.8"/>`
      + `<path d="M${a} ${y}V${yBas}M${b} ${y}V${yBas}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3" fill="none"/>`;
  };
  const H2 = r.demiTrou, X = r.chaudBout, Y = r.froidBout, D = 36, TOTAL = 320; // vis au milieu : meme place de chaque cote
  const wX = TOTAL / 2, wY = TOTAL / 2;
  const u2 = 492, u1 = u2 - (D + TOTAL), uc = u1 + D / 2 + wX;
  const sx = mx(uc), yc = 125;
  $("oblong").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Trou oblong : vis au milieu, ${fmt(H2)} mm de place de chaque côté, soit ${fmt(2 * H2)} mm plus le diamètre de la vis">
    ${rect(20, 530, 90, 70, 'rx="4" style="fill:var(--elem)"')}
    ${rect(u1, u2, yc - 18, 36, 'rx="18" style="fill:var(--surface);stroke:var(--ink)" stroke-width="1.8"')}
    <circle cx="${sx}" cy="${yc}" r="15" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 3"/>
    ${txt(uc, 166, "vis au milieu", "m")}
    <g id="vis" style="transform:translateX(0px)"><circle cx="${sx}" cy="${yc}" r="15" style="fill:var(--sunk);stroke:var(--ink)" stroke-width="2"/>
    <path d="M${sx - 8} ${yc}H${sx + 8}M${sx} ${yc - 8}V${yc + 8}" style="stroke:var(--ink)" stroke-width="2" stroke-linecap="round"/></g>
    ${cote(uc, u1 + D / 2, 74, yc - 18, "c1")}${cote(uc, u2 - D / 2, 74, yc - 18, "c2")}
    ${txt(uc - wX / 2, 34, "place", "m")}${txt(uc - wX / 2, 58, `${fmt(H2)} mm`, "v c1")}
    ${txt(uc + wY / 2, 34, "place", "m")}${txt(uc + wY / 2, 58, `${fmt(H2)} mm`, "v c2")}
    ${cote(u1, u2, 188, yc + 18, "c0")}
    ${txt((u1 + u2) / 2, 212, `trou : ${fmt(2 * H2)} mm + Ø de la vis`, "m")}
    <path d="M${mx(530)} 160V222" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3" fill="none"/>
    ${txt(20, 232, dir > 0 ? "← centre de la pièce" : "centre de la pièce →", "m", "start")}
    ${txt(530, 232, "bout de la pièce", "m", "end")}
  </svg>`;
  const sens = mx(1) - mx(0); // +1 normal, -1 miroir
  // Deplacement de la vis (en mm reels) selon la temperature : vers le centre de la piece en chaud (-), vers le bout en froid (+)
  const depl = (T) => {
    if (T > t.tpose && t.tmax > t.tpose) return -X * Math.min(1, (T - t.tpose) / (t.tmax - t.tpose));
    if (T < t.tpose && t.tpose > t.tmin) return Y * Math.min(1, (t.tpose - T) / (t.tpose - t.tmin));
    return 0;
  };
  const curseur = $("oblT");
  curseur.min = t.tmin; curseur.max = t.tmax; curseur.step = 1;
  const placer = () => {
    const T = Math.min(t.tmax, Math.max(t.tmin, Number(curseur.value)));
    const m = depl(T), d = Math.abs(m), reste = Math.max(0, H2 - d);
    $("vis").style.transform = `translateX(${(H2 > 0 ? (m / H2) * wX : 0) * sens}px)`;
    $("oblTval").textContent = degre(T);
    $("oblEtat").innerHTML = m === 0
      ? `<b>À ${degre(T)} (pose)</b> : la vis est au milieu du trou, avec ${fmt(H2)} mm de place de chaque côté.`
      : `<b>À ${degre(T)}</b> : la pièce ${m < 0 ? "s'allonge" : "se raccourcit"} de ${fmt(d)} mm, donc la vis glisse de ${fmt(d)} mm vers ${m < 0 ? "le centre" : "le bout"} de la pièce. Il lui reste ${fmt(reste)} mm de marge.`;
    document.querySelectorAll("#oblBtns button").forEach((b) => b.classList.toggle("on", Number(b.dataset.t) === T));
  };
  const reglages = { froid: t.tmin, pose: t.tpose, chaud: t.tmax };
  document.querySelectorAll("#oblBtns button").forEach((b) => { b.dataset.t = reglages[b.dataset.k]; b.onclick = () => { curseur.value = reglages[b.dataset.k]; placer(); }; });
  curseur.value = t.tpose; curseur.oninput = placer;
  const quel = s.uPt === "centre" ? "à chaque extrémité (la pièce est fixée au centre)" : `à l'extrémité ${s.uPt === "gauche" ? "droite" : "gauche"} (la pièce est fixée ${POINTS_PIECE[s.uPt].nom})`;
  placer();
  const pourquoi = `Règle simple pour le monteur : la vis se met au milieu du trou. Le trou est dessiné assez long pour la plus grande course (${fmt(H2)} mm de chaque côté), ce qui laisse aussi de la marge si la pose se fait à une autre température. `;
  $("oblongNote").textContent = `${pourquoi}Schéma de principe, pas à l'échelle. À prévoir ${quel}. Pour une fixation intermédiaire, la course est proportionnelle à sa distance au point fixe.`;
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
  txt.textContent = mat === "autre" || mat === "paroi" ? "" : `Coefficient α = ${MATERIAUX[mat].coef} × 10⁻⁶ K⁻¹`;
}
function maj() {
  sauver();
  const une = s.mode === "une";
  document.querySelectorAll(".modes button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === s.mode)));
  for (const id of Object.keys(SELECTS)) majSelect(id);
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
  $("oblongCard").classList.add("hidden");
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
    const bout = s.uPt === "centre" ? "à chaque extrémité" : "à l'extrémité libre";
    $("rWhy").textContent = `En froid (${degre(t.tmin)}), elle se raccourcit de ${mm(r.raccourcissement)}. Course totale : ${mm(r.course)}. Trou oblong ${bout} : ${mm(2 * r.demiTrou)} + diamètre de la vis, vis au milieu (${mm(r.demiTrou)} de chaque côté).`;
    $("rWarn").classList.toggle("hidden", !r.incoherent);
    if (r.incoherent) $("rWarn").textContent = "La température de pose devrait être comprise entre le mini et le maxi.";
    dessinerUne(); etatsUne(t, r);
    $("oblongCard").classList.remove("hidden"); dessinerOblong(r, t);
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
$("aboutBtn").addEventListener("click", () => toast("Joint v1.5 · conçu et développé par Hugo N."));
$("coefsBody").innerHTML = Object.values(MATERIAUX).filter((m) => m.coef).map((m) => `<tr><td>${m.nom}</td><td>${m.coef}</td></tr>`).join("");

maj();
