import type { SEOPageData } from "./contentCrawler";

export interface KeywordProfile {
  keyword: string;
  frequency: number;
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "or",
  "for",
  "with",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "from",
  "is",
  "are",
  "this",
  "that",
  "these",
  "those",
  "it",
  "as",
  "be",
  "we",
  "you",
  "your",
  "our",
  "their",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function buildNGrams(tokens: string[], min = 1, max = 3): string[] {
  const ngrams: string[] = [];
  for (let n = min; n <= max; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(" "));
    }
  }
  return ngrams;
}

export function buildKeywordProfile(pages: SEOPageData[]): KeywordProfile[] {
  const counts = new Map<string, number>();

  for (const page of pages) {
    const sourceText = [
      page.h1,
      page.meta_title,
      ...(page.h2 ?? []),
      ...(page.h3 ?? []),
      ...(page.anchor_text ?? []),
    ]
      .filter(Boolean)
      .join(" ");

    const tokens = tokenize(sourceText);
    if (tokens.length === 0) continue;

    const ngrams = buildNGrams(tokens, 1, 3);
    for (const gram of ngrams) {
      counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => b.frequency - a.frequency);
}

