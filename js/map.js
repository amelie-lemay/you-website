import { adjustMainOffset, setUpSectionFadeIn, setupBackToTopButton, setupCardFadeIn, setUpBanner,
    getChapterProgress, setUpProgressSync, loadContent, fetchJson, displayError,
    getClosestChapterValue, isContentVisible } from "./shared.js";

document.addEventListener("DOMContentLoaded", async () => {
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
window.addEventListener('chapterChange', injectContent);

/**
 * Inject content into the page based on user's chapter progress.
 */
async function injectContent() {
    // Remove error message if previously shown
    document.getElementById("error-wrapper").style.display = "none";
    document.getElementById("content-wrapper").style.display = "block";

    loadContent();
    await loadMajorGroups();
    await loadNotableBuildings();
    
    // Animate cards in
    const cards = document.querySelectorAll('.cards');
    setupCardFadeIn(cards);
}

// Register function globally so the shared module can access it
window.injectContent = injectContent;

/**
 * Load and render major group data from JSON into the page.
 * 
 * - Only displays content if its `chapter` is <= the user's progress.
 * - Hides content if its `removeOn` value is <= the user's progress.
 * - Uses `getClosestChapterValue` to resolve chapter-specific values.
 * 
 * Injects cards into the container with ID "major-groups".
 * 
 * @async
 * @function
 */
async function loadMajorGroups() {
    const chapter = getChapterProgress() > 0 ? getChapterProgress() : 1;
    const container = document.getElementById('major-groups');

    try {
        // Fetch major groups data
        const data = await fetchJson("../content/map/major-groups.json");

        // Clear existing content
        container.innerHTML = "";

        // Build cards
        data.forEach(group => {
            if (isContentVisible(group, chapter)) {
                const name = getClosestChapterValue(group.name, chapter);
                const memberCount = getClosestChapterValue(group.memberCount, chapter);
                const location = getClosestChapterValue(group.location, chapter);
                const description = getClosestChapterValue(group.description, chapter);

                // Create card element
                const card = document.createElement("div");
                card.className = "card card--hover";
                card.innerHTML = `
                    <h3 class="section-heading">${name}</h3>
                    <p><strong>Member count:</strong> ${memberCount ?? "N/A"}</p>
                    <p class="card-underline"><strong>Location:</strong> ${location}</p>
                    <p class="card-description">${description ?? ""}</p>
                `;

                container.appendChild(card);
            }
        });
    } catch (error) {
        console.error("Failed to load major groups:", error);
        displayError();
    }
}

/**
 * Load and render notable buildings data from JSON into the page.
 * *
 * - Only displays content if its `chapter` is <= the user's progress.
 * - Hides content if its `removeOn` value is <= the user's progress.
 * - Uses `getClosestChapterValue` to resolve chapter-specific values.
 * 
 * Injects cards into the container with ID "notable-buildings".
 * 
 * @async
 * @function
 */
async function loadNotableBuildings() {
    const chapter = getChapterProgress() > 0 ? getChapterProgress() : 1;
    const container = document.getElementById('notable-buildings');

    try {
        // Fetch notable buildings data
        const data = await fetchJson("../content/map/notable-buildings.json");

        // Clear existing content
        container.innerHTML = "";

        // Build cards
        data.forEach(building => {
            if (isContentVisible(building, chapter)) {
                const name = getClosestChapterValue(building.name, chapter);
                const belongsTo = getClosestChapterValue(building.belongsTo, chapter);
                const usage = getClosestChapterValue(building.usage, chapter);
                let note = building.note ? getClosestChapterValue(building.note, chapter) : "";

                // Create card element
                const card = document.createElement("div");
                card.className = "card card--hover";
                card.innerHTML = `
                    <h3 class="section-heading">${name}</h3>
                    <p><strong>Belongs to:</strong> ${belongsTo}</p>
                    <p><strong>Usage:</strong> ${usage}</p>
                ` + (note ? `<p class="card-description">${note}</p>` : "");

                container.appendChild(card);
            }
        });
    } catch (error) {
        console.error("Failed to load notable buildings:", error);
        displayError();
    }
}