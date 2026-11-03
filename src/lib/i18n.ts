import { useEffect, useState } from "react";

export type Language = "en" | "vi";

const LANGUAGE_STORAGE_KEY = "nailflow-language";

// Remembers the chosen language on this device
export function useLanguage(defaultLanguage: Language = "vi") {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === "en" || saved === "vi") {
        setLanguageState(saved);
      }
    } catch {
      // Storage can be blocked. The default language is used instead.
    }
  }, []);

  function setLanguage(next: Language) {
    setLanguageState(next);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  }

  return { language, setLanguage };
}