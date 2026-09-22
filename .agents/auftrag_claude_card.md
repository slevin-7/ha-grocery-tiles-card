# Auftrag (Claude): Task 3, 4 und 5 des Plans — `grocery-tiles-card.js`

## Kontext ohne Vorwissen
Repo: `~/code/ha-grocery-tiles-card` — eine Home-Assistant-Lovelace-Karte, die eine `todo.*`-Entity als Emoji-Kachel-Grid nach Einkaufskategorien zeigt (Bring-Style). Du baust die Karte, den Browser-Harness und die README. **Parallel** baut ein Codex-Agent `food-db.js` + `food-db.test.mjs` — diese beiden Dateien darfst du NICHT anlegen oder ändern.

Lies zuerst vollständig:
1. `docs/superpowers/specs/2026-09-22-grocery-tiles-card-design.md`
2. `docs/superpowers/plans/2026-09-22-grocery-tiles-card.md` — **Task 3, 4, 5**, Schritt für Schritt. Der Plan enthält den Code weitgehend ausformuliert; übernehmen, nicht neu erfinden. Abweichungen nur, wenn etwas nachweislich nicht funktioniert — dann im Report begründen.

## Abhängigkeit
Der Harness (`node test/shot.mjs`) importiert `./food-db.js`. Solange die Datei fehlt oder `node --test food-db.test.mjs` noch nicht grün ist, kannst du Task 3 Step 1–3 schreiben, aber Step 4 (Harness-Run) muss warten. Warte-Schleife: `until [ -f food-db.js ] && node --test food-db.test.mjs >/dev/null 2>&1; do sleep 30; done` (max. 30 Minuten; danach mit einem NICHT committeten lokalen Stub `food-db.js` mit den Exports aus Plan Task 1/2-Interfaces weiterarbeiten, Stub vor jedem Commit per `git checkout -- food-db.js` bzw. `rm` entfernen und das im Report vermerken).

## Prüfmittel
- `node test/shot.mjs ["<js im Harness>"]` — Headless-Chromium (playwright-core aus dem Codex-Runtime, Pfade stehen im Plan). Exit 0 = keine Konsolenfehler. Screenshot `test/harness.png` nach jedem Lauf **ansehen** (Read-Tool auf die PNG), nicht nur den TEXT lesen.
- Alle Prüfskripte aus Plan Task 4 Step 1 und Task 5 Step 1 müssen durchlaufen.

## Was fertig heißt
- Drei Commits wie im Plan (Task 3, 4, 5). Kein `git push`.
- README.md + `docs/screenshot.png` vorhanden.
- Report nach `.agents/report_claude_card.md`: Ergebnis jedes Prüfskripts (Kommando → TEXT-Auszug → exit code), Screenshot-Pfad, Abweichungen vom Plan mit Begründung, bekannte Lücken, UNVERIFIED-Punkte.

## Verrenn-Schutz
- Max. 2 Anläufe pro Prüfskript; dann als FAILED/UNVERIFIED im Report, weiter mit dem nächsten Schritt.
- Kein npm, keine Dependencies, kein Framework, kein Build-Schritt.
- Nach ~40 Minuten ohne Fortschritt: ehrlichen Teilreport schreiben.
- Nichts außerhalb dieses Repos schreiben; HA-Instanz (192.168.0.84) nicht anfassen — Installation macht der Orchestrator.
