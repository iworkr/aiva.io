/**
 * HTML to Plain Text Converter
 * Converts HTML email content to clean, readable plain text
 */

/**
 * Decode HTML entities in text
 * Handles both named entities and numeric entities
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';

  // First decode numeric entities (decimal and hex)
  text = text
    // Decimal entities like &#39; or &#8217;
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    // Hex entities like &#x27; or &#x2019;
    .replace(/&#x([a-f\d]+);/gi, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    });

  // Then decode named entities
  const entityMap: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&bull;': '•',
    '&rsquo;': "'",
    '&lsquo;': "'",
    '&rdquo;': '"',
    '&ldquo;': '"',
  };

  // Replace named entities
  for (const [entity, char] of Object.entries(entityMap)) {
    text = text.replace(new RegExp(entity, 'gi'), char);
  }

  return text;
}

/**
 * Convert HTML to plain text with proper formatting
 * Handles common HTML elements and preserves structure
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  // Remove script and style elements completely
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Convert common HTML elements to plain text equivalents
  text = text
    // Headers
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n')
    // Paragraphs
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<br>/gi, '\n')
    // Lists
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    // Links - extract text and URL
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    // Bold and strong
    .replace(/<(b|strong)[^>]*>(.*?)<\/\1>/gi, '**$2**')
    // Italic and emphasis
    .replace(/<(i|em)[^>]*>(.*?)<\/\1>/gi, '*$2*')
    // Code
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    // Blockquotes
    .replace(/<blockquote[^>]*>/gi, '\n> ')
    .replace(/<\/blockquote>/gi, '\n')
    // Horizontal rules
    .replace(/<hr[^>]*>/gi, '\n---\n')
    // Remove all HTML tags (including html, head, body, meta, etc.)
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double
    .replace(/[ \t]+/g, ' ') // Multiple spaces to single
    .trim();

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  return text;
}

/**
 * Extract plain text from HTML, preferring plain text version if available
 */
export function extractPlainText(html: string | null | undefined, plainText: string | null | undefined): string {
  // If we have plain text, use it
  if (plainText && plainText.trim()) {
    return plainText.trim();
  }

  // Otherwise, convert HTML to plain text
  if (html && html.trim()) {
    return htmlToPlainText(html);
  }

  return '';
}

