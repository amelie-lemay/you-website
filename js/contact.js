import { includeAllSharedComponents, setUpSectionFadeIn, 
    createProgressPopup, setUpProgressSync, loadContent, scrollToCard } from "./shared.js";

const FIELD_CONFIG = [
    {
        id: "name",
        errorId: "name-error",
        validate(value) {
            if (value === "")   // Optional field
                return null;
            if (/[<>\r\n]/.test(value))     // Check for problematic characters in email headers
                return "Name contains characters that aren't allowed.";
            return null;
        },
    },
    {
        id: "email",
        errorId: "email-error",
        validate(value) {
            if (value === "")     // Optional field
                return null;
            if (/[\r\n]/.test(value))     // Check for characters that could be used in email header injection
                return "Email contains characters that aren't allowed.";
            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;      // Check for basic email format
            if (!emailRe.test(value))
                return "Please enter a valid email address.";
            return null;
        },
    },
    {
        id: "message",
        errorId: "message-error",
        validate(value) {
            const MIN_LENGTH = 10;
            if (value === "")     // Required field
                return "A message is required — don't be shy!";
            if (value.length < MIN_LENGTH)    // Too short to be meaningful
                return `Your message is a bit short (${MIN_LENGTH} characters minimum).`;
            return null;
        },
    },
];

document.addEventListener("DOMContentLoaded", async () => {
    // Include shared components
    await includeAllSharedComponents();

    // Get user's chapter progress if visitor
    createProgressPopup('onboarding');

    // Update website's content with chapter progress
    loadContent();

    // Animate sections in
    const sections = document.querySelectorAll('.section');
    setUpSectionFadeIn(sections);

    // Sync chapter progress across tabs
    setUpProgressSync();

    // Set up form validation and submission handling
    const form = document.querySelector(".contact-form");
    if (form) {
        initContactForm();
        form.addEventListener("submit", handleFormSubmit);
    }
});

// Reload content when chapter changes
window.addEventListener("chapterChange", loadContent);

function initContactForm() {
    for (const config of FIELD_CONFIG) {
        const input = document.getElementById(config.id);
        if (!input) continue;
        input.addEventListener("input", () => {
            // Only re-validate (and potentially re-show an error) if the field
            // already has the invalid class — avoids yelling before first submit.
            if (input.classList.contains("field-invalid")) {
                const error = config.validate(input.value.trim());
                if (error)
                    setError(config, error);
                else
                    clearError(config);
            }
        });
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    hideResult();

    if (!validateAll()) return; // stop here if anything is invalid

    const form = document.querySelector(".contact-form");
    const submitButton = document.getElementById("contact-submit-button");

    // Disable the submit button while the request is in-flight
    submitButton.disabled = true;
    submitButton.textContent = "Sending…";

    const formData = new FormData(form);
    const payload = JSON.stringify(Object.fromEntries(formData));

    try {
        /*
        const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: payload,
        });

        const data = await response.json();
        */

        if (true) { //response.ok) {
            showResult(
                "Message sent. Thanks! I'll get back to you if you left an email.",
                true
            );
            form.reset();
            // Clear any lingering invalid styles after reset
            for (const config of FIELD_CONFIG) clearError(config);
        } else {
            // Web3Forms returns a human-readable message on 4xx/5xx too
            showResult(data.message || "Something went wrong. Please try again.", false);
        }
    } catch (_err) {
        showResult("Network error. Please check your connection and try again.", false);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Send Message";
    }
}

/**
 * Set the error message and styles for one field.
 * @param {*} config - the field's config object from FIELD_CONFIG
 * @param {*} message - the error message to show
 */
function setError(config, message) {
    const input = document.getElementById(config.id);
    const errorEl = document.getElementById(config.errorId);
    if (errorEl)
        errorEl.textContent = message;
    if (input)
        input.classList.add("field-invalid");
}

/**
 * Clear the error state for one field.
 * @param {*} config - the field's config object from FIELD_CONFIG
 */
function clearError(config) {
    const input = document.getElementById(config.id);
    const errorEl = document.getElementById(config.errorId);
    if (errorEl)
        errorEl.textContent = "";
    if (input)
        input.classList.remove("field-invalid");
}

/**
 * Validate all fields and show errors if needed. Focus the first invalid field.
 * @returns {boolean} - true if all fields are valid, false if any are invalid
 */
function validateAll() {
    let firstInvalid = null;
    let allValid = true;

    for (const config of FIELD_CONFIG) {
        const input = document.getElementById(config.id);
        if (!input) continue;

        const value = input.value.trim();
        const error = config.validate(value);

        if (error) {
            setError(config, error);
        if (!firstInvalid)
            firstInvalid = input;
            allValid = false;
        } else {
            clearError(config);
        }
    }

    if (firstInvalid) {
        scrollToCard(firstInvalid);
        setTimeout(() => firstInvalid.focus(), 300);
    }
    
    return allValid;
}

/**
 * Show a result message after form submission.
 * @param {*} message - the message to show
 * @param {*} isSuccess - whether this is a success message (true) or error message (false)
 */
function showResult(message, isSuccess) {
    const resultBox = document.getElementById("form-result");
    resultBox.innerHTML = message;
    resultBox.className = isSuccess ? "result-success" : "result-error";
    resultBox.hidden = false;
}

/**
 * Hide the result message and clear its content and styles.
 */
function hideResult() {
  const resultBox = document.getElementById("form-result");

  resultBox.hidden = true;
  resultBox.className = "";
  resultBox.textContent = "";
}