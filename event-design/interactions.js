(() => {
  const header = document.querySelector('.brand-header');
  const toggle = header.querySelector('.menu-toggle');
  const nav = header.querySelector('#main-nav');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') toggle.click();
  }));
  const film = document.getElementById('film');
  if (!film) return;
  const movie = film.querySelector('video');
  document.querySelectorAll('[data-film]').forEach(button => button.addEventListener('click', () => {
    movie.src = button.dataset.film;
    film.showModal();
    movie.play().catch(() => {});
  }));
  film.querySelector('.close-dialog').addEventListener('click', () => film.close());
  film.addEventListener('click', event => { if (event.target === film) film.close(); });
  film.addEventListener('close', () => { movie.pause(); movie.removeAttribute('src'); movie.load(); });
  const starter = document.querySelector('.event-starter');
  if (!starter) return;
  starter.addEventListener('submit', event => {
    event.preventDefault();
    const count = document.getElementById('wiz-guest-count');
    count.value = document.getElementById('quick-guests').value;
    count.dispatchEvent(new Event('change', { bubbles: true }));
    const tier = { classic: 'Classic', signature: 'Signature', reserve: 'Reserve' }[document.getElementById('quick-tier').value];
    document.querySelector('.package-card--selectable[data-value="' + tier + '"]').click();
    const begin = document.getElementById('wizard-begin');
    if (document.querySelector('.wizard__step.active').dataset.step === 'start') begin.click();
    document.getElementById('book').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });
})();
