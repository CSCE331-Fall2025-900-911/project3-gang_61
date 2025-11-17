"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import styles from "./AccessibilityMenu.module.css";

export default function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [textToSpeech, setTextToSpeech] = useState(false);
  const [languageTranslation, setLanguageTranslation] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const menuRef = useRef(null);

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

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={languageTranslation}
              onChange={(e) => setLanguageTranslation(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Language Translation</span>
          </label>

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