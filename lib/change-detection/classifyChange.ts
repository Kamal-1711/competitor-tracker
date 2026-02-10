import * as cheerio from "cheerio";
import type { DetectedChange, ChangeType, PageType } from "./detectChanges";

export type ChangeCategory =
  | "Positioning & Messaging"
  | "Pricing & Offers"
  | "Product / Services"
  | "Trust & Credibility"
  | "Navigation / Structure";

function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim().toLowerCase();
}

function isLogoOrTestimonial(html: string, elementKey: string): boolean {
  const normalizedKey = normalizeText(elementKey);
  
  // Logo detection
  if (normalizedKey.includes("logo")) return true;
  
  // Check HTML for logo indicators
  const $ = cheerio.load(html);
  const imgElements = $("img").toArray();
  for (const img of imgElements) {
    const alt = normalizeText($(img).attr("alt") ?? "");
    const src = normalizeText($(img).attr("src") ?? "");
    const parentTag = $(img).parent().get(0)?.tagName?.toLowerCase() ?? "";
    
    if (alt.includes("logo") || src.includes("logo") || parentTag === "header" || parentTag === "footer") {
      // Check if this image is related to the changed element
      const imgText = normalizeText($(img).parent().text());
      if (normalizedKey.includes(imgText.slice(0, 50)) || imgText.includes(normalizedKey.slice(0, 50))) {
        return true;
      }
    }
  }
  
  // Testimonial detection
  const testimonialKeywords = ["testimonial", "review", "customer", "trust", "rating", "client", "quote"];
  for (const keyword of testimonialKeywords) {
    if (normalizedKey.includes(keyword)) return true;
  }
  
  // Check for testimonial sections in HTML
  const headings = $("h1, h2, h3, h4, h5, h6").toArray();
  for (const heading of headings) {
    const headingText = normalizeText($(heading).text());
    for (const keyword of testimonialKeywords) {
      if (headingText.includes(keyword)) {
        // Check if this heading is related to the changed element
        const headingContext = normalizeText($(heading).parent().text());
        if (normalizedKey.includes(headingContext.slice(0, 100)) || headingContext.includes(normalizedKey.slice(0, 100))) {
          return true;
        }
      }
    }
  }
  
  // Check aria-labels
  const sections = $("section, article, div").toArray();
  for (const section of sections) {
    const ariaLabel = normalizeText($(section).attr("aria-label") ?? "");
    for (const keyword of testimonialKeywords) {
      if (ariaLabel.includes(keyword)) {
        const sectionText = normalizeText($(section).text());
        if (normalizedKey.includes(sectionText.slice(0, 100)) || sectionText.includes(normalizedKey.slice(0, 100))) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function isFooterChange(change: DetectedChange): boolean {
  const normalizedKey = normalizeText(change.before?.key ?? change.after?.key ?? "");
  const normalizedLabel = normalizeText(change.before?.label ?? change.after?.label ?? "");
  
  if (normalizedKey.includes("footer") || normalizedLabel.includes("footer")) {
    return true;
  }
  
  // Check if change is in footer context
  if (change.details.elementKey) {
    const elementKey = normalizeText(String(change.details.elementKey));
    if (elementKey.includes("footer")) return true;
  }
  
  return false;
}

function isProductOrServiceContent(change: DetectedChange): boolean {
  const normalizedKey = normalizeText(change.before?.key ?? change.after?.key ?? "");
  const normalizedLabel = normalizeText(change.before?.label ?? change.after?.label ?? "");
  const normalizedText = normalizeText(change.before?.text ?? change.after?.text ?? "");
  
  const productKeywords = ["product", "service", "solution", "feature", "offering"];
  
  for (const keyword of productKeywords) {
    if (normalizedKey.includes(keyword) || normalizedLabel.includes(keyword) || normalizedText.includes(keyword)) {
      return true;
    }
  }
  
  if (change.details.elementKey) {
    const elementKey = normalizeText(String(change.details.elementKey));
    for (const keyword of productKeywords) {
      if (elementKey.includes(keyword)) return true;
    }
  }
  
  return false;
}

/**
 * Classify a detected change into a category based on deterministic rules.
 */
export function classifyChange(change: DetectedChange, afterHtml?: string): ChangeCategory {
  // Rule 1: CTA text changes → Positioning & Messaging
  if (change.changeType === "cta_text_change") {
    return "Positioning & Messaging";
  }
  
  // Rule 2: Pricing page changes → Pricing & Offers
  if (change.pageType === "pricing") {
    return "Pricing & Offers";
  }

  // Rule 3: CTA element shifts usually reflect messaging/sales intent.
  if (change.pageType === "cta_elements") {
    return "Positioning & Messaging";
  }
  
  // Rule 4: Product/services or use-case pages map to offering strategy.
  if (change.pageType === "product_or_services" || change.pageType === "use_cases_or_industries") {
    return "Product / Services";
  }

  // Rule 5: Case studies/customers emphasize trust and social proof.
  if (change.pageType === "case_studies_or_customers") {
    return "Trust & Credibility";
  }

  // Rule 6: Explicit navigation pages are structural by nature.
  if (change.pageType === "navigation") {
    return "Navigation / Structure";
  }

  // Rule 7: New service/product sections on generic pages → Product / Services
  if (change.changeType === "element_added") {
    if (isProductOrServiceContent(change)) {
      return "Product / Services";
    }
  }
  
  // Rule 8: Logos/testimonials added → Trust & Credibility
  if (change.changeType === "element_added" && afterHtml) {
    const elementKey = change.after?.key ?? change.details.elementKey as string ?? "";
    if (isLogoOrTestimonial(afterHtml, elementKey)) {
      return "Trust & Credibility";
    }
  }
  
  // Rule 9: Nav/footer changes → Navigation / Structure
  if (change.changeType === "nav_change") {
    return "Navigation / Structure";
  }
  
  if (isFooterChange(change)) {
    return "Navigation / Structure";
  }
  
  // Default fallback
  return "Navigation / Structure";
}
