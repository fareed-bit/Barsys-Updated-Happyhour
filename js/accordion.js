/**
 * Barsys Happy Hour — Accordion JS
 * Handles: expand/collapse for FAQ accordion items
 * Uses CSS grid-template-rows trick for smooth height animation
 */

(function () {
  'use strict';

  /**
   * Initialize all accordions on the page.
   * Supports multiple independent accordion groups.
   */
  function initAccordions() {
    const triggers = document.querySelectorAll('.accordion__trigger');

    triggers.forEach((trigger) => {
      const item = trigger.closest('.accordion__item');
      const content = item.querySelector('.accordion__content');

      // Set initial ARIA attributes
      trigger.setAttribute('aria-expanded', 'false');
      if (content) {
        const contentId = content.id || `accordion-content-${Math.random().toString(36).slice(2, 7)}`;
        content.id = contentId;
        trigger.setAttribute('aria-controls', contentId);
        content.setAttribute('aria-hidden', 'true');
      }

      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('accordion__item--open');

        // Option: close all siblings first (uncomment for single-open behavior)
        // const accordion = item.closest('.accordion');
        // if (accordion) {
        //   accordion.querySelectorAll('.accordion__item--open').forEach((openItem) => {
        //     closeItem(openItem);
        //   });
        // }

        if (isOpen) {
          closeItem(item);
        } else {
          openItem(item);
        }
      });

      // Keyboard: Enter / Space already fires click on buttons — no extra handling needed
    });
  }

  function openItem(item) {
    const trigger = item.querySelector('.accordion__trigger');
    const content = item.querySelector('.accordion__content');

    item.classList.add('accordion__item--open');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    if (content) content.setAttribute('aria-hidden', 'false');
  }

  function closeItem(item) {
    const trigger = item.querySelector('.accordion__trigger');
    const content = item.querySelector('.accordion__content');

    item.classList.remove('accordion__item--open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (content) content.setAttribute('aria-hidden', 'true');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccordions);
  } else {
    initAccordions();
  }

  // Expose for dynamic content (e.g. if accordion HTML is injected later)
  window.BarsysAccordion = { init: initAccordions, openItem, closeItem };

})();
