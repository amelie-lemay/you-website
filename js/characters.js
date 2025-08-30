import { setUpSectionFadeIn, setupBackToTopButton, setupCardFadeIn, setUpBanner } from "./shared.js";

document.addEventListener("DOMContentLoaded", () => {
    // Set up animations
    const sections = document.querySelectorAll('.section');
    const largeCards = document.querySelectorAll('.major-characters');
    const gridCards = document.querySelectorAll('.minor-characters');
    setUpSectionFadeIn(sections);
    setupBackToTopButton();
    setupCardFadeIn(largeCards);
    setupCardFadeIn(gridCards, {
        useColumnDelay: true,
        staggerDelay: 80
    });

    // Get user's chapter progress
    const banner = document.querySelector('.chapter-update');
    setUpBanner(banner);
});