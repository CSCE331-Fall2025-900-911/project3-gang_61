"use client";

import { useEffect } from "react";

export default function GoogleTranslate() {
  useEffect(() => {
    // Ensure we're in the browser
    if (typeof window === "undefined") return;

    // Initialize Google Translate
    const addScript = () => {
      // Check if script is already added
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
    };

    // Define the initialization function
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,es,zh,tl,vi,ar,fr,ko,ru,pt,ht,hi,de,pl,it,ur,fa,te,ja,gu,bn,ta,pa,th,sh,el,hy,he,hmn,nv", // 30 most spoken languages in the United States
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element"
        );
      }
    };

    addScript();

    // Cleanup function
    return () => {
      // Remove the script if component unmounts
      const script = document.getElementById("google-translate-script");
      if (script) {
        script.remove();
      }
    };
  }, []);

  return <div id="google_translate_element"></div>;
}

