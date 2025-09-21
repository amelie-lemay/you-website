import { setUpSectionFadeIn, setupCardFadeIn, includeAllSharedComponents, 
    setUpProgressSync, loadContent, getClosestChapterValue, loadCards, 
    showContent} from "./shared.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Include shared components
    await includeAllSharedComponents();

    // Update website's content with chapter progress
    injectContent();

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
    showContent();
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

/**
 * Load and render main characters data from JSON into the container 
 * with ID "main-characters".
 * 
 * @async
 */
async function loadMainCharacters() {
    await loadCards({
        jsonUrl: "../content/characters/main-characters.json",
        containerId: "main-characters",
        mapItemToHtml: (character, chapter) => {
            const name = getClosestChapterValue(character.name, chapter);
            const age = getClosestChapterValue(character.age, chapter);
            const dateOfArrival = getClosestChapterValue(character.dateOfArrival, chapter);
            const allegiance = getClosestChapterValue(character.allegiance, chapter);
            const description = getClosestChapterValue(character.description, chapter);
            return `
            <h3 class="section-heading">${name}</h3>
            <p><strong>Age:</strong> ${age}</p>
            <p><strong>Date of Arrival:</strong> ${dateOfArrival}</p>
            <p class="card-underline"><strong>Allegiance:</strong> ${allegiance}</p>
            <p class="card-description">${description ?? ""}</p>
        `},
    });
}

/**
 * Load and render minor characters data from JSON into the container 
 * with ID "minor-characters".
 * 
 * @async
 */
async function loadMinorCharacters() {
    await loadCards({
        jsonUrl: "../content/characters/minor-characters.json",
        containerId: "minor-characters",
        mapItemToHtml: (character, chapter) => {
            const name = getClosestChapterValue(character.name, chapter);
            const allegiance = getClosestChapterValue(character.allegiance, chapter);
            return `
            <h3 class="section-heading">${name}</h3>
            <p><strong>Allegiance:</strong> ${allegiance}</p>
        `},
    });
}