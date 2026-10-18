import { apiGet } from './client';

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
export async function getLanguages(): Promise<string[]> {
  try {
    const languages = await apiGet<LibreTranslateLanguage[]>(
      'https://libretranslate.com/languages',
    );
    return languages.map((language) => language.name).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Falling back to the static language list:', error);
    return FALLBACK_LANGUAGES;
  }
}
