/**
 * EmailHtmlRenderer Component
 * Securely renders HTML email content using DOMPurify
 * Preserves email formatting, images, and styles while sanitizing dangerous content
 */

'use client';

import { memo, useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { cn } from '@/lib/utils';

interface EmailHtmlRendererProps {
  html: string;
  className?: string;
}

/**
 * DOMPurify configuration for email HTML
 * Allows tags and attributes commonly used in HTML emails
 * while stripping dangerous elements
 */
const DOMPURIFY_CONFIG = {
  // Allowed HTML tags for email rendering
  ALLOWED_TAGS: [
    // Structure
    'html', 'head', 'body', 'div', 'span', 'p', 'br', 'hr',
    // Text formatting
    'a', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'ins',
    'sub', 'sup', 'small', 'big', 'mark', 'abbr', 'font',
    // Headers
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    // Tables (common in email templates)
    'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup', 'col',
    // Media
    'img', 'picture', 'source',
    // Layout (legacy but common in emails)
    'center', 'blockquote', 'pre', 'code',
    // Styles (important for email rendering)
    'style',
  ],
  // Allowed attributes
  ALLOWED_ATTR: [
    // Links
    'href', 'target', 'rel', 'title',
    // Images
    'src', 'alt', 'width', 'height', 'loading',
    // Styling
    'style', 'class', 'id',
    // Table attributes (legacy but needed for email)
    'border', 'cellpadding', 'cellspacing', 'align', 'valign',
    'bgcolor', 'background', 'colspan', 'rowspan',
    // Font attributes (legacy)
    'color', 'face', 'size',
  ],
  // Don't allow data attributes
  ALLOW_DATA_ATTR: false,
  // Force all links to open in new tab
  ADD_ATTR: ['target'],
  // Add rel="noopener noreferrer" to links
  WHOLE_DOCUMENT: false,
  // Allow CSS custom properties
  FORCE_BODY: false,
  // Return string instead of TrustedHTML
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Post-process HTML to add security and UX improvements
 */
function postProcessHtml(html: string): string {
  // Add target="_blank" and rel="noopener noreferrer" to all links
  let processed = html.replace(
    /<a\s+([^>]*?)>/gi,
    (match, attrs) => {
      // Add target if not present
      if (!attrs.includes('target=')) {
        attrs += ' target="_blank"';
      }
      // Add rel if not present
      if (!attrs.includes('rel=')) {
        attrs += ' rel="noopener noreferrer"';
      }
      return `<a ${attrs}>`;
    }
  );

  return processed;
}

/**
 * Sanitize and prepare email HTML for safe rendering
 */
function sanitizeEmailHtml(html: string): string {
  if (!html) return '';

  // First pass: DOMPurify sanitization
  // Cast to string since we set RETURN_TRUSTED_TYPE: false
  const sanitized = DOMPurify.sanitize(html, DOMPURIFY_CONFIG) as string;

  // Second pass: post-processing for UX
  return postProcessHtml(sanitized);
}

export const EmailHtmlRenderer = memo(function EmailHtmlRenderer({
  html,
  className,
}: EmailHtmlRendererProps) {
  // Memoize sanitization for performance
  const sanitizedHtml = useMemo(() => sanitizeEmailHtml(html), [html]);

  if (!sanitizedHtml) {
    return null;
  }

  return (
    <div
      className={cn(
        // Base styles
        "email-html-content",
        // Contain styles to prevent leaking
        "relative overflow-hidden",
        // Allow internal scrolling for wide content
        "max-w-full overflow-x-auto",
        // Typography defaults
        "text-sm text-foreground",
        // Custom class
        className
      )}
    >
      {/* 
        Email content wrapper with scoped styles 
        Using a style tag to scope email styles
      */}
      <style>{`
        .email-html-content {
          /* Reset some defaults for email content */
          line-height: 1.5;
        }
        .email-html-content * {
          /* Prevent extremely large fonts */
          max-font-size: 32px;
        }
        .email-html-content img {
          /* Make images responsive */
          max-width: 100%;
          height: auto;
        }
        .email-html-content table {
          /* Ensure tables don't break layout */
          max-width: 100%;
          border-collapse: collapse;
        }
        .email-html-content a {
          /* Style links */
          color: hsl(var(--primary));
          text-decoration: underline;
          word-break: break-all;
        }
        .email-html-content a:hover {
          opacity: 0.8;
        }
        .email-html-content pre,
        .email-html-content code {
          /* Code blocks */
          background: hsl(var(--muted));
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-size: 0.875em;
          overflow-x: auto;
        }
        .email-html-content blockquote {
          /* Quoted text */
          border-left: 4px solid hsl(var(--border));
          padding-left: 1rem;
          margin-left: 0;
          color: hsl(var(--muted-foreground));
        }
        /* Hide tracking pixels (common in marketing emails) */
        .email-html-content img[width="1"],
        .email-html-content img[height="1"],
        .email-html-content img[src*="track"],
        .email-html-content img[src*="pixel"],
        .email-html-content img[src*="open"] {
          display: none !important;
        }
      `}</style>
      <div 
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
});

export default EmailHtmlRenderer;
