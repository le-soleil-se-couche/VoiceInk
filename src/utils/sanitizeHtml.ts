/**
 * Sanitizes an HTML string to a safe subset, preventing XSS attacks.
 *
 * Uses the browser's built-in DOMParser so no third-party dependency is
 * required. Only a limited allowlist of elements and attributes is kept;
 * everything else (scripts, event handlers, javascript: links, …) is stripped.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "code",
  "pre",
  "hr",
  "span",
  "div",
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
};

function sanitizeNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.cloneNode(false);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const tagName = el.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    // Unwrap the element but keep its children
    const frag = document.createDocumentFragment();
    for (const child of Array.from(el.childNodes)) {
      const sanitized = sanitizeNode(child);
      if (sanitized) frag.appendChild(sanitized);
    }
    return frag.childNodes.length > 0 ? frag : null;
  }

  const clean = document.createElement(tagName);

  // Copy only allowed attributes
  const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] ?? new Set<string>();
  for (const attr of Array.from(el.attributes)) {
    if (!allowedAttrs.has(attr.name)) continue;
    // Block javascript: and data: URLs in href
    if (attr.name === "href") {
      const href = attr.value.trim().toLowerCase();
      // Only allow safe URL schemes (allowlist is safer than a blocklist)
      const isSafeScheme =
        href.startsWith("https://") ||
        href.startsWith("http://") ||
        href.startsWith("#") ||
        href.startsWith("/") ||
        href.startsWith("./") ||
        href.startsWith("../");
      if (!isSafeScheme) continue;
    }
    clean.setAttribute(attr.name, attr.value);
  }

  // Force external links to be safe
  if (tagName === "a") {
    clean.setAttribute("rel", "noopener noreferrer");
    if (!clean.getAttribute("target")) {
      clean.setAttribute("target", "_blank");
    }
  }

  for (const child of Array.from(el.childNodes)) {
    const sanitized = sanitizeNode(child);
    if (sanitized) clean.appendChild(sanitized);
  }

  return clean;
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const container = document.createElement("div");
  for (const child of Array.from(doc.body.childNodes)) {
    const sanitized = sanitizeNode(child);
    if (sanitized) container.appendChild(sanitized);
  }

  return container.innerHTML;
}
