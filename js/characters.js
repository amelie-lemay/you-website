import { setUpSectionFadeIn, setupCardFadeIn, includeAllSharedComponents, 
    setUpProgressSync, loadContent, getClosestChapterValue, loadItems, 
    showContent
} from "./shared.js";

const MAIN_CHARACTERS_URL = "../content/characters/main-characters.json";
const MINOR_CHARACTERS_URL = "../content/characters/minor-characters.json";

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
    
    // Load main characters
    await loadItems({
        jsonUrl: MAIN_CHARACTERS_URL,
        containerId: "main-characters",
        mapItemToHtml: (character, chapter) => {
            const name = getClosestChapterValue(character.name, chapter);
            const age = getClosestChapterValue(character.age, chapter);
            const dateOfArrival = getClosestChapterValue(character.dateOfArrival, chapter);
            const allegiance = getClosestChapterValue(character.allegiance, chapter);
            const description = getClosestChapterValue(character.description, chapter);
            return `
            <h3 class="section-heading">${name}</h3>
            <div class="card-meta card-underline">
                <div class="label">Age:</div>
                <div>${age}</div>
                <div class="label">Date of Arrival:</div>
                <div>${dateOfArrival}</div>
                <div class="label">Allegiance:</div>
                <div>${allegiance}</div>
            </div>
            <p class="card-description">${description}</p>
        `},
    });
    
    // Load minor characters
    await loadItems({
        jsonUrl: MINOR_CHARACTERS_URL,
        containerId: "minor-characters",
        mapItemToHtml: (character, chapter) => {
            const name = getClosestChapterValue(character.name, chapter);
            const allegiance = getClosestChapterValue(character.allegiance, chapter);
            return `
            <h3 class="section-heading">${name}</h3>
            <div class="card-meta">
                <div class="label">Allegiance:</div>
                <div>${allegiance}</div>
            </div>
        `},
    });

    // Animate cards in
    const largeCards = document.querySelectorAll('.major-characters');
    const gridCards = document.querySelectorAll('.minor-characters');
    setupCardFadeIn(largeCards);
    setupCardFadeIn(gridCards, {
        useColumnDelay: true,
        staggerDelay: 80
    });
}