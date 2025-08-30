import { setUpSectionFadeIn, setupBackToTopButton, setUpBanner } from "./shared.js";

document.addEventListener("DOMContentLoaded", () => {
    // Set up animations
    const sections = document.querySelectorAll('.fade-in');
    setUpSectionFadeIn(sections);
    setupBackToTopButton();

    // Get user's chapter progress
    const banner = document.querySelector('.chapter-update');
    setUpBanner(banner);
});