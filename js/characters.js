import { adjustMainOffset, setUpSectionFadeIn, setupBackToTopButton, setupCardFadeIn, setUpBanner,
    getChapterProgress, setUpProgressSync, loadContent, fetchJson, displayError,
    getClosestChapterValue, isContentVisible } from "./shared.js";

document.addEventListener("DOMContentLoaded", () => {
    // Fix header
    adjustMainOffset();
    
    // Set up animations
    const sections = document.querySelectorAll('.section');
    setUpSectionFadeIn(sections);
    setupBackToTopButton();

    // Get user's chapter progress
    const banner = document.querySelector('.chapter-update');
    setUpBanner(banner);

    // Update website's content with chapter progress
    setUpProgressSync(); // Sync chapter progress across tabs
    injectContent();
});

// Reload content when chapter changes
window.addEventListener('chapterChange', loadContent);

/**
 * Inject content into the page based on user's chapter progress.
 */
async function injectContent() {
    // Remove error message if previously shown
    document.getElementById("error-wrapper").style.display = "none";
    document.getElementById("content-wrapper").style.display = "block";

    loadContent();
    await loadMainCharacters();
    await loadMinorCharacters();

    // Animate cards in
    const largeCards = document.querySelectorAll('.major-characters');
    const gridCards = document.querySelectorAll('.minor-characters');
    setupCardFadeIn(largeCards);
    setupCardFadeIn(gridCards, {
        useColumnDelay: true,
        staggerDelay: 80
    });
}

// Register function globally so the shared module can access it
window.injectContent = injectContent;

/**
 * Load and render main characters data from JSON into the page.
 * 
 * - Only displays content if its `chapter` is <= the user's progress.
 * - Hides content if its `removeOn` value is <= the user's progress.
 * - Uses `getClosestChapterValue` to resolve chapter-specific values.
 * 
 * Injects cards into the container with ID "main-characters".
 * 
 * @async
 * @function
 */
async function loadMainCharacters() {
    const chapter = getChapterProgress() > 0 ? getChapterProgress() : 1;
    const container = document.getElementById('main-characters');

    try {
        // Fetch main characters data
        const data = await fetchJson("../content/characters/main-characters.json");

        // Clear existing content
        container.innerHTML = "";

        // Build cards
        data.forEach(character => {
            if (isContentVisible(character, chapter)) {
                const name = getClosestChapterValue(character.name, chapter);
                const age = getClosestChapterValue(character.age, chapter);
                const dateOfArrival = getClosestChapterValue(character.dateOfArrival, chapter);
                const allegiance = getClosestChapterValue(character.allegiance, chapter);
                const description = getClosestChapterValue(character.description, chapter);

                // Create card element
                const card = document.createElement("div");
                card.className = "card card--hover";
                card.innerHTML = `
                    <h3 class="section-heading">${name}</h3>
                    <p><strong>Age:</strong> ${age}</p>
                    <p><strong>Date of Arrival:</strong> ${dateOfArrival}</p>
                    <p class="card-underline"><strong>Allegiance:</strong> ${allegiance}</p>
                    <p class="card-description">${description}</p>
                `;

                container.appendChild(card);
            }
        });
    } catch (error) {
        console.error("Failed to load main characters:", error);
        displayError();
    }
}

/**
 * Load and render minor characters data from JSON into the page.
 * 
 * - Only displays content if its `chapter` is <= the user's progress.
 * - Hides content if its `removeOn` value is <= the user's progress.
 * - Uses `getClosestChapterValue` to resolve chapter-specific values.
 * 
 * Injects cards into the container with ID "minor-characters".
 * 
 * @async
 * @function
 */
async function loadMinorCharacters() {
    const chapter = getChapterProgress() > 0 ? getChapterProgress() : 1;
    const container = document.getElementById('minor-characters');

    try {
        // Fetch main characters data
        const data = await fetchJson("../content/characters/minor-characters.json");

        // Clear existing content
        container.innerHTML = "";

        // Build cards
        data.forEach(character => {
            if (isContentVisible(character, chapter)) {
                const name = getClosestChapterValue(character.name, chapter);
                const allegiance = getClosestChapterValue(character.allegiance, chapter);

                // Create card element
                const card = document.createElement("div");
                card.className = "card card--hover";
                card.innerHTML = `
                    <h3 class="section-heading">${name}</h3>
                    <p><strong>Allegiance:</strong> ${allegiance}</p>
                `;

                container.appendChild(card);
            }
        });
    } catch (error) {
        console.error("Failed to load minor characters:", error);
        displayError();
    }
}