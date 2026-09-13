import {
    includeAllSharedComponents, setUpSectionFadeIn, 
    createProgressPopup, setUpProgressSync, showContent, loadContent, 
    getImageSrc, loadImage, injectFields, loadItems
} from "./shared.js";

const HERO_IMAGE_OPTIONS = {
    imageFolder: "../img/home-banner/",
    extension: "webp",
    manifestUrl: "../content/home/hero-img-manifest.json",
    errorEvent: (error) => console.error(`Error loading content for hero image:`, error)
};
const HOME_CONTENT_URL = "../content/home/book-info.json";
const SITE_CONTENT_URL = "../content/site/site-data.json";

document.addEventListener("DOMContentLoaded", async () => {
    // Kick off content injection and shared components in parallel
    await Promise.all([
        includeAllSharedComponents(),
        applyHeroImage(),
    ]);

    // Inject book and site content into the page
    injectContent();

    // Get user's chapter progress if visitor
    createProgressPopup('onboarding');

    // Set up animations
    const sections = document.querySelectorAll('.section');
    setUpSectionFadeIn(sections);

    // Sync chapter progress across tabs
    setUpProgressSync();
});

// Reload content when chapter changes
window.addEventListener("chapterChange", injectContent);

async function injectContent() {
    showContent();
    loadContent();

    // Add book-related sections: title, tagline, synopsis, about-website
    await injectFields({
        jsonUrl: HOME_CONTENT_URL,
        fields: {
            "book-title": "title",
            "book-tagline": "tagline",
            "book-synopsis": "synopsis",
            "about-website": "about-website"
        }
    });

    // Add site cards
    await injectFields({
        jsonUrl: SITE_CONTENT_URL,
        fields: {
            "card-map-desc": "home-cards.map",
            "card-translation-desc": "home-cards.translation",
            "card-characters-desc": "home-cards.characters"
        }
    });

    // Add updates
    await loadItems({
        jsonUrl: HOME_CONTENT_URL,
        dataKey: "updates",
        containerId: "latest-updates",
        mapItemToHtml: (update, chapter) => update,
        createWrapper: () => document.createElement("li"),
        emptyMessage: "This place is empty for now. Come back later."
    });
}

/**
 * Pre-load and apply the hero image to the page, then start the animation.
 * @param {string} imageSrc - The source URL of the image to apply
 */
async function applyHeroImage() {
    const imageSrc = await getImageSrc(HERO_IMAGE_OPTIONS);
    if (!imageSrc) return;

    await loadImage(imageSrc);

    // Add image to page
    const img = document.getElementById("hero-bg");
    img.src = imageSrc;

    // Apply the animation effect
    fadeInAndAnimate(img);
}

/**
 * Fades in the hero image and applies a breathing (pan top-to-bottom) effect on desktop screens.
 * On mobile, the hero height adapts to the image and no animation is applied.
 * @param {*} heroImage - The hero image element to animate
 */
function fadeInAndAnimate(heroImage) {
    void heroImage.offsetWidth; // Force reflow to reset animation
    heroImage.classList.add('loaded');

    const duration = 60000; // Duration of one full oscillation in milliseconds
    const startTime = performance.now();
    const angularFrequency = 2 * Math.PI / duration;

    const NARROW_BREAKPOINT = 350; // px — fixed hero height, image zoomed in, no animation
    const MOBILE_BREAKPOINT = 720; // px — hero height adapts to image, full image shown

    let animationId = null;

    const hero = heroImage.parentElement;
    const naturalW = heroImage.naturalWidth;
    const naturalH = heroImage.naturalHeight;
    const aspectRatio = naturalW / naturalH;

    // Cover the hero area with the image, maintaining aspect ratio
    function coverHero(heroW, heroH) {
        const scaleByWidth = heroW / naturalW;
        const scaleByHeight = heroH / naturalH;
        const scale = Math.max(scaleByWidth, scaleByHeight);
        heroImage.style.width = `${naturalW * scale}px`;
        heroImage.style.height = `${naturalH * scale}px`;
        return naturalH * scale; // rendered height
    }

    // Animation loop
    function animate(time) {
        const heroW = hero.clientWidth;
        const heroH = hero.clientHeight;
        hero.style.height = '';
        hero.style.paddingTop = '';
        hero.style.paddingBottom = '';

        // Narrow: fixed hero height, image zoomed in, no animation.
        if (heroW <= NARROW_BREAKPOINT) {
            coverHero(heroW, heroH);
            heroImage.style.transform = 'translate(-50%, -50%)';
            animationId = requestAnimationFrame(animate);
            return;
        }

        // Mobile: hero height adapts to image, full image shown, no animation.
        if (heroW < MOBILE_BREAKPOINT) {
            const naturalHeroH = heroW / aspectRatio;
            hero.style.height = `${naturalHeroH}px`;
            hero.style.paddingTop = '0';
            hero.style.paddingBottom = '0';
            heroImage.style.width = '100%';
            heroImage.style.height = 'auto';
            heroImage.style.transform = 'translate(-50%, -50%)';
            animationId = requestAnimationFrame(animate);
            return;
        }

        // Desktop: fixed hero height, image covers it, panning animation.
        const renderedH = coverHero(heroW, heroH);
        const overflow = renderedH - heroH;
        const amplitude = overflow / 2;
        const offset = Math.cos((time - startTime) * angularFrequency) * amplitude;
        heroImage.style.transform = `translate(-50%, calc(-50% + ${offset}px))`;

        // Continue the animation if the page is visible
        if (document.visibilityState === 'visible')
            animationId = requestAnimationFrame(animate);
        else
            animationId = null;
    }

    // Start the animation
    animationId = requestAnimationFrame(animate);

    // Resume animation when the page becomes visible again
    const visibilityHandler = () => {
        if (document.visibilityState === 'visible' && !animationId)
            animationId = requestAnimationFrame(animate);
    };
    document.addEventListener('visibilitychange', visibilityHandler);
}
