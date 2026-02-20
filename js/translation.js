import { setUpSectionFadeIn, includeAllSharedComponents,
    getChapterProgress, getContentChapter, setUpProgressSync, 
    loadContent, fetchJson, displayError, isContentVisible, 
    showContent} from "./shared.js";

// To hold the cleanup function for the custom scrollbar
let cleanupScrollbar = null;

document.addEventListener("DOMContentLoaded", async () => {
    // Include shared components
    await includeAllSharedComponents();

    // Update website's content with chapter progress
    injectContent();

    // Configure custom scrollbar for sidebar
    configureCustomScrollbar();

    // Sync chapter progress across tabs
    setUpProgressSync();
});

// Reload content when chapter changes
window.addEventListener("chapterChange", injectContent);

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

    showContent("flex");
    loadContent();

    await loadTranslations();

    // Listener to switch between chapters
    addChapterSwitchListener();

    // Animate sections in
    const sections = document.querySelectorAll('.fade-in');
    setUpSectionFadeIn(sections);
}


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
    const chapter = getContentChapter();
    const container = document.getElementById('translations');
    const selector = document.getElementById('chapter-select');
    const sidebar = document.getElementById("sidebar");
    const FIRST_CHAPTER = 7;

    try {
        // Fetch translations data
        const data = await fetchJson("../content/translations/chapters.json");

        // Clear previous scrollbar if any
        if (cleanupScrollbar) {
            cleanupScrollbar();
            cleanupScrollbar = null;
        }

        // Get active chapter number
        let activeChapter = localStorage.getItem("activeTranslation") === null ? FIRST_CHAPTER : Number(localStorage.getItem("activeTranslation"));
        if (activeChapter > chapter) // Prevent accessing chapters beyond progress
            activeChapter = FIRST_CHAPTER;

        // Clear existing content
        container.innerHTML = "";
        selector.innerHTML = "";
        sidebar.innerHTML = "";

        // Build translation blocks
        data.forEach(translationBlock => {
            if (isContentVisible(translationBlock, chapter)) {
                // Add chapter to desktop sidebar
                const sidebarItem = document.createElement("li");
                sidebarItem.innerHTML = `<a href="#chapter${translationBlock.chapter}" class="link">Chapter ${translationBlock.chapter}</a>`;
                sidebar.appendChild(sidebarItem);

                // Add chapter to mobile selector
                const option = document.createElement("option");
                option.value = `chapter${translationBlock.chapter}`;
                option.textContent = `${translationBlock.chapter}`;
                selector.appendChild(option);

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
                    const contextP = document.createElement("p");
                    contextP.className = "context";
                    contextP.textContent = context;
                    dialogueDiv.appendChild(contextP);
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

        // Reconfigure scrollbar after rebuild
        cleanupScrollbar = configureCustomScrollbar();
    } catch (error) {
        displayError("translations", error);
    }
}

/**
 * Add click listeners to sidebar links to switch between chapters.
 */
function addChapterSwitchListener() {
    const sidebar = document.querySelector("aside ul");
    const chapterSelector = document.getElementById("chapter-select");
    const chapters = document.querySelectorAll(".translation-block");

    // Mobile selector change listener
    chapterSelector.addEventListener("change", (event) => {
        // Selected chapter
        const optionSelected = chapterSelector.value;

        // Get corresponding sidebar link
        const link = sidebar.querySelector(`a[href="#${optionSelected}"]`);

        // Change layout to corresponding chapter
        if (link)
            handleChapterSwitch(link);
        // Fallback if corresponding sidebar link not found
        else {
            chapters.forEach(chapter => {
                chapter.classList.toggle("active", chapter.id === optionSelected);
            });
        }
    });

    // Desktop sidebar click listener
    sidebar.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) return;
        event.preventDefault();

        // Change layout to corresponding chapter
        handleChapterSwitch(link);
    });

    function handleChapterSwitch(link) {
        // Get chapter id from sidebar link
        const chapterId = link.getAttribute("href").substring(1);

        // Update active state in sections
        chapters.forEach(chapter => {
            chapter.classList.toggle("active", chapter.id === chapterId);
        });

        // Remove sidebar old active states
        sidebar.querySelectorAll("a").forEach(a => a.classList.remove("active"));
        sidebar.querySelectorAll("li").forEach(li => li.classList.remove("active"));

        // Set new active state for sidebar (desktop)
        link.classList.add("active");
        link.parentElement.classList.add("active");

        // Set new active state for selector (mobile)
        chapterSelector.value = chapterId;

        // Update localStorage
        const chapterNumber = parseInt(chapterId.replace("chapter", ""));
        localStorage.setItem("activeTranslation", chapterNumber);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Configure custom scrollbar for the sidebar.
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

    // Throttle updates with requestAnimationFrame
    let rafId = null;
    function scheduleUpdate() {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
            updateThumb();
            rafId = null;
        });
    }

    // Synchronize thumb size & position
    function updateThumb() {
        const ch = ul.clientHeight;
        const sh = ul.scrollHeight;

        if (!thumb) return;

        // Hide thumb if not scrollable
        if (sh <= ch) {
            thumb.style.display = 'none';
            return;
        }
        thumb.style.display = '';

        const ratio = ch / sh;
        const thumbHeight = Math.max(24, Math.floor(ratio * ch));
        const maxTop = ch - thumbHeight;
        const top = (ul.scrollTop / (sh - ch)) * maxTop;

        thumb.style.height = thumbHeight + 'px';
        thumb.style.transform = `translateY(${Math.max(0, top)}px)`;
    }

    // Update on scroll/resize
    ul.addEventListener('scroll', scheduleUpdate);
    window.addEventListener('resize', scheduleUpdate);

    // Observe size changes
    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(wrapper);

    // Detect dynamic additions/removals of list items
    const mo = new MutationObserver(scheduleUpdate);
    mo.observe(ul, { childList: true, subtree: true, characterData: true });

    // Initial update
    scheduleUpdate();

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
    const onMouseMove = (e) => {
        if (!dragging) return;
        const deltaY = e.clientY - dragStartY;
        const ch = ul.clientHeight;
        const sh = ul.scrollHeight;
        const thumbH = thumb.clientHeight;
        const trackScrollable = ch - thumbH;
        if (trackScrollable <= 0) return;
        const scrollDelta = (deltaY / trackScrollable) * (sh - ch);
        ul.scrollTop = Math.max(0, Math.min(sh - ch, startScrollTop + scrollDelta));
        scheduleUpdate();
    }

    // Mouse up to stop dragging
    const onMouseUp = () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove('no-select');
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

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

    // Cleanup function if needed
    return function cleanupScrollbar() {
        ul.removeEventListener('scroll', scheduleUpdate);
        window.removeEventListener('resize', scheduleUpdate);
        ro.disconnect();
        mo.disconnect();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
}