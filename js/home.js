import { setUpSectionFadeIn, setupBackToTopButton, setUpBanner, 
    showProgressPopup, setUpProgressSync, loadContent } from "./shared.js";

document.addEventListener("DOMContentLoaded", () => {
    // Set up animations
    const sections = document.querySelectorAll('.section');
    const heroImage = document.querySelector('.hero-bg');
    setUpSectionFadeIn(sections);
    setupBackToTopButton();
    if (heroImage.complete) // Apply the animation effect when the image is loaded
        fadeInAndAnimate(heroImage);
    else
        heroImage.addEventListener('load', () => fadeInAndAnimate(heroImage));

    // Get user's chapter progress
    const banner = document.querySelector('.chapter-update');
    showProgressPopup('onboarding'); // For visitors
    setUpBanner(banner); // For users

    // Update website's content with chapter progress
    setUpProgressSync(); // Sync chapter progress across tabs
    loadContent();
});

// Reload content when chapter changes
window.addEventListener('chapterChange', loadContent);

/**
 * Fade in the hero image and apply a moving effect.
 */
function fadeInAndAnimate(heroImage) {
    void heroImage.offsetWidth; // Force reflow to reset animation
    heroImage.classList.add('loaded');

    const duration = 30000;
    const maxTranslateY = heroImage.clientHeight * 0.05;
    const startTime = performance.now();

    function animate(time) {
        const progress = ((time - startTime) % duration) / duration;
        const offset = Math.cos(progress * 2 * Math.PI) * -maxTranslateY;
        heroImage.style.transform = `scale(1.1) translateY(${offset}px)`;
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}