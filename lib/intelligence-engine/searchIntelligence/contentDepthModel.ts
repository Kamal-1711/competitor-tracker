import type { SEOPageData } from "./contentCrawler";

export interface ContentDepthMetrics {
  total_blog_pages: number;
  avg_word_count: number;
  total_case_studies: number;
  publishing_frequency_per_month: number;
  long_form_ratio: number;
  content_investment_score: number; // 0–100
}

function isBlogLike(url: string): boolean {
  return /\/(blog|resources|insights|knowledge|guides)(\/|$)/i.test(url);
}

function isCaseStudy(url: string): boolean {
  return /\/(case-stud(y|ies)|customers?)(\/|$)/i.test(url);
}

export function computeContentDepthMetrics(pages: SEOPageData[]): ContentDepthMetrics {
  const blogPages = pages.filter((p) => isBlogLike(p.url));
  const caseStudyPages = pages.filter((p) => isCaseStudy(p.url));

  const total_blog_pages = blogPages.length;
  const total_case_studies = caseStudyPages.length;

  const avg_word_count =
    blogPages.length > 0
      ? Math.round(blogPages.reduce((sum, p) => sum + (p.word_count || 0), 0) / blogPages.length)
      : 0;

  const longFormCount = blogPages.filter((p) => p.word_count >= 1500).length;
  const long_form_ratio =
    blogPages.length > 0 ? longFormCount / blogPages.length : 0;

  const dated = blogPages.filter((p) => p.published_at);
  let publishing_frequency_per_month = 0;
  if (dated.length > 1) {
    const dates = dated
      .map((p) => p.published_at as Date)
      .sort((a, b) => a.getTime() - b.getTime());
    const first = dates[0].getTime();
    const last = dates[dates.length - 1].getTime();
    const days = Math.max(1, (last - first) / (1000 * 60 * 60 * 24));
    const months = Math.max(1, days / 30);
    publishing_frequency_per_month = +(dated.length / months).toFixed(1);
  }

  // Content investment score: composite of volume, depth, cadence, and long-form ratio.
  const volumeScore = Math.min(total_blog_pages, 60); // cap influence
  const depthScore = Math.min(avg_word_count / 30, 30); // 3k words -> 100% of 30
  const cadenceScore = Math.min(publishing_frequency_per_month * 5, 30); // 6/month -> 30
  const longFormScore = long_form_ratio * 20; // up to 20 points

  let content_investment_score =
    (volumeScore * 0.3 +
      depthScore * 0.25 +
      cadenceScore * 0.25 +
      longFormScore * 0.2);

  if (!isFinite(content_investment_score)) content_investment_score = 0;
  content_investment_score = Math.max(0, Math.min(100, Math.round(content_investment_score)));

  return {
    total_blog_pages,
    avg_word_count,
    total_case_studies,
    publishing_frequency_per_month,
    long_form_ratio,
    content_investment_score,
  };
}

