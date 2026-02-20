// Global cache for fetched text
const textCache = new Map();
const TEXT_VERSION = "1.0.1"; // Increment this to invalidate cache
const FIRST_CHAPTER = 1;
const LAST_CHAPTER = 43;

/**
 * Check if the device supports hover interactions.
 * @returns {boolean} True if the device supports hover, false otherwise.
 */
function deviceSupportsHover() {
    return window.matchMedia('(hover: hover)').matches;
}

/**
 * Fetch a JSON file and parse its contents.
 * 
 * @async
 * @param {string} url - Path or URL to the JSON file.
 * @returns {Promise<any>} Parsed JSON data.
 * @throws {Error} If the HTTP request fails.
 */
export async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return res.json();
}

/**
 * Fetch a text file and return its contents.
 * 
 * @async
 * @param {string} url - Path or URL to the text file.
 * @returns {Promise<string>} Contents of the text file.
 * @throws {Error} If the HTTP request fails.
 */
async function fetchText(url) {
    const urlWithVersion = `${url}?v=${TEXT_VERSION}`;

    if (textCache.has(urlWithVersion))
        return textCache.get(urlWithVersion);

    // Fetch text
    const res = await fetch(urlWithVersion);
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    const text = await res.text();
    
    // Cache result
    textCache.set(urlWithVersion, text);

    return text;
}

/**
 * Fetch and include the header HTML into the current document.
 * It also sets the `aria-current` attribute on the link corresponding to the current page.
 * 
 * @async
 * @param {*} page - The current page URL to highlight in the header
 */
async function includeHeader(page) {
    const header = document.querySelector('header');
    
    try {
        const html = await fetchText('includes/header.html');
        header.innerHTML = html;

        // Set the current page link
        const currentPage = header.querySelector(`nav a[href="${page}"]`);
        currentPage?.setAttribute('aria-current', 'page');

        // Mobile menu toggle
        const toggle = document.querySelector('.menu-toggle');
        const nav = header.querySelector('nav');
        // Open menu
        toggle.addEventListener('click', () => {
            nav.classList.toggle('open');

            const expanded = toggle.getAttribute('aria-expanded') === 'true' || false;
            toggle.setAttribute('aria-expanded', !expanded);
        });
        // Close menu when clicking a link
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('open');
                toggle.setAttribute('aria-expanded', false);
            });
        });
        // Close menu on outside click
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !toggle.contains(e.target)) {
                nav.classList.remove('open');
                toggle.setAttribute('aria-expanded', false);
            }
        });
    } catch (error) {
        console.error('Failed to load header:', error);
        // Functional fallback with minimal error message
        header.innerHTML = `
            <h1><a href="index.html">You</a></h1>
            <p class="error-p">Header failed to load</p>
        `;
    }
}

/**
 * Fetch and include the footer HTML into the current document.
 * 
 * @async
 */
async function includeFooter() {
    const footer = document.querySelector('footer');

    try {
        const html = await fetchText('includes/footer.html');
        footer.innerHTML = html;
    } catch (error) {
        console.error('Failed to load footer:', error);
        // Minimal functional fallback
        footer.innerHTML = `
            &copy; 2025 Amélie Lemay. All rights reserved. |
            <a class="update-progress link">Change Progress</a> |
            <span class="error-p">Footer failed to load</span>
        `;
    }
}

/**
 * Fetch and include the banner HTML into the current document.
 * It also sets up the banner behavior, including showing/hiding based on user actions
 * and updating the current chapter text.
 * 
 * @async
 */
async function includeBanner() {
    let banner = document.querySelector('.chapter-update');
    // Create banner element if not present
    if (!banner) {
        banner = document.createElement('section');
        banner.classList.add('chapter-update');
        document.body.appendChild(banner);
    }

    const progress = getChapterProgress();
    // Do not show this element if the user is a visitor or has finished the book
    if (progress < FIRST_CHAPTER || progress === LAST_CHAPTER) return;

    try {
        // Fetch banner HTML
        const html = await fetchText('includes/banner.html');
        banner.innerHTML = html;

        // Update current chapter text
        const currentChapter = banner.querySelector('#current-chapter');
        if (currentChapter)
            currentChapter.textContent = progress;

        // Close banner for the session on button 'X' click
        const closeButton = banner.querySelector('#banner-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                banner.classList.remove('show');
                markBannerAsClosed(); // User does not want to see the banner again
            });
        }

        // Animate in the banner only if user has not closed it for the session
        setTimeout(() => {
            if (!userHasClosedBanner())
                banner.classList.add('show');
        }, 2000);
    } catch (error) {
        // Silent fail
        console.error('Failed to load banner:', error);
    }
}

/**
 * Fetch and include the "Back to Top" button HTML into the current document.
 * It also sets up the button behavior, including showing/hiding on scroll
 * and adjusting its position above the footer.
 * 
 * @async
 */
async function includeBackToTopButton() {
    try {
        const html = await fetchText('includes/back-to-top-button.html');
        const button = document.querySelector('.back-to-top');
        // Create button element if not present
        if (!button) {
            button = document.createElement('a');
            button.classList.add('back-to-top');
            document.body.appendChild(button);
        }

        button.innerHTML = html;
        button.setAttribute('href', '#');
        button.setAttribute('aria-label', 'Back to top');
        
        // Show/hide button on scroll and adjust position above footer
        const footer = document.querySelector('footer');
        if (!footer) return;

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

            button.style.bottom = `${offset}px`;
        }

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    } catch (error) {
        // Silent fail
        console.error('Failed to load back-to-top button:', error);
    }
}

/**
 * Adjust the layout by setting the top padding of the main content
 * and the position of the banner based on the header height.
 */
function adjustMainOffset() {
  const header = document.querySelector('header');
  const main   = document.querySelector('main');
  const banner = document.querySelector('.chapter-update');
  if (header) {
    if (main)
        main.style.paddingTop = header.offsetHeight + 'px';
    if (banner)
        banner.style.top = header.offsetHeight + 'px';
  }
}

/**
 * Attach click event listeners to elements that should trigger the progress popup.
 * It also hides the banner if it's open when the popup is activated.
 */
async function attachPopupActivators() {
    // Inject popup
    const template = document.getElementById('progress-modal-template');
    try {
        const html = await fetchText('includes/popup.html');
        template.innerHTML = html;
    } catch (error) {
        console.error('Failed to load popup:', error);
        // Silent fail
    }

    document.addEventListener("click", (event) => {
        const activator = event.target.closest('.update-progress');
        if (!activator) return;

        // Show the popup
        createProgressPopup('update');

        // Hide the banner if it's open
        const banner = document.querySelector('.chapter-update');
        if (banner) {
            banner.classList.remove('show');
            markBannerAsClosed();
        }
    });
}

/**
 * Include all shared components into the current page.
 */
export async function includeAllSharedComponents() {
    // Get current page from URL
    let currentPage = window.location.pathname.split("/").pop();
    if (!currentPage) currentPage = "index.html";

    await includeHeader(currentPage);
    await includeFooter();
    await includeBackToTopButton();
    await includeBanner();
    adjustMainOffset();
    
    // Wait for layout to stabilize before attaching event listeners and popup
    await attachPopupActivators();
}

/**
 * Show either the first visit popup or the update progress popup depending on the 
 * chosen mode.
 * @param {string} mode - The mode of the popup (e.g., 'onboarding', 'progress')
 */
export function createProgressPopup(mode = 'onboarding') {
    // Do not show the visitor popup if user is already registered
    if (mode === 'onboarding' && (getChapterProgress() > 0 || visitorHasSeenPopup())) return;

    const template = document.getElementById('progress-modal-template');
    // Popup alert if template was not loaded
    if (!template || !template.content || !template.content.querySelector("[data-id='overlay']")) {
        console.warn('Progress modal template missing or empty, injecting fallback.');

        // Clear existing template if any
        if (template) template.innerHTML = "";

        const fallbackHtml = `
            <div class="popup-overlay" data-id="overlay" role="dialog" aria-modal="true" aria-labelledby="progress-title">
                <div class="popup">
                    <p class="popup-intro">Oops! Something went wrong.</p>
                    <p class="popup-text">Unable to load the normal popup. Please try again later.</p>
                    <button class="button button--primary" data-id="close">Close</button>
                </div>
            </div>
        `;
        template.innerHTML = fallbackHtml;
    }

    const modalFragment = template.content.cloneNode(true);
    const modal = modalFragment.querySelector("[data-id='overlay']");
    if (!modal) return;

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

    let chapter = getChapterProgress() || FIRST_CHAPTER;

    function updateDisplay() {
		display.textContent = chapter;
		decrease.disabled = chapter <= FIRST_CHAPTER;
		increase.disabled = chapter >= LAST_CHAPTER;
        finishedCheckbox.checked = chapter === LAST_CHAPTER;
	}

	function closeModal() {
		modal.remove();
        document.documentElement.scrollTop = 0; // Scroll to top

        // If the current page defined an injectContent function, call it
        if (typeof window.injectContent === "function") {
            // Hide content during reload
            const contentWrapper = document.getElementById("content-wrapper");
            contentWrapper.style.visibility = "hidden";

            const waitForTop = () => {
                if (document.documentElement.scrollTop <= 1) {
                    window.injectContent();
                    // Show content again once injected
                    contentWrapper.style.visibility = "visible";
                } else {
                    requestAnimationFrame(waitForTop);
                }
            };
            waitForTop();
        }
	}

    // Change chapter with bounds checking
	function changeChapter(step) {
        chapter = Math.min(LAST_CHAPTER, Math.max(FIRST_CHAPTER, chapter + step));
        updateDisplay();
	}

    // Setup hold-to-stepper with acceleration
    function setupHoldStepper(button, step) {
        // State variables
        let timeoutId = null;
        let intervalId = null;

        // Initial speed and acceleration parameters
        let speed = 200;
        const minSpeed = 120;
        const acceleration = 10;

        const start = () => {
            // Immediate single step
            changeChapter(step);

            // Start delay before continuous stepping
            timeoutId = setTimeout(() => {
                intervalId = setInterval(() => {
                    changeChapter(step);
                }, speed);

                // Acceleration loop
                const accelerate = () => {
                    if (speed > minSpeed) {
                        speed -= acceleration;
                        clearInterval(intervalId);
                        intervalId = setInterval(() => {
                            changeChapter(step);
                        }, speed);
                    }
                };

                // Accelerate every 300ms while holding
                timeoutId = setInterval(accelerate, 300);
            }, 300);
        };

        // Reset on stop
        const stop = () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
            timeoutId = null;
            intervalId = null;
            speed = 200;
        };

        button.addEventListener("pointerdown", start);
        button.addEventListener("pointerup", stop);
        button.addEventListener("pointerleave", stop);
        button.addEventListener("pointercancel", stop);
    }

	function register(action) {
		action();
		closeModal();
        markBannerAsClosed(); // If a new user, do not show the banner on this session
	}

    // Event listeners
    if (decrease && increase && finishedCheckbox && closeButton && saveButton) {
        setupHoldStepper(decrease, -1);
        setupHoldStepper(increase, 1);

        finishedCheckbox.addEventListener("change", () => {
            if (finishedCheckbox.checked)
                chapter = LAST_CHAPTER;
            updateDisplay();
        });
    }

    if (closeButton)
        closeButton.addEventListener("click", () => register(markPopupAsSeen));
    if (saveButton)
        saveButton.addEventListener("click", () => register(() => saveChapterProgress(chapter)));
    if (visitorButton)
        visitorButton.addEventListener("click", () => register(markPopupAsSeen));

    // Show popup
    modal.classList.add("active");
    if (display)
        updateDisplay();
}

/**
 * Animate sections with a fade-in effect when they enter the viewport.
 * 
 * @param {Element[] | NodeList} sections - Array of section elements to animate.
 */
export function setUpSectionFadeIn(sections) {
    if (!sections || typeof sections.forEach !== 'function') return;

    // Respect accessibility preferences
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
        sections.forEach(section => section.classList.add("animate"));
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        for (const entry of entries) {
            const el = entry.target;
            if (!entry.isIntersecting) continue;
            if (el.classList.contains("animate")) {
                obs.unobserve(el);
                continue;
            }
            el.classList.add("animate");
            obs.unobserve(el);
        }
    }, { threshold: 0.1 });
    
    sections.forEach(section => {
        if (!(section instanceof Element)) return;

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
 * Animate cards' fade-in effect when they come into view,
 * with optional column-based delays based on their position in the grid.
 * 
 * @param {Element | NodeList | Element[]} containers - Elements that contain cards
 * @param {Object} options - Options to customize the delay strategy
 * @param {boolean} options.useColumnDelay - Whether to use column-based delay for grids
 * @param {number} options.staggerDelay - Base delay (ms) for staggered animations
 */
export function setupCardFadeIn(containers, options = {}) {
    const {
        useColumnDelay = false,
        staggerDelay = 80,
    } = options;

    // Respect accessibility preferences
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Container as array for consistent iteration
    const containerList = containers instanceof NodeList || Array.isArray(containers)
        ? Array.from(containers)
        : [containers];

    containerList.forEach(container => {
        if (!(container instanceof Element)) return;

        const cards = container.querySelectorAll('.card');
        if (!cards.length) return;

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
                const card = entry.target;
                if (!entry.isIntersecting) continue;
                if (card.classList.contains("animate")) {
                    obs.unobserve(card);
                    continue;
                }

                if (reduceMotion) {
                    card.classList.add('animate');
                } else {
                    // Calculate delay based on column position
                    const index = [...cards].indexOf(card);
                    let delay = 0;
                    if (useColumnDelay) {
                        const column = index % columns;
                        delay = column * staggerDelay;
                    }
                    card.style.transitionDelay = `${delay}ms`;
                    card.classList.add("animate");
                }

                obs.unobserve(card);
            }
        }, { threshold: 0.1 });

        cards.forEach(card => {
            observer.observe(card);

            // Manually trigger animation if card already in viewport with no delay
            requestAnimationFrame(() => {
                if (isElementInViewport(card)) {
                    if (reduceMotion) {
                        card.classList.add('animate');
                    } else {
                        card.style.transitionDelay = '0ms';
                        card.classList.add('animate');
                    }
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

/**
 * Show the main content and hide any error message.
 */
export function showContent(contentLayout = "block") {
    // Remove error message if previously shown
    document.getElementById("error-wrapper").style.display = "none";
    document.getElementById("content-wrapper").style.display = contentLayout;
}

/**
 * Load content based on the user's chapter progress.
 * Elements with classes like "ch-3" will appear when chapter >= 3,
 * and elements with classes like "remove-on-3" will disappear when chapter >= 3.
 */
export function loadContent() {
    const chapter = getContentChapter();
    
    // Handle elements that should be visible and should disappear
    document.querySelectorAll("[class*='ch-'], [class*='remove-on-']").forEach(el => {
        const appearMatch = el.className.match(/\bch-(\d+)\b/);
        const removeMatch = el.className.match(/\bremove-on-(\d+)\b/);

        const appearValue = appearMatch ? parseInt(appearMatch[1], 10) : null;
        const removeValue = removeMatch ? parseInt(removeMatch[1], 10) : null;

        // Rules
        const shouldAppear = appearValue === null ? true : chapter >= appearValue;
        const shouldRemove = removeValue === null ? false : chapter >= removeValue;

        if (shouldAppear && !shouldRemove)
            el.classList.remove('hidden');
        else
            el.classList.add('hidden');
    });
}

/**
 * Get the image source URL based on the user's chapter progress.
 *
 * @param {*} param0 - Configuration object
 * @param {string} param0.imageFolder   Folder path, e.g. "../content/map/images/"
 * @param {string} param0.extension     Image file extension, e.g. "png"
 * @param {string} param0.manifestUrl   URL of JSON manifest mapping chapters to image names
 * @param {string} param0.containerId   ID of the container element for error display
 */
export async function getImageSrc({
    imageFolder,
    extension,
    manifestUrl,
    containerId
}) {
    const chapter = getContentChapter();

    try {
        // Fetch available chapters
        const data = await fetchJson(manifestUrl);
        
        // Get map file name
        const mapName = getClosestChapterValue(data, chapter);

        // Return image src
        return `${imageFolder}${mapName}.${extension}`;
    } catch (error) {
        displayError(containerId, error);
        return "";
    }
}

/**
 * Load an image and return its source URL once loaded.
 * 
 * @param {string} src - The source URL of the image to load
 * @returns {Promise<string>} - A promise that resolves with the source URL once the image is loaded
 */
export function loadImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.src = src;
    });
}

/**
 * Load and render cards from a JSON file into a specified container.
 * 
 * - Only displays content if its `chapter` is <= the user's progress.
 * - Hides content if its `removeOn` value is <= the user's progress.
 * - Uses `mapItemToHtml` to convert each item to its HTML representation.
 * @param {*} param0 - Configuration object
 * @param {string} param0.jsonUrl - URL of the JSON file to fetch data from
 * @param {string} param0.containerId - ID of the container element to inject cards into
 * @param {function} param0.filterFn - Function to filter items based on visibility (default: isContentVisible)
 * @param {function} param0.mapItemToHtml - Function to convert an item to its HTML representation
 * @async
 * @function
 */
export async function loadCards({
    jsonUrl,
    containerId,
    filterFn = isContentVisible,
    mapItemToHtml
}) {
    const chapter = getContentChapter();
    const container = document.getElementById(containerId);

    try {
        // Fetch data
        const data = await fetchJson(jsonUrl);

        // Clear existing content
        container.innerHTML = "";

        // Build cards
        data.forEach(item => {
            if (filterFn(item, chapter)) {
                const cardHtml = mapItemToHtml(item, chapter);
                const card = document.createElement("div");
                card.className = "card card--hover";
                card.innerHTML = cardHtml;

                // Set data-name attribute for map linking
                const mapLabel = getClosestChapterValue(item.mapLabel, chapter);
                if (mapLabel) {
                    const name = mapLabel.trim().toLowerCase().replace(/\s+/g, '-');
                    card.dataset.name = name;
                }

                container.appendChild(card);
            }
        });
    } catch (error) {
        displayError(containerId, error);
    }
}

/**
 * Load and render interactive regions on a map.
 * 
 * @param {*} param0 - Configuration object
 * @param {string} param0.mapSrc - Source URL of the map image
 * @param {string} param0.containerId - ID of the container element to inject regions into
 * @async
 */
export async function loadRegions({
    jsonUrl,
    containerId
}) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    const chapter = getContentChapter();

    try {
        // Get regions for this map
        const data = await fetchJson(jsonUrl);

        let activeHotspot = null;
        const supportsHover = deviceSupportsHover();

        // Create hotspots
        data.forEach(item => {
            if (item.chapter <= chapter) {
                const div = document.createElement("div");
                div.className = "region";

                const top = getClosestChapterValue(item.top, chapter);
                const left = getClosestChapterValue(item.left, chapter);
                const priority = item.priority;
                const width = getClosestChapterValue(item.width, chapter);
                const height = getClosestChapterValue(item.height, chapter);
                const radius = getClosestChapterValue(item.radius, chapter);
                const label = getClosestChapterValue(item.label, chapter);

                // Position
                div.style.top = top + "%";
                div.style.left = left + "%";
                div.style.zIndex = priority ? priority : "1";

                // Size
                div.style.height = radius ? (radius || 5) + "%" : (height || 5) + "%";
                div.style.width = radius ? (radius || 5) + "%" : (width || 5) + "%";
                div.style.borderRadius = radius ? "50%" : "0";

                // Tooltip
                const tooltip = document.createElement("span");
                tooltip.className = "tooltip";
                tooltip.textContent = label;

                // Click behavior
                function handleClick() {
                    const selector = label.toLowerCase().replace(/\s+/g, '-');
                    scrollToCard(document.querySelector(`.card[data-name="${selector}"]`));
                }
                
                // Desktop behavior
                if (supportsHover) {
                    tooltip.addEventListener("click", handleClick);
                    div.addEventListener("click", handleClick);
                }
                // Mobile two-tap behavior
                else {
                    div.addEventListener('touchstart', (e) => {
                        if (activeHotspot !== div) {
                            // First tap: show tooltip only
                            e.preventDefault(); // prevents the click from firing
                            e.stopPropagation();
                            div.classList.add('show-tooltip');
                            if (activeHotspot)
                                activeHotspot.classList.remove('show-tooltip');
                            activeHotspot = div;
                        } else {
                            // Second tap: scroll
                            handleClick();
                            div.classList.remove('show-tooltip');
                            activeHotspot = null;
                        }
                    });
                }

                div.appendChild(tooltip);
                container.appendChild(div);
            }
        });

        if (!supportsHover) {
            document.addEventListener('touchstart', (e) => {
                // If no tooltip is active, ignore
                if (!activeHotspot)
                    return;

                activeHotspot.classList.remove('show-tooltip');
                activeHotspot = null;
            }, { passive: true });
        }
    } catch (error) {
        // Silent fail
        console.error('Failed to load regions:', error);
    }
}

/**
 * Load and render the map legend from a JSON file into a specified container.
 * 
 * @param {*} param0 - Configuration object
 * @param {string} param0.jsonUrl - URL of the JSON file to fetch legend data from
 * @param {string} param0.containerId - ID of the container element to inject the legend into
 */
export async function loadMapLegend({
    jsonUrl,
    containerId
}) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    const chapter = getContentChapter();

    try {
        const data = await fetchJson(jsonUrl);

        data.forEach(legendGroup => {
            // Create group
            const group = document.createElement("div");
            group.className = "legend-group";
            group.id = legendGroup["legend-group"];
            // Create items
            legendGroup.items.forEach(legendItem => {
                if (legendItem.chapter <= chapter) {
                    const item = document.createElement("div");
                    item.className = "legend-item";

                    const icon = document.createElement("img");
                    icon.className = "legend-icon";
                    icon.src = "img/legend-icons/" + legendItem.icon;
                    icon.alt = legendItem.label + " icon";

                    const label = document.createElement("div");
                    label.className = "legend-label";
                    label.textContent = legendItem.label;

                    item.appendChild(icon);
                    item.appendChild(label);
                    group.appendChild(item);
                }
            });
            container.appendChild(group);
        });
    } catch (error) {
        console.error('Failed to load map legend:', error);
        // Functional fallback with minimal error message
        container.innerHTML = `
            <p class="error-p">Map legend failed to load</p>
        `;
    }
}

/**
 * Display an error message and hide the main content.
 */
export function displayError(context = "unknown context", error = null) {
    console.error(`Error loading content for ${context}:`, error);
    document.getElementById("content-wrapper").style.display = "none";
    document.getElementById("error-wrapper").style.display = "flex";
}

/**
 * Save the user's current chapter progress. It also notifies
 * other parts of the application about the change.
 * @param {number} chapter - The chapter number to save
 */
function saveChapterProgress(chapter) {
    const value = Number(chapter);
    localStorage.setItem("chapter", value);

    // Emit change for pages to adapt
    window.dispatchEvent(new CustomEvent("chapterChange", {
        detail: { chapter: value }
    }));
}

/**
 * Get the user's current chapter progress.
 * If there's nothing, assume the user is a visitor (chapter 1).
 * @returns {number} - The chapter number the user is currently on
 */
export function getChapterProgress() {
    return Number(localStorage.getItem("chapter") || 0);
}

/**
 * Get the chapter to use for content display.
 * If the user is a visitor (chapter 0), return first chapter.
 * @returns {number} - The chapter number to use for content display
 */
export function getContentChapter() {
    return getChapterProgress() > 0 ? getChapterProgress() : FIRST_CHAPTER;
}

/**
 * Reset the user's chapter progress.
 */
function resetChapterProgress() {
    localStorage.removeItem("chapter");
}

/**
 * Set up synchronization for chapter progress across tabs.
 */
export function setUpProgressSync() {
    window.addEventListener("storage", (event) => {
        if (event.key === "chapter") {
            const newChapter = event.newValue ? Number(event.newValue) : 0;
            
            // Emit change for pages to adapt
            window.dispatchEvent(new CustomEvent("chapterChange", {
                detail: { chapter: newChapter }
            }));
        }
    });
}

/**
 * Check if the visitor has seen the popup.
 * @returns {boolean} - True if the popup has been seen, false otherwise
 */
function visitorHasSeenPopup() {
    return sessionStorage.getItem("popupSeen") === "true";
}

/**
 * Mark the popup as seen, so the visitor does not see the popup again 
 * on the home page for the duration of their visit.
 */
function markPopupAsSeen() {
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

/**
 * Get the closest chapter-specific value for the given progress.
 * 
 * Expects an object with keys like "ch-1", "ch-2", etc., and returns the
 * value of the closest key that is less than or equal to the provided chapter.
 * 
 * @param {Object|string|number|null} values - An object keyed by "ch-X", or a direct value.
 * @param {number} chapter - Current chapter number.
 * @returns {any|null} The closest matching value, or null if none found.
 */
export function getClosestChapterValue(values, chapter) {
    if (typeof values !== "object") return values;

    const keys = Object.keys(values)
        .map(k => parseInt(k.replace("ch-", ""), 10))
        .filter(num => !isNaN(num) && num <= chapter);

    if (keys.length === 0) return null;

    const closest = Math.max(...keys);
    return values[`ch-${closest}`];
}

/**
 * Determine if a piece of content should be visible at a given chapter.
 * 
 * Rules:
 * - Content is visible if its `chapter` is <= current chapter.
 * - Content is hidden if its `removeOn` is not null and <= current chapter.
 * 
 * @param {Object} item - Content object with `chapter` and `removeOn` fields.
 * @param {number} currentChapter - Current user chapter progress.
 * @returns {boolean} True if the item should be visible, false otherwise.
 */
export function isContentVisible(item, currentChapter) {
    const introduced = item.chapter <= currentChapter;
    const notRemoved = item.removeOn === null || item.removeOn > currentChapter;
    return introduced && notRemoved;
}

/**
 * Smoothly scroll the page to the specified card element, 
 * accounting for fixed header height and animation offset.
 * 
 * @param {*} card - The card element to scroll to
 * @returns 
 */
function scrollToCard(card) {
    if (!card) return;

    // Adjust scroll margin for anchor targets to account for fixed header height + a 1rem gap
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const headerHeight = parseFloat(document.querySelector('header').offsetHeight) + rem;

    // If animation not yet applied, add extra offset for translateY in the animation
    const extraOffset = card.classList.contains('animate') ? 0 : 1.5 * rem;
    const y = card.getBoundingClientRect().top + window.scrollY - headerHeight - extraOffset;

    window.scrollTo({
        top: y,
        behavior: 'smooth'
    });
}
