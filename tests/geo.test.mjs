import test from 'node:test';
import assert from 'node:assert/strict';
import { boundsFor, dateError, imageUrl, toPercent, fromPercent, validPlaces } from '../lib/geo.ts';
const place = { id: 1, name: 'Guwahati', latitude: 26.1844, longitude: 91.7458 };
test('invalid, reversed and unavailable dates are rejected', () => {
  for (const [a,b] of [['2024-02-30','2025-01-01'],['2025-01-01','2024-01-01'],['1999-01-01','2024-01-01'],['2025-01-01','2099-01-01'],['2024-01-01','2024-01-01']]) assert.ok(dateError(a,b,'2026-10-10'));
  assert.equal(dateError('2024-02-29','2025-02-28','2026-10-10'), '');
});
test('same location maps to center in geographic bounds and annotation round trips', () => {
  const b = boundsFor(place, 80); const p = toPercent([place.longitude,place.latitude],b);
  assert.ok(Math.abs(p[0]-50)<1e-8 && Math.abs(p[1]-50)<1e-8);
  const point = fromPercent(22,78,b); const roundtrip=toPercent(point,b);
  assert.ok(Math.abs(roundtrip[0]-22)<1e-8 && Math.abs(roundtrip[1]-78)<1e-8);
});
test('images share identical geographic extent but request distinct dates', () => {
  const b=boundsFor(place,80); const a=new URL(imageUrl(b,'2024-02-14')); const c=new URL(imageUrl(b,'2025-02-19'));
  assert.equal(a.searchParams.get('BBOX'),c.searchParams.get('BBOX'));
  assert.notEqual(a.searchParams.get('TIME'),c.searchParams.get('TIME'));
  assert.equal(a.searchParams.get('SRS'),'EPSG:4326');
  assert.equal(a.searchParams.get('BBOX'),b.join(','));
});
test('out of range coordinates and unrelated airport results do not become cities', () => {
  assert.deepEqual(validPlaces([place,{...place,id:2,feature_code:'AIRP'},{...place,id:3,latitude:NaN},{...place,id:4,longitude:181}]),[place]);
  assert.deepEqual(validPlaces(null),[]);
});
