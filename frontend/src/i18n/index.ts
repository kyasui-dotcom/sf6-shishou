import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ja from "./locales/ja.json";
import en from "./locales/en.json";
import zh from "./locales/zh.json";
import ko from "./locales/ko.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import th from "./locales/th.json";
import ar from "./locales/ar.json";
import id from "./locales/id.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ja: { translation: ja },
      en: { translation: en },
      zh: { translation: zh },
      ko: { translation: ko },
      fr: { translation: fr },
      es: { translation: es },
      pt: { translation: pt },
      th: { translation: th },
      ar: { translation: ar },
      id: { translation: id },
    },
    fallbackLng: "ja",
    supportedLngs: ["ja", "en", "zh", "ko", "fr", "es", "pt", "th", "ar", "id"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lang",
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
  });

export const LOCALE_MAP: Record<string, string> = {
  ja: "ja-JP",
  en: "en-US",
  zh: "zh-CN",
  ko: "ko-KR",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-BR",
  th: "th-TH",
  ar: "ar-SA",
  id: "id-ID",
};

export default i18n;
