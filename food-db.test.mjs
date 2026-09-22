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
