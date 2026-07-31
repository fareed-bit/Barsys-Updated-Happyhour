const test = require('node:test');
const assert = require('node:assert');
const { BarsysPricing } = require('../js/pricing.js');

const base = {
  guests: 50, tier: 'Signature', isMember: false,
  frequency: 'Single Event', recurringCadence: '',
  addOns: [], spiritUpchargePerPerson: 0,
};

test('default quote: 50 guests, Signature', () => {
  const r = BarsysPricing.calculate(base);
  assert.strictEqual(r.subtotal, 3500);
  assert.strictEqual(r.tax, 310.63);
  assert.strictEqual(r.grandTotal, 3810.63);
});

test('member pricing uses the member table', () => {
  const r = BarsysPricing.calculate({ ...base, isMember: true });
  assert.strictEqual(r.basePerPerson, 65);
  assert.strictEqual(r.subtotal, 3250);
});

test('quarterly recurring subtracts $10 per person', () => {
  const r = BarsysPricing.calculate({
    ...base, frequency: 'Recurring Program', recurringCadence: 'Quarterly',
  });
  assert.strictEqual(r.discountPerPerson, 10);
  assert.strictEqual(r.effectivePerPerson, 60);
  assert.strictEqual(r.subtotal, 3000);
});

test('monthly recurring subtracts $5 per person', () => {
  const r = BarsysPricing.calculate({
    ...base, frequency: 'Recurring Program', recurringCadence: 'Monthly',
  });
  assert.strictEqual(r.effectivePerPerson, 65);
});

test('cadence is ignored for a single event', () => {
  const r = BarsysPricing.calculate({ ...base, recurringCadence: 'Quarterly' });
  assert.strictEqual(r.discountPerPerson, 0);
  assert.strictEqual(r.effectivePerPerson, 70);
});

test('flat add-on is not multiplied by guests', () => {
  const r = BarsysPricing.calculate({ ...base, addOns: ['extra-hour'] });
  assert.strictEqual(r.addOnTotal, 500);
});

test('per-person add-on is multiplied by guests', () => {
  const r = BarsysPricing.calculate({ ...base, addOns: ['beer-wine'] });
  assert.strictEqual(r.addOnTotal, 750);
});

test('spirit upcharge is per person', () => {
  const r = BarsysPricing.calculate({ ...base, spiritUpchargePerPerson: 8 });
  assert.strictEqual(r.spiritTotal, 400);
});

test('unknown add-on ids are ignored', () => {
  const r = BarsysPricing.calculate({ ...base, addOns: ['does-not-exist'] });
  assert.strictEqual(r.addOnTotal, 0);
});

test('effective per-person never goes negative', () => {
  const r = BarsysPricing.calculate({
    ...base, tier: 'Classic', frequency: 'Recurring Program',
    recurringCadence: 'Quarterly',
  });
  assert.ok(r.effectivePerPerson >= 0);
});

test('zero guests yields a zero subtotal', () => {
  const r = BarsysPricing.calculate({ ...base, guests: 0 });
  assert.strictEqual(r.subtotal, 0);
  assert.strictEqual(r.grandTotal, 0);
});

test('reserve tier at scale', () => {
  const r = BarsysPricing.calculate({ ...base, guests: 250, tier: 'Reserve' });
  assert.strictEqual(r.subtotal, 50000);
  assert.strictEqual(r.grandTotal, 54437.5);
});

test('an unknown tier prices at zero rather than NaN', () => {
  const r = BarsysPricing.calculate({ ...base, tier: 'Nonexistent' });
  assert.strictEqual(r.basePerPerson, 0);
  assert.ok(!Number.isNaN(r.grandTotal));
});
