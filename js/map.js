import { setUpSectionFadeIn, setupBackToTopButton, setupCardFadeIn, setUpBanner } from "./shared.js";

document.addEventListener("DOMContentLoaded", () => {
    // Set up animations
    const sections = document.querySelectorAll('.section');
    const cards = document.querySelectorAll('.cards');
    setUpSectionFadeIn(sections);
    setupBackToTopButton();
    setupCardFadeIn(cards);

    // Get user's chapter progress
    const banner = document.querySelector('.chapter-update');
    setUpBanner(banner);
});