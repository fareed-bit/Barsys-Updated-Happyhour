# Quote-First Wizard — Design

**Date:** 2026-07-31
**Site:** happyhours.barsys.com
**Repo:** `fareed-bit/Barsys-Updated-Happyhour` (GitHub Pages, branch `main` = production)
**Status:** design approved, pending spec review

## Problem

The booking wizard asks for everything before it gives anything.

`totalSteps = 10` with nine explicit Next buttons and no auto-advance, so each step costs a
selection plus a click. A visitor spends roughly 18 clicks and eight decisions before a price
appears, then meets a five-field form. Name and email are captured last, at step 10.

Every abandonment is therefore silent and total: the site keeps nothing.

### Evidence

The leads sheet (`1Fh9dS0IMCnph5qwjZAe54tx3YDUIyZd9wYo31nZannc`) holds six genuine
submissions between 2026-03-20 and 2026-06-05, and none since — an eight-week gap.

On 2026-07-31, `samantha.le@firstagency.com` reached step 9, declined the remaining work, and
clicked the outline "Book a Planning Call" button. She booked a call for 2026-08-03 through
Google Calendar appointment scheduling. The site retained her name, email and phone and
discarded everything else: event type, guest count, tier, menus, add-ons, cadence, venue and
computed estimate. She converted around the lead capture rather than through it.

### Three steps do not affect price

`calculatePricing()` reads `guestCount`, `experienceTier`, `frequency`/`recurringCadence`,
`addOns` and spirit upgrades. It never reads `eventType`, `mixlists` or venue.

| Step | Input | Price effect |
|---|---|---|
| 1 | Event type | none |
| 2 | Guest count | × multiplier |
| 3 | Experience tier | base $/pp |
| 4 | Cocktail menus | none — already offers "Skip → team will recommend" |
| 5 | Spirit upgrades | additive |
| 6 | Add-ons | additive |
| 7 | One-time vs recurring | −$5/pp monthly, −$10/pp quarterly |
| 8 | Venue city/state | none |

`main.js:1172` confirms the minimum: *"Complete guest count and tier to see pricing."* Two
inputs produce a quote. Steps 1, 4 and 8 are qualification data — valuable to Barsys, worth
nothing to the buyer, and currently priced ahead of the thing she came for.

## Goal

The wizard's job is to **produce priced quotes**. Lead capture follows the quote rather than
gating it.

### Non-goals

- Changing any price, tier rate, discount or tax figure.
- Replacing Google Calendar appointment scheduling.
- Changing the lead transport: the Apps Script endpoint URL, the HMAC contract, the APEX
  endpoint, or the field names in the payload. (Apps Script may gain PDF generation — see
  Open items — but the transport and contract stay fixed.)
- Pipeline enrolment or automated outbound to inbound web leads.

## Settled decisions

**The quote is ungated.** No email is required to see a number.

The rate card is already public: `tierBasePrice = { Classic: 50, Signature: 70, Reserve: 200 }`
sits in plain JavaScript at `main.js:184`, alongside the add-on table and `TAX_RATE`. Gating
costs real leads to conceal arithmetic any visitor can read from source. The current
maximally-gated design has been measured at roughly 1.3 leads per month, then zero. A visible
number is also the artifact that travels: a coordinator forwards a total to whoever owns the
budget, and a gate blocks that forward.

Accepted cost: visitors who take a number and leave unidentified. Mitigated by a `quote_viewed`
analytics event (demand intelligence without identity) and by two cheap exits instead of one
expensive one.

## Architecture

Three zones replace ten steps. No step navigation, no Next buttons.

### Zone A — Instant quote

One panel, replacing steps 1–3 and the step-9 price reveal.

- **Guest count** — stepper, default **50** (the modal value across real leads)
- **Experience tier** — three cards, default **Signature** ($70/pp)
- **Total and $/person**, rendered on arrival, updated on every change

Both inputs ship pre-filled, so a visitor who touches nothing still sees a real quote
(50 guests, Signature → $3,810.63 incl. tax). Leading with $/person alongside the total keeps
the Reserve tier from reading as sticker shock.

### Zone B — Refine

The three price-bearing optionals, as collapsed accordions. Each row shows its own delta; the
total animates on change.

| Control | Effect | Existing code |
|---|---|---|
| Spirit upgrades | +$5–8/pp | `getSpiritUpchargePerPerson()` |
| Add-ons | +$5–15/pp or +$350–800 flat | `addOnsData` |
| One-time vs recurring | −$5/pp monthly, −$10/pp quarterly | `recurringDiscounts` |

Refinement becomes something that visibly rewards a click rather than gating one.

### Zone C — Capture

Two exits at equal visual weight, both present in Zone A and Zone B:

1. **Email me this quote** — name and work email only. Two fields. Returns a forwardable PDF.
2. **Book a planning call** — the existing `calendar.app.google/YtNSkfVXfdMCqpHX8`.

Event type, cocktail menus, venue, event date and phone move onto this form inside a collapsed
**"Help us prepare (optional)"** block. One POST, no second request, no new endpoint. Anything
skipped is asked on the call.

### Resulting friction

| | Current | Design |
|---|---|---|
| Clicks to a price | ~18 | 0 |
| Clicks to adjust | n/a | 1–2 |
| Required fields to convert | 5 | 2 |

## Pricing

`calculatePricing()` is correct and stays untouched:

```
grandTotal = ((base[tier] − recurringDiscount) × guests
              + addOnsTotal + spiritUpcharge × guests) × (1 + 0.08875)
```

`tierBasePrice = { Classic: 50, Signature: 70, Reserve: 200 }`;
`tierMemberPrice = { Classic: 45, Signature: 65, Reserve: 190 }`.

Identical inputs must yield identical totals before and after. This is the primary test.

## Data flow

Unchanged transport: form POST → Apps Script `AKfycbx6sDtD4jJWw…` → Google Sheet + operator
email + HMAC-signed forward (`X-Happyhours-Signature`) to
`apex.barsys.com/api/inbound/web-leads` → `inbound_web_leads`.

Field names stay as they are. The only change is that `eventType`, `mixlists` and venue may
arrive empty when the optional block is skipped.

### Analytics

GTM-59D59MWD → GA4 `G-175QM7B3K0`; Clarity `w0fs390v14`.

- **New:** `quote_viewed`, debounced on settle, carrying `guest_count`, `experience_tier`,
  `estimated_total`. This is what recovers the retargeting loss — which tiers and price points
  get priced, with or without an email.
- **Retained:** `cta_click`, `form_submit_lead`, `scroll_depth`, `video_play`.
- **Removed:** `wizard_step` (no steps remain). Its replacement is `quote_viewed`.

## Risks

1. **Empty `eventType` / `mixlists` / venue reaching `inbound_web_leads`.** Every existing row
   populates these, so the null path is unexercised. A `NOT NULL` column would fail the insert
   closed and lose leads silently — the exact failure this redesign exists to remove.
   **Hard precondition: verify column nullability before any front-end work begins.** This
   check lives in APEX (`apex-crm-staging`), not in this repo, so it belongs to a separate
   APEX-scoped session.
2. **No staging.** Push to `main` is live in about 90 seconds. All verification is local.
3. **Pricing parity.** Must be proven by comparison against the current engine, not asserted.
4. **`#book` anchor** must keep resolving — all four blog posts and both nav CTAs target it.
5. **SEO tags.** Do not regress the canonical / hreflang / x-default fix from `38356e8`
   (2026-07-20), which is current `main` HEAD.
6. **Reserve at scale** renders large totals ungated ($200/pp × 250 guests ≈ $54k). Not a new
   exposure, since step 9 already shows it.

## Acceptance criteria

- A visitor landing on `#book` sees a total and a $/person figure without clicking.
- Guest count and tier changes update the total live.
- Spirit, add-on and cadence changes update the total live, each showing its own delta.
- For every combination of inputs, the total equals the current engine's total exactly.
- Submitting name and email alone produces a row in the sheet and a row in
  `inbound_web_leads` (depends on risk 1).
- Submitting with the optional block filled produces the same field set as today.
- `quote_viewed` fires with `guest_count`, `experience_tier` and `estimated_total`.
- `#book`, canonical, hreflang and x-default are unchanged.

## Rejected alternatives

**Minimal (sticky price bar + email at step 2).** Keeps all ten steps and most of the
friction; hedges against a question the sheet has already answered.

**Two-door (simple calculator alongside the existing wizard).** Lowest risk, but maintains two
lead paths and two payload shapes for no gain.

## Open items

- Confirm `inbound_web_leads` column nullability (risk 1) before implementation begins.
- PDF generation for "Email me this quote" — mechanism not chosen. The Apps Script already
  sends mail, so generating it there is the likely path, but it needs its own decision and is
  not settled by this design.
