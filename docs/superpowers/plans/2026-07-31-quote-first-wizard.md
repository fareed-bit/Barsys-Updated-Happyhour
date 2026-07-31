# Quote-First Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 12-screen gated wizard on happyhours.barsys.com with a three-zone quote-first flow that shows a real price on arrival and captures a lead in two fields.

**Architecture:** Extract the existing pricing arithmetic into a dual-target module (browser global + Node export) so it can be unit-tested, then rebuild the wizard markup as three zones — an always-visible quote panel, inline refinement accordions, and a two-field capture form — reusing the extracted engine unchanged. Transport, endpoints and payload field names are untouched.

**Tech Stack:** Vanilla ES5-style JavaScript, no framework, no bundler, no package manager. Node v24 built-in `node --test` for unit tests. GitHub Pages static hosting.

## Global Constraints

- **No new runtime dependencies.** There is no `package.json` and none is to be added for shipping code. Tests use only Node built-ins (`node:test`, `node:assert`).
- **Pricing figures are frozen.** `tierBasePrice = { Classic: 50, Signature: 70, Reserve: 200 }`, `tierMemberPrice = { Classic: 45, Signature: 65, Reserve: 190 }`, `TAX_RATE = 0.08875`, `recurringDiscounts = { Monthly: 5, Quarterly: 10 }`. Do not alter any value.
- **Rounding is exact.** Tax is `Math.round(subtotal * TAX_RATE * 100) / 100`. Totals must match the current engine to the cent.
- **Transport is frozen.** Apps Script endpoint `https://script.google.com/macros/s/AKfycbx6sDtD4jJWw_uB4jOklbZuQHqqNGeT_713qSn_7phF_BUGRPZiyJWhmRlXVffxGQBbvw/exec`, `Content-Type: text/plain;charset=utf-8`, and every key name in `sheetsPayload` stay exactly as they are.
- **Guest bounds stay 20–500** (`clampGuests`, `js/main.js:552`).
- **Never push to `main`.** `main` is production and deploys in ~90 seconds. All work lands on `feat/quote-first-wizard`.
- **Do not touch** `index.html` `<head>` canonical / hreflang / x-default tags (commit `38356e8`), or the `#book` anchor id.

## Preconditions (must be cleared before Task 3)

- [ ] **APEX nullability verified.** Confirm `event_type`, `mixlists`, `address`, `city`, `state` in `inbound_web_leads` accept NULL/empty. A `NOT NULL` fails the insert closed and silently loses leads. This lives in `apex-crm-staging` and requires a separate APEX-scoped session. **Tasks 1 and 2 may proceed without it; Task 5 must not ship without it.**

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `js/pricing.js` | create | Pure pricing arithmetic. No DOM. Browser global + Node export. |
| `tests/pricing.test.js` | create | Unit tests for the pricing module. |
| `js/main.js` | modify | Wizard behaviour; delegates all arithmetic to `pricing.js`. |
| `index.html` | modify | Wizard markup: 12 step divs → 3 zones. |
| `private-events.html` | modify | Repoint from stale `main.min.js` to `main.js`. |
| `js/main.min.js` | delete | Stale duplicate; source of price-drift risk. |

---

### Task 1: Extract the pricing engine into a testable module

The arithmetic currently lives inside a nested IIFE (`js/main.js:164`) and closes over `formData`, so it cannot be imported or tested. Extract it as a pure function taking an explicit input object.

**Files:**
- Create: `js/pricing.js`
- Create: `tests/pricing.test.js`
- Modify: `js/main.js:975-1016` (`calculatePricing`)
- Modify: `index.html` (add `<script src="js/pricing.js">` before `js/main.js`)

**Interfaces:**
- Consumes: nothing.
- Produces: `BarsysPricing.calculate(input)` where
  `input = { guests: number, tier: 'Classic'|'Signature'|'Reserve', isMember: boolean, frequency: string, recurringCadence: string, addOns: string[], spiritUpchargePerPerson: number }`
  returning `{ guests, tier, isMember, basePerPerson, effectivePerPerson, discountPerPerson, baseTotal, addOnDetails, addOnTotal, spiritUpchargePerPerson, spiritTotal, subtotal, tax, grandTotal }`.
  Also `BarsysPricing.ADD_ONS`, `BarsysPricing.TIER_BASE`, `BarsysPricing.TIER_MEMBER`, `BarsysPricing.TAX_RATE`.

- [ ] **Step 1: Write the failing test**

Create `tests/pricing.test.js`:

```javascript
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/kellysinclair/Sentinel connection/Barsys-Updated-Happyhour" && node --test tests/`
Expected: FAIL — `Cannot find module '../js/pricing.js'`.

- [ ] **Step 3: Write the module**

Create `js/pricing.js`. The `ADD_ONS` table and the arithmetic are transcribed verbatim from `js/main.js:189-195` and `js/main.js:975-1016` — do not restate the numbers from memory, copy them.

```javascript
/* Barsys pricing engine — pure arithmetic, no DOM.
   Loads as a browser global (window.BarsysPricing) and as a Node module. */
(function (root) {
  'use strict';

  var TAX_RATE = 0.08875;
  var TIER_BASE   = { Classic: 50, Signature: 70, Reserve: 200 };
  var TIER_MEMBER = { Classic: 45, Signature: 65, Reserve: 190 };
  var RECURRING_DISCOUNTS = { Monthly: 5, Quarterly: 10 };

  var ADD_ONS = [
    { id: 'extra-hour',       name: 'Extra Hour of Service',             price: 500, type: 'flat' },
    { id: 'extra-mixlist',    name: 'Additional Mixlist',                price: 5,   type: 'per-person' },
    { id: 'premium-garnish',  name: 'Premium Garnish Upgrade',           price: 8,   type: 'per-person' },
    { id: 'branded-items',    name: 'Custom Branded Napkins & Stirrers', price: 350, type: 'flat' },
    { id: 'mocktail-station', name: 'Non-Alcoholic Cocktail Station',    price: 12,  type: 'per-person' },
    { id: 'beer-wine',        name: 'Beer & Wine Supplement',            price: 15,  type: 'per-person' },
    { id: 'photographer',     name: 'Event Photographer (2 hrs)',        price: 800, type: 'flat' }
  ];

  function findAddOn(id) {
    for (var i = 0; i < ADD_ONS.length; i++) {
      if (ADD_ONS[i].id === id) return ADD_ONS[i];
    }
    return null;
  }

  function calculate(input) {
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/`
Expected: PASS, 13/13.

- [ ] **Step 5: Delegate from `main.js` and delete the duplicated tables**

In `js/main.js`, replace the body of `calculatePricing` (lines 975-1016) with a call into the module, keeping the same return shape so every existing caller (`updatePricing`, `updateSummaryPanel`, `buildRecommendation`, the submit handler) is unaffected:

```javascript
      function calculatePricing() {
        return window.BarsysPricing.calculate({
          guests: formData.guestCount,
          tier: formData.experienceTier,
          isMember: window.__barsysMemberPricing || false,
          frequency: formData.frequency,
          recurringCadence: formData.recurringCadence,
          addOns: formData.addOns,
          spiritUpchargePerPerson: getSpiritUpchargePerPerson()
        });
      }
```

Then delete the now-duplicated `TAX_RATE` (line 183), `tierBasePrice` (184), `tierMemberPrice` (185) and `recurringDiscounts` (973), and repoint any other readers of those names at `window.BarsysPricing.*`. Leave `tierMixlistLimits` (186) alone — it is not pricing.

Keep `addOnsData` (line 189) for now: it carries `desc` strings used by `renderAddOns`. Replace its `price`/`type` reads with `BarsysPricing.ADD_ONS` in Task 4 rather than duplicating them here.

- [ ] **Step 6: Load the module before `main.js`**

In `index.html`, immediately before the existing `<script src="js/main.js">`:

```html
<script src="js/pricing.js"></script>
```

- [ ] **Step 7: Verify no regression in the browser**

Run: `python3 -m http.server 8080` from the repo root, open `http://localhost:8080/#book`.
Walk the existing wizard to step 9 with 50 guests / Signature / no extras.
Expected: the recommendation reads **$3,810.63**, identical to production. Check the console is clean.

- [ ] **Step 8: Commit**

```bash
git add js/pricing.js tests/pricing.test.js js/main.js index.html
git commit -m "refactor(pricing): extract engine into tested module

No behaviour change. Same formula, same rates, same rounding — now
importable and covered by 13 unit tests via node --test."
```

---

### Task 2: Eliminate the stale minified twin

`index.html` loads `js/main.js` (last changed `fa9f57c`, 2026-06-05) while `private-events.html` loads `js/main.min.js` (last changed `00067b6`, 2026-04-20). The minified copy is roughly seven weeks behind and carries its own copy of the rate card. Prices happen to agree today, but the next price change would ship to one page and not the other. There is no build step to regenerate it.

**Files:**
- Modify: `private-events.html` (script tag)
- Delete: `js/main.min.js`

**Interfaces:**
- Consumes: `js/pricing.js` from Task 1.
- Produces: a single authoritative `js/main.js`.

- [ ] **Step 1: Confirm the divergence before acting**

```bash
git log -1 --format='%ad %h' --date=short -- js/main.js
git log -1 --format='%ad %h' --date=short -- js/main.min.js
grep -c 'totalSteps' private-events.html
```

Expected: two different commits/dates, and a non-zero `totalSteps` count confirming `private-events.html` really runs a wizard.

- [ ] **Step 2: Repoint `private-events.html`**

Replace its `js/main.min.js` script tag with the pair, matching `index.html`'s order:

```html
<script src="js/pricing.js"></script>
<script src="js/main.js"></script>
```

- [ ] **Step 3: Verify the page still works**

With `python3 -m http.server 8080` running, open `http://localhost:8080/private-events.html`.
Expected: the wizard renders and prices correctly; console clean. Note in the commit body if this page's wizard markup differs from `index.html` — Tasks 3-5 will need to cover it too.

- [ ] **Step 4: Delete the stale file**

```bash
git rm js/main.min.js
```

- [ ] **Step 5: Confirm nothing else referenced it**

```bash
grep -rn 'main.min.js' --include=*.html --include=*.js --include=*.toml --include=*.json . || echo "no remaining references"
```

Expected: `no remaining references`. If anything turns up, repoint it before committing.

- [ ] **Step 6: Commit**

```bash
git add private-events.html
git commit -m "fix(js): drop stale main.min.js, single-source main.js

main.min.js was 7 weeks behind main.js and carried a second copy of the
rate card. private-events.html now loads the same scripts as index.html."
```

---

### Task 3: Zone A — instant quote panel

**Blocked on the APEX nullability precondition only for shipping; may be built and reviewed before it clears.**

Replace the `start` gate and steps 1-3 with a single always-visible panel. Guest count and tier ship pre-filled so a price renders with zero clicks.

**Files:**
- Modify: `index.html:1077-1242` (the `start`, `1`, `2`, `3` step divs)
- Modify: `js/main.js:174-182` (`formData` defaults), `:249-297` (`showStep`), `:552-588` (guest stepper)

**Interfaces:**
- Consumes: `BarsysPricing.calculate` (Task 1).
- Produces: `renderQuote()` — reads `formData`, writes the total and per-person figures into `#quote-total` and `#quote-per-person`. Called by every input handler in Zones A and B.

- [ ] **Step 1: Set the defaults**

In `js/main.js`, `formData` (line 174): set `guestCount: 50` and `experienceTier: 'Signature'`. Leave `eventType`, `mixlists`, `addOns`, `frequency`, venue and contact fields at their current empty defaults — they are now optional.

- [ ] **Step 2: Replace the markup**

Delete the four step divs at `index.html:1077` (`data-step="start"`), `:1093` (`"1"`), `:1116` (`"2"`) and `:1133` (`"3"`), and put the quote panel in their place. Reuse the existing tier card markup from the old step 3 so styling carries over; keep the `#book` anchor on its current ancestor section untouched.

```html
<div class="wizard__zone" id="quote-panel">
  <h3 class="wizard__step-title">Your happy hour, priced instantly.</h3>

  <div class="wizard__quote" aria-live="polite">
    <div class="wizard__quote-total" id="quote-total">$3,810.63</div>
    <div class="wizard__quote-per-person" id="quote-per-person">$70 per person &middot; 50 guests &middot; incl. tax</div>
  </div>

  <label class="wizard__label" for="guest-count">Guests</label>
  <div class="wizard__stepper">
    <button type="button" class="wizard__stepper-btn" id="guest-minus" aria-label="Fewer guests">&minus;</button>
    <input type="number" id="guest-count" min="20" max="500" step="5" value="50" inputmode="numeric" />
    <button type="button" class="wizard__stepper-btn" id="guest-plus" aria-label="More guests">+</button>
  </div>

  <fieldset class="wizard__tiers">
    <legend class="wizard__label">Experience</legend>
    <!-- Reuse the three tier cards from the deleted step 3, adding data-tier
         and marking Signature aria-checked="true" by default. -->
  </fieldset>
</div>
```

- [ ] **Step 3: Write `renderQuote`**

Add to the wizard IIFE in `js/main.js`, replacing `updatePricing` (line 1018) as the single render entry point:

```javascript
      function formatUSD(n) {
        return '$' + n.toLocaleString('en-US', {
          minimumFractionDigits: 2, maximumFractionDigits: 2
        });
      }

      function renderQuote() {
        var pricing = calculatePricing();
        var totalEl = document.getElementById('quote-total');
        var perEl = document.getElementById('quote-per-person');
        if (totalEl) totalEl.textContent = formatUSD(pricing.grandTotal);
        if (perEl) {
          var per = pricing.guests > 0 ? pricing.subtotal / pricing.guests : 0;
          perEl.textContent = formatUSD(per).replace('.00', '') +
            ' per person · ' + pricing.guests + ' guests · incl. tax';
        }
        updateSummaryPanel(pricing);
        queueQuoteViewed(pricing);
      }
```

`queueQuoteViewed` is defined in Task 6. Until then, stub it as `function queueQuoteViewed() {}` at the top of the IIFE so Task 3 runs standalone.

- [ ] **Step 4: Wire the inputs**

Bind `guest-minus`, `guest-plus`, the `guest-count` `input` event, and each tier card's `click` to update `formData` and call `renderQuote()`. Keep using the existing `clampGuests` (line 552) for bounds — do not reimplement 20/500.

```javascript
      function setGuests(v) {
        formData.guestCount = clampGuests(v);
        document.getElementById('guest-count').value = formData.guestCount;
        renderQuote();
      }
      document.getElementById('guest-minus').addEventListener('click', function () {
        setGuests(formData.guestCount - 5);
      });
      document.getElementById('guest-plus').addEventListener('click', function () {
        setGuests(formData.guestCount + 5);
      });
      document.getElementById('guest-count').addEventListener('input', function (e) {
        formData.guestCount = clampGuests(e.target.value);
        renderQuote();
      });
```

Note the asymmetry: the `input` handler deliberately does **not** write the clamped value back into the field mid-typing, or typing "1" on the way to "150" would snap to 20. Clamp-and-write-back happens on `blur` instead — add that handler calling `setGuests(e.target.value)`.

- [ ] **Step 5: Retire step navigation for these screens**

`showStep`, `nextStep`, `prevStep` and `validateStep` still drive Zones B and C. Remove `start`, `1`, `2` and `3` from `stepNames` (line 247) and from any `validateStep` branch that referenced them, so no code path can navigate to a div that no longer exists.

- [ ] **Step 6: Verify in the browser**

With the server running, open `http://localhost:8080/#book`.

Expected:
- A total is visible without any click, reading **$3,810.63**, with "$70 per person · 50 guests · incl. tax".
- `+` / `−` move guests by 5 and the total tracks (55 guests Signature → subtotal 3850, tax 341.69, total **$4,191.69**).
- Typing `250` then selecting Reserve gives **$54,437.50**.
- Typing `5` and blurring snaps to 20; typing `900` and blurring snaps to 500.
- Console clean; no reference to a removed step.

- [ ] **Step 7: Commit**

```bash
git add index.html js/main.js
git commit -m "feat(wizard): instant quote panel replaces start + steps 1-3

Guests and tier default to 50/Signature so a real total renders with zero
clicks. Event type moves to the optional block in Zone C."
```

---

### Task 4: Zone B — inline refinement

Convert steps 5, 6 and 7 (spirit upgrades, add-ons, cadence) from sequential screens into collapsed accordions that update the total in place. Delete step 4 (mixlists) and step 8 (venue) from the flow — they move to Zone C's optional block.

**Files:**
- Modify: `index.html:1243-1362` (step 4, delete), `:1363-1391` (steps 5-6), `:1392-1414` (step 7), `:1415-1443` (step 8, delete)
- Modify: `js/main.js:834-970` (spirit + add-on renderers), `:911` (`renderAddOns`)

**Interfaces:**
- Consumes: `renderQuote()` (Task 3), `BarsysPricing.ADD_ONS` (Task 1).
- Produces: nothing new; all three controls call `renderQuote()` on change.

- [ ] **Step 1: Restructure the markup**

Wrap each of the three controls in a collapsed `<details>` so no JS is needed for the open/close mechanics, and the existing `accordion.js` stays out of it:

```html
<div class="wizard__zone" id="refine-panel">
  <details class="wizard__refine">
    <summary>Upgrade your spirits <span class="wizard__refine-hint">from +$5/person</span></summary>
    <div id="spirit-substitutions"><!-- renderSpiritSubstitutions() target --></div>
  </details>

  <details class="wizard__refine">
    <summary>Add extras <span class="wizard__refine-hint">bar snacks, photographer, branding</span></summary>
    <div id="addon-grid"><!-- renderAddOns() target --></div>
  </details>

  <details class="wizard__refine">
    <summary>Make it recurring <span class="wizard__refine-hint">save up to $10/person</span></summary>
    <!-- Reuse the frequency + cadence radios from the deleted step 7. -->
  </details>
</div>
```

Keep the container ids `#spirit-substitutions` and `#addon-grid` exactly as they are so `renderSpiritSubstitutions` (line 834) and `renderAddOns` (line 911) keep working untouched.

- [ ] **Step 2: Point the add-on renderer at the shared table**

In `renderAddOns` (line 911) and the price-label line (918), read `price` and `type` from `BarsysPricing.ADD_ONS` instead of the local `addOnsData`, so there is exactly one add-on rate table. Keep `addOnsData` only for its `desc` strings, or move `desc` into `BarsysPricing.ADD_ONS` and delete `addOnsData` entirely — the latter is preferred.

- [ ] **Step 3: Replace navigation calls with live re-render**

Every handler in these three controls currently ends by advancing a step. Change each to call `renderQuote()` and stay put. Remove steps 4-8 from `stepNames` (line 247) and delete their `validateStep` branches.

- [ ] **Step 4: Delete the mixlist and venue screens from the flow**

Remove the step 4 div (`index.html:1243`) and step 8 div (`:1415`). Retain `mixlistData` (`js/main.js:591`) and `updateMixlistUI` — the mixlist picker is re-homed in Zone C's optional block, so the data and renderer are still needed. Retain `tierMixlistLimits`.

- [ ] **Step 5: Verify in the browser**

Expected, at 50 guests / Signature:
- All three accordions are closed on load; the total reads $3,810.63.
- Opening spirits and choosing a `+$8/pp` brand → subtotal 3900, total **$4,246.13**.
- Adding "Beer & Wine Supplement" (+$15/pp) on top → subtotal 4650, total **$5,062.69**.
- Adding "Event Photographer" (+$800 flat) → subtotal 5450, total **$5,933.69**.
- Setting Recurring + Quarterly → base drops to $60/pp, subtotal 4950, total **$5,389.31**.
- Each change updates the total without navigating anywhere.

- [ ] **Step 6: Commit**

```bash
git add index.html js/main.js
git commit -m "feat(wizard): inline refinement replaces steps 4-8

Spirits, add-ons and cadence become collapsed accordions that update the
total in place. Mixlists and venue move to the optional capture block.
Add-on rates now read from BarsysPricing.ADD_ONS only."
```

---

### Task 5: Zone C — two-field capture

**Must not ship until the APEX nullability precondition is cleared.**

Replace step 9 (recommendation) and step 10 (contact form) with one capture form: two required fields, a collapsed optional block, and the calendar CTA at equal weight.

**Files:**
- Modify: `index.html:1444-1506` (steps 9 and 10)
- Modify: `js/main.js:361-377` (`validateContactForm`), `:1219-1246` (`sheetsPayload`), `:1248-1253` (fetch)

**Interfaces:**
- Consumes: `calculatePricing()`, `renderQuote()`.
- Produces: `submitLead()` — builds `sheetsPayload` with the frozen key set and POSTs it.

- [ ] **Step 1: Write the capture markup**

```html
<div class="wizard__zone" id="capture-panel">
  <h3 class="wizard__step-title">Send yourself this quote.</h3>

  <label class="wizard__label" for="wiz-name">Full name</label>
  <input type="text" id="wiz-name" autocomplete="name" required />

  <label class="wizard__label" for="wiz-email">Work email</label>
  <input type="email" id="wiz-email" autocomplete="email" required />

  <details class="wizard__optional">
    <summary>Help us prepare (optional)</summary>
    <!-- Event type radios from deleted step 1; mixlist picker (#mixlist-grid)
         from deleted step 4; company / address / city / state from deleted
         step 8; event date and phone from deleted step 10. -->
  </details>

  <div class="wizard__actions">
    <button class="btn btn-primary" id="wizard-submit">Email me this quote</button>
    <a class="btn btn-primary" id="wizard-book"
       href="https://calendar.app.google/YtNSkfVXfdMCqpHX8"
       target="_blank" rel="noopener">Book a planning call</a>
  </div>
</div>
```

Both buttons carry `btn-primary` — the spec requires equal visual weight, so the calendar CTA is no longer `btn-outline`.

- [ ] **Step 2: Reduce validation to the two required fields**

Rewrite `validateContactForm` (line 361) to require only name and a valid email, reusing the existing `isValidEmail` (line 378). Every other field is optional and must not block submission.

```javascript
      function validateContactForm() {
        clearErrors();
        var name = document.getElementById('wiz-name');
        var email = document.getElementById('wiz-email');
        var ok = true;
        if (!name.value.trim()) { markFieldError(name); ok = false; }
        if (!isValidEmail(email.value.trim())) { markFieldError(email); ok = false; }
        if (!ok) showStepError('capture', 'Add your name and a valid work email.');
        return ok;
      }
```

- [ ] **Step 3: Leave the payload keys alone**

`sheetsPayload` (line 1219) already coerces every field with `|| ''`, so skipped optional fields serialize as empty strings and the key set is unchanged. **Make no edits to the key names, the endpoint, or the `text/plain;charset=utf-8` header.** The only change is that `eventType`, `mixlists`, `address`, `city` and `state` may now be `''` in normal operation — which is exactly what the precondition verifies APEX tolerates.

- [ ] **Step 4: Keep the mailto fallback honest**

The fallback body (line ~1272 onward) prints "Not specified" for empty fields. Since empty is now the common case rather than an anomaly, drop the lines whose values are empty instead of printing "Not specified" for each — otherwise a minimal submission emails a wall of "Not specified".

- [ ] **Step 5: Verify the minimal submission**

With the server running:
- Fill only name and email, submit. Expected: success state shows; DevTools Network shows one POST to the Apps Script endpoint; the request body contains all the original keys with `''` for the skipped ones and a correct `estimatedTotal`.
- Confirm a row lands in the leads sheet, and — precondition permitting — in `inbound_web_leads`.
- Submit again with the optional block filled. Expected: the same key set, now populated, matching today's shape.
- Submit with a malformed email. Expected: blocked, field marked, no POST.

- [ ] **Step 6: Commit**

```bash
git add index.html js/main.js
git commit -m "feat(wizard): two-field capture replaces steps 9-10

Name and work email are the only required fields; everything else moves to
a collapsed optional block. Calendar CTA promoted to equal weight.
Payload keys, endpoint and headers unchanged."
```

---

### Task 6: Analytics — `quote_viewed` in, `wizard_step` out

**Files:**
- Modify: `js/main.js` (the `wizard_step` push, and the `queueQuoteViewed` stub from Task 3)

**Interfaces:**
- Consumes: `renderQuote()` (Task 3).
- Produces: `queueQuoteViewed(pricing)` — debounced 800ms, fires at most one `quote_viewed` per settled quote.

- [ ] **Step 1: Implement the debounced event**

Replace the Task 3 stub:

```javascript
      var quoteViewedTimer = null;
      var lastQuoteSignature = '';

      function queueQuoteViewed(pricing) {
        clearTimeout(quoteViewedTimer);
        quoteViewedTimer = setTimeout(function () {
          var signature = pricing.guests + '|' + pricing.tier + '|' + pricing.grandTotal;
          if (signature === lastQuoteSignature) return;
          lastQuoteSignature = signature;
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: 'quote_viewed',
            guest_count: pricing.guests,
            experience_tier: pricing.tier,
            estimated_total: pricing.grandTotal.toFixed(2),
            currency: 'USD',
            value: pricing.grandTotal
          });
        }, 800);
      }
```

The signature guard matters: without it, dragging the stepper from 50 to 55 and back to 50 would fire twice for the same quote.

- [ ] **Step 2: Remove `wizard_step`**

Delete the `wizard_step` `dataLayer.push` and the `stepNames` lookup feeding it. No steps remain to report.

- [ ] **Step 3: Leave the other three events alone**

`cta_click`, `form_submit_lead`, `scroll_depth` and `video_play` are unchanged. `cta_click` is a delegated listener on `.btn`, so it picks up the new buttons automatically — verify rather than re-wire.

- [ ] **Step 4: Verify in the browser**

Open DevTools console and run `window.dataLayer` after loading `#book`.
Expected:
- One `quote_viewed` about 800ms after load, with `guest_count: 50`, `experience_tier: 'Signature'`, `estimated_total: '3810.63'`.
- Changing guests fires exactly one more after settling; returning to 50 fires none.
- Clicking either CTA fires `cta_click` with the right `cta_text`.
- No `wizard_step` anywhere.

- [ ] **Step 5: Commit**

```bash
git add js/main.js
git commit -m "feat(analytics): quote_viewed replaces wizard_step

Debounced 800ms with a signature guard so one settled quote fires once.
Carries guest_count, experience_tier and estimated_total, giving demand
data for ungated views with no email attached."
```

---

### Task 7: Regression sweep

**Files:** none modified unless a check fails.

- [ ] **Step 1: SEO and anchor integrity**

```bash
git diff main -- index.html | grep -E '^[-+].*(canonical|hreflang|x-default|og:url)' || echo "SEO tags untouched"
grep -c 'id="book"' index.html
grep -rn '#book' blog/*.html | wc -l
```

Expected: `SEO tags untouched`; `id="book"` present; the blog references still resolve.

- [ ] **Step 2: Confirm no orphaned step references**

```bash
grep -nE 'data-step="(start|1|2|3|4|5|6|7|8|9|10)"' index.html || echo "no step divs remain"
grep -nE "stepNames|showStep\('[0-9]" js/main.js
```

Expected: no step divs; any surviving `showStep` calls target only `success` or the capture zone.

- [ ] **Step 3: Full unit suite**

Run: `node --test tests/`
Expected: PASS, 13/13. Paste the raw output into the task record — do not summarise it.

- [ ] **Step 4: Cross-page check**

Load `/`, `/private-events.html`, `/brooklyn`, `/midtown`, `/financial-district`, and one blog post.
Expected: no console errors on any page; the wizard prices correctly wherever it appears.

- [ ] **Step 5: Commit any fixes, then open a PR**

```bash
git push -u origin feat/quote-first-wizard
gh pr create --base main --title "feat: quote-first wizard" \
  --body "Implements docs/superpowers/specs/2026-07-31-quote-first-wizard-design.md"
```

**Do not merge.** Merging to `main` publishes to happyhours.barsys.com within about 90 seconds and requires an explicit release gate.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Zone A instant quote, defaults 50/Signature | 3 |
| Zone B inline refinement, per-row deltas | 4 |
| Zone C two-field capture + optional block | 5 |
| Calendar CTA at equal weight | 5 |
| Pricing formula and rates unchanged | 1 (frozen), 7 (verified) |
| Transport / endpoint / payload keys frozen | 5 step 3 |
| `quote_viewed` added, `wizard_step` removed | 6 |
| `#book`, canonical, hreflang preserved | 7 |
| APEX nullability precondition | Preconditions, gate on 5 |
| Pricing parity proven not asserted | 1, 7 step 3 |

**Two spec gaps found and closed by this plan:** the stale `main.min.js` (Task 2) and the mailto fallback's "Not specified" wall (Task 5 step 4). Neither appears in the spec; both are consequences of the redesign. The spec should be amended to mention them.

**One spec item deliberately not implemented:** PDF generation for "Email me this quote." The spec lists it as an open item with no chosen mechanism, so Task 5 ships the button wired to the existing Apps Script mail path. A PDF needs its own spec decision and plan.

**Type consistency:** `BarsysPricing.calculate` returns the same property names the old `calculatePricing` returned, so `updateSummaryPanel`, `buildRecommendation`, `setLineAmount` and the submit handler need no signature changes. `renderQuote` supersedes `updatePricing` and is the only render entry point in Tasks 3-6. `queueQuoteViewed` is stubbed in Task 3 and implemented in Task 6 — the stub is required for Task 3 to run standalone.

**Test honesty:** only Task 1 is genuinely unit-tested. Tasks 3-6 are DOM work verified by scripted manual browser checks with exact expected figures, because adding a headless browser would mean new dependencies that the Global Constraints forbid. Every expected total in those checks was computed from the frozen formula and should be treated as a hard assertion, not a sanity glance.
