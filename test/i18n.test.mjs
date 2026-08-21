/**
 * i18n dictionary tests: both locales must carry the same key set with the
 * same {placeholder} vocabulary (the bundle build does not typecheck, so
 * parity is enforced here), and t() must substitute + follow setLocale.
 *
 * Imports the TS source directly — Node ≥22.18 strips the types.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { DICTS, t, setLocale, normalizeLocale } from '../src/client/i18n.ts'

test('en and zh dictionaries carry the same key set', () => {
  const enKeys = Object.keys(DICTS.en).sort()
  const zhKeys = Object.keys(DICTS.zh).sort()
  assert.deepEqual(zhKeys, enKeys)
})

test('zh values use the same placeholders as their en counterparts', () => {
  const ph = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join(',')
  for (const k of Object.keys(DICTS.en)) {
    assert.equal(ph(DICTS.zh[k]), ph(DICTS.en[k]), k)
  }
})

test('t() substitutes vars, pluralizes on n=1, and follows setLocale', () => {
  setLocale('en')
  assert.equal(t('group.calls', { n: 3 }), '3 calls')
  assert.equal(t('group.calls', { n: 1 }), '1 call')
  assert.equal(t('panel.turns', { n: 1 }), '1 turn')
  assert.equal(t('detail.response', { n: 1 }), 'Response · 1 block')
  setLocale('zh')
  assert.equal(t('group.calls', { n: 3 }), '3 次调用')
  assert.equal(t('group.calls', { n: 1 }), '1 次调用')
  setLocale('en')
})

test('normalizeLocale maps zh tags to zh, everything else to en', () => {
  assert.equal(normalizeLocale('zh-CN'), 'zh')
  assert.equal(normalizeLocale('zh'), 'zh')
  assert.equal(normalizeLocale('ZH-tw'), 'zh')
  assert.equal(normalizeLocale('en-US'), 'en')
  assert.equal(normalizeLocale('fr'), 'en')
  assert.equal(normalizeLocale(undefined), 'en')
  assert.equal(normalizeLocale(42), 'en')
})
