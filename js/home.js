import { setUpSectionFadeIn, setupBackToTopButton } from "./shared.js";

setUpSectionFadeIn(document.querySelectorAll('.section'));
setupBackToTopButton();

const heroImage = document.querySelector('.hero-bg');

/**
 * Fade in the hero image and apply a moving effect.
 */
function fadeInAndAnimate() {
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

// Apply the animation effect when the image is loaded
if (heroImage.complete)
    fadeInAndAnimate();
else
    heroImage.addEventListener('load', fadeInAndAnimate);