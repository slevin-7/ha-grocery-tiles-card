# Report (Claude): i18n DE/EN/IT für grocery-tiles-card

Auftrag: `.agents/auftrag_claude_i18n.md` plus Zusatz des Orchestrators (Quellen nach `dist/`, HACS ohne `content_in_root`).
Datum: 2026-09-27. Kein Push, kein Tag, HA-Instanz nicht angefasst.

## Commits

| SHA | Inhalt |
|---|---|
| `4793d3e` | feat(card): i18n de/en/it, `language`-Option, Editor-Select, Tests, Harness, README; `grocery-tiles-card.js`/`food-db.js`/`i18n.js` per `git mv` nach `dist/`, `hacs.json` ohne `content_in_root` |
| (Folge-Commit) | chore: dieser Report |

## Was gebaut wurde

- **`dist/i18n.js`**: `LANGS = { en, de, it }`, `t(lang, key, vars)` mit Platzhaltern `{n}`/`{name}`, Fallback Sprache → `en` → Key. `normLang('de-DE') → 'de'`, unbekannt → `'en'`. `pickLang(config, hass)`: `config.language` sonst `hass.locale.language` sonst `hass.language` sonst `en`.
- **`dist/grocery-tiles-card.js`**: `_lang()` und `_t()`; alle harten deutschen Strings ersetzt (Platzhalter, aria „Hinzufügen", aria „(erledigt)", leere Liste, Entity fehlt/nicht erreichbar, Gruppenüberschriften via `cat_<id>`, „Zuletzt", „Erledigte löschen", „mehr anzeigen (n)", Menü Umbenennen/Löschen, aria „Neuer Name", Toasts „schon auf der Liste"/„gelöscht"/Fehler, `confirm()`-Text). `DEFAULTS.language = ''`. `set hass`: bei geänderter `pickLang` wird `_shell = null` gesetzt und neu gerendert. Editor-Labels über `t(pickLang(null, hass), 'cfg_' + name)`; neues Select `language` (`''`=auto, `de`, `en`, `it`). `window.customCards`-Beschreibung auf EN. Sortierung `localeCompare` nutzt jetzt `_lang()` statt fest `'de'`.
- **`food-db.js`**: unverändert (`CATEGORIES[].label` bleibt, wird von der Karte nicht mehr gelesen).
- **`i18n.test.mjs`**: Key-Parität aller Sprachen mit `en` und keine leeren Werte; `t('de','show_more',{n:3})`; Fallback `fr → en`, unbekannter Key → Key; Kürzung `de-DE`/`it-IT`; `pickLang`-Prioritäten.
- **`test/harness.html`**: `window.hass.language = 'en'`, Import `../dist/grocery-tiles-card.js`.
- **`README.md`**: EN-Intro-Satz ersetzt, `language` in der Konfigtabelle, Abschnitt „Sprache / Language", Entwicklungshinweis auf `dist/` und `node --test '*.test.mjs'`.
- **`hacs.json`**: `content_in_root` entfernt, `filename` bleibt `grocery-tiles-card.js`.
- **`.gitignore`**: `test/harness_*.png`.

## Strings (Keys)

`add_placeholder, add, empty, recent, clear_completed, show_more, rename, delete, new_name, already_on_list, deleted, error, confirm_clear, entity_missing, entity_unavailable, done, cat_fruits_vegetables, cat_dairy_eggs, cat_meat_fish, cat_bread_bakery, cat_pasta_grains, cat_frozen, cat_beverages, cat_other, cfg_entity, cfg_title, cfg_columns, cfg_show_recent, cfg_recent_limit, cfg_show_clear_completed, cfg_language, card_description` — in allen drei Sprachen vollständig (per Test abgesichert).

## Prüfungen (VERIFIED)

Umgebung: `PLAYWRIGHT_CORE=~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs` (ohne die Variable findet `test/shot.mjs` kein `playwright-core`, Exit 1 durch `ERR_MODULE_NOT_FOUND`).

`node --test '*.test.mjs'` → tests 36, pass 36, fail 0. Hinweis: nacktes `node --test` greift zusätzlich `test/shot.mjs` als Testdatei und meldet den fehlenden Modulpfad als Fehlschlag; der Auftrag meint „alle `*.test.mjs`", daher das Glob.

### EN (Default aus `hass.language`)
```
node test/shot.mjs
TEXT: Einkaufsliste + 🥕Fruit & Vegetables2 🍌Bananen 🥕Karotten1 kg 🥛Dairy & Eggs2 🥚Eier2 Stück 🥛Hafermilch 🍹Drinks1 🍺Bier alkoholfrei 🛒Other1 🛒AlufolieRecently Clear completed 🐟Lachs 🥖Brötchen 🧈Butter
ERRORS: []   → Exit 0
```
Screenshot `test/harness_en.png` (angesehen: Placeholder „Add item…", Gruppen „Fruit & Vegetables", „Dairy & Eggs", „Drinks", „Other", Fußzeile „Recently" / „Clear completed").

### DE (Override `language:'de'`)
```
node test/shot.mjs "card.setConfig({entity:'todo.mealie_einkaufsliste', title:'Einkaufsliste', language:'de'}); card.hass=window.hass;"
TEXT: Einkaufsliste + 🥕Obst & Gemüse2 🍌Bananen 🥕Karotten1 kg 🥛Milchprodukte & Eier2 🥚Eier2 Stück 🥛Hafermilch 🍹Getränke1 🍺Bier alkoholfrei 🛒Sonstiges1 🛒AlufolieZuletzt Erledigte löschen 🐟Lachs 🥖Brötchen 🧈Butter
ERRORS: []   → Exit 0
```
Screenshot `test/harness_de.png` (angesehen: „Artikel hinzufügen…", „Obst & Gemüse", „Zuletzt", „Erledigte löschen").

### Sprachwechsel zur Laufzeit (nur `hass` ändert sich)
```
node test/shot.mjs "console.log('PH-EN', card.shadowRoot.querySelector('input.add').placeholder); card.hass={...window.hass, language:'it'}; console.log('PH-IT', card.shadowRoot.querySelector('input.add').placeholder);"
TEXT: … 🥕Frutta e verdura2 … 🥛Latticini e uova2 … 🍹Bevande1 … 🛒Altro1 … Di recente Elimina completati …
LOG: PH-EN Add item… | PH-IT Aggiungi articolo…
ERRORS: []   → Exit 0
```
Platzhalter im Eingabefeld wechselt mit (Hülle wird neu gebaut).

### Plan-Prüfskripte Task 4 / Task 5 (`docs/superpowers/plans/2026-09-22-grocery-tiles-card.md`)
Alle mit vorangestelltem `language:'de'`-Override ausgeführt (Erwartungen des Plans sind deutsch; Prefix `DE = card.setConfig({entity, title, language:'de'}); card.hass=window.hass; await …100ms`). Exit-Codes gemessen: alle 0.

| Check | TEXT-Auszug | Erwartung erfüllt |
|---|---|---|
| T4 abhaken Bananen (uid 3) | `… Zuletzt Erledigte löschen 🐟Lachs 🥖Brötchen 🧈Butter 🍌Bananen`; LOG `update_item {"item":"3","status":"completed"}` | ja |
| T4 zurückholen Butter (uid 7) | `🥛Milchprodukte & Eier3 🧈Butter 🥚Eier …`; LOG `update_item {"item":"7","status":"needs_action"}` | ja |
| T4 add Tomaten | `🥕Obst & Gemüse3 🍌Bananen 🥕Karotten1 kg 🍅Tomaten`; LOG `add_item {"item":"Tomaten"}` | ja |
| T4 rollback (`failNext`) | Hafermilch bleibt unter „Milchprodukte & Eier", TEXT endet mit `Simulierter Fehler` | ja |
| T4 clear (`confirm=()=>true`) | TEXT ohne „Zuletzt"; LOG `remove_completed_items` | ja |
| T5 chips „ha" | `🥛 Hafermilch🌾 Haferflocken🍄 Champignon🍄 Champignons🧴 Shampoo` (5 Chips ≤ 6, Hafermilch zuerst) | ja |
| T5 Duplikat offen „Hafermilch" | `… „Hafermilch" ist schon auf der Liste`, 6 offene Kacheln unverändert, kein callService | ja |
| T5 Duplikat erledigt „butter" | Butter unter „Milchprodukte & Eier", nicht unter Zuletzt; LOG `update_item` (kein add_item) | ja |
| T5 Long-Press (uid 6) | TEXT endet mit `UmbenennenLöschen` | ja |

## Abweichungen vom Auftrag

1. **Zusatz Orchestrator umgesetzt:** `grocery-tiles-card.js`, `food-db.js`, `i18n.js` liegen jetzt in `dist/` (git mv, Historie erhalten). `hacs.json` ohne `content_in_root`. Imports relativ (`./food-db.js`, `./i18n.js`). Tests importieren `./dist/…`, Harness `../dist/grocery-tiles-card.js`. README-Ressourcenpfad `/hacsfiles/ha-grocery-tiles-card/grocery-tiles-card.js` unverändert.
2. **Zusätzlicher Key `done`** („erledigt"/„done"/„fatto") für das aria-Label erledigter Kacheln (`„Butter (erledigt)"`). War im Auftrag nicht gelistet, aber hart deutsch im Code; `list_empty_hint` nicht angelegt (nicht gebraucht).
3. **Plan-Prüfskripte** laufen mit erzwungenem `language:'de'` (Erwartungen unverändert deutsch), nicht mit EN-Erwartungen.
4. **`card_description`** ist in allen drei Sprachen hinterlegt (Key-Paritäts-Test), verwendet wird nur `t('en', …)`.
5. **Sortierung** der Kacheln innerhalb einer Gruppe nutzt jetzt die aktive Sprache statt fest `'de'` (`localeCompare`). Kleine Nebenänderung, im Harness ohne sichtbare Auswirkung.
6. **Fehlermeldung in `setConfig`** (`"entity" (todo.*) fehlt`) bleibt deutsch: sie fliegt vor jeder Sprachermittlung (kein `hass`) und ist Entwickler-Text im HA-Fehler-Overlay.
7. **`node --test`** ohne Glob würde `test/shot.mjs` mitlaufen lassen (Node-Default-Muster `test/**`). Nicht geändert, README nennt das Glob.

## UNVERIFIED

- Editor: `ha-form`-Select für `language` und die übersetzten `computeLabel`-Texte sind nur in echtem HA prüfbar (kein `ha-form` im Harness). Selector-Syntax `{ select: { mode: 'dropdown', options: [{value,label}] } }` entspricht der HA-Doku, nicht live getestet.
- `hass.locale.language` in echtem HA (Harness liefert nur `hass.language`); die Prioritätskette ist per Unit-Test abgedeckt, nicht gegen HA.
- HACS-Auslieferung aus `dist/` (Download aller drei Dateien) nur nach Release über HACS prüfbar.
- Italienische Übersetzungen sinngemäß, nicht von Muttersprachler geprüft.
