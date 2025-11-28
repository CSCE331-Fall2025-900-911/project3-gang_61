"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import styles from "./AccessibilityMenu.module.css";

// Language options with their codes for Google Translate
const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "zh", name: "Chinese" },
  { code: "tl", name: "Filipino" },
  { code: "vi", name: "Vietnamese" },
  { code: "ar", name: "Arabic" },
  { code: "fr", name: "French" },
  { code: "ko", name: "Korean" },
  { code: "ru", name: "Russian" },
  { code: "pt", name: "Portuguese" },
  { code: "ht", name: "Haitian Creole" },
  { code: "hi", name: "Hindi" },
  { code: "de", name: "German" },
  { code: "pl", name: "Polish" },
  { code: "it", name: "Italian" },
  { code: "ur", name: "Urdu" },
  { code: "fa", name: "Persian" },
  { code: "te", name: "Telugu" },
  { code: "ja", name: "Japanese" },
  { code: "gu", name: "Gujarati" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "pa", name: "Punjabi" },
  { code: "th", name: "Thai" },
  { code: "sh", name: "Serbo-Croatian" },
  { code: "el", name: "Greek" },
  { code: "hy", name: "Armenian" },
  { code: "he", name: "Hebrew" },
  { code: "hmn", name: "Hmong" },
  { code: "nv", name: "Navajo" },
];

export default function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [languageTranslation, setLanguageTranslation] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [largeText, setLargeText] = useState(false);
  const menuRef = useRef(null);
  const translateScriptLoaded = useRef(false);

  // Load saved preferences on mount
  useEffect(() => {
    const savedHighContrast = localStorage.getItem("highContrast") === "true";
    const savedLanguage = localStorage.getItem("selectedLanguage") || "en";
    const savedLanguageTranslation = localStorage.getItem("languageTranslation") === "true";

    if (savedHighContrast) {
      setHighContrast(true);
      applyHighContrast(true);
    }

    if (savedLanguageTranslation) {
      setLanguageTranslation(true);
      setSelectedLanguage(savedLanguage);
      // Load the translation after the component mounts
      setTimeout(() => applyTranslation(savedLanguage, 15), 500);
    }
  }, []);

  // Function to apply high contrast mode
  const applyHighContrast = (enabled) => {
    if (enabled) {
      document.documentElement.style.setProperty('--contrast-filter', 'contrast(1.5) saturate(1.3)');
      document.body.classList.add('high-contrast-mode');
    } else {
      document.documentElement.style.setProperty('--contrast-filter', 'none');
      document.body.classList.remove('high-contrast-mode');
    }
  };

  // Function to apply translation with retry logic
  const applyTranslation = (language, retries = 15) => {
    const select = document.querySelector(".goog-te-combo");
    if (select) {
      select.value = language;
      select.dispatchEvent(new Event("change"));
    } else if (retries > 0) {
      // Retry after 200ms if the widget hasn't loaded yet
      setTimeout(() => applyTranslation(language, retries - 1), 200);
    }
  };

  // Handle save button click
  const handleSave = () => {
    // Apply high contrast
    applyHighContrast(highContrast);
    localStorage.setItem("highContrast", highContrast.toString());

    // Apply translation if enabled
    if (languageTranslation) {
      localStorage.setItem("languageTranslation", "true");
      localStorage.setItem("selectedLanguage", selectedLanguage);
      applyTranslation(selectedLanguage);
    } else {
      localStorage.setItem("languageTranslation", "false");
      localStorage.removeItem("selectedLanguage");
      // Reset to English if translation is disabled
      const select = document.querySelector(".goog-te-combo");
      if (select) {
        select.value = "en";
        select.dispatchEvent(new Event("change"));
      }
    }

    setIsOpen(false);
  };

  // Initialize Google Translate once when enabled
  useEffect(() => {
    if (typeof window === "undefined" || !languageTranslation) return;

    // Check if script already exists
    if (translateScriptLoaded.current || document.getElementById("google-translate-script")) {
      return;
    }

    translateScriptLoaded.current = true;

    // Create the div for Google Translate
    let translateDiv = document.getElementById("google_translate_element");
    if (!translateDiv) {
      translateDiv = document.createElement("div");
      translateDiv.id = "google_translate_element";
      translateDiv.style.display = "none"; // Hide the widget
      document.body.appendChild(translateDiv);
    }

    // Initialize function
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: languages.map((l) => l.code).join(","),
          },
          "google_translate_element"
        );
      }
    };

    // Add the Google Translate script
    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.type = "text/javascript";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, [languageTranslation]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleLanguageTranslationToggle = (enabled) => {
    setLanguageTranslation(enabled);
    if (!enabled) {
      setSelectedLanguage("en");
      const select = document.querySelector(".goog-te-combo");
      if (select) {
        select.value = "en";
        select.dispatchEvent(new Event("change"));
      }
    }
  };

  return (
    <div className={styles.accessibilityContainer} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.accessibilityButton}
        aria-label="Accessibility Options"
        title="Accessibility Options"
      >
        <Image
          src="/accessibility.svg"
          alt="Accessibility"
          width={36}
          height={36}
          className={styles.accessibilityIcon}
        />
      </button>

      {isOpen && (
        <div className={styles.accessibilityMenu}>
          <h3 className={styles.menuTitle}>Accessibility Options</h3>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              className={styles.checkbox}
            />
            <span>High Contrast</span>
          </label>

          <div className={styles.languageSection}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={languageTranslation}
                onChange={(e) => handleLanguageTranslationToggle(e.target.checked)}
                className={styles.checkbox}
              />
              <span>Language Translation</span>
            </label>

            {languageTranslation && (
              <>
                <div className={styles.languageDropdown}>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className={styles.languageSelect}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={largeText}
              onChange={(e) => setLargeText(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Large Text/Icons</span>
          </label>

          <div className={styles.menuFooter}>
            <button
              onClick={handleSave}
              className={styles.saveButton}
              title="Save accessibility preferences"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}