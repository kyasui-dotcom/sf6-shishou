import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "th", label: "ไทย" },
  { code: "ar", label: "العربية" },
  { code: "id", label: "Indonesia" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      className="lang-switcher"
      value={i18n.language.split("-")[0]}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
