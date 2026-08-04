/* Which spirits does a cocktail menu actually pour?

   The spirits step used to list a fixed set of four categories per tier,
   regardless of the menus chosen — so The Agave Lover's offered vodka and gin
   swaps it never uses, and no mezcal swap for the mezcal it does.

   MIXLIST_SPIRITS below is derived from the base spirits in each menu's drink
   ingredients (see deriveFromIngredients, which the test suite uses to prove
   the table matches the recipe data rather than trusting it by hand).

   Loads as a browser global (window.BarsysMixlistSpirits) and a Node module. */
(function (root) {
  'use strict';

  /* Display order, roughly light -> dark. Keeps the UI stable no matter what
     order the user picks menus in. */
  var CATEGORY_ORDER = ['Vodka', 'Gin', 'Tequila', 'Mezcal', 'Rum', 'Whiskey'];

  /* Keyword -> category. Order matters only for readability; every keyword is
     tested independently. Bourbon/rye/scotch all roll up to Whiskey because
     that is how the upgrade ladder is priced. */
  var SPIRIT_KEYWORDS = [
    ['mezcal', 'Mezcal'],
    ['tequila', 'Tequila'],
    ['vodka', 'Vodka'],
    ['gin', 'Gin'],
    ['rum', 'Rum'],
    ['bourbon', 'Whiskey'],
    ['rye', 'Whiskey'],
    ['whiskey', 'Whiskey'],
    ['whisky', 'Whiskey'],
    ['scotch', 'Whiskey']
  ];

  /* An empty array is meaningful: that menu has no base spirit at all.
     Après Spritz Club is entirely aperitivo + Prosecco, so there is nothing
     to upgrade — the UI says so rather than rendering an empty list. */
  var MIXLIST_SPIRITS = {
    'The Signature Mixlist': ['Vodka', 'Whiskey'],
    'The Vibrant Classics': ['Vodka', 'Gin', 'Tequila', 'Rum'],
    "The Agave Lover's": ['Tequila', 'Mezcal'],
    'Après Spritz Club': [],
    'Neon Shadows': ['Gin', 'Mezcal', 'Rum', 'Whiskey'],
    'Bold Frequency': ['Gin', 'Tequila', 'Whiskey'],
    'Sharp & Steady': ['Gin'],
    'Silk & Snap': ['Vodka', 'Gin'],
    'Clear Coast': ['Rum'],
    'Dusk to Agave': ['Gin', 'Tequila', 'Mezcal'],
    'Molasses Theory': ['Gin', 'Whiskey'],
    'Fluid Code': ['Gin'],
    'The Bold Circuit': ['Gin', 'Whiskey'],
    'Love at First Sip': ['Vodka', 'Gin'],
    'Confessions in Glass': ['Gin'],
    'Sombra & Sol': ['Mezcal'],
    'Flora-Bitter': ['Gin', 'Rum'],
    'Punt, Pass, & Pour': ['Gin', 'Tequila'],
    'Turf & Tonic': ['Gin', 'Whiskey'],
    '13 Botanicals': ['Gin', 'Whiskey']
  };

  function deriveFromIngredients(text) {
    var haystack = String(text || '').toLowerCase();
    var found = {};
    SPIRIT_KEYWORDS.forEach(function (pair) {
      if (new RegExp('\\b' + pair[0]).test(haystack)) found[pair[1]] = true;
    });
    return CATEGORY_ORDER.filter(function (c) { return found[c]; });
  }

  /* Returns:
       null  -> no menus chosen (or "Skip"); caller should fall back to the
                tier's default spirit list, i.e. today's behaviour
       []    -> menus chosen, but none of them pour a base spirit
       [...] -> the union of categories across the chosen menus */
  function categoriesFor(selected) {
    if (!selected || !selected.length) return null;

    var real = [];
    for (var i = 0; i < selected.length; i++) {
      var name = selected[i];
      if (name === 'Skip') continue;
      if (Object.prototype.hasOwnProperty.call(MIXLIST_SPIRITS, name)) real.push(name);
    }
    if (!real.length) return null;

    var found = {};
    real.forEach(function (name) {
      MIXLIST_SPIRITS[name].forEach(function (c) { found[c] = true; });
    });
    return CATEGORY_ORDER.filter(function (c) { return found[c]; });
  }

  var api = {
    categoriesFor: categoriesFor,
    deriveFromIngredients: deriveFromIngredients,
    MIXLIST_SPIRITS: MIXLIST_SPIRITS,
    CATEGORY_ORDER: CATEGORY_ORDER,
    SPIRIT_KEYWORDS: SPIRIT_KEYWORDS
  };

  root.BarsysMixlistSpirits = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BarsysMixlistSpirits: api };
  }
})(typeof window !== 'undefined' ? window : globalThis);
