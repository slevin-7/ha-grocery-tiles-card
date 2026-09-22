# Auftrag (Codex): Task 1 + Task 2 des Plans — `food-db.js` mit Tests

## Kontext ohne Vorwissen
Repo: `~/code/ha-grocery-tiles-card` — eine Home-Assistant-Lovelace-Karte (Bring-Style Einkaufsliste). Du baust NUR die reine Logik-Datei `food-db.js` und ihre Tests `food-db.test.mjs`. Ein anderer Agent baut parallel `grocery-tiles-card.js` und `test/` — diese Dateien nicht anfassen.

Lies zuerst vollständig:
1. `docs/superpowers/specs/2026-09-22-grocery-tiles-card-design.md` (Abschnitte 2 und 4)
2. `docs/superpowers/plans/2026-09-22-grocery-tiles-card.md` — **Task 1 und Task 2**, Schritt für Schritt (TDD: Test zuerst, Fehlschlag sehen, implementieren, Erfolg sehen, committen).

Port-Quellen (nur lesen, nichts ändern):
- `~/code/fampla/mobile_app/lib/services/food_database.dart` (Gruppen `_dairy … _frozen`, Zeilen ~37–300)
- `~/code/fampla/mobile_app/lib/helpers/food_emoji_helper.dart` (`_emojiMap`, Zeile 8 ff.)
Keywords und Emoji-Map **vollständig** übernehmen, nicht kürzen, keine „…"-Platzhalter im Code.

## Was fertig heißt
- `node --test food-db.test.mjs` → alle Tests PASS (≥ 30 Tests).
- Zwei Commits wie im Plan (Task 1, Task 2). Kein `git push`.
- Report nach `.agents/report_codex_food_db.md`: Anzahl Keywords je Gruppe, Anzahl Emoji-Einträge, Liste der ergänzten Keywords (mit `// ergänzt` markiert), Testausgabe (letzte 5 Zeilen), offene Punkte/UNVERIFIED.

## Verrenn-Schutz
- Max. 2 Anläufe pro kippendem Test; dann Test-Erwartung im Report als strittig markieren, nicht die Datenbank verbiegen.
- Keine npm-Installation, keine Dependencies, kein Build-Tool. Node ≥ 20 reicht.
- Nach ~20 Minuten ohne grünen Stand: ehrlichen Teilreport schreiben.
- Nichts außerhalb dieses Repos schreiben.
