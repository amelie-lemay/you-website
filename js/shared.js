/**
 * Animate sections with a fade-in effect when they enter the viewport.
 * 
 * @param {Element[] | NodeList} sections - Array of section elements to animate.
 */
export function setUpSectionFadeIn(sections) {
    if (!sections || typeof sections.forEach !== 'function')
        return;
    const observer = new IntersectionObserver((entries, obs) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                obs.unobserve(entry.target);
            }
        };
    }, { threshold: 0.1 });
    
    sections.forEach(section => {
        observer.observe(section);

        // Manually trigger animation if section already in viewport
        requestAnimationFrame(() => {
            if (isElementInViewport(section)) {
                section.classList.add('animate');
                observer.unobserve(section);
            }
        });
    });
}

/**
 * Setup a "Back to Top" button that appears after scrolling,
 * and adjusts its position to stay above the footer.
 */
export function setupBackToTopButton() {
    const backToTop = document.querySelector('.back-to-top');
    const footer = document.querySelector('footer');

    if (!backToTop || !footer)
        return;

    const baseBottom = 20;

    function handleScroll() {
        const scrollY = window.scrollY || window.pageYOffset
        const footerTop = footer.getBoundingClientRect().top + scrollY;
        const windowHeight = window.innerHeight;
        const distanceToFooter = footerTop - scrollY - windowHeight;

        const scrollTreshold = window.innerHeight * 0.5;
        document.body.classList.toggle('scrolled', scrollY > scrollTreshold);

        const offset = distanceToFooter < baseBottom
            ? baseBottom + (baseBottom - distanceToFooter)
            : baseBottom;

        backToTop.style.bottom = `${offset}px`;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
}

/**
 * Animate cards' fade-in effect when they come into view,
 * with optional column-based delays based on their position in the grid.
 * 
 * @param {Element | NodeList | Element[]} containers - Elements that contain cards
 * @param {Object} options - Options to customize the delay strategy
 * @param {boolean} options.useColumnDelay - Whether to use column-based delay for grids
 * @param {number} options.staggerDelay - Base delay for staggered animations
 */
export function setupCardFadeIn(containers, options = {}) {
    const {
        useColumnDelay = false,
        staggerDelay = 80,
    } = options;

    // Container as array for consistent iteration
    const containerList = containers instanceof NodeList || Array.isArray(containers)
        ? Array.from(containers)
        : [containers];

    containerList.forEach(container => {
        if (!(container instanceof Element))
            return;

        const cards = container.querySelectorAll('.card');
        if (!cards.length)
            return;

        // Detect number of columns in grid layout
        let columns = 1;
        if (useColumnDelay) {
            const style = window.getComputedStyle(container);
            const gridTemplateColumns = style.getPropertyValue('grid-template-columns');
            columns = gridTemplateColumns.split(' ').filter(s => s.trim()).length || 1;
        }

        // Animate cards when they come into view
        const observer = new IntersectionObserver((entries, obs) => {
            for (const entry of entries) {
                if (!entry.isIntersecting)
                    return;

                const card = entry.target;

                // Staggered delay for grid layout
                const index = [...cards].indexOf(card);
                let delay = 0;
                if (useColumnDelay) {
                    const column = index % columns;
                    delay = column * staggerDelay;
                }

                setTimeout(() => {
                    card.classList.add('animate');
                }, delay);

                obs.unobserve(card);
            }
        }, { threshold: 0.1 });

        cards.forEach(card => {
            observer.observe(card);

            // Manually trigger animation if card already in viewport with no delay
            requestAnimationFrame(() => {
                if (isElementInViewport(card)) {
                    setTimeout(() => {
                        card.classList.add('animate');
                    });

                    observer.unobserve(card);
                }
            });
        });
    });
}

/**
 * Check if an element is currently in the viewport.
 * @param {Element} el - The DOM element to check
 * @returns {boolean} - True if the element is in the viewport, false otherwise
 */
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
    );
}