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
  const [textToSpeech, setTextToSpeech] = useState(false);
  const [languageTranslation, setLanguageTranslation] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [largeText, setLargeText] = useState(false);
  const menuRef = useRef(null);

  // Simple function to apply translation - just change the select value
  const applyTranslation = () => {
    const select = document.querySelector(".goog-te-combo");
    if (select) {
      select.value = selectedLanguage;
      select.dispatchEvent(new Event("change"));
    }
  };

  // Initialize Google Translate - simple approach like W3Schools
  useEffect(() => {
    if (typeof window === "undefined" || !languageTranslation) return;

    // Check if script already exists
    if (document.getElementById("google-translate-script")) {
      return;
    }

    // Add the Google Translate script
    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.type = "text/javascript";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    // Create the div for Google Translate
    let translateDiv = document.getElementById("google_translate_element");
    if (!translateDiv) {
      translateDiv = document.createElement("div");
      translateDiv.id = "google_translate_element";
      document.body.appendChild(translateDiv);
    }

    // Initialize function - simple like W3Schools
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
              checked={textToSpeech}
              onChange={(e) => setTextToSpeech(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Text-to-Speech</span>
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
                <button
                  onClick={applyTranslation}
                  className={styles.saveButton}
                >
                  Save
                </button>
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
        </div>
      )}
    </div>
  );
}