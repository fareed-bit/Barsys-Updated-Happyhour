/* Barsys pricing engine — pure arithmetic, no DOM.
   Loads as a browser global (window.BarsysPricing) and as a Node module.

   Rates, rounding and formula are transcribed verbatim from the original
   wizard IIFE in js/main.js. Do not change any figure here without a
   corresponding decision — these are the live prices for
   happyhours.barsys.com. */
(function (root) {
  'use strict';

  var TAX_RATE = 0.08875;
  var TIER_BASE   = { Classic: 50, Signature: 70, Reserve: 200 };
  var TIER_MEMBER = { Classic: 45, Signature: 65, Reserve: 190 };
  var RECURRING_DISCOUNTS = { Monthly: 5, Quarterly: 10 };

  var ADD_ONS = [
    { id: 'extra-hour',       name: 'Extra Hour of Service',             price: 500, type: 'flat',       desc: 'Extend your event by one additional hour' },
    { id: 'extra-mixlist',    name: 'Additional Mixlist',                price: 5,   type: 'per-person', desc: 'Add one more cocktail menu beyond your package limit' },
    { id: 'premium-garnish',  name: 'Premium Garnish Upgrade',           price: 8,   type: 'per-person', desc: 'Fresh fruit, edible flowers, and artisan garnishes' },
    { id: 'branded-items',    name: 'Custom Branded Napkins & Stirrers', price: 350, type: 'flat',       desc: 'Your logo on cocktail napkins and stirrers' },
    { id: 'mocktail-station', name: 'Non-Alcoholic Cocktail Station',    price: 12,  type: 'per-person', desc: 'Dedicated zero-proof craft cocktail menu' },
    { id: 'beer-wine',        name: 'Beer & Wine Supplement',            price: 15,  type: 'per-person', desc: 'Curated craft beer and wine alongside cocktails' },
    { id: 'photographer',     name: 'Event Photographer (2 hrs)',        price: 800, type: 'flat',       desc: 'Professional photographer for candid and posed shots' },

    /* ---- Drinkware ----
       The glassware rental company bills a MINIMUM of $900 for 385 glasses,
       which covers 200 guests. There is no smaller order and no per-glass rate,
       so neither 'flat' nor 'per-person' can price it: flat under-quotes every
       event over 200 guests ($900 short at 250, $1,800 at 500), and per-person
       under-quotes every event under 385 glasses (50 guests would charge ~$117
       against a $900 invoice).

       Hence type 'block', counted in GLASSES:
           glasses = guests x glassesPerGuest
           cost    = max(0, ceil(glasses / glassesPerBlock) - freeBlocks) x price

       `freeBlocks: 1` expresses "the first service is already included in this
       tier", so one formula serves both the Classic add-on and the
       Signature/Reserve overage.

       `tiers` restricts which packages may select an add-on. Without it a
       Classic booking could select the Signature/Reserve overage and be charged
       $900+ for topping up a service it never included. */
    { id: 'plastic-cups',     name: 'Premium Plastic Tumblers',          price: 2,    type: 'per-person', tiers: ['Classic'], desc: 'Heavyweight clear tumblers — no rental minimum, scales to any headcount' },
    { id: 'glassware',        name: 'Real Glassware Rental',             price: 1200, type: 'block', glassesPerGuest: 2, glassesPerBlock: 385, freeBlocks: 0, tiers: ['Classic'], desc: 'Real glass at 2 per guest, rented in services of 385 glasses' },
    { id: 'glassware-extra',  name: 'Additional Glassware Service',      price: 900,  type: 'block', glassesPerGuest: 2, glassesPerBlock: 385, freeBlocks: 1, tiers: ['Signature', 'Reserve'], desc: 'Only applies above 192 guests — your tier already includes the first 385-glass service' }
  ];

  /* Cost of one add-on at a given headcount. Exported because the wizard needs
     the same number for its price label — computing it twice would let the
     label and the quote drift apart. */
  function addOnCost(addon, guests) {
    if (!addon) return 0;
    guests = parseInt(guests, 10) || 0;
    if (addon.type === 'block') {
      /* Counted in glasses, not guests. An event uses 2 glasses per guest, so a
         385-glass service covers floor(385/2) = 192 guests — not 200. Counting
         guests at 200-per-service under-charged $900 across 193-200 and
         386-400 guests. */
      var glasses = guests * (addon.glassesPerGuest || 1);
      var perBlock = addon.glassesPerBlock || 1;
      var blocks = Math.max(0, Math.ceil(glasses / perBlock) - (addon.freeBlocks || 0));
      return blocks * addon.price;
    }
    if (addon.type === 'flat') return addon.price;
    return addon.price * guests;
  }

  /* How many guests to trim to drop a whole service. At 200 guests you need 400
     glasses = 2 services; 192 fits 384 into one, so losing 8 guests saves a full
     $1,200. Returns null unless the trim is realistic (<= maxTrim), because at
     250 guests the boundary is 58 back and the advice would be noise. */
  function blockTrimHint(addon, guests, maxTrim) {
    if (!addon || addon.type !== 'block') return null;
    guests = parseInt(guests, 10) || 0;
    maxTrim = maxTrim || 15;

    var gpg = addon.glassesPerGuest || 1;
    var gpb = addon.glassesPerBlock || 1;
    var total = Math.ceil(guests * gpg / gpb);
    if (total < 2) return null;

    var toGuests = Math.floor((total - 1) * gpb / gpg);
    var trim = guests - toGuests;
    if (trim < 1 || trim > maxTrim) return null;

    var free = addon.freeBlocks || 0;
    var saving = (Math.max(0, total - free) - Math.max(0, total - 1 - free)) * addon.price;
    if (saving <= 0) return null;
    return { trim: trim, toGuests: toGuests, saving: saving };
  }

  /* Add-ons a tier is allowed to select. No `tiers` field means "any tier". */
  function addOnsForTier(tier) {
    return ADD_ONS.filter(function (a) {
      return !a.tiers || a.tiers.indexOf(tier) > -1;
    });
  }

  function findAddOn(id) {
    for (var i = 0; i < ADD_ONS.length; i++) {
      if (ADD_ONS[i].id === id) return ADD_ONS[i];
    }
    return null;
  }

  function calculate(input) {
    input = input || {};
    var guests = parseInt(input.guests, 10) || 0;
    var tier = input.tier || '';
    var isMember = !!input.isMember;
    var basePerPerson = isMember ? (TIER_MEMBER[tier] || 0) : (TIER_BASE[tier] || 0);

    var discountPerPerson = 0;
    if (input.frequency === 'Recurring Program' && input.recurringCadence) {
      discountPerPerson = RECURRING_DISCOUNTS[input.recurringCadence] || 0;
    }
    var effectivePerPerson = Math.max(0, basePerPerson - discountPerPerson);
    var baseTotal = effectivePerPerson * guests;

    var addOnTotal = 0;
    var addOnDetails = [];
    (input.addOns || []).forEach(function (id) {
      var addon = findAddOn(id);
      if (!addon) return;
      var cost = addOnCost(addon, guests);
      addOnTotal += cost;
      addOnDetails.push({ name: addon.name, cost: cost });
    });

    var spiritUpchargePerPerson = input.spiritUpchargePerPerson || 0;
    var spiritTotal = spiritUpchargePerPerson * guests;
    var subtotal = baseTotal + addOnTotal + spiritTotal;
    var tax = Math.round(subtotal * TAX_RATE * 100) / 100;

    return {
      guests: guests, tier: tier, isMember: isMember,
      basePerPerson: basePerPerson, effectivePerPerson: effectivePerPerson,
      discountPerPerson: discountPerPerson, baseTotal: baseTotal,
      addOnDetails: addOnDetails, addOnTotal: addOnTotal,
      spiritUpchargePerPerson: spiritUpchargePerPerson, spiritTotal: spiritTotal,
      subtotal: subtotal, tax: tax, grandTotal: subtotal + tax
    };
  }

  var api = {
    calculate: calculate,
    findAddOn: findAddOn,
    addOnCost: addOnCost,
    addOnsForTier: addOnsForTier,
    blockTrimHint: blockTrimHint,
    ADD_ONS: ADD_ONS,
    TIER_BASE: TIER_BASE,
    TIER_MEMBER: TIER_MEMBER,
    TAX_RATE: TAX_RATE,
    RECURRING_DISCOUNTS: RECURRING_DISCOUNTS
  };

  root.BarsysPricing = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BarsysPricing: api };
  }
})(typeof window !== 'undefined' ? window : globalThis);
