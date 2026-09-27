# Auftrag (Claude): Karte mehrsprachig machen (DE / EN / IT)

## Kontext ohne Vorwissen
Repo `~/code/ha-grocery-tiles-card` (öffentlich auf GitHub `slevin-7/ha-grocery-tiles-card`, Release v0.1.0). Eine Home-Assistant-Lovelace-Karte `custom:grocery-tiles-card` (Datei `grocery-tiles-card.js`, plain Web Component ohne Build) zeigt eine `todo.*`-Entity als Emoji-Kachel-Grid nach Kategorien. Logik/Daten in `food-db.js` (Keyword-DB bereits DE/EN/IT). Alle UI-Texte sind derzeit hart deutsch. Ziel: Sprache automatisch aus HA übernehmen, mit Konfig-Override.

Lies zuerst: `README.md`, `grocery-tiles-card.js` komplett, `food-db.js` (nur `CATEGORIES` und Exporte), `test/harness.html`, `test/shot.mjs`.

## Was zu bauen ist
1. **Neue Datei `i18n.js`** mit `export const LANGS = { de: {...}, en: {...}, it: {...} }` und `export function t(lang, key, vars = {})` (Platzhalter `{n}`, `{name}`; Fallback-Kette: gewünschte Sprache → `en` → der Key selbst). Sprachcodes zweistellig (aus `de-DE` wird `de`).
   Keys (alle drei Sprachen vollständig, keine Lücken):
   - `add_placeholder` („Artikel hinzufügen…"), `add` (aria „Hinzufügen"), `empty` („Liste ist leer."), `recent` („Zuletzt"), `clear_completed` („Erledigte löschen"), `show_more` („mehr anzeigen ({n})"), `rename` („Umbenennen"), `delete` („Löschen"), `new_name` (aria „Neuer Name"), `already_on_list` („„{name}" ist schon auf der Liste"), `deleted` („„{name}" gelöscht"), `error` („Fehler"), `confirm_clear` („{n} erledigte Einträge endgültig löschen?"), `entity_missing` („Entity nicht gefunden: {name}"), `entity_unavailable` („{name} ist nicht erreichbar."), `list_empty_hint` (falls du einen brauchst, sonst weglassen)
   - Kategorien: `cat_fruits_vegetables`, `cat_dairy_eggs`, `cat_meat_fish`, `cat_bread_bakery`, `cat_pasta_grains`, `cat_frozen`, `cat_beverages`, `cat_other` (DE = die heutigen `label`-Werte aus `CATEGORIES`; EN z. B. „Fruit & Vegetables", „Dairy & Eggs", „Meat & Fish", „Bread & Bakery", „Pasta & Grains", „Frozen", „Drinks", „Other"; IT sinngemäß)
   - Editor-Labels: `cfg_entity`, `cfg_title`, `cfg_columns`, `cfg_show_recent`, `cfg_recent_limit`, `cfg_show_clear_completed`, `cfg_language`
   - Karten-Picker: `card_description` (die heutige deutsche Beschreibung in `window.customCards`; hier reicht EN als einzige Sprache, weil HA den Picker-Text nicht pro Nutzer wechselt → Beschreibung auf Englisch setzen)
2. **Karte:** Methode `_lang()` = `this._config.language` (falls gesetzt) sonst `this._hass?.locale?.language || this._hass?.language || 'en'`, auf 2 Buchstaben gekürzt. Alle hart kodierten deutschen Strings durch `t(this._lang(), 'key', …)` ersetzen — auch `confirm()`, Toasts, aria-Labels, Gruppenüberschriften (statt `g.c.label` → `t(lang, 'cat_' + g.c.id)`). `CATEGORIES[].label` in `food-db.js` darf bleiben (Rückwärtskompatibilität), wird aber von der Karte nicht mehr benutzt.
   Neue Konfig-Option `language` (string, optional, `de`/`en`/`it`), in `DEFAULTS` mit `''`, im Editor als Select mit Optionen `auto`/`de`/`en`/`it` (leer = auto). Editor-Labels ebenfalls über `t()` mit der Sprache aus `hass`.
   Sprachwechsel zur Laufzeit: In `set hass` zusätzlich neu rendern (Hülle neu bauen, `this._shell = null`), wenn sich `_lang()` geändert hat — sonst bleibt der Platzhalter im Eingabefeld alt.
3. **Tests:** `i18n.test.mjs` (node:test): (a) jede Sprache hat exakt dieselben Keys wie `en`; (b) `t('de','show_more',{n:3})` = „mehr anzeigen (3)"; (c) `t('fr','recent')` fällt auf EN zurück; (d) `t('de-DE', …)`-Kürzung funktioniert (falls du die Kürzung in `t` machst — sonst in `_lang`, dann dort testen, ohne DOM: `_lang` als reine Hilfsfunktion `pickLang(config, hass)` exportieren und testen).
4. **Harness:** `test/harness.html` bekommt `language: 'en'` in `window.hass` (HA liefert `hass.language`), und ein Prüfskript im Report muss zeigen: TEXT enthält „Recently" und „Fruit & Vegetables"; ein zweites mit `card.setConfig({entity, language:'de'})` zeigt „Zuletzt". Alle bisherigen Prüfskripte aus `docs/superpowers/plans/2026-09-22-grocery-tiles-card.md` (Task 4 Step 1, Task 5 Step 1) weiterhin grün — dabei die erwarteten deutschen Strings über `language:'de'` erzwingen oder die Erwartungen auf EN anpassen (im Report nennen).
5. **README:** Abschnitt „Sprache / Language": automatisch aus HA-Profil, Override `language: de|en|it`, Hinweis dass Keyword-DB alle drei Sprachen abdeckt. Englischer Intro-Absatz: den Satz „UI strings are German for now, contributions welcome." ersetzen durch „UI in German, English and Italian (follows the HA user language, override with `language`)."
6. **Versionsbump:** `hacs.json` unverändert (HACS nimmt Releases). Kein Release/Tag anlegen, kein `git push` — macht der Orchestrator.

## Was fertig heißt
- `node --test` (alle `*.test.mjs`) grün; `node test/shot.mjs` Exit 0 in EN und DE.
- Ein oder zwei Commits (`feat(card): i18n de/en/it …`).
- Report `.agents/report_claude_i18n.md`: Prüfskripte mit TEXT-Auszug und Exit-Code, Screenshot-Pfade (EN und DE, jeweils mit Read-Tool angesehen), Liste der Strings, Abweichungen, UNVERIFIED (z. B. Editor-Select nur in echtem HA prüfbar).

## Verrenn-Schutz
- Keine Dependencies, kein Build, kein Framework. Keine Änderung an der Keyword-/Emoji-DB.
- Max. 2 Anläufe pro Prüfskript, dann FAILED/UNVERIFIED im Report.
- Nach ~40 Minuten ohne Fortschritt ehrlichen Teilreport.
- HA-Instanz (192.168.0.84) nicht anfassen; nichts außerhalb des Repos schreiben; kein `git push`.
