import { includeAllSharedComponents, setUpSectionFadeIn, 
    createProgressPopup, setUpProgressSync, loadContent } from "./shared.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Include shared components
    await includeAllSharedComponents();

    // Get user's chapter progress if visitor
    createProgressPopup('onboarding');

    // Update website's content with chapter progress
    loadContent();

    // Set up animations
    const sections = document.querySelectorAll('.section');
    const heroImage = document.querySelector('.hero-bg');
    setUpSectionFadeIn(sections);
    if (heroImage.complete) // Apply the animation effect when the image is loaded
        fadeInAndAnimate(heroImage);
    else
        heroImage.addEventListener('load', () => fadeInAndAnimate(heroImage));

    // Sync chapter progress across tabs
    setUpProgressSync();
});

// Reload content when chapter changes
window.addEventListener("chapterChange", loadContent);

/**
 * Fade in the hero image and apply a moving effect.
 */
function fadeInAndAnimate(heroImage) {
    void heroImage.offsetWidth; // Force reflow to reset animation
    heroImage.classList.add('loaded');

    const duration = 30000;
    const maxTranslateY = heroImage.clientHeight * 0.05;
    const safeMargin = Math.max(3, window.innerHeight * 0.01); // Dynamic safe margin
    const startTime = performance.now();
    const twoPi = 2 * Math.PI / duration;

    let animationId = null;

    function animate(time) {
        const progress = (time - startTime) % duration;
        const offset = Math.cos(progress * twoPi) * -(maxTranslateY - safeMargin);
        heroImage.style.transform = `scale(1.1) translateY(${offset}px)`;

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
