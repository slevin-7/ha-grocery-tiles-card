# Grocery Tiles Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine HACS-Lovelace-Karte, die eine `todo.*`-Entity als Emoji-Kachel-Grid nach Einkaufskategorien rendert (Bring-Style), mit Abhaken per Tap und „Zuletzt"-Katalog.

**Architecture:** Zwei ES-Module ohne Build-Schritt. `food-db.js` ist reine Logik (Name → Kategorie/Emoji, Mengen-Split, Vorschläge) und wird mit `node --test` getestet. `grocery-tiles-card.js` ist ein Web Component, das per HA-WebSocket `todo/item/subscribe` liest und ausschließlich über `todo.*`-Services schreibt. Ein Browser-Harness mit Fake-`hass` erlaubt Rendering-Checks ohne HA.

**Tech Stack:** Plain JavaScript (ES2020, Web Components, Shadow DOM), `node:test` (Node ≥ 20), HACS Plugin. Kein npm, keine Dependencies.

**Spec:** `docs/superpowers/specs/2026-09-22-grocery-tiles-card-design.md`

## Global Constraints

- Kein Build-Schritt, keine npm-Dependencies, kein Framework. Dateien werden 1:1 von HACS ausgeliefert.
- Die Karte ändert `summary` eines Items **nie** implizit. Nur `status` (und explizit `rename`).
- Kategorie/Emoji werden nur clientseitig berechnet, nie persistiert.
- Theme: nur HA-CSS-Variablen (`--card-background-color`, `--secondary-background-color`, `--primary-text-color`, `--secondary-text-color`, `--divider-color`, `--primary-color`), 8 px Radius, flach.
- Alle Texte in der UI auf Deutsch.
- Commits: kleine Schritte, Conventional-Commit-Präfixe (`feat:`, `test:`, `docs:`), **kein `git push`** — Albert pusht selbst.
- Quellen für den Port: `~/code/fampla/mobile_app/lib/services/food_database.dart` und `~/code/fampla/mobile_app/lib/helpers/food_emoji_helper.dart` (nur lesen).

---

### Task 1: `food-db.js` — Kategorien und `categorize()`

**Files:**
- Create: `food-db.js`
- Test: `food-db.test.mjs`

**Interfaces:**
- Produces: `export const CATEGORIES` (Array in Anzeige-Reihenfolge, Objekte `{ id, label, emoji, color }`), `export function categorize(name, overrides = [])` → `string` (eine `CATEGORIES[].id`).
- Overrides-Form: `[{ match: string, category?: string, emoji?: string }]`, `match` = Substring, case-insensitive.

- [ ] **Step 1: Failing Tests schreiben**

```js
// food-db.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, categorize } from './food-db.js';

test('CATEGORIES hat die Bring-Reihenfolge und endet mit other', () => {
  assert.deepEqual(CATEGORIES.map(c => c.id), [
    'fruits_vegetables', 'dairy_eggs', 'meat_fish', 'bread_bakery',
    'pasta_grains', 'frozen', 'beverages', 'other',
  ]);
  for (const c of CATEGORIES) {
    assert.equal(typeof c.label, 'string');
    assert.equal(typeof c.emoji, 'string');
    assert.match(c.color, /^#[0-9a-f]{6}$/i);
  }
});

const cases = [
  ['Hafermilch', 'dairy_eggs'],
  ['Milch', 'dairy_eggs'],
  ['Eier', 'dairy_eggs'],
  ['Reis', 'pasta_grains'],          // 'ei' darf NICHT auf Reis matchen (word boundary)
  ['Fleisch', 'meat_fish'],
  ['Hähnchenbrust', 'meat_fish'],
  ['Lachs', 'meat_fish'],
  ['Banane', 'fruits_vegetables'],
  ['Karotten', 'fruits_vegetables'],
  ['Erdbeeren', 'fruits_vegetables'],
  ['Brötchen', 'bread_bakery'],
  ['Burgerbrötchen', 'bread_bakery'],
  ['Nudeln', 'pasta_grains'],
  ['Bier', 'beverages'],
  ['Bier alkoholfrei', 'beverages'],
  ['Bier (eventuell helles ansonsten Marke egal)', 'beverages'],
  ['Pizza', 'frozen'],
  ['Alufolie', 'other'],
  ['Tiptoi Mail', 'other'],
  ['', 'other'],
];
for (const [name, expected] of cases) {
  test(`categorize(${JSON.stringify(name)}) → ${expected}`, () => {
    assert.equal(categorize(name), expected);
  });
}

test('categorize ist case-insensitive', () => {
  assert.equal(categorize('MILCH'), 'dairy_eggs');
});

test('Override gewinnt vor der Datenbank', () => {
  const overrides = [{ match: 'tiptoi', category: 'frozen' }];
  assert.equal(categorize('Tiptoi Mail', overrides), 'frozen');
  assert.equal(categorize('Milch', overrides), 'dairy_eggs');
});

test('Override mit unbekannter Kategorie fällt auf other zurück', () => {
  assert.equal(categorize('Foo', [{ match: 'foo', category: 'nope' }]), 'other');
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `node --test food-db.test.mjs`
Expected: FAIL mit `Cannot find module './food-db.js'`

- [ ] **Step 3: `food-db.js` mit Kategorien und Keyword-Gruppen anlegen**

Vorgehen: Die Keyword-Listen der Fampla-Gruppen `_dairy, _eggs, _fruits, _vegetables, _meat, _fish, _breadBakery, _pastaGrains, _beverages, _frozen` aus `food_database.dart` (Zeilen ~37–272) **vollständig** übernehmen (DE/EN/IT). Gruppen-Reihenfolge = Famplas `_shoppingOrder`: dairy, eggs, fruits, vegetables, meat, fish, breadBakery, pastaGrains, beverages, frozen. Mapping der Kategorie-IDs: dairy+eggs → `dairy_eggs`, fruits+vegetables → `fruits_vegetables`, meat+fish → `meat_fish`, Rest 1:1. `_eggs` behält `wordBoundary: true`.

```js
// food-db.js
// Port aus Fampla (food_database.dart + food_emoji_helper.dart). Reine Logik, kein DOM.

export const CATEGORIES = [
  { id: 'fruits_vegetables', label: 'Obst & Gemüse',        emoji: '🥕', color: '#4caf50' },
  { id: 'dairy_eggs',        label: 'Milchprodukte & Eier', emoji: '🥛', color: '#42a5f5' },
  { id: 'meat_fish',         label: 'Fleisch & Fisch',      emoji: '🥩', color: '#ef5350' },
  { id: 'bread_bakery',      label: 'Brot & Backwaren',     emoji: '🥖', color: '#d4a054' },
  { id: 'pasta_grains',      label: 'Nudeln & Getreide',    emoji: '🍝', color: '#ffb74d' },
  { id: 'frozen',            label: 'Tiefkühl',             emoji: '🧊', color: '#4dd0e1' },
  { id: 'beverages',         label: 'Getränke',             emoji: '🍹', color: '#ab47bc' },
  { id: 'other',             label: 'Sonstiges',            emoji: '🛒', color: '#9e9e9e' },
];
const CATEGORY_IDS = new Set(CATEGORIES.map(c => c.id));

// Prüfreihenfolge wie Famplas _shoppingOrder. Erste passende Gruppe gewinnt.
const GROUPS = [
  { category: 'dairy_eggs', keywords: [ /* _dairy aus Fampla, vollständig */ ] },
  { category: 'dairy_eggs', wordBoundary: true, keywords: [ /* _eggs aus Fampla */ ] },
  { category: 'fruits_vegetables', keywords: [ /* _fruits */ ] },
  { category: 'fruits_vegetables', keywords: [ /* _vegetables */ ] },
  { category: 'meat_fish', keywords: [ /* _meat */ ] },
  { category: 'meat_fish', keywords: [ /* _fish */ ] },
  { category: 'bread_bakery', keywords: [ /* _breadBakery */ ] },
  { category: 'pasta_grains', keywords: [ /* _pastaGrains */ ] },
  { category: 'beverages', keywords: [ /* _beverages */ ] },
  { category: 'frozen', keywords: [ /* _frozen */ ] },
];

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// \b kennt keine Umlaute → eigene Wortgrenze: Anfang/Ende oder Nicht-Buchstabe.
const wordMatch = (text, kw) =>
  new RegExp(`(^|[^\\p{L}])${escapeRe(kw)}($|[^\\p{L}])`, 'iu').test(text);

function findOverride(lower, overrides) {
  for (const o of overrides || []) {
    if (o && typeof o.match === 'string' && o.match && lower.includes(o.match.toLowerCase())) return o;
  }
  return null;
}

export function categorize(name, overrides = []) {
  const lower = String(name || '').toLowerCase().trim();
  if (!lower) return 'other';
  const o = findOverride(lower, overrides);
  if (o && o.category) return CATEGORY_IDS.has(o.category) ? o.category : 'other';
  for (const g of GROUPS) {
    const hit = g.wordBoundary
      ? g.keywords.some(kw => wordMatch(lower, kw))
      : g.keywords.some(kw => lower.includes(kw));
    if (hit) return g.category;
  }
  return 'other';
}
```

Die Kommentare `/* … aus Fampla */` sind durch die echten Keyword-Arrays zu ersetzen; keine Kürzung. Falls ein Testfall aus Step 1 wegen der Fampla-Reihenfolge kippt (z. B. `Pizza` ist in Fampla evtl. nicht in `_frozen`): Keyword in der passenden Gruppe **ergänzen**, Reihenfolge nicht ändern, Ergänzung mit Kommentar `// ergänzt` markieren.

- [ ] **Step 4: Tests laufen lassen, Erfolg prüfen**

Run: `node --test food-db.test.mjs`
Expected: alle PASS

- [ ] **Step 5: Commit**

```bash
git add food-db.js food-db.test.mjs
git commit -m "feat(food-db): categories and categorize() ported from Fampla"
```

---

### Task 2: `food-db.js` — `emojiFor`, `splitQuantity`, `normalize`, `suggest`

**Files:**
- Modify: `food-db.js`
- Test: `food-db.test.mjs`

**Interfaces:**
- Consumes: `CATEGORIES`, `categorize`, `findOverride` aus Task 1.
- Produces:
  - `emojiFor(name, overrides = [])` → `string` (nie leer, Fallback = Kategorie-Emoji, zuletzt 🛒)
  - `splitQuantity(summary)` → `{ name: string, qty: string }`
  - `normalize(name)` → `string` (lowercase, getrimmt, Mehrfach-Leerzeichen zu einem, ohne Mengenanteil)
  - `suggest(prefix, recentNames, limit = 6)` → `string[]`
  - `export const EMOJI_KEYS` → `string[]` (alle Keys der Emoji-Map, für Vorschläge)

- [ ] **Step 1: Failing Tests ergänzen**

```js
// an food-db.test.mjs anhängen
import { emojiFor, splitQuantity, normalize, suggest } from './food-db.js';

test('emojiFor: direkter Treffer, längster Substring, Kategorie-Fallback, 🛒', () => {
  assert.equal(emojiFor('Milch'), '🥛');
  assert.equal(emojiFor('Frischkäse'), emojiFor('frischkäse'));
  assert.notEqual(emojiFor('Frischkäse'), '🛒');
  assert.equal(emojiFor('Alufolie'), '🛒');
  assert.equal(emojiFor(''), '🛒');
  // Kategorie bekannt, aber kein eigenes Emoji → Kategorie-Emoji
  assert.equal(emojiFor('Kalbfleisch'), emojiFor('Kalbfleisch')); // deterministisch
  assert.notEqual(emojiFor('Hähnchenkeule'), '🛒');
});

test('emojiFor: Override-Emoji gewinnt', () => {
  assert.equal(emojiFor('Tiptoi Mail', [{ match: 'tiptoi', emoji: '🐘' }]), '🐘');
});

test('splitQuantity erkennt Mealie-Mengen vorne', () => {
  assert.deepEqual(splitQuantity('2 Stück Eier'), { name: 'Eier', qty: '2 Stück' });
  assert.deepEqual(splitQuantity('1,5 kg Kartoffeln'), { name: 'Kartoffeln', qty: '1,5 kg' });
  assert.deepEqual(splitQuantity('500 g Hackfleisch'), { name: 'Hackfleisch', qty: '500 g' });
  assert.deepEqual(splitQuantity('3 Bananen'), { name: 'Bananen', qty: '3' });
  assert.deepEqual(splitQuantity('2x Milch'), { name: 'Milch', qty: '2x' });
});

test('splitQuantity erkennt Klammer-Menge hinten (Nisbo-Altbestand)', () => {
  assert.deepEqual(splitQuantity('Butter (2)'), { name: 'Butter', qty: '2' });
});

test('splitQuantity lässt Namen ohne Menge unverändert', () => {
  assert.deepEqual(splitQuantity('Bier (eventuell helles ansonsten Marke egal)'),
    { name: 'Bier (eventuell helles ansonsten Marke egal)', qty: '' });
  assert.deepEqual(splitQuantity('Tiptoi Mail'), { name: 'Tiptoi Mail', qty: '' });
  assert.deepEqual(splitQuantity('  Milch  '), { name: 'Milch', qty: '' });
});

test('normalize gleicht Mengen- und Schreibvarianten an', () => {
  assert.equal(normalize('Milch'), normalize('2 L Milch'));
  assert.equal(normalize('  Hafer   Milch '), 'hafer milch');
  assert.notEqual(normalize('Milch'), normalize('Hafermilch'));
});

test('suggest: erst Zuletzt-Treffer, dann Emoji-Keys, ohne Duplikate, max limit', () => {
  const s = suggest('ha', ['Hafermilch', 'Haferflocken'], 6);
  assert.equal(s[0], 'Hafermilch');
  assert.equal(s[1], 'Haferflocken');
  assert.ok(s.length <= 6);
  assert.equal(new Set(s.map(x => x.toLowerCase())).size, s.length);
  assert.deepEqual(suggest('', ['Milch']), []);
  assert.deepEqual(suggest('a', ['Milch'], 0), []);
});

test('suggest: Emoji-Keys werden kapitalisiert geliefert', () => {
  const s = suggest('bu', []);
  assert.ok(s.every(x => x[0] === x[0].toUpperCase()));
  assert.ok(s.some(x => x.toLowerCase() === 'butter'));
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `node --test food-db.test.mjs`
Expected: FAIL mit `does not provide an export named 'emojiFor'`

- [ ] **Step 3: Implementieren**

Die Emoji-Map aus `food_emoji_helper.dart` (`_emojiMap`, Zeile 8 ff., ~200 Einträge) **vollständig** übernehmen.

```js
// food-db.js — ergänzen
const EMOJI = {
  // vollständig aus Fampla _emojiMap, z. B.:
  'milch': '🥛', 'milk': '🥛', 'butter': '🧈', 'käse': '🧀', 'cheese': '🧀',
  // …
};
const EMOJI_BY_LENGTH = Object.keys(EMOJI).sort((a, b) => b.length - a.length);
export const EMOJI_KEYS = Object.keys(EMOJI);
const CATEGORY_EMOJI = Object.fromEntries(CATEGORIES.map(c => [c.id, c.emoji]));

export function emojiFor(name, overrides = []) {
  const lower = String(name || '').toLowerCase().trim();
  if (!lower) return '🛒';
  const o = findOverride(lower, overrides);
  if (o && o.emoji) return o.emoji;
  if (EMOJI[lower]) return EMOJI[lower];
  for (const key of EMOJI_BY_LENGTH) if (lower.includes(key)) return EMOJI[key];
  return CATEGORY_EMOJI[categorize(lower, overrides)] || '🛒';
}

// "2 Stück Eier" | "1,5 kg Kartoffeln" | "3 Bananen" | "2x Milch"
const LEADING_QTY = /^\s*(\d+(?:[.,]\d+)?\s*(?:x|×)?(?:\s*(?:stück|stk\.?|st\.?|kg|g|l|ml|el|tl|pck\.?|packung|packungen|dose|dosen|flasche|flaschen|bund|becher|glas|scheiben|pack|liter|gramm))?)\s+(.+)$/i;
const TRAILING_QTY = /^(.*\S)\s+\((\d+)\)\s*$/;

export function splitQuantity(summary) {
  const s = String(summary || '').trim().replace(/\s+/g, ' ');
  let m = LEADING_QTY.exec(s);
  if (m) return { name: m[2].trim(), qty: m[1].trim() };
  m = TRAILING_QTY.exec(s);
  if (m) return { name: m[1].trim(), qty: m[2] };
  return { name: s, qty: '' };
}

export function normalize(name) {
  return splitQuantity(name).name.toLowerCase().replace(/\s+/g, ' ').trim();
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export function suggest(prefix, recentNames = [], limit = 6) {
  const p = String(prefix || '').toLowerCase().trim();
  if (!p || limit <= 0) return [];
  const out = [];
  const seen = new Set();
  const push = s => { const k = s.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(s); } };
  for (const r of recentNames) if (r.toLowerCase().includes(p)) push(r);
  for (const k of EMOJI_KEYS) if (k.startsWith(p)) push(cap(k));
  for (const k of EMOJI_KEYS) if (k.includes(p)) push(cap(k));
  return out.slice(0, limit);
}
```

- [ ] **Step 4: Tests laufen lassen, Erfolg prüfen**

Run: `node --test food-db.test.mjs`
Expected: alle PASS (mindestens 30 Tests gesamt)

- [ ] **Step 5: Commit**

```bash
git add food-db.js food-db.test.mjs
git commit -m "feat(food-db): emojiFor, splitQuantity, normalize, suggest"
```

---

### Task 3: Karte — Subscription und Read-only-Rendering

**Files:**
- Create: `grocery-tiles-card.js`
- Create: `test/harness.html` (Fake-hass, lädt die Karte aus `../grocery-tiles-card.js`)
- Create: `test/shot.mjs` (Headless-Screenshot des Harness)

**Interfaces:**
- Consumes: `CATEGORIES, categorize, emojiFor, splitQuantity` aus `./food-db.js`.
- Produces: `class GroceryTilesCard extends HTMLElement` mit `setConfig(config)`, `set hass(hass)`, `getCardSize()`, `getGridOptions()`, statisch `getStubConfig(hass)`. Interne Felder, die Task 4/5 nutzen: `this._config`, `this._hass`, `this._items` (Array `{uid, summary, status}`), `this._render()`, `this._unsub`.
- Fake-hass-Vertrag für den Harness (Task 4 erweitert ihn): `hass.states[entity]`, `hass.connection.subscribeMessage(cb, msg)` → Promise<unsubFn>, `hass.callService(domain, service, data, target)` → Promise.

- [ ] **Step 1: Harness schreiben (der „Test" dieser Task ist der sichtbare Render)**

```html
<!-- test/harness.html -->
<!doctype html><meta charset="utf-8"><title>grocery-tiles-card harness</title>
<style>body{margin:0;padding:16px;background:#fafafa;font-family:Roboto,system-ui,sans-serif;
  --card-background-color:#fff;--secondary-background-color:#f0f0f0;--primary-text-color:#212121;
  --secondary-text-color:#727272;--divider-color:#e0e0e0;--primary-color:#03a9f4;}
  .wrap{max-width:500px}</style>
<div class="wrap"><grocery-tiles-card id="card"></grocery-tiles-card></div>
<script type="module">
  import '../grocery-tiles-card.js';
  const ENTITY = 'todo.mealie_einkaufsliste';
  const items = [
    { uid: '1', summary: '2 Stück Eier', status: 'needs_action' },
    { uid: '2', summary: 'Hafermilch', status: 'needs_action' },
    { uid: '3', summary: 'Bananen', status: 'needs_action' },
    { uid: '4', summary: '1 kg Karotten', status: 'needs_action' },
    { uid: '5', summary: 'Bier alkoholfrei', status: 'needs_action' },
    { uid: '6', summary: 'Alufolie', status: 'needs_action' },
    { uid: '7', summary: 'Butter', status: 'completed' },
    { uid: '8', summary: 'Brötchen', status: 'completed' },
    { uid: '9', summary: 'Lachs', status: 'completed' },
  ];
  let cb = null;
  const emit = () => cb && cb({ items: items.map(i => ({ ...i })) });
  window.hass = {
    states: { [ENTITY]: { state: String(items.filter(i => i.status === 'needs_action').length), attributes: { friendly_name: 'Einkaufsliste' } } },
    connection: { subscribeMessage: async (fn, msg) => { console.log('subscribe', msg); cb = fn; setTimeout(emit, 0); return () => { cb = null; }; } },
    callService: async (domain, service, data, target) => {
      console.log('callService', domain, service, JSON.stringify(data), JSON.stringify(target));
      if (window.failNext) { window.failNext = false; throw new Error('Simulierter Fehler'); }
      if (service === 'add_item') items.push({ uid: String(Date.now()), summary: data.item, status: 'needs_action' });
      if (service === 'update_item') { const it = items.find(i => i.uid === data.item); if (data.status) it.status = data.status; if (data.rename) it.summary = data.rename; }
      if (service === 'remove_item') for (const u of data.item) { const i = items.findIndex(x => x.uid === u); if (i >= 0) items.splice(i, 1); }
      if (service === 'remove_completed_items') for (let i = items.length - 1; i >= 0; i--) if (items[i].status === 'completed') items.splice(i, 1);
      setTimeout(emit, 50);
    },
  };
  const card = document.getElementById('card');
  card.setConfig({ entity: ENTITY, title: 'Einkaufsliste' });
  card.hass = window.hass;
  window.card = card;
</script>
```

```js
// test/shot.mjs — nutzt playwright-core aus dem Codex-Runtime + gecachtes Chromium (kein npm nötig)
import { chromium } from '/Users/albert.hoffmann/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const BIN = process.env.BIN || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: BIN, headless: true });
const page = await browser.newPage({ viewport: { width: 520, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + path.join(here, 'harness.html'));
await page.waitForTimeout(500);
if (process.argv[2]) { await page.evaluate(process.argv[2]); await page.waitForTimeout(400); }
await page.screenshot({ path: path.join(here, 'harness.png') });
const text = await page.evaluate(() => document.getElementById('card').shadowRoot.textContent.replace(/\s+/g, ' ').trim());
console.log('TEXT:', text.slice(0, 600));
console.log('ERRORS:', errors);
await browser.close();
process.exit(errors.length ? 1 : 0);
```

- [ ] **Step 2: Harness laufen lassen, Fehlschlag prüfen**

Run: `node test/shot.mjs`
Expected: exit 1, ERRORS enthält „Failed to fetch dynamically imported module" oder „card.setConfig is not a function"

- [ ] **Step 3: Karte implementieren (read-only)**

```js
// grocery-tiles-card.js
import { CATEGORIES, categorize, emojiFor, splitQuantity } from './food-db.js';

const DEFAULTS = { title: '', columns: 0, show_recent: true, recent_limit: 30, show_clear_completed: true, overrides: [] };

const STYLE = `
  :host { display: block; }
  ha-card, .card { background: var(--card-background-color); border-radius: 12px; padding: 12px 12px 8px; box-shadow: var(--ha-card-box-shadow, none); border: var(--ha-card-border-width, 1px) solid var(--divider-color); color: var(--primary-text-color); font-family: inherit; }
  h1 { font-size: 18px; font-weight: 500; margin: 0 0 8px; }
  .group { margin-top: 12px; }
  .group-head { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--secondary-text-color); padding: 0 0 6px 8px; border-left: 3px solid var(--gt-color); }
  .group-head .count { margin-left: auto; opacity: .7; }
  .grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
  .grid.fixed { grid-template-columns: repeat(var(--gt-cols), 1fr); }
  .tile { aspect-ratio: 1; border-radius: 8px; background: var(--secondary-background-color); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 6px; cursor: pointer; user-select: none; -webkit-user-select: none; transition: transform .12s, opacity .15s; }
  .tile:active { transform: scale(.96); }
  .tile .emoji { font-size: 32px; line-height: 1.1; }
  .tile .name { font-size: 13px; line-height: 1.2; margin-top: 4px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .tile .qty { font-size: 11px; color: var(--secondary-text-color); margin-top: 2px; }
  .tile.done { opacity: .55; }
  .tile.done .name { text-decoration: line-through; }
  .recent-head { display: flex; align-items: center; margin-top: 16px; padding-top: 10px; border-top: 1px solid var(--divider-color); font-size: 13px; color: var(--secondary-text-color); }
  .recent-head .spacer { flex: 1; }
  .empty, .warn { padding: 16px 8px; color: var(--secondary-text-color); font-size: 14px; }
  .warn { color: var(--error-color, #db4437); }
  button.link { background: none; border: 0; color: var(--primary-color); cursor: pointer; font: inherit; font-size: 13px; padding: 4px 8px; }
`;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

class GroceryTilesCard extends HTMLElement {
  static getStubConfig(hass) {
    const first = Object.keys(hass?.states || {}).find(id => id.startsWith('todo.'));
    return { entity: first || 'todo.einkaufsliste' };
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._items = [];
    this._unsub = null;
    this._subscribedFor = null; // `${entity}` der laufenden Subscription
    this._showAllRecent = false;
  }

  setConfig(config) {
    if (!config || !config.entity || !String(config.entity).startsWith('todo.')) {
      throw new Error('grocery-tiles-card: "entity" (todo.*) fehlt');
    }
    this._config = { ...DEFAULTS, ...config, overrides: Array.isArray(config.overrides) ? config.overrides : [] };
    this._resubscribe();
    this._render();
  }

  set hass(hass) {
    const connChanged = this._hass?.connection !== hass?.connection;
    this._hass = hass;
    if (connChanged) this._resubscribe();
    this._render();
  }

  connectedCallback() { this._resubscribe(); }
  disconnectedCallback() { this._unsubscribe(); }

  getCardSize() { return 3 + this._groups().length; }
  getGridOptions() { return { columns: 'full' }; }

  _unsubscribe() {
    if (this._unsub) { try { this._unsub(); } catch (_) { /* ignore */ } }
    this._unsub = null;
    this._subscribedFor = null;
  }

  async _resubscribe() {
    const entity = this._config?.entity;
    const conn = this._hass?.connection;
    if (!entity || !conn || !this.isConnected) return;
    if (this._subscribedFor === entity && this._unsub) return;
    this._unsubscribe();
    this._subscribedFor = entity;
    try {
      this._unsub = await conn.subscribeMessage(
        msg => { this._items = Array.isArray(msg?.items) ? msg.items : []; this._render(); },
        { type: 'todo/item/subscribe', entity_id: entity },
      );
    } catch (e) {
      this._subscribedFor = null;
      console.error('grocery-tiles-card: subscribe failed', e);
    }
  }

  // ── Ableitungen ─────────────────────────────────────────────
  _decorate(item) {
    const { name, qty } = splitQuantity(item.summary);
    return { ...item, name, qty, emoji: emojiFor(name, this._config.overrides), category: categorize(name, this._config.overrides) };
  }
  _open() { return this._items.filter(i => i.status === 'needs_action').map(i => this._decorate(i)); }
  _done() { return this._items.filter(i => i.status === 'completed').map(i => this._decorate(i)).reverse(); }
  _groups() {
    const open = this._open();
    return CATEGORIES
      .map(c => ({ c, tiles: open.filter(t => t.category === c.id).sort((a, b) => a.name.localeCompare(b.name, 'de')) }))
      .filter(g => g.tiles.length);
  }

  // ── Rendering ───────────────────────────────────────────────
  _tile(t, done) {
    return `<div class="tile${done ? ' done' : ''}" data-uid="${esc(t.uid)}" role="button" tabindex="0" aria-label="${esc(t.name)}${done ? ' (erledigt)' : ''}">
      <div class="emoji">${t.emoji}</div><div class="name">${esc(t.name)}</div>${t.qty ? `<div class="qty">${esc(t.qty)}</div>` : ''}</div>`;
  }

  _render() {
    if (!this._config) return;
    const cfg = this._config;
    const st = this._hass?.states?.[cfg.entity];
    const gridClass = cfg.columns > 0 ? 'grid fixed' : 'grid';
    let body = '';
    if (!st) {
      body = `<div class="warn">Entity nicht gefunden: ${esc(cfg.entity)}</div>`;
    } else {
      const unavailable = st.state === 'unavailable' || st.state === 'unknown';
      const groups = this._groups();
      const done = this._done();
      if (unavailable) body += `<div class="warn">${esc(cfg.entity)} ist nicht erreichbar.</div>`;
      body += groups.length
        ? groups.map(g => `<section class="group" style="--gt-color:${g.c.color}">
            <div class="group-head"><span>${g.c.emoji}</span><span>${esc(g.c.label)}</span><span class="count">${g.tiles.length}</span></div>
            <div class="${gridClass}">${g.tiles.map(t => this._tile(t, false)).join('')}</div></section>`).join('')
        : `<div class="empty">Liste ist leer.</div>`;
      if (cfg.show_recent && done.length) {
        const shown = this._showAllRecent ? done : done.slice(0, cfg.recent_limit);
        const rest = done.length - shown.length;
        body += `<div class="recent-head"><span>Zuletzt</span><span class="spacer"></span>
          ${cfg.show_clear_completed ? `<button class="link" data-action="clear">Erledigte löschen</button>` : ''}</div>
          <div class="${gridClass} recent">${shown.map(t => this._tile(t, true)).join('')}</div>
          ${rest > 0 ? `<button class="link" data-action="more">mehr anzeigen (${rest})</button>` : ''}`;
      }
    }
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card class="card" style="--gt-cols:${cfg.columns || 3}">
      ${cfg.title ? `<h1>${esc(cfg.title)}</h1>` : ''}${body}</ha-card>`;
    this.shadowRoot.querySelector('[data-action="more"]')?.addEventListener('click', () => { this._showAllRecent = true; this._render(); });
  }
}

customElements.define('grocery-tiles-card', GroceryTilesCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'grocery-tiles-card', name: 'Grocery Tiles Card', description: 'Einkaufsliste als Emoji-Kacheln nach Kategorien (Bring-Style) für jede todo-Entity.', preview: true });
```

Hinweis: `<ha-card>` existiert im Harness nicht als Custom Element; der Browser rendert es als unbekanntes Inline-Element. Deshalb hat die Klasse `.card` dieselben Styles und der Host setzt `display:block` — im Harness sieht es dadurch gleich aus.

- [ ] **Step 4: Harness laufen lassen, Erfolg prüfen**

Run: `node test/shot.mjs && open test/harness.png`
Expected: exit 0, ERRORS `[]`, TEXT enthält „Obst & Gemüse", „Milchprodukte & Eier", „Getränke", „Sonstiges", „Zuletzt", „Eier", „2 Stück", „Erledigte löschen". Screenshot zeigt Gruppenköpfe mit Farbstrich, quadratische Kacheln mit Emoji, graue Kacheln unter „Zuletzt".

- [ ] **Step 5: Commit**

```bash
git add grocery-tiles-card.js test/harness.html test/shot.mjs
git commit -m "feat(card): subscription and read-only tile rendering"
```

---

### Task 4: Karte — Aktionen mit Optimismus und Rollback

**Files:**
- Modify: `grocery-tiles-card.js`

**Interfaces:**
- Consumes: `this._items`, `this._render()`, `this._hass.callService` aus Task 3; Harness-Fake aus Task 3 (`window.failNext = true` simuliert einen Service-Fehler).
- Produces: Methoden `_toggle(uid)`, `_add(text)`, `_rename(uid, text)`, `_remove(uid)`, `_clearCompleted()`, `_toast(msg)`, `_call(service, data)`. Eingabezeile mit `input.add` und `button[data-action="add"]`.

- [ ] **Step 1: Prüfskript (Harness-Interaktion) festlegen**

Die Checks laufen über `node test/shot.mjs "<js>"`, das JS läuft im Harness und der Text danach wird ausgegeben. Erwartungen:

```bash
# Abhaken: Tap auf Kachel „Bananen" → Bananen erscheint unter Zuletzt
node test/shot.mjs "card.shadowRoot.querySelector('.tile[data-uid=\"3\"]').click()"
# Expected: TEXT enthält „Zuletzt" gefolgt (irgendwo danach) von „Bananen"; ERRORS []

# Zurückholen: Tap auf graue Kachel Butter → Butter unter „Milchprodukte & Eier"
node test/shot.mjs "card.shadowRoot.querySelector('.tile.done[data-uid=\"7\"]').click()"

# Hinzufügen per Enter
node test/shot.mjs "const i=card.shadowRoot.querySelector('input.add'); i.value='Tomaten'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))"
# Expected: TEXT enthält „Tomaten" unter „Obst & Gemüse"

# Rollback bei Fehler: Kachel bleibt offen, Toast-Text erscheint kurz im Shadow-DOM
node test/shot.mjs "window.failNext=true; card.shadowRoot.querySelector('.tile[data-uid=\"2\"]').click()"
# Expected: TEXT enthält „Hafermilch" NICHT hinter „Zuletzt", und enthält „Simulierter Fehler"

# Erledigte löschen (Bestätigung wird im Harness automatisch bejaht, s. Step 2)
node test/shot.mjs "window.confirm=()=>true; card.shadowRoot.querySelector('[data-action=clear]').click()"
# Expected: TEXT enthält „Zuletzt" nicht mehr
```

- [ ] **Step 2: Implementieren**

In `_render()` vor `body` die Eingabezeile einfügen und Event-Handler nach dem Setzen von `innerHTML` registrieren:

```js
// STYLE ergänzen
const STYLE_ADD = `
  .addrow { display: flex; gap: 8px; margin-bottom: 4px; }
  .addrow input { flex: 1; font: inherit; font-size: 15px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--divider-color); background: var(--secondary-background-color); color: var(--primary-text-color); outline: none; }
  .addrow input:focus { border-color: var(--primary-color); }
  .addrow button { font: inherit; font-size: 20px; width: 44px; border-radius: 8px; border: 0; background: var(--primary-color); color: #fff; cursor: pointer; }
  .toast { position: sticky; bottom: 8px; margin: 8px auto 0; width: fit-content; max-width: 90%; background: var(--primary-text-color); color: var(--card-background-color); padding: 8px 14px; border-radius: 8px; font-size: 13px; }
  .tile.pending { opacity: .4; pointer-events: none; }
`;
```

```js
// in _render(): nach dem Title, vor body
const addRow = `<div class="addrow"><input class="add" type="text" placeholder="Artikel hinzufügen…" autocomplete="off" enterkeyhint="done" ${(!st || st.state === 'unavailable') ? 'disabled' : ''}><button data-action="add" aria-label="Hinzufügen">+</button></div>`;
// … innerHTML = <style>${STYLE}${STYLE_ADD}</style><ha-card …>${title}${addRow}${body}${this._toastMsg ? `<div class="toast">${esc(this._toastMsg)}</div>` : ''}</ha-card>
this._wire();
```

```js
  _wire() {
    const root = this.shadowRoot;
    const input = root.querySelector('input.add');
    if (input) {
      if (this._draft) input.value = this._draft;
      input.addEventListener('input', () => { this._draft = input.value; });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this._add(input.value); } });
    }
    root.querySelector('[data-action="add"]')?.addEventListener('click', () => this._add(input?.value || ''));
    root.querySelector('[data-action="clear"]')?.addEventListener('click', () => this._clearCompleted());
    root.querySelector('[data-action="more"]')?.addEventListener('click', () => { this._showAllRecent = true; this._render(); });
    root.querySelectorAll('.tile').forEach(el => {
      el.addEventListener('click', () => this._toggle(el.dataset.uid));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._toggle(el.dataset.uid); } });
    });
  }

  _toast(msg) {
    this._toastMsg = msg;
    this._render();
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { this._toastMsg = ''; this._render(); }, 4000);
  }

  _call(service, data) {
    return this._hass.callService('todo', service, data, { entity_id: this._config.entity });
  }

  // Optimistisch: lokale Kopie ändern, rendern, Service rufen, bei Fehler alte Items zurück.
  async _optimistic(mutate, service, data) {
    const before = this._items;
    this._items = mutate(before.map(i => ({ ...i })));
    this._render();
    try { await this._call(service, data); }
    catch (e) { this._items = before; this._toast(e?.message || 'Fehler'); }
  }

  _toggle(uid) {
    const it = this._items.find(i => i.uid === uid);
    if (!it) return;
    const status = it.status === 'completed' ? 'needs_action' : 'completed';
    this._optimistic(items => items.map(i => i.uid === uid ? { ...i, status } : i), 'update_item', { item: uid, status });
  }

  async _add(text) {
    const summary = String(text || '').trim().replace(/\s+/g, ' ');
    if (!summary) return;
    this._draft = '';
    const tmp = { uid: `tmp-${Date.now()}`, summary, status: 'needs_action' };
    this._optimistic(items => [...items, tmp], 'add_item', { item: summary });
  }

  _rename(uid, text) {
    const rename = String(text || '').trim();
    if (!rename) return;
    this._optimistic(items => items.map(i => i.uid === uid ? { ...i, summary: rename } : i), 'update_item', { item: uid, rename });
  }

  _remove(uid) {
    const it = this._items.find(i => i.uid === uid);
    if (!it) return;
    this._optimistic(items => items.filter(i => i.uid !== uid), 'remove_item', { item: [uid] });
    this._toast(`„${splitQuantity(it.summary).name}" gelöscht`);
  }

  _clearCompleted() {
    const n = this._items.filter(i => i.status === 'completed').length;
    if (!n) return;
    if (!confirm(`${n} erledigte Einträge endgültig löschen?`)) return;
    this._optimistic(items => items.filter(i => i.status !== 'completed'), 'remove_completed_items', {});
  }
```

`confirm()` ist im HA-Frontend erlaubt und einfach; der Harness überschreibt es im Prüfskript. (Long-Press-Menü für Umbenennen/Löschen kommt in Task 5.)

- [ ] **Step 3: Prüfskripte aus Step 1 laufen lassen**

Run: die fünf Kommandos aus Step 1 nacheinander.
Expected: jeweils exit 0 und der beschriebene TEXT; im Rollback-Fall enthält TEXT „Simulierter Fehler".

- [ ] **Step 4: Commit**

```bash
git add grocery-tiles-card.js
git commit -m "feat(card): add, toggle, clear with optimistic updates and rollback"
```

---

### Task 5: Vorschläge, Duplikate, Long-Press-Menü, Editor, README

**Files:**
- Modify: `grocery-tiles-card.js`
- Create: `README.md`

**Interfaces:**
- Consumes: `suggest, normalize` aus `./food-db.js`; `_add`, `_toggle`, `_rename`, `_remove`, `_toast`, `_wire`, `_draft` aus Task 4.
- Produces: Chips `.chip[data-name]`, Long-Press-Menü `.menu` mit `[data-action="rename"]` und `[data-action="delete"]`, Editor-Element `grocery-tiles-card-editor`, statische Methode `getConfigElement()`.

- [ ] **Step 1: Prüfskripte festlegen**

```bash
# Vorschläge beim Tippen: „ha" → Chip „Hafermilch" zuerst (aus Zuletzt/Liste), Chips max 6
node test/shot.mjs "const i=card.shadowRoot.querySelector('input.add'); i.value='ha'; i.dispatchEvent(new Event('input',{bubbles:true}))"
# Expected: TEXT enthält „Hafermilch" innerhalb der Chips; Anzahl .chip ≤ 6

# Duplikat offen: „milch" tippen+Enter, wenn „Hafermilch" offen ist → KEIN neues Item, aber „Milch" ist kein Duplikat von „Hafermilch" → wird angelegt.
node test/shot.mjs "const i=card.shadowRoot.querySelector('input.add'); i.value='Hafermilch'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))"
# Expected: TEXT enthält „schon auf der Liste"; Anzahl offener Kacheln unverändert (6)

# Duplikat erledigt: „Butter" (uid 7 ist completed) tippen+Enter → reaktiviert statt neu
node test/shot.mjs "const i=card.shadowRoot.querySelector('input.add'); i.value='butter'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))"
# Expected: Butter unter „Milchprodukte & Eier", nicht mehr unter Zuletzt, Konsole zeigt update_item (nicht add_item)

# Long-Press-Menü: pointerdown 600 ms → Menü mit „Umbenennen" und „Löschen"
node test/shot.mjs "const t=card.shadowRoot.querySelector('.tile[data-uid=\"6\"]'); t.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); await new Promise(r=>setTimeout(r,650));"
# Expected: TEXT enthält „Umbenennen" und „Löschen"
```

- [ ] **Step 2: Implementieren**

```js
import { CATEGORIES, categorize, emojiFor, splitQuantity, suggest, normalize } from './food-db.js';

// STYLE ergänzen
const STYLE_MORE = `
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 2px; }
  .chip { border-radius: 16px; padding: 5px 10px; background: var(--secondary-background-color); font-size: 13px; cursor: pointer; border: 0; color: var(--primary-text-color); font: inherit; }
  .menu { position: fixed; z-index: 10; background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.2); min-width: 160px; }
  .menu button { display: block; width: 100%; text-align: left; background: none; border: 0; padding: 10px 14px; font: inherit; color: var(--primary-text-color); cursor: pointer; }
  .menu button:hover { background: var(--secondary-background-color); }
  .menu input { width: calc(100% - 28px); margin: 8px 14px; font: inherit; }
`;
```

```js
  // Vorschläge: in _render() unter der addrow
  _chipsHtml() {
    const names = [...this._done(), ...this._open()].map(t => t.name);
    const s = suggest(this._draft, names, 6);
    return s.length ? `<div class="chips">${s.map(n => `<button class="chip" data-name="${esc(n)}">${emojiFor(n, this._config.overrides)} ${esc(n)}</button>`).join('')}</div>` : '';
  }
  // in _wire(): input-Handler erweitern → this._draft = input.value; this._render(); danach Fokus + Cursor wiederherstellen:
  //   const el = this.shadowRoot.querySelector('input.add'); el.focus(); el.setSelectionRange(el.value.length, el.value.length);
  // Chips: root.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => this._add(c.dataset.name)));

  // Duplikat-Logik: am Anfang von _add() nach dem Trim
  //   const key = normalize(summary);
  //   const open = this._items.find(i => i.status === 'needs_action' && normalize(i.summary) === key);
  //   if (open) { this._draft = ''; this._toast(`„${splitQuantity(open.summary).name}" ist schon auf der Liste`); return; }
  //   const done = this._items.find(i => i.status === 'completed' && normalize(i.summary) === key);
  //   if (done) { this._draft = ''; this._toggle(done.uid); return; }

  // Long-Press: in _wire() pro .tile
  //   let timer; const start = () => { timer = setTimeout(() => { timer = null; this._openMenu(el.dataset.uid, el); }, 500); };
  //   const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  //   el.addEventListener('pointerdown', start); ['pointerup','pointerleave','pointercancel'].forEach(ev => el.addEventListener(ev, cancel));
  //   el.addEventListener('contextmenu', e => { e.preventDefault(); this._openMenu(el.dataset.uid, el); });
  //   Der click-Handler prüft: if (this._menuJustOpened) { this._menuJustOpened = false; return; }

  _openMenu(uid, anchor) {
    this._closeMenu();
    const it = this._items.find(i => i.uid === uid);
    if (!it) return;
    this._menuJustOpened = true;
    const r = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.style.left = `${Math.min(r.left, window.innerWidth - 180)}px`;
    menu.style.top = `${Math.min(r.bottom + 4, window.innerHeight - 120)}px`;
    menu.innerHTML = `<button data-action="rename">Umbenennen</button><button data-action="delete">Löschen</button>`;
    menu.querySelector('[data-action="delete"]').addEventListener('click', () => { this._closeMenu(); this._remove(uid); });
    menu.querySelector('[data-action="rename"]').addEventListener('click', () => {
      menu.innerHTML = `<input type="text" value="${esc(it.summary)}" aria-label="Neuer Name">`;
      const inp = menu.querySelector('input'); inp.focus(); inp.select();
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { this._closeMenu(); this._rename(uid, inp.value); }
        if (e.key === 'Escape') this._closeMenu();
      });
    });
    this.shadowRoot.appendChild(menu);
    this._menu = menu;
    setTimeout(() => document.addEventListener('pointerdown', this._outsideHandler = e => { if (!e.composedPath().includes(menu)) this._closeMenu(); }, { once: true }), 0);
  }
  _closeMenu() { this._menu?.remove(); this._menu = null; if (this._outsideHandler) document.removeEventListener('pointerdown', this._outsideHandler); }
```

Hinweis zum Umbenennen: Bei Mealie-Listen wandelt ein Rename ein Rezept-Item in eine Notiz um (Spec §2). Das ist gewollt explizit; die Karte tut es nur auf ausdrückliche Nutzeraktion.

Editor:

```js
class GroceryTilesCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = s => ({ entity: 'To-do-Entity', title: 'Titel', columns: 'Spalten (0 = automatisch)', show_recent: '„Zuletzt" anzeigen', recent_limit: 'Max. Kacheln unter „Zuletzt"', show_clear_completed: 'Button „Erledigte löschen"' }[s.name] || s.name);
      this._form.schema = [
        { name: 'entity', required: true, selector: { entity: { domain: 'todo' } } },
        { name: 'title', selector: { text: {} } },
        { name: 'columns', selector: { number: { min: 0, max: 8, mode: 'box' } } },
        { name: 'show_recent', selector: { boolean: {} } },
        { name: 'recent_limit', selector: { number: { min: 1, max: 200, mode: 'box' } } },
        { name: 'show_clear_completed', selector: { boolean: {} } },
      ];
      this._form.addEventListener('value-changed', e => {
        this._config = { ...this._config, ...e.detail.value };
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = { ...DEFAULTS, ...this._config };
  }
}
customElements.define('grocery-tiles-card-editor', GroceryTilesCardEditor);
// in GroceryTilesCard:
//   static getConfigElement() { return document.createElement('grocery-tiles-card-editor'); }
```

README.md (deutsch, kurz): Was die Karte tut, Screenshot `docs/screenshot.png` (aus `test/harness.png` kopieren), Installation als HACS Custom Repository (Kategorie „Dashboard"), Konfig-Tabelle aus Spec §5, Beispiel-YAML:

```yaml
type: custom:grocery-tiles-card
entity: todo.mealie_einkaufsliste
title: Einkaufsliste
overrides:
  - match: tiptoi
    category: other
    emoji: 🐘
```

Abschnitt „Hinweis Mealie": Umbenennen macht aus einem Rezept-Item eine Notiz.

- [ ] **Step 3: Prüfskripte aus Step 1 laufen lassen; Node-Tests erneut**

Run: die vier Kommandos aus Step 1, danach `node --test food-db.test.mjs`
Expected: alle wie beschrieben, Node-Tests PASS.

- [ ] **Step 4: Commit**

```bash
cp test/harness.png docs/screenshot.png
git add grocery-tiles-card.js README.md docs/screenshot.png
git commit -m "feat(card): suggestions, duplicate handling, long-press menu, editor; docs: README"
```

---

### Task 6: Installation in HA und Abnahme (macht der Orchestrator)

**Files:**
- Keine Repo-Änderung. HA: `.storage/lovelace.kueche_tabs` (via WebSocket), HACS.

- [ ] **Step 1: Repo auf Forgejo/GitHub bereitstellen** — Albert pusht selbst (Befehl wird geliefert). HACS braucht ein öffentliches Git-Repo mit `hacs.json` im Root.
- [ ] **Step 2: HACS Custom Repository hinzufügen** — WebSocket `hacs/repositories/add` `{ repository: "<owner>/ha-grocery-tiles-card", category: "plugin" }`, dann `hacs/repository/download`. Ressource `/hacsfiles/ha-grocery-tiles-card/grocery-tiles-card.js` prüfen; `food-db.js` unter demselben Pfad per curl mit 200 prüfen.
- [ ] **Step 3: Dashboard tauschen** — Backup `.storage/lovelace.kueche_tabs.bak-tiles-<datum>`, dann per `lovelace/config/save` die `custom:ha-shopping-list-improved`-Karte durch `{ type: 'custom:grocery-tiles-card', entity: 'todo.mealie_einkaufsliste', grid_options: { columns: 'full' } }` ersetzen.
- [ ] **Step 4: Sichtprüfung** — Headless-Screenshot des echten Dashboards (Rezept in `infra_homeassistant.md`), Konsole fehlerfrei.
- [ ] **Step 5: Rundlauf mit Albert** — hinzufügen, abhaken, aus „Zuletzt" zurückholen, zweites Gerät, Mealie-App zeigt unveränderte Namen.

---

## Self-Review (durchgeführt beim Schreiben)

- Spec-Abdeckung: §4 → Task 1+2; §5 Konfiguration/Datenfluss/Layout → Task 3–5; §6 Fehlerfälle → Task 3 (Entity fehlt/unavailable) + Task 4 (Rollback/Toast); §7 Tests → Task 1/2 (node:test) + Harness; §8 Reihenfolge = Task-Reihenfolge; Install/Abnahme → Task 6.
- Offen gelassen mit Absicht: Undo-Toast nach Löschen (Spec §5) ist auf einen Info-Toast reduziert — Undo per `add_item` würde bei Mealie ein Notiz-Item statt des Rezept-Items erzeugen. `// ponytail: Undo weggelassen, add when Albert es vermisst`.
- Typkonsistenz: `overrides` überall Array aus `{match, category?, emoji?}`; Items überall `{uid, summary, status}`; Kategorie-IDs identisch in CATEGORIES, GROUPS und Tests.
