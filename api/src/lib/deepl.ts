type DeepLOptions = {
  apiKey: string;
  text: string[];
  targetLang: string;
};

type DeepLResponse = {
  translations: { detected_source_language: string; text: string }[];
};

const LANG_MAP: Record<string, string> = {
  ja: "JA",
  en: "EN",
  zh: "ZH",
  ko: "KO",
  fr: "FR",
  es: "ES",
  pt: "PT-BR",
  ar: "AR",
  id: "ID",
};

export function toDeepLLang(appLang: string): string | null {
  return LANG_MAP[appLang] || null;
}

export async function translateText({
  apiKey,
  text,
  targetLang,
}: DeepLOptions): Promise<string[]> {
  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `DeepL-Auth-Key ${apiKey}`,
    },
    body: JSON.stringify({ text, target_lang: targetLang }),
  });

  if (!response.ok) {
    throw new Error("DeepL API error");
  }

  const data: DeepLResponse = await response.json();
  return data.translations.map((t) => t.text);
}
