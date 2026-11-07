# Joint

Dilatation d'une pièce (alu, acier, inox, verre) : de combien elle dilate, quel joint prévoir entre deux pièces, quel trou oblong si elle est vissée (vis au milieu, réglage de pose facultatif). Pièce toujours fixée au milieu, pose à 20 °C, résultats arrondis au mm supérieur.

- Sans compte, sans base de données : tout se calcule dans le navigateur ; les réglages sont gardés sur l'appareil.
- Calculs dans `js/core.js` (testés : `npm test`), affichage dans `js/app.js`.
- Check-up navigateur : `e2e/checkup.mjs` (lancé par le workflow « Captures » sur chaque branche).
- Publication : GitHub Pages, branche `main`, adresse `https://outils-hn.github.io/Joint/`.

Coefficients (µm/m·°C) : alu 23, acier 12, inox 16, verre 9 — valeurs courantes à confirmer avec les règles du bureau.
