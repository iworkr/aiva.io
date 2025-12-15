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
        /* ============================================
           EMAIL THEME ADAPTATION
           Force email content to follow app theme (dark/light mode)
           ============================================ */
        
        .email-html-content {
          /* Reset some defaults for email content */
          line-height: 1.5;
          /* Force background to match app theme */
          background: transparent !important;
          /* Force default text color to follow app theme */
          color: hsl(var(--foreground)) !important;
        }
        
        /* Force ALL descendant text to use theme colors by default */
        .email-html-content * {
          /* Prevent extremely large fonts */
          max-font-size: 32px;
        }
        
        /* ============================================
           BACKGROUND COLOR OVERRIDES
           Remove white/light backgrounds that would be invisible in dark mode
           ============================================ */
        
        /* Override white backgrounds to transparent */
        .email-html-content [style*="background-color: #fff"],
        .email-html-content [style*="background-color:#fff"],
        .email-html-content [style*="background-color: #FFF"],
        .email-html-content [style*="background-color:#FFF"],
        .email-html-content [style*="background-color: #ffffff"],
        .email-html-content [style*="background-color:#ffffff"],
        .email-html-content [style*="background-color: #FFFFFF"],
        .email-html-content [style*="background-color:#FFFFFF"],
        .email-html-content [style*="background-color: white"],
        .email-html-content [style*="background-color:white"],
        .email-html-content [style*="background: #fff"],
        .email-html-content [style*="background:#fff"],
        .email-html-content [style*="background: #ffffff"],
        .email-html-content [style*="background:#ffffff"],
        .email-html-content [style*="background: white"],
        .email-html-content [style*="background:white"],
        .email-html-content [bgcolor="#ffffff"],
        .email-html-content [bgcolor="#fff"],
        .email-html-content [bgcolor="white"],
        .email-html-content [bgcolor="#FFFFFF"],
        .email-html-content [bgcolor="#FFF"] {
          background-color: transparent !important;
          background: transparent !important;
        }
        
        /* Also handle light gray backgrounds that might be near-white */
        .email-html-content [style*="background-color: #f"],
        .email-html-content [style*="background-color:#f"],
        .email-html-content [bgcolor^="#f"],
        .email-html-content [bgcolor^="#F"] {
          background-color: transparent !important;
          background: transparent !important;
        }
        
        /* ============================================
           TEXT COLOR OVERRIDES
           Fix white/light text that would be invisible in light mode
           and dark text that would be invisible in dark mode
           ============================================ */
        
        /* Override white text to use theme foreground */
        .email-html-content [style*="color: #fff"],
        .email-html-content [style*="color:#fff"],
        .email-html-content [style*="color: #FFF"],
        .email-html-content [style*="color:#FFF"],
        .email-html-content [style*="color: #ffffff"],
        .email-html-content [style*="color:#ffffff"],
        .email-html-content [style*="color: #FFFFFF"],
        .email-html-content [style*="color:#FFFFFF"],
        .email-html-content [style*="color: white"],
        .email-html-content [style*="color:white"],
        .email-html-content [color="#ffffff"],
        .email-html-content [color="#fff"],
        .email-html-content [color="white"],
        .email-html-content [color="#FFFFFF"],
        .email-html-content [color="#FFF"] {
          color: hsl(var(--foreground)) !important;
        }
        
        /* Override very dark text that might be hard to read in dark mode */
        .email-html-content [style*="color: #000"],
        .email-html-content [style*="color:#000"],
        .email-html-content [style*="color: #111"],
        .email-html-content [style*="color:#111"],
        .email-html-content [style*="color: #222"],
        .email-html-content [style*="color:#222"],
        .email-html-content [style*="color: black"],
        .email-html-content [style*="color:black"],
        .email-html-content [color="#000000"],
        .email-html-content [color="#000"],
        .email-html-content [color="black"] {
          color: hsl(var(--foreground)) !important;
        }
        
        /* Force default text color on common text elements */
        .email-html-content p,
        .email-html-content div,
        .email-html-content span,
        .email-html-content td,
        .email-html-content th,
        .email-html-content li,
        .email-html-content h1,
        .email-html-content h2,
        .email-html-content h3,
        .email-html-content h4,
        .email-html-content h5,
        .email-html-content h6 {
          color: inherit;
        }
        
        /* ============================================
           LAYOUT FIXES
           Fix excessive padding on forwarded emails
           ============================================ */
        
        /* Reset left padding/margins on wrapper tables */
        .email-html-content > div > table:first-child,
        .email-html-content > table:first-child {
          margin-left: 0 !important;
          padding-left: 0 !important;
        }
        
        /* Remove excessive padding on table cells */
        .email-html-content td[style*="padding-left"],
        .email-html-content td[style*="padding: 0 0 0"] {
          padding-left: 0 !important;
        }
        
        /* Ensure email wrapper doesn't have excessive left margin */
        .email-html-content > div {
          margin-left: 0 !important;
          padding-left: 0 !important;
        }
        
        /* Fix centering on email containers */
        .email-html-content [align="center"] {
          text-align: center;
        }
        
        .email-html-content [align="center"] > table {
          margin: 0 auto;
        }
        
        /* ============================================
           PRESERVE COLORED ELEMENTS
           Keep buttons and branded elements colorful
           ============================================ */
        
        /* Keep colored buttons visible */
        .email-html-content a[style*="background"],
        .email-html-content [style*="border-radius"][style*="background"] {
          /* Keep original background for buttons */
        }
        
        /* ============================================
           GENERAL ELEMENT STYLES
           ============================================ */
        
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
        
        /* ============================================
           FORWARDED EMAIL HEADER STYLING
           ============================================ */
        
        .email-html-content hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1rem 0;
        }
      `}</style>
      <div 
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
});

export default EmailHtmlRenderer;
