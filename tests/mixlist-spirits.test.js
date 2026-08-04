const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { BarsysMixlistSpirits: M } = require('../js/mixlist-spirits.js');

test("Agave Lover's yields tequila and mezcal", () => {
  assert.deepStrictEqual(M.categoriesFor(["The Agave Lover's"]), ['Tequila', 'Mezcal']);
});

test('no selection falls back to the tier default (null)', () => {
  assert.strictEqual(M.categoriesFor([]), null);
  assert.strictEqual(M.categoriesFor(null), null);
  assert.strictEqual(M.categoriesFor(undefined), null);
});

test('Skip falls back to the tier default (null)', () => {
  assert.strictEqual(M.categoriesFor(['Skip']), null);
});

test('a spritz-only menu yields an empty list, not a fallback', () => {
  // Meaningfully different from null: there is nothing to upgrade.
  assert.deepStrictEqual(M.categoriesFor(['Après Spritz Club']), []);
});

test('unknown menu names are ignored and fall back', () => {
  assert.strictEqual(M.categoriesFor(['Not A Real Mixlist']), null);
});

test('unknown names mixed with real ones use only the real ones', () => {
  assert.deepStrictEqual(
    M.categoriesFor(['Not A Real Mixlist', 'Sombra & Sol']),
    ['Tequila', 'Mezcal']
  );
});

test('multiple menus union their categories', () => {
  assert.deepStrictEqual(
    M.categoriesFor(["The Agave Lover's", 'Clear Coast']),
    ['Tequila', 'Mezcal', 'Rum']
  );
});

test('a phantom Gin is not derived from "Ginger Beer"', () => {
  // Regression: a leading-only \b made "gin" match "Ginger", which added a
  // Gin row to four menus that pour none.
  assert.deepStrictEqual(M.deriveFromIngredients('Teremana Anejo, Ginger Beer'), ['Tequila']);
  assert.deepStrictEqual(M.deriveFromIngredients('Vodka, Ginger Beer, Lime'), ['Vodka']);
});

test('brands are recognised without their category word', () => {
  assert.deepStrictEqual(M.deriveFromIngredients('Teremana Reposado, Lime'), ['Tequila']);
  assert.deepStrictEqual(M.deriveFromIngredients('Bulleit Rye, Vermouth'), ['Whiskey']);
  assert.deepStrictEqual(M.deriveFromIngredients('Sipsmith, Tonic'), ['Gin']);
});

test('union is deduplicated', () => {
  assert.deepStrictEqual(
    M.categoriesFor(['Confessions in Glass', 'Fluid Code']), ['Gin']
  );
});

test('output is always in canonical order regardless of input order', () => {
  const a = M.categoriesFor(['Clear Coast', "The Agave Lover's"]);
  const b = M.categoriesFor(["The Agave Lover's", 'Clear Coast']);
  assert.deepStrictEqual(a, b);
  assert.deepStrictEqual(a, ['Tequila', 'Mezcal', 'Rum']);
});

test('a spritz menu combined with a real one yields the real one', () => {
  assert.deepStrictEqual(
    M.categoriesFor(['Après Spritz Club', 'Clear Coast']),
    ['Rum']
  );
});

test('every table entry uses only known categories', () => {
  Object.entries(M.MIXLIST_SPIRITS).forEach(([name, cats]) => {
    cats.forEach(c => {
      assert.ok(M.CATEGORY_ORDER.includes(c), `${name} has unknown category ${c}`);
    });
  });
});

test('deriveFromIngredients rolls bourbon, rye and scotch into Whiskey', () => {
  assert.deepStrictEqual(M.deriveFromIngredients('Bourbon, Bitters'), ['Whiskey']);
  assert.deepStrictEqual(M.deriveFromIngredients('Rye, Sweet Vermouth'), ['Whiskey']);
  assert.deepStrictEqual(M.deriveFromIngredients('Scotch, Honey'), ['Whiskey']);
});

test('deriveFromIngredients finds nothing in a spritz', () => {
  assert.deepStrictEqual(M.deriveFromIngredients('Aperol, Prosecco, Soda'), []);
});

test('deriveFromIngredients is not fooled by substrings', () => {
  // "Virgin" contains "gin" but is not gin; the \b anchor must prevent a match.
  assert.deepStrictEqual(M.deriveFromIngredients('Virgin Mary mix'), []);
});

/* Drift guard: the curated table must still match MIXLIST_RECIPES — the recipe
   set the mixlist modal shows a customer. If someone edits a recipe, this fails
   loudly instead of the spirits step quietly listing the wrong liquors. */
test('MIXLIST_SPIRITS matches MIXLIST_RECIPES in main.js', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');
  const start = src.indexOf('var MIXLIST_RECIPES');
  assert.ok(start > -1, 'MIXLIST_RECIPES not found in main.js');
  const seg = src.slice(start, src.indexOf('\n      };', start));

  const derived = {};
  for (const b of seg.split(/\n        (?=['"])/)) {
    const m = b.match(/^(?:'((?:[^'\\]|\\.)*)'|"([^"]*)"): \{/);
    if (!m) continue;
    const name = (m[1] || m[2]).replace(/\\'/g, "'");
    const ingredients = [...b.matchAll(/ingredients: '([^']+)'/g)].map(x => x[1]).join(' ');
    derived[name] = M.deriveFromIngredients(ingredients);
  }

  assert.strictEqual(
    Object.keys(derived).length,
    Object.keys(M.MIXLIST_SPIRITS).length,
    'menu count drifted between main.js and mixlist-spirits.js'
  );
  for (const [name, cats] of Object.entries(derived)) {
    assert.deepStrictEqual(
      M.MIXLIST_SPIRITS[name], cats,
      `${name}: table says ${JSON.stringify(M.MIXLIST_SPIRITS[name])} but recipes derive ${JSON.stringify(cats)}`
    );
  }
});
