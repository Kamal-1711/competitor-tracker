import { detectChanges } from "@/lib/change-detection/detectChanges";

const beforeHtml = `
<!doctype html>
<html>
  <head><title>Acme</title></head>
  <body>
    <header>
      <nav>
        <a href="/pricing">Pricing</a>
        <a href="/products">Products</a>
      </nav>
    </header>
    <main>
      <h1>Acme</h1>
      <p>Fast widgets for teams.</p>
      <a href="/signup">Get started</a>
    </main>
  </body>
</html>
`;

const afterHtml = `
<!doctype html>
<html>
  <head><title>Acme</title></head>
  <body>
    <header>
      <nav>
        <a href="/pricing">Plans</a>
        <a href="/solutions">Solutions</a>
      </nav>
    </header>
    <main>
      <h1>Acme</h1>
      <p>Fast widgets for modern teams.</p>
      <a href="/signup">Start free</a>
      <section aria-label="Testimonials">
        <h2>What customers say</h2>
        <ul>
          <li>It works great</li>
        </ul>
      </section>
    </main>
  </body>
</html>
`;

const changes = detectChanges({
  beforeHtml,
  afterHtml,
  pageUrl: "https://example.com",
  pageType: "homepage",
});

console.log("Detected changes:", changes.map((c) => ({ type: c.changeType, category: c.category })));

// Very small sanity checks (no test framework)
if (!changes.some((c) => c.changeType === "text_change")) {
  throw new Error("Expected a text_change");
}
if (!changes.some((c) => c.changeType === "cta_text_change")) {
  throw new Error("Expected a cta_text_change");
}
if (!changes.some((c) => c.changeType === "nav_change")) {
  throw new Error("Expected a nav_change");
}

// Verify categories are assigned
if (!changes.every((c) => c.category)) {
  throw new Error("All changes must have a category assigned");
}

// Verify specific category rules
const ctaChange = changes.find((c) => c.changeType === "cta_text_change");
if (!ctaChange || ctaChange.category !== "Positioning & Messaging") {
  throw new Error(`Expected CTA change to be categorized as "Positioning & Messaging", got: ${ctaChange?.category}`);
}

const navChange = changes.find((c) => c.changeType === "nav_change");
if (!navChange || navChange.category !== "Navigation / Structure") {
  throw new Error(`Expected nav change to be categorized as "Navigation / Structure", got: ${navChange?.category}`);
}

// Check for testimonial element addition (should be Trust & Credibility)
const testimonialChange = changes.find(
  (c) => c.changeType === "element_added" && c.details.elementKey && String(c.details.elementKey).includes("testimonial")
);
if (testimonialChange && testimonialChange.category !== "Trust & Credibility") {
  throw new Error(`Expected testimonial addition to be categorized as "Trust & Credibility", got: ${testimonialChange.category}`);
}

console.log("Smoke test passed - all categories assigned correctly.");

