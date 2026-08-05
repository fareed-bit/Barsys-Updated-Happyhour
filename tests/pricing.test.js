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

/* ---- Glassware: the 'block' add-on type ----
   The rental minimum is $900 for 385 glasses covering 200 guests. Neither
   'flat' nor 'per-person' can express that, so these pin the stepping. */

test('glassware is one service while glasses fit in 385', () => {
  const glass = BarsysPricing.findAddOn('glassware');
  // 2 glasses per guest, so 385 glasses covers floor(385/2) = 192 guests
  assert.strictEqual(BarsysPricing.addOnCost(glass, 20), 1200);   // 40 glasses
  assert.strictEqual(BarsysPricing.addOnCost(glass, 50), 1200);   // 100
  assert.strictEqual(BarsysPricing.addOnCost(glass, 192), 1200);  // 384 — still one
});

test('glassware steps at 193 guests, not 201', () => {
  const glass = BarsysPricing.findAddOn('glassware');
  // Regression: counting guests at 200-per-service under-charged $900 across
  // 193-200. 200 guests needs 400 glasses, which is two services.
  assert.strictEqual(BarsysPricing.addOnCost(glass, 193), 2400);  // 386 glasses
  assert.strictEqual(BarsysPricing.addOnCost(glass, 200), 2400);  // 400
  assert.strictEqual(BarsysPricing.addOnCost(glass, 300), 2400);  // 600
  assert.strictEqual(BarsysPricing.addOnCost(glass, 385), 2400);  // 770
});

test('glassware steps to a third service at 386 guests', () => {
  const glass = BarsysPricing.findAddOn('glassware');
  assert.strictEqual(BarsysPricing.addOnCost(glass, 386), 3600);  // 772 glasses
  assert.strictEqual(BarsysPricing.addOnCost(glass, 400), 3600);  // 800
  assert.strictEqual(BarsysPricing.addOnCost(glass, 500), 3600);  // 1000
});

test('the overage add-on is free while one service covers the event', () => {
  const extra = BarsysPricing.findAddOn('glassware-extra');
  assert.strictEqual(BarsysPricing.addOnCost(extra, 50), 0);
  assert.strictEqual(BarsysPricing.addOnCost(extra, 192), 0);
});

test('the overage add-on charges only for services beyond the first', () => {
  const extra = BarsysPricing.findAddOn('glassware-extra');
  assert.strictEqual(BarsysPricing.addOnCost(extra, 193), 900);
  assert.strictEqual(BarsysPricing.addOnCost(extra, 200), 900);
  assert.strictEqual(BarsysPricing.addOnCost(extra, 385), 900);
  assert.strictEqual(BarsysPricing.addOnCost(extra, 386), 1800);
  assert.strictEqual(BarsysPricing.addOnCost(extra, 500), 1800);
});

test('glasses are exactly two per guest', () => {
  const glass = BarsysPricing.findAddOn('glassware');
  assert.strictEqual(glass.glassesPerGuest, 2);
  assert.strictEqual(glass.glassesPerBlock, 385);
  // the figures quoted by the operator: 200 -> 400, 300 -> 600
  assert.strictEqual(200 * glass.glassesPerGuest, 400);
  assert.strictEqual(300 * glass.glassesPerGuest, 600);
});

test('a block add-on never goes negative below its free allowance', () => {
  const extra = BarsysPricing.findAddOn('glassware-extra');
  assert.strictEqual(BarsysPricing.addOnCost(extra, 0), 0);
  assert.strictEqual(BarsysPricing.addOnCost(extra, 1), 0);
});

test('plastic cups are plain per-person with no minimum', () => {
  const cups = BarsysPricing.findAddOn('plastic-cups');
  assert.strictEqual(BarsysPricing.addOnCost(cups, 50), 100);
  assert.strictEqual(BarsysPricing.addOnCost(cups, 250), 500);
});

test('block cost flows into the full quote', () => {
  // Signature 250 guests + one overage service
  const r = BarsysPricing.calculate({
    guests: 250, tier: 'Signature', isMember: false,
    frequency: 'Single Event', recurringCadence: '',
    addOns: ['glassware-extra'], spiritUpchargePerPerson: 0,
  });
  assert.strictEqual(r.addOnTotal, 900);
  assert.strictEqual(r.subtotal, 18400);      // 70*250 + 900
  assert.strictEqual(r.grandTotal, 20033);    // matches the browser-verified figure
});

test('Classic-only add-ons are not offered to Signature or Reserve', () => {
  const classic = BarsysPricing.addOnsForTier('Classic').map(a => a.id);
  const sig = BarsysPricing.addOnsForTier('Signature').map(a => a.id);
  const res = BarsysPricing.addOnsForTier('Reserve').map(a => a.id);

  assert.ok(classic.includes('glassware'));
  assert.ok(classic.includes('plastic-cups'));
  assert.ok(!classic.includes('glassware-extra'), 'Classic must not see the overage');

  assert.ok(!sig.includes('glassware'), 'Signature already includes glassware');
  assert.ok(!sig.includes('plastic-cups'));
  assert.ok(sig.includes('glassware-extra'));
  assert.ok(res.includes('glassware-extra'));
});

test('untiered add-ons stay available to every tier', () => {
  for (const t of ['Classic', 'Signature', 'Reserve']) {
    const ids = BarsysPricing.addOnsForTier(t).map(a => a.id);
    assert.ok(ids.includes('extra-hour'), `${t} lost extra-hour`);
    assert.ok(ids.includes('beer-wine'), `${t} lost beer-wine`);
  }
});
