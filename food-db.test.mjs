import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, categorize } from './dist/food-db.js';

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
  ['Reis', 'pasta_grains'],
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
  test(`categorize(${JSON.stringify(name)}) -> ${expected}`, () => {
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

import { emojiFor, splitQuantity, normalize, suggest } from './dist/food-db.js';

test('emojiFor: direkter Treffer, längster Substring, Kategorie-Fallback, 🛒', () => {
  assert.equal(emojiFor('Milch'), '🥛');
  assert.equal(emojiFor('Frischkäse'), emojiFor('frischkäse'));
  assert.notEqual(emojiFor('Frischkäse'), '🛒');
  assert.equal(emojiFor('Alufolie'), '🛒');
  assert.equal(emojiFor(''), '🛒');
  assert.equal(emojiFor('Kalbfleisch'), emojiFor('Kalbfleisch'));
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
