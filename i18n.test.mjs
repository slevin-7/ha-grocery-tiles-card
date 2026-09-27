import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGS, t, pickLang } from './dist/i18n.js';

test('jede Sprache hat exakt dieselben Keys wie en', () => {
  const en = Object.keys(LANGS.en).sort();
  for (const [lang, table] of Object.entries(LANGS)) {
    assert.deepEqual(Object.keys(table).sort(), en, `Keys von ${lang} weichen von en ab`);
    for (const [k, v] of Object.entries(table)) assert.ok(v.trim(), `${lang}.${k} ist leer`);
  }
});

test('Platzhalter werden ersetzt', () => {
  assert.equal(t('de', 'show_more', { n: 3 }), 'mehr anzeigen (3)');
  assert.equal(t('en', 'already_on_list', { name: 'Milk' }), '"Milk" is already on the list');
});

test('unbekannte Sprache fällt auf en zurück, unbekannter Key auf den Key', () => {
  assert.equal(t('fr', 'recent'), 'Recently');
  assert.equal(t('de', 'nope_key'), 'nope_key');
});

test('Sprachcodes werden auf zwei Buchstaben gekürzt', () => {
  assert.equal(t('de-DE', 'recent'), 'Zuletzt');
  assert.equal(t('it-IT', 'recent'), 'Di recente');
  assert.equal(pickLang({ language: 'it' }, { locale: { language: 'de-DE' } }), 'it');
  assert.equal(pickLang({ language: '' }, { locale: { language: 'de-DE' } }), 'de');
  assert.equal(pickLang({}, { language: 'it' }), 'it');
  assert.equal(pickLang({}, {}), 'en');
  assert.equal(pickLang({}, { language: 'fr' }), 'en');
});
