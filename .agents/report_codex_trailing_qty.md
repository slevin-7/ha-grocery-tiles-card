# Report: trailing quantities

## Neue Regex(e)

```js
const UNITS = 'stück|stk\\.?|st\\.?|kg|g|l|ml|el|tl|pck\\.?|packung|packungen|dose|dosen|flasche|flaschen|bund|becher|glas|scheiben|pack|liter|gramm';
const LEADING_QTY = new RegExp(`^\\s*(\\d+(?:[.,]\\d+)?\\s*(?:x|×)?(?:\\s*(?:${UNITS}))?)\\s+(.+)$`, 'i');
const TRAILING_PAREN_QTY = /^(.*\S)\s+\((\d+)\)\s*$/;
const TRAILING_QTY = new RegExp(`^(.*\\S)\\s+(?:(\\d+(?:[.,]\\d+)?)\\s*(?:x|×)|(?:x|×)\\s*(\\d+)|(\\d+(?:[.,]\\d+)?\\s*(?:${UNITS})))\\s*$`, 'i');
```

## Beispiele

| Eingabe | Ergebnis |
|---|---|
| `Quark 2x` | `{ name: 'Quark', qty: '2x' }` |
| `Quark 2 x` | `{ name: 'Quark', qty: '2x' }` |
| `Quark 2×` | `{ name: 'Quark', qty: '2x' }` |
| `Milch x2` | `{ name: 'Milch', qty: '2x' }` |
| `Milch x 2` | `{ name: 'Milch', qty: '2x' }` |
| `Käse 200 g` | `{ name: 'Käse', qty: '200 g' }` |
| `Kartoffeln 1,5 kg` | `{ name: 'Kartoffeln', qty: '1,5 kg' }` |
| `Eier 6 Stück` | `{ name: 'Eier', qty: '6 Stück' }` |
| `Bier 6 Flaschen` | `{ name: 'Bier', qty: '6 Flaschen' }` |
| `Butter (2)` | `{ name: 'Butter', qty: '2' }` |
| `Bier (eventuell helles ansonsten Marke egal)` | `{ name: 'Bier (eventuell helles ansonsten Marke egal)', qty: '' }` |
| `Tiptoi Mail` | `{ name: 'Tiptoi Mail', qty: '' }` |
| `Cola Zero` | `{ name: 'Cola Zero', qty: '' }` |
| `Omega 3` | `{ name: 'Omega 3', qty: '' }` |
| `Nivea 24h` | `{ name: 'Nivea 24h', qty: '' }` |
| `Playstation 5` | `{ name: 'Playstation 5', qty: '' }` |
| `2 Stück Eier 3x` | `{ name: 'Eier 3x', qty: '2 Stück' }` |
| `normalize('Quark 2x')` | `normalize('Quark')` |

## Testausgabe

Letzte 5 Zeilen von `node --test '*.test.mjs' | tail -5`:

```text
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 521.918834
```

## Offene Punkte

Keine.
