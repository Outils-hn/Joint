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
const pasDebordement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const txt = (page, id) => page.locator(id).innerText().then((t) => t.replace(/\s+/g, " ").trim());

await step("Ecran de depart : 3 m d'alu au soleil", async () => {
  const { c, page } = await ouvrir();
  verif("Dilatation +4,1 mm", (await txt(page, "#sDil")) === "+4,1 mm", await txt(page, "#sDil"));
  verif("Joint entre deux pieces : 5 mm (4,14 arrondi), piece fixee au milieu", (await txt(page, "#sJoint")) === "5 mm", await txt(page, "#sJoint"));
  verif("Calcul exact affiche (4,1 mm)", /Calcul exact : 4,14 mm.*2,07 mm chacune.*au milieu/.test(await txt(page, "#sWhy")), await txt(page, "#sWhy"));
  verif("Hypothese affichee : jusqu'a 80 °C, pose a 20 °C", /jusqu.à 80 °C.*-20 °C.*20 °C/.test(await txt(page, "#sHyp")), await txt(page, "#sHyp"));
  verif("Trou oblong : 5 mm + Ø de la vis", (await txt(page, "#sTrou")) === "5 mm + Ø de la vis", await txt(page, "#sTrou"));
  verif("Phrase du trou : course par cote, total, arrondi", /De chaque côté de la vis : 2,07 mm de course\. Trou total : 4,14 mm, arrondi à 5 mm/.test(await txt(page, "#sTrouWhy")), await txt(page, "#sTrouWhy"));
  verif("Trou oblong : 2,07 mm de chaque cote de la vis", (await txt(page, "#sSlot")) === "2,07 mm 2,07 mm", await txt(page, "#sSlot"));
  verif("Plus de choix de fixation : un seul ecran simple", (await page.locator("#sFix").count()) === 0);
  verif("Le joint est visible sans defiler (ordinateur)", await page.locator("#sJoint").evaluate((el) => el.getBoundingClientRect().bottom < window.innerHeight));
  verif("Le champ affiche « 3000 mm »", (await page.locator("#sLong").evaluate((el) => el.value)) === "3000" && (await page.locator("#sLong + .u").evaluate((el) => el.textContent.replace(/\s+/g, " ").trim())) === "3000 mm");
  verif("Aucun reglage detaille : un seul champ de longueur", (await page.locator("input").evaluateAll((els) => els.filter((e) => !e.closest("dialog")).length)) === 2);
  await page.screenshot({ path: `${OUT}/01-depart.png`, fullPage: true });
  await c.close();
});

await step("Calculs : longueur, materiau, situation, reglage de pose", async () => {
  const { c, page } = await ouvrir();
  await page.fill("#sLong", "6000");
  verif("6 m d'alu : +8,3 mm, joint 9 mm, trou 9 mm", (await txt(page, "#sDil")) === "+8,3 mm" && (await txt(page, "#sJoint")) === "9 mm" && /^9 mm/.test(await txt(page, "#sTrou")), `${await txt(page, "#sDil")} / ${await txt(page, "#sJoint")} / ${await txt(page, "#sTrou")}`);
  await page.click("#sAmb [data-k='ombre']");
  verif("Hypothese a l'ombre : jusqu'a 40 °C", /jusqu.à 40 °C/.test(await txt(page, "#sHyp")), await txt(page, "#sHyp"));
  verif("A l'ombre (40 °C) : +2,8 mm, joint 3 mm", (await txt(page, "#sDil")) === "+2,8 mm" && (await txt(page, "#sJoint")) === "3 mm", `${await txt(page, "#sDil")} / ${await txt(page, "#sJoint")}`);
  await page.fill("#sLong", "12000");
  verif("12 m a l'ombre : l'addition tombe juste (2,76 + 2,76 = 5,52)", /Calcul exact : 5,52 mm.*2,76 mm chacune/.test(await txt(page, "#sWhy")), await txt(page, "#sWhy"));
  await page.fill("#sLong", "6000");
  await page.click("#sAmb [data-k='int']");
  verif("Interieur (10 a 25 °C), 6 m d'alu : +0,7 mm, joint 1 mm", /jusqu.à 25 °C/.test(await txt(page, "#sHyp")) && (await txt(page, "#sDil")) === "+0,7 mm" && (await txt(page, "#sJoint")) === "1 mm", `${await txt(page, "#sHyp")} / ${await txt(page, "#sDil")} / ${await txt(page, "#sJoint")}`);
  await page.click("#sAmb [data-k='ombre']");
  await page.click("#sMat .sel-btn");
  verif("Menu matiere : 4 choix", (await page.locator("#sMat .sel-pop button").count()) === 4);
  await page.screenshot({ path: `${OUT}/02-menu.png` });
  await page.keyboard.press("Escape");
  verif("Echap ferme le menu", await page.locator("#sMat .sel-pop").evaluate((el) => el.classList.contains("hidden")));
  await page.click("#sMat .sel-btn"); await page.click("#sMat .sel-pop [data-k='verre']");
  verif("Verre 6 m a l'ombre : +1,1 mm, joint 2 mm", (await txt(page, "#sDil")) === "+1,1 mm" && (await txt(page, "#sJoint")) === "2 mm", `${await txt(page, "#sDil")} / ${await txt(page, "#sJoint")}`);
  await page.click("#sAmb [data-k='soleil']"); await page.click("#sMat .sel-btn"); await page.click("#sMat .sel-pop [data-k='alu']"); await page.fill("#sLong", "3000");
  await page.fill("#sReg", "20");
  verif("Reglage de pose ± 20 mm : trou de 45 mm + Ø de la vis", (await txt(page, "#sTrou")) === "45 mm + Ø de la vis", await txt(page, "#sTrou"));
  verif("Phrase avec reglage : 2,07 + 20 = 22,07 mm, total 44,14 arrondi a 45", /2,07 mm de course \+ 20 mm de réglage = 22,07 mm\. Trou total : 44,14 mm, arrondi à 45 mm/.test(await txt(page, "#sTrouWhy")), await txt(page, "#sTrouWhy"));
  verif("Reglage : 22,07 mm de chaque cote", (await txt(page, "#sSlot")) === "22,07 mm 22,07 mm", await txt(page, "#sSlot"));
  verif("Le joint ne change pas avec le reglage", (await txt(page, "#sJoint")) === "5 mm");
  await page.screenshot({ path: `${OUT}/03-reglage.png`, fullPage: true });
  await page.fill("#sLong", "");
  verif("Champ vide : pas de resultat, copie desactivee", (await txt(page, "#sJoint")) === "—" && (await txt(page, "#sTrou")) === "—" && (await page.locator("#sCopy").isDisabled()));
  await page.fill("#sLong", "1 500,5");
  verif("Virgule et espace acceptes (1 500,5 mm d'alu)", (await txt(page, "#sDil")) === "+2,1 mm", await txt(page, "#sDil"));
  await page.fill("#sLong", "4000");
  await page.reload({ waitUntil: "load" });
  verif("Les reglages sont retrouves apres rechargement", (await page.locator("#sLong").evaluate((el) => el.value)) === "4000" && (await page.locator("#sReg").evaluate((el) => el.value)) === "20");
  await c.close();
});

await step("Telephone et theme sombre", async () => {
  const { c, page } = await ouvrir({ largeur: 390, hauteur: 844 });
  verif("Telephone : pas de defilement lateral", await pasDebordement(page));
  verif("Telephone : le joint est visible sans defiler", await page.locator("#sJoint").evaluate((el) => el.getBoundingClientRect().bottom < window.innerHeight));
  await page.fill("#sReg", "20");
  verif("Telephone avec reglage : pas de defilement lateral", await pasDebordement(page));
  await page.screenshot({ path: `${OUT}/04-telephone.png`, fullPage: true });
  await c.close();
  const sombre = await ouvrir({ sombre: true });
  await sombre.page.screenshot({ path: `${OUT}/05-sombre.png`, fullPage: true });
  verif("Theme sombre applique", (await sombre.page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
  await sombre.c.close();
});

await step("Copie du resume, pied de page, menu des applis", async () => {
  const { c, page } = await ouvrir();
  await c.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await page.click("#sCopy");
  await page.waitForFunction(() => /copi/i.test(document.getElementById("toast").textContent), null, { timeout: 3000 }).catch(() => {});
  verif("Message « Résumé copié »", /copi/i.test(await txt(page, "#toast")), await txt(page, "#toast"));
  const pied = await page.locator("footer").evaluate((el) => { const r = el.getBoundingClientRect(); return { centre: r.left + r.width / 2, page: document.documentElement.clientWidth / 2, align: getComputedStyle(el).textAlign }; });
  verif("Pied de page centre", pied.align === "center" && Math.abs(pied.centre - pied.page) < 2, JSON.stringify(pied));
  verif("Pied de page : version 2.27", /Joint v2.27/.test(await txt(page, "footer")), await txt(page, "footer"));
  await page.click("#aboutBtn"); verif("Clic sur la signature : fenetre « À propos » (nom, version)", await page.locator("#dApropos[open]").count() === 1 && /À propos/.test(await txt(page, "#dApropos")) && /Version /.test(await txt(page, "#dApropos")), await txt(page, "#dApropos")); await page.click("#daFermer"); verif("La fenetre se ferme", await page.locator("#dApropos[open]").count() === 0);
  verif("Bandeau : « Lecture seule » et « Se connecter » comme les autres applis", /Lecture seule/.test(await txt(page, "#etatCompte")) && /Se connecter/.test(await txt(page, "#compteBtn")));
  await page.evaluate(() => localStorage.setItem("sb-dtxgvwaqjmmffiiohika-auth-token", JSON.stringify({ access_token: "t", expires_at: 9999999999, user: { email: "hugo@exemple.ch" } })));
  await page.reload({ waitUntil: "load" });
  const coul = await page.locator("#etatCompte").evaluate((el) => getComputedStyle(el).borderTopColor);
  verif("Bandeau connecté : adresse entourée de la couleur de l'appli + « Se déconnecter »", /hugo@exemple\.ch/.test(await txt(page, "#etatCompte")) && /Se déconnecter/.test(await txt(page, "#compteBtn")) && coul !== "rgb(232, 232, 229)", coul);
  await page.click("#compteBtn");
  verif("Se déconnecter : retour en lecture seule", /Lecture seule/.test(await txt(page, "#etatCompte")) && !(await page.evaluate(() => localStorage.getItem("sb-dtxgvwaqjmmffiiohika-auth-token"))));
  await page.locator("#appsMenu summary").click();
  verif("Le menu liste les applis dont Joint", (await page.locator("#appsList a").count()) === 11);
  verif("Joint s'appelle « Dilatation et joints »", /Dilatation et joints/.test(await txt(page, "#appsList")), await txt(page, "#appsList"));
  await c.close();
});

await browser.close();
writeFileSync(`${OUT}/checkup.txt`, lignes.join("\n") + "\n");
console.log(lignes.join("\n"));
