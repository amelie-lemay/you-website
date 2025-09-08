import { setUpSectionFadeIn, setupBackToTopButton, setUpBanner,
    getChapterProgress, setUpProgressSync, 
    loadContent, fetchJson, displayError, isContentVisible } from "./shared.js";

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
 * For this page, if the user reverted before chapter 7, they will 
 * be redirected to the main page.
 */
async function injectContent() {
    if (getChapterProgress() < 7) {
        window.location.href = "../index.html";
        return;
    }

    // Remove error message if previously shown
    document.getElementById("error-message").hidden = true;
    document.getElementById("content-wrapper").style.display = "block";

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


/**
 * Load and render translations data from JSON into the page.
 *
 * - Only displays content if its `chapter` is <= the user's progress.
 * - Hides content if its `removeOn` value is <= the user's progress.
 *
 * Injects cards into the container with ID "translations".
 *
 * @async
 * @function
 */
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
        console.error("Failed to load translations:", error);
        displayError();
    }
}

/**
 * Add click listeners to sidebar links to switch between chapters.
 */
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

/**
 * Configure custom scrollbar for the sidebar.
 * @returns {void}
 */
function configureCustomScrollbar() {
    const aside = document.querySelector('aside');
    if (!aside) return;

    const ul = aside.querySelector('ul#sidebar') || aside.querySelector('ul');
    if (!ul) return;

    let wrapper = ul.parentElement;
    if (!wrapper.classList.contains('toc-scroll')) {
        // Wrap ul in wrapper
        wrapper = document.createElement('div');
        wrapper.className = 'toc-scroll';
        ul.parentNode.insertBefore(wrapper, ul);
        wrapper.appendChild(ul);

        // Create faux scrollbar + thumb
        const faux = document.createElement('div');
        faux.className = 'faux-scrollbar';
        const thumb = document.createElement('div');
        thumb.className = 'faux-thumb';
        faux.appendChild(thumb);
        wrapper.appendChild(faux);
    }

    const thumb = wrapper.querySelector('.faux-thumb');

    // Synchronize thumb size & position
    function updateThumb() {
        // Ensure layout has settled
        requestAnimationFrame(() => {
            const ch = ul.clientHeight;
            const sh = ul.scrollHeight;

            if (!thumb) return;

            // Hide thumb if not scrollable
            if (sh <= ch) {
                thumb.style.display = 'none';
                return;
            } else {
                thumb.style.display = '';
            }

            const ratio = ch / sh;
            const thumbHeight = Math.max(24, Math.floor(ratio * ch));
            const maxTop = ch - thumbHeight;
            const scrollTop = ul.scrollTop;
            const top = (scrollTop / (sh - ch)) * maxTop;

            thumb.style.height = thumbHeight + 'px';
            thumb.style.transform = `translateY(${Math.max(0, top)}px)`;
        });
    }

    // Update on scroll/resize
    ul.addEventListener('scroll', updateThumb);
    window.addEventListener('resize', updateThumb);

    // Observe size changes
    const ro = new ResizeObserver(updateThumb);
    ro.observe(wrapper);

    // Detect dynamic additions/removals of list items
    const mo = new MutationObserver(() => updateThumb());
    mo.observe(ul, { childList: true, subtree: true, characterData: true });

    // Initial update
    updateThumb();
    requestAnimationFrame(updateThumb);

    // Dragging the thumb
    let dragging = false;
    let dragStartY = 0;
    let startScrollTop = 0;

    // Mouse down on thumb
    thumb.addEventListener('mousedown', (e) => {
        dragging = true;
        dragStartY = e.clientY;
        startScrollTop = ul.scrollTop;
        document.body.classList.add('no-select');
        e.preventDefault();
    });

    // Mouse move to drag
    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const deltaY = e.clientY - dragStartY;
        const ch = ul.clientHeight;
        const sh = ul.scrollHeight;
        const thumbH = thumb.clientHeight;
        const scrollable = sh - ch;
        const trackScrollable = ch - thumbH;
        if (trackScrollable <= 0) return;
        const scrollDelta = (deltaY / trackScrollable) * scrollable;
        ul.scrollTop = Math.max(0, Math.min(sh - ch, startScrollTop + scrollDelta));
        updateThumb();
    });

    // Mouse up to stop dragging
    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove('no-select');
    });

    // Click on faux scrollbar to jump
    wrapper.querySelector('.faux-scrollbar').addEventListener('click', (e) => {
        if (e.target === thumb) return;
        const rect = wrapper.querySelector('.faux-scrollbar').getBoundingClientRect();
        const clickPos = e.clientY - rect.top;
        const ch = ul.clientHeight;
        const sh = ul.scrollHeight;
        const thumbH = thumb.clientHeight;
        const targetTop = Math.max(0, Math.min(ch - thumbH, clickPos - thumbH / 2));
        const ratio = targetTop / (ch - thumbH);
        ul.scrollTop = ratio * (sh - ch);
    });
}