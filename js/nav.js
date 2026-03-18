/**
 * Barsys Happy Hour — Navigation JS
 * Handles: sticky scroll state, mobile hamburger toggle, smooth close on link click,
 *          active link highlight based on scroll position
 */

(function () {
  'use strict';

  const SCROLL_THRESHOLD = 50;

  const nav = document.querySelector('.nav');
  const hamburger = document.querySelector('.nav__hamburger');
  const navLinks = document.querySelectorAll('.nav__link');

  if (!nav) return;

  // --------------------------------------------------------------------------
  // Scroll: nav background + active link highlight (single handler)
  // --------------------------------------------------------------------------
  const sections = document.querySelectorAll('section[id]');
  let scrollTicking = false;

  function onScroll() {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        // Nav background state
        if (window.scrollY > SCROLL_THRESHOLD) {
          nav.classList.add('nav--scrolled');
        } else {
          nav.classList.remove('nav--scrolled');
        }

        // Active link highlight
        const scrollY = window.scrollY;
        sections.forEach((section) => {
          const sectionTop = section.offsetTop - 100;
          const sectionBottom = sectionTop + section.offsetHeight;
          const id = section.getAttribute('id');

          if (scrollY >= sectionTop && scrollY < sectionBottom) {
            navLinks.forEach((link) => {
              link.classList.remove('nav__link--active');
              if (link.getAttribute('href') === '#' + id) {
                link.classList.add('nav__link--active');
              }
            });
          }
        });

        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // check initial state

  // --------------------------------------------------------------------------
  // Mobile hamburger toggle
  // --------------------------------------------------------------------------
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('nav--open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  // --------------------------------------------------------------------------
  // Close mobile menu on nav link click
  // --------------------------------------------------------------------------
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('nav--open');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // --------------------------------------------------------------------------
  // Close menu on Escape key
  // --------------------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('nav--open')) {
      nav.classList.remove('nav--open');
      if (hamburger) {
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.focus();
      }
      document.body.style.overflow = '';
    }
  });

})();
