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
    { id: 'photographer',     name: 'Event Photographer (2 hrs)',        price: 800, type: 'flat',       desc: 'Professional photographer for candid and posed shots' }
  ];

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
      var cost = addon.type === 'flat' ? addon.price : addon.price * guests;
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
