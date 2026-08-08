(() => {
    const navigation = document.querySelector('.nav');
    if (navigation && !document.querySelector('.metadata-bar')) {
    const metadata = document.createElement('div');
    metadata.className = 'metadata-bar';
    metadata.innerHTML = `
      <div class="container metadata-bar__inner">
        <span><b>Founded</b> · Silicon Valley · 2025</span>
        <span class="metadata-bar__middle">Filed under <b>Legal AI Community</b></span>
        <span class="metadata-bar__status"><i></i> 1,000+ professionals · US / Asia</span>
      </div>`;
    navigation.insertAdjacentElement('beforebegin', metadata);

    const links = navigation.querySelector('.nav-links');
    const cleanRoutes = new Set(['about', 'events', 'partners', 'join']);
    links?.querySelectorAll('a[href]').forEach((link) => {
      const hashRoute = new URL(link.href, window.location.href).hash.replace(/^#/, '');
      if (cleanRoutes.has(hashRoute)) link.href = `/${hashRoute}`;
    });

    const joinLink = links?.querySelector('a[href$="/join"]');
    const contactLink = links?.querySelector('a[href*="contact"]');
    if (links && joinLink && contactLink) {
      contactLink.href = '/contact';
      links.insertBefore(contactLink, joinLink);
      joinLink.innerHTML = 'Join Us <span aria-hidden="true">↗</span>';
    }
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const selectors = [
    '.team-card',
    '.recap-card',
    '.recap-banner',
    '.recap-article h3',
    '.recap-article h4',
    '.recap-article blockquote',
    '.recap-pager a',
    '.error-actions a',
    '.footer p'
  ];
  const targets = Array.from(new Set(document.querySelectorAll(selectors.join(','))));

  targets.forEach((target) => {
    target.classList.add('subpage-motion-reveal');
    if (target.matches('.team-card, .recap-card, .recap-banner')) target.dataset.motion = 'scale';

    const siblings = target.parentElement ? Array.from(target.parentElement.children) : [];
    const siblingIndex = Math.max(0, siblings.indexOf(target));
    target.style.setProperty('--motion-delay', `${Math.min(siblingIndex, 6) * 60}ms`);
  });

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    targets.forEach((target) => target.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });

  targets.forEach((target) => observer.observe(target));
})();
