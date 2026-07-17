import { includeAllSharedComponents, setUpSectionFadeIn, createProgressPopup,
    setUpProgressSync, loadContent, getImageSrc, loadImage} from "./shared.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Include shared components
    // Kick off image loading in parallel
    const [, imageSrc] = await Promise.all([
        includeAllSharedComponents(),
        getImageSrc({
            imageFolder: "../img/home-banner/",
            extension: "webp",
            manifestUrl: "../content/home/hero-img-manifest.json",
            errorEvent: (error) => console.error(`Error loading content for hero image:`, error)
        }),
    ]);

    // Get user's chapter progress if visitor
    createProgressPopup('onboarding');

    // Update website's content with chapter progress
    loadContent();
    applyHeroImage(imageSrc);

    // Set up animations
    const sections = document.querySelectorAll('.section');
    setUpSectionFadeIn(sections);

    // Sync chapter progress across tabs
    setUpProgressSync();
});

// Reload content when chapter changes
window.addEventListener("chapterChange", injectContent);

/**
 * Inject content into the page based on user's chapter progress.
 */
async function injectContent() {
    loadContent();

    // Load hero image
    const imageSrc = await getImageSrc({
        imageFolder: "../img/home-banner/",
        extension: "webp",
        manifestUrl: "../content/home/hero-img-manifest.json",
        errorEvent: (error) => console.error(`Error loading content for hero image:`, error)
    });

    applyHeroImage(imageSrc);
}

/**
 * Pre-load and apply the hero image to the page, then start the animation.
 * @param {string} imageSrc - The source URL of the image to apply
 */
async function applyHeroImage(imageSrc) {
    if (!imageSrc) return;

    await loadImage(imageSrc);

    // Add image to page
    const img = document.getElementById("hero-bg");
    img.src = imageSrc;

    // Apply the animation effect
    fadeInAndAnimate(img);
}

/**
 * Fade in the hero image and apply a breathing (pan top-to-bottom) effect.
 * @param {HTMLImageElement} heroImage - The image element to animate
 */
function fadeInAndAnimate(heroImage) {
    void heroImage.offsetWidth; // Force reflow to reset animation
    heroImage.classList.add('loaded');

    const duration = 60000; // Duration of one full oscillation in milliseconds
    const startTime = performance.now();
    const twoPi = 2 * Math.PI / duration;

    let animationId = null;

    // Animation function to oscillate the image vertically
    function animate(time) {
        // Total vertical overflow
        const overflow = heroImage.clientHeight - heroImage.parentElement.clientHeight;
        // Oscillate symmetrically around the center
        const amplitude = overflow / 2;
        const offset = Math.cos((time - startTime) * twoPi) * amplitude;
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
