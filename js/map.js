import { setUpSectionFadeIn, setupCardFadeIn, includeAllSharedComponents, 
    setUpProgressSync, loadContent, getClosestChapterValue, loadCards,
    showContent, loadImage, getImageSrc, loadRegions } from "./shared.js";

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

    // Load map image
    const mapSrc = await getImageSrc({
        imageFolder: "../img/maps/",
        extension: "png",
        manifestUrl: "../content/map/maps-manifest.json",
        containerId: "map-image"
    });

    // Apply map image if available
    if (mapSrc) {
        await loadImage(mapSrc);
        
        // Add image to page and fade in
        const img = document.getElementById("map-image");
        img.src = mapSrc;
        img.classList.add("loaded");

        // Add regions for this map
        loadRegions({
            jsonUrl: "../content/map/regions.json",
            containerId: "regions-container"
        });

        /*  Coordinate picker for map regions
        enableCoordinatePicker(document.getElementById("map-image"), ({ top, left }) => {
            console.log("Coordinates:");
            console.log("top:", top + "%");
            console.log("left:", left + "%");
            console.log("---");
        }); */
    }
    
    // Load major groups
    await loadCards({
        jsonUrl: "../content/map/major-groups.json",
        containerId: "major-groups",
        mapItemToHtml: (group, chapter) => {
            const name = getClosestChapterValue(group.name, chapter);
            const memberCount = getClosestChapterValue(group.memberCount, chapter);
            const location = getClosestChapterValue(group.location, chapter);
            const description = group.description ? getClosestChapterValue(group.description, chapter) : "";
            return `
            <h3 class="section-heading">${name}</h3>
            <p><strong>Member count:</strong> ${memberCount ?? "N/A"}</p>
            <p class="card-underline"><strong>Location:</strong> ${location}</p>
            <p class="card-description">${description ?? ""}</p>
        `},
    });
    
    // Load notable buildings
    await loadCards({
        jsonUrl: "../content/map/notable-buildings.json",
        containerId: "notable-buildings",
        mapItemToHtml: (building, chapter) => {
            const name = getClosestChapterValue(building.name, chapter);
            const belongsTo = getClosestChapterValue(building.belongsTo, chapter);
            const usage = getClosestChapterValue(building.usage, chapter);
            const note = building.note ? getClosestChapterValue(building.note, chapter) : "";
            return `
            <h3 class="section-heading">${name}</h3>
            <p><strong>Belongs to:</strong> ${belongsTo}</p>
            <p><strong>Usage:</strong> ${usage}</p>
            ` + (note ? `<p class="card-description">${note}</p>` : "");
        },
    });
    
    // Animate cards in
    const cards = document.querySelectorAll('.cards');
    setupCardFadeIn(cards);
}

// Utility function to get a pointer on an image and retrieve coordinates.
function enableCoordinatePicker(imgElement, callback) {
    // Create a temporary marker
    const marker = document.createElement("div");
    marker.style.position = "absolute";
    marker.style.width = "10px";
    marker.style.height = "10px";
    marker.style.background = "red";
    marker.style.borderRadius = "50%";
    marker.style.pointerEvents = "none";
    marker.style.transform = "translate(-50%, -50%)";
    marker.style.display = "none";

    // Wrap img in a positioned container if necessary
    let container = imgElement.parentElement;
    const containerStyle = getComputedStyle(container);
    if (containerStyle.position === "static") {
        container.style.position = "relative";
    }
    container.appendChild(marker);

    imgElement.addEventListener("click", (ev) => {
        console.log("Image clicked");
        const rect = imgElement.getBoundingClientRect();

        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;

        const leftPercent = (x / rect.width) * 100;
        const topPercent = (y / rect.height) * 100;

        // Move marker to clicked location
        marker.style.left = leftPercent + "%";
        marker.style.top = topPercent + "%";
        marker.style.display = "block";

        // Return rounded coordinates
        callback({
        top: Number(topPercent.toFixed(2)),
        left: Number(leftPercent.toFixed(2)),
        });
    });
}