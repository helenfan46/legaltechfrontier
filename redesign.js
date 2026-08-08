(() => {
    const header = document.querySelector('[data-header]');
    const toggle = document.querySelector('[data-nav-toggle]');
    const links = document.querySelector('[data-nav-links]');
    let previousScroll = window.scrollY;

    const updateHeader = () => {
        const currentScroll = window.scrollY;
        header?.classList.toggle('is-fixed', currentScroll > 24);
        header?.classList.toggle('is-hidden', currentScroll > 220 && currentScroll > previousScroll);
        previousScroll = currentScroll;
    };

    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();

    toggle?.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        links?.classList.toggle('is-open', !open);
    });

    links?.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            toggle?.setAttribute('aria-expanded', 'false');
            links.classList.remove('is-open');
        });
    });

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sectionRoutes = new Set(['about', 'events', 'partners', 'contact', 'join']);

    const sectionFromLocation = () => {
        const pathSection = window.location.pathname.replace(/^\/+|\/+$/g, '');
        if (sectionRoutes.has(pathSection)) return pathSection;

        const querySection = new URLSearchParams(window.location.search).get('section');
        if (querySection && sectionRoutes.has(querySection)) return querySection;

        const hashSection = window.location.hash.replace(/^#/, '');
        return sectionRoutes.has(hashSection) ? hashSection : '';
    };

    const scrollToSection = (section, behavior = 'smooth') => {
        const target = document.getElementById(section);
        if (!target) return;

        const headerOffset = window.innerWidth <= 760 ? 82 : 136;
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: Math.max(0, top), behavior });
    };

    const navigateToSection = (section, historyMode = 'push', behavior = 'smooth') => {
        if (!sectionRoutes.has(section) || !document.getElementById(section)) return;

        const cleanPath = `/${section}`;
        if (historyMode === 'replace') {
            window.history.replaceState({ section }, '', cleanPath);
        } else if (window.location.pathname !== cleanPath) {
            window.history.pushState({ section }, '', cleanPath);
        }
        scrollToSection(section, behavior);
    };

    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const anchor = event.target.closest('a[href]');
        if (!anchor || anchor.target === '_blank') return;

        const url = new URL(anchor.href, window.location.href);
        const section = url.pathname.replace(/^\/+|\/+$/g, '');
        if (url.origin !== window.location.origin || !sectionRoutes.has(section) || !document.getElementById(section)) return;

        event.preventDefault();
        toggle?.setAttribute('aria-expanded', 'false');
        links?.classList.remove('is-open');
        navigateToSection(section);
    });

    window.addEventListener('popstate', () => {
        const section = sectionFromLocation();
        if (section) {
            scrollToSection(section);
        } else if (window.location.pathname === '/') {
            window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        }
    });

    const initialSection = sectionFromLocation();
    if (initialSection) {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => navigateToSection(initialSection, 'replace', 'auto'));
        });
    }

    const revealSelectors = [
        '.section-rule',
        '.about__grid > *',
        '.city-globe__visual',
        '.city-globe__legend > span',
        '.section-heading > *',
        '.practice-card',
        '.upcoming-card',
        '.archive__intro > *',
        '.series-block',
        '.partners-grid > *',
        '.partners-note',
        '.join__grid > *',
        '.home-contact__card',
        '.footer__top > *'
    ];
    const revealTargets = Array.from(new Set(document.querySelectorAll(revealSelectors.join(','))));

    revealTargets.forEach((target) => {
        target.classList.add('motion-reveal');
        if (target.matches('.practice-card, .upcoming-card, .city-globe__visual, .series-block, .partners-grid > *, .home-contact__card')) {
            target.dataset.motion = 'scale';
        }
        const siblings = target.parentElement ? Array.from(target.parentElement.children) : [];
        const siblingIndex = Math.max(0, siblings.indexOf(target));
        target.style.setProperty('--motion-delay', `${Math.min(siblingIndex, 7) * 55}ms`);
    });

    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
        revealTargets.forEach((target) => target.classList.add('is-visible'));
    } else {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            });
        }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
        revealTargets.forEach((target) => revealObserver.observe(target));
    }

    document.querySelectorAll('[data-auto-carousel]').forEach((track, carouselIndex) => {
        if (track.dataset.carouselReady === 'true') return;

        if (track.children.length < 2) return;

        track.dataset.carouselReady = 'true';
        track.id ||= `event-carousel-${carouselIndex + 1}`;

        const carousel = document.createElement('div');
        carousel.className = 'event-carousel';
        track.before(carousel);
        carousel.append(track);

        const previousButton = document.createElement('button');
        previousButton.className = 'event-carousel__button event-carousel__button--prev';
        previousButton.type = 'button';
        previousButton.setAttribute('aria-label', `Previous items in ${track.getAttribute('aria-label') || 'event carousel'}`);
        previousButton.setAttribute('aria-controls', track.id);
        previousButton.innerHTML = '<span aria-hidden="true"></span>';

        const nextButton = document.createElement('button');
        nextButton.className = 'event-carousel__button event-carousel__button--next';
        nextButton.type = 'button';
        nextButton.setAttribute('aria-label', `Next items in ${track.getAttribute('aria-label') || 'event carousel'}`);
        nextButton.setAttribute('aria-controls', track.id);
        nextButton.innerHTML = '<span aria-hidden="true"></span>';

        carousel.append(previousButton, nextButton);

        const speed = Number(track.dataset.carouselSpeed) || 26;
        const pauseReasons = new Set();
        let scrollLimit = 0;
        let autoPosition = track.scrollLeft;
        let direction = 1;
        let lastFrame = 0;
        let dragStartX = 0;
        let dragStartScroll = 0;
        let dragDistance = 0;
        let activePointer = null;
        let blockNextClick = false;

        const updateButtons = () => {
            const atStart = track.scrollLeft <= 2;
            const atEnd = track.scrollLeft >= scrollLimit - 2;
            if (previousButton.disabled !== atStart) previousButton.disabled = atStart;
            if (nextButton.disabled !== atEnd) nextButton.disabled = atEnd;
        };

        const measure = () => {
            scrollLimit = Math.max(0, track.scrollWidth - track.clientWidth);
            track.scrollLeft = Math.min(track.scrollLeft, scrollLimit);
            autoPosition = track.scrollLeft;
            updateButtons();
        };

        const moveByCard = (movement) => {
            const firstCard = track.querySelector('.event-card');
            const styles = window.getComputedStyle(track);
            const gap = Number.parseFloat(styles.columnGap || styles.gap) || 18;
            const step = (firstCard?.getBoundingClientRect().width || track.clientWidth * .82) + gap;

            pauseReasons.add('controls');
            direction = movement;
            track.scrollBy({ left: movement * step, behavior: reducedMotion.matches ? 'auto' : 'smooth' });

            window.setTimeout(() => {
                autoPosition = Math.min(Math.max(track.scrollLeft, 0), scrollLimit);
                pauseReasons.delete('controls');
                updateButtons();
            }, reducedMotion.matches ? 0 : 460);
        };

        previousButton.addEventListener('click', () => moveByCard(-1));
        nextButton.addEventListener('click', () => moveByCard(1));
        track.addEventListener('keydown', (event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            moveByCard(event.key === 'ArrowLeft' ? -1 : 1);
        });
        track.addEventListener('scroll', updateButtons, { passive: true });

        const animate = (time) => {
            const elapsed = Math.min(time - (lastFrame || time), 64);
            lastFrame = time;

            if (!reducedMotion.matches && !document.hidden && pauseReasons.size === 0 && scrollLimit > 0) {
                autoPosition += direction * speed * (elapsed / 1000);

                if (autoPosition >= scrollLimit) {
                    autoPosition = scrollLimit;
                    direction = -1;
                } else if (autoPosition <= 0) {
                    autoPosition = 0;
                    direction = 1;
                }

                track.scrollLeft = autoPosition;
            }

            window.requestAnimationFrame(animate);
        };

        carousel.addEventListener('mouseenter', () => pauseReasons.add('hover'));
        carousel.addEventListener('mouseleave', () => pauseReasons.delete('hover'));
        carousel.addEventListener('focusin', () => pauseReasons.add('focus'));
        carousel.addEventListener('focusout', (event) => {
            if (!carousel.contains(event.relatedTarget)) pauseReasons.delete('focus');
        });

        track.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;

            activePointer = event.pointerId;
            dragStartX = event.clientX;
            dragStartScroll = track.scrollLeft;
            dragDistance = 0;
            pauseReasons.add('drag');
            track.classList.add('is-dragging');
            track.setPointerCapture(event.pointerId);
        });

        track.addEventListener('pointermove', (event) => {
            if (event.pointerId !== activePointer) return;

            dragDistance = event.clientX - dragStartX;
            track.scrollLeft = dragStartScroll - dragDistance;
            autoPosition = track.scrollLeft;
            if (Math.abs(dragDistance) > 4) event.preventDefault();
        });

        const endDrag = (event) => {
            if (event.pointerId !== activePointer) return;

            blockNextClick = Math.abs(dragDistance) > 6;
            activePointer = null;
            pauseReasons.delete('drag');
            track.classList.remove('is-dragging');
            autoPosition = Math.min(Math.max(track.scrollLeft, 0), scrollLimit);
            if (autoPosition <= 1) direction = 1;
            if (autoPosition >= scrollLimit - 1) direction = -1;

            if (track.hasPointerCapture(event.pointerId)) {
                track.releasePointerCapture(event.pointerId);
            }
        };

        track.addEventListener('pointerup', endDrag);
        track.addEventListener('pointercancel', endDrag);
        track.addEventListener('click', (event) => {
            if (!blockNextClick) return;
            event.preventDefault();
            event.stopPropagation();
            blockNextClick = false;
        }, true);

        new ResizeObserver(measure).observe(track);
        window.requestAnimationFrame(() => {
            measure();
            window.requestAnimationFrame(animate);
        });
    });

    const cityGlobe = document.querySelector('[data-city-globe]');
    const cityGlobeCanvas = cityGlobe?.querySelector('[data-city-globe-canvas]');

    if (cityGlobe && cityGlobeCanvas) {
        const legendItems = Array.from(cityGlobe.querySelectorAll('.city-globe__legend > [data-lat][data-lon]'));
        const markers = legendItems.map((item) => ({
            location: [Number(item.dataset.lat), Number(item.dataset.lon)],
            size: .052
        }));

        const initCityGlobe = async () => {
            if (cityGlobeCanvas.dataset.globeReady === 'true') return;
            cityGlobeCanvas.dataset.globeReady = 'true';

            try {
                const { default: createGlobe } = await import('./vendor/cobe.js');
                const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
                let globeWidth = Math.max(280, Math.floor(cityGlobeCanvas.offsetWidth || 420));
                let phi = .32;
                let frameId = 0;
                let active = false;

                const updateSize = () => {
                    globeWidth = Math.max(280, Math.floor(cityGlobeCanvas.offsetWidth || 420));
                };

                const globeRenderer = createGlobe(cityGlobeCanvas, {
                    devicePixelRatio: pixelRatio,
                    width: globeWidth * pixelRatio,
                    height: globeWidth * pixelRatio,
                    phi,
                    theta: .28,
                    dark: 0,
                    diffuse: 0,
                    mapSamples: 12000,
                    mapBrightness: 1,
                    mapBaseBrightness: 0,
                    baseColor: [1, 1, 1],
                    markerColor: [.19, .51, .96],
                    glowColor: [1, 1, 1],
                    opacity: .94,
                    scale: .94,
                    markerElevation: .015,
                    markers
                });

                const render = () => {
                    if (!active) return;
                    if (!reducedMotion.matches) phi += .0042;
                    globeRenderer.update({
                        width: globeWidth * pixelRatio,
                        height: globeWidth * pixelRatio,
                        phi
                    });
                    frameId = window.requestAnimationFrame(render);
                };

                const start = () => {
                    if (active) return;
                    active = true;
                    frameId = window.requestAnimationFrame(render);
                };

                const stop = () => {
                    active = false;
                    if (frameId) window.cancelAnimationFrame(frameId);
                    frameId = 0;
                };

                new ResizeObserver(updateSize).observe(cityGlobeCanvas);

                if ('IntersectionObserver' in window) {
                    const visibilityObserver = new IntersectionObserver(([entry]) => {
                        if (entry?.isIntersecting) start();
                        else stop();
                    }, { threshold: .05 });
                    visibilityObserver.observe(cityGlobeCanvas);
                } else {
                    start();
                }
            } catch (error) {
                cityGlobe.classList.add('city-globe--fallback');
            }
        };

        if ('IntersectionObserver' in window) {
            const loadObserver = new IntersectionObserver((entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                loadObserver.disconnect();
                initCityGlobe();
            }, { rootMargin: '0px 0px 150% 0px' });
            loadObserver.observe(cityGlobeCanvas);
        } else {
            initCityGlobe();
        }
    }
})();
