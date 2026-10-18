/**
 * Fallback list used if the languages API is unreachable.
 */
export const FALLBACK_LANGUAGES = [
  'Portuguese',
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Dutch',
  'Mandarin',
  'Arabic',
  'Russian',
];

interface LibreTranslateLanguage {
  code: string;
  name: string;
}

/**
 * Fetches the list of language names from LibreTranslate's free,
 * public `/languages` endpoint (no API key required).
 */
export async function fetchLanguages(): Promise<string[]> {
  try {
    const response = await fetch('https://libretranslate.com/languages');
    if (!response.ok) throw new Error(`Languages API responded with ${response.status}`);

    const languages: LibreTranslateLanguage[] = await response.json();
    return languages.map((language) => language.name).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Falling back to the static language list:', error);
    return FALLBACK_LANGUAGES;
  }
}
