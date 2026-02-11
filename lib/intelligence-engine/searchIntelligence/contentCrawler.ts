export interface SEOPageData {
  url: string;
  h1: string;
  h2: string[];
  h3: string[];
  meta_title: string;
  meta_description?: string;
  word_count: number;
  published_at?: Date;
  anchor_text: string[];
  slug?: string;
  image_alt_text?: string[];
}

const CONTENT_PATH_REGEX = /\/(blog|resources|insights|knowledge|case-studies?|guides)(\/|$)/i;

export function isSeoContentPath(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return CONTENT_PATH_REGEX.test(path);
  } catch {
    return CONTENT_PATH_REGEX.test(url);
  }
}

