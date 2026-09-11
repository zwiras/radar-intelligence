import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BY_COUNTRY, googleNews } from '../lib/connectors/googlenews';
import { toCountryCode } from '../lib/country-codes';
import { localeTag, tFor } from '../lib/i18n-dict';
import { localeDirective } from '../lib/content-locale';

test('Polish locale exposes translated UI labels and Polish formats', () => {
  const t = tFor('pl');
  assert.equal(t('ui.country', 'Country'), 'Kraj');
  assert.equal(t('page.listening.title', 'Listening'), 'Nasłuch');
  assert.equal(localeTag('pl'), 'pl-PL');
  assert.match(localeDirective('pl'), /Polish/);
});

test('Poland is normalized and supported by Google News', () => {
  assert.equal(toCountryCode('Polska'), 'pl');
  assert.equal(toCountryCode('Poland'), 'pl');
  assert.deepEqual(BY_COUNTRY.PL, { hl: 'pl', gl: 'PL', ceid: 'PL:pl' });
  assert.equal(googleNews.id, 'googlenews');
});
