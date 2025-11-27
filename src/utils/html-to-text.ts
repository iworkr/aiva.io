/**
 * HTML to Plain Text Converter
 * Converts HTML email content to clean, readable plain text
 */

/**
 * Convert HTML to plain text with proper formatting
 * Handles common HTML elements and preserves structure
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

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
    // Divs and spans (just remove tags, keep content)
    .replace(/<\/?(div|span)[^>]*>/gi, '')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Decode numeric entities
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([a-f\d]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double
    .replace(/[ \t]+/g, ' ') // Multiple spaces to single
    .trim();

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

