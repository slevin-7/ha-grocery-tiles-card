# Grocery Tiles Card — Design

Datum: 2026-09-22 · Status: freigegeben (Albert, Chat) · Repo: `~/code/ha-grocery-tiles-card`

## 1. Ziel

Eine Home-Assistant-Lovelace-Karte `custom:grocery-tiles-card`, die eine beliebige
`todo.*`-Entity als Kachel-Grid im Stil von Bring! darstellt: Emoji-Icon pro Artikel,
Gruppierung nach Einkaufskategorie, Abhaken per Tap, erledigte Artikel als „Zuletzt"-
Katalog zum Zurückholen. Erste Zielinstanz: `todo.mealie_einkaufsliste` im Küche-
Dashboard (`kueche-tabs`, View `einkauf`) auf HA 2026.9.

Nicht-Ziele (YAGNI): Produktfotos, Mengen-Plus/Minus, mehrere Listen in einer Karte,
Barcode-Scan, Export, eigene Backend-Integration, Drag & Drop.

## 2. Randbedingungen

- HA-To-do-Items kennen nur `uid`, `summary`, `status`, `due`, `description`. Es gibt
  kein Kategorie- oder Bildfeld. Kategorie und Emoji werden deshalb **clientseitig aus
  dem Namen abgeleitet** und nie persistiert.
- Backend bleibt Mealie. HAs Mealie-Integration wandelt ein Item in eine reine Notiz um,
  sobald sich `summary` ändert (food_id=None, quantity=0). **Die Karte schreibt niemals
  `summary` implizit um**; nur der Status wird geändert. Umbenennen ist eine explizite
  Nutzeraktion mit sichtbarer Folge.
- Kein Build-Schritt, kein Framework. Plain Web Component (ES2020), HACS-Plugin mit
  `content_in_root: true`. HACS liefert den Repo-Ordner unter `/hacsfiles/<repo>/` aus,
  daher darf die Karte `./food-db.js` relativ importieren.
- Optik: flach, 8 px Radius, HA-Theme-Variablen (`--card-background-color`,
  `--primary-text-color`, `--secondary-text-color`, `--divider-color`,
  `--primary-color`). Dark Mode funktioniert dadurch automatisch.

## 3. Dateien

```
ha-grocery-tiles-card/
├── grocery-tiles-card.js      # Karte (Web Component, Rendering, HA-Anbindung)
├── food-db.js                 # Keyword→Kategorie, Keyword→Emoji, Kategorie-Metadaten
├── food-db.test.mjs           # node:test, 30+ Beispiele
├── hacs.json                  # {"name":"Grocery Tiles Card","content_in_root":true,"filename":"grocery-tiles-card.js","render_readme":true}
├── README.md                  # Install (HACS Custom Repository), Config, Screenshot
├── LICENSE                    # MIT
└── docs/superpowers/specs/…   # dieses Dokument
```

## 4. food-db.js

Port aus Fampla (Alberts eigener Code, keine Lizenzfrage):

- Quelle Kategorien: `~/code/fampla/mobile_app/lib/services/food_database.dart`
  (`FoodGroup`-Gruppen `_dairy, _eggs, _fruits, _vegetables, _meat, _fish,
  _breadBakery, _pastaGrains, _beverages, _frozen`, Keywords DE/EN/IT,
  `wordBoundaryMatching`-Flag, Prüfreihenfolge `_shoppingOrder`).
- Quelle Emoji: `~/code/fampla/mobile_app/lib/helpers/food_emoji_helper.dart`
  (`_emojiMap`, ~200 Einträge; Matching: längster passender Key gewinnt, Fallback 🛒).

Export:

```js
export const CATEGORIES = [ // Anzeige-Reihenfolge = Bring-Laufweg
  { id: 'fruits_vegetables', label: 'Obst & Gemüse',        emoji: '🥕', color: '#4caf50' },
  { id: 'dairy_eggs',        label: 'Milchprodukte & Eier', emoji: '🥛', color: '#42a5f5' },
  { id: 'meat_fish',         label: 'Fleisch & Fisch',      emoji: '🥩', color: '#ef5350' },
  { id: 'bread_bakery',      label: 'Brot & Backwaren',     emoji: '🥖', color: '#d4a054' },
  { id: 'pasta_grains',      label: 'Nudeln & Getreide',    emoji: '🍝', color: '#ffb74d' },
  { id: 'frozen',            label: 'Tiefkühl',             emoji: '🧊', color: '#4dd0e1' },
  { id: 'beverages',         label: 'Getränke',             emoji: '🍹', color: '#ab47bc' },
  { id: 'other',             label: 'Sonstiges',            emoji: '🛒', color: '#9e9e9e' },
];
export function categorize(name, overrides = []) -> categoryId
export function emojiFor(name, overrides = [])   -> string
export function splitQuantity(summary)            -> { name, qty }   // "2 Stück Eier" → {name:"Eier", qty:"2 Stück"}
export function normalize(name)                   -> string          // lowercase, trim, ohne Menge — für Duplikat-Erkennung & Vorschläge
export function suggest(prefix, recentNames, limit=6) -> string[]   // erst recent, dann Emoji-Map-Keys
```

Fampla-Gruppen `dairy`+`eggs` → `dairy_eggs`; `fruits`+`vegetables` → `fruits_vegetables`;
`meat`+`fish` → `meat_fish`. Restliche Zuordnung 1:1.

`splitQuantity`: erkennt führende Menge nach Mealie-Muster `^\s*(\d+([.,]\d+)?\s*(x|×)?\s*([A-Za-zäöüÄÖÜß.]+)?)\s+(.+)$`
sowie nachgestellte Klammer-Menge `(\d+)$` (Nisbo-Altbestand). Ohne Treffer: `{name: summary, qty: ''}`.

Overrides (aus Kartenkonfig): `[{ match: 'tiptoi', category: 'other', emoji: '🐘' }]`,
`match` = Substring, case-insensitive, gewinnt vor der Datenbank.

## 5. grocery-tiles-card.js

### Konfiguration

| Key | Typ | Default | Bedeutung |
|---|---|---|---|
| `entity` | string | Pflicht | `todo.*` |
| `title` | string | `''` | Kopfzeile, leer = keine |
| `columns` | number | auto | feste Spaltenzahl; auto = `repeat(auto-fill, minmax(96px, 1fr))` |
| `show_recent` | bool | `true` | Bereich „Zuletzt" |
| `recent_limit` | number | `30` | sichtbare graue Kacheln, Rest hinter „mehr anzeigen" |
| `show_clear_completed` | bool | `true` | Button „Erledigte löschen" |
| `overrides` | list | `[]` | s. o. |

`getStubConfig()` liefert `{ entity: <erste todo.*-Entity> }`. Ein einfacher visueller
Editor (`getConfigElement`) mit `ha-form`-Schema für `entity`, `title`, `columns`,
`show_recent`, `recent_limit`, `show_clear_completed`. `overrides` nur per YAML.

### Datenfluss

1. `set hass(hass)`: beim ersten Mal und wenn sich `hass.connection` ändert →
   `subscribe()`: `hass.connection.subscribeMessage(cb, { type: 'todo/item/subscribe', entity_id })`.
   Callback liefert `{ items: [{uid, summary, status, …}] }` → `this._items`, render.
2. `disconnectedCallback` → unsubscribe. `connectedCallback` → erneut subscribe, falls
   `hass` vorhanden (Reconnect/Tab-Wechsel).
3. Schreiben nur über Services:
   - hinzufügen: `todo.add_item` `{ item }`
   - abhaken / zurückholen: `todo.update_item` `{ item: uid, status }`
   - umbenennen: `todo.update_item` `{ item: uid, rename }`
   - löschen: `todo.remove_item` `{ item: [uid] }`
   - Erledigte löschen: `todo.remove_completed_items`
   Ziel immer `{ entity_id }`.
4. Optimistisch: vor dem Service-Call wird `_items` lokal angepasst und gerendert; bei
   Fehler zurückgerollt und Toast (`hass-notification`-Event) mit `err.message`.

### Ableitungen pro Render

```
open   = items.filter(status === 'needs_action')
done   = items.filter(status === 'completed')        // Reihenfolge der Entity beibehalten, dann reverse → neueste zuerst
groups = CATEGORIES.map(c => ({ c, tiles: open.filter(i => categorize(splitQuantity(i.summary).name, overrides) === c.id) }))
        .filter(g => g.tiles.length)
```

Innerhalb einer Gruppe alphabetisch nach `name` (de-Locale).

### Layout

```
┌──────────────────────────────────────────┐
│ [🛒 Artikel hinzufügen…            ] [+] │  Eingabe; Enter/+ fügt hinzu
│ (🥛 Milch) (🥚 Eier) (🍞 Brot)            │  Vorschlags-Chips, max 6, nur beim Tippen
│                                          │
│ 🥕 Obst & Gemüse                       3 │  Gruppenkopf: Emoji, Label, Anzahl, Farbstrich links
│ ┌──────┐ ┌──────┐ ┌──────┐               │
│ │  🍌  │ │  🥕  │ │  🍅  │               │  Kachel: Emoji 32px, Name 13px, Menge 11px grau
│ │Banane│ │Karott│ │Tomate│               │  Tap → completed
│ │      │ │1 kg  │ │      │               │
│ └──────┘ └──────┘ └──────┘               │
│ 🥛 Milchprodukte & Eier                2 │
│ …                                        │
│ ───────────────────────────────────────  │
│ Zuletzt                    [Erledigte löschen] │
│ ┌──────┐ ┌──────┐ …  (grau, 60 % Opacity)│  Tap → needs_action
│ mehr anzeigen (72)                        │
└──────────────────────────────────────────┘
```

- Kachel: `aspect-ratio: 1`, Grid-Gap 8 px, Hintergrund `--secondary-background-color`,
  Hover/Active leichte Abdunklung, Tap-Feedback 120 ms Scale 0.96, Fade-out 150 ms beim
  Wechsel zwischen Bereichen.
- Long-Press (500 ms) auf Kachel → `mwc-menu`-freies Mini-Popup (eigenes `<div>`):
  „Umbenennen" (prompt-frei: Inline-Textfeld in der Kachel), „Löschen" (direkt, mit Undo-
  Toast 5 s, der `todo.add_item` mit altem Namen ausführt).
- Duplikat beim Hinzufügen: `normalize(neu)` gleicht einem `open`-Item → nur Toast „schon
  auf der Liste"; gleicht einem `done`-Item → dieses wird reaktiviert statt neu angelegt.
- Leere Liste: Hinweistext „Liste ist leer" statt leerem Grid.
- Entity fehlt / `unavailable`: `hui-warning`-artiger Hinweis mit Entity-ID.

### Registrierung

```js
customElements.define('grocery-tiles-card', GroceryTilesCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'grocery-tiles-card', name: 'Grocery Tiles Card',
  description: 'Einkaufsliste als Emoji-Kacheln nach Kategorien (Bring-Style) für jede todo-Entity.', preview: true });
```

`getCardSize()` = 3 + Anzahl Gruppen. `getGridOptions()` = `{ columns: 'full' }`.

## 6. Fehlerbehandlung

| Fall | Verhalten |
|---|---|
| `hass.states[entity]` fehlt | Hinweiskarte, keine Subscription |
| state `unavailable`/`unknown` | Hinweis „nicht erreichbar", letzte bekannte Items bleiben sichtbar, Aktionen deaktiviert |
| Subscription bricht ab | beim nächsten `set hass` mit neuer Connection erneut abonnieren |
| Service-Fehler | Rollback + Toast |
| Item-Name leer / nur Whitespace | Hinzufügen ignoriert |

## 7. Tests

- `food-db.test.mjs` (`node --test`): mindestens 30 Beispiele, u. a. `Hafermilch`→dairy_eggs/🥛,
  `2 Stück Eier`→qty `2 Stück`, name `Eier`, dairy_eggs; `Bier alkoholfrei`→beverages;
  `Bier (eventuell helles ansonsten Marke egal)`→beverages; `Tiptoi Mail`→other/🛒;
  `Burgerbrötchen`→bread_bakery; `Alufolie`→other; Override greift vor DB; `normalize`
  gleicht `Milch` und `2 L Milch`; `suggest('ha', ['Hafermilch'])` liefert Hafermilch zuerst.
- Karte: kein Unit-Test (DOM/HA-Mocking lohnt nicht). Abnahme im echten HA:
  1. HACS Custom Repository hinzufügen, installieren, Resource prüfen.
  2. Karte im View `einkauf` einbauen (WebSocket `lovelace/config/save`, Backup vorher).
  3. Headless-Screenshot (Rezept in `infra_homeassistant.md`), Konsole fehlerfrei.
  4. Rundlauf: hinzufügen → abhaken → aus „Zuletzt" zurückholen → zweites Gerät zeigt
     Änderung → Mealie-App zeigt unveränderte Namen.

## 8. Umsetzungsreihenfolge

1. Repo-Grundgerüst (hacs.json, LICENSE, README-Skelett).
2. `food-db.js` + Tests (Port aus Fampla).
3. Karte: Subscription + Read-only-Rendering (Gruppen, Kacheln, Zuletzt).
4. Karte: Aktionen (add, toggle, rename, delete, clear) mit Optimismus/Rollback.
5. Vorschlags-Chips, Duplikat-Logik, Editor, Fehlerzustände.
6. Install + Dashboard-Tausch + Abnahme.
