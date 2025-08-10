import { setUpSectionFadeIn, setupBackToTopButton, setupCardFadeIn } from "./shared.js";

setUpSectionFadeIn(document.querySelectorAll('.section'));
setupBackToTopButton();
setupCardFadeIn(document.querySelectorAll('.major-characters'));
setupCardFadeIn(document.querySelectorAll('.minor-characters'), {
    useColumnDelay: true,
    staggerDelay: 80
});