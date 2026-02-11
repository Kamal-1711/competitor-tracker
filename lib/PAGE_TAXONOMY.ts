export const PAGE_TAXONOMY = {
  HOMEPAGE: "homepage",
  PRICING: "pricing",
  SERVICES: "services",
  PRODUCT_OR_SERVICES: "product_or_services",
  USE_CASES_OR_INDUSTRIES: "use_cases_or_industries",
  CASE_STUDIES_OR_CUSTOMERS: "case_studies_or_customers",
  CTA_ELEMENTS: "cta_elements",
  NAVIGATION: "navigation",
} as const;

export type PageType = (typeof PAGE_TAXONOMY)[keyof typeof PAGE_TAXONOMY];

export interface PageTypeDefinition {
  key: PageType;
  label: string;
  urlPatterns: RegExp[];
  navTextKeywords: string[];
  contentSignals: string[];
  pmValue: string;
  competitiveSignal: string;
  priority: number;
}

type PageTypeMap = Record<PageType, PageTypeDefinition>;

const PAGE_TYPE_DEFINITIONS: PageTypeMap = {
  homepage: {
    key: "homepage",
    label: "Homepage",
    urlPatterns: [/^https?:\/\/[^/]+\/?$/i, /\/home\/?$/i],
    navTextKeywords: ["home", "homepage"],
    contentSignals: ["hero", "get started", "book a demo", "trusted by"],
    pmValue: "Homepage reveals core positioning and first-impression narrative.",
    competitiveSignal: "Messaging and primary CTA changes indicate go-to-market shifts.",
    priority: 1,
  },
  pricing: {
    key: "pricing",
    label: "Pricing",
    urlPatterns: [/\/pricing\b/i, /\/plans?\b/i, /\/packages?\b/i, /\/quote\b/i],
    navTextKeywords: ["pricing", "plans", "packages", "get quote"],
    contentSignals: ["per month", "per user", "annual billing", "enterprise plan"],
    pmValue: "Pricing pages show packaging, monetization, and sales motion changes.",
    competitiveSignal: "Price/packaging updates signal market pressure or repositioning.",
    priority: 2,
  },
  services: {
    key: "services",
    label: "Services / Solutions",
    urlPatterns: [/\/services?\b/i, /\/solutions?\b/i, /\/what-we-do\b/i, /\/offerings?\b/i, /\/who-we-serve\b/i, /\/who-we-work-with\b/i],
    navTextKeywords: ["services", "solutions", "what we do", "offerings", "who we serve", "who we work with"],
    // Keep content signals focused to avoid misclassifying "platform" pages.
    contentSignals: ["our solutions", "service offering", "how we deliver", "who we serve", "clients we serve"],
    pmValue: "Service pages reveal capability packaging and delivery emphasis.",
    competitiveSignal: "Service shifts indicate consulting angle, depth, and execution model changes.",
    priority: 3,
  },
  product_or_services: {
    key: "product_or_services",
    label: "Product or Services",
    urlPatterns: [
      /product(s)?\b/i,
      /platform\b/i,
      /capabilities?\b/i,
    ],
    navTextKeywords: ["product", "products", "platform", "capabilities"],
    contentSignals: ["features", "capabilities", "what we offer", "our services"],
    pmValue: "These pages define the offering shape and strategic focus.",
    competitiveSignal: "Offering changes indicate shifts in product/service positioning.",
    priority: 3,
  },
  use_cases_or_industries: {
    key: "use_cases_or_industries",
    label: "Use Cases or Industries",
    urlPatterns: [/\/use-cases?\b/i, /\/industr(y|ies)\b/i, /\/verticals?\b/i, /\/segments?\b/i],
    navTextKeywords: ["use cases", "industries", "verticals", "who we serve"],
    contentSignals: ["for healthcare", "for finance", "for enterprise", "industry solutions"],
    pmValue: "Shows target segments and where they are expanding market focus.",
    competitiveSignal: "Segment-specific additions suggest demand and prioritization shifts.",
    priority: 4,
  },
  case_studies_or_customers: {
    key: "case_studies_or_customers",
    label: "Case Studies or Customers",
    urlPatterns: [
      /\/case-stud(y|ies)\b/i,
      /\/customer(s)?\b/i,
      /\/success(-stories)?\b/i,
      /\/testimonials?\b/i,
    ],
    navTextKeywords: ["case studies", "customers", "success stories", "testimonials", "client stories"],
    contentSignals: ["customer story", "outcomes", "roi", "trusted by"],
    pmValue: "Customer proof clarifies winning segments and value realization.",
    competitiveSignal: "New logos/case studies indicate traction in specific markets.",
    priority: 3,
  },
  cta_elements: {
    key: "cta_elements",
    label: "CTA Elements",
    urlPatterns: [/\/demo\b/i, /\/book(-|_)?demo\b/i, /\/contact\b/i, /\/signup\b/i, /\/trial\b/i],
    navTextKeywords: ["book demo", "request demo", "start free", "contact sales", "free trial"],
    contentSignals: ["start free", "talk to sales", "request a demo", "submit"],
    pmValue: "Conversion paths expose funnel strategy and qualification intent.",
    competitiveSignal: "CTA flow updates indicate acquisition and conversion strategy changes.",
    priority: 4,
  },
  navigation: {
    key: "navigation",
    label: "Navigation",
    urlPatterns: [/\/sitemap\b/i],
    navTextKeywords: ["menu", "navigation", "site map"],
    contentSignals: ["header", "footer", "navigation"],
    pmValue: "Navigation reflects how competitors frame and prioritize offerings.",
    competitiveSignal: "Nav/footer changes signal repositioning and information architecture updates.",
    priority: 1,
  },
};

const IGNORE_URL_PATTERNS: RegExp[] = [
  /\/careers?\b/i,
  /\/jobs?\b/i,
  /\/legal\b/i,
  /\/privacy\b/i,
  /\/terms\b/i,
  /\/news\b/i,
  /\/blog\b/i,
  /\/help\b/i,
  /\/support\b/i,
  /\/docs?\b/i,
  /\/documentation\b/i,
];

/**
 * Mandatory URLs to crawl per competitor domain.
 * These patterns are always attempted (best-effort) even if not discovered via navigation.
 * Key: domain pattern, Value: list of path patterns to attempt.
 */
export const MANDATORY_CRAWL_PATHS: Record<string, string[]> = {
  // Crunchbase-like sites: try standard product/service discovery pages
  "crunchbase\\.com": [
    "/buy/select-product", // Known Crunchbase product page
    "/products",
    "/offerings",
    "/solutions",
    "/services",
    "/platform",
    "/features",
  ],
  // Generic SaaS patterns
  ".*": [
    "/pricing",
    "/products",
    "/product",
    "/platform",
    "/services",
    "/solutions",
    "/features",
    "/capabilities",
  ],
};

const IGNORE_NAV_TEXT: string[] = [
  "careers",
  "jobs",
  "we're hiring",
  "privacy policy",
  "terms",
  "help center",
  "support",
  "documentation",
];

function normalize(input: string): string {
  return input.replace(/\s+/g, " ").trim().toLowerCase();
}

function matchesAnyPattern(url: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(url));
}

function includesAnyKeyword(input: string, keywords: string[]): boolean {
  const normalized = normalize(input);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

const DETECTION_ORDER: PageType[] = [
  PAGE_TAXONOMY.PRICING,
  PAGE_TAXONOMY.SERVICES,
  PAGE_TAXONOMY.PRODUCT_OR_SERVICES,
  PAGE_TAXONOMY.USE_CASES_OR_INDUSTRIES,
  PAGE_TAXONOMY.CASE_STUDIES_OR_CUSTOMERS,
  PAGE_TAXONOMY.CTA_ELEMENTS,
];

export function detectPageTypeFromUrl(url: string): PageType | null {
  for (const pageType of DETECTION_ORDER) {
    if (matchesAnyPattern(url, PAGE_TYPE_DEFINITIONS[pageType].urlPatterns)) {
      return pageType;
    }
  }

  try {
    const parsed = new URL(url);
    if (parsed.pathname === "/" || parsed.pathname === "") {
      return PAGE_TAXONOMY.HOMEPAGE;
    }
  } catch {
    return null;
  }

  return null;
}

export function detectPageTypeFromNav(linkText: string, href: string): PageType | null {
  const byUrl = detectPageTypeFromUrl(href);
  if (byUrl) return byUrl;

  for (const pageType of DETECTION_ORDER) {
    if (includesAnyKeyword(linkText, PAGE_TYPE_DEFINITIONS[pageType].navTextKeywords)) {
      return pageType;
    }
  }

  return null;
}

export function detectPageTypeFromContent(html: string, url: string): PageType {
  const byUrl = detectPageTypeFromUrl(url);
  if (byUrl) return byUrl;

  const normalizedHtml = normalize(html);
  for (const pageType of DETECTION_ORDER) {
    const definition = PAGE_TYPE_DEFINITIONS[pageType];
    if (definition.contentSignals.some((signal) => normalizedHtml.includes(normalize(signal)))) {
      return pageType;
    }
  }

  return PAGE_TAXONOMY.HOMEPAGE;
}

export function shouldIgnorePage(url: string, linkText: string): boolean {
  if (matchesAnyPattern(url, IGNORE_URL_PATTERNS)) return true;
  return includesAnyKeyword(linkText, IGNORE_NAV_TEXT);
}

export function getPageTypePriority(pageType: PageType): number {
  return PAGE_TYPE_DEFINITIONS[pageType].priority;
}

export function getPageTypeDefinition(pageType: PageType): PageTypeDefinition {
  return PAGE_TYPE_DEFINITIONS[pageType];
}

export function getAllPageTypeDefinitions(): PageTypeDefinition[] {
  return Object.values(PAGE_TYPE_DEFINITIONS);
}
