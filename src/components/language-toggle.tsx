"use client";

import type { Language } from "@/lib/i18n";

export function LanguageToggle({
  language,
  onChange,
}: {
  language: Language;
  onChange: (language: Language) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-full border border-gray-300 text-sm">
      {(["vi", "en"] as Language[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={`px-3 py-1 ${
            language === lang ? "bg-pink-600 text-white" : "bg-white text-gray-700"
          }`}
        >
          {lang === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
        </button>
      ))}
    </div>
  );
}