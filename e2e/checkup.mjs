// Check-up automatique de Joint dans un vrai navigateur (donnees du navigateur vierges).
// Resultat : checkup.txt (OK / ECHEC) + captures d'ecran.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.APP_URL ?? "http://127.0.0.1:8090/";
const OUT = process.argv[2] ?? "captures";
mkdirSync(OUT, { recursive: true });
const lignes = [];
const verif = (nom, ok, detail = "") => lignes.push(`${ok ? "OK    " : "ECHEC "} ${nom}${detail ? ` (${detail})` : ""}`);
const step = async (nom, fn) => { try { await fn(); } catch (e) { verif(nom, false, e.message.split("\n")[0].slice(0, 180)); } };
const browser = await chromium.launch();

async function ouvrir({ largeur = 1440, hauteur = 900, sombre = false } = {}) {
  const c = await browser.newContext({ viewport: { width: largeur, height: hauteur } });
  await c.addInitScript((d) => { if (d) localStorage.setItem("outils-theme", "dark"); }, sombre);
  const page = await c.newPage();
  page.on("pageerror", (e) => verif("Aucune erreur JavaScript", false, e.message.slice(0, 150)));
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(300);
  return { c, page };
}
const big = (page) => page.locator("#rBig").innerText().then((t) => t.replace(/\s+/g, " ").trim());
const pasDebordement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const choisir = async (page, id, k) => { await page.click(`#${id} .sel-btn`); await page.click(`#${id} .sel-pop [data-k="${k}"]`); };
const dot = (page, cote, k) => page.locator(`#draw .barwrap.${cote} .dot[aria-label$="${k}"]`).click();

await step("Exemple de depart : 2 tubes alu de 4 m = 13,0 mm", async () => {
  const { c, page } = await ouvrir();
  verif("Resultat de depart 13,0 mm", (await big(page)) === "13,0 mm", await big(page));
  verif("Le resultat est visible sans defiler (ordinateur)", await page.locator("#rBig").evaluate((el) => el.getBoundingClientRect().bottom < window.innerHeight));
  verif("Trois etats affiches", (await page.locator("#etats .etat").count()) === 3);
  verif("Coefficient affiche en petit", /23 × 10⁻⁶ K⁻¹/.test(await page.locator("#gCoefTxt").innerText()));
  await page.screenshot({ path: `${OUT}/01-depart.png`, fullPage: true });

  // Point fixe au centre des deux elements (on touche le rond du dessin) -> 7,5 mm
  await dot(page, "g", "au centre"); await dot(page, "d", "au centre");
  verif("Points fixes au centre : 7,5 mm", (await big(page)) === "7,5 mm", await big(page));

  // Paroi fixe a droite : un seul element bouge
  await choisir(page, "dMat", "paroi");
  verif("Paroi fixe : 2,8 + 2 = 4,8 mm", (await big(page)) === "4,8 mm", await big(page));
  verif("Longueur de l'element de droite masquee", !(await page.locator("#dLong").isVisible()));
  await page.screenshot({ path: `${OUT}/02-paroi.png`, fullPage: true });
  await c.close();
});

await step("Unite juste apres la valeur saisie", async () => {
  const { c, page } = await ouvrir();
  const u = page.locator("#gLong").locator("xpath=../span[@class='u']");
  const [boite, champ] = await Promise.all([u.locator("i").boundingBox(), page.locator("#gLong").boundingBox()]);
  const apres = await u.evaluate((el) => el.textContent);
  verif("Le champ affiche « 4000 mm »", apres.replace(/\s+/g, " ").trim() === "4000 mm", apres);
  await page.fill("#gLong", "65000");
  const l2 = await u.locator("i").boundingBox();
  verif("L'unite suit la valeur (plus longue = plus a droite)", l2.width > boite.width && l2.x === boite.x);
  await page.fill("#gLong", "");
  verif("Champ vide : pas d'unite", (await u.evaluate((el) => el.textContent)) === "");
  await c.close();
});

await step("Verification de l'espace prevu", async () => {
  const { c, page } = await ouvrir();
  await page.fill("#prevu", "10");
  const v = page.locator("#verdict");
  verif("10 mm avec points a l'autre bout : trop serre", (await v.getAttribute("class")).includes("touche") && /Trop serré/.test(await v.innerText()));
  await page.screenshot({ path: `${OUT}/03-verdict.png`, fullPage: true });
  await dot(page, "g", "au centre"); await dot(page, "d", "au centre");
  verif("10 mm avec points au centre : c'est bon", (await v.getAttribute("class")).includes("ok") && /C'est bon/.test(await v.innerText()));
  await c.close();
});

await step("Une seule piece", async () => {
  const { c, page } = await ouvrir();
  await page.click("#modeUne");
  await page.fill("#gLong", "6000");
  verif("Piece de 6 m en alu : +8,3 mm", (await big(page)) === "+8,3 mm", await big(page));
  verif("Trou oblong : 16,6 mm, vis au milieu", /16,6 mm \+ diamètre de la vis, vis au milieu \(8,3 mm de chaque côté\)/.test(await page.locator("#rWhy").innerText()), await page.locator("#rWhy").innerText());
  verif("Le deuxieme element disparait", !(await page.locator("#colD").isVisible()));
  verif("Champ « J'avais prevu » masque", !(await page.locator("#prevu").isVisible()));
  verif("Schema du trou oblong affiche", await page.locator("#oblong svg").isVisible());
  const obl = (await page.locator("#oblong").innerText()).replace(/\s+/g, " ");
  verif("Schema : 8,3 mm de place de chaque cote, trou de 16,6 mm", (obl.match(/8,3 mm/g) ?? []).length >= 2 && /trou : 16,6 mm/.test(obl), obl);
  const visX = () => page.locator("#vis circle").evaluate((el) => el.getBoundingClientRect().x);
  const x0 = await visX();
  await page.click("#oblBtns [data-k='chaud']"); await page.waitForTimeout(450);
  const xc = await visX();
  verif("Curseur : en chaud la vis glisse de 8,3 mm, marge 0", xc !== x0 && /glisse de 8,3 mm/.test(await page.locator("#oblEtat").innerText()) && /0,0 mm de marge/.test(await page.locator("#oblEtat").innerText()), await page.locator("#oblEtat").innerText());
  await page.screenshot({ path: `${OUT}/06b-oblong-chaud.png`, fullPage: true });
  await page.click("#oblBtns [data-k='froid']"); await page.waitForTimeout(450);
  const xf = await visX();
  verif("Curseur : en froid la vis part de l'autre cote (5,5 mm)", (xf - x0) * (xc - x0) < 0 && /glisse de 5,5 mm/.test(await page.locator("#oblEtat").innerText()) && /2,8 mm de marge/.test(await page.locator("#oblEtat").innerText()), `${x0} ${xc} ${xf}`);
  await page.click("#oblBtns [data-k='pose']"); await page.waitForTimeout(450);
  verif("Curseur : a la pose la vis revient", Math.abs((await visX()) - x0) < 1);
  await page.screenshot({ path: `${OUT}/06-piece.png`, fullPage: true });
  await page.locator("#draw .dot[aria-label$='au centre']").click();
  verif("Point fixe au centre : 4,1 mm de chaque cote", /4,1 mm de chaque côté/.test(await page.locator("#rWhy").innerText()), await page.locator("#rWhy").innerText());
  await page.reload(); await page.waitForTimeout(300);
  verif("Le mode est retrouve apres rechargement", (await page.locator("#modeUne").getAttribute("aria-selected")) === "true");
  await c.close();
});

await step("Situation, materiaux, coefficient libre et memoire des reglages", async () => {
  const { c, page } = await ouvrir();
  await choisir(page, "amb", "int");
  verif("Interieur : mini 0, maxi 40", (await page.inputValue("#tMin")) === "0" && (await page.inputValue("#tMax")) === "40");
  verif("Interieur : 5,7 mm", (await big(page)) === "5,7 mm", await big(page));
  await page.fill("#tMax", "80");
  verif("Mini 0 / maxi 80 : situation personnalisee", /Personnalisé/.test(await page.locator("#amb .sel-t").innerText()));
  await choisir(page, "gMat", "autre");
  verif("Coefficient libre visible", await page.locator("#gCoef").isVisible());
  await page.fill("#gCoef", "10"); await page.fill("#gLong", "3000");
  await page.waitForTimeout(100);
  await page.reload(); await page.waitForTimeout(300);
  verif("Les reglages sont retrouves apres rechargement", (await page.inputValue("#gLong")) === "3000" && (await page.inputValue("#gCoef")) === "10");
  await c.close();
});

await step("Donnees manquantes", async () => {
  const { c, page } = await ouvrir();
  await page.fill("#gLong", "");
  verif("Longueur vide : pas de resultat", (await big(page)) === "—");
  verif("Copie desactivee", await page.locator("#copyBtn").isDisabled());
  await c.close();
});

await step("Telephone et theme sombre", async () => {
  const { c, page } = await ouvrir({ largeur: 390, hauteur: 844 });
  verif("Telephone : pas de defilement lateral", await pasDebordement(page));
  verif("Telephone : le resultat est visible sans defiler", await page.locator("#rBig").evaluate((el) => el.getBoundingClientRect().bottom < window.innerHeight));
  await page.screenshot({ path: `${OUT}/04-telephone.png`, fullPage: true });
  await page.click("#modeUne");
  verif("Telephone, une piece : pas de defilement lateral", await pasDebordement(page));
  await page.screenshot({ path: `${OUT}/07-telephone-piece.png`, fullPage: true });
  await c.close();
  const sombre = await ouvrir({ sombre: true });
  await sombre.page.screenshot({ path: `${OUT}/05-sombre.png`, fullPage: true });
  verif("Theme sombre applique", (await sombre.page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
  await sombre.c.close();
});

await step("Menus de choix et pied de page", async () => {
  const { c, page } = await ouvrir();
  await page.click("#gMat .sel-btn");
  verif("Menu matiere : 5 choix a gauche", (await page.locator("#gMat .sel-pop button").count()) === 5);
  verif("Menu matiere : 6 choix a droite (avec paroi fixe)", (await page.locator("#dMat .sel-pop button").count()) === 6);
  await page.screenshot({ path: `${OUT}/08-menu.png` });
  await page.keyboard.press("Escape");
  verif("Echap ferme le menu", await page.locator("#gMat .sel-pop").evaluate((el) => el.classList.contains("hidden")));
  // Les ronds des points fixes ne sont pas caches par la hachure : on clique vraiment dessus
  await page.locator("#draw .barwrap.g .dot[aria-label$='côté joint']").click({ timeout: 3000 });
  verif("Le rond cote joint est cliquable (pas recouvert)", (await page.locator("#draw .barwrap.g .dot[aria-label$='côté joint']").getAttribute("aria-pressed")) === "true");
  const pied = await page.locator("footer").evaluate((el) => { const r = el.getBoundingClientRect(); return { centre: r.left + r.width / 2, page: document.documentElement.clientWidth / 2, align: getComputedStyle(el).textAlign }; });
  verif("Pied de page centre", pied.align === "center" && Math.abs(pied.centre - pied.page) < 2, JSON.stringify(pied));
  await c.close();
});

await step("Menu des applis", async () => {
  const { c, page } = await ouvrir();
  await page.locator("#appsMenu summary").click();
  verif("Le menu liste les applis dont Joint", (await page.locator("#appsList a").count()) === 10);
  await c.close();
});

await browser.close();
writeFileSync(`${OUT}/checkup.txt`, lignes.join("\n") + "\n");
console.log(lignes.join("\n"));
