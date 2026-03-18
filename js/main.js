// Barsys Happy Hour — Main JS Bundle
// Extracted from inline scripts for performance
"use strict";

  (function() {
    var prevBtn = document.getElementById('mixlist-prev');
    var nextBtn = document.getElementById('mixlist-next');
    var scrollEl = document.getElementById('mixlist-scroll');
    if (prevBtn && scrollEl) {
      prevBtn.addEventListener('click', function() {
        scrollEl.scrollBy({ left: -340, behavior: 'smooth' });
      });
    }
    if (nextBtn && scrollEl) {
      nextBtn.addEventListener('click', function() {
        scrollEl.scrollBy({ left: 340, behavior: 'smooth' });
      });
    }
  })();

    /* =========================================================================
       PRICING TOGGLE — Standard / Membership
       ========================================================================= */
    (function () {
      var toggle = document.getElementById('pricing-switch');
      if (!toggle) return;

      var labels = document.querySelectorAll('.pricing-toggle__label');
      var prices = document.querySelectorAll('.package-card__price[data-price-standard]');
      var notes = document.querySelectorAll('.package-card__price-note[data-note-standard]');
      var isMember = false;

      toggle.addEventListener('click', function () {
        isMember = !isMember;
        toggle.classList.toggle('active', isMember);
        toggle.setAttribute('aria-checked', isMember);

        labels.forEach(function (l) {
          var which = l.dataset.toggleLabel;
          l.classList.toggle('pricing-toggle__label--active', isMember ? which === 'member' : which === 'standard');
        });

        prices.forEach(function (el) {
          el.classList.add('switching');
          var val = isMember ? el.dataset.priceMember : el.dataset.priceStandard;
          setTimeout(function () {
            el.innerHTML = val + '<span style="font-size:16px; font-weight:400; color:var(--color-text-tertiary);">/person</span>';
            el.classList.remove('switching');
          }, 150);
        });

        notes.forEach(function (el) {
          var val = isMember ? el.dataset.noteMember : el.dataset.noteStandard;
          el.textContent = val;
        });
      });
    })();

    /* =========================================================================
       SCROLL-TRIGGERED ANIMATIONS (matching LaunchPoint IX2 patterns)
       ========================================================================= */
    (function () {
      // Skip if user prefers reduced motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('.anim-fade-up, .anim-fade-in, .anim-scale-in').forEach(function (el) {
          el.classList.add('is-visible');
        });
        return;
      }

      var animEls = document.querySelectorAll('.anim-fade-up, .anim-fade-in, .anim-scale-in');

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -60px 0px'
      });

      animEls.forEach(function (el) { observer.observe(el); });
    })();


    /* =========================================================================
       VIDEO GRID — Lazy autoplay/pause on scroll
       ========================================================================= */
    (function () {
      var videoItems = document.querySelectorAll('.video-grid__item video');
      if (!videoItems.length) return;

      var videoObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var video = entry.target;
          if (entry.isIntersecting) {
            video.play().catch(function () { /* autoplay blocked, ignore */ });
          } else {
            video.pause();
          }
        });
      }, {
        threshold: 0.25,
        rootMargin: '100px 0px 100px 0px'
      });

      videoItems.forEach(function (video) {
        videoObserver.observe(video);
      });
    })();


    /* Nav scroll effect handled by js/nav.js (external) — no duplicate needed */


    /* =========================================================================
       SMOOTH SCROLL for anchor links
       ========================================================================= */
    (function () {
      document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
          var id = this.getAttribute('href');
          if (id === '#') return;
          var target = document.querySelector(id);
          if (target) {
            e.preventDefault();
            var navH = document.querySelector('.nav') ? document.querySelector('.nav').offsetHeight : 0;
            var top = target.getBoundingClientRect().top + window.scrollY - navH - 20;
            window.scrollTo({ top: top, behavior: 'smooth' });
          }
        });
      });
    })();

    /* =========================================================================
       FORM WIZARD — 10-step guided event planner with dynamic pricing
       ========================================================================= */
    (function () {
      var wizard = document.getElementById('booking-wizard');
      if (!wizard) return;

      var steps = wizard.querySelectorAll('.wizard__step[data-step]');
      var bars = wizard.querySelectorAll('.wizard__progress-bar');
      var totalSteps = 10;
      var currentStep = 'start';

      /* ---- Form data store ---- */
      var formData = {
        eventType: '', guestCount: 0, experienceTier: '',
        mixlists: [], spiritUpgrades: {}, addOns: [],
        frequency: '', recurringCadence: '',
        company: '', address: '', city: '', state: '',
        name: '', email: '', phone: ''
      };

      /* ---- Pricing data ---- */
      var TAX_RATE = 0.08875;
      var tierBasePrice = { Classic: 50, Signature: 70, Reserve: 200 };
      var tierMixlistLimits = { Classic: 2, Signature: 3, Reserve: 5 };

      var addOnsData = [
        { id: 'extra-hour',       name: 'Extra Hour of Service',            price: 500, type: 'flat',       desc: 'Extend your event by one additional hour' },
        { id: 'extra-mixlist',    name: 'Additional Mixlist',               price: 5,   type: 'per-person', desc: 'Add one more cocktail menu beyond your package limit' },
        { id: 'premium-garnish',  name: 'Premium Garnish Upgrade',          price: 8,   type: 'per-person', desc: 'Fresh fruit, edible flowers, and artisan garnishes' },
        { id: 'branded-items',    name: 'Custom Branded Napkins & Stirrers',price: 350, type: 'flat',       desc: 'Your logo on cocktail napkins and stirrers' },
        { id: 'mocktail-station', name: 'Non-Alcoholic Cocktail Station',   price: 12,  type: 'per-person', desc: 'Dedicated zero-proof craft cocktail menu' },
        { id: 'beer-wine',        name: 'Beer & Wine Supplement',           price: 15,  type: 'per-person', desc: 'Curated craft beer and wine alongside cocktails' },
        { id: 'photographer',     name: 'Event Photographer (2 hrs)',       price: 800, type: 'flat',       desc: 'Professional photographer for candid and posed shots' }
      ];

      var tierDefaultSpirits = {
        Classic: [
          { category: 'Vodka',   defaultBrand: "Tito's" },
          { category: 'Rum',     defaultBrand: 'Bacardi' },
          { category: 'Tequila', defaultBrand: 'Espolon' },
          { category: 'Gin',     defaultBrand: 'Beefeater' }
        ],
        Signature: [
          { category: 'Vodka',   defaultBrand: 'Ketel One' },
          { category: 'Tequila', defaultBrand: 'Herradura' },
          { category: 'Whiskey', defaultBrand: 'JW Black' },
          { category: 'Gin',     defaultBrand: 'Tanqueray' }
        ],
        Reserve: [
          { category: 'Vodka',   defaultBrand: 'Grey Goose' },
          { category: 'Tequila', defaultBrand: 'Don Julio' },
          { category: 'Gin',     defaultBrand: "Hendrick's" },
          { category: 'Whiskey', defaultBrand: 'Macallan 12' }
        ]
      };

      var spiritUpgrades = {
        Vodka:   [{ brand: 'Belvedere', upcharge: 5 }, { brand: 'Grey Goose', upcharge: 5 }, { brand: 'Chopin', upcharge: 8 }],
        Rum:     [{ brand: 'Flor de Cana 7', upcharge: 5 }, { brand: 'Mount Gay XO', upcharge: 10 }],
        Tequila: [{ brand: 'Herradura', upcharge: 5 }, { brand: 'Don Julio Blanco', upcharge: 8 }, { brand: 'Clase Azul', upcharge: 20 }],
        Gin:     [{ brand: "Hendrick's", upcharge: 5 }, { brand: 'Botanist', upcharge: 8 }, { brand: 'Monkey 47', upcharge: 15 }],
        Whiskey: [{ brand: 'Woodford Reserve', upcharge: 5 }, { brand: 'Macallan 12', upcharge: 10 }, { brand: 'Hibiki Harmony', upcharge: 15 }]
      };

      /* ---- Recommendation data ---- */
      var tierRec = {
        Classic: {
          title: 'Classic Experience',
          desc: 'A clean, turnkey cocktail experience for your office. Curated menu with premium spirits, AI cocktail machines, and professional bartenders.',
          features: ['AI cocktail machines + professional bartenders', 'Curated cocktail menu with premium spirits', 'Full bar setup with glassware, ice, and garnishes', 'Complete setup, service, and cleanup', 'Non-alcoholic cocktail options included']
        },
        Signature: {
          title: 'Signature Experience',
          desc: 'An elevated cocktail experience with premium spirits, rotating seasonal menus, and custom drink options.',
          features: ['AI cocktail machines + professional bartenders', 'Premium spirits and rotating seasonal menu', 'Custom cocktail options for your event', 'Complete setup, service, and cleanup', 'All glassware, ice, mixers, and garnishes']
        },
        Reserve: {
          title: 'Reserve Experience',
          desc: 'Executive-level hospitality with top-shelf spirits, bespoke cocktail menus, and a dedicated event coordinator.',
          features: ['Dedicated event coordinator', 'Top-shelf spirits and bespoke menu design', 'White-glove bartending service', 'Premium glassware and presentation', 'Full setup, service, and cleanup']
        }
      };

      /* ---- Show/hide steps ---- */
      var stepNames = { start: 'Start', 1: 'Event Type', 2: 'Guest Count', 3: 'Package', 4: 'Mixlists', 5: 'Spirit Upgrades', 6: 'Add-Ons', 7: 'Frequency', 8: 'Company Info', 9: 'Review', 10: 'Contact Info', success: 'Success' };

      function showStep(n) {
        steps.forEach(function(s) { s.classList.remove('active'); });
        var target = wizard.querySelector('[data-step="' + n + '"]');
        if (target) target.classList.add('active');

        var numericStep = typeof n === 'number' ? n : 0;
        bars.forEach(function(bar, i) {
          bar.classList.toggle('active', i < numericStep);
        });

        var progress = wizard.querySelector('.wizard__progress');
        if (progress) {
          progress.setAttribute('aria-valuenow', numericStep);
          progress.style.display = (n === 'start' || n === 'success') ? 'none' : 'flex';
        }

        currentStep = n;

        /* Analytics: track wizard step progression */
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'wizard_step',
          wizard_step_number: numericStep,
          wizard_step_name: stepNames[n] || String(n)
        });

        if (n === 5) renderSpiritSubstitutions();
        if (n === 6) revealAddOns();
        if (n === 9) buildRecommendation();
        if (n === 10) {
          var compConfirm = document.getElementById('wiz-company-confirm');
          if (compConfirm) compConfirm.value = formData.company;
        }

        if (n !== 'start') {
          wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      /* ---- Step sequencing ---- */
      var stepOrder = ['start', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'success'];

      function nextStep() {
        var idx = stepOrder.indexOf(currentStep);
        if (idx < stepOrder.length - 1) showStep(stepOrder[idx + 1]);
      }

      function prevStep() {
        var idx = stepOrder.indexOf(currentStep);
        if (idx > 0) showStep(stepOrder[idx - 1]);
      }

      /* ---- Start button ---- */
      var beginBtn = document.getElementById('wizard-begin');
      if (beginBtn) beginBtn.addEventListener('click', function() { showStep(1); });

      /* ---- Next/Prev buttons ---- */
      wizard.querySelectorAll('[data-wizard-next]').forEach(function(btn) {
        btn.addEventListener('click', nextStep);
      });
      wizard.querySelectorAll('[data-wizard-prev]').forEach(function(btn) {
        btn.addEventListener('click', prevStep);
      });

      /* ---- Option tile selection (single-select for event type, frequency) ---- */
      wizard.querySelectorAll('.wizard__option').forEach(function(opt) {
        opt.addEventListener('click', function() {
          var grid = opt.closest('.wizard__option-grid');
          if (!grid) return;
          grid.querySelectorAll('.wizard__option').forEach(function(o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
          var field = grid.dataset.field;
          if (field) {
            formData[field] = opt.dataset.value;
            updateSummary();
          }
          if (field === 'frequency') {
            var followup = document.getElementById('frequency-followup');
            if (followup) {
              followup.classList.toggle('visible', opt.dataset.value === 'Recurring Program');
              if (opt.dataset.value !== 'Recurring Program') {
                formData.recurringCadence = '';
                followup.querySelectorAll('.wizard__option').forEach(function(o) { o.classList.remove('selected'); });
              }
            }
          }
        });
      });

      /* ---- Tier card selection (legacy) ---- */
      wizard.querySelectorAll('.wizard__tier').forEach(function(tier) {
        tier.addEventListener('click', function() {
          var grid = tier.closest('.wizard__tier-grid');
          grid.querySelectorAll('.wizard__tier').forEach(function(t) { t.classList.remove('selected'); });
          tier.classList.add('selected');
          formData.experienceTier = tier.dataset.value;
          var newLimit = tierMixlistLimits[formData.experienceTier] || 3;
          if (selectedMixlists.length > newLimit) {
            selectedMixlists = selectedMixlists.slice(0, newLimit);
            wizard.querySelectorAll('.wizard__mixlist-option').forEach(function(o) {
              if (o.dataset.value !== 'Skip') {
                o.classList.toggle('selected', selectedMixlists.indexOf(o.dataset.value) > -1);
              }
            });
          }
          updateMixlistUI();
          formData.spiritUpgrades = {};
          updatePricing();
          updateSummary();
        });
      });

      /* ---- Package card selection (full cards in Step 3) ---- */
      wizard.querySelectorAll('.package-card--selectable').forEach(function(card) {
        card.addEventListener('click', function() {
          var grid = card.closest('.wizard__packages-grid');
          grid.querySelectorAll('.package-card--selectable').forEach(function(c) { c.classList.remove('selected'); });
          card.classList.add('selected');
          formData.experienceTier = card.dataset.value;
          var newLimit = tierMixlistLimits[formData.experienceTier] || 3;
          if (selectedMixlists.length > newLimit) {
            selectedMixlists = selectedMixlists.slice(0, newLimit);
            wizard.querySelectorAll('.wizard__mixlist-option').forEach(function(o) {
              if (o.dataset.value !== 'Skip') {
                o.classList.toggle('selected', selectedMixlists.indexOf(o.dataset.value) > -1);
              }
            });
          }
          updateMixlistUI();
          formData.spiritUpgrades = {};
          updatePricing();
          updateSummary();
        });
      });

      /* ========== COLLAPSIBLE PACKAGE DETAILS ========== */
      document.querySelectorAll('.package-card__details-toggle').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var collapse = btn.previousElementSibling;
          if (collapse && collapse.classList.contains('package-card__details-collapse')) {
            collapse.classList.toggle('expanded');
            btn.textContent = collapse.classList.contains('expanded') ? 'Hide details ▴' : 'See full details ▾';
          }
        });
      });

      /* ========== GUEST COUNT STEPPER ========== */
      var guestInput = document.getElementById('wiz-guest-count');
      var guestMinus = document.getElementById('guest-minus');
      var guestPlus = document.getElementById('guest-plus');

      function clampGuests(val) { return Math.max(20, Math.min(500, Math.round(val))); }

      function updateGuestCount() {
        var val = clampGuests(parseInt(guestInput.value) || 50);
        guestInput.value = val;
        formData.guestCount = val;
        updatePricing();
        updateSummary();
      }

      if (guestMinus) guestMinus.addEventListener('click', function() {
        guestInput.value = clampGuests((parseInt(guestInput.value) || 50) - 5);
        updateGuestCount();
      });
      if (guestPlus) guestPlus.addEventListener('click', function() {
        guestInput.value = clampGuests((parseInt(guestInput.value) || 50) + 5);
        updateGuestCount();
      });
      if (guestInput) {
        guestInput.addEventListener('change', updateGuestCount);
        guestInput.addEventListener('input', function() {
          clearTimeout(guestInput._debounce);
          guestInput._debounce = setTimeout(updateGuestCount, 400);
        });
        /* guestCount stays 0 until user interacts — event card shows "—" */
      }

      /* ========== MULTI-SELECT MIXLIST ========== */
      var mixlistData = {
        'The Signature Mixlist': { type: 'Alcoholic', drinks: [
          { name: 'Old Fashioned', ingredients: 'Bourbon, Bitters, Sugar, Orange' },
          { name: 'Whiskey Sour', ingredients: 'Bourbon, Lemon, Simple Syrup' },
          { name: 'Manhattan', ingredients: 'Rye, Sweet Vermouth, Bitters' },
          { name: 'Espresso Martini', ingredients: 'Vodka, Espresso, Coffee Liqueur' }
        ]},
        'The Vibrant Classics': { type: 'Alcoholic', drinks: [
          { name: 'Margarita', ingredients: 'Tequila, Lime, Triple Sec' },
          { name: 'Cosmopolitan', ingredients: 'Vodka, Cranberry, Lime, Triple Sec' },
          { name: 'Mojito', ingredients: 'Rum, Lime, Mint, Sugar, Soda' },
          { name: 'Moscow Mule', ingredients: 'Vodka, Ginger Beer, Lime' }
        ]},
        "The Agave Lover's": { type: 'Alcoholic', drinks: [
          { name: 'Classic Margarita', ingredients: 'Tequila, Lime, Agave' },
          { name: 'Paloma', ingredients: 'Tequila, Grapefruit, Lime, Soda' },
          { name: 'Mezcal Negroni', ingredients: 'Mezcal, Campari, Sweet Vermouth' },
          { name: 'Oaxaca Old Fashioned', ingredients: 'Mezcal, Tequila, Agave, Bitters' },
          { name: 'Spicy Margarita', ingredients: 'Tequila, Jalapeño, Lime, Agave' }
        ]},
        'Après Spritz Club': { type: 'Alcoholic', drinks: [
          { name: 'Aperol Spritz', ingredients: 'Aperol, Prosecco, Soda' },
          { name: 'Hugo Spritz', ingredients: 'Elderflower, Prosecco, Mint, Soda' },
          { name: 'Limoncello Spritz', ingredients: 'Limoncello, Prosecco, Soda' },
          { name: 'Campari Spritz', ingredients: 'Campari, Prosecco, Soda' },
          { name: 'St-Germain Spritz', ingredients: 'St-Germain, Prosecco, Soda' },
          { name: 'Cynar Spritz', ingredients: 'Cynar, Prosecco, Soda' },
          { name: 'Venetian Spritz', ingredients: 'Select Aperitivo, Prosecco, Soda' }
        ]},
        'Neon Shadows': { type: 'Alcoholic', drinks: [
          { name: 'Midnight Negroni', ingredients: 'Gin, Campari, Sweet Vermouth' },
          { name: 'Dark & Stormy', ingredients: 'Dark Rum, Ginger Beer, Lime' },
          { name: 'Smoky Paloma', ingredients: 'Mezcal, Grapefruit, Lime' },
          { name: 'Black Manhattan', ingredients: 'Bourbon, Amaro, Bitters' },
          { name: 'Last Word', ingredients: 'Gin, Green Chartreuse, Maraschino, Lime' }
        ]},
        'Bold Frequency': { type: 'Alcoholic', drinks: [
          { name: 'Spiced Old Fashioned', ingredients: 'Bourbon, Cinnamon, Bitters' },
          { name: 'Penicillin', ingredients: 'Scotch, Ginger, Honey, Lemon' },
          { name: 'Ancho Chile Margarita', ingredients: 'Tequila, Ancho Reyes, Lime' },
          { name: 'Chai Whiskey Sour', ingredients: 'Bourbon, Chai Syrup, Lemon' }
        ]},
        'Sharp & Steady': { type: 'Alcoholic', drinks: [
          { name: 'Gimlet', ingredients: 'Gin, Lime, Simple Syrup' },
          { name: "Bee's Knees", ingredients: 'Gin, Honey, Lemon' },
          { name: 'Tom Collins', ingredients: 'Gin, Lemon, Sugar, Soda' },
          { name: 'Gin & Tonic', ingredients: 'Gin, Tonic Water, Lime' }
        ]},
        'Silk & Snap': { type: 'Alcoholic', drinks: [
          { name: 'Pear Martini', ingredients: 'Vodka, Pear Liqueur, Lemon' },
          { name: 'French 75', ingredients: 'Gin, Champagne, Lemon, Sugar' },
          { name: 'Pear Collins', ingredients: 'Vodka, Pear, Lemon, Soda' },
          { name: 'Citrus Fizz', ingredients: 'Gin, Grapefruit, Lemon, Soda' },
          { name: 'Silk Road Sour', ingredients: 'Vodka, Pear, Cardamom, Lemon' }
        ]},
        'Clear Coast': { type: 'Alcoholic', drinks: [
          { name: 'Daiquiri', ingredients: 'White Rum, Lime, Sugar' },
          { name: 'Rum Punch', ingredients: 'White Rum, Pineapple, Orange, Lime' },
          { name: 'Coconut Mojito', ingredients: 'White Rum, Coconut, Lime, Mint' },
          { name: 'Sea Breeze', ingredients: 'Rum, Cranberry, Grapefruit' }
        ]},
        'Dusk to Agave': { type: 'Alcoholic', drinks: [
          { name: 'Añejo Old Fashioned', ingredients: 'Añejo Tequila, Agave, Bitters' },
          { name: 'Tequila Sunset', ingredients: 'Tequila, Orange, Grenadine' },
          { name: 'Honey Paloma', ingredients: 'Tequila, Grapefruit, Honey, Lime' },
          { name: 'Mezcal Mule', ingredients: 'Mezcal, Ginger Beer, Lime' },
          { name: 'Dulce Agave', ingredients: 'Añejo, Vanilla, Agave, Cinnamon' }
        ]},
        'Molasses Theory': { type: 'Alcoholic', drinks: [
          { name: 'Classic Negroni', ingredients: 'Gin, Campari, Sweet Vermouth' },
          { name: 'Boulevardier', ingredients: 'Bourbon, Campari, Sweet Vermouth' },
          { name: 'Americano', ingredients: 'Campari, Sweet Vermouth, Soda' },
          { name: 'Rob Roy', ingredients: 'Scotch, Sweet Vermouth, Bitters' },
          { name: 'Bamboo', ingredients: 'Dry Sherry, Dry Vermouth, Bitters' }
        ]},
        'Fluid Code': { type: 'Non-Alcoholic', drinks: [
          { name: 'Citrus Spark', ingredients: 'Grapefruit, Lemon, Tonic, Rosemary' },
          { name: 'Ginger Smash', ingredients: 'Ginger, Lime, Honey, Soda' },
          { name: 'Berry Bramble', ingredients: 'Mixed Berries, Lemon, Simple Syrup' },
          { name: 'Cucumber Cooler', ingredients: 'Cucumber, Mint, Lime, Soda' },
          { name: 'Tropical Fizz', ingredients: 'Passion Fruit, Pineapple, Coconut, Soda' }
        ]},
        'The Bold Circuit': { type: 'Alcoholic', drinks: [
          { name: 'Bourbon Smash', ingredients: 'Bourbon, Lemon, Mint, Simple Syrup' },
          { name: 'Gold Rush', ingredients: 'Bourbon, Honey, Lemon' },
          { name: 'Kentucky Mule', ingredients: 'Bourbon, Ginger Beer, Lime' },
          { name: 'Paper Plane', ingredients: 'Bourbon, Aperol, Amaro, Lemon' }
        ]},
        'Love at First Sip': { type: 'Alcoholic', drinks: [
          { name: 'Rose Martini', ingredients: 'Vodka, Rose Water, Lemon' },
          { name: 'Lychee Cosmo', ingredients: 'Vodka, Lychee, Cranberry, Lime' },
          { name: 'French Kiss', ingredients: 'Chambord, Champagne, Raspberry' },
          { name: 'Strawberry Basil Smash', ingredients: 'Gin, Strawberry, Basil, Lemon' },
          { name: 'Velvet Blush', ingredients: 'Vodka, Pomegranate, Elderflower' }
        ]},
        'Confessions in Glass': { type: 'Alcoholic', drinks: [
          { name: 'Strawberry Gin Fizz', ingredients: 'Gin, Strawberry, Lemon, Soda' },
          { name: 'Bramble', ingredients: 'Gin, Blackberry Liqueur, Lemon' },
          { name: 'Garden Party', ingredients: 'Gin, Cucumber, Elderflower' },
          { name: 'Secret Garden', ingredients: 'Gin, Thyme, Grapefruit, Honey' },
          { name: 'Pink Gin & Tonic', ingredients: 'Pink Gin, Tonic, Berries' }
        ]},
        'Sombra & Sol': { type: 'Alcoholic', drinks: [
          { name: 'Mezcal Paloma', ingredients: 'Mezcal, Grapefruit, Lime' },
          { name: 'Smoke & Passion', ingredients: 'Mezcal, Passion Fruit, Lime' },
          { name: 'Oaxacan Sunset', ingredients: 'Mezcal, Mango, Chili, Lime' },
          { name: 'Smoky Margarita', ingredients: 'Mezcal, Lime, Agave' },
          { name: 'Sol Spritz', ingredients: 'Mezcal, Aperol, Grapefruit, Soda' }
        ]},
        'Flora-Bitter': { type: 'Alcoholic', drinks: [
          { name: 'Negroni', ingredients: 'Gin, Campari, Sweet Vermouth' },
          { name: 'Jungle Bird', ingredients: 'Rum, Campari, Pineapple, Lime' },
          { name: 'Bitter Giuseppe', ingredients: 'Cynar, Sweet Vermouth, Lemon' },
          { name: 'Floral Spritz', ingredients: 'Elderflower, Aperol, Prosecco' }
        ]},
        'Punt, Pass, & Pour': { type: 'Alcoholic', drinks: [
          { name: 'Reposado Paloma', ingredients: 'Reposado Tequila, Grapefruit, Lime' },
          { name: 'Tequila Mule', ingredients: 'Tequila, Ginger Beer, Lime' },
          { name: 'Spicy Ranch Water', ingredients: 'Tequila, Lime, Jalapeño, Topo Chico' },
          { name: 'Touchdown Margarita', ingredients: 'Reposado, Blood Orange, Lime' },
          { name: 'Half-Time Highball', ingredients: 'Tequila, Ginger Ale, Lime' }
        ]},
        'Turf & Tonic': { type: 'Alcoholic', drinks: [
          { name: 'Bourbon Highball', ingredients: 'Bourbon, Ginger Ale' },
          { name: 'Mint Julep', ingredients: 'Bourbon, Mint, Sugar' },
          { name: 'Lynchburg Lemonade', ingredients: 'Bourbon, Triple Sec, Lemon, Soda' },
          { name: 'Bourbon & Cola', ingredients: 'Bourbon, Cola, Lime' },
          { name: 'Tailgate Sour', ingredients: 'Bourbon, Lemon, Cherry' },
          { name: 'Turf Mule', ingredients: 'Bourbon, Ginger Beer, Lime' }
        ]},
        '13 Botanicals': { type: 'Alcoholic', drinks: [
          { name: 'Cynar Spritz', ingredients: 'Cynar, Prosecco, Soda' },
          { name: 'Bitter Artichoke', ingredients: 'Cynar, Gin, Lemon' },
          { name: 'Herbal Manhattan', ingredients: 'Rye, Cynar, Sweet Vermouth' },
          { name: 'Amaro Sour', ingredients: 'Cynar, Lemon, Simple Syrup' },
          { name: 'Botanical Negroni', ingredients: 'Gin, Cynar, Sweet Vermouth' }
        ]}
      };

      /* Inject dropdown HTML and update type labels */
      wizard.querySelectorAll('.wizard__mixlist-option:not(.wizard__mixlist-option--skip)').forEach(function(opt) {
        var name = opt.dataset.value;
        var data = mixlistData[name];
        if (!data) return;

        /* Update type label */
        var typeEl = opt.querySelector('.wizard__mixlist-option__type');
        if (typeEl) typeEl.textContent = data.type;

        /* Build dropdown */
        var dropdown = document.createElement('div');
        dropdown.className = 'wizard__mixlist-dropdown';
        var list = document.createElement('div');
        list.className = 'wizard__mixlist-dropdown__list';
        data.drinks.forEach(function(drink) {
          var row = document.createElement('div');
          row.className = 'wizard__mixlist-drink';
          row.innerHTML = '<div class="wizard__mixlist-drink__name">' + drink.name + '</div>' +
                          '<div class="wizard__mixlist-drink__ingredients">' + drink.ingredients + '</div>';
          list.appendChild(row);
        });
        dropdown.appendChild(list);
        opt.appendChild(dropdown);
      });

      var selectedMixlists = [];

      function getMixlistLimit() {
        return tierMixlistLimits[formData.experienceTier] || 3;
      }

      function updateMixlistUI() {
        var limit = getMixlistLimit();
        var countEl = document.getElementById('mixlist-selected-count');
        var maxEl = document.getElementById('mixlist-max-count');
        var limitDisplay = document.getElementById('mixlist-limit-display');
        var counterEl = document.getElementById('mixlist-counter');

        if (countEl) countEl.textContent = selectedMixlists.length;
        if (maxEl) maxEl.textContent = limit;
        if (limitDisplay) limitDisplay.textContent = limit;
        if (counterEl) counterEl.classList.toggle('at-limit', selectedMixlists.length >= limit);

        wizard.querySelectorAll('.wizard__mixlist-option').forEach(function(opt) {
          if (opt.dataset.value === 'Skip') return;
          if (selectedMixlists.length >= limit && !opt.classList.contains('selected')) {
            opt.classList.add('disabled');
          } else {
            opt.classList.remove('disabled');
          }
        });
        formData.mixlists = selectedMixlists.slice();
      }

      wizard.querySelectorAll('.wizard__mixlist-option').forEach(function(opt) {
        opt.addEventListener('click', function() {
          var val = opt.dataset.value;
          if (opt.classList.contains('disabled')) return;

          if (val === 'Skip') {
            selectedMixlists = [];
            wizard.querySelectorAll('.wizard__mixlist-option').forEach(function(o) {
              o.classList.remove('selected');
              var dd = o.querySelector('.wizard__mixlist-dropdown');
              if (dd) dd.classList.remove('expanded');
            });
            opt.classList.add('selected');
            formData.mixlists = ['Skip'];
            updateMixlistUI();
            updateSummary();
            return;
          }

          var skipOpt = wizard.querySelector('.wizard__mixlist-option--skip');
          if (skipOpt) skipOpt.classList.remove('selected');

          var limit = getMixlistLimit();
          var idx = selectedMixlists.indexOf(val);
          if (idx > -1) {
            selectedMixlists.splice(idx, 1);
            opt.classList.remove('selected');
            var dd = opt.querySelector('.wizard__mixlist-dropdown');
            if (dd) dd.classList.remove('expanded');
          } else if (selectedMixlists.length < limit) {
            selectedMixlists.push(val);
            opt.classList.add('selected');
          }

          /* Accordion: only expand the clicked item's dropdown */
          wizard.querySelectorAll('.wizard__mixlist-dropdown').forEach(function(d) {
            d.classList.remove('expanded');
          });
          if (opt.classList.contains('selected')) {
            var dropdown = opt.querySelector('.wizard__mixlist-dropdown');
            if (dropdown) dropdown.classList.add('expanded');
          }

          updateMixlistUI();
          updateSummary();
        });
      });

      /* ========== LIQUOR SUBSTITUTIONS (Step 5) ========== */
      function renderSpiritSubstitutions() {
        var tier = formData.experienceTier || 'Signature';
        var spirits = tierDefaultSpirits[tier] || tierDefaultSpirits.Signature;
        var grid = document.getElementById('spirits-grid');
        var tierLabel = document.getElementById('sub-tier-name');
        if (tierLabel) tierLabel.textContent = tier;
        if (!grid) return;

        grid.innerHTML = spirits.map(function(spirit) {
          var upgrades = (spiritUpgrades[spirit.category] || []).filter(function(u) {
            return u.brand !== spirit.defaultBrand;
          });
          var options = '<option value="">Keep ' + spirit.defaultBrand + '</option>';
          upgrades.forEach(function(u) {
            options += '<option value="' + u.brand + '" data-upcharge="' + u.upcharge + '">' + u.brand + ' (+$' + u.upcharge + '/pp)</option>';
          });
          return '<div class="wizard__spirit-row" data-category="' + spirit.category + '">' +
            '<div class="wizard__spirit-default">' +
              '<div class="wizard__spirit-category">' + spirit.category + '</div>' +
              '<div class="wizard__spirit-brand">' + spirit.defaultBrand + '</div>' +
              '<div class="wizard__spirit-tag">Included</div>' +
            '</div>' +
            '<div class="wizard__spirit-arrow">&rarr;</div>' +
            '<select class="wizard__spirit-select" data-category="' + spirit.category + '">' + options + '</select>' +
          '</div>';
        }).join('');

        grid.querySelectorAll('.wizard__spirit-select').forEach(function(sel) {
          sel.addEventListener('change', function() {
            var cat = sel.dataset.category;
            var row = sel.closest('.wizard__spirit-row');
            if (sel.value) {
              var upcharge = parseInt(sel.selectedOptions[0].dataset.upcharge) || 0;
              formData.spiritUpgrades[cat] = { brand: sel.value, upcharge: upcharge };
              row.classList.add('upgraded');
            } else {
              delete formData.spiritUpgrades[cat];
              row.classList.remove('upgraded');
            }
            updateSpiritTotalDisplay();
            updatePricing();
            updateSummary();
          });
        });
        formData.spiritUpgrades = {};
        updateSpiritTotalDisplay();
      }

      function updateSpiritTotalDisplay() {
        var totalEl = document.getElementById('spirit-total-display');
        if (!totalEl) return;
        var total = getSpiritUpchargePerPerson();
        if (total > 0) {
          totalEl.textContent = 'Spirit upgrades: +$' + total + '/person';
          totalEl.style.color = 'var(--color-gold)';
        } else {
          totalEl.textContent = 'No upgrades selected';
          totalEl.style.color = '';
        }
      }

      function getSpiritUpchargePerPerson() {
        var total = 0;
        Object.keys(formData.spiritUpgrades).forEach(function(cat) {
          total += formData.spiritUpgrades[cat].upcharge || 0;
        });
        return total;
      }

      /* ========== ADD-ONS (Step 6) ========== */
      /* Tier-specific recommended add-ons */
      var tierRecommendedAddOns = {
        Classic:   ['extra-mixlist', 'mocktail-station'],
        Signature: ['premium-garnish', 'beer-wine', 'extra-hour'],
        Reserve:   ['branded-items', 'photographer', 'extra-hour']
      };

      function renderAddOns() {
        var grid = document.getElementById('addon-grid');
        if (!grid) return;
        var tier = formData.experienceTier || '';
        var recommended = tierRecommendedAddOns[tier] || [];

        grid.innerHTML = addOnsData.map(function(a) {
          var priceLabel = a.type === 'flat' ? '+$' + a.price.toLocaleString() + ' flat' : '+$' + a.price + '/person';
          var recBadge = recommended.indexOf(a.id) > -1 ? '<div class="wizard__addon-recommended">Recommended</div>' : '';
          return '<div class="wizard__addon" data-addon-id="' + a.id + '">' +
            '<div class="wizard__addon-info">' +
              recBadge +
              '<div class="wizard__addon-name">' + a.name + '</div>' +
              '<div class="wizard__addon-desc">' + a.desc + '</div>' +
            '</div>' +
            '<div class="wizard__addon-price">' + priceLabel + '</div>' +
            '<div class="wizard__addon-toggle"><button class="wizard__addon-check" type="button" aria-pressed="false"><span class="wizard__addon-check-icon"></span></button></div>' +
          '</div>';
        }).join('');

        /* Re-apply selected state */
        grid.querySelectorAll('.wizard__addon').forEach(function(el) {
          if (formData.addOns.indexOf(el.dataset.addonId) > -1) {
            el.classList.add('selected');
          }
          el.addEventListener('click', function() {
            var id = el.dataset.addonId;
            var idx = formData.addOns.indexOf(id);
            if (idx > -1) {
              formData.addOns.splice(idx, 1);
              el.classList.remove('selected');
            } else {
              formData.addOns.push(id);
              el.classList.add('selected');
            }
            updatePricing();
            updateSummary();
          });
        });
      }
      renderAddOns();

      function revealAddOns() {
        var tier = formData.experienceTier || 'Signature';
        /* Update title and subtitle dynamically */
        var titleEl = document.getElementById('addon-step-title');
        var subEl = document.getElementById('addon-step-subtitle');
        if (titleEl) titleEl.textContent = 'Customize your ' + tier + ' experience.';
        if (subEl) subEl.textContent = 'Great choice. These optional upgrades pair perfectly with the ' + tier + ' package.';

        /* Re-render with tier-specific recommendations */
        renderAddOns();

        /* Stagger reveal each card */
        var cards = document.querySelectorAll('#addon-grid .wizard__addon');
        cards.forEach(function(card) { card.classList.remove('addon-visible'); });
        cards.forEach(function(card, i) {
          setTimeout(function() { card.classList.add('addon-visible'); }, 80 * i);
        });
      }

      /* ========== DYNAMIC PRICING ENGINE ========== */
      var recurringDiscounts = { Monthly: 5, Quarterly: 10 };

      function calculatePricing() {
        var guests = parseInt(formData.guestCount) || 0;
        var tier = formData.experienceTier || '';
        var basePerPerson = tierBasePrice[tier] || 0;

        /* Apply recurring cadence discount */
        var discountPerPerson = 0;
        if (formData.frequency === 'Recurring Program' && formData.recurringCadence) {
          discountPerPerson = recurringDiscounts[formData.recurringCadence] || 0;
        }
        var effectivePerPerson = Math.max(0, basePerPerson - discountPerPerson);
        var baseTotal = effectivePerPerson * guests;

        var addOnTotal = 0;
        var addOnDetails = [];
        formData.addOns.forEach(function(addonId) {
          var addon = null;
          for (var ai = 0; ai < addOnsData.length; ai++) {
            if (addOnsData[ai].id === addonId) { addon = addOnsData[ai]; break; }
          }
          if (!addon) return;
          var cost = addon.type === 'flat' ? addon.price : addon.price * guests;
          addOnTotal += cost;
          addOnDetails.push({ name: addon.name, cost: cost });
        });

        var spiritUpchargePerPerson = getSpiritUpchargePerPerson();
        var spiritTotal = spiritUpchargePerPerson * guests;
        var subtotal = baseTotal + addOnTotal + spiritTotal;
        var tax = Math.round(subtotal * TAX_RATE * 100) / 100;
        var grandTotal = subtotal + tax;

        return {
          guests: guests, tier: tier, basePerPerson: basePerPerson, effectivePerPerson: effectivePerPerson,
          discountPerPerson: discountPerPerson, baseTotal: baseTotal,
          addOnDetails: addOnDetails, addOnTotal: addOnTotal,
          spiritUpchargePerPerson: spiritUpchargePerPerson, spiritTotal: spiritTotal,
          subtotal: subtotal, tax: tax, grandTotal: grandTotal
        };
      }

      function updatePricing() {
        var pricing = calculatePricing();
        updateSummaryPanel(pricing);
      }

      /* ========== SUMMARY PANEL ========== */
      function setSummaryValue(id, value) {
        var el = document.getElementById(id);
        if (!el) return;
        if (value) {
          el.textContent = value;
          el.classList.remove('wizard__summary-value--empty');
        } else {
          el.textContent = '—';
          el.classList.add('wizard__summary-value--empty');
        }
      }

      function updateSummary() {
        setSummaryValue('sum-eventType', formData.eventType);
        setSummaryValue('sum-guestCount', formData.guestCount ? formData.guestCount + ' guests' : '');
        setSummaryValue('sum-experienceTier', formData.experienceTier);

        var mixlistDisplay = '';
        if (formData.mixlists && formData.mixlists.length > 0) {
          if (formData.mixlists[0] === 'Skip') {
            mixlistDisplay = 'Team will recommend';
          } else {
            mixlistDisplay = formData.mixlists.length + ' selected';
          }
        }
        setSummaryValue('sum-mixlist', mixlistDisplay);

        var freqDisplay = formData.frequency;
        if (formData.frequency === 'Recurring Program' && formData.recurringCadence) {
          freqDisplay = 'Recurring — ' + formData.recurringCadence;
        }
        setSummaryValue('sum-frequency', freqDisplay);

        var loc = '';
        if (formData.company) loc = formData.company;
        if (formData.address) loc += (loc ? ', ' : '') + formData.address;
        if (formData.city) loc += (loc ? ', ' : '') + formData.city;
        if (formData.state) loc += (loc ? ' ' : '') + formData.state;
        setSummaryValue('sum-location', loc);

        updatePricing();
      }

      function updateSummaryPanel(pricing) {
        var section = document.getElementById('summary-pricing');
        if (!section) return;
        if (pricing.tier && pricing.guests >= 20) {
          section.style.display = 'block';
        } else {
          section.style.display = 'none';
          return;
        }

        if (pricing.discountPerPerson > 0) {
          setLineAmount('sum-line-base', pricing.tier + ' ($' + pricing.basePerPerson + ' − $' + pricing.discountPerPerson + '/pp \u00d7 ' + pricing.guests + ')', '$' + pricing.baseTotal.toLocaleString());
        } else {
          setLineAmount('sum-line-base', pricing.tier + ' ($' + pricing.effectivePerPerson + '/pp \u00d7 ' + pricing.guests + ')', '$' + pricing.baseTotal.toLocaleString());
        }

        var addonsContainer = document.getElementById('sum-line-addons-container');
        if (addonsContainer) {
          addonsContainer.innerHTML = '';
          pricing.addOnDetails.forEach(function(a) {
            var line = document.createElement('div');
            line.className = 'wizard__summary-line';
            line.innerHTML = '<span class="wizard__summary-line-label">' + a.name + '</span><span class="wizard__summary-line-amount">$' + a.cost.toLocaleString() + '</span>';
            addonsContainer.appendChild(line);
          });
        }

        var spiritLine = document.getElementById('sum-line-spirits');
        if (spiritLine) {
          if (pricing.spiritTotal > 0) {
            spiritLine.style.display = 'flex';
            setLineAmount('sum-line-spirits', 'Spirit Upgrades (+$' + pricing.spiritUpchargePerPerson + '/pp)', '$' + pricing.spiritTotal.toLocaleString());
          } else {
            spiritLine.style.display = 'none';
          }
        }

        setLineAmount('sum-line-subtotal', 'Subtotal', '$' + pricing.subtotal.toLocaleString());
        setLineAmount('sum-line-tax', 'Tax (8.875%)', '$' + pricing.tax.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}));
        setLineAmount('sum-line-total', 'Total', '$' + pricing.grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}));
      }

      function setLineAmount(id, label, amount) {
        var el = document.getElementById(id);
        if (!el) return;
        var labelEl = el.querySelector('.wizard__summary-line-label');
        var amountEl = el.querySelector('.wizard__summary-line-amount');
        if (labelEl && label) labelEl.textContent = label;
        if (amountEl) amountEl.textContent = amount;
      }

      /* ========== RECOMMENDATION (Step 9) ========== */
      function buildRecommendation() {
        var tier = formData.experienceTier || 'Signature';
        var rec = tierRec[tier] || tierRec.Signature;
        var pricing = calculatePricing();

        var titleEl = document.getElementById('rec-title');
        var descEl = document.getElementById('rec-desc');
        var featEl = document.getElementById('rec-features');
        var priceEl = document.getElementById('rec-price');

        if (titleEl) titleEl.textContent = rec.title;
        if (descEl) descEl.textContent = rec.desc;
        if (featEl) {
          featEl.innerHTML = '';
          rec.features.forEach(function(f) {
            var li = document.createElement('li');
            li.textContent = f;
            featEl.appendChild(li);
          });
          if (formData.mixlists.length > 0 && formData.mixlists[0] !== 'Skip') {
            var li = document.createElement('li');
            li.textContent = formData.mixlists.length + ' cocktail menu' + (formData.mixlists.length > 1 ? 's' : '') + ' selected';
            featEl.appendChild(li);
          }
          var upgradeNames = Object.keys(formData.spiritUpgrades).map(function(cat) {
            return formData.spiritUpgrades[cat].brand;
          });
          if (upgradeNames.length > 0) {
            var li2 = document.createElement('li');
            li2.textContent = 'Spirit upgrades: ' + upgradeNames.join(', ');
            featEl.appendChild(li2);
          }
          formData.addOns.forEach(function(addonId) {
            var addon = null;
            for (var ai = 0; ai < addOnsData.length; ai++) {
              if (addOnsData[ai].id === addonId) { addon = addOnsData[ai]; break; }
            }
            if (addon) {
              var li3 = document.createElement('li');
              li3.textContent = addon.name;
              featEl.appendChild(li3);
            }
          });
        }
        if (priceEl) {
          if (pricing.guests >= 20 && pricing.tier) {
            var recPriceText = '<strong>$' + pricing.grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + '</strong> total for ' + pricing.guests + ' guests (incl. tax)';
            if (pricing.discountPerPerson > 0) {
              recPriceText += '<br><span style="color:var(--color-gold);font-size:0.85rem;">Includes $' + pricing.discountPerPerson + '/person recurring discount</span>';
            }
            priceEl.innerHTML = recPriceText;
          } else {
            priceEl.textContent = 'Complete guest count and tier to see pricing';
          }
        }
      }

      /* ---- Collect location fields on input ---- */
      ['wiz-company', 'wiz-address', 'wiz-city', 'wiz-state'].forEach(function(id) {
        var input = document.getElementById(id);
        if (input) {
          input.addEventListener('input', function() {
            if (id === 'wiz-company') formData.company = input.value;
            if (id === 'wiz-address') formData.address = input.value;
            if (id === 'wiz-city') formData.city = input.value;
            if (id === 'wiz-state') formData.state = input.value;
            updateSummary();
          });
        }
      });

      /* ---- Submit (Step 10) ---- */
      var submitBtn = document.getElementById('wizard-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', function() {
          var nameEl = document.getElementById('wiz-name');
          var emailEl = document.getElementById('wiz-email');
          var phoneEl = document.getElementById('wiz-phone');
          formData.name = nameEl ? nameEl.value : '';
          formData.email = emailEl ? emailEl.value : '';
          formData.phone = phoneEl ? phoneEl.value : '';

          var pricing = calculatePricing();
          /* Build UTM fields from sessionStorage */
          var utmFields = {};
          ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','li_fat_id','ttclid'].forEach(function(k) {
            var v = sessionStorage.getItem(k);
            if (v) utmFields[k] = v;
          });

          var sheetsPayload = {
            eventType: formData.eventType,
            guestCount: formData.guestCount,
            experienceTier: formData.experienceTier,
            mixlists: formData.mixlists.join(', '),
            spiritUpgrades: Object.keys(formData.spiritUpgrades).map(function(cat) {
              return cat + ': ' + formData.spiritUpgrades[cat].brand + ' (+$' + formData.spiritUpgrades[cat].upcharge + '/pp)';
            }).join('; ') || 'None',
            addOns: formData.addOns.join(', ') || 'None',
            frequency: formData.frequency,
            recurringCadence: formData.recurringCadence,
            company: formData.company, address: formData.address,
            city: formData.city, state: formData.state,
            name: formData.name, email: formData.email, phone: formData.phone,
            estimatedTotal: '$' + pricing.grandTotal.toFixed(2),
            /* UTM / Attribution fields */
            utm_source: utmFields.utm_source || '',
            utm_medium: utmFields.utm_medium || '',
            utm_campaign: utmFields.utm_campaign || '',
            utm_term: utmFields.utm_term || '',
            utm_content: utmFields.utm_content || '',
            gclid: utmFields.gclid || '',
            fbclid: utmFields.fbclid || '',
            li_fat_id: utmFields.li_fat_id || '',
            ttclid: utmFields.ttclid || '',
            landing_page: window.location.href,
            referrer: document.referrer || ''
          };

          var endpoint = 'https://script.google.com/macros/s/AKfycbwEMLWVZtMBM9KnqOx-16umA2LHwu9yOn7oEgjKtTKy9bmRuwZ0nB445E-kQlpDLIJp/exec';
          fetch(endpoint, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sheetsPayload)
          }).catch(function() {});

          /* Analytics: primary conversion event — used by Google Ads, Meta, LinkedIn */
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: 'form_submit_lead',
            event_type: formData.eventType,
            guest_count: formData.guestCount,
            experience_tier: formData.experienceTier,
            estimated_total: pricing.grandTotal.toFixed(2),
            currency: 'USD',
            value: pricing.grandTotal,
            company: formData.company,
            frequency: formData.frequency
          });

          showStep('success');

          var subject = encodeURIComponent('Barsys Event — Availability Request');
          var lines = [];
          lines.push('Hi Barsys team,');
          lines.push('');
          lines.push('I\'d like to check availability for a Barsys event:');
          lines.push('');
          if (formData.name) lines.push('Name: ' + formData.name);
          if (formData.email) lines.push('Email: ' + formData.email);
          if (formData.company) lines.push('Company: ' + formData.company);
          if (formData.phone) lines.push('Phone: ' + formData.phone);
          lines.push('');
          lines.push('Event Type: ' + (formData.eventType || 'Not specified'));
          lines.push('Guest Count: ' + (formData.guestCount || 'Not specified'));
          lines.push('Experience Tier: ' + (formData.experienceTier || 'Not specified'));
          lines.push('Mixlists: ' + (formData.mixlists[0] === 'Skip' ? 'Team will recommend' : formData.mixlists.join(', ') || 'Not specified'));
          if (Object.keys(formData.spiritUpgrades).length > 0) {
            lines.push('Spirit Upgrades: ' + Object.keys(formData.spiritUpgrades).map(function(cat) {
              return cat + ': ' + formData.spiritUpgrades[cat].brand;
            }).join(', '));
          }
          if (formData.addOns.length > 0) lines.push('Add-Ons: ' + formData.addOns.join(', '));
          lines.push('Frequency: ' + (formData.frequency || 'Not specified'));
          if (formData.recurringCadence) lines.push('Recurring Cadence: ' + formData.recurringCadence);
          lines.push('');
          if (formData.address) lines.push('Address: ' + formData.address);
          if (formData.city || formData.state) lines.push('City/State: ' + formData.city + ', ' + formData.state);
          lines.push('');
          lines.push('Estimated Total: $' + pricing.grandTotal.toFixed(2) + ' (incl. tax)');
          lines.push('');
          lines.push('Looking forward to hearing from you!');

          var body = encodeURIComponent(lines.join('\n'));
          try { window.location.href = 'mailto:fareed@barsys.com?subject=' + subject + '&body=' + body; } catch(e) {}
        });
      }

      /* ---- Package card pre-selection from pricing section ---- */
      document.querySelectorAll('[data-select-package]').forEach(function(link) {
        link.addEventListener('click', function() {
          var pkg = this.dataset.selectPackage;
          formData.experienceTier = pkg;
          var cards = wizard.querySelectorAll('[data-step="3"] .package-card--selectable');
          cards.forEach(function(c) {
            c.classList.remove('selected');
            if (c.dataset.value === pkg) c.classList.add('selected');
          });
          updateMixlistUI();
          updatePricing();
          updateSummary();
        });
      });
    })();

    (function () {
      'use strict';

      var MIXLIST_RECIPES = {
        'The Signature Mixlist': {
          desc: 'Bold, balanced, and effortlessly enjoyable.',
          recipes: [
            { name: 'Cosmopolitan', image: 'https://media.barsys.com/images/1747325043Copy%20of%20Barsys_RB_2025_April_Cosmopolitan_1x1_MA_GA.jpg', ingredients: 'Vodka, Cointreau, Cranberry Juice, Fresh Lime Juice' },
            { name: 'Madras', image: 'https://media.barsys.com/images/blog_images/1759817861_Barsys_2025_Oct_Mixlist_Madras_1x1_AT_GA.jpg', ingredients: 'Vodka, Cranberry Juice, Fresh Orange Juice' },
            { name: 'Margarita', image: 'https://media.barsys.com/images/1747325121Copy%20of%20Barsys_RB_2025_April_Margarita_1x1_MA_GA.jpg', ingredients: 'Tequila, Cointreau, Fresh Lime Juice' },
            { name: 'Tequila Twilight', image: 'https://media.barsys.com/images/blog_images/1759817941_Barsys_2025_Oct_Mixlist_Tequila%20Twilight_1x1_AT_GA.jpg', ingredients: 'Tequila, Cointreau, Cranberry Juice, Fresh Lime Juice' }
          ]
        },
        'The Vibrant Classics': {
          desc: 'Crowd favorites, classic and contemporary.',
          recipes: [
            { name: 'Bourbon Sidecar', image: 'https://media.barsys.com/images/1747325395Copy%20of%20Barsys_RB_2025_April_Bourbon_Sidecar_1x1_MA_GA.jpg', ingredients: 'Bulleit Bourbon, Cointreau, Fresh Lime Juice' },
            { name: 'Classic Daiquiri', image: 'https://media.barsys.com/images/1747325352Copy%20of%20Barsys_RB_2025_April_Classic_Daiquiri_1x1_MA_GA.jpg', ingredients: 'Bacardi White Rum, Fresh Lime Juice, Simple Syrup' },
            { name: 'Caribbean Cooler', image: 'https://media.barsys.com/images/1747325453Copy%20of%20Barsys_RB_2025_April_Caribbean_Cooler_1x1_MA_GA.jpg', ingredients: 'Bacardi White Rum, Cointreau, Fresh Lime Juice, Simple Syrup' },
            { name: 'Manhattan Twist', image: 'https://media.barsys.com/images/1747325490Copy%20of%20Barsys_RB_2025_April_Manhattan_Twist_1x1_MA_GA.jpg', ingredients: 'Bulleit Bourbon, Foro Rosso Vermouth, Cointreau' }
          ]
        },
        "The Agave Lover's": {
          desc: 'Tequila and mezcal, elevated.',
          recipes: [
            { name: "Tommy's Margarita", image: 'https://media.barsys.com/images/1747473252tommy%20margarita.jpg', ingredients: 'Casamigos Blanco Tequila, Fresh Lime Juice, Agave Syrup' },
            { name: 'Oaxacan Gold', image: 'https://media.barsys.com/images/1747324792Copy%20of%20Barsys_RB_2025_April_Oaxacan_Gold_1x1_MA_GA.jpg', ingredients: 'Del Maguey Vida Mezcal, Cointreau, Fresh Lime Juice, Agave Syrup' },
            { name: 'Smoked Pina Sour', image: 'https://media.barsys.com/images/1747473335smoked%20pina.jpg', ingredients: 'Del Maguey Vida Mezcal, Fresh Pineapple Juice, Fresh Lime Juice, Agave Syrup' },
            { name: 'Pineapple Highball', image: 'https://media.barsys.com/images/1742907408Pineapple%20highball.jpg', ingredients: 'Casamigos Blanco Tequila, Fresh Pineapple Juice, Cointreau, Fresh Lime Juice' },
            { name: 'Mezcal Old Fashioned', image: 'https://media.barsys.com/images/1747324636Copy%20of%20Barsys_RB_2025_April_Mezcal_Old_Fashioned_1x1_MA_GA.jpg', ingredients: 'Del Maguey Vida Mezcal, Agave Syrup, Cointreau' }
          ]
        },
        'Après Spritz Club': {
          desc: 'Golden hour \u2014 the bubbles never stop.',
          recipes: [
            { name: 'Chairlift Aperol Spritz', image: 'https://media.barsys.com/images/blog_images/1771332875_Barsys_Mixlist_2026_Feb_Chairlift%20Aperol%20Spritz_1x1_AT_GA.jpg', ingredients: 'Aperol, Prosecco, Soda Water' },
            { name: 'Red Run Campari Spritz', image: 'https://media.barsys.com/images/blog_images/1771393303_Barsys_Mixlist_2026_Feb_Red%20Run%20Campari%20Spritz_1x1_AT_GA.jpg', ingredients: 'Campari, Prosecco, Soda Water' },
            { name: 'Golden Hour Limoncello Spritz', image: 'https://media.barsys.com/images/blog_images/1771394817_Barsys_Mixlist_2026_Feb_Golden%20Hour%20Limoncello%20Spritz_1x1_AT_GA.jpg', ingredients: 'Limoncello, Prosecco, Soda Water' },
            { name: 'Velvet Gondola Spritz', image: 'https://media.barsys.com/images/blog_images/1771396399_Barsys_Mixlist_2026_Feb_Velvet%20Gondola%20Spritz_1x1_AT_GA.jpg', ingredients: 'St-Germain, Blackcurrant Juice, Prosecco, Soda Water' },
            { name: 'Black Diamond Lemon Spritz', image: 'https://media.barsys.com/images/blog_images/1771397885_Barsys_Mixlist_2026_Feb_Black%20Dimond%20Lemon%20Spritz_1x1_AT_GA.jpg', ingredients: 'Limoncello, Blackcurrant Juice, Prosecco, Soda Water' },
            { name: 'Alpenglow Spritz', image: 'https://media.barsys.com/images/blog_images/1771399405_Barsys_Mixlist_2026_Feb_Alpenglow%20Spritz_1x1_AT_GA.jpg', ingredients: 'Aperol, Campari, Blackcurrant Juice, Prosecco, Soda Water' },
            { name: 'Powder Day Hugo Spritz', image: 'https://media.barsys.com/images/blog_images/1771400557_Barsys_Mixlist_2026_Feb_Power%20Day%20Hugo%20Spritz_1x1_AT_GA.jpg', ingredients: 'St-Germain, Prosecco, Soda Water' }
          ]
        },
        'Neon Shadows': {
          desc: 'For nights that stretch past the plan.',
          recipes: [
            { name: 'Velvet Arctic', image: 'https://media.barsys.com/images/blog_images/1770708648_Barsys_Mixlist_2026_Feb_Velvet%20Arctic_1x1_AT_GA.jpg', ingredients: 'Ketel One Vodka, Creme de Menthe, Honey Syrup' },
            { name: 'Sunset over Milan', image: 'https://media.barsys.com/images/blog_images/1770710105_Barsys_Mixlist_2026_Feb_Sunset%20Over%20Milan_1x1_AT_GA.jpg', ingredients: 'Ketel One Vodka, Aperol, Pineapple Juice' },
            { name: 'Minted Gold', image: 'https://media.barsys.com/images/blog_images/1770712159_Barsys_Mixlist_2026_Feb_Minted%20Gold_1x1_AT_GA.jpg', ingredients: 'Ketel One Vodka, Creme de Menthe, Honey Syrup' },
            { name: 'Ginger Tropics', image: 'https://media.barsys.com/images/blog_images/1770715425_Barsys_Mixlist_2026_Feb_Ginger%20Tropics_1x1_AT_GA.jpg', ingredients: 'Ketel One Vodka, Pineapple Juice, Lime Juice' },
            { name: 'Honeyed Mint Cooler', image: 'https://media.barsys.com/images/blog_images/1770718336_Barsys_Mixlist_2026_Feb_Honeyed%20Mint%20Cooler_1x1_AT_GA.jpg', ingredients: 'Ketel One Vodka, Creme de Menthe, Honey Syrup' }
          ]
        },
        'Bold Frequency': {
          desc: 'Depth, spice, and structure.',
          recipes: [
            { name: 'Iron Harvest', image: 'https://media.barsys.com/images/blog_images/1771912228_iron%20harvest.jpg', ingredients: 'Bulleit Rye, Cynar, Apple Cider, Maple Syrup' },
            { name: 'Blood & Brine', image: 'https://media.barsys.com/images/blog_images/1771915687_blood%20%26%20brine.jpg', ingredients: 'Bulleit Rye, Blood Orange Juice, Cynar' },
            { name: 'The Maple Ledger', image: 'https://media.barsys.com/images/blog_images/1771917377_The%20Maple%20ledger%20(2).jpg', ingredients: 'Bulleit Rye, Maple Syrup, Fresh Lemon Juice' },
            { name: 'The Flux Old Fashioned', image: 'https://media.barsys.com/images/blog_images/1771919798_the%20flux%20old%20fashioned%20(1).jpg', ingredients: 'Bulleit Rye, Cynar, Maple Syrup' }
          ]
        },
        "Sharp & Steady": {
          desc: "A precision-driven collection where crisp citrus meets the depth of oak, agave, and botanical spirit.",
          recipes: [
            { name: 'Velvet Sting', image: 'https://media.barsys.com/images/blog_images/1773382525_Velvet%20Sting.jpg', ingredients: 'Tequila, Lemon Juice, Maple Syrup' },
            { name: 'Green Alchemy', image: 'https://media.barsys.com/images/blog_images/1773388454_Green%20Alchemy.jpg', ingredients: 'Vodka, Absinthe, Lemon Juice, Maple Syrup' },
            { name: 'Maple Mule', image: 'https://media.barsys.com/images/blog_images/1773393717_Maple%20Mule.jpg', ingredients: 'Bourbon Whiskey, Lemon Juice, Ginger Beer' },
            { name: 'Bitter Halo', image: 'https://media.barsys.com/images/blog_images/1773396786_Bitter%20Halo.jpg', ingredients: 'Tequila, Absinthe, Lemon Juice' }
          ]
        },
        "Silk & Snap": {
          desc: "Smooth pear vodka meets bright citrus in elegant, easy-drinking cocktails.",
          recipes: [
            { name: 'Spiced Orchard Mule', image: 'https://media.barsys.com/images/blog_images/1773300013_Spiced%20Orchard%20Mule.jpg', ingredients: 'Pear Vodka, Vanilla Syrup, Ginger Beer' },
            { name: 'Pear-Peach Silk', image: 'https://media.barsys.com/images/blog_images/1773305119_Pear-Peach%20Silk.jpg', ingredients: 'Pear Vodka, Peach Schnapps, Lemon Juice' },
            { name: 'Pear & Orange Smash', image: 'https://media.barsys.com/images/blog_images/1773310621_Pear%20&%20Orange%20Smash.jpg', ingredients: 'Pear Vodka, Cointreau, Lemon Juice' },
            { name: 'Velvet Pomelo', image: 'https://media.barsys.com/images/blog_images/1773312695_Velvet%20Pomelo.jpg', ingredients: 'Pear Vodka, Peach Schnapps, Apricot Liqueur, Grapefruit Soda' },
            { name: 'Pristine Martini', image: 'https://media.barsys.com/images/blog_images/1773314424_Pristine%20Martini.jpg', ingredients: 'Pear Vodka, Cointreau, Apricot Liqueur, Vanilla Syrup' }
          ]
        },
        "Clear Coast": {
          desc: "Crisp white rum cocktails with bright tropical and citrus notes.",
          recipes: [
            { name: 'Steeped Island', image: 'https://media.barsys.com/images/blog_images/1773128564_Steeped%20Island.jpg', ingredients: 'Bacardi White Rum, Iced Tea, Simple Syrup' },
            { name: 'Velvet Reef', image: 'https://media.barsys.com/images/blog_images/1773131396_Velvet%20Reef.jpg', ingredients: 'Bacardi White Rum, Coconut Water, Lime Juice' },
            { name: 'Ruby Spice Mule', image: 'https://media.barsys.com/images/blog_images/1773133643_Ruby%20Spice%20Mule.jpg', ingredients: 'Bacardi White Rum, Cranberry Juice, Ginger Beer' },
            { name: 'Carbon Blush', image: 'https://media.barsys.com/images/blog_images/1773139246_Carbon%20Blush.jpg', ingredients: 'Bacardi White Rum, Cranberry Juice, Grapefruit Soda' }
          ]
        },
        "Dusk to Agave": {
          desc: "Añejo warmth and rich agave flavors as the sun goes down.",
          recipes: [
            { name: 'Paloma Gold', image: 'https://media.barsys.com/images/blog_images/1772084300_Paloma%20Gold.jpg', ingredients: 'Teremana Añejo, Agave Syrup, Grapefruit Soda' },
            { name: 'Orchard Spice Highball', image: 'https://media.barsys.com/images/blog_images/1772087134_Orchard%20Spice%20Highball.jpg', ingredients: 'Teremana Añejo, Apple Juice, Ginger Beer' },
            { name: 'Obsidian Sipper', image: 'https://media.barsys.com/images/blog_images/1772087920_Obsidian%20Sipper.jpg', ingredients: 'Teremana Añejo, Cherry Juice, Agave Syrup' },
            { name: 'Jalisco Manhattan', image: 'https://media.barsys.com/images/blog_images/1772089895_Jalisco%20Manhattan.jpg', ingredients: 'Teremana Añejo, Sweet Vermouth, Lime Juice' },
            { name: 'Cherry-Apple Cobbler', image: 'https://media.barsys.com/images/blog_images/1772090947_Cherry-Apple%20Cobbler.jpg', ingredients: 'Teremana Añejo, Cherry Juice, Apple Juice' }
          ]
        },
        "Molasses Theory": {
          desc: "Vermouth-forward cocktails with layered, bittersweet complexity.",
          recipes: [
            { name: 'Tropical Resonance', image: 'https://media.barsys.com/images/blog_images/1771998383_Tropical%20Resonance.jpg', ingredients: 'Foro Vermouth Rosso, Pineapple Juice, Lemon Juice, Maple Syrup' },
            { name: 'Lunar Gloss', image: 'https://media.barsys.com/images/blog_images/1771999457_Lunar%20Gloss.jpg', ingredients: 'Foro Vermouth Rosso, Maple Syrup, Cherry Juice' },
            { name: 'The Static Pulse', image: 'https://media.barsys.com/images/blog_images/1772001514_The%20Static%20Pulse.jpg', ingredients: 'Foro Vermouth Rosso, Dark Rum, Pineapple Juice, Lemon Juice' },
            { name: 'Pure Signal', image: 'https://media.barsys.com/images/blog_images/1772004043_Pure%20Signal.jpg', ingredients: 'Foro Vermouth Rosso, Lemon Juice, Cherry Juice' },
            { name: 'Kinetic Amber', image: 'https://media.barsys.com/images/blog_images/1772005376_Kinetic%20Amber.jpg', ingredients: 'Foro Vermouth Rosso, Dark Rum, Pineapple Juice' }
          ]
        },
        "Fluid Code": {
          desc: "Alcohol-free cocktails with bold fruit and botanical energy.",
          recipes: [
            { name: 'Velvet Purple', image: 'https://media.barsys.com/images/blog_images/1771222303_Velvet%20Purple.jpg', ingredients: 'Blueberry Juice, Apple Juice, Honey Syrup, Lemon Juice' },
            { name: 'Solar Flare', image: 'https://media.barsys.com/images/blog_images/1771223768_Solar%20Flare.jpg', ingredients: 'Passion Fruit Juice, Apple Juice, Ginger Beer' },
            { name: 'Volt & Velvet', image: 'https://media.barsys.com/images/blog_images/1771225904_Volt%20%26%20Velvet.jpg', ingredients: 'Passion Fruit Juice, Honey Syrup, Lemon Juice, Club Soda' },
            { name: 'Neon Flux', image: 'https://media.barsys.com/images/blog_images/1771227940_Neon%20Flux.jpg', ingredients: 'Grapefruit Juice, Apple Juice, Grapefruit Soda' },
            { name: 'Zesty Vine', image: 'https://media.barsys.com/images/blog_images/1771229754_Zesty%20Vine.jpg', ingredients: 'Blueberry Juice, Grapefruit Juice, Honey Syrup' }
          ]
        },
        "The Bold Circuit": {
          desc: "Bourbon backbone with bright sparks of tea and citrus.",
          recipes: [
            { name: 'Midnight Tea', image: 'https://media.barsys.com/images/blog_images/1770894505_Midnight%20Tea.jpg', ingredients: 'Bulleit Bourbon, Green Tea, Simple Syrup' },
            { name: 'Amber Flare', image: 'https://media.barsys.com/images/blog_images/1770888353_Amber_Flare.jpg', ingredients: 'Bulleit Bourbon, Cointreau, Lemon Juice' },
            { name: 'Green Harvest', image: 'https://media.barsys.com/images/blog_images/1770894537_Green%20harvest.jpg', ingredients: 'Bulleit Bourbon, Green Tea, Apple Juice' },
            { name: 'Cointreau Carriage', image: 'https://media.barsys.com/images/blog_images/1770894588_Cointreau%20Carriage%20.jpg', ingredients: 'Bulleit Bourbon, Cointreau, Lemon Juice, Simple Syrup' }
          ]
        },
        "Love at First Sip": {
          desc: "Romance in every pour — vodka, prosecco, and rosy finishes.",
          recipes: [
            { name: "Cupid's Spark", image: 'https://media.barsys.com/images/blog_images/1770619927_Barsys_Mixlist_2026_Feb_Cupid%27s%20Spark_1x1_AT_GA.jpg', ingredients: 'Vodka, Limoncello, Cranberry Juice, Prosecco' },
            { name: 'Venetian Valentine', image: 'https://media.barsys.com/images/blog_images/1770622301_Barsys_Mixlist_2026_Feb_Venetian%20Valentine_1x1_AT_GA.jpg', ingredients: 'Vodka, Rosé Wine, Limoncello, Club Soda' },
            { name: 'Love Note', image: 'https://media.barsys.com/images/blog_images/1770623777_Barsys_Mixlist_2026_Feb_Love%20Note_1x1_AT_GA.jpg', ingredients: 'Vodka, Cranberry Juice, Honey Syrup, Prosecco' },
            { name: "Cupid's Whisper", image: 'https://media.barsys.com/images/blog_images/1770624686_Barsys_Mixlist_2026_Feb_whisper_1x1_AT_GA.jpg', ingredients: 'Vodka, White Crème de Cacao, Heavy Cream, Rose Syrup' },
            { name: 'Kiss from a Rose', image: 'https://media.barsys.com/images/blog_images/1770627874_Barsys_Mixlist_2026_Feb_Kiss%20From%20A%20Rose_1x1_AT_GA.jpg', ingredients: 'Vodka, Chocolate Liqueur, Heavy Cream, Rose Syrup' }
          ]
        },
        "Confessions in Glass": {
          desc: "Gin and strawberry secrets with sparkling, floral finishes.",
          recipes: [
            { name: 'Velvet Rose', image: 'https://media.barsys.com/images/blog_images/1770538793_Barsys_Mixlist_2026_Feb_Velvet%20Rose_1x1_AT_GA.jpg', ingredients: 'Sipsmith Gin, Strawberry Syrup, Lime Juice' },
            { name: 'Sparkling Bouquet', image: 'https://media.barsys.com/images/blog_images/1770540791_Barsys_Mixlist_2026_Feb_Sparkling%20Bouquet_1x1_AT_GA.jpg', ingredients: 'Sipsmith Gin, Strawberry Syrup, Simple Syrup, Prosecco' },
            { name: 'Cocoa-Berry', image: 'https://media.barsys.com/images/blog_images/1770542403_Barsys_Mixlist_2026_Feb_Cocoa-Berry%20Highball_1x1_AT_GA.jpg', ingredients: 'Sipsmith Gin, Crème de Noyaux, Strawberry Syrup, Club Soda' },
            { name: 'Passionate Heart', image: 'https://media.barsys.com/images/blog_images/1770544876_Barsys_Mixlist_2026_Feb_Passionate%20Heart_1x1_AT_GA.jpg', ingredients: 'Sipsmith Gin, Strawberry Syrup, Cointreau, Lime Juice' },
            { name: 'Secret Admirer', image: 'https://media.barsys.com/images/blog_images/1770547259_Barsys_Mixlist_2026_Feb_Secret%20Admirer_1x1_AT_GA.jpg', ingredients: 'Sipsmith Gin, Cointreau, Crème de Noyaux, Simple Syrup, Prosecco' }
          ]
        },
        "Sombra & Sol": {
          desc: "Smoky mezcal and sun-kissed citrus in every glass.",
          recipes: [
            { name: 'Desert Smoke', image: 'https://media.barsys.com/images/blog_images/1773044791_Barsys_Mixlist_2026_Feb_Desert%20Smoke_1x1_AT_GA.jpg', ingredients: 'Del Maguey Mezcal, Watermelon Juice, Lime Juice' },
            { name: 'Painted Desert', image: 'https://media.barsys.com/images/blog_images/1773044862_Barsys_Mixlist_2026_Feb_Painted%20Desert_1x1_AT_GA.jpg', ingredients: 'Del Maguey Mezcal, Teremana Blanco, Watermelon Juice, Agave Syrup' },
            { name: 'Smoldering Citrus', image: 'https://media.barsys.com/images/blog_images/1773044917_Barsys_Mixlist_2026_Feb_Smoldering%20Citrus_1x1_AT_GA.jpg', ingredients: 'Del Maguey Mezcal, Blood Orange Juice, Agave Syrup' },
            { name: 'Smoky Lime', image: 'https://media.barsys.com/images/blog_images/1773044939_Barsys_Mixlist_2026_Feb_Smoky%20Lime_1x1_AT_GA.jpg', ingredients: 'Teremana Blanco, Lime Juice, Agave Syrup' },
            { name: 'Fire & Fruit', image: 'https://media.barsys.com/images/blog_images/1773045032_Barsys_Mixlist_2026_Feb_Fire%20%26%20Fruit_1x1_AT_GA.jpg', ingredients: 'Teremana Blanco, Blood Orange Juice, Lime Juice, Agave Syrup' }
          ]
        },
        "Flora-Bitter": {
          desc: "Botanical vodka and bitter Campari in floral harmony.",
          recipes: [
            { name: 'Flora-Glow', image: 'https://media.barsys.com/images/blog_images/1770282722_Barsys_Mixlist_2026_Feb_Flora%20Glow_1x1_AT_GA.jpg', ingredients: 'Reyka Vodka, Elderflower Liqueur, Maple Syrup, Lemon Juice' },
            { name: 'Bitter Side', image: 'https://media.barsys.com/images/blog_images/1770282780_Barsys_Mixlist_2026_Feb_The%20Bitter%20Side_1x1_AT_GA.jpg', ingredients: 'Campari, Pomegranate Juice, Lemon Juice' },
            { name: 'Floral Negroni', image: 'https://media.barsys.com/images/blog_images/1770282802_Barsys_Mixlist_2026_Feb_Floral%20Negroni_1x1_AT_GA.jpg', ingredients: 'Reyka Vodka, Elderflower Liqueur, Campari' },
            { name: 'North Star', image: 'https://media.barsys.com/images/blog_images/1770282851_Barsys_Mixlist_2026_Feb_North%20Star_1x1_AT_GA.jpg', ingredients: 'Campari, Elderflower Liqueur, Maple Syrup' }
          ]
        },
        "Punt, Pass, & Pour": {
          desc: "Game day reposado tequila cocktails with bold fruit flavors.",
          recipes: [
            { name: 'Coin Toss', image: 'https://media.barsys.com/images/blog_images/1769497772_Barsys_Mixlist_2026_Jan_Coin%20Toss_1x1_AT_GA.jpg', ingredients: 'Teremana Reposado, Watermelon Juice, Agave Syrup' },
            { name: 'Pocket Protector', image: 'https://media.barsys.com/images/blog_images/1769499911_Barsys_Mixlist_2026_Jan_Pocket%20Protector_1x1_AT_GA.jpg', ingredients: 'Teremana Reposado, Lime Juice, Blueberry Syrup' },
            { name: 'Wide Receiver', image: 'https://media.barsys.com/images/blog_images/1769503425_Barsys_Mixlist_2026_Jan_Wide%20Receiver_1x1_AT_GA.jpg', ingredients: 'Teremana Reposado, Watermelon Juice, Grapefruit Soda' },
            { name: 'Blindside Blitz', image: 'https://media.barsys.com/images/blog_images/1769511661_Barsys_Mixlist_2026_Jan_Blindside%20Blitz_1x1_AT_GA.jpg', ingredients: 'Teremana Reposado, Lime Juice, Ginger Beer' },
            { name: 'Two-Point Conversion', image: 'https://media.barsys.com/images/blog_images/1769515207_Barsys_Mixlist_2026_Jan_Two%20Point%20Conversion_1x1_AT_GA.jpg', ingredients: 'Teremana Reposado, Pineapple Juice, Watermelon Juice, Lime Juice' }
          ]
        },
        "Turf & Tonic": {
          desc: "Bourbon-forward pours built for game day gatherings.",
          recipes: [
            { name: 'Red Zone', image: 'https://media.barsys.com/images/blog_images/1769071931_Barsys_Mixlist_2026_Jan_Red%20Zone_1x1_AT_GA.jpg', ingredients: 'Bulleit Bourbon, Cherry Juice, Maple Syrup' },
            { name: 'Gridiron Fizz', image: 'https://media.barsys.com/images/blog_images/1769071950_Barsys_Mixlist_2026_Jan_Gridiron%20Fizz_1x1_AT_GA.jpg', ingredients: 'Bulleit Bourbon, Lemon Juice, Orgeat Syrup, Club Soda' },
            { name: 'Halftime Green Tea', image: 'https://media.barsys.com/images/blog_images/1769073299_Barsys_Mixlist_2026_Jan_Halftime%20Green%20Tea_1x1_AT_GA.jpg', ingredients: 'Green Tea, Bulleit Bourbon, Lemon Juice' },
            { name: 'Ruby Scrimmage', image: 'https://media.barsys.com/images/blog_images/1769075740_Barsys_Mixlist_2026_Jan_Ruby%20Scrimmage_1x1_AT_GA.jpg', ingredients: 'Bulleit Bourbon, Lemon Juice, Grapefruit Soda' },
            { name: 'Almond Field Goal', image: 'https://media.barsys.com/images/blog_images/1769078449_Barsys_Mixlist_2026_Jan_Almond%20Field%20Goal_1x1_AT_GA.jpg', ingredients: 'Bulleit Bourbon, Orgeat Syrup, Lemon Juice' },
            { name: 'Fullback', image: 'https://media.barsys.com/images/blog_images/1769080578_Barsys_Mixlist_2026_Jan_Fullback_1x1_AT_GA.jpg', ingredients: 'Bulleit Bourbon, Maple Syrup, Orgeat Syrup' }
          ]
        },
        "13 Botanicals": {
          desc: "Cynar and brandy-driven cocktails with herbal, bitter depth.",
          recipes: [
            { name: 'Venetian Brandy', image: 'https://media.barsys.com/images/blog_images/1770206407_Barsys_Mixlist_2026_Feb_Venetian%20Brandy_1x1_AT_GA.jpg', ingredients: 'Brandy, Cynar, Dry Vermouth' },
            { name: 'Artichoke Martini', image: 'https://media.barsys.com/images/blog_images/1770206424_Barsys_Mixlist_2026_Feb_Artichoke%20Martini_1x1_AT_GA.jpg', ingredients: 'Cynar, Dry Vermouth' },
            { name: 'Sour Monk', image: 'https://media.barsys.com/images/blog_images/1770206441_Barsys_Mixlist_2026_Feb_Sour%20Monk_1x1_AT_GA.jpg', ingredients: 'Brandy, Cynar, Lemon Juice, Simple Syrup' },
            { name: 'The Golden Bitter', image: 'https://media.barsys.com/images/blog_images/1770206461_Barsys_Mixlist_2026_Feb_The%20Golden%20Bitter_1x1_AT_GA.jpg', ingredients: 'Brandy, Cynar, Orange Juice, Simple Syrup' },
            { name: 'The Dry Side', image: 'https://media.barsys.com/images/blog_images/1770206484_Barsys_Mixlist_2026_Feb_The%20Dry%20Side_1x1_AT_GA.jpg', ingredients: 'Cynar, Dry Vermouth, Lemon Juice' }
          ]
        }
      };

      var modal = document.getElementById('mixlist-modal');
      var modalTitle = modal.querySelector('.mixlist-modal__title');
      var modalDesc = modal.querySelector('.mixlist-modal__desc');
      var modalGrid = document.getElementById('mixlist-modal-grid');
      var backdrop = modal.querySelector('.mixlist-modal__backdrop');
      var closeBtn = modal.querySelector('.mixlist-modal__close');

      function openModal(name) {
        var data = MIXLIST_RECIPES[name];
        if (!data) return;

        modalTitle.textContent = name;
        modalDesc.textContent = data.desc;
        modalGrid.innerHTML = data.recipes.map(function (r) {
          return '<div class="recipe-card">' +
            '<img class="recipe-card__img" src="' + r.image + '" alt="' + r.name + '" width="400" height="400" loading="lazy" />' +
            '<div class="recipe-card__body">' +
              '<div class="recipe-card__name">' + r.name + '</div>' +
              '<div class="recipe-card__ingredients">' + r.ingredients + '</div>' +
            '</div>' +
          '</div>';
        }).join('');

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
      }

      function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
      }

      // Click handlers on mixlist cards
      document.querySelectorAll('.mixlist-card[data-mixlist]').forEach(function (card) {
        card.addEventListener('click', function () {
          openModal(card.getAttribute('data-mixlist'));
        });
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(card.getAttribute('data-mixlist'));
          }
        });
      });

      // Close handlers
      closeBtn.addEventListener('click', closeModal);
      backdrop.addEventListener('click', closeModal);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
          closeModal();
        }
      });
    })();

    /* ========== STICKY MOBILE CTA ========== */
    document.addEventListener('DOMContentLoaded', function() {
      var stickyBar = document.getElementById('sticky-mobile-cta');
      if (!stickyBar || window.innerWidth > 768) return;

      var heroSection = document.querySelector('.hero') || document.querySelector('[aria-labelledby="hero-headline"]');
      var wizardSection = document.getElementById('book');
      var heroVisible = true;
      var wizardVisible = false;

      function updateStickyVisibility() {
        var shouldShow = !heroVisible && !wizardVisible;
        stickyBar.classList.toggle('visible', shouldShow);
        stickyBar.setAttribute('aria-hidden', !shouldShow);
      }

      if (heroSection) {
        var heroObs = new IntersectionObserver(function(entries) {
          heroVisible = entries[0].isIntersecting;
          updateStickyVisibility();
        }, { threshold: 0.1 });
        heroObs.observe(heroSection);
      }

      if (wizardSection) {
        var wizObs = new IntersectionObserver(function(entries) {
          wizardVisible = entries[0].isIntersecting;
          updateStickyVisibility();
        }, { threshold: 0.1 });
        wizObs.observe(wizardSection);
      }
    });

  (function() {
    var dl = window.dataLayer = window.dataLayer || [];

    /* CTA Click Tracking */
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.btn');
      if (!btn) return;
      var section = btn.closest('section');
      dl.push({
        event: 'cta_click',
        cta_text: btn.textContent.trim(),
        cta_href: btn.getAttribute('href') || '',
        cta_section: section ? (section.id || section.className.split(' ')[0]) : 'unknown'
      });
    });

    /* Scroll Depth Milestones */
    var scrollFired = {};
    var milestones = [25, 50, 75, 90];
    window.addEventListener('scroll', function() {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      var pct = Math.round((window.scrollY / docHeight) * 100);
      milestones.forEach(function(m) {
        if (pct >= m && !scrollFired[m]) {
          scrollFired[m] = true;
          dl.push({ event: 'scroll_depth', depth_percent: m });
        }
      });
    }, { passive: true });

    /* Video Play Tracking */
    document.querySelectorAll('video').forEach(function(vid) {
      vid.addEventListener('play', function() {
        var label = vid.closest('.video-grid__item');
        var labelText = label ? (label.querySelector('.video-grid__label') || {}).textContent || '' : '';
        dl.push({
          event: 'video_play',
          video_label: labelText || vid.getAttribute('poster') || 'hero-video'
        });
      }, { once: true });
    });
  })();

