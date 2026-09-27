# Auftrag (Codex): nachgestellte Mengen erkennen (`Quark 2x`, `Joghurt 2 x`, `Milch x2`, `Käse 200 g`)

## Kontext ohne Vorwissen
Repo `~/code/ha-grocery-tiles-card` (öffentlich, HACS-Karte für Home Assistant, v0.2.1). `dist/food-db.js` exportiert `splitQuantity(summary) -> { name, qty }`, das Mengenangaben vom Artikelnamen trennt; die Karte zeigt `name` groß und `qty` klein. Heute erkannt: führende Mengen (`2 Stück Eier`, `1,5 kg Kartoffeln`, `3 Bananen`, `2x Milch`) und nachgestellte Klammer (`Butter (2)`). NICHT erkannt: nachgestellte Mengen ohne Klammer — in Alberts echter Liste stehen `Zartbitterschokolade 3x`, `Quark 2x`, `Joghurt 2x`. Die sollen als Menge erkannt werden.

Lies zuerst: `dist/food-db.js` (nur `LEADING_QTY`, `TRAILING_QTY`, `splitQuantity`, `normalize`) und `food-db.test.mjs` (Block „splitQuantity").

## Was zu bauen ist
1. `TRAILING_QTY` so erweitern (oder ein zweites Muster), dass am Ende erkannt wird:
   - `Quark 2x`, `Quark 2 x`, `Quark 2×` → `{ name: 'Quark', qty: '2x' }` (Ausgabe normiert auf `2x`)
   - `Milch x2`, `Milch x 2` → `{ name: 'Milch', qty: '2x' }`
   - `Käse 200 g`, `Kartoffeln 1,5 kg`, `Eier 6 Stück`, `Bier 6 Flaschen` → `{ name: 'Käse', qty: '200 g' }` usw. — dieselbe Einheitenliste wie in `LEADING_QTY` verwenden (gemeinsame Konstante `UNITS`, nicht kopieren).
   - `Butter (2)` weiter wie bisher → `qty: '2'`.
2. Nicht kaputt machen: `Bier (eventuell helles ansonsten Marke egal)`, `Tiptoi Mail`, `Cola Zero`, `Omega 3` bleiben ohne Menge (`qty: ''`) — eine nackte Zahl am Ende ohne `x`/Einheit ist KEINE Menge (`Omega 3`, `Nivea 24h`, `Playstation 5`).
   Führende Menge hat Vorrang vor nachgestellter; `2 Stück Eier 3x` → führend gewinnt, Rest bleibt im Namen.
3. Tests in `food-db.test.mjs` ergänzen: alle Beispiele aus 1 und 2 als `assert.deepEqual`. Zusätzlich `normalize('Quark 2x') === normalize('Quark')`.
4. `dist/grocery-tiles-card.js` NICHT ändern. README: in der Feature-Liste den Satz zu Mengen um Beispiele `Quark 2x` / `Käse 200 g` ergänzen (eine Zeile).

## Was fertig heißt
- `node --test '*.test.mjs'` grün (vorher 36 Tests, danach mehr).
- Ein Commit `feat(food-db): recognise trailing quantities (2x, x2, 200 g)`. Kein `git push`, kein Tag.
- Report `.agents/report_codex_trailing_qty.md`: neue Regex(e) zitiert, Tabelle Eingabe → Ergebnis für alle Beispiele, Testausgabe (letzte 5 Zeilen), offene Punkte.

## Verrenn-Schutz
- Read-only außerhalb von `dist/food-db.js`, `food-db.test.mjs`, `README.md`, dem Report.
- Max. 2 Anläufe pro kippendem Test; dann im Report als strittig markieren.
- Nach ~15 Minuten ehrlichen Teilreport. Nichts installieren, kein Build-Tool.
