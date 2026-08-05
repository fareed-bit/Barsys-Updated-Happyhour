/* Which spirits does a cocktail menu actually pour?

   The spirits step used to list a fixed set of four categories per tier,
   regardless of the menus chosen — so The Agave Lover's offered vodka and gin
   swaps it never uses, and no mezcal swap for the mezcal it does.

   MIXLIST_SPIRITS is derived from MIXLIST_RECIPES in main.js — the recipe set
   the mixlist modal actually shows a customer. Deriving from the other drink
   list (mixlistData) would contradict what they are looking at; the two
   datasets disagree for 14 of 20 menus, which is a content problem tracked
   separately.

   Loads as a browser global (window.BarsysMixlistSpirits) and a Node module. */
(function (root) {
  'use strict';

  /* Display order, roughly light -> dark, so the UI is stable no matter what
     order the user picks menus in. */
  var CATEGORY_ORDER = ['Vodka', 'Gin', 'Tequila', 'Mezcal', 'Rum', 'Whiskey'];

  /* Keyword -> category. Matched with a word boundary at BOTH ends: a leading
     boundary alone makes "gin" match "Ginger Beer", which silently added a
     phantom Gin row to four menus.

     Brands are listed because several recipes name a spirit without its
     category — "Teremana Añejo" is tequila, "Bulleit Rye" is whiskey. */
  var SPIRIT_KEYWORDS = [
    ['mezcal', 'Mezcal'],
    ['tequila', 'Tequila'],
    ['teremana', 'Tequila'],
    ['casamigos', 'Tequila'],
    ['vodka', 'Vodka'],
    ['ketel one', 'Vodka'],
    ['reyka', 'Vodka'],
    ['gin', 'Gin'],
    ['sipsmith', 'Gin'],
    ['rum', 'Rum'],
    ['bacardi', 'Rum'],
    ['bourbon', 'Whiskey'],
    ['rye', 'Whiskey'],
    ['whiskey', 'Whiskey'],
    ['whisky', 'Whiskey'],
    ['scotch', 'Whiskey'],
    ['bulleit', 'Whiskey']
  ];

  /* An empty array is meaningful: that menu has no base spirit with an upgrade
     ladder. Après Spritz Club is aperitivo + Prosecco throughout; 13 Botanicals
     is brandy and Cynar. Both correctly offer nothing to swap. */
  var MIXLIST_SPIRITS = {
    'The Signature Mixlist': ['Vodka', 'Tequila'],
    'The Vibrant Classics': ['Rum', 'Whiskey'],
    "The Agave Lover's": ['Tequila', 'Mezcal'],
    'Après Spritz Club': [],
    'Neon Shadows': ['Vodka'],
    'Bold Frequency': ['Whiskey'],
    'Sharp & Steady': ['Vodka', 'Tequila', 'Whiskey'],
    'Silk & Snap': ['Vodka'],
    'Clear Coast': ['Rum'],
    'Dusk to Agave': ['Tequila'],
    'Molasses Theory': ['Rum'],
    'Fluid Code': [],
    'The Bold Circuit': ['Whiskey'],
    'Love at First Sip': ['Vodka'],
    'Confessions in Glass': ['Gin'],
    'Sombra & Sol': ['Tequila', 'Mezcal'],
    'Flora-Bitter': ['Vodka'],
    'Punt, Pass, & Pour': ['Tequila'],
    'Turf & Tonic': ['Whiskey'],
    '13 Botanicals': []
  };

  function deriveFromIngredients(text) {
    var haystack = String(text || '').toLowerCase();
    var found = {};
    SPIRIT_KEYWORDS.forEach(function (pair) {
      if (new RegExp('\\b' + pair[0] + '\\b').test(haystack)) found[pair[1]] = true;
    });
    return CATEGORY_ORDER.filter(function (c) { return found[c]; });
  }

  /* Returns:
       null  -> no menus chosen (or "Skip"); caller should fall back to the
                tier's default spirit list, i.e. today's behaviour
       []    -> menus chosen, but none has a base spirit we can upgrade
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
