import { setUpSectionFadeIn, setupBackToTopButton, setUpBanner,
    getChapterProgress, setUpProgressSync, 
    loadContent, fetchJson, isContentVisible } from "./shared.js";

document.addEventListener("DOMContentLoaded", () => {
    // Set up animations
    const sections = document.querySelectorAll('.fade-in');
    setUpSectionFadeIn(sections);
    setupBackToTopButton();

    // Configure custom scrollbar for sidebar
    configureCustomScrollbar();

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
    loadContent();
    await loadTranslations();

    // Listener to switch between chapters
    addChapterSwitchListener();

    // Animate sections in
    const sections = document.querySelectorAll('.fade-in');
    setUpSectionFadeIn(sections);
}

// Register function globally so the shared module can access it
window.injectContent = injectContent;

async function loadTranslations() {
    const chapter = getChapterProgress() > 0 ? getChapterProgress() : 1;
    const container = document.getElementById('translations');
    const sidebar = document.getElementById("sidebar");
    const FIRST_CHAPTER = 7;

    try {
        // Fetch translations data
        const data = await fetchJson("../content/translations/chapters.json");

        // Get active chapter number
        let activeChapter = localStorage.getItem("activeTranslation") === null ? FIRST_CHAPTER : Number(localStorage.getItem("activeTranslation"));
        if (activeChapter > chapter) // Prevent accessing chapters beyond progress
            activeChapter = FIRST_CHAPTER;

        // Clear existing content
        container.innerHTML = "";
        sidebar.innerHTML = "";

        // Build translation blocks
        data.forEach(translationBlock => {
            if (isContentVisible(translationBlock, chapter)) {
                // Add chapter to sidebar
                const sidebarItem = document.createElement("li");
                sidebarItem.innerHTML = `<a href="#chapter${translationBlock.chapter}">Chapter ${translationBlock.chapter}</a>`;
                sidebar.appendChild(sidebarItem);

                // Create block element
                const chapterDiv = document.createElement("div");
                chapterDiv.className = "translation-block fade-in";
                chapterDiv.id = `chapter${translationBlock.chapter}`;
                chapterDiv.innerHTML = `<h3>Chapter ${translationBlock.chapter} — Translated Dialogue</h3>`;
                
                // Add scenes
                let addSeparator = false;
                const scenes = translationBlock.scenes;
                scenes.forEach(scene => {
                    const context = scene.context;
                    const lines = scene.dialogue;

                    // Add lines
                    const boxDiv = document.createElement("div");
                    boxDiv.className = "box";
                    lines.forEach(line => {
                        const lineP = document.createElement("p");
                        lineP.innerHTML = line;
                        boxDiv.appendChild(lineP);
                    });

                    // Create dialogue element
                    const dialogueDiv = document.createElement("div");
                    dialogueDiv.className = "dialogue fade-in";
                    if (addSeparator) {
                        const separatorDiv = document.createElement("div");
                        separatorDiv.className = "separator";
                        separatorDiv.innerHTML = `<span>❈</span>`;
                        dialogueDiv.appendChild(separatorDiv);
                    }
                    dialogueDiv.innerHTML = `<p class="context">${context}</p>`;
                    dialogueDiv.appendChild(boxDiv);

                    // Append to chapter block
                    chapterDiv.appendChild(dialogueDiv);
                    addSeparator = true;
                });

                container.appendChild(chapterDiv);

                // Highlight if active chapter
                if (translationBlock.chapter === activeChapter) {
                    sidebarItem.querySelector("a").classList.add("active");
                    chapterDiv.classList.add("active");
                }
            }
        });
    } catch (error) {
        console.error("Failed to load major groups:", error);
    }
}

function addChapterSwitchListener() {
    const sidebar = document.querySelector("aside ul");
    const chapters = document.querySelectorAll(".translation-block");

    sidebar.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) return;
        event.preventDefault();

        // Update active state in sidebar
        sidebar.querySelectorAll("a").forEach(a => a.classList.remove("active"));
        link.classList.add("active");

        // Find matching section
        const chapterId = link.getAttribute("href").substring(1);

        // Update active state in sections
        chapters.forEach(chapter => {
            if (chapter.id === chapterId)
                chapter.classList.add("active");
            else
                chapter.classList.remove("active");
        });

        // Update localStorage
        const chapterNumber = parseInt(chapterId.replace("chapter", ""));
        localStorage.setItem("activeTranslation", chapterNumber);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}