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
 * Set up a "Back to Top" button that appears after scrolling,
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
 * Show either the first visit popup or the update progress popup depending on the 
 * chosen mode.
 * @param {string} mode - The mode of the popup (e.g., 'onboarding', 'progress')
 */
function createProgressPopup(mode = 'onboarding') {
    const template = document.getElementById('progress-modal-template');
    const modalFragment = template.content.cloneNode(true);
    const modal = modalFragment.querySelector("[data-id='overlay']");

    // Hide/show based on mode
    modal.querySelectorAll('[data-when]').forEach(el => {
        el.style.display = (el.dataset.when === mode) ? "" : "none";
    });

    // Attach to body
    document.body.appendChild(modal);

    // Get popup elements
	const display = modal.querySelector('[data-id="chapter-display"]');
	const decrease = modal.querySelector('[data-id="dec"]');
	const increase = modal.querySelector('[data-id="inc"]');
	const finishedCheckbox = modal.querySelector('[data-id="finished"]');
	const closeButton = modal.querySelector('[data-id="close"]');
	const saveButton = modal.querySelector('[data-id="save"]');
    const visitorButton = modal.querySelector('[data-id="visitor"]');

    const MAX_CHAPTER = 43;
    let chapter = getChapterProgress() || 1;

    function updateDisplay() {
		display.textContent = chapter;
		decrease.disabled = chapter <= 1;
		increase.disabled = chapter >= MAX_CHAPTER;
        finishedCheckbox.checked = chapter === MAX_CHAPTER;
	}

	function closeModal() {
		modal.remove();
        window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function changeChapter(step) {
        chapter = Math.min(MAX_CHAPTER, Math.max(1, chapter + step));
        updateDisplay();
	}

	function register(action) {
		action();
		closeModal();
        markBannerAsClosed(); // If a new user, do not show the banner on this session
	}

    // Event listeners
    decrease.addEventListener("click", () => changeChapter(-1));
	increase.addEventListener("click", () => changeChapter(1));
	finishedCheckbox.addEventListener("change", () => {
		if (finishedCheckbox.checked)
			chapter = MAX_CHAPTER;
		updateDisplay();
	});

	closeButton.addEventListener("click", () => register(markPopupAsSeen));
	saveButton.addEventListener("click", () => register(() => saveChapterProgress(chapter)));
    if (visitorButton)
        visitorButton.addEventListener("click", () => register(markPopupAsSeen));

    // Show popup
    modal.classList.add("active");
    updateDisplay();
}

/**
 * Show the progress popup if conditions are met.
 * @param {string} mode - The mode of the popup (e.g., 'onboarding', 'progress')
 */
export function showProgressPopup(mode = 'onboarding') {
    // First visit : user is not reading the book and has not seen the popup yet
    if (mode === 'onboarding' && getChapterProgress() === 0 && !visitorHasSeenPopup())
        createProgressPopup('onboarding');
    // Update progress
    else if (mode === 'update')
        createProgressPopup('update');
}

/**
 * Set up the banner element so the user can change their chapter progress.
 * @param {Element} banner - The banner element to set up
 */
export function setUpBanner(banner) {
    // Do not show this element if the user is a visitor
    if (getChapterProgress() === 0)
        return;

    // Update current chapter text
    const currentChapter = banner.querySelector('#current-chapter');
    currentChapter.textContent = getChapterProgress();

    // Close banner for the session on button 'X' click
    const closeButton = banner.querySelector('#banner-close');
    closeButton.addEventListener('click', () => {
        banner.classList.remove('show');
        markBannerAsClosed(); // User does not want to see the banner again
    });

    // Animate in the banner only if user has not closed it for the session
    if (!userHasClosedBanner()) {
        setTimeout(() => {
            banner.classList.add('show');
        }, 2000);
    }

    // Show the update popup if user has requested it
    const popupActivators = document.querySelectorAll('.update-progress');
    popupActivators.forEach(activator => {
        activator.addEventListener('click', () => {
            showProgressPopup('update');
            // Hide the banner
            banner.classList.remove('show');
            markBannerAsClosed();
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

/**
 * Save the user's current chapter progress.
 * @param {number} chapter - The chapter number to save
 */
export function saveChapterProgress(chapter) {
    localStorage.setItem("chapter", chapter);
}

/**
 * Get the user's current chapter progress.
 * If there's nothing, assume the user is a visitor (chapter 1).
 * @returns {number} - The chapter number the user is currently on
 */
export function getChapterProgress() {
    return parseInt(localStorage.getItem("chapter"), 10) || 0;
}

/**
 * Reset the user's chapter progress.
 */
export function resetChapterProgress() {
    localStorage.removeItem("chapter");
}

/**
 * Check if the visitor has seen the popup.
 * @returns {boolean} - True if the popup has been seen, false otherwise
 */
export function visitorHasSeenPopup() {
    return sessionStorage.getItem("popupSeen") === "true";
}

/**
 * Mark the popup as seen, so the visitor does not see the popup again 
 * on the home page for the duration of their visit.
 */
export function markPopupAsSeen() {
    sessionStorage.setItem("popupSeen", "true");
}

/**
 * Check if the user has closed the banner.
 * @returns {boolean}
 */
function userHasClosedBanner() {
    return sessionStorage.getItem("bannerClosed") === "true";
}

/**
 * Mark the banner as seen, so the user does not see it again
 * for the duration of their visit.
 */
function markBannerAsClosed() {
    sessionStorage.setItem("bannerClosed", "true");
}